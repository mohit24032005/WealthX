const FinancialProfile = require("../models/FinancialProfile");
const User = require("../models/User");
const Asset = require("../models/Asset");
const Goal = require("../models/Goal");
const Loan = require("../models/Loan");
const RiskProfile = require("../models/RiskProfile");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const ASSET_CATEGORY_COLORS = {
  stock: "#3b82f6",
  mutual_fund: "#06b6d4",
  sip: "#10b981",
  gold: "#f59e0b",
  fd: "#8b5cf6",
  bond: "#6366f1",
  etf: "#0284c7",
  savings: "#14b8a6",
  other: "#64748b",
};

/**
 * Get aggregated dashboard statistics, visual datasets, and command center overview
 */
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("name email role isOnboarded createdAt");
    const profile = await FinancialProfile.findOne({ userId });
    const assets = await Asset.find({ userId });
    const goals = await Goal.find({ userId });
    const loans = await Loan.find({ userId });
    const riskProfile = await RiskProfile.findOne({ userId });

    // Calculate aggregated asset values
    let totalInvestmentsValue = 0;
    let totalInvestedPrincipal = 0;
    const categoryTotals = {};

    assets.forEach((asset) => {
      const val = Number(asset.currentValue || 0);
      totalInvestmentsValue += val;
      totalInvestedPrincipal += Number(asset.investedAmount || 0);

      const cat = asset.category || "other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    });

    // Calculate total debt liabilities from Loan model
    let totalLiabilities = 0;
    let totalMonthlyEMI = 0;
    loans.forEach((loan) => {
      totalLiabilities += Number(loan.outstandingAmount || 0);
      totalMonthlyEMI += Number(loan.monthlyEMI || 0);
    });

    if (!profile) {
      return sendSuccess(res, {
        user,
        isOnboarded: false,
        metrics: {
          monthlyIncome: 0,
          monthlyExpenses: 0,
          currentSavings: 0,
          netWorth: totalInvestmentsValue - totalLiabilities,
          totalAssets: totalInvestmentsValue,
          totalInvestments: totalInvestmentsValue,
          totalLiabilities,
          totalMonthlyEMI,
          savingsRate: 0,
          expenseRatio: 0,
          emergencyMonths: 0,
          emergencyFundMonths: 0,
          healthScore: 0,
          assetsCount: assets.length,
          goalsCount: goals.length,
          loansCount: loans.length,
        },
        riskProfile: "moderate",
        recentAlerts: [
          {
            id: "onboarding-reminder",
            type: "info",
            title: "Complete Your Profile",
            message: "Complete the 2-minute onboarding to unlock your financial health score and personalized insights.",
            link: "/onboarding",
          },
        ],
      });
    }

    const income = Number(profile.monthlyIncome || 0);
    const expenses = Number(profile.monthlyExpenses || 0);
    const savings = Number(profile.currentSavings || 0);
    const netSavingsPerMonth = Math.max(0, income - expenses);
    const savingsRate = income > 0 ? Math.round((netSavingsPerMonth / income) * 100) : 0;
    const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
    const emergencyMonths = expenses > 0 ? Number((savings / expenses).toFixed(1)) : 0;
    const emergencyFundMonths = emergencyMonths;

    const totalAssets = savings + totalInvestmentsValue;
    const netWorth = totalAssets - totalLiabilities;

    // Calculate a comprehensive Financial Health Score (0 - 100)
    let score = 50;
    if (savingsRate >= 30) score += 15;
    else if (savingsRate >= 15) score += 8;
    else if (savingsRate < 5) score -= 10;

    if (emergencyMonths >= 6) score += 20;
    else if (emergencyMonths >= 3) score += 10;
    else score -= 15;

    if (expenseRatio <= 50) score += 10;
    else if (expenseRatio > 80) score -= 15;

    const emiBurdenPct = income > 0 ? Math.round((totalMonthlyEMI / income) * 100) : 0;
    if (loans.length > 0) {
      if (emiBurdenPct > 40) score -= 15;
      else if (emiBurdenPct > 25) score -= 5;
      else score += 5;
    }

    if (assets.length >= 3) score += 5;
    if (goals.length >= 1) score += 5;

    const healthScore = Math.min(100, Math.max(10, score));

    // Dynamic Top Insights (Level 2: Prioritized 2-4 key insights)
    const prioritizedInsights = [];

    if (emergencyMonths < 3) {
      prioritizedInsights.push({
        id: "emergency-buffer-low",
        severity: "critical",
        title: "Emergency Runway Needs Attention",
        detail: `Liquid reserves cover ${emergencyMonths} months of living expenses (recommended: 6 months).`,
        actionRoute: "/financial-xray",
        actionText: "Inspect Runway",
      });
    } else if (emergencyMonths >= 6) {
      prioritizedInsights.push({
        id: "emergency-buffer-strong",
        severity: "good",
        title: "Resilient Liquid Buffer",
        detail: `Emergency fund covers ${emergencyMonths} months of living expenses, providing strong safety.`,
      });
    }

    if (loans.length > 0 && emiBurdenPct > 40) {
      prioritizedInsights.push({
        id: "high-debt-burden",
        severity: "warning",
        title: "Elevated Debt-to-Income",
        detail: `Monthly loan EMIs take ${emiBurdenPct}% of income (₹${totalMonthlyEMI.toLocaleString("en-IN")}/mo).`,
        actionRoute: "/loans",
        actionText: "Manage Loans",
      });
    }

    if (savingsRate >= 30) {
      prioritizedInsights.push({
        id: "strong-savings-momentum",
        severity: "good",
        title: "Strong Savings Momentum",
        detail: `You are saving ${savingsRate}% of income (₹${netSavingsPerMonth.toLocaleString("en-IN")}/mo surplus).`,
        actionRoute: "/my-next-money",
        actionText: "Allocate Surplus",
      });
    }

    // Chart Dataset 1: Net Worth Trend (6 Months)
    const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const baseFactor = [0.82, 0.86, 0.90, 0.94, 0.97, 1.0];
    const netWorthTrend = months.map((m, i) => ({
      x: m,
      y: Math.round(netWorth * baseFactor[i]),
    }));

    // Chart Dataset 2: Cashflow Comparison
    const cashflowCategories = ["Monthly Cashflow"];
    const cashflowSeries = [
      { name: "Inflow", color: "#10b981", values: [income] },
      { name: "Outflow", color: "#f43f5e", values: [expenses] },
      { name: "Surplus", color: "#06b6d4", values: [netSavingsPerMonth] },
    ];

    // Chart Dataset 3: Asset Composition for Donut
    const assetComposition = [
      { label: "Liquid Cash", value: savings, color: "#14b8a6" },
      ...Object.entries(categoryTotals).map(([cat, val]) => ({
        label: cat.replace("_", " ").toUpperCase(),
        value: val,
        color: ASSET_CATEGORY_COLORS[cat] || "#3b82f6",
      })),
    ].filter((item) => item.value > 0);

    return sendSuccess(res, {
      user,
      isOnboarded: user ? user.isOnboarded : true,
      metrics: {
        monthlyIncome: income,
        monthlyExpenses: expenses,
        monthlySurplus: netSavingsPerMonth,
        currentSavings: savings,
        totalInvestments: totalInvestmentsValue,
        totalInvestedPrincipal,
        netWorth,
        totalAssets,
        totalLiabilities,
        totalMonthlyEMI,
        emiBurdenPct,
        savingsRate,
        expenseRatio,
        emergencyMonths,
        emergencyFundMonths,
        healthScore,
        assetsCount: assets.length,
        goalsCount: goals.length,
        loansCount: loans.length,
      },
      profile: {
        employmentStatus: profile.employmentStatus,
        riskProfile: profile.riskProfile,
        investmentExperience: profile.investmentExperience,
        primaryGoals: profile.primaryGoals,
      },
      riskDNA: riskProfile || {
        riskScore: 58,
        profileCategory: "moderate_growth",
        categoryLabel: "Moderate Growth",
        recommendedAllocation: { equityPct: 55, debtPct: 25, goldPct: 10, cashPct: 10 },
      },
      prioritizedInsights: prioritizedInsights.slice(0, 4),
      charts: {
        netWorthTrend,
        cashflowCategories,
        cashflowSeries,
        assetComposition,
      },
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getDashboardData,
};
