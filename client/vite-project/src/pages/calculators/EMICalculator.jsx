import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../utils/apiClient";
import "./CalculatorPages.css";

export const EMICalculator = () => {
  const [principalAmount, setPrincipalAmount] = useState(2500000);
  const [annualInterestRate, setAnnualInterestRate] = useState(8.75);
  const [tenureYears, setTenureYears] = useState(20);
  const [serverResult, setServerResult] = useState(null);

  // Client-side live calculation
  const clientResult = useMemo(() => {
    const P = Number(principalAmount) || 0;
    const rate = Number(annualInterestRate) || 0;
    const years = Number(tenureYears) || 1;
    const n = years * 12;

    if (P === 0) {
      return {
        principal: 0,
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

    if (rate === 0) {
      monthlyEMI = Math.round(P / n);
      totalRepayment = P;
      totalInterest = 0;
    } else {
      const r = rate / 12 / 100;
      const factor = Math.pow(1 + r, n);
      monthlyEMI = Math.round((P * r * factor) / (factor - 1));
      totalRepayment = Math.round(monthlyEMI * n);
      totalInterest = Math.max(0, totalRepayment - P);
    }

    const interestRatio = totalRepayment > 0
      ? Number(((totalInterest / totalRepayment) * 100).toFixed(1))
      : 0;

    const standardYears = [5, 10, 15, 20, 25, 30];
    const tenureComparison = standardYears.map((y) => {
      const m = y * 12;
      let emi = 0;
      let rep = 0;
      let interest = 0;

      if (rate === 0) {
        emi = Math.round(P / m);
        rep = P;
        interest = 0;
      } else {
        const r = rate / 12 / 100;
        const f = Math.pow(1 + r, m);
        emi = Math.round((P * r * f) / (f - 1));
        rep = Math.round(emi * m);
        interest = Math.max(0, rep - P);
      }

      return {
        years: y,
        months: m,
        monthlyEMI: emi,
        totalInterest: interest,
        totalRepayment: rep,
      };
    });

    return {
      principal: P,
      monthlyEMI,
      totalInterest,
      totalRepayment,
      interestRatio,
      tenureComparison,
    };
  }, [principalAmount, annualInterestRate, tenureYears]);

  // Sync with backend API
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const res = await api.post("/api/calculators/emi", {
          principalAmount,
          annualInterestRate,
          tenureMonths: tenureYears * 12,
        });
        if (res && res.data) {
          setServerResult(res.data);
        }
      } catch (err) {
        console.error("Backend calculation sync:", err);
      }
    };
    const timer = setTimeout(syncWithBackend, 200);
    return () => clearTimeout(timer);
  }, [principalAmount, annualInterestRate, tenureYears]);

  const activeResult = serverResult || clientResult;
  const principalPct = activeResult.totalRepayment > 0
    ? Math.round((activeResult.principal / activeResult.totalRepayment) * 100)
    : 100;
  const interestPct = 100 - principalPct;

  return (
    <AppLayout disclaimerVariant="loans">
      <div className="calculator-view">
        {/* Header */}
        <div className="calc-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>LOAN REPAYMENT MODELING</span>
            </div>
            <h1 className="calc-title">Loan EMI Calculator</h1>
            <p className="calc-sub">
              Calculate exact monthly installments, total interest expenditure, and evaluate multi-tenure schedules across home, vehicle, or personal credit.
            </p>
          </div>
          <div className="calc-presets-row">
            <Link to="/loans" className="btn btn-secondary">
              Track Active Loans &rarr;
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="calc-layout-grid">
          {/* Left: Input Form */}
          <div className="calc-form-card glass-panel">
            {/* Principal Amount */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Loan Amount (Principal)</label>
                <span className="calc-unit-pill">
                  ₹{Number(principalAmount).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="50000"
                max="20000000"
                step="50000"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                step="10000"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[500000, 1500000, 2500000, 5000000, 10000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`calc-preset-btn ${principalAmount === amt ? "active" : ""}`}
                    onClick={() => setPrincipalAmount(amt)}
                  >
                    ₹{(amt / 100000).toFixed(0)}L
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Annual Interest Rate (% p.a.)</label>
                <span className="calc-unit-pill">{annualInterestRate}%</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="4"
                max="24"
                step="0.25"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="50"
                step="0.05"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[8.5, 9.0, 10.5, 12.0, 14.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`calc-preset-btn ${annualInterestRate === rate ? "active" : ""}`}
                    onClick={() => setAnnualInterestRate(rate)}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Tenure Years */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Loan Tenure</label>
                <span className="calc-unit-pill">{tenureYears} Years ({tenureYears * 12} Mos)</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="1"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="40"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[3, 5, 10, 15, 20, 25, 30].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`calc-preset-btn ${tenureYears === yr ? "active" : ""}`}
                    onClick={() => setTenureYears(yr)}
                  >
                    {yr} Yrs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="calc-results-card glass-panel">
            <div className="results-hero-strip">
              <div>
                <span className="hero-label">Monthly Loan Installment</span>
                <div className="hero-val currency text-rose">
                  ₹{Number(activeResult.monthlyEMI || 0).toLocaleString("en-IN")}/mo
                </div>
              </div>
              <Link to="/loans" className="btn btn-primary">
                + Add to Active Loans
              </Link>
            </div>

            {/* 3 Metrics */}
            <div className="calc-metrics-3col">
              <div className="calc-stat-box">
                <span className="stat-box-label">Principal Borrowed</span>
                <span className="stat-box-val currency">
                  ₹{Number(activeResult.principal || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Total Interest Outflow</span>
                <span className="stat-box-val currency text-rose">
                  ₹{Number(activeResult.totalInterest || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Total Overall Repayment</span>
                <span className="stat-box-val currency font-bold">
                  ₹{Number(activeResult.totalRepayment || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Principal vs Interest Ratio Bar */}
            <div className="calc-ratio-box">
              <div className="ratio-label-row">
                <span className="text-secondary">Principal ({principalPct}%)</span>
                <span className="text-rose">Interest Overhead ({interestPct}%)</span>
              </div>
              <div className="ratio-track">
                <div
                  className="ratio-segment-invested"
                  style={{ width: `${principalPct}%` }}
                />
                <div
                  className="ratio-segment-interest"
                  style={{ width: `${interestPct}%` }}
                />
              </div>
            </div>

            {/* Tenure Comparison Table */}
            <div className="section-card glass-panel" style={{ padding: "16px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>
                📊 Tenure Options Comparison
              </h4>
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Tenure</th>
                      <th className="text-right">Monthly EMI</th>
                      <th className="text-right">Total Interest</th>
                      <th className="text-right">Total Repayment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeResult.tenureComparison || []).map((row) => (
                      <tr
                        key={row.years}
                        style={row.years === tenureYears ? { background: "rgba(59, 130, 246, 0.15)" } : {}}
                      >
                        <td>
                          {row.years} Years {row.years === tenureYears ? "(Selected)" : ""}
                        </td>
                        <td className="text-right currency font-bold">
                          ₹{Number(row.monthlyEMI).toLocaleString("en-IN")}
                        </td>
                        <td className="text-right currency text-rose">
                          ₹{Number(row.totalInterest).toLocaleString("en-IN")}
                        </td>
                        <td className="text-right currency">
                          ₹{Number(row.totalRepayment).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Required Disclaimers */}
            <div className="calc-disclaimer-box">
              <p>⚖️ <strong>Illustrative calculation only:</strong> Actual returns and repayment schedules are not guaranteed.</p>
              <p style={{ marginTop: "4px" }}>
                ℹ️ <strong>Estimates only:</strong> Actual interest rates, processing fees, loan eligibility, and loan covenants should be verified directly with the lending institution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default EMICalculator;
