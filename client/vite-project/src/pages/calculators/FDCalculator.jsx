import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../utils/apiClient";
import "./CalculatorPages.css";

export const FDCalculator = () => {
  const [principalDeposit, setPrincipalDeposit] = useState(100000);
  const [annualInterestRate, setAnnualInterestRate] = useState(7.25);
  const [tenureYears, setTenureYears] = useState(3);
  const [interestType, setInterestType] = useState("compound");
  const [compoundingFrequency, setCompoundingFrequency] = useState("quarterly");
  const [serverResult, setServerResult] = useState(null);

  // Client-side live calculation
  const clientResult = useMemo(() => {
    const P = Number(principalDeposit) || 0;
    const rate = Number(annualInterestRate) || 0;
    const t = Number(tenureYears) || 1;

    let maturityAmount = P;
    let interestEarned = 0;

    if (interestType === "simple") {
      interestEarned = Math.round((P * rate * t) / 100);
      maturityAmount = P + interestEarned;
    } else {
      let f = 4;
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
      maturityAmount,
      interestEarned,
      effectiveYield,
    };
  }, [principalDeposit, annualInterestRate, tenureYears, interestType, compoundingFrequency]);

  // Sync with backend API
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const res = await api.post("/api/calculators/fd", {
          principalDeposit,
          annualInterestRate,
          tenureYears,
          interestType,
          compoundingFrequency,
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
  }, [principalDeposit, annualInterestRate, tenureYears, interestType, compoundingFrequency]);

  const activeResult = serverResult || clientResult;
  const principalPct = activeResult.maturityAmount > 0
    ? Math.round((activeResult.principalDeposit / activeResult.maturityAmount) * 100)
    : 100;
  const interestPct = 100 - principalPct;

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="calculator-view">
        {/* Header */}
        <div className="calc-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>GUARANTEED CAPITAL GROWTH</span>
            </div>
            <h1 className="calc-title">Fixed Deposit (FD) Calculator</h1>
            <p className="calc-sub">
              Model guaranteed maturity returns, interest payouts, and effective annual yields across commercial banks and scheduled NBFC term deposits.
            </p>
          </div>
          <div className="calc-presets-row">
            <Link to="/investments/fd" className="btn btn-secondary">
              📖 FD Guide & Tax Rules &rarr;
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
                <label>Total Deposit Amount</label>
                <span className="calc-unit-pill">
                  ₹{Number(principalDeposit).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="10000"
                max="5000000"
                step="10000"
                value={principalDeposit}
                onChange={(e) => setPrincipalDeposit(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                step="10000"
                value={principalDeposit}
                onChange={(e) => setPrincipalDeposit(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[50000, 100000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`calc-preset-btn ${principalDeposit === amt ? "active" : ""}`}
                    onClick={() => setPrincipalDeposit(amt)}
                  >
                    ₹{(amt / 1000).toFixed(0)}k
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
                min="3"
                max="12"
                step="0.1"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="25"
                step="0.05"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
              />
            </div>

            {/* Tenure Years */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Deposit Tenure</label>
                <span className="calc-unit-pill">{tenureYears} Years</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="10"
                step="1"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="20"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
            </div>

            {/* Compounding Frequency */}
            <div className="calc-input-group">
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                Compounding Frequency
              </label>
              <select
                value={compoundingFrequency}
                onChange={(e) => setCompoundingFrequency(e.target.value)}
              >
                <option value="quarterly">Quarterly Compounding (Standard Indian Banks)</option>
                <option value="monthly">Monthly Compounding</option>
                <option value="half_yearly">Half-Yearly Compounding</option>
                <option value="annually">Annual Compounding</option>
              </select>
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="calc-results-card glass-panel">
            <div className="results-hero-strip">
              <div>
                <span className="hero-label">Guaranteed Maturity Amount</span>
                <div className="hero-val currency text-teal">
                  ₹{Number(activeResult.maturityAmount || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <Link to="/wealth-vault" className="btn btn-primary">
                + Track in Vault
              </Link>
            </div>

            {/* 3 Stat Boxes */}
            <div className="calc-metrics-3col">
              <div className="calc-stat-box">
                <span className="stat-box-label">Principal Deposit</span>
                <span className="stat-box-val currency">
                  ₹{Number(activeResult.principalDeposit || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Total Interest Earned</span>
                <span className="stat-box-val currency text-teal">
                  ₹{Number(activeResult.interestEarned || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Effective Annual Yield</span>
                <span className="stat-box-val text-cyan font-bold">
                  {activeResult.effectiveYield || annualInterestRate}%
                </span>
              </div>
            </div>

            {/* Ratio Bar */}
            <div className="calc-ratio-box">
              <div className="ratio-label-row">
                <span className="text-cyan">Principal ({principalPct}%)</span>
                <span className="text-teal">Interest Gain ({interestPct}%)</span>
              </div>
              <div className="ratio-track">
                <div
                  className="ratio-segment-invested"
                  style={{ width: `${principalPct}%` }}
                />
                <div
                  className="ratio-segment-returns"
                  style={{ width: `${interestPct}%` }}
                />
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="calc-disclaimer-box">
              ⚖️ <strong>Statutory Disclaimer:</strong> Illustrative calculation only. Actual returns are not guaranteed and are subject to bank terms, TDS deductions, and prevailing DICGC deposit guidelines.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FDCalculator;
