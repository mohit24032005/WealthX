const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "emergency_fund",
        "education",
        "house",
        "vehicle",
        "retirement",
        "travel",
        "wealth_creation",
        "custom",
      ],
      required: true,
      default: "wealth_creation",
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [1, "Target amount must be greater than 0"],
    },
    currentAmount: {
      type: Number,
      required: [true, "Current amount is required"],
      default: 0,
      min: [0, "Current amount cannot be negative"],
    },
    targetDate: {
      type: Date,
      required: [true, "Target date is required"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

const Goal = mongoose.model("Goal", goalSchema);

module.exports = Goal;
