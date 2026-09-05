const FinancialProfile = require("../models/FinancialProfile");
const Loan = require("../models/Loan");
const Goal = require("../models/Goal");
const RiskProfile = require("../models/RiskProfile");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Calculate dynamic allocation for next surplus capital (e.g. ₹10,000)
 */
const allocateNextMoney = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount = 10000 } = req.body;

    const numAmount = Number(amount) || 10000;
    if (numAmount <= 0) {
      return sendError(res, "Allocation amount must be greater than 0", 400);
    }

    const profile = await FinancialProfile.findOne({ userId });
    const loans = await Loan.find({ userId });
    const goals = await Goal.find({ userId });
    const riskProfile = await RiskProfile.findOne({ userId });

    const income = Number(profile?.monthlyIncome || 0);
    const expenses = Number(profile?.monthlyExpenses || 0);
    const savings = Number(profile?.currentSavings || 0);
    const emergencyMonths = expenses > 0 ? Number((savings / expenses).toFixed(1)) : 0;

    let totalMonthlyEMI = 0;
    loans.forEach((l) => { totalMonthlyEMI += Number(l.monthlyEMI || 0); });
    const emiBurdenPct = income > 0 ? Math.round((totalMonthlyEMI / income) * 100) : 0;

    let scenarioKey = "balanced_growth";
    let scenarioName = "Balanced Wealth Compounding";
    let scenarioDescription = "Your baseline fundamentals are stable. Surplus is optimized for disciplined compounding while maintaining liquid flexibility.";
    let slices = [];

    // 1. Weak Emergency Runway (<3 months) -> Emergency First
    if (emergencyMonths < 3) {
      scenarioKey = "emergency_priority";
      scenarioName = "Capital Defense & Runway Fortification";
      scenarioDescription = `Your liquid reserves cover ${emergencyMonths} months (recommended: 6 months). Directing 60% of fresh surplus to liquid reserves prevents debt during unexpected emergencies.`;

      slices = [
        {
          label: "Emergency Reserve",
          percentage: 60,
          amount: Math.round(numAmount * 0.6),
          color: "#10b981",
          rationale: "Build liquid runway to reach the safe 6-month living expense threshold.",
        },
        {
          label: "Active Goal Milestone",
          percentage: 30,
          amount: Math.round(numAmount * 0.3),
          color: "#06b6d4",
          rationale: "Keep steady progress on scheduled financial milestones.",
        },
        {
          label: "SIP Compounding",
          percentage: 10,
          amount: Math.round(numAmount * 0.1),
          color: "#3b82f6",
          rationale: "Maintain habit-based rupee-cost averaging in index equity.",
        },
      ];
    }
    // 2. High Debt Burden (>40% EMI) -> Deleveraging First
    else if (loans.length > 0 && emiBurdenPct > 40) {
      scenarioKey = "debt_deleveraging";
      scenarioName = "Accelerated Debt Deleveraging";
      scenarioDescription = `Active loan EMIs consume ${emiBurdenPct}% of your monthly income. Prepaying debt generates a guaranteed tax-free return equal to your loan interest rate.`;

      slices = [
        {
          label: "Loan Prepayment",
          percentage: 70,
          amount: Math.round(numAmount * 0.7),
          color: "#f43f5e",
          rationale: "Accelerate loan principal reduction to eliminate recurring interest drag.",
        },
        {
          label: "Emergency Buffer",
          percentage: 20,
          amount: Math.round(numAmount * 0.2),
          color: "#10b981",
          rationale: "Maintain secondary cash cushion for unforeseen repairs or expenses.",
        },
        {
          label: "SIP Compounding",
          percentage: 10,
          amount: Math.round(numAmount * 0.1),
          color: "#3b82f6",
          rationale: "Keep long-term compounding engine running in the background.",
        },
      ];
    }
    // 3. Strong Financial Health (Runway >= 6 mos, Low Debt) -> Aggressive Compounding
    else if (emergencyMonths >= 6 && (loans.length === 0 || emiBurdenPct <= 20)) {
      scenarioKey = "growth_acceleration";
      scenarioName = "Aggressive Wealth Compounding";
      scenarioDescription = `Your liquid reserves (${emergencyMonths} months) and low debt load (${emiBurdenPct}%) give you maximum risk capacity. 90% of surplus is allocated directly to wealth creation.`;

      slices = [
        {
          label: "Equity SIP & Mutual Funds",
          percentage: 60,
          amount: Math.round(numAmount * 0.6),
          color: "#3b82f6",
          rationale: "Maximize equity compounding across diversified broad-market indices.",
        },
        {
          label: "Target Goals",
          percentage: 20,
          amount: Math.round(numAmount * 0.2),
          color: "#06b6d4",
          rationale: "Accelerate milestone completion timeline.",
        },
        {
          label: "Digital / Sovereign Gold",
          percentage: 10,
          amount: Math.round(numAmount * 0.1),
          color: "#f59e0b",
          rationale: "Hedge against inflation and currency debasement.",
        },
        {
          label: "Opportunistic Cash",
          percentage: 10,
          amount: Math.round(numAmount * 0.1),
          color: "#8b5cf6",
          rationale: "Tactical dry powder to buy market dips or opportunistic bargains.",
        },
      ];
    }
    // 4. Default Balanced Strategy
    else {
      slices = [
        {
          label: "Systematic SIP (Equity)",
          percentage: 50,
          amount: Math.round(numAmount * 0.5),
          color: "#3b82f6",
          rationale: "Disciplined monthly mutual fund compounding.",
        },
        {
          label: "Emergency Reserve",
          percentage: 25,
          amount: Math.round(numAmount * 0.25),
          color: "#10b981",
          rationale: "Gradually strengthening liquid emergency runway.",
        },
        {
          label: "Financial Goal Fund",
          percentage: 15,
          amount: Math.round(numAmount * 0.15),
          color: "#06b6d4",
          rationale: "Funding earmarked milestone commitments.",
        },
        {
          label: "Gold / Hedge Allocation",
          percentage: 10,
          amount: Math.round(numAmount * 0.1),
          color: "#f59e0b",
          rationale: "Portfolio stability and inflation preservation.",
        },
      ];
    }

    return sendSuccess(res, {
      totalAmount: numAmount,
      scenarioKey,
      scenarioName,
      scenarioDescription,
      emergencyMonths,
      emiBurdenPct,
      slices,
      disclaimer: "WealthX Next ₹10,000 Allocation uses algorithmic priority-sorting based on your balance sheet health. Adjust allocations according to your individual cashflow requirements.",
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  allocateNextMoney,
};
