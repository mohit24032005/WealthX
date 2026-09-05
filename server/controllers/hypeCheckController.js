const { evaluateAssetHype, getRealTimeTrendingHype } = require("../services/hypeCheckService");
const FinancialProfile = require("../models/FinancialProfile");
const RiskProfile = require("../models/RiskProfile");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Evaluate Hype Score and fundamentals with real-time live APIs
 */
const analyzeHype = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { query } = req.body;

    if (!query) {
      return sendError(res, "Please provide an asset, ticker, or financial topic to analyze", 400);
    }

    const profile = userId ? await FinancialProfile.findOne({ userId }) : null;
    const riskProfile = userId ? await RiskProfile.findOne({ userId }) : null;

    const userContext = {
      income: profile?.monthlyIncome || 0,
      surplus: Math.max(0, (profile?.monthlyIncome || 0) - (profile?.monthlyExpenses || 0)),
      riskCategory: riskProfile?.categoryLabel || "Moderate Growth",
    };

    const evaluation = await evaluateAssetHype(query, userContext);

    return sendSuccess(res, {
      ...evaluation,
      engineTag: evaluation.liveMarketData?.source || "LIVE FINANCIAL DATA FEED",
      disclaimer:
        "WealthX Hype Check evaluates structural speculative risk patterns grounded in real-time market data. It does not constitute customized SEBI investment advice.",
    }, "Hype check evaluated successfully", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Real-Time Trending Hype Topics
 */
const getTrendingTopics = async (req, res) => {
  try {
    const topics = await getRealTimeTrendingHype();
    return sendSuccess(res, topics, "Trending topics retrieved successfully", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  analyzeHype,
  getTrendingTopics,
};
