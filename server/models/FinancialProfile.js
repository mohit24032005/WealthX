const mongoose = require("mongoose");

const financialProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    employmentStatus: {
      type: String,
      enum: ["salaried", "self_employed", "business", "student", "retired", "other"],
      default: "salaried",
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyExpenses: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
    investmentExperience: {
      type: [String],
      default: [],
    },
    riskProfile: {
      type: String,
      enum: ["conservative", "moderate", "aggressive"],
      default: "moderate",
    },
    primaryGoals: {
      type: [String],
      default: [],
    },
    dependentsCount: {
      type: Number,
      default: 0,
    },
    emergencyFundTargetMonths: {
      type: Number,
      default: 6,
    },
  },
  {
    timestamps: true,
  }
);

const FinancialProfile = mongoose.model("FinancialProfile", financialProfileSchema);

module.exports = FinancialProfile;
