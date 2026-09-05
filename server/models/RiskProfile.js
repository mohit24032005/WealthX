const mongoose = require("mongoose");

const riskProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    profileCategory: {
      type: String,
      enum: ["very_conservative", "conservative", "balanced", "moderate", "moderate_growth", "growth", "aggressive"],
      required: true,
    },
    categoryLabel: {
      type: String,
      default: "Balanced Growth (Strategic Compounder)",
    },
    componentScores: {
      riskToleranceScore: { type: Number, default: 50 },
      investmentHorizonScore: { type: Number, default: 70 },
      goalCompatibilityScore: { type: Number, default: 70 },
      riskCapacityScore: { type: Number, default: 55 },
    },
    investmentHorizonYears: {
      type: Number,
      default: 7,
    },
    recommendedAllocation: {
      equityPct: { type: Number, default: 70, min: 0, max: 100 },
      debtPct: { type: Number, default: 15, min: 0, max: 100 },
      goldPct: { type: Number, default: 10, min: 0, max: 100 },
      cashPct: { type: Number, default: 5, min: 0, max: 100 },
    },
    toleranceVsCapacity: {
      toleranceScore: Number,
      capacityScore: Number,
      differential: Number,
      status: String,
      headline: String,
      explanation: String,
    },
    whyReasons: {
      type: [String],
      default: [],
    },
    warnings: {
      type: [String],
      default: [],
    },
    guidance: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
      default: "",
    },
    confidence: {
      type: Number,
      default: 90,
    },
    assessmentAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isAssessed: {
      type: Boolean,
      default: true,
    },
    history: [
      {
        score: Number,
        categoryLabel: String,
        profileCategory: String,
        date: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const RiskProfile = mongoose.model("RiskProfile", riskProfileSchema);

module.exports = RiskProfile;
