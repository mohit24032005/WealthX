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
  calculatePillarScores,
} = require("../utils/financialCalculations");
const { generateDynamicSurplusPlan } = require("../services/investmentRecommendationService");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Generate a personalized, deterministic, prioritized Strategic Action Plan
 * Grounded strictly in the user's real balance sheet, Risk DNA, and goals
 */
const getActionPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await FinancialProfile.findOne({ userId });
    const assets = await Asset.find({ userId });
    const goals = await Goal.find({ userId });
    const loans = await Loan.find({ userId });
    const riskProfile = await RiskProfile.findOne({ userId });

    // Handle New User with uncalibrated profile
    if (!profile) {
      return sendSuccess(res, {
        isUncalibrated: true,
        financialStage: {
          stageNumber: 1,
          stageName: "Financial Foundation",
          badgeColor: "badge-rose",
          tagline: "Profile calibration pending.",
          description: "Complete your 2-minute financial calibration to unlock personalized priority action items.",
        },
        actionMap: {
          protection: { status: "Uncalibrated", score: 0, badge: "badge-rose" },
          debt: { status: "Uncalibrated", score: 0, badge: "badge-rose" },
          goals: { status: "Uncalibrated", score: 0, badge: "badge-rose" },
          portfolio: { status: "Uncalibrated", score: 0, badge: "badge-rose" },
          growth: { status: "Foundation First", score: 0, badge: "badge-rose" },
        },
        topPriority: {
          id: "calibrate_profile",
          priorityLevel: "CRITICAL",
          priorityScore: 99,
          icon: "⚙️",
          title: "Complete Financial Profile Calibration",
          currentSituation: "Profile uncalibrated",
          target: "Complete income & expense baseline",
          progressPct: 0,
          whyItMatters: "WealthX requires your real income, expense, and liquid savings baseline to generate mathematically sound action items.",
          recommendedAction: "Complete the 2-minute onboarding calibration.",
          actionLabel: "Start Calibration",
          actionRoute: "/onboarding",
          aiPrompt: "How should I structure my financial baseline for optimal wealth tracking?",
        },
        timeline: {
          thisWeek: [],
          thisMonth: [],
          next3Months: [],
          next6To12Months: [],
        },
        allActions: [],
        growthOpportunity: {
          isReady: false,
          headline: "Foundation First",
          description: "Calibrate your financial baseline before committing to long-term market investments.",
          actionLabel: "Calibrate Profile",
          actionRoute: "/onboarding",
        },
        smartAllocation: null,
      });
    }

    const income = Number(profile.monthlyIncome || 0);
    const expenses = Number(profile.monthlyExpenses || 0);
    const liquidSavings = Number(profile.currentSavings || 0);

    // 1. Calculate Core Financial Metrics
    const savingsMetrics = calculateSavingsMetrics(income, expenses);
    const emergencyRunway = calculateEmergencyRunway(liquidSavings, expenses);
    const portfolio = calculatePortfolioAllocation(assets, liquidSavings);

    let totalMonthlyEMI = 0;
    let totalOutstanding = 0;
    loans.forEach((l) => {
      totalMonthlyEMI += Number(l.monthlyEMI || 0);
      totalOutstanding += Number(l.outstandingAmount || 0);
    });
    const debtHealth = calculateDebtHealth(income, totalMonthlyEMI, loans.length);

    // 2. Enriched Goals
    const enrichedGoals = goals.map(enrichGoal);
    const goalList = enrichedGoals.map((g) => ({
      id: g._id,
      title: g.title,
      category: g.category,
      progressPct: g.progressPct,
      status: g.status,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      requiredMonthlyContribution: g.requiredMonthlyContribution,
      currentContribution: g.monthlyContribution || 0,
      pacingGap: Math.max(0, g.requiredMonthlyContribution - (g.monthlyContribution || 0)),
      isBehind: g.status === "behind_schedule" || (g.monthlyContribution || 0) < g.requiredMonthlyContribution,
    }));

    // 3. Pillar Scores & Financial Stage
    const pillarScores = calculatePillarScores({
      savingsRate: savingsMetrics.savingsRate,
      expenseRatio: savingsMetrics.expenseRatio,
      emergencyMonths: emergencyRunway.months,
      emiBurdenPct: debtHealth.emiBurdenPct,
      loansCount: loans.length,
      assetsCount: assets.length,
      portfolio,
      goals: goalList,
    });

    const financialStage = calculateFinancialStage({
      healthScore: pillarScores.compositeScore,
      emergencyMonths: emergencyRunway.months,
      savingsRate: savingsMetrics.savingsRate,
      emiBurdenPct: debtHealth.emiBurdenPct,
      assetsCount: assets.length,
      totalPortfolio: portfolio.totalPortfolio,
    });

    // 4. Generate Deterministic Prioritized Action Cards
    const candidateActions = [];

    // --- CATEGORY 1: PROTECTION & EMERGENCY RUNWAY ---
    const emgMonths = emergencyRunway.months !== null ? emergencyRunway.months : 0;
    const targetEmergencyCorpus = expenses * 6;
    const emergencyProgressPct = targetEmergencyCorpus > 0 ? Math.min(100, Math.round((liquidSavings / targetEmergencyCorpus) * 100)) : 0;

    if (emergencyRunway.status === "uncalibrated" || emgMonths < 2) {
      candidateActions.push({
        id: "emergency_critical",
        category: "protection",
        categoryLabel: "🛡️ Financial Protection",
        priorityLevel: "CRITICAL",
        priorityScore: 98,
        timeframe: "thisWeek",
        icon: "🚨",
        title: "Build Essential Emergency Buffer",
        currentSituation: `${emgMonths} Months Liquid Runway (₹${liquidSavings.toLocaleString("en-IN")})`,
        target: `6.0 Months Buffer (₹${targetEmergencyCorpus.toLocaleString("en-IN")})`,
        progressPct: emergencyProgressPct,
        whyItMatters: "A thin emergency buffer leaves you vulnerable to forced debt or panic-selling investments during unexpected medical or employment shocks.",
        recommendedAction: "Direct upcoming monthly cashflow into a liquid savings or sweep-in account until at least 3 months buffer is reached.",
        actionLabel: "Fortify Emergency Buffer",
        actionRoute: "/my-next-money",
        aiPrompt: `My emergency runway is currently ${emgMonths} months with ₹${expenses.toLocaleString("en-IN")} monthly expenses. How should I step-by-step fortify my emergency fund without disturbing essential expenses?`,
      });
    } else if (emgMonths < 4) {
      candidateActions.push({
        id: "emergency_developing",
        category: "protection",
        categoryLabel: "🛡️ Financial Protection",
        priorityLevel: "HIGH",
        priorityScore: 88,
        timeframe: "thisWeek",
        icon: "🛡️",
        title: "Expand Emergency Runway to 6 Months",
        currentSituation: `${emgMonths} Months Buffer (₹${liquidSavings.toLocaleString("en-IN")})`,
        target: `6.0 Months Buffer (₹${targetEmergencyCorpus.toLocaleString("en-IN")})`,
        progressPct: emergencyProgressPct,
        whyItMatters: "Reaching a full 6-month buffer locks in personal balance sheet resilience, allowing you to invest long-term with zero liquidity panic.",
        recommendedAction: "Channel a balanced 50/50 split of monthly surplus into emergency buffer and index SIPs.",
        actionLabel: "Allocate Next ₹10,000",
        actionRoute: "/my-next-money",
        aiPrompt: `I currently have ${emgMonths} months emergency buffer. Should I complete the 6 months target before increasing my equity SIPs?`,
      });
    } else if (emgMonths >= 12) {
      candidateActions.push({
        id: "emergency_excess",
        category: "protection",
        categoryLabel: "🛡️ Financial Protection",
        priorityLevel: "OPPORTUNITY",
        priorityScore: 62,
        timeframe: "next3Months",
        icon: "💡",
        title: "Deploy Excess Liquid Reserves",
        currentSituation: `${emgMonths} Months Cash Buffer (₹${liquidSavings.toLocaleString("en-IN")})`,
        target: "6.0 Months (Hold surplus in productive assets)",
        progressPct: 100,
        whyItMatters: "Holding excessive cash (>12 months) beyond safety needs causes real capital erosion due to inflation drag.",
        recommendedAction: "Evaluate deploying non-emergency surplus cash into short-term debt funds, gold bonds, or goal SIPs.",
        actionLabel: "Optimize Next ₹10k",
        actionRoute: "/my-next-money",
        aiPrompt: `I have ${emgMonths} months of expenses in liquid savings. How can I safely allocate excess cash into higher-yielding instruments without losing liquidity?`,
      });
    }

    // --- CATEGORY 2: DEBT & LIABILITY MANAGEMENT ---
    if (loans.length > 0) {
      if (debtHealth.emiBurdenPct > 40) {
        candidateActions.push({
          id: "debt_critical",
          category: "debt",
          categoryLabel: "💳 Debt Optimization",
          priorityLevel: "CRITICAL",
          priorityScore: 95,
          timeframe: "thisWeek",
          icon: "💳",
          title: "Accelerate High-Cost Debt Deleveraging",
          currentSituation: `${debtHealth.emiBurdenPct}% DTI (₹${totalMonthlyEMI.toLocaleString("en-IN")}/mo EMI across ${loans.length} loans)`,
          target: "DTI < 30% of monthly income",
          progressPct: Math.max(10, 100 - debtHealth.emiBurdenPct),
          whyItMatters: "High EMI obligations create severe cashflow drag. Prepaying loans provides a guaranteed, risk-free tax-neutral return equal to your loan interest rate.",
          recommendedAction: "Prioritize aggressive lump-sum prepayments toward the highest interest loan facility.",
          actionLabel: "Simulate Accelerated Payoff",
          actionRoute: "/loans",
          aiPrompt: `My monthly EMI burden is ${debtHealth.emiBurdenPct}% of my income (₹${totalMonthlyEMI.toLocaleString("en-IN")}/mo). What debt reduction strategy (Snowball vs Avalanche) will minimize my total interest paid?`,
        });
      } else if (debtHealth.emiBurdenPct >= 25) {
        candidateActions.push({
          id: "debt_moderate",
          category: "debt",
          categoryLabel: "💳 Debt Optimization",
          priorityLevel: "HIGH",
          priorityScore: 78,
          timeframe: "thisMonth",
          icon: "💳",
          title: "Optimize Amortization & Avoid New Debt",
          currentSituation: `${debtHealth.emiBurdenPct}% DTI Ratio (₹${totalOutstanding.toLocaleString("en-IN")} Outstanding)`,
          target: "DTI < 20% Healthy Benchmark",
          progressPct: 65,
          whyItMatters: "Moderate debt is manageable, but making 1 extra EMI payment per year significantly cuts total interest tenure.",
          recommendedAction: "Simulate annual 1-EMI prepayments to shorten loan tenure by years.",
          actionLabel: "Simulate Prepayment",
          actionRoute: "/loans",
          aiPrompt: `How much interest and tenure can I save by making 1 extra EMI prepayment per year on my active loans?`,
        });
      }
    }

    // --- CATEGORY 3: GOAL PACING & MILESTONE TIMELINES ---
    const behindGoals = goalList.filter((g) => g.isBehind);
    if (behindGoals.length > 0) {
      const topBehind = behindGoals[0];
      candidateActions.push({
        id: `goal_behind_${topBehind.id}`,
        category: "goals",
        categoryLabel: "🎯 Goal Progress",
        priorityLevel: "HIGH",
        priorityScore: 84,
        timeframe: "thisMonth",
        icon: "🎯",
        title: `Recalibrate Milestone: ${topBehind.title}`,
        currentSituation: `Saving ₹${topBehind.currentContribution.toLocaleString("en-IN")}/mo (Req: ₹${topBehind.requiredMonthlyContribution.toLocaleString("en-IN")}/mo)`,
        target: `₹${topBehind.targetAmount.toLocaleString("en-IN")} Target`,
        progressPct: topBehind.progressPct,
        whyItMatters: `A pacing deficit of ₹${topBehind.pacingGap.toLocaleString("en-IN")}/mo risks missing your scheduled milestone deadline.`,
        recommendedAction: `Increase monthly goal SIP by ₹${topBehind.pacingGap.toLocaleString("en-IN")}/mo or extend target timeline.`,
        actionLabel: "Review Goal Pacing",
        actionRoute: "/goals",
        aiPrompt: `My goal "${topBehind.title}" requires ₹${topBehind.requiredMonthlyContribution.toLocaleString("en-IN")}/month but I am currently allocating ₹${topBehind.currentContribution.toLocaleString("en-IN")}/month. How can I adjust my budget to stay on track?`,
      });
    } else if (goals.length === 0) {
      candidateActions.push({
        id: "create_milestones",
        category: "goals",
        categoryLabel: "🎯 Goal Progress",
        priorityLevel: "MEDIUM",
        priorityScore: 72,
        timeframe: "thisMonth",
        icon: "🎯",
        title: "Establish Key Financial Milestones",
        currentSituation: "0 Tracked Milestone Goals",
        target: "Define 2–3 Core Life Goals (House, Retirement, Education)",
        progressPct: 0,
        whyItMatters: "Investing without defined goal timelines leads to mismatched asset allocations and premature liquidation.",
        recommendedAction: "Create your primary long-term financial milestones with target amounts and dates.",
        actionLabel: "Create First Goal",
        actionRoute: "/goals",
        aiPrompt: "What are the most essential financial goals I should set up based on my age and income?",
      });
    }

    // --- CATEGORY 4: PORTFOLIO HEALTH & DIVERSIFICATION ---
    const dominantPct = Math.max(portfolio.equityPct || 0, portfolio.debtPct || 0, portfolio.goldPct || 0);
    if (assets.length === 0) {
      candidateActions.push({
        id: "seed_wealth_vault",
        category: "portfolio",
        categoryLabel: "📊 Portfolio Health",
        priorityLevel: "MEDIUM",
        priorityScore: 70,
        timeframe: "thisMonth",
        icon: "📊",
        title: "Consolidate Holdings in Wealth Vault",
        currentSituation: "Wealth Vault holds 0 tracked assets",
        target: "Track all existing mutual funds, stocks, and FDs",
        progressPct: 0,
        whyItMatters: "An unseeded Wealth Vault prevents automated portfolio overconcentration audits and net worth trajectory forecasting.",
        recommendedAction: "Log your investment holdings to unlock real-time asset allocation tracking.",
        actionLabel: "Add First Asset",
        actionRoute: "/wealth-vault",
        aiPrompt: "How should I structure and track my investment portfolio across stocks, mutual funds, and fixed deposits?",
      });
    } else if (dominantPct >= 65 && assets.length > 1) {
      const dominantName = portfolio.equityPct >= 65 ? "Equity" : portfolio.debtPct >= 65 ? "Fixed Income" : "Gold";
      candidateActions.push({
        id: "rebalance_concentration",
        category: "portfolio",
        categoryLabel: "📊 Portfolio Health",
        priorityLevel: "HIGH",
        priorityScore: 82,
        timeframe: "next3Months",
        icon: "⚖️",
        title: `Rebalance High ${dominantName} Concentration`,
        currentSituation: `${dominantPct}% allocated to ${dominantName} (Concentration Warning)`,
        target: "Diversified Multi-Asset Spread (<65% single class)",
        progressPct: Math.round((1 - (dominantPct - 65) / 35) * 100),
        whyItMatters: `A ${dominantPct}% overconcentration in ${dominantName} exposes your entire net worth to deep drawdown volatility during single-asset cycle corrections.`,
        recommendedAction: "Direct future monthly surplus into complementary asset classes (Debt/Gold/Cash) to restore asset harmony.",
        actionLabel: "Inspect Wealth Vault",
        actionRoute: "/wealth-vault",
        aiPrompt: `My portfolio has ${dominantPct}% concentrated in ${dominantName}. How can I rebalance into debt and sovereign gold without triggering high capital gains taxes?`,
      });
    }

    // --- CATEGORY 5: GROWTH & SYSTEMATIC INVESTING ---
    const userIsFoundationReady = emgMonths >= 3 && debtHealth.emiBurdenPct <= 40;
    if (userIsFoundationReady && savingsMetrics.monthlySurplus >= 5000) {
      candidateActions.push({
        id: "scale_systematic_sip",
        category: "growth",
        categoryLabel: "📈 Growth & Investing",
        priorityLevel: "OPPORTUNITY",
        priorityScore: 76,
        timeframe: "thisMonth",
        icon: "🌱",
        title: "Automate Monthly Systematic SIP",
        currentSituation: `₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo Net Cashflow Surplus Available`,
        target: "Disciplined Monthly Compounding",
        progressPct: Math.min(100, Math.round((savingsMetrics.savingsRate / 40) * 100)),
        whyItMatters: "Automated SIPs enforce financial discipline and utilize rupee-cost-averaging during market volatility.",
        recommendedAction: `Deploy ₹${Math.min(savingsMetrics.monthlySurplus, 10000).toLocaleString("en-IN")}/mo into diversified broad-market Direct-Growth mutual funds.`,
        actionLabel: "Simulate SIP Growth",
        actionRoute: "/calculators/sip",
        aiPrompt: `I have ₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")} monthly surplus and a stable emergency buffer. What mutual fund SIP strategy fits my Risk DNA?`,
      });

      candidateActions.push({
        id: "annual_step_up_plan",
        category: "growth",
        categoryLabel: "📈 Growth & Investing",
        priorityLevel: "OPPORTUNITY",
        priorityScore: 68,
        timeframe: "next6To12Months",
        icon: "⏳",
        title: "Implement +10% Annual Step-Up Compounding",
        currentSituation: "Standard Fixed SIP",
        target: "+10% Annual Compounding Accelerator",
        progressPct: 50,
        whyItMatters: "Stepping up your monthly SIP by just 10% annually with salary increments cuts your wealth freedom timeline nearly in half.",
        recommendedAction: "Simulate the multi-decade difference between a static SIP and an optimized Step-Up SIP in Future You.",
        actionLabel: "Simulate Step-Up Path",
        actionRoute: "/future-you",
        aiPrompt: "How much faster will I reach financial freedom by increasing my SIP by 10% each year?",
      });
    }

    // Sort all candidate actions by priorityScore descending
    candidateActions.sort((a, b) => b.priorityScore - a.priorityScore);

    // 5. Extract Top Priority Action
    const topPriority = candidateActions.length > 0 ? candidateActions[0] : {
      id: "maintain_momentum",
      priorityLevel: "POSITIVE",
      priorityScore: 90,
      icon: "✅",
      title: "Maintain Financial Momentum",
      currentSituation: "Healthy Balance Sheet",
      target: "Continue disciplined monthly compounding",
      progressPct: 100,
      whyItMatters: "Your balance sheet pillars are operating at institutional strength.",
      recommendedAction: "Continue regular contributions and conduct quarterly health reviews.",
      actionLabel: "Inspect Dashboard",
      actionRoute: "/dashboard",
      aiPrompt: "How can I further optimize my mature portfolio for tax efficiency?",
    };

    // 6. Partition Actions into 4 Timeline Horizons
    const timeline = {
      thisWeek: candidateActions.filter((a) => a.timeframe === "thisWeek"),
      thisMonth: candidateActions.filter((a) => a.timeframe === "thisMonth"),
      next3Months: candidateActions.filter((a) => a.timeframe === "next3Months"),
      next6To12Months: candidateActions.filter((a) => a.timeframe === "next6To12Months"),
    };

    // If a timeline bucket is empty, fill with standard stage guidance
    if (timeline.thisWeek.length === 0 && candidateActions.length > 0) {
      timeline.thisWeek.push(candidateActions[0]);
    }
    if (timeline.thisMonth.length === 0 && candidateActions.length > 1) {
      timeline.thisMonth.push(candidateActions[1]);
    }
    if (timeline.next3Months.length === 0 && candidateActions.length > 2) {
      timeline.next3Months.push(candidateActions[2]);
    }

    // 7. Financial Action Map Status Overview
    const actionMap = {
      protection: {
        label: "Protection",
        status: emgMonths >= 6 ? "Fortified" : emgMonths >= 3 ? "Building" : "Needs Attention",
        score: pillarScores.emergencyScore,
        badge: emgMonths >= 6 ? "badge-green" : emgMonths >= 3 ? "badge-amber" : "badge-rose",
      },
      debt: {
        label: "Debt Health",
        status: debtHealth.loansCount === 0 ? "Debt-Free" : debtHealth.emiBurdenPct <= 20 ? "Healthy" : debtHealth.emiBurdenPct <= 40 ? "Watch" : "High Burden",
        score: pillarScores.debtScore,
        badge: debtHealth.emiBurdenPct <= 20 ? "badge-green" : debtHealth.emiBurdenPct <= 40 ? "badge-amber" : "badge-rose",
      },
      goals: {
        label: "Goals Pacing",
        status: goals.length === 0 ? "Unseeded" : behindGoals.length === 0 ? "100% On Track" : `${behindGoals.length} Behind Pace`,
        score: pillarScores.goalsScore,
        badge: behindGoals.length === 0 && goals.length > 0 ? "badge-green" : goals.length === 0 ? "badge-blue" : "badge-amber",
      },
      portfolio: {
        label: "Portfolio",
        status: assets.length === 0 ? "Unseeded" : dominantPct < 65 ? "Diversified" : "Concentrated",
        score: pillarScores.portfolioScore,
        badge: dominantPct < 65 && assets.length > 0 ? "badge-green" : assets.length === 0 ? "badge-blue" : "badge-rose",
      },
      growth: {
        label: "Growth Readiness",
        status: userIsFoundationReady ? "Ready to Compound" : "Foundation First",
        score: userIsFoundationReady ? 85 : 40,
        badge: userIsFoundationReady ? "badge-teal" : "badge-amber",
      },
    };

    // 8. Dynamic Growth & Diversification Section
    const growthOpportunity = {
      isReady: userIsFoundationReady,
      headline: userIsFoundationReady ? "🌱 High Compounding Capacity" : "🛡️ Fortify Foundation First",
      description: userIsFoundationReady
        ? `Your liquid reserves (${emgMonths} mos) and cashflow surplus (₹${savingsMetrics.monthlySurplus.toLocaleString("en-IN")}/mo) indicate strong financial readiness to expand systematic investments.`
        : `Your emergency liquid buffer is at ${emgMonths} months. We recommend fortifying emergency reserves before taking substantial equity volatility risk.`,
      actionLabel: userIsFoundationReady ? "Explore SIPs & Mutual Funds" : "Fortify Emergency Buffer",
      actionRoute: userIsFoundationReady ? "/investments/sip" : "/my-next-money",
    };

    // 9. Smart ₹10,000 Allocation Plan
    const userContext = {
      income,
      expenses,
      surplus: savingsMetrics.monthlySurplus,
      savingsRate: savingsMetrics.savingsRate,
      emergencyMonths: emgMonths,
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
      netWorth: portfolio.totalPortfolio - totalOutstanding,
    };

    const smartAllocation = generateDynamicSurplusPlan(10000, userContext);

    return sendSuccess(res, {
      isUncalibrated: false,
      financialStage,
      pillarScores,
      actionMap,
      topPriority,
      timeline,
      allActions: candidateActions,
      growthOpportunity,
      smartAllocation,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getActionPlan,
};
