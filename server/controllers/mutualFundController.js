const { searchMutualFunds, getMutualFundByCode } = require("../services/amfiService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Search mutual funds from AMFI cached database
 */
const searchFunds = async (req, res) => {
  try {
    const { q, category, riskLevel, limit } = req.query;
    const result = await searchMutualFunds({
      query: q,
      category,
      riskLevel,
      limit,
    });
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get detailed mutual fund data with historical NAV points
 */
const getFundDetails = async (req, res) => {
  try {
    const { code } = req.params;
    const fund = await getMutualFundByCode(code);

    if (!fund) {
      return sendError(res, "Mutual fund scheme not found", 404);
    }

    return sendSuccess(res, fund);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  searchFunds,
  getFundDetails,
};
