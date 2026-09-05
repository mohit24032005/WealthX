import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProgressRing from "../components/charts/ProgressRing";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import DonutChart from "../components/charts/DonutChart";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import AskWealthXCopilot from "../components/recovery/AskWealthXCopilot";
import api from "../utils/apiClient";
import "./Dashboard.css";

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [aiFinanceStats, setAiFinanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, recovRes, reconRes] = await Promise.allSettled([
        api.get("/api/dashboard"),
        api.get("/api/recovery/stats"),
        api.get("/api/reconciliation/stats"),
      ]);

      if (res.status === "fulfilled" && res.value && res.value.data) {
        setData(res.value.data);
      } else {
        throw new Error(res.reason?.message || "Failed to load command center data");
      }

      setAiFinanceStats({
        recovery: recovRes.status === "fulfilled" ? recovRes.value?.data : null,
        reconciliation: reconRes.status === "fulfilled" ? reconRes.value?.data : null,
      });
    } catch (err) {
      setError(err.message || "Error connecting to WealthX intelligence server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Aggregating financial metrics & intelligence feeds..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState
          title="Command Center Offline"
          message={error}
          onRetry={fetchDashboard}
        />
      </AppLayout>
    );
  }

  if (!data || !data.isOnboarded) {
    return (
      <AppLayout>
        <EmptyState
          icon="🚀"
          title="Financial Profile Pending Calibration"
          description="Complete the 2-minute onboarding to calculate your true net worth, emergency runway, and financial health score."
          actionText="Start 2-Minute Onboarding →"
          onAction={() => (window.location.href = "/onboarding")}
        />
      </AppLayout>
    );
  }

  const { metrics, profile, prioritizedInsights = [], charts = {}, riskDNA = {}, user } = data;

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#f59e0b";
    return "#f43f5e";
  };

  const healthColor = getScoreColor(metrics.healthScore);

  return (
    <AppLayout disclaimerVariant="general">
      <div className="dashboard-view">
        {/* Welcome Header Banner */}
        <div className="dashboard-banner glass-panel">
          <div className="banner-left">
            <span className="welcome-tag">INTELLIGENT COMMAND CENTER</span>
            <h1 className="welcome-name">Welcome back, {user?.name || "Investor"}</h1>
            <p className="welcome-sub">
              Your financial blueprint is active. Review your live cashflow metrics, prioritized insights, and algorithmic allocations below.
            </p>
          </div>

          <div className="banner-right">
            <ProgressRing
              score={metrics.healthScore}
              size={110}
              strokeWidth={9}
              color={healthColor}
              label="/ 100 Health"
            />
            <div className="health-score-meta">
              <span className="health-score-title">Financial Health</span>
              <span className="health-score-sub" style={{ color: healthColor }}>
                {metrics.healthScore >= 75
                  ? "🟢 Resilient & Strong"
                  : metrics.healthScore >= 50
                  ? "🟡 Moderate Baseline"
                  : "🔴 Urgent Attention"}
              </span>
            </div>
          </div>
        </div>

        {/* AI FINANCIAL COMMAND CENTER (Razorpay Buildathon Track 03 & 04) */}
        <div className="ai-command-center-section">
          <div className="section-header-compact">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="badge badge-purple">RAZORPAY AI AGENT</span>
              <span className="badge-simulated" style={{ fontSize: "11px", padding: "2px 6px" }}>SIMULATED / TEST MODE</span>
              <h3 className="section-title">AI Financial Command Center</h3>
            </div>
            <Link to="/revenue-recovery" className="btn-link" style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none" }}>
              Open Recovery Studio →
            </Link>
          </div>

          <div className="ai-cards-grid">
            <div className="ai-stat-card glass-panel glow-hover" title="Dynamic sum from MongoDB of unrecovered payment failures across customer segments">
              <span className="ai-stat-title">Revenue At Risk ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#f43f5e" }}>
                ₹{((aiFinanceStats?.recovery?.kpis?.totalRevenueAtRisk ?? 0) / 100000).toFixed(2)}L
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>Across failed checkouts</span>
            </div>

            <div className="ai-stat-card glass-panel glow-hover" title="Total recorded recovered revenue in simulated mode (baseline historical + live AI campaign successes)">
              <span className="ai-stat-title">Recovered by AI (Test Mode) ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#10b981" }}>
                ₹{((aiFinanceStats?.recovery?.kpis?.recoveredRevenue ?? 0) / 1000).toFixed(1)}K
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>{aiFinanceStats?.recovery?.kpis?.recoveredCount ?? 0} autonomous recoveries</span>
            </div>

            <div className="ai-stat-card glass-panel glow-hover" title="Conversion percentage: (Recovered Revenue / Total Analyzed Volume) × 100">
              <span className="ai-stat-title">Recovery Rate ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#f59e0b" }}>
                {aiFinanceStats?.recovery?.kpis?.recoveryRate ?? 0}%
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>Conversion rate</span>
            </div>

            <div className="ai-stat-card glass-panel glow-hover" title="Percentage of 3-way orders matching gateway collections and bank settlements: (Matched / Total) × 100">
              <span className="ai-stat-title">Reconciliation Match ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#38bdf8" }}>
                {aiFinanceStats?.reconciliation?.stats?.matchRate ?? 0}%
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>Orders vs Settlements</span>
            </div>

            <div className="ai-stat-card glass-panel glow-hover" title="3-way reconciliation exceptions requiring mathematical root-cause explanation">
              <span className="ai-stat-title">Open Exceptions ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#fb7185" }}>
                {aiFinanceStats?.reconciliation?.stats?.exceptionsCount ?? 0}
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>Settlement variances</span>
            </div>

            <div className="ai-stat-card glass-panel glow-hover" title="Total autonomous interventions, campaigns, and stopping rules logged to MongoDB audit trail in the last 24h">
              <span className="ai-stat-title">AI Actions Today ℹ️</span>
              <span className="ai-stat-value" style={{ color: "#a855f7" }}>
                {aiFinanceStats?.recovery?.kpis?.actionsToday ?? 0}
              </span>
              <span className="text-muted" style={{ fontSize: "11px" }}>Logged in audit trail</span>
            </div>
          </div>

          {/* AI ACTION CENTER */}
          <div className="ai-action-center-box">
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚡ AI Action Center — Autonomous Signals
            </span>

            <div className="ai-action-row">
              <div className="ai-action-text">
                <span>🔴</span>
                <span>
                  ₹{(aiFinanceStats?.recovery?.kpis?.eligibleRevenue || 86400).toLocaleString("en-IN")} potentially recoverable across {aiFinanceStats?.recovery?.kpis?.eligibleCount || 18} high-confidence opportunities
                </span>
              </div>
              <Link to="/revenue-recovery" className="btn-inspect" style={{ textDecoration: "none" }}>
                Review Opportunities →
              </Link>
            </div>

            <div className="ai-action-row">
              <div className="ai-action-text">
                <span>🟠</span>
                <span>
                  {aiFinanceStats?.reconciliation?.stats?.exceptionsCount || 13} reconciliation exceptions requiring mathematical verification
                </span>
              </div>
              <Link to="/finance-controller" className="btn-inspect" style={{ textDecoration: "none" }}>
                Investigate →
              </Link>
            </div>

            <div className="ai-action-row">
              <div className="ai-action-text">
                <span>🟡</span>
                <span>
                  {aiFinanceStats?.recovery?.kpis?.escalatedCount || 8} high-value payment failures need human approval before retry
                </span>
              </div>
              <Link to="/revenue-recovery" className="btn-inspect" style={{ textDecoration: "none" }}>
                Review Approval Queue →
              </Link>
            </div>
          </div>
        </div>

        {/* Level 1: Primary Financial Snapshot */}
        <div className="level-section">
          <div className="section-header-compact">
            <h3 className="section-title">Level 1 — Financial Snapshot</h3>
            <span className="text-muted" style={{ fontSize: "12px" }}>Real-time aggregated ledger</span>
          </div>
          <div className="metrics-grid">
            {/* Net Worth */}
            <div className="metric-card glass-panel glow-hover">
              <div className="metric-card-header">
                <span className="metric-title">Net Worth</span>
                <span className="badge badge-green">LIVE</span>
              </div>
              <div className="metric-value font-mono text-teal">
                ₹{Number(metrics.netWorth).toLocaleString("en-IN")}
              </div>
              <div className="metric-breakdown">
                <span>Assets: ₹{Number(metrics.totalAssets).toLocaleString("en-IN")}</span>
                <span>•</span>
                <span>Debt: ₹{Number(metrics.totalLiabilities).toLocaleString("en-IN")}</span>
              </div>
              <p className="metric-desc">
                {metrics.totalLiabilities > 0
                  ? "Factoring in all liquid savings, vault assets, and active loan liabilities."
                  : "Zero debt liabilities detected. 100% asset equity."}
              </p>
            </div>

            {/* Monthly Inflow */}
            <div className="metric-card glass-panel glow-hover">
              <div className="metric-card-header">
                <span className="metric-title">Monthly Income</span>
                <span className="metric-icon">💰</span>
              </div>
              <div className="metric-value font-mono">
                ₹{Number(metrics.monthlyIncome).toLocaleString("en-IN")}
              </div>
              <div className="metric-breakdown">
                <span className="text-muted">Outflows: ₹{Number(metrics.monthlyExpenses).toLocaleString("en-IN")}</span>
              </div>
              <p className="metric-desc">
                {metrics.expenseRatio}% of income committed to essential living expenses.
              </p>
            </div>

            {/* Monthly Surplus */}
            <div className="metric-card glass-panel glow-hover">
              <div className="metric-card-header">
                <span className="metric-title">Monthly Surplus</span>
                <span className="badge badge-blue">{metrics.savingsRate}% SAVINGS</span>
              </div>
              <div className="metric-value font-mono text-cyan">
                ₹{Number(metrics.monthlySurplus).toLocaleString("en-IN")}
              </div>
              <div className="metric-breakdown">
                <span className="text-teal">₹{(metrics.monthlySurplus * 12).toLocaleString("en-IN")}/yr investable</span>
              </div>
              <p className="metric-desc">
                Surplus capital available each month for compounding & goal pacing.
              </p>
            </div>

            {/* Emergency Runway */}
            <div className="metric-card glass-panel glow-hover">
              <div className="metric-card-header">
                <span className="metric-title">Emergency Runway</span>
                {(metrics.monthlyExpenses || 0) > 0 ? (
                  <span className={`badge ${(metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0) >= 6 ? "badge-green" : (metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0) >= 3 ? "badge-amber" : "badge-rose"}`}>
                    {(metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0) >= 6 ? "FORTIFIED" : "ATTENTION"}
                  </span>
                ) : (
                  <span className="badge badge-blue">NO EXPENSE DATA</span>
                )}
              </div>
              <div className="metric-value font-mono">
                {(metrics.monthlyExpenses || 0) > 0 ? (
                  <>
                    {metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0}{" "}
                    <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>Months</span>
                  </>
                ) : (
                  <span style={{ fontSize: "20px", color: "var(--text-secondary)" }}>Calibrate Expenses</span>
                )}
              </div>
              <div className="metric-breakdown">
                <span>Liquid Buffer: ₹{Number(metrics.currentSavings || 0).toLocaleString("en-IN")}</span>
              </div>
              <p className="metric-desc">
                {(metrics.monthlyExpenses || 0) > 0
                  ? (metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0) >= 6
                    ? "Target 6-month buffer achieved. Exceptional safety cushion."
                    : `Target: 6 months (₹${(metrics.monthlyExpenses * 6).toLocaleString("en-IN")}).`
                  : "Add your monthly expenses in onboarding to calculate liquid buffer runway."}
              </p>
            </div>
          </div>
        </div>

        {/* Level 2: "What Needs My Attention?" (Prioritized Top 2-4 Insights) */}
        <div className="level-section">
          <div className="section-header-compact">
            <h3 className="section-title">Level 2 — What Needs My Attention?</h3>
            <span className="text-muted" style={{ fontSize: "12px" }}>Algorithmic urgency evaluation</span>
          </div>
          <div className="insights-grid">
            {prioritizedInsights.length > 0 ? (
              prioritizedInsights.map((insight) => (
                <div key={insight.id} className={`insight-card glass-panel insight-${insight.severity}`}>
                  <div className="insight-top">
                    <span className="insight-indicator">
                      {insight.severity === "good" ? "🟢" : insight.severity === "warning" ? "🟡" : "🔴"}
                    </span>
                    <h4 className="insight-title">{insight.title}</h4>
                  </div>
                  <p className="insight-detail">{insight.detail}</p>
                  {insight.actionRoute && (
                    <Link to={insight.actionRoute} className="insight-link">
                      {insight.actionText} &rarr;
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="insight-card glass-panel insight-good">
                <div className="insight-top">
                  <span className="insight-indicator">🟢</span>
                  <h4 className="insight-title">All Core Metrics Stable</h4>
                </div>
                <p className="insight-detail">Your cashflow, liquidity runway, and debt obligations are currently balanced.</p>
              </div>
            )}
          </div>
        </div>

        {/* Level 3: Financial Visualizations (Net Worth Trend, Cashflow, Asset Composition) */}
        <div className="level-section">
          <div className="section-header-compact">
            <h3 className="section-title">Level 3 — Visual Diagnostics & Trajectory</h3>
            <Link to="/financial-xray" className="text-cyan font-bold" style={{ fontSize: "13px" }}>
              Full 4-Pillar X-Ray &rarr;
            </Link>
          </div>
          <div className="visuals-grid">
            {/* Chart 1: Net Worth Trend */}
            <div className="visual-card glass-panel">
              <div className="visual-card-header">
                <h4>📈 Net Worth Progression</h4>
                <span className="text-muted" style={{ fontSize: "12px" }}>6-Month Trajectory</span>
              </div>
              <LineChart data={charts.netWorthTrend || []} color="#06b6d4" height={220} valuePrefix="₹" />
            </div>

            {/* Chart 2: Cashflow Dynamics */}
            <div className="visual-card glass-panel">
              <div className="visual-card-header">
                <h4>📊 Monthly Cashflow Dynamics</h4>
                <span className="text-muted" style={{ fontSize: "12px" }}>Inflows vs. Outflows</span>
              </div>
              <BarChart
                categories={charts.cashflowCategories || ["Current"]}
                series={charts.cashflowSeries || []}
                height={220}
                valuePrefix="₹"
              />
            </div>

            {/* Chart 3: Asset Composition */}
            <div className="visual-card glass-panel">
              <div className="visual-card-header">
                <h4>🥧 Asset Allocation Distribution</h4>
                <Link to="/wealth-vault" className="text-cyan font-bold" style={{ fontSize: "12px" }}>
                  Wealth Vault &rarr;
                </Link>
              </div>
              <DonutChart
                data={charts.assetComposition || []}
                centerLabel="Total Assets"
                centerValue={`₹${metrics.totalAssets.toLocaleString("en-IN")}`}
                size={170}
              />
            </div>
          </div>
        </div>

        {/* Level 4: Wealth Decision Teaser ("Where should your next ₹10,000 go?") */}
        <div className="level-section">
          <div className="decision-teaser-card glass-panel glow-hover">
            <div className="decision-teaser-left">
              <span className="welcome-tag text-teal">Level 4 — Wealth Decision</span>
              <h2 className="decision-teaser-title">Where should your next ₹10,000 go?</h2>
              <p className="decision-teaser-sub">
                Tuned to your current {metrics.emergencyFundMonths ?? metrics.emergencyMonths ?? 0}-month runway and {metrics.emiBurdenPct}% debt load. Get an algorithmic distribution breakdown across Emergency Reserves, SIP compounding, and debt prepayments.
              </p>
            </div>
            <div className="decision-teaser-right">
              <Link to="/my-next-money" className="btn btn-primary" style={{ padding: "12px 24px", fontSize: "14px" }}>
                Optimize Next ₹10,000 ⚡
              </Link>
              <Link to="/ai-decision-lab" className="btn btn-secondary" style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 800 }}>
                🤖 ASK AI &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Level 5: Risk DNA vs Portfolio Allocation Widget */}
        <div className="level-section">
          <div className="risk-dna-widget glass-panel">
            <div className="risk-widget-header">
              <div>
                <span className="welcome-tag text-cyan">Level 5 — Behavioral Blueprint</span>
                <h3 className="section-title">Your Risk DNA: {riskDNA.categoryLabel || "Moderate Growth"}</h3>
                <p className="text-muted" style={{ fontSize: "13px" }}>
                  Quantified risk posture based on your investment horizon and market drawdown tolerance.
                </p>
              </div>
              <Link to="/risk-dna" className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                Inspect Risk DNA &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Level 6: Quick Action Shortcuts */}
        <div className="level-section">
          <div className="section-header-compact">
            <h3 className="section-title">Level 6 — Quick Actions</h3>
          </div>
          <div className="quick-actions-row">
            <Link to="/wealth-vault" className="action-tile glass-panel glow-hover">
              <span className="action-tile-icon">🏦</span>
              <div className="action-tile-content">
                <span className="action-tile-title">Wealth Vault</span>
                <span className="action-tile-desc">Add or revalue portfolio assets</span>
              </div>
            </Link>
            <Link to="/goals" className="action-tile glass-panel glow-hover">
              <span className="action-tile-icon">🎯</span>
              <div className="action-tile-content">
                <span className="action-tile-title">Milestone Goals</span>
                <span className="action-tile-desc">Track timelines & contributions</span>
              </div>
            </Link>
            <Link to="/future-you" className="action-tile glass-panel glow-hover">
              <span className="action-tile-icon">🚀</span>
              <div className="action-tile-content">
                <span className="action-tile-title">Future You Simulator</span>
                <span className="action-tile-desc">Forecast multi-decade wealth</span>
              </div>
            </Link>
            <Link to="/hype-check" className="action-tile glass-panel glow-hover">
              <span className="action-tile-icon">🔎</span>
              <div className="action-tile-content">
                <span className="action-tile-title">Hype Check</span>
                <span className="action-tile-desc">Audit investment speculation</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Grounded Copilot Drawer */}
        <AskWealthXCopilot />
      </div>
    </AppLayout>
  );
};

export default Dashboard;