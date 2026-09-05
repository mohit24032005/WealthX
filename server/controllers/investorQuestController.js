const FinancialProfile = require("../models/FinancialProfile");
const RiskProfile = require("../models/RiskProfile");
const Goal = require("../models/Goal");
const Asset = require("../models/Asset");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const {
  createInitialState,
  processTurn,
  generateWhatIfAnalysis,
} = require("../services/questEngineService");
const {
  explainTurnConsequence,
  askMentorQuestion,
} = require("../services/questMentorService");

/**
 * Get Initial Game Configuration and User Snapshot
 */
const getInitialConfig = async (req, res) => {
  try {
    const userId = req.user?.id;
    let profile = null;
    let riskProfile = null;
    let primaryGoal = null;
    let totalVaultAssets = 0;

    if (userId) {
      profile = await FinancialProfile.findOne({ userId });
      riskProfile = await RiskProfile.findOne({ userId });
      primaryGoal = await Goal.findOne({ userId }).sort({ createdAt: -1 });
      const assets = await Asset.find({ userId });
      assets.forEach((a) => {
        totalVaultAssets += Number(a.currentValue || 0);
      });
    }

    const hasRealProfile = !!(profile && profile.monthlyIncome > 0);

    const profileSnapshot = hasRealProfile
      ? {
          monthlyIncome: profile.monthlyIncome,
          monthlyExpenses: profile.monthlyExpenses,
          currentSavings: profile.currentSavings || 0,
          startingInvestments: totalVaultAssets || 50000,
          riskProfile: riskProfile?.profileCategory || "moderate",
          riskCategoryLabel: riskProfile?.categoryLabel || "Moderate Growth",
          goalTitle: primaryGoal?.title || "5-Year Wealth Milestone",
          goalTarget: primaryGoal?.targetAmount || 500000,
        }
      : null;

    const quickPlayDefaults = {
      startingWealth: 100000,
      monthlyIncome: 50000,
      monthlyExpenses: 30000,
      monthlySurplus: 20000,
      startingSavings: 30000,
      goalTarget: 500000,
      goalTitle: "5-Year ₹5 Lakhs Wealth Milestone",
      timeHorizonYears: 5,
    };

    return sendSuccess(res, {
      hasRealProfile,
      profileSnapshot,
      quickPlayDefaults,
      disclaimer:
        "Investor Quest is an educational simulation. Market movements, returns, and life events are simulated and do not involve real money or represent guaranteed investment advice.",
    }, "Game configuration loaded", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Start a new simulation session
 */
const startSimulation = async (req, res) => {
  try {
    const { mode = "quick_play", useProfileSnapshot = false, customConfig = {} } = req.body;
    const userId = req.user?.id;

    let snapshot = {};
    if (useProfileSnapshot && userId) {
      const profile = await FinancialProfile.findOne({ userId });
      const riskProfile = await RiskProfile.findOne({ userId });
      const primaryGoal = await Goal.findOne({ userId });
      const assets = await Asset.find({ userId });
      let totalVault = 0;
      assets.forEach((a) => { totalVault += Number(a.currentValue || 0); });

      if (profile) {
        snapshot = {
          monthlyIncome: profile.monthlyIncome,
          monthlyExpenses: profile.monthlyExpenses,
          currentSavings: profile.currentSavings || 0,
          startingInvestments: totalVault,
          riskProfile: riskProfile?.profileCategory || "moderate",
          riskCategoryLabel: riskProfile?.categoryLabel || "Moderate Growth",
          goalTitle: primaryGoal?.title || "WealthX Milestone",
          goalTarget: primaryGoal?.targetAmount || 500000,
        };
      }
    }

    const state = createInitialState({
      mode,
      initialSnapshot: snapshot,
      customConfig,
    });

    return sendSuccess(res, state, "Simulation started successfully", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Process a turn decision
 */
const processTurnAction = async (req, res) => {
  try {
    const { state, decision } = req.body;

    if (!state) {
      return sendError(res, "Missing current simulation state", 400);
    }

    const turnResult = processTurn(state, decision || {});
    
    // Generate AI Mentor Explanation for consequence
    const mentorReview = await explainTurnConsequence({
      turnRecord: turnResult.turnRecord,
      gameState: turnResult.state,
      decision: decision || {},
    });

    return sendSuccess(res, {
      state: turnResult.state,
      turnRecord: turnResult.turnRecord,
      triggeredEvent: turnResult.triggeredEvent,
      eventConsequenceSummary: turnResult.eventConsequenceSummary,
      unlockedAchievements: turnResult.unlockedAchievements,
      mentorReview,
    }, "Turn processed successfully", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Ask WealthX AI Mentor an interactive question
 */
const askMentor = async (req, res) => {
  try {
    const { question, gameState } = req.body;

    if (!question) {
      return sendError(res, "Please provide a question for the mentor", 400);
    }

    const answer = await askMentorQuestion({
      question,
      gameState: gameState || {},
    });

    return sendSuccess(res, answer, "Mentor response generated", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Generate What-If Alternative Trajectories for completed simulation
 */
const getWhatIfAnalysis = async (req, res) => {
  try {
    const { state } = req.body;

    if (!state) {
      return sendError(res, "Missing completed simulation state", 400);
    }

    const analysis = generateWhatIfAnalysis(state);
    return sendSuccess(res, analysis, "What-if analysis generated", 200);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getInitialConfig,
  startSimulation,
  processTurnAction,
  askMentor,
  getWhatIfAnalysis,
};
