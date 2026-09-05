const { calculateSIP } = require("../utils/sipCalculator");
const { calculateStepUpSIP } = require("../utils/stepUpSipCalculator");
const { calculateEMI } = require("../utils/emiCalculator");
const { calculateFD } = require("../utils/fdCalculator");
const { calculateGoalTarget } = require("../utils/goalCalculator");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const postSIP = async (req, res) => {
  try {
    const { monthlyInvestment, annualRate, tenureYears } = req.body;

    if (monthlyInvestment === undefined || annualRate === undefined || tenureYears === undefined) {
      return sendError(res, "Please provide monthlyInvestment, annualRate, and tenureYears", 400);
    }

    const P = Number(monthlyInvestment);
    const rate = Number(annualRate);
    const years = Number(tenureYears);

    if (isNaN(P) || P < 0) return sendError(res, "Monthly investment must be >= 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Annual rate must be >= 0", 400);
    if (isNaN(years) || years <= 0) return sendError(res, "Tenure years must be > 0", 400);

    const result = calculateSIP(P, rate, years);
    return sendSuccess(res, result, "SIP calculation completed");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const postStepUpSIP = async (req, res) => {
  try {
    const { initialMonthlyInvestment, annualRate, tenureYears, annualStepUpPct } = req.body;

    if (
      initialMonthlyInvestment === undefined ||
      annualRate === undefined ||
      tenureYears === undefined ||
      annualStepUpPct === undefined
    ) {
      return sendError(
        res,
        "Please provide initialMonthlyInvestment, annualRate, tenureYears, and annualStepUpPct",
        400
      );
    }

    const P = Number(initialMonthlyInvestment);
    const rate = Number(annualRate);
    const years = Number(tenureYears);
    const stepUp = Number(annualStepUpPct);

    if (isNaN(P) || P < 0) return sendError(res, "Initial investment must be >= 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Annual rate must be >= 0", 400);
    if (isNaN(years) || years <= 0) return sendError(res, "Tenure years must be > 0", 400);
    if (isNaN(stepUp) || stepUp < 0) return sendError(res, "Annual step-up must be >= 0", 400);

    const result = calculateStepUpSIP(P, rate, years, stepUp);
    return sendSuccess(res, result, "Step-Up SIP calculation completed");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const postEMI = async (req, res) => {
  try {
    const { principalAmount, annualInterestRate, tenureMonths } = req.body;

    if (
      principalAmount === undefined ||
      annualInterestRate === undefined ||
      tenureMonths === undefined
    ) {
      return sendError(
        res,
        "Please provide principalAmount, annualInterestRate, and tenureMonths",
        400
      );
    }

    const P = Number(principalAmount);
    const rate = Number(annualInterestRate);
    const n = Number(tenureMonths);

    if (isNaN(P) || P < 0) return sendError(res, "Principal amount must be >= 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Interest rate must be >= 0", 400);
    if (isNaN(n) || n <= 0) return sendError(res, "Tenure months must be > 0", 400);

    const result = calculateEMI(P, rate, n);
    return sendSuccess(res, result, "Loan EMI calculation completed");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const postFD = async (req, res) => {
  try {
    const {
      principalDeposit,
      annualInterestRate,
      tenureYears,
      interestType = "compound",
      compoundingFrequency = "quarterly",
    } = req.body;

    if (
      principalDeposit === undefined ||
      annualInterestRate === undefined ||
      tenureYears === undefined
    ) {
      return sendError(
        res,
        "Please provide principalDeposit, annualInterestRate, and tenureYears",
        400
      );
    }

    const P = Number(principalDeposit);
    const rate = Number(annualInterestRate);
    const years = Number(tenureYears);

    if (isNaN(P) || P < 0) return sendError(res, "Principal deposit must be >= 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Interest rate must be >= 0", 400);
    if (isNaN(years) || years <= 0) return sendError(res, "Tenure years must be > 0", 400);

    const result = calculateFD(P, rate, years, interestType, compoundingFrequency);
    return sendSuccess(res, result, "FD calculation completed");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const postGoal = async (req, res) => {
  try {
    const { targetAmount, currentSavings = 0, timeMonths, expectedReturnRate = 12 } = req.body;

    if (targetAmount === undefined || timeMonths === undefined) {
      return sendError(res, "Please provide targetAmount and timeMonths", 400);
    }

    const target = Number(targetAmount);
    const savings = Number(currentSavings);
    const months = Number(timeMonths);
    const rate = Number(expectedReturnRate);

    if (isNaN(target) || target <= 0) return sendError(res, "Target amount must be > 0", 400);
    if (isNaN(savings) || savings < 0) return sendError(res, "Current savings must be >= 0", 400);
    if (isNaN(months) || months <= 0) return sendError(res, "Time in months must be > 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Expected return rate must be >= 0", 400);

    const result = calculateGoalTarget(target, savings, months, rate);
    return sendSuccess(res, result, "Goal target calculation completed");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  postSIP,
  postStepUpSIP,
  postEMI,
  postFD,
  postGoal,
};
