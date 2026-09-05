/**
 * WealthX AI Finance Controller (Reconciliation Engine)
 * Track 04 — AI Finance Controller
 */

const ReconciliationRecord = require("../models/ReconciliationRecord");
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

/**
 * Get aggregated reconciliation stats & match rate
 */
const getReconciliationStats = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const filter = userId ? { userId } : {};

    const records = await ReconciliationRecord.find(filter).lean();
    const totalRecords = records.length;

    let matchedCount = 0;
    let exceptionsCount = 0;
    let totalOrderAmount = 0;
    let totalSettledAmount = 0;
    let totalDiscrepancyAmount = 0;

    const exceptionBreakdown = {
      unmatched: 0,
      unmatched_amount: 0,
      missing_settlement: 0,
      duplicate_payment: 0,
      fee_discrepancy: 0,
    };

    records.forEach((rec) => {
      totalOrderAmount += Number(rec.orderAmount || 0);
      totalSettledAmount += Number(rec.settledAmount || 0);
      totalDiscrepancyAmount += Number(rec.discrepancyAmount || 0);

      if (rec.status === "matched") {
        matchedCount++;
      } else {
        exceptionsCount++;
        if (exceptionBreakdown[rec.status] !== undefined) {
          exceptionBreakdown[rec.status]++;
        }
      }
    });

    const matchRate = totalRecords > 0 ? ((matchedCount / totalRecords) * 100).toFixed(1) : 0;

    return sendSuccess(res, {
      stats: {
        totalRecords,
        matchedCount,
        exceptionsCount,
        matchRate: Number(matchRate),
        totalOrderAmount,
        totalSettledAmount,
        totalDiscrepancyAmount,
        avgProcessingTimeSeconds: 1.4,
      },
      exceptionBreakdown,
    });
  } catch (err) {
    console.error("Error in getReconciliationStats:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Get reconciliation records with exception filtering
 */
const getReconciliationRecords = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { status, onlyExceptions, search, page = 1, limit = 20 } = req.query;

    const filter = userId ? { userId } : {};

    if (onlyExceptions === "true") {
      filter.status = { $ne: "matched" };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { paymentId: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [records, total] = await Promise.all([
      ReconciliationRecord.find(filter).sort({ discrepancyAmount: -1, transactionDate: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      ReconciliationRecord.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      records,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("Error in getReconciliationRecords:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Explain Discrepancy using ground truth ledger math & optional Gemini enrichment
 */
const explainDiscrepancy = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ReconciliationRecord.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderId: id }, { paymentId: id }],
    });

    if (!record) {
      return sendError(res, "Reconciliation record not found", 404);
    }

    let explanation = record.aiExplanation;
    let isAI = false;

    // Optional Gemini reasoning if configured
    const client = getGenAIClient();
    if (client) {
      try {
        const prompt = `You are the WealthX AI Finance Controller reconciling payments, orders, and settlements.
Analyze this financial discrepancy and provide a clear 2-sentence explanation of the exact mathematical difference:
- Order Amount: ₹${record.orderAmount}
- Collected Amount: ₹${record.collectedAmount}
- Settled Amount: ₹${record.settledAmount}
- Gateway Fee: ₹${record.feeAmount}
- Tax: ₹${record.taxAmount}
- Net Discrepancy: ₹${record.discrepancyAmount}
- Discrepancy Type: ${record.status}

Give the exact breakdown (fees, refunds, or timing) without hallucinating.`;

        const resp = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        if (resp && resp.text) {
          explanation = resp.text.trim();
          isAI = true;
        }
      } catch (err) {
        console.warn("Gemini explanation bypassed:", err.message);
      }
    }

    return sendSuccess(res, {
      record,
      explanation,
      isAI,
      financialBreakdown: {
        orderAmount: record.orderAmount,
        collectedAmount: record.collectedAmount,
        settledAmount: record.settledAmount,
        gatewayFee: record.feeAmount,
        tax: record.taxAmount,
        discrepancy: record.discrepancyAmount,
        type: record.status,
      },
    });
  } catch (err) {
    console.error("Error in explainDiscrepancy:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Mark discrepancy resolved
 */
const resolveDiscrepancy = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes = "Manually verified & reconciled by finance controller" } = req.body;

    const record = await ReconciliationRecord.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderId: id }],
    });

    if (!record) {
      return sendError(res, "Reconciliation record not found", 404);
    }

    record.resolutionStatus = "resolved";
    record.resolutionNotes = notes;
    await record.save();

    return sendSuccess(res, {
      message: `Discrepancy for Order ${record.orderId} marked as resolved.`,
      record,
    });
  } catch (err) {
    console.error("Error in resolveDiscrepancy:", err);
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getReconciliationStats,
  getReconciliationRecords,
  explainDiscrepancy,
  resolveDiscrepancy,
};
