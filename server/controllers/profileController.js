const FinancialProfile = require("../models/FinancialProfile");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Get current authenticated user's financial profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await FinancialProfile.findOne({ userId });
    const user = await User.findById(userId).select("name email role isOnboarded onboardingCompletedAt");

    if (!profile) {
      return sendSuccess(
        res,
        {
          profile: null,
          user,
          isOnboarded: user ? user.isOnboarded : false,
        },
        "No financial profile found for user"
      );
    }

    return sendSuccess(res, {
      profile,
      user,
      isOnboarded: user ? user.isOnboarded : true,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create or Update current authenticated user's financial profile
 */
const upsertProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      employmentStatus,
      monthlyIncome,
      monthlyExpenses,
      currentSavings,
      investmentExperience,
      riskProfile,
      primaryGoals,
      dependentsCount,
      emergencyFundTargetMonths,
    } = req.body;

    const payload = {
      employmentStatus: employmentStatus || "salaried",
      monthlyIncome: Number(monthlyIncome) || 0,
      monthlyExpenses: Number(monthlyExpenses) || 0,
      currentSavings: Number(currentSavings) || 0,
      investmentExperience: Array.isArray(investmentExperience) ? investmentExperience : [],
      riskProfile: ["conservative", "moderate", "aggressive"].includes(riskProfile)
        ? riskProfile
        : "moderate",
      primaryGoals: Array.isArray(primaryGoals) ? primaryGoals : [],
      dependentsCount: Number(dependentsCount) || 0,
      emergencyFundTargetMonths: Number(emergencyFundTargetMonths) || 6,
    };

    const profile = await FinancialProfile.findOneAndUpdate(
      { userId },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    // Mark user as onboarded
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isOnboarded: true,
        onboardingCompletedAt: new Date(),
      },
      { new: true }
    ).select("name email role isOnboarded onboardingCompletedAt");

    return sendSuccess(
      res,
      {
        profile,
        user: updatedUser,
      },
      "Financial profile saved successfully",
      200
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getProfile,
  upsertProfile,
};
