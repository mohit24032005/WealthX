/**
 * Goal Target Target Calculator Utility
 * Computes exact monthly contribution needed to reach a target goal amount
 * factoring in current savings compounding and future SIP installments.
 */

const calculateGoalTarget = (
  targetAmount,
  currentSavings = 0,
  timeMonths,
  expectedReturnRate = 12
) => {
  const target = Number(targetAmount);
  const savings = Number(currentSavings || 0);
  const n = Number(timeMonths);
  const rate = Number(expectedReturnRate);

  if (isNaN(target) || target <= 0) throw new Error("Target amount must be > 0.");
  if (isNaN(savings) || savings < 0) throw new Error("Current savings must be >= 0.");
  if (isNaN(n) || n <= 0) throw new Error("Time in months must be > 0.");
  if (isNaN(rate) || rate < 0) throw new Error("Expected return rate must be >= 0.");

  const r = rate / 12 / 100;

  // Future value of existing lump sum savings
  let currentSavingsFutureValue = savings;
  if (r > 0) {
    currentSavingsFutureValue = Math.round(savings * Math.pow(1 + r, n));
  }

  // Shortfall that needs to be met through recurring monthly contributions
  const shortfall = Math.max(0, target - currentSavingsFutureValue);

  let requiredMonthlyContribution = 0;

  if (shortfall > 0) {
    if (r === 0) {
      requiredMonthlyContribution = Math.ceil(shortfall / n);
    } else {
      // Solve SIP annuity formula for P:
      // Shortfall = P * [((1+r)^n - 1) / r] * (1+r)
      // P = Shortfall * r / [ ((1+r)^n - 1) * (1+r) ]
      const compoundFactor = Math.pow(1 + r, n);
      const denominator = (compoundFactor - 1) * (1 + r);
      requiredMonthlyContribution = Math.ceil((shortfall * r) / denominator);
    }
  }

  const totalSIPInvested = requiredMonthlyContribution * n;
  const totalContribution = savings + totalSIPInvested;

  let sipProjectedFV = 0;
  if (requiredMonthlyContribution > 0) {
    if (r === 0) {
      sipProjectedFV = totalSIPInvested;
    } else {
      const compoundFactor = Math.pow(1 + r, n);
      sipProjectedFV = Math.round(
        requiredMonthlyContribution * ((compoundFactor - 1) / r) * (1 + r)
      );
    }
  }

  const projectedFutureValue = currentSavingsFutureValue + sipProjectedFV;
  const estimatedWealthGain = Math.max(0, projectedFutureValue - totalContribution);

  return {
    targetAmount: target,
    currentSavings: savings,
    timeMonths: n,
    timeYears: Number((n / 12).toFixed(1)),
    expectedReturnRate: rate,
    currentSavingsFutureValue,
    shortfall,
    requiredMonthlyContribution,
    totalSIPInvested,
    totalContribution,
    projectedFutureValue,
    estimatedWealthGain,
  };
};

module.exports = {
  calculateGoalTarget,
};
