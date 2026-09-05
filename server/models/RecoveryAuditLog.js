const mongoose = require("mongoose");

const RecoveryAuditLogSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        "auto_retry",
        "manual_approval",
        "batch_campaign",
        "human_escalation",
        "halt_stopping_rule",
        "demo_reset",
      ],
      required: true,
      index: true,
    },
    detectedProblem: {
      type: String,
      required: true,
    },
    diagnosis: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      default: 85,
    },
    selectedIntervention: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    previousState: {
      type: String,
      required: true,
    },
    newState: {
      type: String,
      required: true,
    },
    recoveredAmount: {
      type: Number,
      default: 0,
    },
    humanApprovalRequired: {
      type: Boolean,
      default: false,
    },
    humanApprovedBy: {
      type: String,
      default: null,
    },
    executionResult: {
      type: String,
      enum: ["SUCCESS", "FAILED", "STOPPED", "ESCALATED", "RESET"],
      required: true,
    },
    isSimulated: {
      type: Boolean,
      default: true,
    },
    policyEvaluated: {
      maxRetries: { type: Number, default: 3 },
      minConfidence: { type: Number, default: 70 },
      highValueThreshold: { type: Number, default: 25000 },
      stoppingReason: { type: String, default: null },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

RecoveryAuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("RecoveryAuditLog", RecoveryAuditLogSchema);
