/**
 * WealthX Centralized Financial Calculations Engine
 * Single source of truth for financial health, emergency runway, savings metrics,
 * portfolio asset allocation, and debt diagnostic calculations across all controllers.
 */

/**
 * Calculate emergency liquid runway with safe division-by-zero handling
 */
const calculateEmergencyRunway = (savings = 0, expenses = 0) => {
  const liquid = Number(savings) || 0;
  const monthlyExp = Number(expenses) || 0;

  if (monthlyExp <= 0) {
    return {
      months: null,
      status: "uncalibrated",
      label: "Not enough data",
      isAdequate: false,
      targetMonths: 6,
      targetCorpus: 0,
      shortfall: 0,
      description: "Add your monthly living expenses in onboarding or profile settings to calculate your liquid emergency runway.",
    };
  }

  const months = Number((liquid / monthlyExp).toFixed(1));
  const targetCorpus = monthlyExp * 6;
  const shortfall = Math.max(0, targetCorpus - liquid);

  let status = "critical";
  let label = "Critical (<3 Months)";
  let isAdequate = false;

  if (months >= 6) {
    status = "good";
    label = "Fortified (6+ Months)";
    isAdequate = true;
  } else if (months >= 3) {
    status = "warning";
    label = "Moderate (3-6 Months)";
    isAdequate = false;
  }

  return {
    months,
    status,
    label,
    isAdequate,
    targetMonths: 6,
    targetCorpus,
    shortfall,
    description:
      months >= 6
        ? `Your liquid reserves of ₹${liquid.toLocaleString("en-IN")} cover approximately ${months} months of essential living expenses (Target: 6 months).`
        : `Your liquid reserves cover ${months} months. Recommended target is 6 months (₹${targetCorpus.toLocaleString("en-IN")}), leaving a shortfall of ₹${shortfall.toLocaleString("en-IN")}.`,
  };
};

/**
 * Calculate savings, surplus, and expense ratio metrics
 */
const calculateSavingsMetrics = (income = 0, expenses = 0) => {
  const inc = Number(income) || 0;
  const exp = Number(expenses) || 0;
  const netSavingsPerMonth = Math.max(0, inc - exp);
  const savingsRate = inc > 0 ? Math.round((netSavingsPerMonth / inc) * 100) : 0;
  const expenseRatio = inc > 0 ? Math.round((exp / inc) * 100) : 0;

  return {
    monthlyIncome: inc,
    monthlyExpenses: exp,
    monthlySurplus: netSavingsPerMonth,
    savingsRate,
    expenseRatio,
  };
};

/**
 * Calculate Debt-to-Income (DTI) and debt burden health
 */
const calculateDebtHealth = (income = 0, totalMonthlyEMI = 0, loansCount = 0) => {
  const inc = Number(income) || 0;
  const emi = Number(totalMonthlyEMI) || 0;
  const emiBurdenPct = inc > 0 ? Math.round((emi / inc) * 100) : 0;

  if (loansCount === 0 && emi === 0) {
    return {
      emiBurdenPct: 0,
      loansCount: 0,
      totalMonthlyEMI: 0,
      debtHealthStatus: "good",
      debtHealthLabel: "Debt-Free / Excellent",
      debtExplanation: "You have zero active loan commitments. 100% of your net savings is unencumbered and available for wealth compounding.",
    };
  }

  let debtHealthStatus = "good";
  let debtHealthLabel = "Healthy (<20% DTI)";
  let debtExplanation = `Your active loan EMI commitments take ${emiBurdenPct}% of your monthly income (₹${emi.toLocaleString("en-IN")}/mo), maintaining a safe debt-service ratio.`;

  if (emiBurdenPct > 40) {
    debtHealthStatus = "critical";
    debtHealthLabel = "Heavy Burden (>40% DTI)";
    debtExplanation = `Your loan EMIs consume ${emiBurdenPct}% of your monthly income (₹${emi.toLocaleString("en-IN")}/mo). Prepaying high-interest debt should be prioritized before taking new commitments.`;
  } else if (emiBurdenPct > 20) {
    debtHealthStatus = "warning";
    debtHealthLabel = "Moderate (20-40% DTI)";
    debtExplanation = `Your loan EMIs consume ${emiBurdenPct}% of your monthly income (₹${emi.toLocaleString("en-IN")}/mo). Maintaining this debt level is sustainable, but avoid adding new loan facilities.`;
  }

  return {
    emiBurdenPct,
    loansCount,
    totalMonthlyEMI: emi,
    debtHealthStatus,
    debtHealthLabel,
    debtExplanation,
  };
};

/**
 * Calculate comprehensive Financial Health Score (0 - 100)
 */
const calculateFinancialHealth = ({
  savingsRate = 0,
  emergencyMonths = 0,
  expenseRatio = 0,
  emiBurdenPct = 0,
  loansCount = 0,
  assetsCount = 0,
  goalsCount = 0,
}) => {
  let score = 50;

  // Savings rate contribution
  if (savingsRate >= 30) score += 15;
  else if (savingsRate >= 15) score += 8;
  else if (savingsRate < 5) score -= 10;

  // Emergency runway contribution
  if (emergencyMonths !== null) {
    if (emergencyMonths >= 6) score += 20;
    else if (emergencyMonths >= 3) score += 10;
    else score -= 15;
  }

  // Expense ratio contribution
  if (expenseRatio > 0) {
    if (expenseRatio <= 50) score += 10;
    else if (expenseRatio > 80) score -= 15;
  }

  // Debt burden contribution
  if (loansCount > 0) {
    if (emiBurdenPct > 40) score -= 15;
    else if (emiBurdenPct > 25) score -= 5;
    else score += 5;
  }

  // Diversification & goal planning
  if (assetsCount >= 3) score += 5;
  if (goalsCount >= 1) score += 5;

  return Math.min(100, Math.max(10, score));
};

/**
 * Calculate consolidated portfolio asset breakdown across Equity, Debt, Gold, Real Estate/Other, Cash
 */
const calculatePortfolioAllocation = (assets = [], liquidSavings = 0) => {
  let totalInvestments = 0;
  let totalInvestedPrincipal = 0;
  const categoryTotals = {};

  assets.forEach((asset) => {
    const val = Number(asset.currentValue || 0);
    totalInvestments += val;
    totalInvestedPrincipal += Number(asset.investedAmount || 0);

    const cat = (asset.category || "other").toLowerCase();
    categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
  });

  const liquid = Number(liquidSavings) || 0;
  const totalPortfolio = totalInvestments + liquid;

  // Map to distinct asset classes
  const equityVal = (categoryTotals.stock || 0) + (categoryTotals.mutual_fund || 0) + (categoryTotals.sip || 0) + (categoryTotals.etf || 0) + (categoryTotals.equity || 0);
  const debtVal = (categoryTotals.fd || 0) + (categoryTotals.bond || 0) + (categoryTotals.epf || 0) + (categoryTotals.ppf || 0) + (categoryTotals.debt_fund || 0) + (categoryTotals.debt || 0);
  const goldVal = (categoryTotals.gold || 0) + (categoryTotals.digital_gold || 0) + (categoryTotals.sgb || 0);
  const otherVal = (categoryTotals.other || 0) + (categoryTotals.real_estate || 0) + (categoryTotals.property || 0) + (categoryTotals.land || 0) + (categoryTotals.crypto || 0) + (categoryTotals.alternate || 0);
  const cashVal = liquid + (categoryTotals.savings || 0) + (categoryTotals.cash || 0);

  const equityPct = totalPortfolio > 0 ? Math.round((equityVal / totalPortfolio) * 100) : 0;
  const debtPct = totalPortfolio > 0 ? Math.round((debtVal / totalPortfolio) * 100) : 0;
  const goldPct = totalPortfolio > 0 ? Math.round((goldVal / totalPortfolio) * 100) : 0;
  const otherPct = totalPortfolio > 0 ? Math.round((otherVal / totalPortfolio) * 100) : 0;
  const cashPct = totalPortfolio > 0 ? Math.round((cashVal / totalPortfolio) * 100) : (liquid > 0 ? 100 : 0);

  return {
    totalInvestments,
    totalInvestedPrincipal,
    totalPortfolio,
    categoryTotals,
    equityVal,
    debtVal,
    goldVal,
    otherVal,
    cashVal,
    equityPct,
    debtPct,
    goldPct,
    otherPct,
    cashPct,
  };
};

/**
 * Classify user into 1 of 5 Financial Stages based on financial health, runway, debt, and portfolio
 */
const calculateFinancialStage = ({
  healthScore = 50,
  emergencyMonths = 0,
  savingsRate = 0,
  emiBurdenPct = 0,
  assetsCount = 0,
  totalPortfolio = 0,
}) => {
  const emg = emergencyMonths !== null ? Number(emergencyMonths) : 0;
  const savRate = Number(savingsRate) || 0;
  const dti = Number(emiBurdenPct) || 0;
  const score = Number(healthScore) || 50;

  // STAGE 1: Financial Foundation
  if (emg < 2 || savRate < 10 || score < 50) {
    return {
      stageNumber: 1,
      stageName: "Financial Foundation",
      statusKey: "foundation",
      badgeColor: "badge-rose",
      tagline: "Establishing core cashflow stability and initial emergency liquidity.",
      description: "Your immediate financial priority is creating a basic liquid cushion and eliminating high-friction expenses before committing to aggressive investments.",
      focusPoints: [
        "Track essential monthly expenses and eliminate recurring budget leaks.",
        "Build an initial 1–3 month liquid emergency buffer in a high-yield savings account.",
        "Avoid high-risk speculative trading or illiquid commitments until reserves stabilize.",
        "Eliminate high-cost revolving debt if any exists.",
      ],
    };
  }

  // STAGE 2: Financial Stabilization
  if (emg < 4 || dti > 35 || savRate < 25) {
    return {
      stageNumber: 2,
      stageName: "Financial Stabilization",
      statusKey: "stabilization",
      badgeColor: "badge-amber",
      tagline: "Fortifying buffer reserves and standardizing monthly savings discipline.",
      description: "You have a functioning baseline. Your current focus is expanding your liquid runway to 6 full months and controlling debt repayments.",
      focusPoints: [
        "Expand liquid emergency reserves toward the full 6-month benchmark.",
        "Keep total debt-to-income (DTI) repayments strictly under 30% of income.",
        "Initiate small automated monthly SIPs in low-cost broad market index funds.",
        "Set up term and health insurance coverage to protect your balance sheet.",
      ],
    };
  }

  // STAGE 5: Wealth Optimization (Checked before 4 for high-maturity criteria)
  if (emg >= 6 && score >= 85 && assetsCount >= 3 && dti <= 15 && totalPortfolio >= 500000) {
    return {
      stageNumber: 5,
      stageName: "Wealth Optimization",
      statusKey: "optimization",
      badgeColor: "badge-teal",
      tagline: "Capital preservation, tax efficiency, and strategic wealth compounding.",
      description: "Your balance sheet demonstrates institutional resilience with low debt, strong liquid reserves, and diversified assets.",
      focusPoints: [
        "Maintain disciplined target asset allocation across Equity, Debt, and Gold.",
        "Optimize tax harvesting across long-term capital gains and exemptions.",
        "Review estate planning, nominee designations, and digital wealth vaults.",
        "Conduct annual portfolio rebalancing without emotional timing.",
      ],
    };
  }

  // STAGE 4: Wealth Building
  if (emg >= 6 && savRate >= 35 && assetsCount >= 2 && score >= 75) {
    return {
      stageNumber: 4,
      stageName: "Wealth Building",
      statusKey: "wealth_building",
      badgeColor: "badge-green",
      tagline: "Optimizing multi-asset compounding and accelerating milestone freedom.",
      description: "With a strong 6+ month safety net and high savings rate, your primary lever is maximizing the compounding velocity of your capital.",
      focusPoints: [
        "Maintain diversified asset allocation tailored to your Risk DNA target.",
        "Accelerate contributions to long-term goals with annual Step-Up SIPs (+10%).",
        "Maintain tax-aware investing across direct mutual funds and Sovereign Gold Bonds.",
        "Avoid single-stock or single-sector overconcentration (>65%).",
      ],
    };
  }

  // STAGE 3: Growth & Investing (Default strong middle-tier)
  return {
    stageNumber: 3,
    stageName: "Growth & Investing",
    statusKey: "growth_investing",
    badgeColor: "badge-blue",
    tagline: "Accelerating compounding through disciplined equity and hybrid investing.",
    description: "Your financial foundation is relatively strong and you have meaningful monthly surplus available for long-term goals.",
    focusPoints: [
      "Maintain your emergency reserve in liquid assets while channeling surplus into growth.",
      "Build a diversified portfolio spanning large-cap, flexi-cap, and fixed income.",
      "Fund scheduled milestone goals with asset-matched timelines.",
      "Review portfolio allocation annually to maintain risk harmony.",
    ],
  };
};

/**
 * Generate prioritized dynamic strategic observations (Top 3-4)
 */
const generateDiagnosticObservations = ({
  income = 0,
  expenses = 0,
  savings = 0,
  savingsMetrics = {},
  emergencyRunway = {},
  debtHealth = {},
  portfolio = {},
  assets = [],
  goals = [],
  riskProfile = null,
}) => {
  const candidateObservations = [];

  const emgMonths = emergencyRunway.months !== null ? emergencyRunway.months : 0;
  const savRate = savingsMetrics.savingsRate || 0;
  const surplus = savingsMetrics.monthlySurplus || 0;
  const dti = debtHealth.emiBurdenPct || 0;

  // 1. Emergency Fund Observations (Critical / Warning / Positive)
  if (emergencyRunway.status === "uncalibrated") {
    candidateObservations.push({
      id: "emergency_uncalibrated",
      severity: "WARNING",
      priority: 2,
      type: "amber",
      icon: "🛡️",
      title: "Calibrate Emergency Reserves",
      description: "Track your monthly living expenses to calculate your exact liquidity runway.",
      metric: "Uncalibrated",
      recommendedAction: "Add your monthly expense baseline in profile settings.",
      actionLabel: "Calibrate Profile",
      actionRoute: "/onboarding",
    });
  } else if (emgMonths < 2) {
    candidateObservations.push({
      id: "emergency_critical",
      severity: "CRITICAL",
      priority: 1,
      type: "rose",
      icon: "🚨",
      title: "Emergency Reserve Needs Immediate Attention",
      description: `Your liquid reserves cover only ${emgMonths} months of essential living expenses (Standard Target: 6 months).`,
      metric: `${emgMonths} Mos Runway`,
      recommendedAction: "Prioritize fortifying liquid cash before expanding long-term market investments.",
      actionLabel: "Fortify Emergency Fund",
      actionRoute: "/my-next-money",
    });
  } else if (emgMonths < 4) {
    candidateObservations.push({
      id: "emergency_developing",
      severity: "WARNING",
      priority: 3,
      type: "amber",
      icon: "🛡️",
      title: "Emergency Reserve is Building",
      description: `Your current liquid cushion covers ${emgMonths} months. Expanding toward 6 months will protect you against cashflow shocks.`,
      metric: `${emgMonths} / 6.0 Months`,
      recommendedAction: "Direct a portion of monthly surplus to reach the 6-month benchmark.",
      actionLabel: "Allocate to Buffer",
      actionRoute: "/my-next-money",
    });
  } else if (emgMonths >= 12) {
    candidateObservations.push({
      id: "emergency_excess",
      severity: "OPPORTUNITY",
      priority: 5,
      type: "teal",
      icon: "💡",
      title: "Very Strong Liquidity Position",
      description: `Your liquid reserves cover approximately ${emgMonths} months of expenses. You have substantial foundation for goal compounding.`,
      metric: `${emgMonths} Mos Reserve`,
      recommendedAction: "Review whether excess idle cash can be productively deployed toward long-term goals.",
      actionLabel: "Optimize Next ₹10k",
      actionRoute: "/my-next-money",
    });
  } else if (emgMonths >= 6) {
    candidateObservations.push({
      id: "emergency_strong",
      severity: "POSITIVE",
      priority: 6,
      type: "green",
      icon: "✅",
      title: "Emergency Position Is Fortified",
      description: `Your liquid reserves cover ${emgMonths} months of living expenses, meeting institutional safety benchmarks.`,
      metric: `${emgMonths} Mos Protected`,
      recommendedAction: "You have a solid liquidity foundation to support disciplined long-term investing.",
      actionLabel: "Explore Investment Hub",
      actionRoute: "/investments",
    });
  }

  // 2. Debt & DTI Observations
  if (debtHealth.loansCount > 0) {
    if (dti > 40) {
      candidateObservations.push({
        id: "debt_critical",
        severity: "CRITICAL",
        priority: 1,
        type: "rose",
        icon: "💳",
        title: "Debt Service Burden Is Elevated",
        description: `Active loan repayments consume ${dti}% of monthly income, exceeding the recommended 40% threshold.`,
        metric: `${dti}% DTI Ratio`,
        recommendedAction: "Accelerate high-cost debt payoff before committing to new discretionary investments.",
        actionLabel: "Manage Active Loans",
        actionRoute: "/loans",
      });
    } else if (dti >= 25) {
      candidateObservations.push({
        id: "debt_moderate",
        severity: "NEEDS_ATTENTION",
        priority: 4,
        type: "amber",
        icon: "💳",
        title: "Moderate Debt Commitments",
        description: `Loan EMIs account for ${dti}% of monthly earnings. Maintain debt discipline and avoid new credit lines.`,
        metric: `${dti}% DTI Ratio`,
        recommendedAction: "Review prepayment simulations to reduce overall interest tenure.",
        actionLabel: "Simulate Loan Payoff",
        actionRoute: "/loans",
      });
    } else {
      candidateObservations.push({
        id: "debt_healthy",
        severity: "POSITIVE",
        priority: 7,
        type: "green",
        icon: "✅",
        title: "Healthy Debt Service Ratio",
        description: `Your debt payments take only ${dti}% of monthly income, leaving ample cashflow for compounding.`,
        metric: `${dti}% DTI (Healthy)`,
        recommendedAction: "Channel unencumbered surplus into long-term milestone goals.",
        actionLabel: "View Goals",
        actionRoute: "/goals",
      });
    }
  }

  // 3. Cashflow & Savings Rate Observations
  if (savRate >= 40) {
    candidateObservations.push({
      id: "savings_high",
      severity: "POSITIVE",
      priority: 5,
      type: "green",
      icon: "📈",
      title: "Strong Savings Momentum",
      description: `You are currently saving ${savRate}% of your monthly income (₹${surplus.toLocaleString("en-IN")}/mo surplus).`,
      metric: `${savRate}% Savings Rate`,
      recommendedAction: "Direct surplus capital toward automated monthly SIPs to lock in compounding.",
      actionLabel: "Simulate SIP",
      actionRoute: "/calculators/sip",
    });
  } else if (savRate < 15 && income > 0) {
    candidateObservations.push({
      id: "savings_low",
      severity: "NEEDS_ATTENTION",
      priority: 3,
      type: "amber",
      icon: "💵",
      title: "Savings Rate Below Optimal Target",
      description: `You retain ${savRate}% of income after expenses. Increasing this above 20% accelerates milestone freedom.`,
      metric: `${savRate}% Savings Rate`,
      recommendedAction: "Inspect expense breakdown in Financial X-Ray to optimize lifestyle outflows.",
      actionLabel: "Optimize Cashflow",
      actionRoute: "/onboarding",
    });
  }

  // 4. Portfolio Diversification Observations
  const dominantPct = Math.max(portfolio.equityPct || 0, portfolio.debtPct || 0, portfolio.goldPct || 0);
  if (assets.length === 0) {
    candidateObservations.push({
      id: "portfolio_empty",
      severity: "OPPORTUNITY",
      priority: 4,
      type: "blue",
      icon: "📊",
      title: "Wealth Vault Ready for Assets",
      description: "You have not tracked any investment assets in your Wealth Vault yet.",
      metric: "0 Assets",
      recommendedAction: "Log your stocks, mutual funds, gold, or FDs to unlock automated diversification diagnostics.",
      actionLabel: "Add First Asset",
      actionRoute: "/wealth-vault",
    });
  } else if (dominantPct >= 65 && assets.length > 1) {
    const dominantName = portfolio.equityPct >= 65 ? "Equity" : portfolio.debtPct >= 65 ? "Fixed Income" : "Gold";
    candidateObservations.push({
      id: "portfolio_concentration",
      severity: "WARNING",
      priority: 2,
      type: "amber",
      icon: "⚖️",
      title: "Portfolio Asset Concentration",
      description: `Over ${dominantPct}% of your portfolio is concentrated in ${dominantName}. Drawdowns in this category will disproportionately impact total wealth.`,
      metric: `${dominantPct}% ${dominantName}`,
      recommendedAction: "Review asset allocation and rebalance into complementary asset classes.",
      actionLabel: "Inspect Wealth Vault",
      actionRoute: "/wealth-vault",
    });
  } else if (assets.length >= 3) {
    candidateObservations.push({
      id: "portfolio_diversified",
      severity: "POSITIVE",
      priority: 8,
      type: "green",
      icon: "✓",
      title: "Healthy Asset Spread",
      description: "Your Wealth Vault holdings are distributed across multiple complementary asset classes.",
      metric: "Multi-Asset Spread",
      recommendedAction: "Maintain disciplined periodic rebalancing according to your Risk DNA target.",
      actionLabel: "Risk DNA Target",
      actionRoute: "/risk-dna",
    });
  }

  // 5. Goal Pacing Observations
  const behindGoals = goals.filter((g) => g.status === "behind_schedule");
  if (behindGoals.length > 0) {
    candidateObservations.push({
      id: "goals_behind",
      severity: "WARNING",
      priority: 2,
      type: "amber",
      icon: "🎯",
      title: `${behindGoals.length} Goal(s) Pacing Behind Schedule`,
      description: `Your contribution pacing for "${behindGoals[0].title}" is below the pace required to reach target by deadline.`,
      metric: "Pacing Deficit",
      recommendedAction: "Increase monthly goal allocation or extend target deadline.",
      actionLabel: "Review Goal Pacing",
      actionRoute: "/goals",
    });
  } else if (goals.length > 0) {
    candidateObservations.push({
      id: "goals_ontrack",
      severity: "POSITIVE",
      priority: 8,
      type: "green",
      icon: "🎯",
      title: "All Milestone Goals On Track",
      description: `All ${goals.length} tracked milestone goals are progressing on or ahead of schedule.`,
      metric: "100% On Track",
      recommendedAction: "Maintain regular contributions to preserve target completion dates.",
      actionLabel: "View Goals",
      actionRoute: "/goals",
    });
  }

  // Sort by priority (1 is highest priority)
  candidateObservations.sort((a, b) => a.priority - b.priority);

  // Return top 3-4 observations
  return candidateObservations.slice(0, 4);
};

/**
 * Calculate 5-Pillar Score Breakdown for Financial X-Ray
 */
const calculatePillarScores = ({
  savingsRate = 0,
  expenseRatio = 0,
  emergencyMonths = 0,
  emiBurdenPct = 0,
  loansCount = 0,
  assetsCount = 0,
  portfolio = {},
  goals = [],
}) => {
  // 1. Cashflow Score (0-100)
  let cashflowScore = 50;
  if (savingsRate >= 40) cashflowScore = 95;
  else if (savingsRate >= 25) cashflowScore = 85;
  else if (savingsRate >= 15) cashflowScore = 70;
  else if (savingsRate >= 5) cashflowScore = 55;
  else cashflowScore = 35;

  // 2. Emergency Runway Score (0-100)
  let emergencyScore = 40;
  const emg = emergencyMonths !== null ? Number(emergencyMonths) : 0;
  if (emg >= 6) emergencyScore = 100;
  else if (emg >= 4) emergencyScore = 80;
  else if (emg >= 2) emergencyScore = 60;
  else if (emg > 0) emergencyScore = 40;
  else emergencyScore = 20;

  // 3. Debt Score (0-100)
  let debtScore = 100;
  if (loansCount > 0) {
    if (emiBurdenPct <= 15) debtScore = 90;
    else if (emiBurdenPct <= 30) debtScore = 75;
    else if (emiBurdenPct <= 40) debtScore = 55;
    else debtScore = 30;
  }

  // 4. Portfolio Score (0-100)
  let portfolioScore = 50;
  if (assetsCount >= 3) {
    const dominant = Math.max(portfolio.equityPct || 0, portfolio.debtPct || 0, portfolio.goldPct || 0);
    portfolioScore = dominant < 65 ? 90 : 70;
  } else if (assetsCount >= 1) {
    portfolioScore = 65;
  }

  // 5. Goals Score (0-100)
  let goalsScore = 70;
  if (goals.length > 0) {
    const onTrack = goals.filter((g) => g.status !== "behind_schedule").length;
    goalsScore = Math.round((onTrack / goals.length) * 100);
  }

  const compositeScore = Math.round(
    cashflowScore * 0.25 +
    emergencyScore * 0.25 +
    debtScore * 0.2 +
    portfolioScore * 0.15 +
    goalsScore * 0.15
  );

  return {
    compositeScore,
    cashflowScore,
    emergencyScore,
    debtScore,
    portfolioScore,
    goalsScore,
  };
};

module.exports = {
  calculateEmergencyRunway,
  calculateSavingsMetrics,
  calculateDebtHealth,
  calculateFinancialHealth,
  calculatePortfolioAllocation,
  calculateFinancialStage,
  generateDiagnosticObservations,
  calculatePillarScores,
};

