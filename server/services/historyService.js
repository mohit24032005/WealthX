const FinancialHistory = require("../models/FinancialHistory");

/**
 * Log a user financial event to the chronological timeline
 */
const logFinancialEvent = async ({
  userId,
  eventType,
  title,
  description = "",
  amount = 0,
  category = "general",
  metadata = {},
}) => {
  try {
    if (!userId || !eventType || !title) return null;
    return await FinancialHistory.create({
      userId,
      eventType,
      title,
      description,
      amount: Number(amount) || 0,
      category,
      metadata,
    });
  } catch (error) {
    console.error("Failed to log financial history event:", error.message);
    return null;
  }
};

module.exports = {
  logFinancialEvent,
};
