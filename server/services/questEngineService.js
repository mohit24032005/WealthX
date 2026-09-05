/**
 * WealthX Investor Quest - Deterministic Game Simulation Engine
 * Core calculations for monthly cashflow, asset performance, emergency events,
 * portfolio allocation, risk scoring, achievements, and what-if alternative paths.
 * 
 * NOTE: All numbers, returns, and events are educational virtual simulations.
 */

// Educational Asset Class Parameters (Historical annual mean and simulated volatility ranges)
const ASSET_CLASSES = {
  cash: {
    label: "Liquid Cash / Savings Bank",
    annualReturn: 0.035, // 3.5% p.a.
    volatility: 0.005,
    riskLevel: "Ultra Low",
    isLiquid: true,
  },
  debt: {
    label: "Debt / Fixed Income & Bonds",
    annualReturn: 0.07, // 7.0% p.a.
    volatility: 0.03,
    riskLevel: "Low to Moderate",
    isLiquid: true,
  },
  mutual_funds: {
    label: "Diversified Mutual Funds (Flexi-Cap / Index)",
    annualReturn: 0.12, // 12.0% p.a.
    volatility: 0.14,
    riskLevel: "Moderate Growth",
    isLiquid: true,
  },
  stocks: {
    label: "Direct Equities / High-Beta Stocks",
    annualReturn: 0.15, // 15.0% p.a. (higher expected upside, much higher drawdown risk)
    volatility: 0.24,
    riskLevel: "High Volatility",
    isLiquid: true,
  },
  gold: {
    label: "Digital Gold & Sovereign Gold Bonds (SGB)",
    annualReturn: 0.085, // 8.5% p.a.
    volatility: 0.10,
    riskLevel: "Moderate (Hedge)",
    isLiquid: true,
  },
};

// Curated Educational Life and Market Events
const SIMULATED_EVENTS = [
  // Market Events
  {
    id: "market_correction",
    type: "market",
    title: "📉 Market Correction (-15%)",
    description: "Global macroeconomic headwinds trigger a sharp cyclical correction across public equities.",
    assetImpacts: { stocks: -0.15, mutual_funds: -0.09, debt: 0.01, gold: 0.04, cash: 0.0 },
    lesson: "Equity markets experience normal periodic drawdowns. Diversification into gold and fixed income cushions total portfolio shock.",
    severity: "warning",
  },
  {
    id: "bull_market_rally",
    type: "market",
    title: "📈 Bull Market Expansion (+12%)",
    description: "Strong corporate earnings and GDP expansion propel equity indices to new highs.",
    assetImpacts: { stocks: 0.14, mutual_funds: 0.10, debt: 0.005, gold: -0.02, cash: 0.0 },
    lesson: "Equities generate wealth through compounding during economic expansions, rewarding patient long-term investors.",
    severity: "positive",
  },
  {
    id: "gold_flight_to_safety",
    type: "market",
    title: "🟡 Geopolitical Tension & Gold Rally (+6%)",
    description: "International currency volatility drives institutional liquidity into precious metals.",
    assetImpacts: { stocks: -0.03, mutual_funds: -0.01, debt: 0.005, gold: 0.06, cash: 0.0 },
    lesson: "Gold acts as a non-correlated hedge that preserves purchasing power when equities consolidate.",
    severity: "opportunity",
  },
  {
    id: "interest_rate_hike",
    type: "market",
    title: "🏦 RBI Benchmark Rate Hike (+0.5%)",
    description: "Central bank raises rates to manage inflation, increasing yields on fixed income and debt funds.",
    assetImpacts: { stocks: -0.04, mutual_funds: -0.01, debt: 0.02, gold: -0.01, cash: 0.005 },
    lesson: "Interest rate cycles create inverse relationships between bond yields and equity valuation multiples.",
    severity: "info",
  },

  // Life Events
  {
    id: "unexpected_medical",
    type: "life",
    title: "🏥 Unexpected Medical Expense (-₹35,000)",
    description: "An unexpected family medical emergency requires immediate cash payment.",
    cashDrain: 35000,
    lesson: "Without an emergency buffer, unexpected crises force investors to sell long-term equity investments at unfavorable prices.",
    severity: "critical",
  },
  {
    id: "vehicle_breakdown",
    type: "life",
    title: "🚗 Major Vehicle Breakdown (-₹20,000)",
    description: "Engine repair requires an immediate out-of-pocket expense.",
    cashDrain: 20000,
    lesson: "Liquid emergency reserves absorb sudden household shocks without interrupting monthly SIP compounding.",
    severity: "warning",
  },
  {
    id: "career_promotion",
    type: "life",
    title: "💼 Career Performance Bonus & Promotion (+15% Salary)",
    description: "Outstanding workplace performance unlocks a permanent salary increment.",
    incomeMultiplier: 1.15,
    lesson: "Increasing your primary earning power expands your monthly investable surplus, accelerating your financial independence timeline.",
    severity: "positive",
  },
  {
    id: "inflation_spike",
    type: "life",
    title: "⚡ Inflation Spike (+10% Living Expenses)",
    description: "Rising grocery, fuel, and utility costs increase your mandatory monthly living expenses.",
    expenseMultiplier: 1.10,
    lesson: "Inflation erodes cash purchasing power over time; disciplined investing in growth assets is required to beat inflation.",
    severity: "warning",
  },
];

/**
 * Initialize a new simulation state
 */
const createInitialState = ({
  mode = "quick_play", // "quick_play" | "career" | "learn_challenge" | "custom"
  initialSnapshot = {},
  customConfig = {},
}) => {
  const isProfileSnapshot = Object.keys(initialSnapshot).length > 0;

  // Default Quick Play Values
  const defaultIncome = 50000;
  const defaultExpenses = 30000;
  const defaultStartingSavings = 30000;
  const defaultGoalTarget = 500000;
  const defaultGoalTitle = "5-Year Wealth Milestone";

  const monthlyIncome = isProfileSnapshot
    ? Number(initialSnapshot.monthlyIncome || defaultIncome)
    : Number(customConfig.monthlyIncome || defaultIncome);

  const monthlyExpenses = isProfileSnapshot
    ? Number(initialSnapshot.monthlyExpenses || defaultExpenses)
    : Number(customConfig.monthlyExpenses || defaultExpenses);

  const startingSavings = isProfileSnapshot
    ? Number(initialSnapshot.currentSavings || defaultStartingSavings)
    : Number(customConfig.startingSavings || defaultStartingSavings);

  const goalTarget = isProfileSnapshot && initialSnapshot.goalTarget
    ? Number(initialSnapshot.goalTarget)
    : Number(customConfig.goalTarget || defaultGoalTarget);

  const goalTitle = isProfileSnapshot && initialSnapshot.goalTitle
    ? initialSnapshot.goalTitle
    : customConfig.goalTitle || defaultGoalTitle;

  const totalTurns = mode === "quick_play" ? 12 : mode === "career" ? 24 : 12; // 12 turns = 5 simulated years (bi-annual turns) or 1-year quarterly turns
  const turnDurationMonths = mode === "quick_play" ? 5 : 5; // each turn simulates 5 months of compounding

  return {
    mode,
    currentTurn: 1,
    totalTurns,
    turnDurationMonths,
    simulatedMonthsElapsed: 0,
    isCompleted: false,

    // Cashflow Snapshot
    monthlyIncome,
    monthlyExpenses,
    baseIncome: monthlyIncome,
    baseExpenses: monthlyExpenses,

    // Balances
    liquidCash: startingSavings,
    emergencyFund: Math.min(startingSavings, monthlyExpenses * 3), // Initial calibrated emergency buffer
    debt: customConfig.startingDebt !== undefined ? Number(customConfig.startingDebt) : 0,

    // Portfolio Asset Allocation Balances (₹)
    portfolio: {
      cash: Math.max(0, startingSavings - Math.min(startingSavings, monthlyExpenses * 3)),
      debt: 0,
      mutual_funds: isProfileSnapshot && initialSnapshot.startingInvestments ? Number(initialSnapshot.startingInvestments) : 40000,
      stocks: 20000,
      gold: 10000,
    },

    // Total Contributions Tracker
    totalContributions: startingSavings + 70000,
    startingNetWorth: startingSavings + 70000,
    peakNetWorth: startingSavings + 70000,
    maxDrawdownPct: 0,

    // Goal
    goal: {
      title: goalTitle,
      targetAmount: goalTarget,
      timeHorizonYears: mode === "quick_play" ? 5 : 10,
    },

    // User Risk DNA Context
    riskProfile: initialSnapshot.riskProfile || customConfig.riskProfile || "moderate",
    riskCategoryLabel: initialSnapshot.riskCategoryLabel || "Moderate Growth",

    // History and Logs
    history: [],
    events: [],
    achievements: [],

    // Strategy Metrics (0–100)
    strategyScores: {
      overall: 75,
      riskManagement: 75,
      diversification: 70,
      emergencyPreparedness: Math.min(100, Math.round((startingSavings / (monthlyExpenses * 6 || 1)) * 100)),
      goalDiscipline: 70,
      savingsDiscipline: 80,
    },
  };
};

/**
 * Process a monthly/turn allocation decision
 * @param {Object} state - Current simulation state
 * @param {Object} decision - { allocationType, allocations, sipAmount, emergencyAllocation }
 */
const processTurn = (state, decision = {}) => {
  if (state.isCompleted) return state;

  const newState = JSON.parse(JSON.stringify(state)); // Deep clone
  const months = newState.turnDurationMonths || 5;

  // 1. Calculate Monthly Surplus for this period
  const monthlySurplus = Math.max(0, newState.monthlyIncome - newState.monthlyExpenses);
  const totalPeriodSurplus = monthlySurplus * months;

  // 2. Apply Decision Surplus Allocation
  // Allocation Types: "emergency_first", "mutual_funds", "stocks_growth", "balanced_split", "debt_repay", "custom"
  const allocType = decision.allocationType || "balanced_split";
  let appliedAllocations = {
    emergency: 0,
    mutual_funds: 0,
    stocks: 0,
    debt: 0,
    gold: 0,
    cash: 0,
    debtRepayment: 0,
  };

  if (allocType === "emergency_first") {
    appliedAllocations.emergency = totalPeriodSurplus * 0.8;
    appliedAllocations.mutual_funds = totalPeriodSurplus * 0.2;
  } else if (allocType === "mutual_funds") {
    appliedAllocations.mutual_funds = totalPeriodSurplus * 0.7;
    appliedAllocations.emergency = totalPeriodSurplus * 0.2;
    appliedAllocations.gold = totalPeriodSurplus * 0.1;
  } else if (allocType === "stocks_growth") {
    appliedAllocations.stocks = totalPeriodSurplus * 0.8;
    appliedAllocations.mutual_funds = totalPeriodSurplus * 0.2;
  } else if (allocType === "debt_repay") {
    const debtToPay = Math.min(newState.debt, totalPeriodSurplus * 0.8);
    appliedAllocations.debtRepayment = debtToPay;
    appliedAllocations.emergency = totalPeriodSurplus - debtToPay;
  } else if (allocType === "custom" && decision.customSplits) {
    const s = decision.customSplits;
    appliedAllocations.emergency = (totalPeriodSurplus * (Number(s.emergencyPct) || 0)) / 100;
    appliedAllocations.mutual_funds = (totalPeriodSurplus * (Number(s.mfPct) || 0)) / 100;
    appliedAllocations.stocks = (totalPeriodSurplus * (Number(s.stocksPct) || 0)) / 100;
    appliedAllocations.debt = (totalPeriodSurplus * (Number(s.debtPct) || 0)) / 100;
    appliedAllocations.gold = (totalPeriodSurplus * (Number(s.goldPct) || 0)) / 100;
    appliedAllocations.cash = (totalPeriodSurplus * (Number(s.cashPct) || 0)) / 100;
  } else {
    // Default: Disciplined Balanced Split
    appliedAllocations.emergency = totalPeriodSurplus * 0.3;
    appliedAllocations.mutual_funds = totalPeriodSurplus * 0.4;
    appliedAllocations.stocks = totalPeriodSurplus * 0.15;
    appliedAllocations.gold = totalPeriodSurplus * 0.15;
  }

  // Update Balances with Allocations
  newState.emergencyFund += Math.round(appliedAllocations.emergency);
  newState.portfolio.mutual_funds += Math.round(appliedAllocations.mutual_funds);
  newState.portfolio.stocks += Math.round(appliedAllocations.stocks);
  newState.portfolio.debt += Math.round(appliedAllocations.debt);
  newState.portfolio.gold += Math.round(appliedAllocations.gold);
  newState.liquidCash += Math.round(appliedAllocations.cash);
  if (appliedAllocations.debtRepayment > 0) {
    newState.debt = Math.max(0, newState.debt - Math.round(appliedAllocations.debtRepayment));
  }

  newState.totalContributions += totalPeriodSurplus;

  // 3. Pick or Trigger a Controlled Event for this Turn
  let triggeredEvent = null;
  // Events trigger on turns 2, 4, 6, 8, 10...
  if (newState.currentTurn === 2) {
    triggeredEvent = SIMULATED_EVENTS.find((e) => e.id === "market_correction");
  } else if (newState.currentTurn === 4) {
    triggeredEvent = SIMULATED_EVENTS.find((e) => e.id === "unexpected_medical");
  } else if (newState.currentTurn === 6) {
    triggeredEvent = SIMULATED_EVENTS.find((e) => e.id === "bull_market_rally");
  } else if (newState.currentTurn === 8) {
    triggeredEvent = SIMULATED_EVENTS.find((e) => e.id === "career_promotion");
  } else if (newState.currentTurn === 10) {
    triggeredEvent = SIMULATED_EVENTS.find((e) => e.id === "gold_flight_to_safety");
  } else {
    // Other turns have mild baseline organic market movement
    triggeredEvent = {
      id: "steady_compounding",
      type: "market",
      title: "🌱 Disciplined Market Compounding",
      description: "Markets operate steadily with moderate growth across diversified assets.",
      assetImpacts: { stocks: 0.05, mutual_funds: 0.04, debt: 0.025, gold: 0.02, cash: 0.01 },
      lesson: "Patience and continuous systematic compounding generate the majority of long-term investment returns.",
      severity: "info",
    };
  }

  // 4. Apply Event Consequences & Asset Returns
  let eventConsequenceSummary = "";

  // Apply baseline returns + event impacts to portfolio
  const annualToPeriodFactor = months / 12;
  const impacts = triggeredEvent.assetImpacts || {};

  const stockDelta = impacts.stocks !== undefined ? impacts.stocks : ASSET_CLASSES.stocks.annualReturn * annualToPeriodFactor;
  const mfDelta = impacts.mutual_funds !== undefined ? impacts.mutual_funds : ASSET_CLASSES.mutual_funds.annualReturn * annualToPeriodFactor;
  const debtDelta = impacts.debt !== undefined ? impacts.debt : ASSET_CLASSES.debt.annualReturn * annualToPeriodFactor;
  const goldDelta = impacts.gold !== undefined ? impacts.gold : ASSET_CLASSES.gold.annualReturn * annualToPeriodFactor;
  const cashDelta = impacts.cash !== undefined ? impacts.cash : ASSET_CLASSES.cash.annualReturn * annualToPeriodFactor;

  newState.portfolio.stocks = Math.max(0, Math.round(newState.portfolio.stocks * (1 + stockDelta)));
  newState.portfolio.mutual_funds = Math.max(0, Math.round(newState.portfolio.mutual_funds * (1 + mfDelta)));
  newState.portfolio.debt = Math.max(0, Math.round(newState.portfolio.debt * (1 + debtDelta)));
  newState.portfolio.gold = Math.max(0, Math.round(newState.portfolio.gold * (1 + goldDelta)));
  newState.emergencyFund = Math.max(0, Math.round(newState.emergencyFund * (1 + cashDelta)));

  // Life Event Cash Drain Consequences
  if (triggeredEvent.cashDrain) {
    const drain = triggeredEvent.cashDrain;
    if (newState.emergencyFund >= drain) {
      newState.emergencyFund -= drain;
      eventConsequenceSummary = `🛡️ Your Emergency Fund seamlessly absorbed the ₹${drain.toLocaleString("en-IN")} shock without forcing you to liquidate long-term equity holdings.`;
    } else {
      const shortfall = drain - newState.emergencyFund;
      newState.emergencyFund = 0;

      // Must liquidate equities/MFs to cover the shortfall
      const totalLiquidInvestments = newState.portfolio.stocks + newState.portfolio.mutual_funds;
      if (totalLiquidInvestments >= shortfall) {
        const stockRatio = newState.portfolio.stocks / (totalLiquidInvestments || 1);
        newState.portfolio.stocks = Math.max(0, Math.round(newState.portfolio.stocks - shortfall * stockRatio));
        newState.portfolio.mutual_funds = Math.max(0, Math.round(newState.portfolio.mutual_funds - shortfall * (1 - stockRatio)));
        eventConsequenceSummary = `⚠️ Insufficient emergency buffer! You were forced to distress-sell ₹${shortfall.toLocaleString("en-IN")} from your equity/mutual funds to pay the bill.`;
      } else {
        newState.portfolio.stocks = 0;
        newState.portfolio.mutual_funds = 0;
        newState.debt += shortfall - totalLiquidInvestments;
        eventConsequenceSummary = `🚨 Complete liquidity depletion! You had to sell all investments and borrow ₹${(shortfall - totalLiquidInvestments).toLocaleString("en-IN")} in high-interest debt.`;
      }
    }
  }

  // Income / Expense Multipliers
  if (triggeredEvent.incomeMultiplier) {
    newState.monthlyIncome = Math.round(newState.monthlyIncome * triggeredEvent.incomeMultiplier);
    eventConsequenceSummary = `🎉 Monthly salary increased by 15% to ₹${newState.monthlyIncome.toLocaleString("en-IN")}, expanding your compounding capacity!`;
  }
  if (triggeredEvent.expenseMultiplier) {
    newState.monthlyExpenses = Math.round(newState.monthlyExpenses * triggeredEvent.expenseMultiplier);
    eventConsequenceSummary = `⚡ Mandatory monthly living costs rose to ₹${newState.monthlyExpenses.toLocaleString("en-IN")}.`;
  }

  // 5. Compute Total Net Worth
  const totalInvestments =
    newState.portfolio.stocks +
    newState.portfolio.mutual_funds +
    newState.portfolio.debt +
    newState.portfolio.gold;

  const totalNetWorth = newState.liquidCash + newState.emergencyFund + totalInvestments - newState.debt;

  // Track Peak & Drawdowns
  if (totalNetWorth > newState.peakNetWorth) {
    newState.peakNetWorth = totalNetWorth;
  } else if (newState.peakNetWorth > 0) {
    const currentDrawdown = ((newState.peakNetWorth - totalNetWorth) / newState.peakNetWorth) * 100;
    if (currentDrawdown > newState.maxDrawdownPct) {
      newState.maxDrawdownPct = Number(currentDrawdown.toFixed(1));
    }
  }

  // 6. Evaluate Strategy Score Deterministically
  const emergencyTarget = newState.monthlyExpenses * 6;
  const emergencyPreparedness = Math.min(100, Math.round((newState.emergencyFund / (emergencyTarget || 1)) * 100));

  // Diversification score: Penalize 100% concentration in single asset
  const equityPct = totalInvestments > 0 ? (newState.portfolio.stocks + newState.portfolio.mutual_funds) / totalInvestments : 0;
  let diversification = 85;
  if (equityPct > 0.85 || equityPct < 0.15) diversification -= 20;
  if (newState.portfolio.gold > 0 && newState.portfolio.debt > 0) diversification += 10;
  diversification = Math.min(100, Math.max(30, diversification));

  // Risk management score: Penalize high equity when emergency fund is zero
  let riskManagement = 80;
  if (newState.emergencyFund < newState.monthlyExpenses * 2 && newState.portfolio.stocks > 50000) riskManagement -= 25;
  if (newState.debt > 0) riskManagement -= 15;
  riskManagement = Math.min(100, Math.max(20, riskManagement));

  const goalProgressPct = Math.min(100, Math.round((totalNetWorth / (newState.goal.targetAmount || 1)) * 100));
  const goalDiscipline = Math.min(100, Math.round(goalProgressPct * 0.8 + (newState.currentTurn / newState.totalTurns) * 20));
  const savingsDiscipline = monthlySurplus > 0 ? 88 : 50;

  const overallScore = Math.round(
    emergencyPreparedness * 0.25 +
    diversification * 0.20 +
    riskManagement * 0.25 +
    goalDiscipline * 0.15 +
    savingsDiscipline * 0.15
  );

  newState.strategyScores = {
    overall: overallScore,
    emergencyPreparedness,
    diversification,
    riskManagement,
    goalDiscipline,
    savingsDiscipline,
  };

  // 7. Check for Achievements
  const unlockedAchievements = [];
  if (emergencyPreparedness >= 100 && !newState.achievements.includes("emergency_ready")) {
    unlockedAchievements.push({
      id: "emergency_ready",
      title: "🏆 Emergency Ready",
      description: "Built a fully fortified 6-month emergency reserve!",
    });
    newState.achievements.push("emergency_ready");
  }
  if (diversification >= 85 && !newState.achievements.includes("diversification_pro")) {
    unlockedAchievements.push({
      id: "diversification_pro",
      title: "🏆 Diversification Pro",
      description: "Maintained a resilient, multi-asset portfolio across equities, debt, and gold.",
    });
    newState.achievements.push("diversification_pro");
  }
  if (newState.currentTurn >= 6 && !newState.achievements.includes("sip_disciplined")) {
    unlockedAchievements.push({
      id: "sip_disciplined",
      title: "🏆 SIP Compounding Champion",
      description: "Maintained disciplined systematic contributions across multiple market cycles.",
    });
    newState.achievements.push("sip_disciplined");
  }
  if (goalProgressPct >= 100 && !newState.achievements.includes("goal_achiever")) {
    unlockedAchievements.push({
      id: "goal_achiever",
      title: "🏆 Goal Achiever",
      description: `Surpassed your simulated target milestone of ₹${newState.goal.targetAmount.toLocaleString("en-IN")}!`,
    });
    newState.achievements.push("goal_achiever");
  }

  // 8. Record Turn History Entry
  const turnRecord = {
    turnNumber: newState.currentTurn,
    year: Math.floor((newState.simulatedMonthsElapsed + months) / 12) + 1,
    month: ((newState.simulatedMonthsElapsed + months) % 12) || 12,
    decisionType: allocType,
    allocatedSurplus: totalPeriodSurplus,
    event: triggeredEvent,
    eventConsequenceSummary,
    netWorth: totalNetWorth,
    totalInvestments,
    emergencyFund: newState.emergencyFund,
    debt: newState.debt,
    unlockedAchievements,
  };

  newState.history.push(turnRecord);
  newState.simulatedMonthsElapsed += months;

  // 9. Advance Turn or Mark Complete
  if (newState.currentTurn >= newState.totalTurns) {
    newState.isCompleted = true;
  } else {
    newState.currentTurn += 1;
  }

  return {
    state: newState,
    turnRecord,
    triggeredEvent,
    eventConsequenceSummary,
    unlockedAchievements,
  };
};

/**
 * Generate "What If You Had Chosen Differently?" comparative trajectory
 */
const generateWhatIfAnalysis = (completedState) => {
  const contributions = completedState.totalContributions || 100000;
  const finalActual =
    completedState.portfolio.stocks +
    completedState.portfolio.mutual_funds +
    completedState.portfolio.debt +
    completedState.portfolio.gold +
    completedState.emergencyFund +
    completedState.liquidCash -
    completedState.debt;

  // Alternative Path 1: 100% Direct Equities (Aggressive / High Drawdown)
  const aggressiveEndingWealth = Math.round(finalActual * 1.18);
  const aggressiveMaxDrawdown = 28.5; // High drawdown

  // Alternative Path 2: 100% Cash / Bank Fixed Deposit (Low Risk / High Inflation Drag)
  const conservativeEndingWealth = Math.round(contributions * 1.12);
  const conservativeMaxDrawdown = 0.5;

  return {
    actualPath: {
      title: "Your Simulated Journey",
      finalWealth: finalActual,
      totalContributions: contributions,
      gain: finalActual - contributions,
      maxDrawdownPct: completedState.maxDrawdownPct || 12.4,
      strategyScore: completedState.strategyScores.overall,
    },
    alternativeAggressive: {
      title: "Alternative Path: 100% High-Risk Equities",
      finalWealth: aggressiveEndingWealth,
      gain: aggressiveEndingWealth - contributions,
      maxDrawdownPct: aggressiveMaxDrawdown,
      comparisonTakeaway:
        "The 100% equity path produced higher terminal wealth (+18%), but experienced massive drawdowns of nearly -29%, creating intense panic-selling risk if emergencies struck.",
    },
    alternativeConservative: {
      title: "Alternative Path: 100% Pure Cash & Savings",
      finalWealth: conservativeEndingWealth,
      gain: conservativeEndingWealth - contributions,
      maxDrawdownPct: conservativeMaxDrawdown,
      comparisonTakeaway:
        "The pure cash strategy avoided volatility entirely (0.5% drawdown), but failed to beat inflation and lagged your diversified strategy by over ₹" +
        (finalActual - conservativeEndingWealth).toLocaleString("en-IN") +
        ".",
    },
    coreLesson:
      "Wealth building is not about picking the highest theoretical return; it is about building a resilient allocation you can comfortably stick with through turbulent market cycles.",
  };
};

module.exports = {
  ASSET_CLASSES,
  SIMULATED_EVENTS,
  createInitialState,
  processTurn,
  generateWhatIfAnalysis,
};
