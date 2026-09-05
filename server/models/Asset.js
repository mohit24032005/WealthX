const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "stock",
        "mutual_fund",
        "sip",
        "gold",
        "fd",
        "bond",
        "etf",
        "savings",
        "other",
      ],
      required: true,
    },
    name: {
      type: String,
      required: [true, "Asset name is required"],
      trim: true,
    },
    investedAmount: {
      type: Number,
      required: [true, "Invested amount is required"],
      min: [0, "Invested amount cannot be negative"],
    },
    currentValue: {
      type: Number,
      required: [true, "Current value is required"],
      min: [0, "Current value cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Asset = mongoose.model("Asset", assetSchema);

module.exports = Asset;
