/**
 * WealthX AI Finance Copilot
 * Phase 16 — Ask WealthX Grounded Financial Assistant
 */

const PaymentRecord = require("../models/PaymentRecord");
const ReconciliationRecord = require("../models/ReconciliationRecord");
const RecoveryAuditLog = require("../models/RecoveryAuditLog");
const { sendSuccess, sendError } = require("../utils/apiResponse");
let GoogleGenAI = null;
try {
  const genaiPkg = require("@google/genai");
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  // Graceful fallback
}

let genAIClient = null;
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !GoogleGenAI) return null;
  if (!genAIClient) genAIClient = new GoogleGenAI({ apiKey });
  return genAIClient;
};

const queryCopilot = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const filter = userId ? { userId } : {};
    const { query = "" } = req.body;

    if (!query.trim()) {
      return sendError(res, "Query cannot be empty", 400);
    }

    const cleanQuery = query.toLowerCase().trim();

    // 1. Gather live database facts
    const [
      totalRecords,
      recoveredRecords,
      atRiskRecords,
      reconciliationExceptions,
      auditTodayCount,
      allPayments,
    ] = await Promise.all([
      PaymentRecord.countDocuments(filter),
      PaymentRecord.find({ ...filter, paymentStatus: "recovered" }).lean(),
      PaymentRecord.find({ ...filter, paymentStatus: { $ne: "recovered" } }).lean(),
      ReconciliationRecord.find({ ...filter, status: { $ne: "matched" } }).lean(),
      RecoveryAuditLog.countDocuments({
        ...filter,
        timestamp: { $gte: new Date(Date.now() - 86400000) },
      }),
      PaymentRecord.find(filter).lean(),
    ]);

    const totalAtRisk = atRiskRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalRecovered = recoveredRecords.reduce((sum, r) => sum + (r.recoveredAmount || r.amount), 0);
    const totalPossible = totalAtRisk + totalRecovered;
    const recoveryRate = totalPossible > 0 ? ((totalRecovered / totalPossible) * 100).toFixed(1) : "0";

    // Eligible opportunities
    const eligibleRecords = atRiskRecords.filter(
      (r) =>
        (r.paymentStatus === "failed" || r.paymentStatus === "pending_retry") &&
        r.retryCount < 3 &&
        r.recoveryProbability >= 70 &&
        r.daysOverdue <= 45 &&
        r.amount < 25000
    );
    const totalEligible = eligibleRecords.reduce((sum, r) => sum + r.amount, 0);

    // High probability candidates
    const highProbCandidates = atRiskRecords
      .filter((r) => r.recoveryProbability >= 75)
      .sort((a, b) => b.recoveryProbability - a.recoveryProbability)
      .slice(0, 5);

    // Repeated failure customers
    const failureCustomerMap = {};
    allPayments.forEach((p) => {
      if (p.retryCount > 1 || p.paymentStatus === "unrecoverable") {
        failureCustomerMap[p.customerName] = (failureCustomerMap[p.customerName] || 0) + 1;
      }
    });

    const repeatFailureCustomers = Object.entries(failureCustomerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count} attempts/failures)`);

    // Check if query targets a specific transaction ID (e.g. TXN_1024)
    const txnMatch = cleanQuery.match(/txn_\d+/i);
    let specificTxn = null;
    if (txnMatch) {
      specificTxn = await PaymentRecord.findOne({
        transactionId: new RegExp(`^${txnMatch[0]}$`, "i"),
      });
    }

    // Grounded deterministic response synthesis
    let answer = "";
    let dataContext = {};

    if (specificTxn) {
      answer = `Payment ${specificTxn.transactionId} (₹${specificTxn.amount.toLocaleString("en-IN")}) for ${specificTxn.customerName} failed due to "${specificTxn.failureReason.replace(/_/g, " ")}". Its current AI recovery probability is ${specificTxn.recoveryProbability}% with risk level ${specificTxn.riskLevel}. Recommended action: ${specificTxn.recommendedIntervention.replace(/_/g, " ").toUpperCase()}.`;
      dataContext = { transaction: specificTxn };
    } else if (cleanQuery.includes("eligible")) {
      answer = `There are currently ${eligibleRecords.length} recovery opportunities eligible for autonomous retry, representing ₹${totalEligible.toLocaleString("en-IN")} in revenue (satisfying: confidence ≥70%, retries < 3, overdue ≤45 days, amount < ₹25,000).`;
      dataContext = { eligibleCount: eligibleRecords.length, eligibleRevenue: totalEligible };
    } else if (cleanQuery.includes("at risk") || cleanQuery.includes("revenue at risk")) {
      answer = `Currently, there is ₹${totalAtRisk.toLocaleString("en-IN")} across ${atRiskRecords.length} transactions at risk. Of this, ₹${totalEligible.toLocaleString("en-IN")} is eligible for high-confidence autonomous recovery.`;
      dataContext = { totalRevenueAtRisk: totalAtRisk, atRiskCount: atRiskRecords.length, eligibleRevenue: totalEligible };
    } else if (cleanQuery.includes("recover") || cleanQuery.includes("how much did ai recover")) {
      answer = `The AI Recovery Agent has recovered ₹${totalRecovered.toLocaleString("en-IN")} across ${recoveredRecords.length} transactions, yielding an overall recovery conversion rate of ${recoveryRate}%.`;
      dataContext = { totalRecovered, recoveredCount: recoveredRecords.length, recoveryRate };
    } else if (cleanQuery.includes("rate") || cleanQuery.includes("recovery rate")) {
      answer = `Your current autonomous recovery rate is ${recoveryRate}% (₹${totalRecovered.toLocaleString("en-IN")} recovered out of ₹${totalPossible.toLocaleString("en-IN")} total volume analyzed).`;
      dataContext = { recoveryRate, totalRecovered, totalPossible };
    } else if (cleanQuery.includes("opportunity") || cleanQuery.includes("high-probability") || cleanQuery.includes("high probability")) {
      const topList = highProbCandidates.map((c) => `${c.transactionId} (₹${c.amount.toLocaleString("en-IN")}, ${c.recoveryProbability}% - ${c.failureReason})`).join("; ");
      answer = `Found ${highProbCandidates.length} immediate high-probability opportunities: ${topList}.`;
      dataContext = { highProbCandidates };
    } else if (cleanQuery.includes("reconciliation") || cleanQuery.includes("exception") || cleanQuery.includes("discrepancy")) {
      const discTotal = reconciliationExceptions.reduce((s, e) => s + e.discrepancyAmount, 0);
      answer = `There are currently ${reconciliationExceptions.length} open reconciliation exceptions totaling ₹${discTotal.toLocaleString("en-IN")} in discrepancies across payment-order settlements.`;
      dataContext = { exceptionsCount: reconciliationExceptions.length, discrepancyTotal: discTotal };
    } else if (cleanQuery.includes("repeat") || cleanQuery.includes("repeated") || cleanQuery.includes("customer")) {
      answer = `Customers with repeated payment challenges include: ${repeatFailureCustomers.join(", ") || "None exceeding threshold"}.`;
      dataContext = { repeatFailureCustomers };
    } else {
      answer = `WealthX Intelligence Overview: ₹${totalAtRisk.toLocaleString("en-IN")} revenue at risk, ₹${totalRecovered.toLocaleString("en-IN")} recovered (${recoveryRate}% rate), ${eligibleRecords.length} eligible opportunities, ${reconciliationExceptions.length} open reconciliation exceptions, and ${auditTodayCount} autonomous actions logged today.`;
      dataContext = { totalAtRisk, totalRecovered, recoveryRate, exceptionsCount: reconciliationExceptions.length, eligibleCount: eligibleRecords.length };
    }

    // Optional Gemini conversational refinement with strict grounding
    const client = getGenAIClient();
    if (client) {
      try {
        const prompt = `You are the WealthX AI Revenue & Finance Intelligence Copilot.
Answer this user question using ONLY the provided verified database facts. Do not invent numbers.
Question: "${query}"
Database Facts:
- Total Revenue At Risk: ₹${totalAtRisk} (${atRiskRecords.length} records)
- Total Recovered by AI: ₹${totalRecovered} (${recoveredRecords.length} records)
- Recovery Conversion Rate: ${recoveryRate}%
- Eligible Recovery Opportunities: ₹${totalEligible} (${eligibleRecords.length} records)
- Open Reconciliation Exceptions: ${reconciliationExceptions.length}
- Autonomous Actions Today: ${auditTodayCount}
- High-probability opportunities: ${highProbCandidates.map((c) => `${c.transactionId}: ₹${c.amount} (${c.recoveryProbability}%)`).join(", ")}
${specificTxn ? `Specific Transaction: ${specificTxn.transactionId}, ₹${specificTxn.amount}, Reason: ${specificTxn.failureReason}, Score: ${specificTxn.recoveryProbability}%, Intervention: ${specificTxn.recommendedIntervention}` : ""}

Keep your reply concise, professional, institutional, and directly answer the question in 2-3 sentences.`;

        const resp = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        if (resp && resp.text) {
          answer = resp.text.trim();
        }
      } catch (err) {
        console.warn("Copilot Gemini call bypassed, using grounded facts:", err.message);
      }
    }

    return sendSuccess(res, {
      query,
      answer,
      groundedData: dataContext,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Error in queryCopilot:", err);
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  queryCopilot,
};
