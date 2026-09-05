const Goal = require("../models/Goal");
const { logFinancialEvent } = require("../services/historyService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Helper to compute progress, timeline metrics, and status for a goal
 */
const enrichGoal = (goal) => {
  const target = Number(goal.targetAmount) || 1;
  const current = Number(goal.currentAmount) || 0;
  const progressPct = Math.min(100, Math.round((current / target) * 100));

  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const createdAt = new Date(goal.createdAt || now);

  const totalDurationDays = Math.max(1, (targetDate - createdAt) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, (targetDate - now) / (1000 * 60 * 60 * 24));
  const remainingMonths = Math.max(1, Math.ceil(remainingDays / 30.4375));

  const remainingAmount = Math.max(0, target - current);
  const requiredMonthlyContribution = Math.round(remainingAmount / remainingMonths);
  const monthlyContribution = Number(goal.monthlyContribution || 0);

  const timeElapsedRatio = Math.min(1, elapsedDays / totalDurationDays);
  const progressRatio = Math.min(1, current / target);

  let status = "on_track";
  let statusLabel = "On Track";

  if (progressPct >= 100) {
    status = "completed";
    statusLabel = "Achieved";
  } else if (remainingDays <= 0) {
    status = "behind_schedule";
    statusLabel = "Deadline Reached";
  } else if (requiredMonthlyContribution > 0 && monthlyContribution < requiredMonthlyContribution * 0.5) {
    status = "behind_schedule";
    statusLabel = "Behind Schedule";
  } else if (requiredMonthlyContribution > 0 && monthlyContribution < requiredMonthlyContribution * 0.85) {
    status = "needs_attention";
    statusLabel = "Needs Attention";
  } else if (timeElapsedRatio - progressRatio > 0.2) {
    status = "behind_schedule";
    statusLabel = "Behind Schedule";
  } else if (timeElapsedRatio - progressRatio > 0.08) {
    status = "needs_attention";
    statusLabel = "Needs Attention";
  }

  return {
    ...goal.toObject(),
    progressPct,
    remainingAmount,
    remainingDays: Math.round(remainingDays),
    remainingMonths,
    requiredMonthlyContribution,
    monthlyContribution,
    status,
    statusLabel,
  };
};

/**
 * Get all goals for authenticated user with dynamic progress analytics
 */
const getGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });

    const enrichedGoals = goals.map(enrichGoal);

    let totalTargetAmount = 0;
    let totalCurrentSaved = 0;
    let onTrackCount = 0;
    let behindCount = 0;
    let needsAttentionCount = 0;

    enrichedGoals.forEach((g) => {
      totalTargetAmount += Number(g.targetAmount || 0);
      totalCurrentSaved += Number(g.currentAmount || 0);
      if (g.status === "on_track" || g.status === "completed") onTrackCount += 1;
      else if (g.status === "behind_schedule") behindCount += 1;
      else if (g.status === "needs_attention") needsAttentionCount += 1;
    });

    const overallProgressPct = totalTargetAmount > 0
      ? Math.min(100, Math.round((totalCurrentSaved / totalTargetAmount) * 100))
      : 0;

    return sendSuccess(res, {
      goals: enrichedGoals,
      summary: {
        totalGoals: goals.length,
        totalTargetAmount,
        totalCurrentSaved,
        overallProgressPct,
        onTrackCount,
        behindCount,
        needsAttentionCount,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create a new goal for authenticated user
 */
const createGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category, targetAmount, currentAmount = 0, targetDate, priority = "medium" } = req.body;

    if (!title || !targetAmount || !targetDate) {
      return sendError(res, "Please provide title, targetAmount, and targetDate", 400);
    }

    const numTarget = Number(targetAmount);
    const numCurrent = Number(currentAmount);

    if (isNaN(numTarget) || numTarget <= 0) {
      return sendError(res, "Target amount must be a number greater than 0", 400);
    }

    if (isNaN(numCurrent) || numCurrent < 0) {
      return sendError(res, "Current amount must be a number greater than or equal to 0", 400);
    }

    const parsedDate = new Date(targetDate);
    if (isNaN(parsedDate.getTime())) {
      return sendError(res, "Invalid targetDate format", 400);
    }

    const validCategories = [
      "emergency_fund",
      "education",
      "house",
      "vehicle",
      "retirement",
      "travel",
      "wealth_creation",
      "custom",
    ];

    const chosenCategory = validCategories.includes(category) ? category : "wealth_creation";

    const validPriorities = ["low", "medium", "high"];
    const chosenPriority = validPriorities.includes(priority) ? priority : "medium";

    const newGoal = await Goal.create({
      userId,
      title: title.trim(),
      category: chosenCategory,
      targetAmount: numTarget,
      currentAmount: numCurrent,
      targetDate: parsedDate,
      priority: chosenPriority,
    });

    await logFinancialEvent({
      userId,
      eventType: "goal_created",
      title: `Created Goal: ${newGoal.title}`,
      description: `Targeting ₹${numTarget.toLocaleString("en-IN")} by ${parsedDate.toLocaleDateString("en-IN")}.`,
      amount: numTarget,
      category: chosenCategory,
      metadata: { goalId: newGoal._id },
    });

    return sendSuccess(res, enrichGoal(newGoal), "Financial goal created successfully", 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update an existing goal (strictly scoped by _id AND userId)
 */
const updateGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, category, targetAmount, currentAmount, targetDate, priority } = req.body;

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return sendError(res, "Goal not found or access denied", 404);
    }

    if (title !== undefined) {
      if (!title.trim()) return sendError(res, "Goal title cannot be empty", 400);
      goal.title = title.trim();
    }

    if (category !== undefined) {
      const validCategories = [
        "emergency_fund",
        "education",
        "house",
        "vehicle",
        "retirement",
        "travel",
        "wealth_creation",
        "custom",
      ];
      if (validCategories.includes(category)) {
        goal.category = category;
      }
    }

    if (targetAmount !== undefined) {
      const numTarget = Number(targetAmount);
      if (isNaN(numTarget) || numTarget <= 0) {
        return sendError(res, "Target amount must be greater than 0", 400);
      }
      goal.targetAmount = numTarget;
    }

    if (currentAmount !== undefined) {
      const numCurrent = Number(currentAmount);
      if (isNaN(numCurrent) || numCurrent < 0) {
        return sendError(res, "Current amount must be greater than or equal to 0", 400);
      }
      goal.currentAmount = numCurrent;
    }

    if (targetDate !== undefined) {
      const parsedDate = new Date(targetDate);
      if (isNaN(parsedDate.getTime())) {
        return sendError(res, "Invalid targetDate format", 400);
      }
      goal.targetDate = parsedDate;
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "medium", "high"];
      if (validPriorities.includes(priority)) {
        goal.priority = priority;
      }
    }

    await goal.save();
    return sendSuccess(res, enrichGoal(goal), "Goal updated successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete a goal (strictly scoped by _id AND userId)
 */
const deleteGoal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const goal = await Goal.findOneAndDelete({ _id: id, userId });
    if (!goal) {
      return sendError(res, "Goal not found or access denied", 404);
    }

    return sendSuccess(res, { id: goal._id }, "Goal deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  enrichGoal,
};
