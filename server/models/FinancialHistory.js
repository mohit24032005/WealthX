const mongoose = require("mongoose");

const financialHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "asset_added",
        "asset_updated",
        "asset_deleted",
        "goal_created",
        "goal_contributed",
        "goal_updated",
        "goal_deleted",
        "loan_added",
        "loan_updated",
        "loan_deleted",
        "risk_profile_updated",
        "profile_calibrated",
        "decision_inquiry",
        "simulation_run",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      default: "general",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const FinancialHistory = mongoose.model("FinancialHistory", financialHistorySchema);

module.exports = FinancialHistory;
