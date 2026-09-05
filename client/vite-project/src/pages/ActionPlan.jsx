import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import AllocationBar from "../components/charts/AllocationBar";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./ActionPlan.css";

export const ActionPlan = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTimelineTab, setActiveTimelineTab] = useState("all");
  const navigate = useNavigate();

  const fetchActionPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/action-plan");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load strategic action plan.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to Action Plan generator.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionPlan();
  }, [fetchActionPlan]);

  const handleAskAI = (aiPrompt) => {
    if (!aiPrompt) return;
    navigate("/ai-decision-lab", { state: { initialQuery: aiPrompt } });
  };

  if (loading) {
    return (
      <AppLayout disclaimerVariant="general">
        <LoadingState message="Synthesizing balance sheet, emergency buffer, loans, and prioritizing strategic actions..." />
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout disclaimerVariant="general">
        <ErrorState
          title="Action Plan Unavailable"
          message={error || "Could not generate strategic action plan."}
          onRetry={fetchActionPlan}
        />
      </AppLayout>
    );
  }

  if (data.isUncalibrated) {
    return (
      <AppLayout disclaimerVariant="general">
        <div className="action-plan-view">
          <div className="action-plan-header-row">
            <div>
              <div className="breadcrumb-pill">
                <span className="live-dot"></span>
                <span>SYNTHESIS & RECOMMENDATIONS</span>
              </div>
              <h1 className="action-plan-title">Strategic Action Plan</h1>
              <p className="action-plan-sub">
                Your prioritized financial roadmap derived from real balance sheet dynamics, emergency liquidity, debt burden, and milestone pacing.
              </p>
            </div>
          </div>

          <EmptyState
            icon="📋"
            title="Build Your Financial Foundation"
            description="We need your real income, living expenses, and liquid savings baseline before generating your prioritized Action Plan."
            actionText="Start Profile Calibration →"
            onAction={() => navigate("/onboarding")}
          />
        </div>
      </AppLayout>
    );
  }

  const {
    financialStage,
    pillarScores,
    actionMap,
    topPriority,
    timeline,
    allActions = [],
    growthOpportunity,
    smartAllocation,
  } = data;

  // Filter actions based on active timeline tab
  const getVisibleActions = () => {
    if (activeTimelineTab === "thisWeek") return timeline.thisWeek || [];
    if (activeTimelineTab === "thisMonth") return timeline.thisMonth || [];
    if (activeTimelineTab === "next3Months") return timeline.next3Months || [];
    if (activeTimelineTab === "next6To12Months") return timeline.next6To12Months || [];
    return allActions;
  };

  const visibleActions = getVisibleActions();

  return (
    <AppLayout disclaimerVariant="general">
      <div className="action-plan-view">
        {/* Header */}
        <div className="action-plan-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>DETERMINISTIC ACTION PRIORITY ENGINE</span>
            </div>
            <h1 className="action-plan-title">Strategic Action Plan</h1>
            <p className="action-plan-sub">
              Your personalized financial execution roadmap, prioritized according to what creates the highest balance sheet impact right now.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link to="/financial-xray" className="btn btn-secondary">
              Inspect Financial X-Ray &rarr;
            </Link>
            <Link to="/ai-decision-lab" className="btn btn-primary" style={{ fontWeight: 800, letterSpacing: "0.02em" }}>
              🤖 ASK AI &rarr;
            </Link>
          </div>
        </div>

        {/* Financial Stage & Financial Action Map Summary Banner */}
        <div className="action-stage-banner glass-panel">
          {/* Stage Card */}
          <div className="stage-banner-col">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="section-mini-label">Current Financial Stage</span>
              <span className={`badge ${financialStage?.badgeColor || "badge-blue"}`}>
                Stage {financialStage?.stageNumber}: {financialStage?.stageName}
              </span>
            </div>
            <h3 className="stage-banner-title">{financialStage?.tagline}</h3>
            <p className="stage-banner-desc">{financialStage?.description}</p>
          </div>

          {/* Action Readiness Map (5 Pillars) */}
          <div className="action-map-col">
            <span className="section-mini-label">Financial Action Map</span>
            <div className="action-map-grid">
              {Object.entries(actionMap || {}).map(([key, pillar]) => (
                <div key={key} className="action-map-pill">
                  <span className="map-pill-label">{pillar.label}</span>
                  <span className={`badge ${pillar.badge}`} style={{ fontSize: "10px" }}>
                    {pillar.status}
                  </span>
                  <div className="map-track">
                    <div className="map-fill" style={{ width: `${pillar.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🌟 TOP PRIORITY HERO CARD */}
        {topPriority && (
          <div className={`top-priority-hero glass-panel priority-border-${topPriority.priorityLevel.toLowerCase()}`}>
            <div className="top-hero-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="priority-level-badge">
                  {topPriority.priorityLevel === "CRITICAL" ? "🔴 CRITICAL PRIORITY" : topPriority.priorityLevel === "HIGH" ? "🟠 HIGH PRIORITY" : "🟢 TOP OPPORTUNITY"}
                </span>
                <span className="priority-score-pill font-mono">
                  {topPriority.priorityScore}/100 Priority
                </span>
              </div>
              <span className="text-muted" style={{ fontSize: "11px", textTransform: "uppercase" }}>Primary Focus Item</span>
            </div>

            <div className="top-hero-content">
              <div className="top-hero-icon-wrap">
                <span className="top-hero-icon">{topPriority.icon}</span>
              </div>
              <div className="top-hero-details">
                <h2 className="top-hero-title">{topPriority.title}</h2>
                <div className="top-hero-metrics-row">
                  <div>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Current Situation</span>
                    <span className="font-bold text-cyan" style={{ fontSize: "13.5px" }}>{topPriority.currentSituation}</span>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Target Benchmark</span>
                    <span className="font-bold text-teal" style={{ fontSize: "13.5px" }}>{topPriority.target}</span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ margin: "10px 0" }}>
                  <div className="action-progress-track">
                    <div
                      className="action-progress-fill"
                      style={{
                        width: `${Math.max(5, topPriority.progressPct)}%`,
                        background: topPriority.priorityLevel === "CRITICAL" ? "var(--accent-rose)" : "var(--accent-teal)",
                      }}
                    />
                  </div>
                </div>

                <div className="top-hero-why-box">
                  <span className="font-bold text-muted" style={{ fontSize: "11.5px" }}>WHY THIS MATTERS:</span>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0", lineHeight: "1.5" }}>
                    {topPriority.whyItMatters}
                  </p>
                </div>

                <div className="top-hero-action-row">
                  <Link to={topPriority.actionRoute} className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "13.5px" }}>
                    {topPriority.actionLabel} &rarr;
                  </Link>
                  {topPriority.aiPrompt && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "10px 18px", fontSize: "13px", fontWeight: 800 }}
                      onClick={() => handleAskAI(topPriority.aiPrompt)}
                    >
                      🤖 ASK WEALTHX AI &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📅 ACTION PLAN TIMELINE (4 Horizons) */}
        <div className="timeline-section glass-panel">
          <div className="timeline-header-bar">
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800 }}>📅 Action Plan Execution Timeline</h2>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>Sequenced across your immediate, monthly, and multi-quarter execution horizons.</span>
            </div>

            {/* Timeline Filter Tabs */}
            <div className="timeline-tabs-row">
              <button
                type="button"
                className={`timeline-tab-btn ${activeTimelineTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("all")}
              >
                All Actions ({allActions.length})
              </button>
              <button
                type="button"
                className={`timeline-tab-btn ${activeTimelineTab === "thisWeek" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("thisWeek")}
              >
                This Week ({timeline?.thisWeek?.length || 0})
              </button>
              <button
                type="button"
                className={`timeline-tab-btn ${activeTimelineTab === "thisMonth" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("thisMonth")}
              >
                This Month ({timeline?.thisMonth?.length || 0})
              </button>
              <button
                type="button"
                className={`timeline-tab-btn ${activeTimelineTab === "next3Months" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("next3Months")}
              >
                Next 3 Months ({timeline?.next3Months?.length || 0})
              </button>
              <button
                type="button"
                className={`timeline-tab-btn ${activeTimelineTab === "next6To12Months" ? "active" : ""}`}
                onClick={() => setActiveTimelineTab("next6To12Months")}
              >
                6–12 Months ({timeline?.next6To12Months?.length || 0})
              </button>
            </div>
          </div>

          {/* Action Cards List */}
          <div className="action-cards-grid">
            {visibleActions.length > 0 ? (
              visibleActions.map((action) => (
                <div key={action.id} className={`action-card glass-panel priority-border-${action.priorityLevel.toLowerCase()} glow-hover`}>
                  <div className="action-card-top">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="category-tag-pill">{action.categoryLabel}</span>
                      <span
                        className={`badge ${
                          action.priorityLevel === "CRITICAL"
                            ? "badge-rose"
                            : action.priorityLevel === "HIGH"
                            ? "badge-amber"
                            : action.priorityLevel === "MEDIUM"
                            ? "badge-blue"
                            : "badge-teal"
                        }`}
                        style={{ fontSize: "10px" }}
                      >
                        {action.priorityLevel}
                      </span>
                    </div>
                    <span className="font-mono text-muted" style={{ fontSize: "11px" }}>{action.priorityScore}/100 Score</span>
                  </div>

                  <div className="action-card-header">
                    <span className="action-card-icon">{action.icon}</span>
                    <h3 className="action-card-title">{action.title}</h3>
                  </div>

                  <div className="action-card-metrics">
                    <div className="action-metric-box">
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>Current</span>
                      <span className="font-bold text-cyan" style={{ fontSize: "12.5px" }}>{action.currentSituation}</span>
                    </div>
                    <div className="action-metric-box">
                      <span className="text-muted" style={{ fontSize: "10.5px" }}>Target</span>
                      <span className="font-bold text-teal" style={{ fontSize: "12.5px" }}>{action.target}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="action-progress-track">
                    <div
                      className="action-progress-fill"
                      style={{
                        width: `${Math.max(5, action.progressPct || 0)}%`,
                        background:
                          action.priorityLevel === "CRITICAL"
                            ? "var(--accent-rose)"
                            : action.priorityLevel === "HIGH"
                            ? "var(--accent-amber)"
                            : "var(--accent-teal)",
                      }}
                    />
                  </div>

                  <p className="action-card-why">
                    <strong>Why it matters:</strong> {action.whyItMatters}
                  </p>

                  <div className="action-card-footer">
                    <Link to={action.actionRoute} className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "12.5px", flex: 1, textAlign: "center" }}>
                      {action.actionLabel} &rarr;
                    </Link>
                    {action.aiPrompt && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 800 }}
                        onClick={() => handleAskAI(action.aiPrompt)}
                        title="Ask AI Decision Lab"
                      >
                        🤖 ASK AI
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted" style={{ padding: "20px", gridColumn: "1 / -1", textAlign: "center" }}>
                No active actions pending in this horizon. All items completed or scheduled.
              </p>
            )}
          </div>
        </div>

        {/* 🌱 GROWTH & DIVERSIFICATION OPPORTUNITIES */}
        <div className="section-card glass-panel" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 800 }}>🌱 Growth & Diversification Opportunities</h3>
              <span className="text-muted" style={{ fontSize: "12.5px" }}>Tailored to your current liquidity foundation and compounding capacity.</span>
            </div>
            <span className={`badge ${growthOpportunity.isReady ? "badge-green" : "badge-amber"}`}>
              {growthOpportunity.headline}
            </span>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.6", maxWidth: "800px" }}>
            {growthOpportunity.description}
          </p>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
            <Link to={growthOpportunity.actionRoute} className="btn btn-primary">
              {growthOpportunity.actionLabel} &rarr;
            </Link>
            {growthOpportunity.isReady && (
              <>
                <Link to="/calculators/sip" className="btn btn-secondary">
                  Run SIP Simulation &rarr;
                </Link>
                <Link to="/wealth-vault" className="btn btn-secondary">
                  Inspect Wealth Vault &rarr;
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 💡 YOUR NEXT ₹10,000 ALLOCATION PLAN */}
        {smartAllocation && (
          <div className="section-card glass-panel" style={{ padding: "28px", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800 }}>💡 Where Your Next ₹10,000 Should Go</h3>
                <span className="text-muted" style={{ fontSize: "12.5px" }}>Dynamic distribution tuned to your emergency buffer, debt obligations, and compounding capacity.</span>
              </div>
              <Link to="/my-next-money" className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }}>
                Interactive Tool &rarr;
              </Link>
            </div>

            <div style={{ margin: "20px 0" }}>
              <AllocationBar slices={smartAllocation.slices} totalAmount={smartAllocation.totalBudget} />
            </div>
          </div>
        )}

        {/* 🤖 ASK WEALTHX AI CONVERSATIONAL PLANNING */}
        <div className="ai-conversational-hub glass-panel">
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="ai-sparkle">✨</span>
              <h3 style={{ fontSize: "17px", fontWeight: 800 }}>Ask WealthX AI About Your Action Plan</h3>
            </div>
            <p className="text-secondary" style={{ fontSize: "13px", lineHeight: "1.5" }}>
              Google Gemini AI analyzes your complete balance sheet to answer custom planning questions and simulate tradeoffs.
            </p>
          </div>

          <div className="ai-preset-questions-grid">
            <button
              type="button"
              className="ai-preset-query-btn"
              onClick={() => handleAskAI("Based on my current emergency runway and cashflow, what is my single highest financial priority?")}
            >
              "What is my single highest financial priority right now?" &rarr;
            </button>
            <button
              type="button"
              className="ai-preset-query-btn"
              onClick={() => handleAskAI("Should I allocate my monthly surplus towards debt reduction or increasing my mutual fund SIP?")}
            >
              "Should I prepay loans or increase my mutual fund SIP?" &rarr;
            </button>
            <button
              type="button"
              className="ai-preset-query-btn"
              onClick={() => handleAskAI("How can I rebalance my portfolio to stay aligned with my Risk DNA target?")}
            >
              "How can I rebalance my portfolio to match my Risk DNA?" &rarr;
            </button>
          </div>
        </div>

        {/* Statutory Educational Disclaimer */}
        <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-md)", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.6" }}>
          ⚖️ <strong>STATUTORY FINANCIAL DISCLAIMER:</strong> The WealthX Strategic Action Plan provides educational prioritization derived algorithmically from mathematical ratios. Recommendations do not constitute SEBI/RBI registered investment advice.
        </div>
      </div>
    </AppLayout>
  );
};

export default ActionPlan;
