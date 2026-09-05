import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../utils/apiClient";
import "./CalculatorPages.css";

export const SIPCalculator = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState(10000);
  const [annualRate, setAnnualRate] = useState(12);
  const [tenureYears, setTenureYears] = useState(10);
  const [serverResult, setServerResult] = useState(null);

  // Client-side live calculation for instantaneous feedback
  const clientResult = useMemo(() => {
    const P = Number(monthlyInvestment) || 0;
    const rate = Number(annualRate) || 0;
    const years = Number(tenureYears) || 1;
    const n = years * 12;
    const totalInvested = P * n;

    if (rate === 0) {
      return {
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
      totalInvested,
      estimatedReturns,
      futureValue,
    };
  }, [monthlyInvestment, annualRate, tenureYears]);

  // Sync with backend API
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const res = await api.post("/api/calculators/sip", {
          monthlyInvestment,
          annualRate,
          tenureYears,
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
  }, [monthlyInvestment, annualRate, tenureYears]);

  const activeResult = serverResult || clientResult;
  const investedPct = activeResult.futureValue > 0
    ? Math.round((activeResult.totalInvested / activeResult.futureValue) * 100)
    : 100;
  const returnsPct = 100 - investedPct;

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="calculator-view">
        {/* Header */}
        <div className="calc-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>COMPOUND WEALTH SIMULATOR</span>
            </div>
            <h1 className="calc-title">SIP Calculator</h1>
            <p className="calc-sub">
              Calculate the projected future maturity value of your disciplined monthly mutual fund systematic investment plan.
            </p>
          </div>
          <div className="calc-presets-row">
            <Link to="/calculators/step-up-sip" className="btn btn-secondary">
              🚀 Try Step-Up SIP &rarr;
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="calc-layout-grid">
          {/* Left: Input Form */}
          <div className="calc-form-card glass-panel">
            {/* Monthly Investment */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Monthly Investment Amount</label>
                <span className="calc-unit-pill">₹{Number(monthlyInvestment).toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="500"
                max="200000"
                step="500"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                step="500"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`calc-preset-btn ${monthlyInvestment === amt ? "active" : ""}`}
                    onClick={() => setMonthlyInvestment(amt)}
                  >
                    ₹{(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Annual Return Rate */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Expected Return Rate (p.a.)</label>
                <span className="calc-unit-pill">{annualRate}%</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="0.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[8, 10, 12, 15, 18].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`calc-preset-btn ${annualRate === rate ? "active" : ""}`}
                    onClick={() => setAnnualRate(rate)}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Time Period */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Investment Horizon</label>
                <span className="calc-unit-pill">{tenureYears} Years</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="35"
                step="1"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="50"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[3, 5, 10, 15, 20, 25].map((yr) => (
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
                <span className="hero-label">Projected Maturity Corpus</span>
                <div className="hero-val currency text-teal">
                  ₹{Number(activeResult.futureValue || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <Link to="/wealth-vault" className="btn btn-primary">
                + Track in Vault
              </Link>
            </div>

            {/* 3 Metric Boxes */}
            <div className="calc-metrics-3col">
              <div className="calc-stat-box">
                <span className="stat-box-label">Total Principal Invested</span>
                <span className="stat-box-val currency text-cyan">
                  ₹{Number(activeResult.totalInvested || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Estimated Wealth Gain</span>
                <span className="stat-box-val currency text-teal">
                  ₹{Number(activeResult.estimatedReturns || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Wealth Multiplier</span>
                <span className="stat-box-val font-bold">
                  {activeResult.totalInvested > 0
                    ? (activeResult.futureValue / activeResult.totalInvested).toFixed(2)
                    : 1}x
                </span>
              </div>
            </div>

            {/* Ratio Bar */}
            <div className="calc-ratio-box">
              <div className="ratio-label-row">
                <span className="text-cyan">Principal ({investedPct}%)</span>
                <span className="text-teal">Returns ({returnsPct}%)</span>
              </div>
              <div className="ratio-track">
                <div
                  className="ratio-segment-invested"
                  style={{ width: `${investedPct}%` }}
                />
                <div
                  className="ratio-segment-returns"
                  style={{ width: `${returnsPct}%` }}
                />
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="calc-disclaimer-box">
              ⚖️ <strong>Statutory Disclaimer:</strong> Illustrative calculation only. Actual returns are not guaranteed and are subject to market risks.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SIPCalculator;
