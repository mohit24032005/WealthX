const FinancialProfile = require("../models/FinancialProfile");
const Asset = require("../models/Asset");
const Goal = require("../models/Goal");
const Loan = require("../models/Loan");
const RiskProfile = require("../models/RiskProfile");
const { enrichGoal } = require("./goalController");
const {
  calculateEmergencyRunway,
  calculateSavingsMetrics,
  calculateDebtHealth,
  calculatePortfolioAllocation,
  calculateFinancialStage,
  generateDiagnosticObservations,
  calculatePillarScores,
} = require("../utils/financialCalculations");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Get comprehensive, multi-dimensional Financial X-Ray diagnostics
 * Powered by centralized single-source-of-truth calculations
 */
const getFinancialXRay = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await FinancialProfile.findOne({ userId });
    const assets = await Asset.find({ userId });
    const goals = await Goal.find({ userId });
    const loans = await Loan.find({ userId });
    const riskProfile = await RiskProfile.findOne({ userId });

    const monthlyIncome = Number(profile?.monthlyIncome || 0);
    const monthlyExpenses = Number(profile?.monthlyExpenses || 0);
    const liquidSavings = Number(profile?.currentSavings || 0);

    // 1. Centralized Cashflow & Savings Calculations
    const savingsMetrics = calculateSavingsMetrics(monthlyIncome, monthlyExpenses);
    const emergencyRunway = calculateEmergencyRunway(liquidSavings, monthlyExpenses);
    const portfolio = calculatePortfolioAllocation(assets, liquidSavings);

    // 2. Debt Health Calculations
    let totalOutstandingDebt = 0;
    let totalMonthlyEMI = 0;
    loans.forEach((loan) => {
      let emi = Number(loan.monthlyEMI || 0);
      if (emi <= 0 && loan.principal && loan.interestRate && loan.tenureMonths) {
        const p = Number(loan.principal);
        const r = Number(loan.interestRate) / 12 / 100;
        const n = Number(loan.tenureMonths);
        if (p > 0 && r > 0 && n > 0) {
          emi = Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        }
      }
      totalOutstandingDebt += Number(loan.outstandingAmount || loan.principal || 0);
      totalMonthlyEMI += emi;
    });
    const debtHealth = calculateDebtHealth(monthlyIncome, totalMonthlyEMI, loans.length);

    // 3. Investment Health & Concentration Calculations
    let totalInvested = 0;
    let totalCurrentValue = 0;
    const categoryMap = {};

    assets.forEach((asset) => {
      totalInvested += Number(asset.investedAmount || 0);
      totalCurrentValue += Number(asset.currentValue || 0);
      categoryMap[asset.category] = (categoryMap[asset.category] || 0) + Number(asset.currentValue || 0);
    });

    const categoriesUsed = Object.keys(categoryMap).length;
    let concentrationWarning = false;
    let dominantCategory = null;
    let dominantPct = 0;

    const distribution = Object.entries(categoryMap).map(([category, value]) => {
      const pct = totalCurrentValue > 0 ? Number(((value / totalCurrentValue) * 100).toFixed(1)) : 0;
      if (pct >= 65 && assets.length > 1) {
        concentrationWarning = true;
        dominantCategory = category;
        dominantPct = pct;
      }
      return { category, value, percentage: pct };
    });

    if (!dominantCategory && distribution.length > 0) {
      const sorted = [...distribution].sort((a, b) => b.percentage - a.percentage);
      dominantCategory = sorted[0].category;
      dominantPct = sorted[0].percentage;
    }

    const unrealizedGainLoss = totalCurrentValue - totalInvested;
    const unrealizedGainLossPct = totalInvested > 0
      ? Number(((unrealizedGainLoss / totalInvested) * 100).toFixed(2))
      : 0;

    // 4. Enriched Goal Health
    const enrichedGoals = goals.map(enrichGoal);
    const goalHealth = enrichedGoals.map((g) => ({
      id: g._id,
      title: g.title,
      category: g.category,
      progressPct: g.progressPct,
      status: g.status,
      statusLabel: g.statusLabel,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadlineYear: g.targetDate ? new Date(g.targetDate).getFullYear() : null,
      remainingMonths: g.remainingMonths,
      requiredMonthlyContribution: g.requiredMonthlyContribution,
      currentContribution: g.monthlyContribution || 0,
      pacingStatus:
        (g.monthlyContribution || 0) >= g.requiredMonthlyContribution
          ? "on_track"
          : "behind_schedule",
      pacingGap: Math.max(0, g.requiredMonthlyContribution - (g.monthlyContribution || 0)),
    }));

    // 5. Pillar Scores & Financial Stage
    const pillarScores = calculatePillarScores({
      savingsRate: savingsMetrics.savingsRate,
      expenseRatio: savingsMetrics.expenseRatio,
      emergencyMonths: emergencyRunway.months,
      emiBurdenPct: debtHealth.emiBurdenPct,
      loansCount: loans.length,
      assetsCount: assets.length,
      portfolio,
      goals: goalHealth,
    });

    const financialStage = calculateFinancialStage({
      healthScore: pillarScores.compositeScore,
      emergencyMonths: emergencyRunway.months,
      savingsRate: savingsMetrics.savingsRate,
      emiBurdenPct: debtHealth.emiBurdenPct,
      assetsCount: assets.length,
      totalPortfolio: portfolio.totalPortfolio,
    });

    // 6. Dynamic Strategic Observations (Prioritized Top 3-4)
    const strategicObservations = generateDiagnosticObservations({
      income: monthlyIncome,
      expenses: monthlyExpenses,
      savings: liquidSavings,
      savingsMetrics,
      emergencyRunway,
      debtHealth,
      portfolio,
      assets,
      goals: goalHealth,
      riskProfile,
    });

    // 7. Top 3 "What Should I Do Now?" Focus Actions
    const focusActions = [];

    if (emergencyRunway.months === null || emergencyRunway.months < 3) {
      focusActions.push({
        step: "01",
        title: "Strengthen Emergency Buffer",
        description: `Your liquid runway is ${emergencyRunway.months || 0} months. Target a full 6-month buffer (₹${(monthlyExpenses * 6).toLocaleString("en-IN")}) before taking illiquid commitments.`,
        actionLabel: "Fortify Emergency Buffer",
        actionRoute: "/my-next-money",
      });
    } else if (debtHealth.emiBurdenPct > 35) {
      focusActions.push({
        step: "01",
        title: "Accelerate Debt Reduction",
        description: `Loan EMIs consume ${debtHealth.emiBurdenPct}% of your monthly income. Prepaying debt delivers guaranteed risk-free returns.`,
        actionLabel: "Simulate Accelerated Payoff",
        actionRoute: "/loans",
      });
    } else {
      focusActions.push({
        step: "01",
        title: "Deploy Monthly Surplus to SIP",
        description: `You maintain a ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo surplus. Automating an equity SIP locks in long-term compounding.`,
        actionLabel: "Launch SIP Calculator",
        actionRoute: "/calculators/sip",
      });
    }

    const behindGoals = goalHealth.filter((g) => g.pacingStatus === "behind_schedule");
    if (behindGoals.length > 0) {
      focusActions.push({
        step: "02",
        title: `Align Goal Contributions (${behindGoals[0].title})`,
        description: `Increase monthly allocation for "${behindGoals[0].title}" by approximately ₹${behindGoals[0].pacingGap.toLocaleString("en-IN")}/mo to meet the scheduled deadline.`,
        actionLabel: "Review Goal Pacing",
        actionRoute: "/goals",
      });
    } else if (goals.length === 0) {
      focusActions.push({
        step: "02",
        title: "Establish Key Milestone Goals",
        description: "Define target timelines for wealth milestones like House, Retirement, or Higher Education to track required monthly pacing.",
        actionLabel: "Create Milestone Goal",
        actionRoute: "/goals",
      });
    } else {
      focusActions.push({
        step: "02",
        title: "Review Annual Step-Up Strategy",
        description: "Implement an annual +10% Step-Up SIP to match salary growth and cut milestone timelines in half.",
        actionLabel: "Simulate Step-Up SIP",
        actionRoute: "/future-you",
      });
    }

    if (concentrationWarning) {
      focusActions.push({
        step: "03",
        title: "Rebalance Portfolio Concentration",
        description: `Over ${dominantPct}% is allocated to ${dominantCategory}. Consider allocating upcoming surplus to debt, sovereign gold, or cash equivalents.`,
        actionLabel: "Inspect Wealth Vault",
        actionRoute: "/wealth-vault",
      });
    } else if (assets.length === 0) {
      focusActions.push({
        step: "03",
        title: "Log Wealth Vault Assets",
        description: "Track your existing mutual funds, stocks, and fixed deposits to unlock automated diversification diagnostics.",
        actionLabel: "Add Vault Assets",
        actionRoute: "/wealth-vault",
      });
    } else {
      focusActions.push({
        step: "03",
        title: "Calibrate Risk DNA Target",
        description: `Compare your current ${portfolio.equityPct}% equity allocation against your behavioral Risk DNA target (${riskProfile?.categoryLabel || "Moderate Growth"}).`,
        actionLabel: "Inspect Risk DNA",
        actionRoute: "/risk-dna",
      });
    }

    // Cashflow dynamic interpretation text
    let cashflowInterpretation = "Balanced Cashflow: You maintain a sustainable balance between recurring living expenses and future capital compounding.";
    if (savingsMetrics.savingsRate >= 40) {
      cashflowInterpretation = `Strong Cashflow: You currently retain approximately ${savingsMetrics.savingsRate}% of your monthly income after expenses. You have ample room to increase long-term investments while maintaining an adequate emergency reserve.`;
    } else if (savingsMetrics.savingsRate < 15 && monthlyIncome > 0) {
      cashflowInterpretation = `Tight Cashflow: Recurring living expenses consume ${savingsMetrics.expenseRatio}% of income. Optimizing discretionary outflows will create vital breathing room for emergency buffer and investing.`;
    }

    // Emergency runway dynamic interpretation text
    let emergencyInterpretation = "Your liquidity position meets recommended safety standards.";
    let emergencyStageLabel = "Healthy";
    if (emergencyRunway.months === null) {
      emergencyStageLabel = "Uncalibrated";
      emergencyInterpretation = "Add your monthly living expenses to calculate your liquid emergency runway.";
    } else if (emergencyRunway.months < 2) {
      emergencyStageLabel = "Vulnerable";
      emergencyInterpretation = "Your current emergency coverage is low. Prioritize building your emergency reserve before substantially increasing long-term market exposure.";
    } else if (emergencyRunway.months < 4) {
      emergencyStageLabel = "Building";
      emergencyInterpretation = "Your emergency buffer is developing. Direct a portion of your monthly surplus to reach the 6-month safety benchmark.";
    } else if (emergencyRunway.months >= 12) {
      emergencyStageLabel = "Very Strong / High Liquidity";
      emergencyInterpretation = "Your liquidity position is exceptionally strong. Consider reviewing whether excess cash is intentionally held as liquidity versus being allocated toward milestone goals.";
    } else if (emergencyRunway.months >= 6) {
      emergencyStageLabel = "Strong";
      emergencyInterpretation = "Your liquid reserves cover 6+ months of living expenses, providing a solid liquidity foundation for disciplined investing.";
    }

    // Debt dynamic interpretation
    let debtInterpretation = "You have zero active loan commitments. 100% of monthly savings is available for wealth building.";
    if (loans.length > 0) {
      if (debtHealth.emiBurdenPct > 40) {
        debtInterpretation = `Debt Burden Needs Attention: EMI repayments take ${debtHealth.emiBurdenPct}% of monthly earnings. Review accelerated debt repayment before significantly increasing new investments.`;
      } else if (debtHealth.emiBurdenPct >= 20) {
        debtInterpretation = `Manageable Debt: Loan EMIs account for ${debtHealth.emiBurdenPct}% of monthly income. Maintain regular amortization schedules.`;
      } else {
        debtInterpretation = `Healthy Debt Load: Your current debt service burden is relatively low (${debtHealth.emiBurdenPct}% DTI), leaving flexibility for investing.`;
      }
    }

    // Portfolio dynamic interpretation
    let portfolioInterpretation = "No investment assets tracked in Wealth Vault yet.";
    if (assets.length > 0) {
      if (concentrationWarning) {
        portfolioInterpretation = `Portfolio Concentration: A large portion (${dominantPct}%) of your portfolio is concentrated in one asset category. Review diversification before adding more exposure to the same class.`;
      } else if (categoriesUsed >= 3) {
        portfolioInterpretation = `Well Diversified: Capital is distributed across ${categoriesUsed} asset categories, dampening overall portfolio volatility.`;
      } else {
        portfolioInterpretation = `Developing Diversification: Tracked holdings span ${categoriesUsed} asset classes. Consider broadening multi-asset exposure.`;
      }
    }

    return sendSuccess(res, {
      income: {
        monthlyIncome,
        monthlyExpenses,
        cashFlow: savingsMetrics.monthlySurplus,
        monthlySurplus: savingsMetrics.monthlySurplus,
        expenseRatio: savingsMetrics.expenseRatio,
        savingsRate: savingsMetrics.savingsRate,
        interpretation: cashflowInterpretation,
      },
      emergencyFund: {
        months: emergencyRunway.months,
        status: emergencyRunway.status,
        stageLabel: emergencyStageLabel,
        currentSavings: liquidSavings,
        targetMonths: 6,
        targetAmount: monthlyExpenses * 6,
        shortfall: Math.max(0, monthlyExpenses * 6 - liquidSavings),
        interpretation: emergencyInterpretation,
      },
      debtHealth: {
        ...debtHealth,
        dti: debtHealth.emiBurdenPct,
        loansCount: loans.length,
        totalDebt: totalOutstandingDebt,
        totalOutstanding: totalOutstandingDebt,
        totalMonthlyEMI,
        interpretation: debtInterpretation,
      },
      investmentHealth: {
        categoriesUsed,
        concentrationWarning,
        dominantCategory,
        dominantPct,
        totalInvested,
        currentValue: totalCurrentValue,
        unrealizedGainLoss,
        unrealizedGainLossPct,
        distribution,
        portfolioSplit: {
          equityPct: portfolio.equityPct,
          debtPct: portfolio.debtPct,
          goldPct: portfolio.goldPct,
          cashPct: portfolio.cashPct,
          equityVal: portfolio.equityVal,
          debtVal: portfolio.debtVal,
          goldVal: portfolio.goldVal,
          cashVal: portfolio.cashVal,
        },
        riskDNATarget: riskProfile?.recommendedAllocation || { equityPct: 55, debtPct: 25, goldPct: 10, cashPct: 10 },
        interpretation: portfolioInterpretation,
      },
      goalHealth,
      pillarScores,
      financialStage,
      strategicObservations,
      focusActions,
      // Backward compatibility: provide insights as strategicObservations
      insights: strategicObservations,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getFinancialXRay,
};
