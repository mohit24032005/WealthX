const mongoose = require("mongoose");

const PaymentRecordSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      default: "",
    },
    customerSegment: {
      type: String,
      enum: ["enterprise", "smb", "direct_consumer", "vip"],
      default: "direct_consumer",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentStatus: {
      type: String,
      enum: ["failed", "pending_retry", "recovered", "unrecoverable", "escalated"],
      default: "failed",
      index: true,
    },
    failureReason: {
      type: String,
      enum: [
        "insufficient_funds",
        "bank_decline",
        "gateway_timeout",
        "technical_failure",
        "expired_card",
        "upi_failure",
        "checkout_abandonment",
        "subscription_failure",
        "overdue_invoice",
      ],
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "auto_debit", "emi"],
      default: "upi",
    },
    transactionTimestamp: {
      type: Date,
      default: Date.now,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    previousSuccessfulPayments: {
      type: Number,
      default: 0,
    },
    customerLifetimeValue: {
      type: Number,
      default: 0,
    },
    checkoutAbandoned: {
      type: Boolean,
      default: false,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled", "none"],
      default: "none",
    },
    invoiceDueDate: {
      type: Date,
      default: null,
    },
    daysOverdue: {
      type: Number,
      default: 0,
    },
    recoveryProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ["CRITICAL", "ELEVATED", "MODERATE", "LOW"],
      default: "MODERATE",
    },
    scoringModelType: {
      type: String,
      enum: ["statistical_ml", "rule_based_fallback"],
      default: "statistical_ml",
    },
    recommendedIntervention: {
      type: String,
      enum: [
        "smart_retry",
        "payment_reminder_link",
        "schedule_optimal_retry",
        "escalate_human",
        "halt_recovery",
      ],
      default: "smart_retry",
    },
    interventionStatus: {
      type: String,
      enum: ["pending", "executed", "approved", "rejected"],
      default: "pending",
    },
    recoveredAmount: {
      type: Number,
      default: 0,
    },
    recoveryTimestamp: {
      type: Date,
      default: null,
    },
    diagnosis: {
      mainReason: { type: String, default: "" },
      supportingSignals: [{ type: String }],
      confidence: { type: Number, default: 85 },
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

PaymentRecordSchema.index({ transactionId: 1, userId: 1 }, { unique: true });
PaymentRecordSchema.index({ paymentStatus: 1, recoveryProbability: -1 });
PaymentRecordSchema.index({ customerSegment: 1, amount: -1 });

module.exports = mongoose.model("PaymentRecord", PaymentRecordSchema);
