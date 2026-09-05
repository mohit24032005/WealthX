const mongoose = require("mongoose");

const RecoveryPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Standard Autonomous Policy",
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    minConfidenceThreshold: {
      type: Number,
      default: 70, // In percent
    },
    highValueThreshold: {
      type: Number,
      default: 25000, // INR
    },
    humanEscalationEnabled: {
      type: Boolean,
      default: true,
    },
    maxDaysOverdue: {
      type: Number,
      default: 45,
    },
    retryBackoffBaseMinutes: {
      type: Number,
      default: 30,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("RecoveryPolicy", RecoveryPolicySchema);
