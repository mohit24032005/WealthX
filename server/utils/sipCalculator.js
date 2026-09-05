/**
 * SIP Calculator Utility
 * Formula: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
 * where P = monthly investment, r = monthly interest rate (annualRate / 12 / 100), n = months
 */

const calculateSIP = (monthlyInvestment, annualRate, tenureYears) => {
  const P = Number(monthlyInvestment);
  const rate = Number(annualRate);
  const years = Number(tenureYears);

  if (isNaN(P) || P < 0) throw new Error("Monthly investment must be a non-negative number.");
  if (isNaN(rate) || rate < 0) throw new Error("Annual rate must be a non-negative number.");
  if (isNaN(years) || years <= 0) throw new Error("Tenure years must be greater than 0.");

  const n = Math.round(years * 12);
  const totalInvested = Math.round(P * n);

  if (rate === 0) {
    return {
      monthlyInvestment: P,
      annualRate: rate,
      tenureYears: years,
      tenureMonths: n,
      totalInvested,
      estimatedReturns: 0,
      futureValue: totalInvested,
    };
  }

  const r = rate / 12 / 100;
  const compoundFactor = Math.pow(1 + r, n);
  const futureValue = Math.round(P * ((compoundFactor - 1) / r) * (1 + r));
  const estimatedReturns = Math.max(0, futureValue - totalInvested);

  return {
    monthlyInvestment: P,
    annualRate: rate,
    tenureYears: years,
    tenureMonths: n,
    totalInvested,
    estimatedReturns,
    futureValue,
  };
};

module.exports = {
  calculateSIP,
};
