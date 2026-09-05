const Asset = require("../models/Asset");
const FinancialProfile = require("../models/FinancialProfile");
const { logFinancialEvent } = require("../services/historyService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Get all assets for the authenticated user with aggregated analytics
 */
const getAssets = async (req, res) => {
  try {
    const userId = req.user.id;
    const assets = await Asset.find({ userId }).sort({ createdAt: -1 });
    const profile = await FinancialProfile.findOne({ userId });

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const categoryTotals = {};

    assets.forEach((asset) => {
      totalInvested += Number(asset.investedAmount || 0);
      totalCurrentValue += Number(asset.currentValue || 0);

      if (!categoryTotals[asset.category]) {
        categoryTotals[asset.category] = {
          category: asset.category,
          totalInvested: 0,
          currentValue: 0,
          count: 0,
        };
      }
      categoryTotals[asset.category].totalInvested += Number(asset.investedAmount || 0);
      categoryTotals[asset.category].currentValue += Number(asset.currentValue || 0);
      categoryTotals[asset.category].count += 1;
    });

    const Loan = require("../models/Loan");
    const loans = await Loan.find({ userId });
    let totalLiabilities = 0;
    loans.forEach((loan) => {
      totalLiabilities += Number(loan.outstandingAmount || loan.principal || 0);
    });

    const liquidSavings = profile?.currentSavings || 0;
    const totalAssets = totalCurrentValue + liquidSavings;
    const overallNetWorth = Math.max(0, totalAssets - totalLiabilities);
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercentage = totalInvested > 0
      ? Number(((totalGainLoss / totalInvested) * 100).toFixed(2))
      : 0;

    // Calculate allocation percentage per category
    const categoryBreakdown = Object.values(categoryTotals).map((cat) => ({
      ...cat,
      percentage: totalCurrentValue > 0
        ? Number(((cat.currentValue / totalCurrentValue) * 100).toFixed(1))
        : 0,
    }));

    return sendSuccess(res, {
      assets,
      summary: {
        totalInvested,
        totalCurrentValue,
        totalGainLoss,
        totalGainLossPercentage,
        liquidSavings,
        totalLiabilities,
        totalAssets,
        netWorth: overallNetWorth,
        categoryBreakdown,
        count: assets.length,
        activeLoansCount: loans.length,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create a new asset for authenticated user
 */
const createAsset = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, name, investedAmount, currentValue, notes } = req.body;

    if (!category || !name || investedAmount === undefined || currentValue === undefined) {
      return sendError(res, "Please provide category, name, investedAmount, and currentValue", 400);
    }

    const numInvested = Number(investedAmount);
    const numCurrent = Number(currentValue);

    if (isNaN(numInvested) || numInvested < 0) {
      return sendError(res, "Invested amount must be a number greater than or equal to 0", 400);
    }

    if (isNaN(numCurrent) || numCurrent < 0) {
      return sendError(res, "Current value must be a number greater than or equal to 0", 400);
    }

    const validCategories = [
      "stock",
      "mutual_fund",
      "sip",
      "gold",
      "fd",
      "bond",
      "etf",
      "savings",
      "other",
    ];

    if (!validCategories.includes(category)) {
      return sendError(res, `Invalid category. Must be one of: ${validCategories.join(", ")}`, 400);
    }

    const newAsset = await Asset.create({
      userId,
      category,
      name: name.trim(),
      investedAmount: numInvested,
      currentValue: numCurrent,
      notes: notes ? notes.trim() : "",
    });

    await logFinancialEvent({
      userId,
      eventType: "asset_added",
      title: `Added Asset: ${newAsset.name}`,
      description: `Recorded ${category.replace("_", " ")} holding with current valuation of ₹${numCurrent.toLocaleString("en-IN")}.`,
      amount: numCurrent,
      category,
      metadata: { assetId: newAsset._id, category },
    });

    return sendSuccess(res, newAsset, "Asset added to Wealth Vault successfully", 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update an existing asset (strictly scoped by _id AND userId)
 */
const updateAsset = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { category, name, investedAmount, currentValue, notes } = req.body;

    const asset = await Asset.findOne({ _id: id, userId });
    if (!asset) {
      return sendError(res, "Asset not found or access denied", 404);
    }

    if (category !== undefined) {
      const validCategories = [
        "stock",
        "mutual_fund",
        "sip",
        "gold",
        "fd",
        "bond",
        "etf",
        "savings",
        "other",
      ];
      if (!validCategories.includes(category)) {
        return sendError(res, `Invalid category. Must be one of: ${validCategories.join(", ")}`, 400);
      }
      asset.category = category;
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return sendError(res, "Asset name cannot be empty", 400);
      }
      asset.name = name.trim();
    }

    if (investedAmount !== undefined) {
      const numInvested = Number(investedAmount);
      if (isNaN(numInvested) || numInvested < 0) {
        return sendError(res, "Invested amount must be greater than or equal to 0", 400);
      }
      asset.investedAmount = numInvested;
    }

    if (currentValue !== undefined) {
      const numCurrent = Number(currentValue);
      if (isNaN(numCurrent) || numCurrent < 0) {
        return sendError(res, "Current value must be greater than or equal to 0", 400);
      }
      asset.currentValue = numCurrent;
    }

    if (notes !== undefined) {
      asset.notes = notes.trim();
    }

    await asset.save();
    return sendSuccess(res, asset, "Asset updated successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete an asset (strictly scoped by _id AND userId)
 */
const deleteAsset = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const asset = await Asset.findOneAndDelete({ _id: id, userId });
    if (!asset) {
      return sendError(res, "Asset not found or access denied", 404);
    }

    return sendSuccess(res, { id: asset._id }, "Asset deleted successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
};
