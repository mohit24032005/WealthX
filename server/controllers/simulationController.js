const FinancialProfile = require("../models/FinancialProfile");
const Asset = require("../models/Asset");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Simulate Future You Trajectories: Current Baseline vs. WealthX Optimized
 */
const simulateFutureYou = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      monthlyInvestment,
      expectedReturnRate = 12,
      tenureYears = 20,
      annualStepUpPct = 10,
    } = req.body;

    const profile = await FinancialProfile.findOne({ userId });
    const assets = await Asset.find({ userId });

    let currentVaultTotal = Number(profile?.currentSavings || 0);
    assets.forEach((a) => { currentVaultTotal += Number(a.currentValue || 0); });

    const income = Number(profile?.monthlyIncome || 0);
    const expenses = Number(profile?.monthlyExpenses || 0);
    const defaultMonthly = Math.max(5000, income - expenses);

    const P = Number(monthlyInvestment) || defaultMonthly;
    const rate = Number(expectedReturnRate);
    const maxYears = Number(tenureYears) || 20;
    const stepUp = Number(annualStepUpPct) || 10;

    const monthlyRate = rate / 12 / 100;

    const timeline = [];
    const keyMilestones = [5, 10, 15, 20, 25, 30].filter((y) => y <= maxYears);
    if (!keyMilestones.includes(maxYears)) keyMilestones.push(maxYears);
    keyMilestones.sort((a, b) => a - b);

    let baselineCorpus = currentVaultTotal;
    let baselineInvested = currentVaultTotal;

    let optCorpus = currentVaultTotal;
    let optInvested = currentVaultTotal;
    let currentOptSIP = P;

    const currentPathMilestones = [];
    const optimizedPathMilestones = [];

    for (let y = 1; y <= maxYears; y++) {
      for (let m = 1; m <= 12; m++) {
        // Baseline: fixed P monthly
        baselineInvested += P;
        baselineCorpus = (baselineCorpus + P) * (1 + monthlyRate);

        // Optimized: stepped-up SIP monthly
        optInvested += currentOptSIP;
        optCorpus = (optCorpus + currentOptSIP) * (1 + monthlyRate);
      }

      currentOptSIP = currentOptSIP * (1 + stepUp / 100);

      timeline.push({
        year: y,
        baselineInvested: Math.round(baselineInvested),
        baselineCorpus: Math.round(baselineCorpus),
        optimizedInvested: Math.round(optInvested),
        optimizedCorpus: Math.round(optCorpus),
      });

      if (keyMilestones.includes(y)) {
        currentPathMilestones.push({
          year: y,
          value: Math.round(baselineCorpus),
          invested: Math.round(baselineInvested),
        });
        optimizedPathMilestones.push({
          year: y,
          value: Math.round(optCorpus),
          invested: Math.round(optInvested),
        });
      }
    }

    const finalBaseline = Math.round(baselineCorpus);
    const finalOptimized = Math.round(optCorpus);
    const extraWealthGenerated = Math.max(0, finalOptimized - finalBaseline);

    return sendSuccess(res, {
      inputs: {
        startingCorpus: currentVaultTotal,
        monthlyInvestment: P,
        expectedReturnRate: rate,
        tenureYears: maxYears,
        annualStepUpPct: stepUp,
      },
      summary: {
        finalBaselineCorpus: finalBaseline,
        finalOptimizedCorpus: finalOptimized,
        extraWealthGenerated,
        totalBaselineInvested: Math.round(baselineInvested),
        totalOptimizedInvested: Math.round(optInvested),
        multiplier: baselineInvested > 0 ? Number((finalOptimized / optInvested).toFixed(2)) : 1,
      },
      currentPathMilestones,
      optimizedPathMilestones,
      yearlyTimeline: timeline,
      disclaimer: "Projections are mathematical simulations based on compounding models. Actual market returns are non-linear, volatile, and not guaranteed.",
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  simulateFutureYou,
};
