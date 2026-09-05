const FinancialProfile = require("../models/FinancialProfile");
const Asset = require("../models/Asset");
const Goal = require("../models/Goal");
const Loan = require("../models/Loan");
const RiskProfile = require("../models/RiskProfile");
const { logFinancialEvent } = require("../services/historyService");
const {
  calculateEmergencyRunway,
  calculateSavingsMetrics,
  calculateDebtHealth,
  calculatePortfolioAllocation,
} = require("../utils/financialCalculations");
const {
  recommendMutualFunds,
  recommendStockResearch,
  generateDynamicSurplusPlan,
} = require("../services/investmentRecommendationService");
const { explainFinancialDecision } = require("../services/geminiService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const PRESET_DECISION_TOPICS = [
  { id: "best_sip", title: "What SIP should I consider?", prompt: "What is the best mutual fund SIP suited for my Risk DNA, investment horizon, and existing portfolio?" },
  { id: "where_next_money", title: "Where should my next ₹10,000 go?", prompt: "Where should my next ₹10,000 surplus be allocated based on my current balance sheet?" },
  { id: "stock_research", title: "Which stocks should I research?", prompt: "Which large-cap or compounder stocks match my investment risk posture for further fundamental research?" },
  { id: "start_sip", title: "Can I afford to start a ₹10,000 monthly SIP?", prompt: "Can I afford to start a ₹10,000 monthly SIP right now without compromising my liquidity?" },
  { id: "prepay_loan", title: "Should I accelerate my loan repayment or invest?", prompt: "Should I make a lump-sum prepayment towards my active loans or invest in equity mutual funds?" },
  { id: "portfolio_risk", title: "Is my investment portfolio too aggressive?", prompt: "Does my current asset allocation carry excessive risk compared to my Risk DNA target?" },
  { id: "saving_enough", title: "Am I saving enough of my monthly income?", prompt: "Is my current monthly savings rate adequate for long-term wealth creation?" },
  { id: "afford_loan", title: "Can I comfortably afford a new loan EMI?", prompt: "Can my monthly cash flow absorb an additional ₹15,000 monthly loan EMI commitment?" },
];

/**
 * Evaluate structured financial query against user's actual balance sheet & investment intelligence with Gemini AI
 */
const evaluateFinancialDecision = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, topicId, conversationHistory = [] } = req.body;

    if (!query && !topicId) {
      return sendError(res, "Please provide a decision query or topicId", 400);
    }

    const profile = await FinancialProfile.findOne({ userId });
    const assets = await Asset.find({ userId });
    const goals = await Goal.find({ userId });
    const loans = await Loan.find({ userId });
    const riskProfile = await RiskProfile.findOne({ userId });

    const income = Number(profile?.monthlyIncome || 0);
    const expenses = Number(profile?.monthlyExpenses || 0);
    const savings = Number(profile?.currentSavings || 0);

    // Consolidated calculations
    const savingsMetrics = calculateSavingsMetrics(income, expenses);
    const emergencyRunway = calculateEmergencyRunway(savings, expenses);
    const portfolio = calculatePortfolioAllocation(assets, savings);

    let totalMonthlyEMI = 0;
    let totalDebt = 0;
    loans.forEach((l) => {
      totalDebt += Number(l.outstandingAmount || 0);
      totalMonthlyEMI += Number(l.monthlyEMI || 0);
    });
    const debtHealth = calculateDebtHealth(income, totalMonthlyEMI, loans.length);

    // Build context object for Recommendation Engine & Gemini
    const userContext = {
      income,
      expenses,
      surplus: savingsMetrics.monthlySurplus,
      savingsRate: savingsMetrics.savingsRate,
      emergencyMonths: emergencyRunway.months !== null ? emergencyRunway.months : 0,
      emergencyStatus: emergencyRunway.status,
      riskScore: riskProfile?.riskScore || 58,
      riskCategory: riskProfile?.profileCategory || "moderate_growth",
      riskCategoryLabel: riskProfile?.categoryLabel || "Moderate Growth",
      investmentHorizonYears: riskProfile?.investmentHorizonYears || 7,
      equityExposurePct: portfolio.equityPct,
      debtExposurePct: portfolio.debtPct,
      goldExposurePct: portfolio.goldPct,
      cashExposurePct: portfolio.cashPct,
      hasGoals: goals.length > 0,
      emiBurdenPct: debtHealth.emiBurdenPct,
      totalAssets: portfolio.totalPortfolio,
      netWorth: portfolio.totalPortfolio - totalDebt,
    };

    // Normalize topic query
    const textQuery = (query || "").toLowerCase();
    const isTopic = (tId) => topicId === tId || textQuery.includes(tId.replace(/_/g, " "));

    let status = "recommended";
    let decisionState = "CONSIDER";
    let statusLabel = "🟢 Recommended with High Confidence";
    let summary = "";
    let suggestedAction = { text: "Explore SIPs & Mutual Funds", route: "/investments/sip" };
    const pillars = {};

    let recommendations = null;
    let researchStocks = null;
    let allocationPlan = null;
    let portfolioDiagnostics = null;

    // 1. Evaluate: BEST SIP / MUTUAL FUNDS TO CONSIDER
    if (isTopic("best_sip") || textQuery.includes("which fund") || textQuery.includes("what sip") || textQuery.includes("mutual fund") || textQuery.includes("recommend fund")) {
      recommendations = recommendMutualFunds(userContext);
      status = "recommended";
      decisionState = "CONSIDER";
      statusLabel = "🟢 Top Matches for Your Profile";
      summary = `Based on your ${userContext.riskCategoryLabel} posture (Risk Score: ${userContext.riskScore}/100) and ${userContext.equityExposurePct}% existing equity allocation, we evaluated benchmark AMFI mutual funds. Here are the top candidates matching your time horizon and diversification profile.`;
      suggestedAction = { text: "Simulate SIP Growth", route: "/calculators/sip" };

      pillars.riskAlignment = {
        status: "good",
        title: "Risk DNA Compatibility",
        detail: `Calibrated for ${userContext.riskCategoryLabel} posture with long-term compounding focus.`,
      };
      pillars.diversification = {
        status: userContext.equityExposurePct >= 65 ? "warning" : "good",
        title: "Portfolio Balance",
        detail: `Current portfolio: ${userContext.equityExposurePct}% Equity, ${userContext.debtExposurePct}% Debt. Candidates provide balanced factor exposure.`,
      };
      pillars.costEfficiency = {
        status: "good",
        title: "Direct Plan Cost Advantage",
        detail: "All recommendations feature zero-commission Direct-Growth plans with low expense ratios.",
      };
    }
    // 2. Evaluate: WHERE SHOULD MY NEXT ₹10,000 GO?
    else if (isTopic("where_next_money") || textQuery.includes("next 10,000") || textQuery.includes("next 10000") || textQuery.includes("where should i invest")) {
      allocationPlan = generateDynamicSurplusPlan(10000, userContext);
      status = "recommended";
      decisionState = "CONSIDER";
      statusLabel = "🟢 Personalized Capital Allocation";
      summary = `Tuned to your ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo surplus, ${emergencyRunway.months || 0}-month emergency runway, and ${debtHealth.emiBurdenPct}% debt load. Every rupee is optimized across stability, compounding, and milestone targets.`;
      suggestedAction = { text: "Inspect Dynamic Allocation Tool", route: "/my-next-money" };

      pillars.liquidity = {
        status: emergencyRunway.status === "good" ? "good" : "warning",
        title: "Emergency Cushion",
        detail: emergencyRunway.description,
      };
      pillars.compounding = {
        status: "good",
        title: "Wealth Compounding",
        detail: "50-60% channeled towards systematic equity and index compounding.",
      };
      pillars.debtImpact = {
        status: debtHealth.debtHealthStatus,
        title: "Debt Obligations",
        detail: debtHealth.debtExplanation,
      };
    }
    // 3. Evaluate: STOCKS TO RESEARCH
    else if (isTopic("stock_research") || textQuery.includes("stock") || textQuery.includes("equity share") || textQuery.includes("which stock")) {
      researchStocks = recommendStockResearch(userContext);
      status = "recommended";
      decisionState = "CONSIDER";
      statusLabel = "🟢 Bluechip Research Candidates";
      summary = `Screened for ${userContext.riskCategoryLabel} profiles: established market leaders with high return on equity, reasonable valuation multiples, and durable economic moats.`;
      suggestedAction = { text: "Open Stocks Explorer", route: "/investments/stocks" };

      pillars.valuation = {
        status: "good",
        title: "Valuation Sanity",
        detail: "Screened for market leaders trading within sustainable P/E and EV/EBITDA bands.",
      };
      pillars.franchiseMoat = {
        status: "good",
        title: "Franchise Durability",
        detail: "Dominant industry leaders with high return on capital employed (ROCE).",
      };
      pillars.riskNotice = {
        status: "warning",
        title: "Direct Equity Risk",
        detail: "Direct stocks carry higher idiosyncratic volatility than mutual funds. Size positions prudently.",
      };
    }
    // 4. Evaluate: START ₹10,000 SIP
    else if (isTopic("start_sip") || (textQuery.includes("sip") && (textQuery.includes("start") || textQuery.includes("afford")))) {
      const sipAmount = 10000;
      if (savingsMetrics.monthlySurplus < sipAmount) {
        status = "avoid";
        decisionState = "NOT_SUITABLE";
        statusLabel = "🔴 Not Advised Currently";
        summary = `Your monthly surplus is ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}, which is less than the required ₹${sipAmount.toLocaleString("en-IN")}. Starting a ₹10k commitment risks cashflow deficit or missed installments.`;
        suggestedAction = { text: "Optimize Expenses in X-Ray", route: "/financial-xray" };
      } else if (emergencyRunway.months < 3) {
        status = "review";
        decisionState = "REVIEW";
        statusLabel = "🟡 Fortify Emergency Reserve First";
        summary = `You have ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo surplus, but your emergency runway is only ${emergencyRunway.months} months. We recommend splitting ₹5k to emergency buffer and ₹5k to SIP initially.`;
        suggestedAction = { text: "Allocate ₹10,000 Surplus", route: "/my-next-money" };
      } else {
        status = "recommended";
        decisionState = "CONSIDER";
        statusLabel = "🟢 Strongly Recommended";
        summary = `You maintain a robust monthly surplus of ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")} and ${emergencyRunway.months} months of emergency buffer. A ₹10,000 monthly SIP comfortably fits your cashflow.`;
        suggestedAction = { text: "Launch SIP Calculator", route: "/calculators/sip" };
      }

      pillars.affordability = {
        status: savingsMetrics.monthlySurplus >= sipAmount ? "good" : "critical",
        title: "Cashflow Affordability",
        detail: `Monthly surplus of ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")} leaves ₹${Math.max(0, savingsMetrics.monthlySurplus - sipAmount).toLocaleString("en-IN")} safety buffer after a ₹${sipAmount.toLocaleString("en-IN")} SIP.`,
      };
      pillars.liquidity = {
        status: emergencyRunway.status === "good" ? "good" : "warning",
        title: "Emergency Buffer",
        detail: emergencyRunway.description,
      };
      pillars.debtImpact = {
        status: debtHealth.debtHealthStatus,
        title: "Debt Obligations",
        detail: debtHealth.debtExplanation,
      };
    }
    // 5. Evaluate: PREPAY LOAN VS INVEST
    else if (isTopic("prepay_loan") || textQuery.includes("prepay") || textQuery.includes("pay loan")) {
      if (loans.length === 0) {
        status = "recommended";
        decisionState = "CONSIDER";
        statusLabel = "🟢 Direct to Compounding";
        summary = "You currently track zero active loan liabilities! Direct 100% of your surplus capital towards growth investments and milestone goals.";
        suggestedAction = { text: "Create Investment Plan", route: "/investments" };
      } else if (debtHealth.emiBurdenPct > 40) {
        status = "recommended";
        decisionState = "CONSIDER";
        statusLabel = "🟢 Strongly Prioritize Loan Prepayment";
        summary = `Your active loan repayments consume ${debtHealth.emiBurdenPct}% of your monthly income. Prepaying high-interest debt delivers a guaranteed, risk-free tax-neutral return equal to your loan interest rate.`;
        suggestedAction = { text: "Simulate Accelerated Payoff", route: "/loans" };
      } else {
        status = "review";
        decisionState = "REVIEW";
        statusLabel = "🟡 Balanced Hybrid Strategy";
        summary = `With a moderate ${debtHealth.emiBurdenPct}% EMI burden, a 50/50 split between loan prepayment and equity SIP compounding maximizes long-term net worth while reducing debt tenure.`;
        suggestedAction = { text: "Compare Loan Payoff vs SIP", route: "/loans" };
      }

      pillars.interestSavings = {
        status: "good",
        title: "Debt Exposure",
        detail: `Active loans total ₹${totalDebt.toLocaleString("en-IN")} across ${loans.length} facilities.`,
      };
      pillars.debtImpact = {
        status: debtHealth.debtHealthStatus,
        title: "Debt-to-Income",
        detail: debtHealth.debtExplanation,
      };
    }
    // 6. Evaluate: IS PORTFOLIO TOO RISKY
    else if (isTopic("portfolio_risk") || textQuery.includes("risk") || textQuery.includes("aggressive")) {
      const targetAllocation = riskProfile?.recommendedAllocation || { equityPct: 55, debtPct: 25, goldPct: 10, cashPct: 10 };
      portfolioDiagnostics = {
        current: { equityPct: portfolio.equityPct, debtPct: portfolio.debtPct, goldPct: portfolio.goldPct, cashPct: portfolio.cashPct },
        target: targetAllocation,
        isOverexposed: portfolio.equityPct > targetAllocation.equityPct + 15,
      };

      if (portfolioDiagnostics.isOverexposed) {
        status = "review";
        decisionState = "REVIEW";
        statusLabel = "🟡 Rebalancing Recommended";
        summary = `Your portfolio holds ${portfolio.equityPct}% in equities versus your Risk DNA target of ${targetAllocation.equityPct}%. In market drawdowns, volatility will exceed your calibrated comfort level. Adding debt or sovereign gold will stabilize risk.`;
        suggestedAction = { text: "Inspect Risk DNA Target", route: "/risk-dna" };
      } else {
        status = "recommended";
        decisionState = "CONSIDER";
        statusLabel = "🟢 Appropriate Risk Alignment";
        summary = `Your current portfolio (${portfolio.equityPct}% Equity, ${portfolio.debtPct}% Debt) closely tracks your calibrated ${userContext.riskCategoryLabel} blueprint.`;
        suggestedAction = { text: "View Wealth Vault", route: "/wealth-vault" };
      }

      pillars.riskCapacity = {
        status: "good",
        title: "Risk DNA Posture",
        detail: `Risk Score: ${userContext.riskScore}/100 (${userContext.riskCategoryLabel}).`,
      };
      pillars.portfolioFit = {
        status: portfolioDiagnostics.isOverexposed ? "warning" : "good",
        title: "Asset Allocation Alignment",
        detail: `Current Equity: ${portfolio.equityPct}% vs Target: ${targetAllocation.equityPct}%.`,
      };
    }
    // 7. General Fallback Evaluation
    else {
      if (emergencyRunway.months < 3) {
        status = "review";
        decisionState = "REVIEW";
        statusLabel = "🟡 Priority: Fortify Emergency Runway";
        summary = `Based on your balance sheet, your emergency fund covers ${emergencyRunway.months} months. Prioritize building this to at least 3-6 months before taking aggressive new financial commitments.`;
        suggestedAction = { text: "Inspect Financial X-Ray", route: "/financial-xray" };
      } else if (debtHealth.emiBurdenPct > 40) {
        status = "review";
        decisionState = "REVIEW";
        statusLabel = "🟡 Priority: Reduce Debt Burden";
        summary = `Your monthly EMI load (${debtHealth.emiBurdenPct}% of income) is elevated. Channeling surplus towards debt reduction is recommended.`;
        suggestedAction = { text: "Manage Active Loans", route: "/loans" };
      } else {
        status = "recommended";
        decisionState = "CONSIDER";
        statusLabel = "🟢 Healthy Financial Baseline";
        summary = `You maintain a healthy savings rate (${savingsMetrics.savingsRate}%), adequate liquid buffer (${emergencyRunway.months} months), and manageable debt (${debtHealth.emiBurdenPct}%). You are in a strong position to invest.`;
        suggestedAction = { text: "View Recommended Action Plan", route: "/action-plan" };
      }

      pillars.affordability = {
        status: savingsMetrics.savingsRate >= 20 ? "good" : "warning",
        title: "Savings Rate",
        detail: `Saving ${savingsMetrics.savingsRate}% of income (₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo surplus).`,
      };
      pillars.liquidity = {
        status: emergencyRunway.status === "good" ? "good" : "critical",
        title: "Liquidity Buffer",
        detail: emergencyRunway.description,
      };
      pillars.debtImpact = {
        status: debtHealth.debtHealthStatus,
        title: "Debt-to-Income",
        detail: debtHealth.debtExplanation,
      };
    }

    // Pass structured context into Gemini AI layer
    const geminiContext = {
      ...userContext,
      decisionState,
      summary,
      suggestedAction,
      recommendations,
      researchStocks,
      allocationPlan,
      portfolioDiagnostics,
    };

    const aiExplanation = await explainFinancialDecision({
      query: query || topicId,
      conversationHistory,
      financialContext: geminiContext,
    });

    // Log decision inquiry to audit history
    await logFinancialEvent({
      userId,
      eventType: "decision_inquiry",
      title: `AI Decision: ${query || topicId}`,
      description: aiExplanation.summary || summary,
      category: "decision_lab",
      metadata: { status, decisionState, statusLabel },
    });

    return sendSuccess(res, {
      query: query || topicId,
      status,
      decisionState,
      statusLabel,
      summary: aiExplanation.summary || summary,
      aiExplanation,
      pillars,
      suggestedAction,
      recommendations,
      researchStocks,
      allocationPlan,
      portfolioDiagnostics,
      disclaimer: aiExplanation.disclaimer || "WealthX AI Decision Lab provides algorithmic financial analysis based on available AMFI and market data for educational purposes. It is not SEBI/RBI registered investment advice.",
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getPresetQuestions = async (req, res) => {
  return sendSuccess(res, PRESET_DECISION_TOPICS);
};

module.exports = {
  evaluateFinancialDecision,
  getPresetQuestions,
};
