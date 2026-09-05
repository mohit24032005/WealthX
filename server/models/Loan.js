const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    loanType: {
      type: String,
      enum: [
        "home",
        "education",
        "vehicle",
        "personal",
        "business",
        "credit_card",
        "other",
      ],
      required: [true, "Loan type is required"],
    },
    lenderName: {
      type: String,
      trim: true,
      default: "",
    },
    principal: {
      type: Number,
      required: [true, "Principal amount is required"],
      min: [0, "Principal amount must be >= 0"],
    },
    outstandingAmount: {
      type: Number,
      required: [true, "Outstanding amount is required"],
      min: [0, "Outstanding amount must be >= 0"],
    },
    interestRate: {
      type: Number,
      required: [true, "Interest rate is required"],
      min: [0, "Interest rate must be >= 0"],
    },
    tenureMonths: {
      type: Number,
      required: [true, "Tenure months is required"],
      min: [1, "Tenure must be at least 1 month"],
    },
    monthlyEMI: {
      type: Number,
      min: [0, "Monthly EMI must be >= 0"],
    },
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model("Loan", loanSchema);

module.exports = Loan;
