/**
 * Fixed Deposit (FD) Growth Calculator Utility
 * Supports Simple Interest and Compound Interest with configurable frequencies:
 * - monthly (12/year)
 * - quarterly (4/year - standard for Indian Banks)
 * - half_yearly (2/year)
 * - annually (1/year)
 */

const calculateFD = (
  principalDeposit,
  annualInterestRate,
  tenureYears,
  interestType = "compound",
  compoundingFrequency = "quarterly"
) => {
  const P = Number(principalDeposit);
  const rate = Number(annualInterestRate);
  const t = Number(tenureYears);

  if (isNaN(P) || P < 0) throw new Error("Principal deposit must be >= 0.");
  if (isNaN(rate) || rate < 0) throw new Error("Interest rate must be >= 0.");
  if (isNaN(t) || t <= 0) throw new Error("Tenure years must be > 0.");

  let maturityAmount = P;
  let interestEarned = 0;

  if (interestType === "simple") {
    interestEarned = Math.round((P * rate * t) / 100);
    maturityAmount = P + interestEarned;
  } else {
    // Compound interest
    let f = 4; // default quarterly compounding
    if (compoundingFrequency === "monthly") f = 12;
    else if (compoundingFrequency === "half_yearly") f = 2;
    else if (compoundingFrequency === "annually") f = 1;

    const r = rate / 100;
    const compoundFactor = Math.pow(1 + r / f, f * t);
    maturityAmount = Math.round(P * compoundFactor);
    interestEarned = Math.max(0, maturityAmount - P);
  }

  const effectiveYield = t > 0 && P > 0
    ? Number(((interestEarned / (P * t)) * 100).toFixed(2))
    : rate;

  return {
    principalDeposit: P,
    annualInterestRate: rate,
    tenureYears: t,
    interestType,
    compoundingFrequency,
    maturityAmount,
    interestEarned,
    effectiveYield,
  };
};

module.exports = {
  calculateFD,
};
