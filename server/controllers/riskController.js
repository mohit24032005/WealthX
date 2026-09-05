const RiskProfile = require("../models/RiskProfile");
const Asset = require("../models/Asset");
const FinancialProfile = require("../models/FinancialProfile");
const Goal = require("../models/Goal");
const Loan = require("../models/Loan");
const { logFinancialEvent } = require("../services/historyService");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { calculateRiskProfile } = require("../services/riskEngineService");

/**
 * Get Risk DNA, component breakdown, and compare with live portfolio allocation
 */
const getRiskDNA = async (req, res) => {
  try {
    const userId = req.user.id;
    const [existingProfile, financialProfile, assets, goals, loans] = await Promise.all([
      RiskProfile.findOne({ userId }),
      FinancialProfile.findOne({ userId }),
      Asset.find({ userId }),
      Goal.find({ userId }),
      Loan.find({ userId }),
    ]);

    // If already assessed, run live calculation to ensure real-time portfolio & capacity syncing
    if (existingProfile && existingProfile.assessmentAnswers) {
      const liveCalculation = calculateRiskProfile({
        answers: existingProfile.assessmentAnswers,
        financialProfile,
        goals,
        loans,
        assets,
      });

      return sendSuccess(res, {
        isAssessed: true,
        riskScore: existingProfile.riskScore,
        profileCategory: existingProfile.profileCategory,
        categoryLabel: existingProfile.categoryLabel,
        componentScores: existingProfile.componentScores || liveCalculation.componentScores,
        investmentHorizonYears: existingProfile.investmentHorizonYears || liveCalculation.investmentHorizonYears,
        recommendedAllocation: existingProfile.recommendedAllocation || liveCalculation.recommendedAllocation,
        toleranceVsCapacity: liveCalculation.toleranceVsCapacity,
        whyReasons: existingProfile.whyReasons?.length > 0 ? existingProfile.whyReasons : liveCalculation.whyReasons,
        warnings: existingProfile.warnings?.length > 0 ? existingProfile.warnings : liveCalculation.warnings,
        appliedGuardrails: liveCalculation.appliedGuardrails,
        goalCompatibilityList: liveCalculation.goalCompatibilityList,
        actualPortfolio: liveCalculation.actualPortfolio,
        portfolioAlignment: liveCalculation.portfolioAlignment,
        guidance: liveCalculation.guidance,
        explanation: existingProfile.explanation || liveCalculation.explanation,
        confidence: existingProfile.confidence || liveCalculation.confidence,
        assessmentAnswers: existingProfile.assessmentAnswers,
        history: existingProfile.history || [],
        userFinancialSnapshot: {
          monthlyIncome: financialProfile?.monthlyIncome || 0,
          monthlyExpenses: financialProfile?.monthlyExpenses || 0,
          currentSavings: financialProfile?.currentSavings || 0,
          goalsCount: goals.length,
          loansCount: loans.length,
          assetsCount: assets.length,
        },
      });
    }

    // If not assessed yet, generate default baseline with user's actual financial situation
    const defaultCalculation = calculateRiskProfile({
      answers: {
        investmentHorizon: "5-10_years",
        marketReaction: "hold_patiently",
        growthPreference: "moderate_fluctuations",
        marketCrashFeeling: "somewhat_uncomfortable",
        primaryGoal: goals[0]?.category || "wealth_creation",
        goalImportance: "important",
      },
      financialProfile,
      goals,
      loans,
      assets,
    });

    return sendSuccess(res, {
      isAssessed: false,
      riskScore: defaultCalculation.riskScore,
      profileCategory: defaultCalculation.profileCategory,
      categoryLabel: defaultCalculation.categoryLabel,
      componentScores: defaultCalculation.componentScores,
      investmentHorizonYears: defaultCalculation.investmentHorizonYears,
      recommendedAllocation: defaultCalculation.recommendedAllocation,
      toleranceVsCapacity: defaultCalculation.toleranceVsCapacity,
      whyReasons: defaultCalculation.whyReasons,
      warnings: defaultCalculation.warnings,
      appliedGuardrails: defaultCalculation.appliedGuardrails,
      goalCompatibilityList: defaultCalculation.goalCompatibilityList,
      actualPortfolio: defaultCalculation.actualPortfolio,
      portfolioAlignment: defaultCalculation.portfolioAlignment,
      guidance: defaultCalculation.guidance,
      explanation: defaultCalculation.explanation,
      confidence: defaultCalculation.confidence,
      assessmentAnswers: null,
      history: [],
      userFinancialSnapshot: {
        monthlyIncome: financialProfile?.monthlyIncome || 0,
        monthlyExpenses: financialProfile?.monthlyExpenses || 0,
        currentSavings: financialProfile?.currentSavings || 0,
        goalsCount: goals.length,
        loansCount: loans.length,
        assetsCount: assets.length,
        existingGoals: goals.map((g) => ({
          id: g._id,
          title: g.title,
          category: g.category,
          targetAmount: g.targetAmount,
        })),
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Submit Risk DNA Assessment
 */
const submitRiskAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answers } = req.body;

    if (!answers) {
      return sendError(res, "Assessment answers are required", 400);
    }

    const [financialProfile, goals, loans, assets, existingProfile] = await Promise.all([
      FinancialProfile.findOne({ userId }),
      Goal.find({ userId }),
      Loan.find({ userId }),
      Asset.find({ userId }),
      RiskProfile.findOne({ userId }),
    ]);

    const calculated = calculateRiskProfile({
      answers,
      financialProfile,
      goals,
      loans,
      assets,
    });

    // Track score change history
    let history = existingProfile?.history || [];
    if (existingProfile && existingProfile.riskScore !== calculated.riskScore) {
      history.unshift({
        score: existingProfile.riskScore,
        categoryLabel: existingProfile.categoryLabel,
        profileCategory: existingProfile.profileCategory,
        date: new Date(),
        reason: `Re-assessed: Horizon (${answers.investmentHorizon || "N/A"}), Tolerance (${calculated.componentScores.riskToleranceScore}/100)`,
      });
      if (history.length > 10) history = history.slice(0, 10);
    }

    const updatedProfile = await RiskProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          riskScore: calculated.riskScore,
          profileCategory: calculated.profileCategory,
          categoryLabel: calculated.categoryLabel,
          componentScores: calculated.componentScores,
          investmentHorizonYears: calculated.investmentHorizonYears,
          recommendedAllocation: calculated.recommendedAllocation,
          toleranceVsCapacity: calculated.toleranceVsCapacity,
          whyReasons: calculated.whyReasons,
          warnings: calculated.warnings,
          guidance: calculated.guidance,
          explanation: calculated.explanation,
          confidence: calculated.confidence,
          assessmentAnswers: answers,
          isAssessed: true,
          history,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Sync baseline riskProfile field in FinancialProfile for backwards compatibility
    if (financialProfile) {
      let simpleRisk = "moderate";
      if (calculated.riskScore <= 35) simpleRisk = "conservative";
      else if (calculated.riskScore >= 70) simpleRisk = "aggressive";
      await FinancialProfile.updateOne({ userId }, { $set: { riskProfile: simpleRisk } });
    }

    // Log financial history event
    await logFinancialEvent({
      userId,
      eventType: "risk_profile_updated",
      title: "Risk DNA Profile Calibrated",
      description: `Risk DNA evaluated at ${calculated.riskScore}/100 (${calculated.categoryLabel}).`,
      category: "risk_dna",
      metadata: {
        riskScore: calculated.riskScore,
        category: calculated.profileCategory,
        toleranceScore: calculated.componentScores.riskToleranceScore,
        capacityScore: calculated.componentScores.riskCapacityScore,
      },
    });

    return sendSuccess(
      res,
      {
        ...updatedProfile.toObject(),
        appliedGuardrails: calculated.appliedGuardrails,
        goalCompatibilityList: calculated.goalCompatibilityList,
        actualPortfolio: calculated.actualPortfolio,
        portfolioAlignment: calculated.portfolioAlignment,
      },
      "Risk DNA profile successfully calculated and calibrated"
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getRiskDNA,
  submitRiskAssessment,
};
