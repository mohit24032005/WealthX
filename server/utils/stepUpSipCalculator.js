const { calculateSIP } = require("./sipCalculator");

/**
 * Step-Up SIP Calculator Utility
 * Applies annual step-up percentage to the monthly contribution at the start of each year.
 * Compares standard regular SIP vs Step-Up SIP side-by-side.
 */

const calculateStepUpSIP = (initialMonthlyInvestment, annualRate, tenureYears, annualStepUpPct) => {
  const P = Number(initialMonthlyInvestment);
  const rate = Number(annualRate);
  const years = Number(tenureYears);
  const stepUp = Number(annualStepUpPct);

  if (isNaN(P) || P < 0) throw new Error("Initial monthly investment must be >= 0.");
  if (isNaN(rate) || rate < 0) throw new Error("Annual rate must be >= 0.");
  if (isNaN(years) || years <= 0) throw new Error("Tenure years must be > 0.");
  if (isNaN(stepUp) || stepUp < 0) throw new Error("Annual step-up percentage must be >= 0.");

  const standardSIP = calculateSIP(P, rate, years);

  const monthlyRate = rate / 12 / 100;
  const totalMonths = Math.round(years * 12);

  let accumulatedFV = 0;
  let totalInvested = 0;
  let currentMonthlySIP = P;
  const yearlyBreakdown = [];

  for (let y = 1; y <= years; y++) {
    let yearInvested = 0;

    for (let m = 1; m <= 12; m++) {
      totalInvested += currentMonthlySIP;
      yearInvested += currentMonthlySIP;

      // Compound existing portfolio by 1 month interest + add new contribution with 1 month interest
      accumulatedFV = (accumulatedFV + currentMonthlySIP) * (1 + monthlyRate);
    }

    yearlyBreakdown.push({
      year: y,
      monthlySIP: Math.round(currentMonthlySIP),
      yearlyInvested: Math.round(yearInvested),
      cumulativeInvested: Math.round(totalInvested),
      portfolioValue: Math.round(accumulatedFV),
    });

    // Step-up monthly investment for the following year
    currentMonthlySIP = currentMonthlySIP * (1 + stepUp / 100);
  }

  const finalFutureValue = Math.round(accumulatedFV);
  const estimatedReturns = Math.max(0, finalFutureValue - totalInvested);
  const extraWealthGenerated = Math.max(0, finalFutureValue - standardSIP.futureValue);
  const extraInvested = Math.max(0, totalInvested - standardSIP.totalInvested);

  return {
    initialMonthlyInvestment: P,
    annualRate: rate,
    tenureYears: years,
    annualStepUpPct: stepUp,
    standard: standardSIP,
    stepUp: {
      totalInvested,
      estimatedReturns,
      futureValue: finalFutureValue,
      extraWealthGenerated,
      extraInvested,
    },
    yearlyBreakdown,
  };
};

module.exports = {
  calculateStepUpSIP,
};
