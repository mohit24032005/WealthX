/**
 * WealthX — Risk DNA Profiling Engine
 * IEEE UVCE Theme 1 — WealthTech & Investment Solutions
 *
 * Implements deterministic, multi-factor risk profiling evaluating:
 * 1. Financial Goals (Purpose, Importance, Horizon)
 * 2. Investment Horizon (Duration, Volatility Absorption)
 * 3. Risk Tolerance (Scenario-Based Loss Comfort, Market Reaction)
 * 4. Financial Capacity (Runway, DTI, Monthly Cashflow, Surplus)
 */

// Risk Category Definitions & Targets
const RISK_CATEGORIES = {
  VERY_CONSERVATIVE: {
    key: "very_conservative",
    label: "Very Conservative (Capital Preserver)",
    min: 0,
    max: 20,
    allocation: { equityPct: 15, debtPct: 55, goldPct: 15, cashPct: 15 },
    guidance: [
      "Prioritize capital preservation and liquid emergency reserves.",
      "Limit equity exposure to high-dividend or ultra-low-volatility assets.",
      "Anchor investments in fixed deposits, sovereign bonds, and debt funds.",
      "Ensure all short-term goals are 100% matched with debt/cash instruments.",
    ],
  },
  CONSERVATIVE: {
    key: "conservative",
    label: "Conservative (Defensive Accumulator)",
    min: 21,
    max: 40,
    allocation: { equityPct: 30, debtPct: 45, goldPct: 15, cashPct: 10 },
    guidance: [
      "Focus on low-volatility compounding with an emphasis on downside protection.",
      "Maintain a 6-month fortified liquid cash buffer before taking fresh market exposure.",
      "Utilize conservative hybrid mutual funds and high-grade debt instruments.",
      "Avoid concentrated single-stock or derivative speculation.",
    ],
  },
  BALANCED: {
    key: "balanced",
    label: "Balanced (Balanced Accumulator)",
    min: 41,
    max: 60,
    allocation: { equityPct: 50, debtPct: 30, goldPct: 10, cashPct: 10 },
    guidance: [
      "Maintain a steady balance between capital appreciation and stability.",
      "Diversify across large-cap index funds, multi-asset funds, and digital gold.",
      "Rebalance portfolio annually to restore target asset weightings.",
      "Use disciplined monthly SIPs to smooth cyclical market volatility.",
    ],
  },
  GROWTH: {
    key: "moderate_growth",
    label: "Balanced Growth (Strategic Compounder)",
    min: 61,
    max: 80,
    allocation: { equityPct: 70, debtPct: 15, goldPct: 10, cashPct: 5 },
    guidance: [
      "Emphasize long-term equity compounding across broad-market index & flexi-cap funds.",
      "Ensure liquidity needs for the next 2-3 years are kept separate from growth portfolio.",
      "Use cyclical market corrections as opportunities for systematic lump-sum additions.",
      "Maintain gold (10%) and liquid reserves as risk-off anchors.",
    ],
  },
  AGGRESSIVE: {
    key: "aggressive",
    label: "Aggressive (Dynamic Maximizer)",
    min: 81,
    max: 100,
    allocation: { equityPct: 85, debtPct: 5, goldPct: 5, cashPct: 5 },
    guidance: [
      "Maximize long-term equity and growth capital expansion with decade-scale horizons.",
      "Expect and tolerate substantial cyclical drawdowns of 20%–35% during bear phases.",
      "Maintain disciplined diversification; avoid unhedged single-asset or speculative concentrations.",
      "Keep living expenses strictly isolated from long-term equity holdings.",
    ],
  },
};

/**
 * 1. Calculate Risk Tolerance Score (0 - 100)
 * Evaluates emotional reaction to loss, growth vs stability preference, and sharp correction comfort.
 */
function calculateToleranceScore(answers = {}) {
  let score = 50;

  // Scenario 1: ₹1,00,000 investment temporarily falls to ₹80,000 (-20%)
  const dropReaction = answers.marketDropReaction || answers.marketReaction;
  if (dropReaction === "sell_immediately" || dropReaction === "panic_sell_all") {
    score = 10;
  } else if (dropReaction === "wait_recover" || dropReaction === "hold_patiently") {
    score = 45;
  } else if (dropReaction === "continue_planned" || dropReaction === "reduce_slightly") {
    score = 75;
  } else if (dropReaction === "buy_more" || dropReaction === "buy_aggressively") {
    score = 95;
  }

  // Scenario 2: Growth vs Stability Statement
  let prefScore = 50;
  const growthPref = answers.growthPreference;
  if (growthPref === "stability_first") {
    prefScore = 15;
  } else if (growthPref === "moderate_fluctuations") {
    prefScore = 50;
  } else if (growthPref === "significant_fluctuations") {
    prefScore = 75;
  } else if (growthPref === "substantial_volatility") {
    prefScore = 95;
  }

  // Scenario 3: Short-Term Market Crash Emotional Feeling
  let feelingScore = 50;
  const marketFeeling = answers.marketCrashFeeling || answers.lossComfort;
  if (marketFeeling === "very_uncomfortable" || marketFeeling === "panic") {
    feelingScore = 15;
  } else if (marketFeeling === "somewhat_uncomfortable" || marketFeeling === "anxious") {
    feelingScore = 45;
  } else if (marketFeeling === "mostly_comfortable" || marketFeeling === "moderate") {
    feelingScore = 75;
  } else if (marketFeeling === "fully_comfortable" || marketFeeling === "calm") {
    feelingScore = 95;
  }

  const rawTolerance = Math.round((score * 0.4) + (prefScore * 0.3) + (feelingScore * 0.3));
  return Math.min(100, Math.max(5, rawTolerance));
}

/**
 * 2. Calculate Investment Horizon Score (0 - 100)
 * Evaluates duration before needing withdrawal.
 */
function calculateHorizonScore(horizonInput) {
  const horizon = String(horizonInput || "").toLowerCase();
  if (horizon === "<1_year" || horizon === "less_than_1" || horizon === "1") return { score: 15, years: 1 };
  if (horizon === "1-3_years" || horizon === "1_to_3" || horizon === "2") return { score: 35, years: 2 };
  if (horizon === "3-5_years" || horizon === "3_to_5" || horizon === "4") return { score: 55, years: 4 };
  if (horizon === "5-10_years" || horizon === "5_to_10" || horizon === "7") return { score: 80, years: 7 };
  if (horizon === ">10_years" || horizon === "10+" || horizon === "12") return { score: 95, years: 12 };

  // Numeric fallback if passed in years directly
  const numYears = Number(horizonInput);
  if (!isNaN(numYears) && numYears > 0) {
    if (numYears < 1) return { score: 15, years: 1 };
    if (numYears <= 3) return { score: 35, years: numYears };
    if (numYears <= 5) return { score: 55, years: numYears };
    if (numYears <= 10) return { score: 80, years: numYears };
    return { score: 95, years: numYears };
  }

  return { score: 70, years: 7 }; // Default moderate 7 years
}

/**
 * 3. Calculate Goal Compatibility Score (0 - 100)
 * Evaluates goal purpose, timeline, and flexibility.
 */
function calculateGoalScore(goalInput = {}, horizonYears = 7) {
  const category = (goalInput.category || goalInput.primaryGoal || "wealth_creation").toLowerCase();
  const importance = (goalInput.importance || "important").toLowerCase();

  let baseGoalScore = 70;
  let categoryLabel = "Long-Term Wealth Creation";

  if (category.includes("emergency") || category.includes("capital_preservation")) {
    baseGoalScore = 15;
    categoryLabel = "Emergency Reserve / Capital Preservation";
  } else if (category.includes("short_term") || category.includes("vehicle") || category.includes("travel")) {
    baseGoalScore = 35;
    categoryLabel = "Short-Term Purchase / Milestone";
  } else if (category.includes("house") || category.includes("home")) {
    baseGoalScore = 50;
    categoryLabel = "Home Purchase / Property";
  } else if (category.includes("education")) {
    baseGoalScore = 60;
    categoryLabel = "Higher Education Fund";
  } else if (category.includes("retirement")) {
    baseGoalScore = 85;
    categoryLabel = "Retirement Corpus";
  } else if (category.includes("wealth") || category.includes("growth")) {
    baseGoalScore = 90;
    categoryLabel = "Long-Term Wealth Creation";
  }

  // Adjust for Importance
  let importanceAdjustment = 0;
  if (importance === "essential") {
    importanceAdjustment = -12; // Enforce capital preservation buffer for non-negotiable goals
  } else if (importance === "flexible") {
    importanceAdjustment = +10; // Can tolerate market cycles
  }

  // Adjust for Goal Horizon
  let horizonAdjustment = 0;
  if (horizonYears < 2) horizonAdjustment = -20;
  else if (horizonYears >= 10) horizonAdjustment = +10;

  const finalGoalScore = Math.min(100, Math.max(10, baseGoalScore + importanceAdjustment + horizonAdjustment));

  return {
    score: finalGoalScore,
    categoryLabel,
    importance,
  };
}

/**
 * 4. Calculate Financial Capacity Score (0 - 100)
 * Evaluates real liquid emergency runway, debt burden (DTI), and monthly surplus.
 */
function calculateCapacityScore(profile = {}, loans = [], assets = []) {
  const income = Number(profile?.monthlyIncome || 0);
  const expenses = Number(profile?.monthlyExpenses || 0);
  const savings = Number(profile?.currentSavings || 0);

  // If no financial profile exists yet (new/un-onboarded user)
  if (income <= 0 && expenses <= 0 && savings <= 0) {
    return {
      score: 55, // Baseline neutral capacity
      runwayMonths: 3,
      dtiPct: 20,
      monthlySurplus: 0,
      isEstimated: true,
    };
  }

  const monthlySurplus = Math.max(0, income - expenses);
  const runwayMonths = expenses > 0 ? Number((savings / expenses).toFixed(1)) : (savings > 0 ? 12 : 0);

  // Calculate total monthly EMI
  let totalMonthlyEMI = 0;
  if (Array.isArray(loans)) {
    loans.forEach((l) => {
      let emi = Number(l.monthlyEMI || l.monthlyEmi || l.emi || 0);
      if (emi <= 0 && l.principal && l.interestRate && l.tenureMonths) {
        const p = Number(l.principal);
        const r = Number(l.interestRate) / 12 / 100;
        const n = Number(l.tenureMonths);
        if (p > 0 && r > 0 && n > 0) {
          emi = Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        }
      }
      totalMonthlyEMI += emi;
    });
  }

  const dtiPct = income > 0 ? Number(((totalMonthlyEMI / income) * 100).toFixed(1)) : 0;

  // Component 1: Runway Score
  let runwayScore = 15;
  if (runwayMonths >= 9) runwayScore = 95;
  else if (runwayMonths >= 6) runwayScore = 85;
  else if (runwayMonths >= 3) runwayScore = 65;
  else if (runwayMonths >= 1) runwayScore = 40;

  // Component 2: DTI Score
  let dtiScore = 90;
  if (dtiPct > 55) dtiScore = 15;
  else if (dtiPct > 40) dtiScore = 40;
  else if (dtiPct > 20) dtiScore = 65;

  // Component 3: Surplus Ratio Score
  const surplusRatio = income > 0 ? (monthlySurplus / income) * 100 : 0;
  let surplusScore = 30;
  if (surplusRatio >= 40) surplusScore = 95;
  else if (surplusRatio >= 25) surplusScore = 75;
  else if (surplusRatio >= 10) surplusScore = 55;

  const capacityScore = Math.min(
    100,
    Math.max(10, Math.round(runwayScore * 0.4 + dtiScore * 0.35 + surplusScore * 0.25))
  );

  return {
    score: capacityScore,
    runwayMonths,
    dtiPct,
    monthlySurplus,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    currentSavings: savings,
    isEstimated: false,
  };
}

/**
 * Main Deterministic Risk Profiling Function
 * Implements composite scoring with institutional safety guardrails.
 */
function calculateRiskProfile({
  answers = {},
  financialProfile = {},
  goals = [],
  loans = [],
  assets = [],
}) {
  // 1. Calculate Component Scores
  const toleranceScore = calculateToleranceScore(answers);
  const horizonData = calculateHorizonScore(answers.investmentHorizon || answers.timeHorizon);
  const horizonScore = horizonData.score;
  const horizonYears = horizonData.years;

  // Use primary goal from questionnaire or fallback to user's first goal
  const primaryGoalInput = {
    category: answers.primaryGoal || (goals[0]?.category) || "wealth_creation",
    importance: answers.goalImportance || "important",
  };
  const goalData = calculateGoalScore(primaryGoalInput, horizonYears);
  const goalScore = goalData.score;

  const capacityData = calculateCapacityScore(financialProfile, loans, assets);
  const capacityScore = capacityData.score;

  // 2. Compute Raw Weighted Score
  // Weights: 30% Tolerance, 25% Horizon, 20% Goal, 25% Capacity
  let compositeScore = Math.round(
    toleranceScore * 0.30 +
    horizonScore * 0.25 +
    goalScore * 0.20 +
    capacityScore * 0.25
  );

  // 3. Apply Institutional Safety Guardrails
  const appliedGuardrails = [];

  // Guardrail A: Short Horizon (<1 year or 1-2 years with Essential goal)
  if (horizonYears < 1.5 || (horizonYears <= 2 && primaryGoalInput.importance === "essential")) {
    if (compositeScore > 35) {
      compositeScore = 35;
      appliedGuardrails.push({
        type: "short_horizon_cap",
        message: "Your score was capped at Conservative because short-term horizons (<2 years) require defensive capital preservation regardless of high risk appetite.",
      });
    }
  }

  // Guardrail B: Low Capacity (<1 month runway or >50% DTI)
  if (capacityData.runwayMonths < 1 || capacityData.dtiPct > 50) {
    if (compositeScore > 45) {
      compositeScore = 45;
      appliedGuardrails.push({
        type: "low_capacity_cap",
        message: "Your score was adjusted downward because your current financial runway (<1 month) or debt burden (>50% DTI) limits your ability to absorb market shocks without distress selling.",
      });
    }
  }

  // Guardrail C: Emergency Fund Primary Goal
  if (primaryGoalInput.category.includes("emergency")) {
    if (compositeScore > 25) {
      compositeScore = 25;
      appliedGuardrails.push({
        type: "emergency_goal_cap",
        message: "Your score was calibrated to Capital Preserver because emergency reserve funds must be 100% immune to market volatility.",
      });
    }
  }

  // Guardrail D: Psychological Tolerance Ceiling (Protects moderate investors from aggressive label)
  if (toleranceScore <= 50 && compositeScore > 75) {
    compositeScore = 75; // Caps at Balanced Growth (75/100)
    appliedGuardrails.push({
      type: "tolerance_ceiling_cap",
      message: "Your profile is capped at Balanced Growth to align with your moderate emotional comfort regarding market corrections.",
    });
  } else if (toleranceScore <= 30 && compositeScore > 50) {
    compositeScore = 50;
    appliedGuardrails.push({
      type: "conservative_tolerance_cap",
      message: "Your profile is capped at Balanced to reflect your strong preference for capital stability.",
    });
  }

  compositeScore = Math.min(100, Math.max(5, compositeScore));

  // 4. Determine Profile Category
  let categoryObj = RISK_CATEGORIES.BALANCED;
  if (compositeScore <= 20) categoryObj = RISK_CATEGORIES.VERY_CONSERVATIVE;
  else if (compositeScore <= 40) categoryObj = RISK_CATEGORIES.CONSERVATIVE;
  else if (compositeScore <= 60) categoryObj = RISK_CATEGORIES.BALANCED;
  else if (compositeScore <= 80) categoryObj = RISK_CATEGORIES.GROWTH;
  else categoryObj = RISK_CATEGORIES.AGGRESSIVE;

  // 5. Tolerance vs Capacity Analysis
  let toleranceVsCapacity = {
    toleranceScore,
    capacityScore,
    differential: toleranceScore - capacityScore,
    status: "aligned",
    headline: "Tolerance and Capacity are Balanced",
    explanation: "Your emotional willingness to navigate volatility is in healthy harmony with your financial ability to absorb drawdowns.",
  };

  if (toleranceScore - capacityScore >= 20) {
    toleranceVsCapacity = {
      toleranceScore,
      capacityScore,
      differential: toleranceScore - capacityScore,
      status: "tolerance_exceeds_capacity",
      headline: "Emotional Tolerance Exceeds Financial Capacity",
      explanation: `Your psychological appetite for risk (${toleranceScore}/100) is significantly higher than your current financial buffer (${capacityScore}/100). If market downturns coincide with personal emergencies, you may face forced distress selling of equities.`,
    };
  } else if (capacityScore - toleranceScore >= 20) {
    toleranceVsCapacity = {
      toleranceScore,
      capacityScore,
      differential: toleranceScore - capacityScore,
      status: "capacity_exceeds_tolerance",
      headline: "Strong Financial Capacity with Conservative Comfort",
      explanation: `You have substantial financial strength and runway (${capacityScore}/100), but your psychological comfort with volatility is conservative (${toleranceScore}/100). Measured exposure to diversified index funds can help defeat inflation without inducing stress.`,
    };
  }

  // 6. Data-Driven "Why WealthX Classified You This Way" Reasons
  const whyReasons = [];
  const warnings = [];

  if (horizonYears >= 10) {
    whyReasons.push("Long investment horizon (10+ years) allows exponential equity compounding to smooth out interim bear markets.");
  } else if (horizonYears <= 2) {
    whyReasons.push("Short investment timeline requires capital preservation to guarantee fund availability when needed.");
  } else {
    whyReasons.push(`Medium investment horizon (~${horizonYears} years) supports balanced multi-asset compounding.`);
  }

  if (toleranceScore >= 75) {
    whyReasons.push("High psychological resilience during market corrections enables you to stay invested through cyclical pullbacks.");
  } else if (toleranceScore <= 35) {
    whyReasons.push("Preference for stability and capital protection prioritizes sleep-at-night security over speculative gains.");
  } else {
    whyReasons.push("Balanced emotional temperament allows steady participation in diversified growth assets.");
  }

  if (capacityData.runwayMonths >= 6) {
    whyReasons.push(`Fortified liquid emergency buffer (${capacityData.runwayMonths} months) protects your investments from distress liquidation.`);
  } else if (capacityData.runwayMonths < 3 && !capacityData.isEstimated) {
    warnings.push(`Limited emergency buffer (${capacityData.runwayMonths} months) increases vulnerability during unexpected emergencies.`);
  }

  if (capacityData.dtiPct > 40 && !capacityData.isEstimated) {
    warnings.push(`Elevated debt commitments (DTI: ${capacityData.dtiPct}%) absorb monthly cashflow, reducing discretionary risk-taking.`);
  }

  // 7. Goal Compatibility Matrix
  const goalCompatibilityList = (goals.length > 0 ? goals : [primaryGoalInput]).map((g) => {
    const gCat = (g.category || "wealth_creation").toLowerCase();
    const gTitle = g.title || goalData.categoryLabel;
    let compatibilityStatus = "compatible";
    let suitabilityTag = "🟢 Highly Compatible";
    let note = "Your Risk DNA asset allocation matches this goal's compounding horizon.";

    if (gCat.includes("emergency")) {
      compatibilityStatus = "defensive_required";
      suitabilityTag = "🛡️ Pure Liquid Defense";
      note = "Keep 100% in liquid savings and FDs. Avoid all market-linked equities.";
    } else if (gCat.includes("house") || gCat.includes("vehicle") || gCat.includes("short_term")) {
      if (horizonYears <= 3) {
        compatibilityStatus = "short_horizon_caution";
        suitabilityTag = "🟡 Moderate Horizon Caution";
        note = "Due to the shorter timeline, limit equity exposure to avoid locking in losses right before withdrawal.";
      }
    } else if (gCat.includes("retirement") || gCat.includes("wealth")) {
      suitabilityTag = "🟢 Ideal Growth Alignment";
      note = "Long compounding horizon is perfectly matched for diversified index and equity mutual funds.";
    }

    return {
      title: gTitle,
      category: gCat,
      targetAmount: g.targetAmount || 500000,
      suitabilityTag,
      note,
    };
  });

  // 8. Actual Portfolio vs Target Audit
  let actualPortfolio = { equityPct: 0, debtPct: 0, goldPct: 0, otherPct: 0, cashPct: 100, totalValue: 0 };
  let equityTotal = 0, debtTotal = 0, goldTotal = 0, otherTotal = 0;
  let cashTotal = Number(financialProfile?.currentSavings || 0);

  if (Array.isArray(assets) && assets.length > 0) {
    assets.forEach((a) => {
      const val = Number(a.currentValue || 0);
      const cat = (a.category || "").toLowerCase();
      if (["stock", "mutual_fund", "sip", "etf", "equity"].includes(cat)) equityTotal += val;
      else if (["fd", "bond", "epf", "ppf", "debt_fund", "debt", "nps"].includes(cat)) debtTotal += val;
      else if (["gold", "digital_gold", "sgb"].includes(cat)) goldTotal += val;
      else if (["other", "real_estate", "property", "land", "agriculture", "alternate", "crypto", "business"].includes(cat)) otherTotal += val;
      else if (["cash", "savings", "bank_account"].includes(cat)) cashTotal += val;
      else otherTotal += val; // Default unclassified assets to Other Holdings, not Cash!
    });
  }

  const totalPortfolioValue = equityTotal + debtTotal + goldTotal + otherTotal + cashTotal;
  if (totalPortfolioValue > 0) {
    actualPortfolio = {
      equityPct: Number(((equityTotal / totalPortfolioValue) * 100).toFixed(1)),
      debtPct: Number(((debtTotal / totalPortfolioValue) * 100).toFixed(1)),
      goldPct: Number(((goldTotal / totalPortfolioValue) * 100).toFixed(1)),
      otherPct: Number(((otherTotal / totalPortfolioValue) * 100).toFixed(1)),
      cashPct: Number(((cashTotal / totalPortfolioValue) * 100).toFixed(1)),
      totalValue: totalPortfolioValue,
      equityTotal,
      debtTotal,
      goldTotal,
      otherTotal,
      cashTotal,
    };
  }

  // Portfolio Alignment Check
  const recAlloc = categoryObj.allocation;
  let portfolioAlignment = {
    status: "aligned",
    badge: "🟢 Balanced Alignment",
    message: "Your current portfolio asset distribution is broadly aligned with your Risk DNA target allocation.",
  };

  const equityVariance = actualPortfolio.equityPct - recAlloc.equityPct;
  if (otherTotal > 0 && actualPortfolio.otherPct >= 40) {
    portfolioAlignment = {
      status: "illiquid_concentration",
      badge: "📑 High Illiquid / Real Estate Asset Weight",
      message: `A significant portion (${actualPortfolio.otherPct}%, ₹${otherTotal.toLocaleString("en-IN")}) is in real estate or alternative illiquid holdings. Build a liquid financial portfolio (Equity, Debt & Gold) to support regular cashflow needs.`,
    };
  } else if (equityVariance >= 15 && totalPortfolioValue > 0) {
    portfolioAlignment = {
      status: "high_equity_variance",
      badge: "🟡 Higher Equity Exposure",
      message: `Your actual equity weighting (${actualPortfolio.equityPct}%) is ${Math.round(equityVariance)}% above your Risk DNA target (${recAlloc.equityPct}%). This creates elevated drawdown risk during cyclical corrections.`,
    };
  } else if (equityVariance <= -20 && actualPortfolio.cashPct >= 35 && totalPortfolioValue > 0) {
    portfolioAlignment = {
      status: "under_compounding_variance",
      badge: "ℹ️ Conservative Cash Drag",
      message: `Your liquid cash weighting (${actualPortfolio.cashPct}%) is high while equity (${actualPortfolio.equityPct}%) is below your Risk DNA target (${recAlloc.equityPct}%). Consider deploying surplus cash into diversified mutual funds.`,
    };
  }

  // 9. Personalized Comprehensive Explanation
  const explanation = `Your WealthX Risk DNA is calibrated as ${categoryObj.label} with a composite score of ${compositeScore}/100. Based on your stated investment horizon of ${horizonYears >= 10 ? "10+ years" : `${horizonYears} years`} and ${toleranceScore >= 70 ? "high comfort with market fluctuations" : toleranceScore <= 35 ? "defensive focus on capital preservation" : "balanced approach to volatility"}, your target allocation emphasizes ${recAlloc.equityPct}% Equities, ${recAlloc.debtPct}% Debt & FDs, and ${recAlloc.goldPct}% Gold. ${toleranceVsCapacity.status !== "aligned" ? toleranceVsCapacity.explanation : "Your emotional tolerance and financial capacity are in healthy balance, enabling sustained compounding without panic selling."}`;

  return {
    riskScore: compositeScore,
    profileCategory: categoryObj.key,
    categoryLabel: categoryObj.label,
    componentScores: {
      riskToleranceScore: toleranceScore,
      investmentHorizonScore: horizonScore,
      goalCompatibilityScore: goalScore,
      riskCapacityScore: capacityScore,
    },
    investmentHorizonYears: horizonYears,
    recommendedAllocation: recAlloc,
    toleranceVsCapacity,
    whyReasons,
    warnings,
    appliedGuardrails,
    goalCompatibilityList,
    actualPortfolio,
    portfolioAlignment,
    guidance: categoryObj.guidance,
    explanation,
    confidence: capacityData.isEstimated ? 75 : 95,
  };
}

module.exports = {
  calculateRiskProfile,
  calculateToleranceScore,
  calculateHorizonScore,
  calculateGoalScore,
  calculateCapacityScore,
  RISK_CATEGORIES,
};
