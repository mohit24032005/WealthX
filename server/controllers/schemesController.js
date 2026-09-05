const FinancialProfile = require("../models/FinancialProfile");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const INDIA_GOVT_SCHEMES = [
  {
    id: "ppf",
    name: "Public Provident Fund (PPF)",
    ministry: "Ministry of Finance, Govt of India",
    category: "Retirement & Tax Saving",
    interestRate: "7.1% p.a.",
    taxStatus: "Exempt-Exempt-Exempt (EEE)",
    taxSection: "Section 80C (Up to ₹1.5 Lakhs)",
    tenure: "15 Years (Extendable in 5-yr blocks)",
    minDeposit: "₹500 / year",
    maxDeposit: "₹1,50,000 / year",
    riskLevel: "Sovereign (Zero Credit Risk)",
    purpose: "Guaranteed, sovereign-backed long-term wealth accumulation and retirement buffer.",
    eligibility: "All resident Indian citizens. One account per individual.",
    officialUrl: "https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx",
    bestFor: ["wealth_creation", "retirement", "tax_saving"],
  },
  {
    id: "nps",
    name: "National Pension System (NPS Tier-1)",
    ministry: "PFRDA (Pension Fund Regulatory & Dev Authority)",
    category: "Retirement Pension",
    interestRate: "Market Linked (9% - 12% Historical)",
    taxStatus: "Partial EEE (60% Tax Free at 60)",
    taxSection: "Section 80CCD(1B) (Extra ₹50,000 deduction)",
    tenure: "Until Age 60",
    minDeposit: "₹1,000 / year",
    maxDeposit: "No upper limit",
    riskLevel: "Moderate (Choice of Equity / Debt Mix)",
    purpose: "Lowest cost pension structure worldwide with compounding across equity and debt funds.",
    eligibility: "Indian citizens aged 18 to 70 years.",
    officialUrl: "https://enps.nsdl.com",
    bestFor: ["retirement", "wealth_creation"],
  },
  {
    id: "ssy",
    name: "Sukanya Samriddhi Yojana (SSY)",
    ministry: "Ministry of Finance (Beti Bachao Beti Padhao)",
    category: "Girl Child Education & Marriage",
    interestRate: "8.2% p.a. (Highest Govt Small Savings Rate)",
    taxStatus: "Exempt-Exempt-Exempt (EEE)",
    taxSection: "Section 80C (Up to ₹1.5 Lakhs)",
    tenure: "21 Years from opening (Deposits for 15 years)",
    minDeposit: "₹250 / year",
    maxDeposit: "₹1,50,000 / year",
    riskLevel: "Sovereign (Zero Credit Risk)",
    purpose: "Dedicated government welfare scheme securing higher education and wedding corpus for girl children.",
    eligibility: "Parents / legal guardians of girl child below 10 years of age.",
    officialUrl: "https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samriddhi-Account.aspx",
    bestFor: ["education", "family", "child_wealth"],
  },
  {
    id: "sgb",
    name: "Sovereign Gold Bonds (SGB)",
    ministry: "Reserve Bank of India on behalf of GoI",
    category: "Gold Investment & Hedging",
    interestRate: "2.50% p.a. cash interest + Gold Capital Appreciation",
    taxStatus: "Zero Capital Gains Tax on maturity (8 Years)",
    taxSection: "Exempt from LTCG under Section 47",
    tenure: "8 Years (Exit option after 5th year)",
    minDeposit: "1 Gram of Gold",
    maxDeposit: "4 KG per individual per fiscal year",
    riskLevel: "Sovereign + Gold Market Price Movement",
    purpose: "Superior alternative to physical gold holding with guaranteed periodic interest payout.",
    eligibility: "Resident Indian individuals, HUFs, trusts, and universities.",
    officialUrl: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
    bestFor: ["wealth_creation", "hedge", "tax_saving"],
  },
  {
    id: "scss",
    name: "Senior Citizen Savings Scheme (SCSS)",
    ministry: "Ministry of Finance",
    category: "Senior Citizen Regular Income",
    interestRate: "8.2% p.a. (Quarterly Interest Payout)",
    taxStatus: "Interest Taxable as per slab",
    taxSection: "Section 80C Benefit on deposit",
    tenure: "5 Years (Extendable by 3 years)",
    minDeposit: "₹1,000",
    maxDeposit: "₹30,00,000",
    riskLevel: "Sovereign (Zero Credit Risk)",
    purpose: "Guaranteed quarterly income stream for post-retirement livelihood security.",
    eligibility: "Individuals aged 60+ (or 55+ for VRS retirees).",
    officialUrl: "https://www.indiapost.gov.in",
    bestFor: ["retirement", "regular_income"],
  },
  {
    id: "mssc",
    name: "Mahila Samman Savings Certificate (MSSC)",
    ministry: "Ministry of Finance",
    category: "Women Wealth Empowerment",
    interestRate: "7.5% p.a. (Quarterly Compounding)",
    taxStatus: "TDS Applicable as per slab",
    taxSection: "Standard interest income",
    tenure: "2 Years Fixed",
    minDeposit: "₹1,000",
    maxDeposit: "₹2,00,000",
    riskLevel: "Sovereign",
    purpose: "Short-term sovereign savings vehicle specifically designed for women and minor girls.",
    eligibility: "Any woman or guardian opening on behalf of a minor girl.",
    officialUrl: "https://www.indiapost.gov.in",
    bestFor: ["wealth_creation", "emergency_fund"],
  },
  {
    id: "apy",
    name: "Atal Pension Yojana (APY)",
    ministry: "PFRDA / Ministry of Finance",
    category: "Guaranteed Monthly Pension",
    interestRate: "Guaranteed Pension (₹1,000 to ₹5,000 / month)",
    taxStatus: "Taxable Pension at 60",
    taxSection: "Section 80CCD(1)",
    tenure: "Contribution till 60 years of age",
    minDeposit: "Starts from ₹42 / month",
    maxDeposit: "Based on entry age and pension slab",
    riskLevel: "Govt of India Guaranteed",
    purpose: "Universal pension safety net targeted towards unorganized sector workers and young earners.",
    eligibility: "Indian citizens aged 18 to 40 years having a savings bank account.",
    officialUrl: "https://www.npscra.nsdl.co.in/scheme-details.php",
    bestFor: ["retirement", "guaranteed_income"],
  },
];

/**
 * Get all schemes or matched recommendations based on profile
 */
const getSchemes = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await FinancialProfile.findOne({ userId });

    const matchedSchemes = INDIA_GOVT_SCHEMES.map((scheme) => {
      let isRecommended = false;
      let matchReason = "Available to all resident citizens.";

      if (scheme.id === "ppf" && (profile?.monthlyIncome || 0) > 30000) {
        isRecommended = true;
        matchReason = "Optimal for your tax optimization and risk-free long term compounding.";
      } else if (scheme.id === "nps" && (profile?.monthlyIncome || 0) > 50000) {
        isRecommended = true;
        matchReason = "Unlocks an exclusive additional ₹50,000 tax deduction under Section 80CCD(1B).";
      } else if (scheme.id === "sgb") {
        isRecommended = true;
        matchReason = "Provides gold exposure with zero LTCG tax at maturity and 2.5% annual cash interest.";
      }

      return {
        ...scheme,
        isRecommended,
        matchReason,
      };
    });

    return sendSuccess(res, {
      totalSchemes: INDIA_GOVT_SCHEMES.length,
      schemes: matchedSchemes,
      disclaimer: "WealthX Government Schemes Finder provides curated educational information. Eligibility criteria, interest rates, and tax exemptions should be verified directly with the official ministry or post office source.",
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getSchemes,
};
