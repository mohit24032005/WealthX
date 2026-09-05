import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./FinancialXRay.css";

export const FinancialXRay = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive Portfolio Change Simulation
  const [simAmount, setSimAmount] = useState(5000);
  const [simAssetClass, setSimAssetClass] = useState("equity");

  const fetchXRay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/financial-xray");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load financial X-ray diagnostics.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to financial diagnostics service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXRay();
  }, [fetchXRay]);

  if (loading) {
    return (
      <AppLayout disclaimerVariant="general">
        <LoadingState message="Conducting algorithmic financial stress-tests & concentration audits..." />
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout disclaimerVariant="general">
        <ErrorState
          title="Diagnostics Offline"
          message={error || "Financial X-Ray temporarily unavailable."}
          onRetry={fetchXRay}
        />
      </AppLayout>
    );
  }

  const {
    income,
    emergencyFund,
    debtHealth,
    investmentHealth,
    goalHealth,
    pillarScores,
    financialStage,
    strategicObservations,
    focusActions,
  } = data;

  // 1. Prepare Cashflow Bar Chart Data
  const cashflowCategories = ["Monthly Cashflow"];
  const cashflowSeries = [
    { name: "Income", color: "#10b981", values: [income.monthlyIncome || 0] },
    { name: "Expenses", color: "#f43f5e", values: [income.monthlyExpenses || 0] },
    { name: "Surplus", color: "#06b6d4", values: [income.cashFlow || income.monthlySurplus || 0] },
  ];

  // 2. Prepare Donut Chart Data from actual portfolio
  const split = investmentHealth.portfolioSplit || {};
  const donutData = [
    { label: "Equity", value: split.equityVal || 0, color: "#06b6d4" },
    { label: "Debt & FDs", value: split.debtVal || 0, color: "#3b82f6" },
    { label: "Gold", value: split.goldVal || 0, color: "#f59e0b" },
    { label: "Liquid Cash", value: split.cashVal || emergencyFund.currentSavings || 0, color: "#10b981" },
  ].filter((item) => item.value > 0);

  // 3. Portfolio Simulation Math
  const calculateSimulatedAllocation = () => {
    const currentEq = split.equityVal || 0;
    const currentDebt = split.debtVal || 0;
    const currentGold = split.goldVal || 0;
    const currentCash = split.cashVal || emergencyFund.currentSavings || 0;
    const totalCurrent = currentEq + currentDebt + currentGold + currentCash;

    const addVal = Number(simAmount) || 0;
    const newTotal = totalCurrent + addVal;

    let newEq = currentEq;
    let newDebt = currentDebt;
    let newGold = currentGold;
    let newCash = currentCash;

    if (simAssetClass === "equity") newEq += addVal;
    else if (simAssetClass === "debt") newDebt += addVal;
    else if (simAssetClass === "gold") newGold += addVal;
    else if (simAssetClass === "cash") newCash += addVal;

    const before = {
      equityPct: totalCurrent > 0 ? Math.round((currentEq / totalCurrent) * 100) : 0,
      debtPct: totalCurrent > 0 ? Math.round((currentDebt / totalCurrent) * 100) : 0,
      goldPct: totalCurrent > 0 ? Math.round((currentGold / totalCurrent) * 100) : 0,
      cashPct: totalCurrent > 0 ? Math.round((currentCash / totalCurrent) * 100) : 100,
    };

    const after = {
      equityPct: newTotal > 0 ? Math.round((newEq / newTotal) * 100) : 0,
      debtPct: newTotal > 0 ? Math.round((newDebt / newTotal) * 100) : 0,
      goldPct: newTotal > 0 ? Math.round((newGold / newTotal) * 100) : 0,
      cashPct: newTotal > 0 ? Math.round((newCash / newTotal) * 100) : 100,
    };

    return { before, after, newTotal };
  };

  const simResult = calculateSimulatedAllocation();

  return (
    <AppLayout disclaimerVariant="general">
      <div className="xray-view">
        {/* Page Header */}
        <div className="xray-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>ALGORITHMIC HEALTH AUDIT</span>
            </div>
            <h1 className="xray-title">Financial X-Ray</h1>
            <p className="xray-sub">
              Multi-dimensional diagnostic evaluation of your cashflow ratios, emergency liquidity runway, portfolio concentration risks, and milestone pacing.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link to="/action-plan" className="btn btn-secondary">
              Action Plan &rarr;
            </Link>
            <Link to="/ai-decision-lab" className="btn btn-primary" style={{ fontWeight: 800, letterSpacing: "0.02em" }}>
              🤖 ASK AI &rarr;
            </Link>
          </div>
        </div>

        {/* Financial Health Score & Financial Stage Summary Banner */}
        <div className="xray-summary-banner glass-panel">
          <div className="summary-score-col">
            <div className="score-ring-wrap">
              <span className="score-ring-val">{pillarScores?.compositeScore || 50}</span>
              <span className="score-ring-max">/100</span>
            </div>
            <span className="score-ring-label">Financial Health Score</span>
            <span className="text-muted" style={{ fontSize: "11px", marginTop: "2px" }}>Institutional Composite Audit</span>
          </div>

          {/* 5-Pillar Score Meters */}
          <div className="pillar-scores-col">
            <span className="section-mini-title">Pillar Health Diagnostic Scores</span>
            <div className="pillar-meters-grid">
              <div className="meter-item">
                <div className="meter-label-row">
                  <span>Cashflow</span>
                  <span className="font-mono font-bold text-teal">{pillarScores?.cashflowScore || 50}/100</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pillarScores?.cashflowScore || 50}%`, background: "var(--accent-teal)" }} />
                </div>
              </div>

              <div className="meter-item">
                <div className="meter-label-row">
                  <span>Emergency</span>
                  <span className="font-mono font-bold text-cyan">{pillarScores?.emergencyScore || 40}/100</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pillarScores?.emergencyScore || 40}%`, background: "var(--accent-cyan)" }} />
                </div>
              </div>

              <div className="meter-item">
                <div className="meter-label-row">
                  <span>Debt Health</span>
                  <span className="font-mono font-bold text-blue">{pillarScores?.debtScore || 100}/100</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pillarScores?.debtScore || 100}%`, background: "var(--accent-primary)" }} />
                </div>
              </div>

              <div className="meter-item">
                <div className="meter-label-row">
                  <span>Portfolio</span>
                  <span className="font-mono font-bold text-amber">{pillarScores?.portfolioScore || 50}/100</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pillarScores?.portfolioScore || 50}%`, background: "var(--accent-amber)" }} />
                </div>
              </div>

              <div className="meter-item">
                <div className="meter-label-row">
                  <span>Goals</span>
                  <span className="font-mono font-bold text-teal">{pillarScores?.goalsScore || 70}/100</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill" style={{ width: `${pillarScores?.goalsScore || 70}%`, background: "var(--accent-teal)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Current Financial Stage Card */}
          {financialStage && (
            <div className="stage-card-col">
              <div className="stage-header-row">
                <span className="section-mini-title">Current Financial Stage</span>
                <span className={`badge ${financialStage.badgeColor || "badge-blue"}`}>
                  Stage {financialStage.stageNumber}: {financialStage.stageName}
                </span>
              </div>
              <h3 className="stage-title">{financialStage.tagline}</h3>
              <p className="stage-desc">{financialStage.description}</p>
              <div className="stage-focus-list">
                <span className="focus-list-title">Key Stage Priorities:</span>
                <ul>
                  {financialStage.focusPoints.map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 4 Core Diagnostic Area Cards Grid */}
        <div className="xray-grid">
          {/* Card 1: Income & Cashflow Dynamics */}
          <div className="diagnostic-card glass-panel glow-hover">
            <div className="card-top">
              <div className="card-icon-box">💵</div>
              <div className="card-badge-wrap">
                <span
                  className={`badge ${
                    income.expenseRatio <= 50
                      ? "badge-green"
                      : income.expenseRatio <= 75
                      ? "badge-blue"
                      : "badge-rose"
                  }`}
                >
                  {income.expenseRatio}% Burn Rate
                </span>
              </div>
            </div>

            <h3 className="diagnostic-title">Income & Cashflow Dynamics</h3>
            <p className="diagnostic-desc">
              Evaluates monthly take-home surplus against recurring essential and lifestyle outflows.
            </p>

            {/* Dynamic Cashflow Bar Chart */}
            <div style={{ margin: "12px 0" }}>
              <BarChart categories={cashflowCategories} series={cashflowSeries} height={140} valuePrefix="₹" />
            </div>

            <div className="diagnostic-metrics-list">
              <div className="diag-metric-row">
                <span>Monthly Inflow</span>
                <span className="currency font-bold text-teal">
                  ₹{Number(income.monthlyIncome || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="diag-metric-row">
                <span>Monthly Outflows</span>
                <span className="currency font-bold text-rose">
                  ₹{Number(income.monthlyExpenses || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="diag-metric-row highlight">
                <span>Net Monthly Surplus</span>
                <span className="currency font-bold text-cyan">
                  ₹{Number(income.cashFlow || income.monthlySurplus || 0).toLocaleString("en-IN")} ({income.savingsRate}%)
                </span>
              </div>
            </div>

            {/* Personalized Interpretation */}
            <div className="personalized-insight-box">
              <span className="insight-badge-tag">Analysis</span>
              <p className="insight-body-text">{income.interpretation}</p>
            </div>

            <div className="card-action-footer">
              <Link to="/onboarding" className="action-arrow-link">
                Update Income Calibration &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: Emergency Liquidity Runway */}
          <div className="diagnostic-card glass-panel glow-hover">
            <div className="card-top">
              <div className="card-icon-box">🛡️</div>
              <div className="card-badge-wrap">
                <span
                  className={`badge ${
                    emergencyFund.months >= 6
                      ? "badge-green"
                      : emergencyFund.months >= 3
                      ? "badge-amber"
                      : "badge-rose"
                  }`}
                >
                  {emergencyFund.stageLabel || "Building"} ({emergencyFund.months !== null ? `${emergencyFund.months} Mos` : "Uncalibrated"})
                </span>
              </div>
            </div>

            <h3 className="diagnostic-title">Emergency Liquidity Runway</h3>
            <p className="diagnostic-desc">
              Measures how many months of necessary living expenses your liquid buffer can support.
            </p>

            {/* Horizontal Runway Range Gauge Bar */}
            <div className="runway-gauge-box">
              <div className="runway-gauge-header">
                <span className="text-muted" style={{ fontSize: "11px" }}>0 Mos</span>
                <span className="text-muted" style={{ fontSize: "11px" }}>3 Mos</span>
                <span className="text-teal font-bold" style={{ fontSize: "11px" }}>6 Mos (Target)</span>
                <span className="text-muted" style={{ fontSize: "11px" }}>9 Mos</span>
                <span className="text-muted" style={{ fontSize: "11px" }}>12+ Mos</span>
              </div>
              <div className="runway-gauge-track">
                <div
                  className="runway-gauge-fill"
                  style={{
                    width: `${Math.min(100, ((emergencyFund.months || 0) / 12) * 100)}%`,
                    background:
                      (emergencyFund.months || 0) >= 6
                        ? "linear-gradient(90deg, #10b981, #06b6d4)"
                        : (emergencyFund.months || 0) >= 3
                        ? "linear-gradient(90deg, #f59e0b, #10b981)"
                        : "linear-gradient(90deg, #f43f5e, #f59e0b)",
                  }}
                />
              </div>
            </div>

            <div className="diagnostic-metrics-list">
              <div className="diag-metric-row">
                <span>Current Liquid Buffer</span>
                <span className="currency font-bold">
                  ₹{Number(emergencyFund.currentSavings || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="diag-metric-row">
                <span>Calculated Runway</span>
                <span className="font-bold text-cyan font-mono">
                  {emergencyFund.months !== null ? `${emergencyFund.months} Months` : "Uncalibrated"}
                </span>
              </div>
              <div className="diag-metric-row highlight">
                <span>Recommended 6-Mo Reserve</span>
                <span className="currency font-bold">
                  ₹{Number(emergencyFund.targetAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Personalized Interpretation */}
            <div className="personalized-insight-box">
              <span className="insight-badge-tag">Liquidity Status</span>
              <p className="insight-body-text">{emergencyFund.interpretation}</p>
            </div>

            <div className="card-action-footer">
              <Link to="/my-next-money" className="action-arrow-link">
                Fortify Runway via Next ₹10k &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Portfolio Diversification */}
          <div className="diagnostic-card glass-panel glow-hover">
            <div className="card-top">
              <div className="card-icon-box">📊</div>
              <div className="card-badge-wrap">
                {investmentHealth.concentrationWarning ? (
                  <span className="badge badge-rose">⚠️ High Concentration</span>
                ) : investmentHealth.categoriesUsed >= 3 ? (
                  <span className="badge badge-green">✓ Diversified</span>
                ) : (
                  <span className="badge badge-blue">Developing</span>
                )}
              </div>
            </div>

            <h3 className="diagnostic-title">Portfolio Diversification</h3>
            <p className="diagnostic-desc">
              Checks asset spread across equities, mutual funds, debt, gold, and liquid cash.
            </p>

            {/* Donut Chart or Empty State */}
            {donutData.length > 0 ? (
              <div style={{ margin: "8px 0" }}>
                <DonutChart data={donutData} size={150} centerLabel="Assets" centerValue={`₹${(investmentHealth.currentValue || 0).toLocaleString("en-IN")}`} />
              </div>
            ) : (
              <div className="empty-chart-box">
                <span style={{ fontSize: "20px" }}>📊</span>
                <span className="text-muted" style={{ fontSize: "12px" }}>No investment assets tracked yet.</span>
                <Link to="/wealth-vault" className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px", marginTop: "4px" }}>
                  Add First Asset &rarr;
                </Link>
              </div>
            )}

            <div className="diagnostic-metrics-list">
              <div className="diag-metric-row">
                <span>Active Asset Classes</span>
                <span className="font-bold">{investmentHealth.categoriesUsed} Classes</span>
              </div>
              <div className="diag-metric-row">
                <span>Dominant Allocation</span>
                <span className={`font-bold font-mono ${investmentHealth.concentrationWarning ? "text-rose" : "text-cyan"}`}>
                  {investmentHealth.dominantCategory ? `${investmentHealth.dominantCategory.replace("_", " ")} (${investmentHealth.dominantPct}%)` : "Balanced"}
                </span>
              </div>
              <div className="diag-metric-row highlight">
                <span>Total Vault Valuation</span>
                <span className="currency font-bold text-teal">
                  ₹{Number(investmentHealth.currentValue || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Personalized Interpretation */}
            <div className="personalized-insight-box">
              <span className="insight-badge-tag">Diversification</span>
              <p className="insight-body-text">{investmentHealth.interpretation}</p>
            </div>

            <div className="card-action-footer">
              <Link to="/wealth-vault" className="action-arrow-link">
                Inspect Vault Holdings &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: Debt & Liability Health */}
          <div className="diagnostic-card glass-panel glow-hover">
            <div className="card-top">
              <div className="card-icon-box">💳</div>
              <div className="card-badge-wrap">
                {debtHealth.loansCount > 0 ? (
                  <span
                    className={`badge ${
                      debtHealth.status === "good" || debtHealth.dti <= 20
                        ? "badge-green"
                        : debtHealth.dti <= 40
                        ? "badge-amber"
                        : "badge-rose"
                    }`}
                  >
                    {debtHealth.dti}% DTI ({debtHealth.dti <= 20 ? "Healthy" : debtHealth.dti <= 40 ? "Watch" : "High"})
                  </span>
                ) : (
                  <span className="badge badge-green">Debt-Free</span>
                )}
              </div>
            </div>

            <h3 className="diagnostic-title">Debt & Liability Health</h3>
            <p className="diagnostic-desc">
              Evaluates monthly debt service burden relative to your total earnings.
            </p>

            {/* DTI Gauge Bar */}
            <div className="runway-gauge-box">
              <div className="runway-gauge-header">
                <span className="text-teal font-bold" style={{ fontSize: "11px" }}>0% (Optimal)</span>
                <span className="text-muted" style={{ fontSize: "11px" }}>20%</span>
                <span className="text-amber font-bold" style={{ fontSize: "11px" }}>40% (Threshold)</span>
                <span className="text-rose font-bold" style={{ fontSize: "11px" }}>60%+</span>
              </div>
              <div className="runway-gauge-track">
                <div
                  className="runway-gauge-fill"
                  style={{
                    width: `${Math.min(100, ((debtHealth.dti || 0) / 60) * 100)}%`,
                    background:
                      (debtHealth.dti || 0) <= 20
                        ? "linear-gradient(90deg, #10b981, #06b6d4)"
                        : (debtHealth.dti || 0) <= 40
                        ? "linear-gradient(90deg, #10b981, #f59e0b)"
                        : "linear-gradient(90deg, #f59e0b, #f43f5e)",
                  }}
                />
              </div>
            </div>

            <div className="diagnostic-metrics-list">
              <div className="diag-metric-row">
                <span>Active Loan Facilities</span>
                <span className="font-bold">
                  {debtHealth.loansCount || 0} {debtHealth.loansCount === 1 ? "Loan" : "Loans"}
                </span>
              </div>
              <div className="diag-metric-row">
                <span>Total Outstanding</span>
                <span className="currency font-bold text-rose">
                  ₹{Number(debtHealth.totalOutstanding || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="diag-metric-row highlight">
                <span>Monthly EMI Commitment</span>
                <span className="currency font-bold">
                  ₹{Number(debtHealth.totalMonthlyEMI || 0).toLocaleString("en-IN")} ({debtHealth.dti || 0}%)
                </span>
              </div>
            </div>

            {/* Personalized Interpretation */}
            <div className="personalized-insight-box">
              <span className="insight-badge-tag">Liability Review</span>
              <p className="insight-body-text">{debtHealth.interpretation}</p>
            </div>

            <div className="card-action-footer">
              <Link to="/loans" className="action-arrow-link">
                Manage Active Loans &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Milestone Goal Health Section */}
        <div className="section-card glass-panel" style={{ padding: "26px", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700 }}>🎯 Milestone Goal Progress & Pacing</h3>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>Real-time audit comparing required monthly contributions against scheduled target deadlines.</span>
            </div>
            <Link to="/goals" className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "12px" }}>
              Manage Goals &rarr;
            </Link>
          </div>

          {goalHealth && goalHealth.length > 0 ? (
            <div className="goals-mini-grid">
              {goalHealth.map((goal) => (
                <div key={goal.id} className="goal-mini-item">
                  <div className="goal-mini-header">
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 700 }}>{goal.title}</h4>
                      <span className="text-muted" style={{ fontSize: "11px" }}>Target Year: {goal.deadlineYear || "Open"}</span>
                    </div>
                    <span className={`badge ${goal.pacingStatus === "on_track" ? "badge-green" : "badge-amber"}`} style={{ fontSize: "10px" }}>
                      {goal.pacingStatus === "on_track" ? "✓ On Track" : "⚠️ Behind Pace"}
                    </span>
                  </div>

                  <div className="goal-mini-progress">
                    <div className="goal-mini-fill" style={{ width: `${Math.min(100, goal.progressPct)}%` }} />
                  </div>

                  <div className="goal-mini-footer">
                    <span className="font-mono text-cyan" style={{ fontSize: "12.5px", fontWeight: 700 }}>
                      ₹{Number(goal.currentAmount || 0).toLocaleString("en-IN")} / ₹{Number(goal.targetAmount || 0).toLocaleString("en-IN")} ({goal.progressPct}%)
                    </span>
                    <span className="text-muted" style={{ fontSize: "11px" }}>
                      Req: ₹{Number(goal.requiredMonthlyContribution || 0).toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-chart-box">
              <span style={{ fontSize: "22px" }}>🎯</span>
              <span className="text-muted" style={{ fontSize: "13px" }}>No milestone goals established yet. Create a goal to track required monthly savings pacing.</span>
              <Link to="/goals" className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "12px", marginTop: "6px" }}>
                Create Milestone Goal &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Interactive Portfolio Change Preview Simulation */}
        <div className="section-card glass-panel" style={{ padding: "26px", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700 }}>🧪 Portfolio Change Preview Simulation</h3>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>Hypothetically test how a new investment allocation alters your overall portfolio diversification.</span>
            </div>
            <span className="badge badge-blue">Interactive Sandbox</span>
          </div>

          <div className="sim-interactive-row">
            <div className="sim-input-col">
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Hypothetical Investment (₹)</label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="sim-input-box"
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Target Asset Class</label>
                <select
                  value={simAssetClass}
                  onChange={(e) => setSimAssetClass(e.target.value)}
                  className="sim-input-box"
                >
                  <option value="equity">Equity & Mutual Funds</option>
                  <option value="debt">Fixed Income & FDs</option>
                  <option value="gold">Digital Gold / SGB</option>
                  <option value="cash">Liquid Cash Buffer</option>
                </select>
              </div>
            </div>

            <div className="sim-comparison-col">
              <div className="sim-stat-box">
                <span className="text-muted" style={{ fontSize: "11px" }}>BEFORE ALLOCATION</span>
                <div className="sim-pct-row">
                  <span>Equity: <strong className="text-cyan">{simResult.before.equityPct}%</strong></span>
                  <span>Debt: <strong className="text-blue">{simResult.before.debtPct}%</strong></span>
                  <span>Gold: <strong className="text-amber">{simResult.before.goldPct}%</strong></span>
                  <span>Cash: <strong className="text-teal">{simResult.before.cashPct}%</strong></span>
                </div>
              </div>

              <div className="sim-stat-box highlight-box">
                <span className="text-teal font-bold" style={{ fontSize: "11px" }}>AFTER +₹{simAmount.toLocaleString("en-IN")} IN {simAssetClass.toUpperCase()}</span>
                <div className="sim-pct-row">
                  <span>Equity: <strong className="text-cyan">{simResult.after.equityPct}%</strong></span>
                  <span>Debt: <strong className="text-blue">{simResult.after.debtPct}%</strong></span>
                  <span>Gold: <strong className="text-amber">{simResult.after.goldPct}%</strong></span>
                  <span>Cash: <strong className="text-teal">{simResult.after.cashPct}%</strong></span>
                </div>
              </div>
            </div>
          </div>
          <span className="text-muted" style={{ fontSize: "11px", display: "block", marginTop: "8px" }}>
            * This is an educational simulation sandbox. Your actual portfolio holdings remain completely unchanged.
          </span>
        </div>

        {/* Diagnostic Strategic Observations (FIXED & PRIORITIZED) */}
        <div className="insights-panel glass-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 className="insights-header-title">Diagnostic Strategic Observations</h2>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>Prioritized high-impact alerts generated dynamically from your real balance sheet metrics.</span>
            </div>
            <span className="badge badge-teal">Algorithmic Diagnostics</span>
          </div>

          <div className="insights-feed-list">
            {strategicObservations && strategicObservations.length > 0 ? (
              strategicObservations.map((obs) => (
                <div key={obs.id} className={`insight-box insight-severity-${obs.severity.toLowerCase()} glow-hover`}>
                  <div className="insight-icon-col">
                    <span className="insight-main-icon">{obs.icon}</span>
                  </div>
                  <div className="insight-content">
                    <div className="insight-top-line">
                      <h4 className="insight-title">{obs.title}</h4>
                      <span className={`badge ${obs.type === "rose" ? "badge-rose" : obs.type === "amber" ? "badge-amber" : obs.type === "teal" ? "badge-teal" : "badge-green"}`} style={{ fontSize: "10px" }}>
                        {obs.metric}
                      </span>
                    </div>
                    <p className="insight-msg">{obs.description}</p>
                    <div className="insight-action-row">
                      <span className="text-secondary" style={{ fontSize: "12px" }}>💡 {obs.recommendedAction}</span>
                      {obs.actionRoute && (
                        <Link to={obs.actionRoute} className="btn btn-secondary insight-btn">
                          {obs.actionLabel} &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No high-urgency alerts detected. All financial pillars are operating within nominal thresholds.</p>
            )}
          </div>
        </div>

        {/* "What Should You Focus On Now?" (Top 3 Stage-Specific Actions) */}
        {focusActions && focusActions.length > 0 && (
          <div className="focus-actions-section glass-panel">
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800 }}>⚡ What Should You Focus On Now?</h2>
              <span className="text-muted" style={{ fontSize: "13px" }}>Top 3 prioritized actions tailored to your {financialStage?.stageName || "current"} financial stage.</span>
            </div>

            <div className="focus-actions-grid">
              {focusActions.map((action, idx) => (
                <div key={idx} className="focus-action-card glass-panel glow-hover">
                  <div className="focus-step-num">{action.step}</div>
                  <h4 className="focus-action-title">{action.title}</h4>
                  <p className="focus-action-desc">{action.description}</p>
                  <Link to={action.actionRoute} className="btn btn-primary focus-action-btn">
                    {action.actionLabel} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statutory Educational Disclaimer */}
        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-md)", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>
          ⚖️ <strong>STATUTORY FINANCIAL DISCLAIMER:</strong> Financial X-Ray diagnostics are calculated strictly for educational analysis and personal financial tracking. Algorithms evaluate mathematical ratios against benchmark parameters. WealthX is not a SEBI/RBI registered investment advisor.
        </div>
      </div>
    </AppLayout>
  );
};

export default FinancialXRay;
