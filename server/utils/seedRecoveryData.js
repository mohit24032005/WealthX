/**
 * WealthX Synthetic Payment & Reconciliation Dataset Generator
 * Generates 120+ realistic payment records and 60+ reconciliation records
 * for Razorpay AI Buildathon demonstration.
 */

const PaymentRecord = require("../models/PaymentRecord");
const ReconciliationRecord = require("../models/ReconciliationRecord");
const RecoveryAuditLog = require("../models/RecoveryAuditLog");
const RecoveryPolicy = require("../models/RecoveryPolicy");
const { calculateRecoveryScore } = require("../services/recoveryScoringService");

const CUSTOMER_PROFILES = [
  { name: "Aarav Sharma", email: "aarav.sharma@techcorp.in", segment: "enterprise", ltv: 340000 },
  { name: "Priya Nair", email: "priya.nair@innovate.co", segment: "smb", ltv: 85000 },
  { name: "Rohan Verma", email: "rohan.v@finvest.io", segment: "vip", ltv: 520000 },
  { name: "Ananya Iyer", email: "ananya.iyer@gmail.com", segment: "direct_consumer", ltv: 24000 },
  { name: "Kavya Patel", email: "kavya@pateltextiles.com", segment: "enterprise", ltv: 890000 },
  { name: "Vikram Malhotra", email: "vikram.m@zenith.ai", segment: "smb", ltv: 120000 },
  { name: "Siddharth Rao", email: "sid.rao@gmail.com", segment: "direct_consumer", ltv: 18000 },
  { name: "Meera Sen", email: "meera.sen@designworks.in", segment: "smb", ltv: 95000 },
  { name: "Aditya Joshi", email: "aditya.j@cloudmatrix.com", segment: "enterprise", ltv: 460000 },
  { name: "Tanvi Deshmukh", email: "tanvi.d@outlook.com", segment: "direct_consumer", ltv: 12500 },
  { name: "Rahul Mukherjee", email: "rahul.m@apexlogistics.in", segment: "enterprise", ltv: 670000 },
  { name: "Sneha Reddy", email: "sneha.reddy@gmail.com", segment: "direct_consumer", ltv: 31000 },
  { name: "Devansh Kulkarni", email: "devansh@kulkarnilabs.com", segment: "smb", ltv: 140000 },
  { name: "Ritu Singhania", email: "ritu.singhania@heritage.co", segment: "vip", ltv: 750000 },
  { name: "Gaurav Batra", email: "gaurav.batra@batraauto.in", segment: "enterprise", ltv: 410000 },
];

const FAILURE_SCENARIOS = [
  { reason: "gateway_timeout", method: "upi", amountRange: [999, 4999] },
  { reason: "technical_failure", method: "netbanking", amountRange: [2500, 9500] },
  { reason: "upi_failure", method: "upi", amountRange: [499, 3999] },
  { reason: "checkout_abandonment", method: "card", amountRange: [1299, 8499] },
  { reason: "bank_decline", method: "card", amountRange: [3500, 18500] },
  { reason: "subscription_failure", method: "auto_debit", amountRange: [1999, 12999] },
  { reason: "insufficient_funds", method: "upi", amountRange: [1500, 7500] },
  { reason: "overdue_invoice", method: "netbanking", amountRange: [15000, 85000] },
  { reason: "expired_card", method: "card", amountRange: [2999, 14999] },
];

async function seedRecoveryData(userId = null) {
  // Clear existing buildathon demo collections for this user
  await PaymentRecord.deleteMany({ ...(userId ? { userId } : {}) });
  await ReconciliationRecord.deleteMany({ ...(userId ? { userId } : {}) });
  await RecoveryAuditLog.deleteMany({ ...(userId ? { userId } : {}) });

  // Drop legacy global unique index on transactionId if it still exists
  try {
    const indexes = await PaymentRecord.collection.indexes();
    const legacyIndex = indexes.find((idx) => idx.name === "transactionId_1" && idx.unique);
    if (legacyIndex) {
      await PaymentRecord.collection.dropIndex("transactionId_1");
    }
  } catch (e) {
    // ignore if collection is empty or index already dropped
  }

  // Ensure standard policy exists
  let policy = await RecoveryPolicy.findOne({ ...(userId ? { userId } : {}) });
  if (!policy) {
    policy = await RecoveryPolicy.create({
      name: "Standard Autonomous Policy",
      maxRetries: 3,
      minConfidenceThreshold: 70,
      highValueThreshold: 25000,
      humanEscalationEnabled: true,
      maxDaysOverdue: 45,
      retryBackoffBaseMinutes: 30,
      userId,
    });
  }

  const paymentRecords = [];
  const auditLogs = [];
  const totalPaymentsCount = 120;

  for (let i = 1; i <= totalPaymentsCount; i++) {
    const profile = CUSTOMER_PROFILES[i % CUSTOMER_PROFILES.length];
    const scenario = FAILURE_SCENARIOS[i % FAILURE_SCENARIOS.length];
    const txnId = `TXN_${1000 + i}`;
    const orderId = `ORD_${8000 + i}`;
    const customerId = `CUST_${100 + (i % 25)}`;

    // Generate amount within reasonable fintech bounds
    const baseAmount = Math.floor(
      scenario.amountRange[0] + Math.random() * (scenario.amountRange[1] - scenario.amountRange[0])
    );
    // Round to clean 10s or 99s
    const amount = baseAmount > 10000 ? Math.round(baseAmount / 500) * 500 : Math.round(baseAmount / 50) * 50;

    // Previous payment track record based on customer segment & profile LTV
    let prevSuccess = Math.floor(Math.random() * 9) + 1;
    if (profile.segment === "vip" || profile.segment === "enterprise") {
      prevSuccess += 5;
    }

    // Assign retry count (mostly 0 or 1, some 2 or 3)
    let retryCount = 0;
    if (i % 7 === 0) retryCount = 3;
    else if (i % 4 === 0) retryCount = 2;
    else if (i % 2 === 0) retryCount = 1;

    let daysOverdue = 0;
    if (scenario.reason === "overdue_invoice") {
      daysOverdue = Math.floor(Math.random() * 35) + 3;
    }

    const candidate = {
      transactionId: txnId,
      orderId,
      customerId,
      customerName: `${profile.name} ${i > CUSTOMER_PROFILES.length ? `#${Math.floor(i / CUSTOMER_PROFILES.length)}` : ""}`.trim(),
      customerEmail: profile.email,
      customerSegment: profile.segment,
      amount,
      currency: "INR",
      paymentStatus: "failed",
      failureReason: scenario.reason,
      paymentMethod: scenario.method,
      transactionTimestamp: new Date(Date.now() - (i * 3600 * 1000 * 4)),
      retryCount,
      maxRetries: 3,
      previousSuccessfulPayments: prevSuccess,
      customerLifetimeValue: profile.ltv + amount * 2,
      checkoutAbandoned: scenario.reason === "checkout_abandonment",
      subscriptionStatus: scenario.reason === "subscription_failure" ? "past_due" : "none",
      invoiceDueDate: scenario.reason === "overdue_invoice" ? new Date(Date.now() - daysOverdue * 86400000) : null,
      daysOverdue,
      recoveredAmount: 0,
      userId,
    };

    // Calculate AI Recovery Score & Diagnosis
    const scoreResult = calculateRecoveryScore(candidate, policy);
    Object.assign(candidate, scoreResult);

    // Seed realistic status distribution:
    // ~20% already recovered historically to establish baseline recovery rate metrics
    // ~10% already halted by stopping rules
    // ~8% escalated for human approval
    // ~62% active opportunities awaiting single/batch AI recovery execution
    if (i <= 24) {
      // Historical recovered payments
      candidate.paymentStatus = "recovered";
      candidate.recoveredAmount = amount;
      candidate.interventionStatus = "executed";
      candidate.recoveryTimestamp = new Date(Date.now() - (i * 3600 * 1000 * 2));

      auditLogs.push({
        transactionId: txnId,
        actionType: "batch_campaign",
        detectedProblem: `Payment failure: ${candidate.failureReason}`,
        diagnosis: candidate.diagnosis.mainReason,
        confidence: candidate.confidence,
        selectedIntervention: candidate.recommendedIntervention,
        reason: "Autonomous recovery campaign batch execution",
        previousState: "failed",
        newState: "recovered",
        recoveredAmount: amount,
        humanApprovalRequired: false,
        executionResult: "SUCCESS",
        isSimulated: true,
        timestamp: candidate.recoveryTimestamp,
        userId,
      });
    } else if (candidate.retryCount >= 3) {
      candidate.paymentStatus = "unrecoverable";
      candidate.recommendedIntervention = "halt_recovery";

      auditLogs.push({
        transactionId: txnId,
        actionType: "halt_stopping_rule",
        detectedProblem: "Exceeded max automated retry attempts",
        diagnosis: `Stopping rule triggered: Max retries (${policy.maxRetries}) reached.`,
        confidence: 94,
        selectedIntervention: "halt_recovery",
        reason: "Autonomous policy ceiling reached to prevent customer annoyance",
        previousState: "failed",
        newState: "unrecoverable",
        recoveredAmount: 0,
        humanApprovalRequired: false,
        executionResult: "STOPPED",
        isSimulated: true,
        timestamp: new Date(Date.now() - 3600000 * 5),
        userId,
      });
    } else if (candidate.amount >= policy.highValueThreshold || candidate.humanApprovalRequired) {
      candidate.paymentStatus = "escalated";
      candidate.interventionStatus = "pending";
    }

    paymentRecords.push(candidate);
  }

  await PaymentRecord.insertMany(paymentRecords);
  if (auditLogs.length > 0) {
    await RecoveryAuditLog.insertMany(auditLogs);
  }

  // Generate 100 Reconciliation Records (Track 04)
  const reconciliationRecords = [];
  const RECONCILIATION_EXCEPTION_CASES = [
    {
      type: "unmatched_amount",
      explanation: "₹500 customer return adjustment and ₹120 promotional coupon difference accounted for in final balance.",
      calc: (amt) => ({ collected: amt, settled: amt - 620, disc: 620, fee: Math.round(amt * 0.02) }),
    },
    {
      type: "missing_settlement",
      explanation: "Settlement delayed due to banking clearance holiday; pending Razorpay T+2 scheduled release batch.",
      calc: (amt) => ({ collected: amt, settled: 0, disc: amt, fee: Math.round(amt * 0.02) }),
    },
    {
      type: "duplicate_payment",
      explanation: "Client initiated duplicate UPI retry within 18 seconds; second transaction captured and scheduled for automatic refund.",
      calc: (amt) => ({ collected: amt * 2, settled: amt, disc: amt, fee: Math.round(amt * 0.02) }),
    },
    {
      type: "fee_discrepancy",
      explanation: "Gateway fee variance: 1.5% international corporate card processing surcharge applied by acquiring bank.",
      calc: (amt) => ({ collected: amt, settled: amt - Math.round(amt * 0.035), disc: Math.round(amt * 0.015), fee: Math.round(amt * 0.035) }),
    },
    {
      type: "unmatched",
      explanation: "Order created on merchant backend but no corresponding gateway authorization captured (checkout session abandoned).",
      calc: (amt) => ({ collected: 0, settled: 0, disc: amt, fee: 0 }),
    },
  ];

  for (let j = 1; j <= 100; j++) {
    const orderId = `ORD_${9000 + j}`;
    const paymentId = `PAY_${7000 + j}`;
    const settlementId = `SETTLE_${5000 + j}`;
    const orderAmount = 2500 + ((j * 370) % 35000);
    const standardFee = Math.round(orderAmount * 0.02);
    const standardTax = Math.round(standardFee * 0.18);

    // 28% exceptions, 72% matched
    const isException = j % 4 === 0 || j % 15 === 0;

    if (!isException) {
      reconciliationRecords.push({
        orderId,
        paymentId,
        settlementId,
        gateway: "Razorpay",
        orderAmount,
        collectedAmount: orderAmount,
        settledAmount: orderAmount - (standardFee + standardTax),
        feeAmount: standardFee,
        taxAmount: standardTax,
        discrepancyAmount: 0,
        status: "matched",
        transactionDate: new Date(Date.now() - (j * 1800000 * 3)),
        settlementDate: new Date(Date.now() - (j * 1800000 * 2)),
        customerName: CUSTOMER_PROFILES[j % CUSTOMER_PROFILES.length].name,
        aiExplanation: "Perfect settlement match. Razorpay standard 2% MDR + 18% GST verified against ledger.",
        resolutionStatus: "resolved",
        userId,
      });
    } else {
      const exCase = RECONCILIATION_EXCEPTION_CASES[j % RECONCILIATION_EXCEPTION_CASES.length];
      const numbers = exCase.calc(orderAmount);

      reconciliationRecords.push({
        orderId,
        paymentId: exCase.type === "unmatched" ? "UNCAPTURED" : paymentId,
        settlementId: exCase.type === "missing_settlement" || exCase.type === "unmatched" ? "" : settlementId,
        gateway: "Razorpay",
        orderAmount,
        collectedAmount: numbers.collected,
        settledAmount: numbers.settled,
        feeAmount: numbers.fee,
        taxAmount: Math.round(numbers.fee * 0.18),
        discrepancyAmount: numbers.disc,
        status: exCase.type,
        transactionDate: new Date(Date.now() - (j * 3600000 * 4)),
        settlementDate: exCase.type === "missing_settlement" || exCase.type === "unmatched" ? null : new Date(Date.now() - (j * 3600000 * 2)),
        customerName: CUSTOMER_PROFILES[j % CUSTOMER_PROFILES.length].name,
        aiExplanation: exCase.explanation,
        resolutionStatus: "open",
        userId,
      });
    }
  }

  await ReconciliationRecord.insertMany(reconciliationRecords);

  return {
    paymentsCount: paymentRecords.length,
    reconciliationsCount: reconciliationRecords.length,
    auditLogsCount: auditLogs.length,
  };
}

module.exports = {
  seedRecoveryData,
};
