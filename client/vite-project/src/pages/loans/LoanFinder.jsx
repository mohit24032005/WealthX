import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import "./Loans.css";

const PURPOSE_BENCHMARKS = {
  home: {
    label: "Home Loan",
    icon: "🏠",
    defaultRate: 8.5,
    defaultTenure: 20,
    lenders: [
      { name: "Public Sector Major (SBI / PNB)", rate: 8.4, fee: "0.25% - 0.50%", highlight: "Lowest Benchmark Rates" },
      { name: "Premier Private Bank (HDFC / ICICI)", rate: 8.7, fee: "0.50% (Max ₹5,000)", highlight: "Fastest Processing" },
      { name: "Housing Finance Co (LIC HFL / Bajaj)", rate: 8.85, fee: "0.50% - 1.00%", highlight: "High LTV Approval" },
    ],
  },
  education: {
    label: "Education Loan",
    icon: "🎓",
    defaultRate: 9.5,
    defaultTenure: 8,
    lenders: [
      { name: "Public Sector (SBI Student Loan)", rate: 9.25, fee: "Nil for India", highlight: "Subsidized Interest Schemes" },
      { name: "Private Education Specialist (Avanse / Axis)", rate: 10.5, fee: "1.00% - 1.50%", highlight: "100% Overseas Financing" },
    ],
  },
  vehicle: {
    label: "Vehicle Loan",
    icon: "🚗",
    defaultRate: 8.85,
    defaultTenure: 5,
    lenders: [
      { name: "Leading Auto Financier (SBI / HDFC)", rate: 8.75, fee: "₹1,500 - ₹3,500", highlight: "Up to 90% On-Road" },
      { name: "Specialized Vehicle NBFC (Kotak / ICICI)", rate: 9.2, fee: "0.50%", highlight: "Instant Digital Sanction" },
    ],
  },
  personal: {
    label: "Personal Loan",
    icon: "💳",
    defaultRate: 11.5,
    defaultTenure: 3,
    lenders: [
      { name: "Tier 1 Private Bank (ICICI / HDFC)", rate: 10.75, fee: "1.00% - 2.00%", highlight: "No Collateral Required" },
      { name: "Digital Fintech Lender (Tata Capital / Bajaj)", rate: 12.5, fee: "2.00% - 3.00%", highlight: "Same-Day Disbursal" },
    ],
  },
  business: {
    label: "Business Credit / MSME",
    icon: "💼",
    defaultRate: 11.0,
    defaultTenure: 5,
    lenders: [
      { name: "MSME Scheme Partner (SBI CGTMSE)", rate: 9.75, fee: "0.50%", highlight: "Collateral-Free MSME Limit" },
      { name: "Private Enterprise Bank (Axis / Kotak)", rate: 11.5, fee: "1.50%", highlight: "Flexible Working Capital" },
    ],
  },
};

export const LoanFinder = () => {
  const [purpose, setPurpose] = useState("home");
  const [requiredAmount, setRequiredAmount] = useState(3000000);
  const [preferredTenure, setPreferredTenure] = useState(20);
  const [comfortableEMI, setComfortableEMI] = useState(30000);

  const benchmark = PURPOSE_BENCHMARKS[purpose] || PURPOSE_BENCHMARKS.home;

  const calculatedOptions = useMemo(() => {
    const P = Number(requiredAmount) || 0;
    const years = Number(preferredTenure) || 1;
    const n = years * 12;

    return benchmark.lenders.map((lender) => {
      const r = lender.rate / 12 / 100;
      const factor = Math.pow(1 + r, n);
      const emi = Math.round((P * r * factor) / (factor - 1));
      const totalRepayment = emi * n;
      const totalInterest = Math.max(0, totalRepayment - P);
      const isAffordable = emi <= Number(comfortableEMI);

      return {
        ...lender,
        monthlyEMI: emi,
        totalInterest,
        totalRepayment,
        isAffordable,
      };
    });
  }, [purpose, requiredAmount, preferredTenure, comfortableEMI, benchmark]);

  return (
    <AppLayout disclaimerVariant="loans">
      <div className="loans-view">
        {/* Header */}
        <div className="loans-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>MARKET LENDING EXPLORER</span>
            </div>
            <h1 className="loans-title">Loan Finder</h1>
            <p className="loans-sub">
              Explore illustrative market loan parameters across commercial lenders to evaluate budget alignment and monthly commitments.
            </p>
          </div>
          <div className="loans-top-actions">
            <Link to="/loans" className="btn btn-secondary">
              ← Loans Overview
            </Link>
            <Link to="/loans/compare" className="btn btn-secondary">
              ⚖️ Compare Loans
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="calc-layout-grid">
          {/* Inputs */}
          <div className="calc-form-card glass-panel">
            <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>Filter Loan Requirements</h3>

            {/* Loan Purpose */}
            <div className="calc-input-group">
              <label>Loan Purpose</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {Object.entries(PURPOSE_BENCHMARKS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Required Amount */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Required Borrowing (Principal)</label>
                <span className="calc-unit-pill">₹{Number(requiredAmount).toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="100000"
                max="20000000"
                step="50000"
                value={requiredAmount}
                onChange={(e) => setRequiredAmount(Number(e.target.value))}
              />
              <input
                type="number"
                min="10000"
                step="50000"
                value={requiredAmount}
                onChange={(e) => setRequiredAmount(Number(e.target.value))}
              />
            </div>

            {/* Preferred Tenure */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Preferred Tenure</label>
                <span className="calc-unit-pill">{preferredTenure} Years ({preferredTenure * 12} Mos)</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="1"
                value={preferredTenure}
                onChange={(e) => setPreferredTenure(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="35"
                value={preferredTenure}
                onChange={(e) => setPreferredTenure(Number(e.target.value))}
              />
            </div>

            {/* Comfortable Monthly EMI */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Target Monthly Budget (Comfortable EMI)</label>
                <span className="calc-unit-pill">₹{Number(comfortableEMI).toLocaleString("en-IN")}</span>
              </div>
              <input
                type="number"
                min="1000"
                step="1000"
                value={comfortableEMI}
                onChange={(e) => setComfortableEMI(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Results Table & Guidance */}
          <div className="calc-results-card glass-panel">
            <div className="section-card-header">
              <h3>
                {benchmark.icon} Illustrative Market Options for {benchmark.label}
              </h3>
              <span className="badge badge-blue">Benchmark Rates</span>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              Based on your borrowing requirement of <strong>₹{Number(requiredAmount).toLocaleString("en-IN")}</strong> over <strong>{preferredTenure} years</strong>, you may be able to explore options like:
            </p>

            <div className="loans-table-wrapper">
              <table className="loans-table">
                <thead>
                  <tr>
                    <th>Lender Category</th>
                    <th className="text-right">Indicative Rate</th>
                    <th className="text-right">Estimated EMI</th>
                    <th className="text-right">Total Interest</th>
                    <th>Processing Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedOptions.map((opt, i) => (
                    <tr key={i}>
                      <td>
                        <span className="font-bold text-primary block">{opt.name}</span>
                        <span className="badge badge-green" style={{ fontSize: "10.5px", marginTop: "2px" }}>
                          {opt.highlight}
                        </span>
                      </td>
                      <td className="text-right font-mono font-bold text-cyan">{opt.rate}% p.a.</td>
                      <td className="text-right currency font-bold text-rose">
                        ₹{Number(opt.monthlyEMI).toLocaleString("en-IN")}/mo
                        {opt.isAffordable ? (
                          <span className="text-teal block" style={{ fontSize: "11px" }}>✓ In Budget</span>
                        ) : (
                          <span className="text-amber block" style={{ fontSize: "11px" }}>⚠️ Exceeds Budget</span>
                        )}
                      </td>
                      <td className="text-right currency text-muted">
                        ₹{Number(opt.totalInterest).toLocaleString("en-IN")}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{opt.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clear Non-Guaranteed Disclaimers */}
            <div className="calc-disclaimer-box">
              <p>
                ⚖️ <strong>Exploratory Estimates:</strong> Quotes and rates are indicative benchmarks. WealthX does not endorse lenders or guarantee loan sanction.
              </p>
              <p style={{ marginTop: "4px" }}>
                ℹ️ <strong>CIBIL & Eligibility:</strong> Actual sanction amounts, interest margins, and processing covenants depend on credit score (CIBIL/Experian), income verification, and lender risk underwriting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default LoanFinder;
