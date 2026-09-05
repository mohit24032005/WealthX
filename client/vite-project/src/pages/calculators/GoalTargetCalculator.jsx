import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../utils/apiClient";
import "./CalculatorPages.css";

export const GoalTargetCalculator = () => {
  const [targetAmount, setTargetAmount] = useState(5000000);
  const [currentSavings, setCurrentSavings] = useState(200000);
  const [timeYears, setTimeYears] = useState(10);
  const [expectedReturnRate, setExpectedReturnRate] = useState(12);
  const [serverResult, setServerResult] = useState(null);

  // Client-side live calculation
  const clientResult = useMemo(() => {
    const target = Number(targetAmount) || 1;
    const savings = Number(currentSavings) || 0;
    const years = Number(timeYears) || 1;
    const n = years * 12;
    const rate = Number(expectedReturnRate) || 0;
    const r = rate / 12 / 100;

    let savingsFV = savings;
    if (r > 0) {
      savingsFV = Math.round(savings * Math.pow(1 + r, n));
    }

    const shortfall = Math.max(0, target - savingsFV);
    let requiredMonthly = 0;

    if (shortfall > 0) {
      if (r === 0) {
        requiredMonthly = Math.ceil(shortfall / n);
      } else {
        const factor = Math.pow(1 + r, n);
        const denominator = (factor - 1) * (1 + r);
        requiredMonthly = Math.ceil((shortfall * r) / denominator);
      }
    }

    const totalSIPInvested = requiredMonthly * n;
    const totalContribution = savings + totalSIPInvested;
    const projectedFV = savingsFV + (r > 0
      ? Math.round(requiredMonthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r))
      : totalSIPInvested);

    return {
      targetAmount: target,
      currentSavings: savings,
      timeYears: years,
      currentSavingsFutureValue: savingsFV,
      shortfall,
      requiredMonthlyContribution: requiredMonthly,
      totalSIPInvested,
      totalContribution,
      projectedFutureValue: projectedFV,
      estimatedWealthGain: Math.max(0, projectedFV - totalContribution),
    };
  }, [targetAmount, currentSavings, timeYears, expectedReturnRate]);

  // Sync with backend API
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const res = await api.post("/api/calculators/goal", {
          targetAmount,
          currentSavings,
          timeMonths: timeYears * 12,
          expectedReturnRate,
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
  }, [targetAmount, currentSavings, timeYears, expectedReturnRate]);

  const activeResult = serverResult || clientResult;

  return (
    <AppLayout disclaimerVariant="general">
      <div className="calculator-view">
        {/* Header */}
        <div className="calc-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>MILESTONE REVERSE-ENGINEERING</span>
            </div>
            <h1 className="calc-title">Goal Target Calculator</h1>
            <p className="calc-sub">
              Reverse-engineer the exact monthly savings commitment required to achieve your future financial aspirations.
            </p>
          </div>
          <div className="calc-presets-row">
            <Link to="/goals" className="btn btn-secondary">
              🎯 View Active Goals &rarr;
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="calc-layout-grid">
          {/* Left: Input Form */}
          <div className="calc-form-card glass-panel">
            {/* Target Goal Amount */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Target Goal Corpus</label>
                <span className="calc-unit-pill">
                  ₹{Number(targetAmount).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="100000"
                max="50000000"
                step="100000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                step="50000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[1000000, 2500000, 5000000, 10000000, 25000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={`calc-preset-btn ${targetAmount === amt ? "active" : ""}`}
                    onClick={() => setTargetAmount(amt)}
                  >
                    ₹{(amt / 100000).toFixed(0)}L
                  </button>
                ))}
              </div>
            </div>

            {/* Existing Savings */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Current Savings Earmarked (₹)</label>
                <span className="calc-unit-pill">
                  ₹{Number(currentSavings).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="0"
                max="5000000"
                step="50000"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                step="10000"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value))}
              />
            </div>

            {/* Horizon in Years */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Time to Reach Goal</label>
                <span className="calc-unit-pill">{timeYears} Years</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="1"
                value={timeYears}
                onChange={(e) => setTimeYears(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="40"
                value={timeYears}
                onChange={(e) => setTimeYears(Number(e.target.value))}
              />
            </div>

            {/* Expected Annual Rate */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Expected Annual Return (% p.a.)</label>
                <span className="calc-unit-pill">{expectedReturnRate}%</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="4"
                max="20"
                step="0.5"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="40"
                step="0.1"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="calc-results-card glass-panel">
            <div className="results-hero-strip">
              <div>
                <span className="hero-label">Required Monthly Savings</span>
                <div className="hero-val currency text-cyan">
                  ₹{Number(activeResult.requiredMonthlyContribution || 0).toLocaleString("en-IN")}/mo
                </div>
              </div>
              <Link to="/goals" className="btn btn-primary">
                + Create Live Goal
              </Link>
            </div>

            {/* 3 Metric Boxes */}
            <div className="calc-metrics-3col">
              <div className="calc-stat-box">
                <span className="stat-box-label">Existing Savings at Maturity</span>
                <span className="stat-box-val currency text-teal">
                  ₹{Number(activeResult.currentSavingsFutureValue || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Total Out-of-Pocket Outlay</span>
                <span className="stat-box-val currency">
                  ₹{Number(activeResult.totalContribution || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box">
                <span className="stat-box-label">Compounding Gain</span>
                <span className="stat-box-val currency text-teal">
                  ₹{Number(activeResult.estimatedWealthGain || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Target Breakdown Summary */}
            <div className="section-card glass-panel" style={{ padding: "18px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>📋 Milestone Execution Blueprint</h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                By allocating <strong>₹{Number(activeResult.requiredMonthlyContribution || 0).toLocaleString("en-IN")}</strong> each month for {timeYears} years at {expectedReturnRate}% return alongside your ₹{Number(currentSavings).toLocaleString("en-IN")} base, you will accumulate an estimated <strong>₹{Number(activeResult.projectedFutureValue || 0).toLocaleString("en-IN")}</strong>, fully securing your target milestone.
              </p>
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

export default GoalTargetCalculator;
