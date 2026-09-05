const mongoose = require("mongoose");

const mutualFundSchema = new mongoose.Schema(
  {
    schemeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    schemeName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amc: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["equity", "debt", "hybrid", "elss", "index", "liquid"],
      default: "equity",
      index: true,
    },
    subCategory: {
      type: String,
      default: "Growth",
    },
    plan: {
      type: String,
      enum: ["Direct", "Regular"],
      default: "Direct",
    },
    option: {
      type: String,
      enum: ["Growth", "Dividend", "IDCW"],
      default: "Growth",
    },
    isin: {
      type: String,
      default: "",
    },
    nav: {
      type: Number,
      required: true,
    },
    navDate: {
      type: String,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Moderately Low", "Moderate", "Moderately High", "High", "Very High"],
      default: "Very High",
    },
    expenseRatio: {
      type: Number,
      default: 0.65,
    },
    fundSizeCr: {
      type: Number,
      default: 15000,
    },
    cagr3Y: {
      type: Number,
      default: 18.5,
    },
    cagr5Y: {
      type: Number,
      default: 16.2,
    },
    suitabilityTags: [{
      type: String,
    }],
    history: [
      {
        date: { type: String },
        nav: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MutualFund", mutualFundSchema);
