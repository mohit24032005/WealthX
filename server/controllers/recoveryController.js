/**
 * WealthX AI Revenue Recovery Controller
 * Track 03 — AI Revenue Recovery
 */

const PaymentRecord = require("../models/PaymentRecord");
const RecoveryAuditLog = require("../models/RecoveryAuditLog");
const RecoveryPolicy = require("../models/RecoveryPolicy");
const { calculateRecoveryScore, enrichDiagnosisWithGemini } = require("../services/recoveryScoringService");
const { seedRecoveryData } = require("../utils/seedRecoveryData");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// In-flight seed promises map to prevent concurrent duplicate seedings for the same user
const activeSeedings = new Map();

/**
 * Ensures demo recovery data exists for the given user in a safe, non-racy manner.
 * If records already exist, it immediately returns without re-seeding.
 */
const ensureUserRecoveryData = async (userId) => {
  const filter = userId ? { userId } : {};

  // 1. Database existence check: if records exist, DO NOT seed again
  const existingCount = await PaymentRecord.countDocuments(filter);
  if (existingCount > 0) {
    return { initialized: false, count: existingCount };
  }

  // 2. Prevent concurrent seedings for the same user
  const lockKey = userId ? String(userId) : "global";
  if (activeSeedings.has(lockKey)) {
    return await activeSeedings.get(lockKey);
  }

  const seedPromise = (async () => {
    try {
      const countCheck = await PaymentRecord.countDocuments(filter);
      if (countCheck > 0) {
        return { initialized: false, count: countCheck };
      }
      console.log(`[WealthX Recovery] Auto-initializing demo recovery dataset for user: ${lockKey}`);
      const counts = await seedRecoveryData(userId);
      return { initialized: true, counts };
    } finally {
      activeSeedings.delete(lockKey);
    }
  })();

  activeSeedings.set(lockKey, seedPromise);
  return await seedPromise;
};

/**
 * Get aggregated recovery KPIs & metrics dynamically calculated from MongoDB
 */
const getRecoveryStats = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const filter = userId ? { userId } : {};

    // Auto-seed demo data if user has no records yet (safe against concurrent requests & duplicates)
    await ensureUserRecoveryData(userId);

    const policy = (await RecoveryPolicy.findOne(filter)) || {
      maxRetries: 3,
      minConfidenceThreshold: 70,
      highValueThreshold: 25000,
      humanEscalationEnabled: true,
    };

    const records = await PaymentRecord.find(filter).lean();

    let totalRevenueAtRisk = 0;
    let eligibleRevenue = 0;
    let recoveredRevenue = 0;
    let recoveredCount = 0;
    let eligibleCount = 0;
    let recoveryAttempts = 0;
    let failedAttempts = 0;
    let stoppedAutomatically = 0;
    let escalatedCount = 0;

    const failureReasonBreakdown = {};
    const segmentBreakdown = {};

    records.forEach((rec) => {
      const amt = Number(rec.amount || 0);

      // Revenue at risk comprises failed, pending, escalated, and unrecoverable
      if (rec.paymentStatus !== "recovered") {
        totalRevenueAtRisk += amt;
      } else {
        recoveredRevenue += Number(rec.recoveredAmount || amt);
        recoveredCount++;
      }

      // Eligible revenue (confidence >= threshold, retries < max, overdue <= 45 days, amount < highValueThreshold)
      const maxDays = policy.maxDaysOverdue || 45;
      if (
        (rec.paymentStatus === "failed" || rec.paymentStatus === "pending_retry") &&
        rec.retryCount < policy.maxRetries &&
        rec.daysOverdue <= maxDays &&
        rec.amount < policy.highValueThreshold &&
        rec.recoveryProbability >= policy.minConfidenceThreshold
      ) {
        eligibleRevenue += amt;
        eligibleCount++;
      }

      if (rec.retryCount > 0 || rec.paymentStatus === "recovered") {
        recoveryAttempts += Math.max(1, rec.retryCount);
      }

      if (rec.paymentStatus === "unrecoverable") {
        stoppedAutomatically++;
        failedAttempts += rec.retryCount;
      }

      if (rec.paymentStatus === "escalated") {
        escalatedCount++;
      }

      // Grouping breakdowns
      failureReasonBreakdown[rec.failureReason] = (failureReasonBreakdown[rec.failureReason] || 0) + amt;
      segmentBreakdown[rec.customerSegment] = (segmentBreakdown[rec.customerSegment] || 0) + amt;
    });

    const totalCalculated = records.length;
    const totalPossibleValue = totalRevenueAtRisk + recoveredRevenue;
    const recoveryRate = totalPossibleValue > 0 ? ((recoveredRevenue / totalPossibleValue) * 100).toFixed(1) : 0;
    const avgRecoveryAmount = recoveredCount > 0 ? Math.round(recoveredRevenue / recoveredCount) : 0;

    // Recent audit activity count
    const actionsToday = await RecoveryAuditLog.countDocuments({
      ...filter,
      timestamp: { $gte: new Date(Date.now() - 86400000) },
    });

    return sendSuccess(res, {
      kpis: {
        totalRecords: totalCalculated,
        totalRevenueAtRisk,
        eligibleRevenue,
        eligibleCount,
        recoveryAttempts,
        recoveredRevenue,
        recoveredCount,
        recoveryRate: Number(recoveryRate),
        averageRecoveryAmount: avgRecoveryAmount,
        failedRecoveryAttempts: failedAttempts,
        stoppedAutomatically,
        escalatedCount,
        actionsToday,
      },
      failureReasonBreakdown,
      segmentBreakdown,
      policy: {
        maxRetries: policy.maxRetries,
        minConfidenceThreshold: policy.minConfidenceThreshold,
        highValueThreshold: policy.highValueThreshold,
        humanEscalationEnabled: policy.humanEscalationEnabled,
      },
    });
  } catch (err) {
    console.error("Error in getRecoveryStats:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Get paginated & filtered payment records
 */
const getPaymentRecords = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    // Auto-seed demo data if user has no records yet (safe against concurrent requests & duplicates)
    await ensureUserRecoveryData(userId);

    const {
      status,
      segment,
      reason,
      minProbability,
      search,
      page = 1,
      limit = 20,
      sortBy = "recoveryProbability",
      sortOrder = "desc",
    } = req.query;

    const filter = userId ? { userId } : {};

    if (status && status !== "all") {
      filter.paymentStatus = status;
    }
    if (segment && segment !== "all") {
      filter.customerSegment = segment;
    }
    if (reason && reason !== "all") {
      filter.failureReason = reason;
    }
    if (minProbability) {
      filter.recoveryProbability = { $gte: Number(minProbability) };
    }
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { orderId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [records, total] = await Promise.all([
      PaymentRecord.find(filter).sort(sort).skip(skip).limit(parseInt(limit, 10)).lean(),
      PaymentRecord.countDocuments(filter),
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
    console.error("Error in getPaymentRecords:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Get single payment record with deep AI diagnosis
 */
const getPaymentRecordById = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { id } = req.params;
    const filter = {
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transactionId: id }],
      ...(userId ? { userId } : {}),
    };
    const record = await PaymentRecord.findOne(filter);

    if (!record) {
      return sendError(res, "Payment record not found", 404);
    }

    // Deep dynamic analysis
    const policy = (await RecoveryPolicy.findOne(userId ? { userId } : {})) || {};
    const scoring = calculateRecoveryScore(record, policy);
    const enriched = await enrichDiagnosisWithGemini(record, scoring);

    return sendSuccess(res, {
      record,
      aiAnalysis: enriched,
    });
  } catch (err) {
    console.error("Error in getPaymentRecordById:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Bounded Execution: Recover a single payment in SIMULATED / TEST MODE
 */
const executeRecovery = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { id } = req.params;
    const { humanApproved = false, approvedBy = "User Operator" } = req.body;

    const filter = {
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { transactionId: id }],
      ...(userId ? { userId } : {}),
    };
    const record = await PaymentRecord.findOne(filter);

    if (!record) {
      return sendError(res, "Payment record not found", 404);
    }

    if (record.paymentStatus === "recovered" || record.recoveredAmount > 0) {
      return sendError(res, `Payment ${record.transactionId} is already recovered (₹${(record.recoveredAmount || record.amount).toLocaleString("en-IN")}). Duplicate recovery execution prevented.`, 400);
    }

    if (record.paymentStatus === "unrecoverable") {
      return sendError(res, `Payment ${record.transactionId} is marked unrecoverable (stopping rule triggered). Automated retries permanently halted.`, 400);
    }

    const policy = (await RecoveryPolicy.findOne(userId ? { userId } : {})) || {
      maxRetries: 3,
      minConfidenceThreshold: 70,
      highValueThreshold: 25000,
      maxDaysOverdue: 45,
    };

    // Stopping Rule Check 1: Max Retries
    if (record.retryCount >= policy.maxRetries) {
      record.paymentStatus = "unrecoverable";
      record.recommendedIntervention = "halt_recovery";
      await record.save();

      await RecoveryAuditLog.create({
        transactionId: record.transactionId,
        actionType: "halt_stopping_rule",
        detectedProblem: "Max retry limit reached",
        diagnosis: `Stopping rule active: Attempt limit of ${policy.maxRetries} reached.`,
        confidence: 96,
        selectedIntervention: "halt_recovery",
        reason: "Autonomous policy ceiling reached to protect customer trust",
        previousState: record.paymentStatus,
        newState: "unrecoverable",
        recoveredAmount: 0,
        humanApprovalRequired: false,
        executionResult: "STOPPED",
        isSimulated: true,
        userId,
      });

      return sendSuccess(res, {
        result: "STOPPED",
        message: `Stopping rule triggered: Max retries (${policy.maxRetries}) reached. Automated recovery halted.`,
        record,
      });
    }

    // Stopping Rule Check 2: >45 Days Overdue is Unrecoverable
    const maxDaysOverdue = policy.maxDaysOverdue || 45;
    if (record.daysOverdue > maxDaysOverdue) {
      record.paymentStatus = "unrecoverable";
      record.recommendedIntervention = "halt_recovery";
      await record.save();

      await RecoveryAuditLog.create({
        transactionId: record.transactionId,
        actionType: "halt_stopping_rule",
        detectedProblem: "Invoice aging cutoff exceeded",
        diagnosis: `Stopping rule active: Transaction is ${record.daysOverdue} days overdue (threshold: ${maxDaysOverdue} days). Marked unrecoverable.`,
        confidence: 97,
        selectedIntervention: "halt_recovery",
        reason: "Autonomous policy ceiling for debt aging reached to prevent customer annoyance",
        previousState: record.paymentStatus,
        newState: "unrecoverable",
        recoveredAmount: 0,
        humanApprovalRequired: false,
        executionResult: "STOPPED",
        isSimulated: true,
        userId,
      });

      return sendSuccess(res, {
        result: "STOPPED",
        message: `Stopping rule triggered: Transaction is ${record.daysOverdue} days overdue (> ${maxDaysOverdue} days). Marked unrecoverable.`,
        record,
      });
    }

    // Stopping Rule Check 3: Below 70% confidence cannot be automatically retried
    const minConfidence = policy.minConfidenceThreshold || 70;
    if (record.recoveryProbability < minConfidence && !humanApproved) {
      record.paymentStatus = "escalated";
      await record.save();

      return sendSuccess(res, {
        result: "ESCALATED",
        requiresApproval: true,
        message: `Recovery probability (${record.recoveryProbability}%) is below autonomous confidence cutoff (${minConfidence}%). Human review required before retry.`,
        record,
      });
    }

    // Stopping Rule Check 4: High Value Escalation Check (>= ₹25,000)
    if (record.amount >= policy.highValueThreshold && !humanApproved) {
      record.paymentStatus = "escalated";
      await record.save();

      return sendSuccess(res, {
        result: "ESCALATED",
        requiresApproval: true,
        message: `High-value payment (₹${record.amount.toLocaleString("en-IN")}) exceeds autonomous policy threshold of ₹${policy.highValueThreshold.toLocaleString("en-IN")}. Human approval required.`,
        record,
      });
    }

    // Execute Bounded Simulation using calculated probability
    const previousState = record.paymentStatus;
    const recoverySuccess = Math.random() * 100 < record.recoveryProbability;

    if (recoverySuccess) {
      record.paymentStatus = "recovered";
      record.recoveredAmount = record.amount;
      record.recoveryTimestamp = new Date();
      record.retryCount += 1;
      record.interventionStatus = "executed";
      await record.save();

      await RecoveryAuditLog.create({
        transactionId: record.transactionId,
        actionType: humanApproved ? "manual_approval" : "auto_retry",
        detectedProblem: `Payment failure due to ${record.failureReason}`,
        diagnosis: record.diagnosis?.mainReason || `Recovery intervention executed for ${record.transactionId}`,
        confidence: record.diagnosis?.confidence || record.confidence || 85,
        selectedIntervention: record.recommendedIntervention,
        reason: humanApproved
          ? `Human approved execution by ${approvedBy}`
          : "Autonomous recovery criteria met",
        previousState,
        newState: "recovered",
        recoveredAmount: record.amount,
        humanApprovalRequired: record.amount >= policy.highValueThreshold,
        humanApprovedBy: humanApproved ? approvedBy : null,
        executionResult: "SUCCESS",
        isSimulated: true,
        userId,
      });

      return sendSuccess(res, {
        result: "SUCCESS",
        message: `Successfully recovered ₹${record.amount.toLocaleString("en-IN")} in SIMULATED / TEST MODE.`,
        recoveredAmount: record.amount,
        record,
      });
    } else {
      record.retryCount += 1;
      // Re-evaluate score with incremented retry count
      const updatedScore = calculateRecoveryScore(record, policy);
      Object.assign(record, updatedScore);

      if (record.retryCount >= policy.maxRetries) {
        record.paymentStatus = "unrecoverable";
        record.recommendedIntervention = "halt_recovery";
      } else {
        record.paymentStatus = "pending_retry";
      }
      await record.save();

      await RecoveryAuditLog.create({
        transactionId: record.transactionId,
        actionType: "auto_retry",
        detectedProblem: `Payment failure: ${record.failureReason}`,
        diagnosis: `Intervention attempt failed. Current attempt: ${record.retryCount}/${policy.maxRetries}.`,
        confidence: record.diagnosis?.confidence || record.confidence || 85,
        selectedIntervention: record.recommendedIntervention,
        reason: "Test recovery attempt failed upstream bank simulation response",
        previousState,
        newState: record.paymentStatus,
        recoveredAmount: 0,
        humanApprovalRequired: false,
        executionResult: record.paymentStatus === "unrecoverable" ? "STOPPED" : "FAILED",
        isSimulated: true,
        userId,
      });

      return sendSuccess(res, {
        result: record.paymentStatus === "unrecoverable" ? "STOPPED" : "FAILED",
        message:
          record.paymentStatus === "unrecoverable"
            ? `Recovery failed and reached maximum retry ceiling (${policy.maxRetries}). Payment marked unrecoverable.`
            : `Recovery attempt failed. Retry count incremented to ${record.retryCount}/${policy.maxRetries}.`,
        recoveredAmount: 0,
        record,
      });
    }
  } catch (err) {
    console.error("Error in executeRecovery:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Run AI Recovery Campaign (Batch execution across all eligible records)
 */
const runBatchCampaign = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const filter = userId ? { userId } : {};

    const policy = (await RecoveryPolicy.findOne(filter)) || {
      maxRetries: 3,
      minConfidenceThreshold: 70,
      highValueThreshold: 25000,
    };

    // Find all eligible records
    const allRecords = await PaymentRecord.find({
      ...filter,
      paymentStatus: { $in: ["failed", "pending_retry", "escalated"] },
    });

    let analyzedCount = allRecords.length;
    let eligibleCount = 0;
    let skippedCount = 0;
    let attemptedCount = 0;
    let recoveredCount = 0;
    let recoveredAmount = 0;
    let unrecoveredAmount = 0;
    let stoppedCount = 0;
    let escalatedCount = 0;

    const auditBatch = [];

    for (const record of allRecords) {
      // Stopping rule check 1: Max retries
      if (record.retryCount >= policy.maxRetries) {
        record.paymentStatus = "unrecoverable";
        record.recommendedIntervention = "halt_recovery";
        stoppedCount++;
        skippedCount++;
        await record.save();
        continue;
      }

      // Stopping rule check 2: Days overdue cutoff (> 45 days)
      const maxDaysOverdue = policy.maxDaysOverdue || 45;
      if (record.daysOverdue > maxDaysOverdue) {
        record.paymentStatus = "unrecoverable";
        record.recommendedIntervention = "halt_recovery";
        stoppedCount++;
        skippedCount++;
        await record.save();
        continue;
      }

      // High value threshold: requires human approval, do not execute blindly in batch
      if (record.amount >= policy.highValueThreshold) {
        record.paymentStatus = "escalated";
        escalatedCount++;
        skippedCount++;
        await record.save();
        continue;
      }

      // Confidence threshold check
      if (record.recoveryProbability < policy.minConfidenceThreshold) {
        record.paymentStatus = "escalated";
        escalatedCount++;
        skippedCount++;
        await record.save();
        continue;
      }

      // Eligible candidate
      eligibleCount++;
      attemptedCount++;

      const previousState = record.paymentStatus;
      // Probabilistic simulated execution
      const isSuccess = Math.random() * 100 < record.recoveryProbability;

      if (isSuccess) {
        record.paymentStatus = "recovered";
        record.recoveredAmount = record.amount;
        record.recoveryTimestamp = new Date();
        record.retryCount += 1;
        record.interventionStatus = "executed";
        recoveredCount++;
        recoveredAmount += record.amount;

        auditBatch.push({
          transactionId: record.transactionId,
          actionType: "batch_campaign",
          detectedProblem: `Payment failure: ${record.failureReason}`,
          diagnosis: record.diagnosis?.mainReason || `Batch intervention on ${record.transactionId}`,
          confidence: record.diagnosis?.confidence || record.confidence || 85,
          selectedIntervention: record.recommendedIntervention,
          reason: "AI Recovery Campaign autonomous batch execution",
          previousState,
          newState: "recovered",
          recoveredAmount: record.amount,
          humanApprovalRequired: false,
          executionResult: "SUCCESS",
          isSimulated: true,
          userId,
        });
      } else {
        record.retryCount += 1;
        unrecoveredAmount += record.amount;

        if (record.retryCount >= policy.maxRetries) {
          record.paymentStatus = "unrecoverable";
          record.recommendedIntervention = "halt_recovery";
          stoppedCount++;
        } else {
          record.paymentStatus = "pending_retry";
        }

        // Re-score
        const updatedScore = calculateRecoveryScore(record, policy);
        Object.assign(record, updatedScore);

        auditBatch.push({
          transactionId: record.transactionId,
          actionType: "batch_campaign",
          detectedProblem: `Payment failure: ${record.failureReason}`,
          diagnosis: `Batch attempt failed. Retry ${record.retryCount}/${policy.maxRetries}`,
          confidence: record.diagnosis?.confidence || record.confidence || 85,
          selectedIntervention: record.recommendedIntervention,
          reason: "Batch intervention response failed simulated gateway authorization",
          previousState,
          newState: record.paymentStatus,
          recoveredAmount: 0,
          humanApprovalRequired: false,
          executionResult: record.paymentStatus === "unrecoverable" ? "STOPPED" : "FAILED",
          isSimulated: true,
          userId,
        });
      }

      await record.save();
    }

    if (auditBatch.length > 0) {
      await RecoveryAuditLog.insertMany(auditBatch);
    }

    return sendSuccess(res, {
      batchSummary: {
        analyzedCount,
        eligibleCount,
        skippedCount,
        attemptedCount,
        recoveredCount,
        recoveredAmount,
        unrecoveredAmount,
        stoppedCount,
        escalatedCount,
        effectiveBatchRecoveryRate:
          attemptedCount > 0 ? ((recoveredCount / attemptedCount) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    console.error("Error in runBatchCampaign:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Re-seed / Reset demo dataset
 */
const resetDemoData = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const counts = await seedRecoveryData(userId);

    await RecoveryAuditLog.create({
      transactionId: "SYSTEM_DEMO_INIT",
      actionType: "demo_reset",
      detectedProblem: "Demo environment calibration",
      diagnosis: "Re-seeded 120 synthetic payment records and 60 reconciliation records",
      confidence: 100,
      selectedIntervention: "smart_retry",
      reason: "User invoked Load / Reset Demo Dataset",
      previousState: "dirty",
      newState: "seeded",
      recoveredAmount: 0,
      humanApprovalRequired: false,
      executionResult: "RESET",
      isSimulated: true,
      userId,
    });

    return sendSuccess(res, {
      message: "Demo dataset reset successfully. 120 payment records & 60 reconciliation records initialized.",
      counts,
    });
  } catch (err) {
    console.error("Error in resetDemoData:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Get immutable audit logs with pagination and filters
 */
const getAuditLogs = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { actionType, result, search, page = 1, limit = 25 } = req.query;

    const filter = userId ? { userId } : {};
    if (actionType && actionType !== "all") {
      filter.actionType = actionType;
    }
    if (result && result !== "all") {
      filter.executionResult = result;
    }
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: "i" } },
        { diagnosis: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, total] = await Promise.all([
      RecoveryAuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      RecoveryAuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      logs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error("Error in getAuditLogs:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Recovery Strategy Simulator: Compare Conservative vs Aggressive vs AI Dynamic Policy
 */
const simulateStrategy = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const { maxRetries = 3, minConfidence = 70, highValueThreshold = 25000 } = req.body;

    const records = await PaymentRecord.find(userId ? { userId } : {}).lean();
    const totalRecords = records.length;
    const totalPotentialAtRisk = records.reduce((sum, r) => sum + r.amount, 0);

    // Run hypothetical simulation across the dataset
    let projectedRecoveredRevenue = 0;
    let projectedRecoveredCount = 0;
    let projectedAttempts = 0;
    let projectedCustomerFrictionCount = 0; // repeated retries that cause annoyance

    records.forEach((rec) => {
      // Calculate hypothetical score
      const simScore = calculateRecoveryScore(rec, {
        maxRetries: Number(maxRetries),
        minConfidenceThreshold: Number(minConfidence),
        highValueThreshold: Number(highValueThreshold),
      });

      if (simScore.recoveryProbability >= Number(minConfidence)) {
        projectedAttempts += Math.min(Number(maxRetries), rec.retryCount + 1);
        const expRecoveryPct = (simScore.recoveryProbability / 100) * (Number(maxRetries) >= 3 ? 1.05 : 0.88);
        const expectedRec = rec.amount * Math.min(0.95, expRecoveryPct);
        projectedRecoveredRevenue += expectedRec;
        projectedRecoveredCount++;

        if (Number(maxRetries) > 3) {
          projectedCustomerFrictionCount++;
        }
      }
    });

    const projectedRecoveryRate = totalPotentialAtRisk > 0 ? ((projectedRecoveredRevenue / totalPotentialAtRisk) * 100).toFixed(1) : 0;

    return sendSuccess(res, {
      simulationParams: {
        maxRetries: Number(maxRetries),
        minConfidence: Number(minConfidence),
        highValueThreshold: Number(highValueThreshold),
      },
      projections: {
        totalRecords,
        totalPotentialAtRisk,
        projectedRecoveredRevenue: Math.round(projectedRecoveredRevenue),
        projectedRecoveredCount,
        projectedRecoveryRate: Number(projectedRecoveryRate),
        projectedAttempts,
        projectedCustomerFrictionCount,
        tradeoffNote:
          Number(maxRetries) > 3
            ? "Aggressive retry policy yields higher nominal recovery, but increases customer churn risk by 18%."
            : "Bounded policy maintains healthy balance between recovery conversion and customer retention.",
      },
    });
  } catch (err) {
    console.error("Error in simulateStrategy:", err);
    return sendError(res, err.message, 500);
  }
};

/**
 * Get and update recovery policies
 */
const getPolicy = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    let policy = await RecoveryPolicy.findOne(userId ? { userId } : {});
    if (!policy) {
      policy = await RecoveryPolicy.create({ userId });
    }
    return sendSuccess(res, policy);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

const updatePolicy = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const updates = req.body;
    let policy = await RecoveryPolicy.findOneAndUpdate(
      userId ? { userId } : {},
      { $set: updates },
      { new: true, upsert: true }
    );
    return sendSuccess(res, policy);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
};

module.exports = {
  getRecoveryStats,
  getPaymentRecords,
  getPaymentRecordById,
  executeRecovery,
  runBatchCampaign,
  resetDemoData,
  getAuditLogs,
  simulateStrategy,
  getPolicy,
  updatePolicy,
};
