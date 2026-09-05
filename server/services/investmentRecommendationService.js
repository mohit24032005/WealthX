/**
 * WealthX Investment Recommendation Engine
 * Connects User Balance Sheet, Risk DNA, Goals, and Portfolio Overconcentration
 * with official AMFI Mutual Fund NAVs and Upstox Market Data.
 *
 * Computes transparent, algorithmic WealthX Suitability Scores (0 - 100).
 */

const { INITIAL_CURATED_FUNDS } = require("./amfiService");
const { STOCKS_DATABASE } = require("./marketDataService");

/**
 * Calculate multi-factor WealthX Suitability Score (0 - 100) for a candidate fund
 */
const calculateFundSuitability = (fund, context) => {
  const {
    riskScore = 58,
    riskCategory = "moderate_growth",
    equityExposurePct = 50,
    emergencyMonths = 4,
    hasGoals = true,
  } = context;

  // 1. Risk Match (0 - 100)
  let riskMatch = 75;
  if (riskCategory === "aggressive" || riskCategory === "growth") {
    if (fund.category === "equity" || fund.category === "index") riskMatch = 95;
    else if (fund.category === "hybrid") riskMatch = 80;
    else riskMatch = 65;
  } else if (riskCategory === "conservative" || riskCategory === "moderate") {
    if (fund.category === "debt" || fund.category === "liquid") riskMatch = 95;
    else if (fund.category === "hybrid") riskMatch = 90;
    else riskMatch = 55;
  } else {
    // Moderate Growth
    if (fund.category === "index" || fund.category === "hybrid") riskMatch = 92;
    else if (fund.category === "equity") riskMatch = 85;
    else riskMatch = 75;
  }

  // 2. Portfolio Fit & Diversification (0 - 100)
  // Penalize overconcentration if user already has >65% equity and fund is pure equity
  let portfolioFit = 85;
  let diversificationNote = "";
  if (equityExposurePct >= 65 && (fund.category === "equity" || fund.category === "index")) {
    portfolioFit = 68;
    diversificationNote = "Your portfolio already has high equity concentration. Consider balancing with debt or hybrid.";
  } else if (equityExposurePct >= 65 && (fund.category === "debt" || fund.category === "hybrid")) {
    portfolioFit = 96;
    diversificationNote = "Provides healthy diversification against your high equity exposure.";
  } else if (equityExposurePct < 30 && (fund.category === "equity" || fund.category === "index")) {
    portfolioFit = 95;
    diversificationNote = "Increases your equity exposure towards long-term wealth compounding.";
  }

  // 3. Goal & Horizon Match (0 - 100)
  let goalMatch = hasGoals ? 88 : 80;
  if (emergencyMonths < 3 && fund.category === "liquid") {
    goalMatch = 98; // Highest match for liquid when emergency runway is weak
  } else if (emergencyMonths < 3 && fund.category === "equity") {
    goalMatch = 60; // Penalize equity when liquid buffer is missing
  }

  // 4. Quality & Cost Score (0 - 100)
  const expenseBonus = fund.expenseRatio <= 0.4 ? 15 : fund.expenseRatio <= 0.7 ? 8 : 0;
  const cagrBonus = (fund.cagr3Y || 15) >= 18 ? 10 : 5;
  const qualityScore = Math.min(100, 75 + expenseBonus + cagrBonus);

  // Composite Weighted Suitability Score
  const suitabilityScore = Math.round(
    riskMatch * 0.35 +
    portfolioFit * 0.30 +
    goalMatch * 0.20 +
    qualityScore * 0.15
  );

  return {
    suitabilityScore,
    breakdown: {
      riskMatch,
      portfolioFit,
      goalMatch,
      qualityScore,
    },
    diversificationNote,
  };
};

/**
 * Generate Top Curated Mutual Fund Recommendations matching User Financial Profile
 */
const recommendMutualFunds = (context) => {
  const evaluated = INITIAL_CURATED_FUNDS.map((fund) => {
    const { suitabilityScore, breakdown, diversificationNote } = calculateFundSuitability(fund, context);
    return {
      schemeCode: fund.schemeCode,
      name: fund.schemeName,
      amc: fund.amc,
      category: fund.category.toUpperCase(),
      subCategory: fund.subCategory,
      plan: fund.plan,
      latestNav: fund.nav,
      navDate: fund.navDate || "21 Aug 2026",
      riskLevel: fund.riskLevel,
      expenseRatio: fund.expenseRatio,
      cagr3Y: fund.cagr3Y,
      suitabilityScore,
      breakdown,
      diversificationNote,
      reason:
        suitabilityScore >= 88
          ? `Exceptional match for your ${context.riskCategoryLabel || "Moderate Growth"} profile with solid cost-efficiency and portfolio diversification.`
          : `Solid candidate for ${fund.subCategory} exposure with proven risk-adjusted compounding.`,
    };
  });

  // Sort descending by suitability score
  evaluated.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  return evaluated.slice(0, 3);
};

/**
 * Generate Stock Research Candidates matching User Financial Context
 */
const recommendStockResearch = (context) => {
  const { riskCategory = "moderate_growth" } = context;

  // Filter benchmark stocks suited for research
  let candidates = STOCKS_DATABASE;
  if (riskCategory === "conservative") {
    candidates = STOCKS_DATABASE.filter((s) => s.dividendYield && parseFloat(s.dividendYield) >= 1.0);
  }

  return candidates.slice(0, 3).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price,
    change: stock.change,
    changePct: stock.changePct,
    peRatio: stock.peRatio,
    high52w: stock.high52w,
    low52w: stock.low52w,
    marketCap: stock.marketCap,
    volume: stock.volume,
    freshness: "Market Reference EOD",
    researchThesis: `Market leader in ${stock.sector} trading at a ${stock.peRatio}x P/E with strong return on capital and systemic franchise strength.`,
  }));
};

/**
 * Generate dynamic rupee allocation for a custom budget (e.g. ₹10,000)
 */
const generateDynamicSurplusPlan = (amount = 10000, context) => {
  const amt = Math.max(1000, Number(amount) || 10000);
  const { emergencyMonths = 4, emiBurdenPct = 0, riskCategory = "moderate_growth" } = context;

  const slices = [];

  // Scenario 1: Low emergency runway (<3 months)
  if (emergencyMonths < 3) {
    const s1 = Math.round(amt * 0.6);
    const s2 = Math.round(amt * 0.25);
    const s3 = amt - s1 - s2;
    slices.push(
      { label: "Emergency Liquid Reserve", amount: s1, pct: 60, color: "#f59e0b", icon: "🛡️", reason: "Liquid runway is under 3 months. Fortifying liquid buffer prevents debt in emergencies." },
      { label: "Index Fund SIP (Core Growth)", amount: s2, pct: 25, color: "#06b6d4", icon: "🌱", reason: "Maintains regular compounding discipline in low-cost broad index." },
      { label: "Milestone Goal Acceleration", amount: s3, pct: 15, color: "#10b981", icon: "🎯", reason: "Keeps milestone targets funded on scheduled timeline." }
    );
  }
  // Scenario 2: Heavy debt (>40% DTI)
  else if (emiBurdenPct > 40) {
    const s1 = Math.round(amt * 0.7);
    const s2 = Math.round(amt * 0.2);
    const s3 = amt - s1 - s2;
    slices.push(
      { label: "Accelerated Loan Prepayment", amount: s1, pct: 70, color: "#f43f5e", icon: "💳", reason: "Guaranteed interest savings return equal to active loan lending rate." },
      { label: "Equity Mutual Fund SIP", amount: s2, pct: 20, color: "#06b6d4", icon: "🌱", reason: "Keeps long-term equity compounding active while reducing principal debt." },
      { label: "Liquid Buffer Addition", amount: s3, pct: 10, color: "#14b8a6", icon: "🛡️", reason: "Maintains cash buffer for near-term flexibility." }
    );
  }
  // Scenario 3: Fortified balance sheet
  else {
    const s1 = Math.round(amt * 0.5);
    const s2 = Math.round(amt * 0.25);
    const s3 = Math.round(amt * 0.15);
    const s4 = amt - s1 - s2 - s3;
    slices.push(
      { label: "Equity & Index SIP (Wealth Creation)", amount: s1, pct: 50, color: "#3b82f6", icon: "📈", reason: "Primary compounding driver aligned with your Risk DNA horizon." },
      { label: "Milestone Goal Target", amount: s2, pct: 25, color: "#10b981", icon: "🎯", reason: "Directly funds active target milestones in Goals registry." },
      { label: "Debt / Sovereign Gold Hedge", amount: s3, pct: 15, color: "#f59e0b", icon: "🥇", reason: "Provides non-correlated hedge and capital stability." },
      { label: "Dry Powder / Liquid Cash", amount: s4, pct: 10, color: "#14b8a6", icon: "💵", reason: "Opportunistic liquidity for market dips or unexpected cash needs." }
    );
  }

  return {
    totalBudget: amt,
    slices,
  };
};

module.exports = {
  calculateFundSuitability,
  recommendMutualFunds,
  recommendStockResearch,
  generateDynamicSurplusPlan,
};
