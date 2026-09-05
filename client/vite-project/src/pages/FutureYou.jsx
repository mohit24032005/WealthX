import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout";
import ComparisonAreaChart from "../components/charts/ComparisonAreaChart";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./FutureYou.css";

export const FutureYou = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState(15000);
  const [expectedReturnRate, setExpectedReturnRate] = useState(12);
  const [tenureYears, setTenureYears] = useState(20);
  const [annualStepUpPct, setAnnualStepUpPct] = useState(10);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/simulations/future-you", {
        monthlyInvestment,
        expectedReturnRate,
        tenureYears,
        annualStepUpPct,
      });
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to run Future You simulation.");
      }
    } catch (err) {
      setError(err.message || "Simulation engine offline.");
    } finally {
      setLoading(false);
    }
  }, [monthlyInvestment, expectedReturnRate, tenureYears, annualStepUpPct]);

  useEffect(() => {
    runSimulation();
  }, []);

  const summary = data?.summary || {};
  const currentPath = data?.currentPathMilestones || [];
  const optimizedPath = data?.optimizedPathMilestones || [];

  const formatShortNumber = (num) => {
    if (!num) return "₹0";
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
    return `₹${Number(num).toLocaleString("en-IN")}`;
  };

  return (
    <AppLayout disclaimerVariant="general">
      <div className="future-you-view">
        {/* Header */}
        <div className="future-header">
          <div className="breadcrumb-pill">
            <span className="live-dot"></span>
            <span>MULTI-DECADE WEALTH TRAJECTORY FORECASTER</span>
          </div>
          <h1 className="future-title">Future You Simulator</h1>
          <p className="future-sub">
            Model the compound impact of disciplined annual step-up compounding versus static baseline behavior over 5 to 30 years.
          </p>
        </div>

        {/* 2-Column Layout: Controls on Left, Visual Chart on Right */}
        <div className="simulation-layout-grid">
          {/* Controls Panel */}
          <div className="sim-controls-card glass-panel">
            <h3 className="section-title">⚙️ Trajectory Parameters</h3>

            {/* Monthly Investment */}
            <div className="sim-control-group">
              <div className="sim-label-row">
                <span className="sim-label">Monthly Investment</span>
                <span className="sim-val font-mono text-cyan">₹{monthlyInvestment.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="200000"
                step="1000"
                value={monthlyInvestment}
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                className="sim-slider"
              />
              <div className="sim-quick-inputs">
                {[10000, 25000, 50000, 100000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`sim-mini-pill ${monthlyInvestment === v ? "active" : ""}`}
                    onClick={() => setMonthlyInvestment(v)}
                  >
                    ₹{v >= 100000 ? `${v / 100000}L` : `${v / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Return Rate */}
            <div className="sim-control-group">
              <div className="sim-label-row">
                <span className="sim-label">Expected Annual Return</span>
                <span className="sim-val font-mono text-teal">{expectedReturnRate}% p.a.</span>
              </div>
              <input
                type="range"
                min="6"
                max="18"
                step="0.5"
                value={expectedReturnRate}
                onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                className="sim-slider"
              />
              <span className="text-muted" style={{ fontSize: "11px" }}>
                12% represents historical Indian broad market equity (Nifty 50) long-term CAGR.
              </span>
            </div>

            {/* Duration Tenure */}
            <div className="sim-control-group">
              <div className="sim-label-row">
                <span className="sim-label">Horizon Duration</span>
                <span className="sim-val font-mono text-primary">{tenureYears} Years</span>
              </div>
              <div className="tenure-button-row">
                {[5, 10, 15, 20, 25, 30].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`tenure-pill ${tenureYears === yr ? "active" : ""}`}
                    onClick={() => setTenureYears(yr)}
                  >
                    {yr}Y
                  </button>
                ))}
              </div>
            </div>

            {/* Annual Step-Up Increment */}
            <div className="sim-control-group">
              <div className="sim-label-row">
                <span className="sim-label">Annual Step-Up Increment</span>
                <span className="sim-val font-mono text-amber">+{annualStepUpPct}% / yr</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={annualStepUpPct}
                onChange={(e) => setAnnualStepUpPct(Number(e.target.value))}
                className="sim-slider"
              />
              <span className="text-muted" style={{ fontSize: "11px" }}>
                Matching your annual salary increment preserves your savings rate as income grows.
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary sim-recalc-btn"
              onClick={runSimulation}
              disabled={loading}
            >
              {loading ? "Calculating Trajectory..." : "Simulate Future Corpus ⚡"}
            </button>
          </div>

          {/* Visualization Output Card */}
          <div className="sim-results-card glass-panel glow-hover">
            {/* Top Multiplier Callout */}
            <div className="sim-metric-callout">
              <div>
                <span className="welcome-tag text-teal">Projected Future Wealth</span>
                <h2 className="sim-final-val text-teal">{formatShortNumber(summary.finalOptimizedCorpus)}</h2>
                <span className="text-muted" style={{ fontSize: "12px" }}>
                  Vs. {formatShortNumber(summary.finalBaselineCorpus)} on static baseline path
                </span>
              </div>
              <div className="sim-delta-badge">
                <span className="text-muted" style={{ fontSize: "11px" }}>Extra Wealth Generated</span>
                <span className="sim-delta-val text-green">+{formatShortNumber(summary.extraWealthGenerated)}</span>
                <span className="sim-multiplier-tag">{summary.multiplier}x Wealth Multiplier</span>
              </div>
            </div>

            {/* Interactive Area Chart */}
            <div className="sim-chart-wrap">
              <ComparisonAreaChart
                currentPath={currentPath}
                optimizedPath={optimizedPath}
                height={260}
                valuePrefix="₹"
              />
            </div>

            {/* Milestone Breakdown Table */}
            <div className="sim-milestones-table">
              <div className="milestone-row header">
                <span>Horizon</span>
                <span>Baseline Path</span>
                <span>Optimized Path</span>
                <span>Difference</span>
              </div>
              {optimizedPath.map((opt, idx) => {
                const base = currentPath[idx] || {};
                const diff = (opt.value || 0) - (base.value || 0);
                return (
                  <div key={idx} className="milestone-row">
                    <span className="font-bold">{opt.year} Years</span>
                    <span className="text-muted font-mono">{formatShortNumber(base.value)}</span>
                    <span className="font-mono text-teal font-bold">{formatShortNumber(opt.value)}</span>
                    <span className="font-mono text-green">+{formatShortNumber(diff)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FutureYou;
