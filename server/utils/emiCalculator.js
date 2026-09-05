/**
 * Loan EMI Calculator Utility
 * Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * where P = principal, r = monthly interest rate (annualRate / 12 / 100), n = tenure in months
 */

const calculateEMI = (principalAmount, annualInterestRate, tenureMonths) => {
  const P = Number(principalAmount);
  const annualRate = Number(annualInterestRate);
  const n = Number(tenureMonths);

  if (isNaN(P) || P < 0) throw new Error("Principal amount must be a non-negative number.");
  if (isNaN(annualRate) || annualRate < 0) throw new Error("Interest rate must be a non-negative number.");
  if (isNaN(n) || n <= 0) throw new Error("Tenure months must be greater than 0.");

  if (P === 0) {
    return {
      principal: 0,
      annualInterestRate: annualRate,
      tenureMonths: n,
      monthlyEMI: 0,
      totalInterest: 0,
      totalRepayment: 0,
      interestRatio: 0,
      tenureComparison: [],
    };
  }

  let monthlyEMI = 0;
  let totalRepayment = 0;
  let totalInterest = 0;

  if (annualRate === 0) {
    monthlyEMI = Math.round(P / n);
    totalRepayment = P;
    totalInterest = 0;
  } else {
    const r = annualRate / 12 / 100;
    const factor = Math.pow(1 + r, n);
    monthlyEMI = Math.round((P * r * factor) / (factor - 1));
    totalRepayment = Math.round(monthlyEMI * n);
    totalInterest = Math.max(0, totalRepayment - P);
  }

  const interestRatio = totalRepayment > 0 ? Number(((totalInterest / totalRepayment) * 100).toFixed(1)) : 0;

  // Generate tenure comparison presets (e.g. 5, 10, 15, 20, 25, 30 years or relative months)
  const standardTenuresYears = [3, 5, 10, 15, 20, 25, 30];
  const tenureComparison = standardTenuresYears.map((years) => {
    const months = years * 12;
    let emi = 0;
    let rep = 0;
    let interest = 0;

    if (annualRate === 0) {
      emi = Math.round(P / months);
      rep = P;
      interest = 0;
    } else {
      const r = annualRate / 12 / 100;
      const f = Math.pow(1 + r, months);
      emi = Math.round((P * r * f) / (f - 1));
      rep = Math.round(emi * months);
      interest = Math.max(0, rep - P);
    }

    return {
      years,
      months,
      monthlyEMI: emi,
      totalInterest: interest,
      totalRepayment: rep,
    };
  });

  return {
    principal: P,
    annualInterestRate: annualRate,
    tenureMonths: n,
    monthlyEMI,
    totalInterest,
    totalRepayment,
    interestRatio,
    tenureComparison,
  };
};

module.exports = {
  calculateEMI,
};
