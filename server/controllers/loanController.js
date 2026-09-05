const Loan = require("../models/Loan");
const FinancialProfile = require("../models/FinancialProfile");
const { calculateEMI } = require("../utils/emiCalculator");
const { logFinancialEvent } = require("../services/historyService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Get all loans for authenticated user with Debt Health analysis
 */
const getLoans = async (req, res) => {
  try {
    const userId = req.user.id;
    const loans = await Loan.find({ userId }).sort({ createdAt: -1 });
    const profile = await FinancialProfile.findOne({ userId });

    let totalPrincipal = 0;
    let totalOutstanding = 0;
    let totalMonthlyEMI = 0;
    const typeTotals = {};

    loans.forEach((loan) => {
      totalPrincipal += Number(loan.principal || 0);
      totalOutstanding += Number(loan.outstandingAmount || 0);
      totalMonthlyEMI += Number(loan.monthlyEMI || 0);

      typeTotals[loan.loanType] = (typeTotals[loan.loanType] || 0) + Number(loan.outstandingAmount || 0);
    });

    const monthlyIncome = profile?.monthlyIncome || 0;
    const emiBurdenPct = monthlyIncome > 0 ? Math.round((totalMonthlyEMI / monthlyIncome) * 100) : 0;

    let debtHealthStatus = "not_available";
    let debtHealthLabel = "No Loans Tracked";
    let debtExplanation = "No active loans tracked. Add a loan to evaluate your repayment picture.";

    if (loans.length > 0) {
      if (emiBurdenPct < 20) {
        debtHealthStatus = "low";
        debtHealthLabel = "Low Burden";
        debtExplanation = `Your loan EMIs represent ${emiBurdenPct}% of monthly income, maintaining a safe and resilient debt-service ratio.`;
      } else if (emiBurdenPct <= 40) {
        debtHealthStatus = "moderate";
        debtHealthLabel = "Moderate Burden";
        debtExplanation = `Loan repayments account for ${emiBurdenPct}% of monthly income. This is manageable but approaching the prudent 40% ceiling.`;
      } else {
        debtHealthStatus = "high";
        debtHealthLabel = "High Burden";
        debtExplanation = `A significant portion (${emiBurdenPct}%) of your monthly income is committed to recurring loan repayments.`;
      }
    }

    const typeBreakdown = Object.entries(typeTotals).map(([type, amount]) => ({
      type,
      amount,
      percentage: totalOutstanding > 0 ? Number(((amount / totalOutstanding) * 100).toFixed(1)) : 0,
    }));

    return sendSuccess(res, {
      loans,
      summary: {
        totalLoans: loans.length,
        totalPrincipal,
        totalOutstanding,
        totalMonthlyEMI,
        monthlyIncome,
        emiBurdenPct,
        debtHealthStatus,
        debtHealthLabel,
        debtExplanation,
        typeBreakdown,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create a new loan for authenticated user
 */
const createLoan = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      loanType,
      lenderName,
      principal,
      outstandingAmount,
      interestRate,
      tenureMonths,
      monthlyEMI,
    } = req.body;

    if (!loanType || principal === undefined || outstandingAmount === undefined || interestRate === undefined || tenureMonths === undefined) {
      return sendError(res, "Please provide loanType, principal, outstandingAmount, interestRate, and tenureMonths", 400);
    }

    const numPrincipal = Number(principal);
    const numOutstanding = Number(outstandingAmount);
    const numRate = Number(interestRate);
    const numTenure = Number(tenureMonths);

    if (isNaN(numPrincipal) || numPrincipal < 0) return sendError(res, "Principal must be >= 0", 400);
    if (isNaN(numOutstanding) || numOutstanding < 0) return sendError(res, "Outstanding amount must be >= 0", 400);
    if (isNaN(numRate) || numRate < 0) return sendError(res, "Interest rate must be >= 0", 400);
    if (isNaN(numTenure) || numTenure <= 0) return sendError(res, "Tenure months must be > 0", 400);

    const validTypes = ["home", "education", "vehicle", "personal", "business", "credit_card", "other"];
    if (!validTypes.includes(loanType)) {
      return sendError(res, `Invalid loanType. Must be one of: ${validTypes.join(", ")}`, 400);
    }

    // Auto-compute monthlyEMI server-side if omitted
    let computedEMI = Number(monthlyEMI);
    if (isNaN(computedEMI) || computedEMI <= 0) {
      const emiCalc = calculateEMI(numPrincipal, numRate, numTenure);
      computedEMI = emiCalc.monthlyEMI;
    }

    const newLoan = await Loan.create({
      userId,
      loanType,
      lenderName: lenderName ? lenderName.trim() : "",
      principal: numPrincipal,
      outstandingAmount: numOutstanding,
      interestRate: numRate,
      tenureMonths: numTenure,
      monthlyEMI: computedEMI,
    });

    await logFinancialEvent({
      userId,
      eventType: "loan_added",
      title: `Added Loan: ${lenderName || loanType.toUpperCase()}`,
      description: `Recorded ${loanType} loan with outstanding balance of ₹${numOutstanding.toLocaleString("en-IN")} at ${numRate}% p.a.`,
      amount: numOutstanding,
      category: "loan",
      metadata: { loanId: newLoan._id, loanType },
    });

    return sendSuccess(res, newLoan, "Loan added successfully", 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update an existing loan (strictly scoped by _id AND userId)
 */
const updateLoan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      loanType,
      lenderName,
      principal,
      outstandingAmount,
      interestRate,
      tenureMonths,
      monthlyEMI,
    } = req.body;

    const loan = await Loan.findOne({ _id: id, userId });
    if (!loan) {
      return sendError(res, "Loan not found or access denied", 404);
    }

    if (loanType !== undefined) {
      const validTypes = ["home", "education", "vehicle", "personal", "business", "credit_card", "other"];
      if (!validTypes.includes(loanType)) return sendError(res, "Invalid loanType", 400);
      loan.loanType = loanType;
    }

    if (lenderName !== undefined) loan.lenderName = lenderName.trim();

    let shouldRecalculateEMI = false;

    if (principal !== undefined) {
      const numP = Number(principal);
      if (isNaN(numP) || numP < 0) return sendError(res, "Principal must be >= 0", 400);
      loan.principal = numP;
      shouldRecalculateEMI = true;
    }

    if (outstandingAmount !== undefined) {
      const numOut = Number(outstandingAmount);
      if (isNaN(numOut) || numOut < 0) return sendError(res, "Outstanding amount must be >= 0", 400);
      loan.outstandingAmount = numOut;
    }

    if (interestRate !== undefined) {
      const numRate = Number(interestRate);
      if (isNaN(numRate) || numRate < 0) return sendError(res, "Interest rate must be >= 0", 400);
      loan.interestRate = numRate;
      shouldRecalculateEMI = true;
    }

    if (tenureMonths !== undefined) {
      const numTenure = Number(tenureMonths);
      if (isNaN(numTenure) || numTenure <= 0) return sendError(res, "Tenure must be > 0", 400);
      loan.tenureMonths = numTenure;
      shouldRecalculateEMI = true;
    }

    if (shouldRecalculateEMI) {
      const emiCalc = calculateEMI(loan.principal, loan.interestRate, loan.tenureMonths);
      loan.monthlyEMI = emiCalc.monthlyEMI;
    } else if (monthlyEMI !== undefined && Number(monthlyEMI) >= 0) {
      loan.monthlyEMI = Number(monthlyEMI);
    }

    await loan.save();
    return sendSuccess(res, loan, "Loan updated successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete a loan (strictly scoped by _id AND userId)
 */
const deleteLoan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const loan = await Loan.findOneAndDelete({ _id: id, userId });
    if (!loan) {
      return sendError(res, "Loan not found or access denied", 404);
    }

    return sendSuccess(res, { id: loan._id }, "Loan removed successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Simulate Accelerated Loan Repayment & Prepayments
 */
const simulateRepayment = async (req, res) => {
  try {
    const {
      currentBalance,
      interestRate,
      currentEMI,
      extraMonthlyPayment = 0,
      lumpSumPrepayment = 0,
    } = req.body;

    const P = Number(currentBalance);
    const rate = Number(interestRate);
    const emi = Number(currentEMI);
    const extra = Number(extraMonthlyPayment || 0);
    const lumpSum = Number(lumpSumPrepayment || 0);

    if (isNaN(P) || P <= 0) return sendError(res, "Current balance must be > 0", 400);
    if (isNaN(rate) || rate < 0) return sendError(res, "Interest rate must be >= 0", 400);
    if (isNaN(emi) || emi <= 0) return sendError(res, "Current EMI must be > 0", 400);

    const monthlyRate = rate / 12 / 100;

    // 1. Baseline amortization
    let balanceBase = P;
    let totalInterestBase = 0;
    let monthsBase = 0;

    while (balanceBase > 0 && monthsBase < 480) {
      monthsBase++;
      const interestMonth = balanceBase * monthlyRate;
      totalInterestBase += interestMonth;
      const principalPaid = emi - interestMonth;
      if (principalPaid <= 0) break; // Infinite loan if EMI doesn't cover interest
      balanceBase -= principalPaid;
    }

    // 2. Accelerated amortization with extra monthly payment & lump-sum
    let balanceAcc = Math.max(0, P - lumpSum);
    let totalInterestAcc = 0;
    let monthsAcc = 0;
    const newMonthlyPayment = emi + extra;

    while (balanceAcc > 0 && monthsAcc < 480) {
      monthsAcc++;
      const interestMonth = balanceAcc * monthlyRate;
      totalInterestAcc += interestMonth;
      const principalPaid = newMonthlyPayment - interestMonth;
      if (principalPaid <= 0) break;
      balanceAcc -= principalPaid;
    }

    const monthsSaved = Math.max(0, monthsBase - monthsAcc);
    const interestSaved = Math.max(0, Math.round(totalInterestBase - totalInterestAcc));

    return sendSuccess(res, {
      originalSchedule: {
        monthsRemaining: monthsBase,
        yearsRemaining: Number((monthsBase / 12).toFixed(1)),
        totalInterest: Math.round(totalInterestBase),
      },
      acceleratedSchedule: {
        monthsRemaining: monthsAcc,
        yearsRemaining: Number((monthsAcc / 12).toFixed(1)),
        totalInterest: Math.round(totalInterestAcc),
        newMonthlyPayment,
        lumpSumPrepayment: lumpSum,
      },
      savings: {
        monthsSaved,
        yearsSaved: Number((monthsSaved / 12).toFixed(1)),
        interestSaved,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  simulateRepayment,
};
