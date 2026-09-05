const mongoose = require("mongoose");

const ReconciliationRecordSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    settlementId: {
      type: String,
      default: "",
    },
    gateway: {
      type: String,
      default: "Razorpay",
    },
    orderAmount: {
      type: Number,
      required: true,
    },
    collectedAmount: {
      type: Number,
      required: true,
    },
    settledAmount: {
      type: Number,
      required: true,
    },
    feeAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discrepancyAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "matched",
        "unmatched",
        "unmatched_amount",
        "missing_settlement",
        "duplicate_payment",
        "fee_discrepancy",
      ],
      default: "matched",
      index: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    settlementDate: {
      type: Date,
      default: null,
    },
    customerName: {
      type: String,
      default: "",
    },
    aiExplanation: {
      type: String,
      default: "",
    },
    resolutionStatus: {
      type: String,
      enum: ["open", "resolved", "investigating"],
      default: "open",
    },
    resolutionNotes: {
      type: String,
      default: "",
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

ReconciliationRecordSchema.index({ status: 1, discrepancyAmount: -1 });

module.exports = mongoose.model("ReconciliationRecord", ReconciliationRecordSchema);
