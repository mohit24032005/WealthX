import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProgressRing from "../components/charts/ProgressRing";
import AllocationBar from "../components/charts/AllocationBar";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./RiskDNA.css";

const GOAL_OPTIONS = [
  { value: "emergency_reserve", label: "🛡️ Emergency Reserve & Capital Preservation", desc: "Build liquid emergency safety cushion" },
  { value: "short_term", label: "🎯 Short-Term Purchase / Milestone (<2 Years)", desc: "Gadgets, vehicle downpayment, or vacation" },
  { value: "education", label: "🎓 Higher Education Fund", desc: "College tuition or professional upskilling" },
  { value: "house", label: "🏡 Home Purchase & Real Estate", desc: "Accumulating downpayment for property" },
  { value: "retirement", label: "🏖️ Retirement Corpus (Decade Scale)", desc: "Financial independence & pension fund" },
  { value: "wealth_creation", label: "📈 Long-Term Wealth Creation", desc: "Maximize compounding and net worth expansion" },
  { value: "custom", label: "✨ Other Financial Milestone", desc: "Custom investment goal" },
];

const HORIZON_OPTIONS = [
  { value: "<1_year", label: "Less than 1 Year", desc: "Immediate liquidity needed shortly" },
  { value: "1-3_years", label: "1 to 3 Years", desc: "Short term horizon requiring stability" },
  { value: "3-5_years", label: "3 to 5 Years", desc: "Medium term balanced horizon" },
  { value: "5-10_years", label: "5 to 10 Years", desc: "Prime compounding duration" },
  { value: ">10_years", label: "10+ Years (Decade Scale)", desc: "Long-term horizon allowing full equity compounding" },
];

const SCENARIO_1_OPTIONS = [
  { value: "sell_immediately", label: "A. Sell immediately to prevent further loss", desc: "Cannot tolerate seeing capital decline" },
  { value: "wait_recover", label: "B. Wait until the value recovers", desc: "Patiently hold without making changes" },
  { value: "continue_planned", label: "C. Continue my planned regular investment", desc: "Disciplined systematic compounding" },
  { value: "buy_more", label: "D. Invest more because prices have fallen", desc: "View drawdowns as historic buying discounts" },
];

const SCENARIO_2_OPTIONS = [
  { value: "stability_first", label: "A. I strongly prefer stability even if growth is slower", desc: "Defensive capital preservation" },
  { value: "moderate_fluctuations", label: "B. I can accept some fluctuations for better long-term growth", desc: "Balanced risk-reward approach" },
  { value: "significant_fluctuations", label: "C. I am comfortable with significant fluctuations for higher growth", desc: "Growth-oriented posture" },
  { value: "substantial_volatility", label: "D. I am willing to accept substantial volatility for maximum returns", desc: "Aggressive wealth maximization" },
];

const SCENARIO_3_OPTIONS = [
  { value: "very_uncomfortable", label: "A. Very uncomfortable & highly anxious", desc: "Find market downturns stressful" },
  { value: "somewhat_uncomfortable", label: "B. Somewhat uncomfortable, but can manage", desc: "Minor unease during sharp drops" },
  { value: "mostly_comfortable", label: "C. Mostly comfortable and understand market cycles", desc: "Calm long-term perspective" },
  { value: "fully_comfortable", label: "D. Comfortable and willing to continue investing", desc: "Confident in systematic compounding" },
];

export const RiskDNA = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 4-Step Questionnaire Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 to 4
  const [answers, setAnswers] = useState({
    primaryGoal: "wealth_creation",
    goalImportance: "important",
    investmentHorizon: "5-10_years",
    marketDropReaction: "continue_planned",
    growthPreference: "moderate_fluctuations",
    marketCrashFeeling: "mostly_comfortable",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRiskDNA = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/risk-dna");
      if (res && res.data) {
        setData(res.data);
        if (res.data.assessmentAnswers) {
          setAnswers(res.data.assessmentAnswers);
        }
      } else {
        throw new Error(res?.message || "Failed to load Risk DNA profile.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to Risk Profiling engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiskDNA();
  }, [fetchRiskDNA]);

  const handleSelectAnswer = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (wizardStep < 4) {
      setWizardStep((prev) => prev + 1);
    } else {
      handleSubmitAssessment();
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => prev - 1);
    }
  };

  const handleSubmitAssessment = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/api/risk-dna", { answers });
      if (res && res.data) {
        setData((prev) => ({ ...prev, ...res.data, isAssessed: true }));
        setIsWizardOpen(false);
        fetchRiskDNA();
      }
    } catch (err) {
      alert(err.message || "Failed to calculate Risk DNA.");
    } finally {
      setSubmitting(false);
    }
  };

  // Bridge to AI Decision Lab with Full Deterministic Context
  const handleAskAIAboutRisk = () => {
    if (!data) return;
    const score = data.riskScore || 65;
    const cat = data.categoryLabel || "Balanced Growth";
    const tol = data.componentScores?.riskToleranceScore || 70;
    const cap = data.componentScores?.riskCapacityScore || 60;
    const horiz = data.investmentHorizonYears || 7;
    const alloc = data.recommendedAllocation || { equityPct: 70, debtPct: 15, goldPct: 10, cashPct: 5 };

    const query = `Please explain my WealthX Risk DNA (${score}/100 — ${cat}) and how it should govern my real-world investment decisions.
Key Risk Metrics:
- Risk Tolerance: ${tol}/100
- Financial Capacity: ${cap}/100
- Investment Horizon: ${horiz} Years
- Target Allocation: ${alloc.equityPct}% Equity, ${alloc.debtPct}% Debt/FD, ${alloc.goldPct}% Gold, ${alloc.cashPct}% Liquid Cash

Please explain:
1. Why my emotional tolerance and financial capacity resulted in this profile.
2. How I should align my SIPs and mutual funds for my primary financial goal.
3. What risk management guardrails I should establish to protect against market corrections.`;

    navigate("/ai-decision-lab", {
      state: {
        initialQuery: query,
        presetQuery: query,
      },
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Calibrating psychological risk tolerance, goal horizons & financial capacity..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState title="Risk DNA Engine Offline" message={error} onRetry={fetchRiskDNA} />
      </AppLayout>
    );
  }

  const riskScore = data?.riskScore || 65;
  const categoryLabel = data?.categoryLabel || "Balanced Growth (Strategic Compounder)";
  const componentScores = data?.componentScores || {
    riskToleranceScore: 70,
    investmentHorizonScore: 80,
    goalCompatibilityScore: 75,
    riskCapacityScore: 60,
  };
  const toleranceVsCapacity = data?.toleranceVsCapacity || {
    toleranceScore: componentScores.riskToleranceScore,
    capacityScore: componentScores.riskCapacityScore,
    status: "aligned",
    headline: "Tolerance and Capacity are in Balance",
    explanation: "Your willingness to navigate volatility is in harmony with your financial ability to absorb drawdowns.",
  };
  const whyReasons = data?.whyReasons || [];
  const warnings = data?.warnings || [];
  const appliedGuardrails = data?.appliedGuardrails || [];
  const goalCompatibilityList = data?.goalCompatibilityList || [];
  const actualPortfolio = data?.actualPortfolio || {};
  const recommendedAllocation = data?.recommendedAllocation || { equityPct: 70, debtPct: 15, goldPct: 10, cashPct: 5 };
  const portfolioAlignment = data?.portfolioAlignment || {
    status: "aligned",
    badge: "🟢 Balanced Alignment",
    message: "Your portfolio is aligned with your Risk DNA target.",
  };
  const guidance = data?.guidance || [];
  const history = data?.history || [];
  const snapshot = data?.userFinancialSnapshot || {};

  const getRiskScoreColor = (score) => {
    if (score >= 81) return "#8b5cf6"; // Purple (Aggressive)
    if (score >= 61) return "#3b82f6"; // Blue (Growth)
    if (score >= 41) return "#06b6d4"; // Cyan (Balanced)
    if (score >= 21) return "#10b981"; // Teal (Conservative)
    return "#f59e0b"; // Amber (Very Conservative)
  };

  const scoreColor = getRiskScoreColor(riskScore);

  const recommendedSlices = [
    { label: "Equity (Growth)", percentage: recommendedAllocation.equityPct, amount: Math.round((actualPortfolio.totalValue || 100000) * (recommendedAllocation.equityPct / 100)), color: "#3b82f6" },
    { label: "Debt / FDs", percentage: recommendedAllocation.debtPct, amount: Math.round((actualPortfolio.totalValue || 100000) * (recommendedAllocation.debtPct / 100)), color: "#8b5cf6" },
    { label: "Gold (Hedge)", percentage: recommendedAllocation.goldPct, amount: Math.round((actualPortfolio.totalValue || 100000) * (recommendedAllocation.goldPct / 100)), color: "#f59e0b" },
    { label: "Liquid Cash", percentage: recommendedAllocation.cashPct, amount: Math.round((actualPortfolio.totalValue || 100000) * (recommendedAllocation.cashPct / 100)), color: "#10b981" },
  ];

  const actualSlices = [
    { label: "Actual Equity", percentage: actualPortfolio.equityPct || 0, amount: actualPortfolio.equityTotal || 0, color: "#3b82f6" },
    { label: "Actual Debt", percentage: actualPortfolio.debtPct || 0, amount: actualPortfolio.debtTotal || 0, color: "#8b5cf6" },
    { label: "Actual Gold", percentage: actualPortfolio.goldPct || 0, amount: actualPortfolio.goldTotal || 0, color: "#f59e0b" },
    ...(Number(actualPortfolio.otherTotal || 0) > 0 ? [
      { label: "Real Estate / Other", percentage: actualPortfolio.otherPct || 0, amount: actualPortfolio.otherTotal || 0, color: "#06b6d4" }
    ] : []),
    { label: "Actual Cash", percentage: actualPortfolio.cashPct || 0, amount: actualPortfolio.cashTotal || 0, color: "#10b981" },
  ];

  // Calculate Spectrum Indicator Position (0% to 100%)
  const spectrumPositionPct = Math.min(96, Math.max(4, riskScore));

  return (
    <AppLayout disclaimerVariant="general">
      <div className="risk-dna-view">
        {/* Header */}
        <div className="risk-header-row">
          <div>
            <h1 className="risk-title">Your Risk DNA</h1>
            <p className="risk-sub">
              A quantified, deterministic evaluation of your <strong>Financial Goals</strong>, <strong>Investment Horizon</strong>, <strong>Psychological Risk Tolerance</strong>, and <strong>Financial Capacity</strong>.
            </p>
          </div>
          <div className="risk-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAskAIAboutRisk}
            >
              🤖 Ask AI About My Risk →
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setWizardStep(1);
                setIsWizardOpen(true);
              }}
            >
              🧬 {data?.isAssessed === false ? "Build Your Risk DNA" : "Retake Assessment"}
            </button>
          </div>
        </div>

        {/* Level 1: Primary Score & Risk Spectrum Card */}
        <div className="risk-hero-card glass-panel glow-hover">
          <div className="risk-hero-top">
            <div className="risk-hero-left">
              <ProgressRing
                score={riskScore}
                size={130}
                strokeWidth={10}
                color={scoreColor}
                label="/ 100 Score"
              />
              <div className="risk-hero-title-box">
                <span className="welcome-tag" style={{ color: scoreColor }}>
                  Quantified Risk Profile
                </span>
                <h2 className="risk-category-name">{categoryLabel}</h2>
                <p className="risk-category-desc">{data?.explanation}</p>
              </div>
            </div>

            <div className="risk-hero-stats-grid">
              <div className="risk-stat-item">
                <span className="stat-box-label">Risk Tolerance</span>
                <span className="stat-box-val font-bold" style={{ color: getRiskScoreColor(componentScores.riskToleranceScore) }}>
                  {componentScores.riskToleranceScore} / 100
                </span>
                <span className="stat-box-sub">Psychological</span>
              </div>
              <div className="risk-stat-item">
                <span className="stat-box-label">Investment Horizon</span>
                <span className="stat-box-val font-bold text-cyan">
                  {data?.investmentHorizonYears} Years
                </span>
                <span className="stat-box-sub">{componentScores.investmentHorizonScore} / 100</span>
              </div>
              <div className="risk-stat-item">
                <span className="stat-box-label">Financial Capacity</span>
                <span className="stat-box-val font-bold text-teal">
                  {componentScores.riskCapacityScore} / 100
                </span>
                <span className="stat-box-sub">Liquid Reserves</span>
              </div>
              <div className="risk-stat-item">
                <span className="stat-box-label">Goal Compatibility</span>
                <span className="stat-box-val font-bold text-amber">
                  {componentScores.goalCompatibilityScore} / 100
                </span>
                <span className="stat-box-sub">Priority Alignment</span>
              </div>
            </div>
          </div>

          {/* Continuous Risk Spectrum Bar */}
          <div className="risk-spectrum-wrap">
            <div className="risk-spectrum-labels">
              <span className="spectrum-label">Very Conservative (0-20)</span>
              <span className="spectrum-label">Conservative (21-40)</span>
              <span className="spectrum-label">Balanced (41-60)</span>
              <span className="spectrum-label">Growth (61-80)</span>
              <span className="spectrum-label">Aggressive (81-100)</span>
            </div>
            <div className="risk-spectrum-track">
              <div
                className="risk-spectrum-marker"
                style={{ left: `${spectrumPositionPct}%`, borderColor: scoreColor }}
              >
                <span className="marker-pin" style={{ backgroundColor: scoreColor }}></span>
                <span className="marker-label" style={{ color: scoreColor }}>
                  {riskScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Applied Guardrails Alert (if triggered) */}
        {appliedGuardrails.length > 0 && (
          <div className="guardrail-alert-box glass-panel">
            <span className="guardrail-icon">🛡️</span>
            <div>
              <h4 className="guardrail-title">Institutional Safety Guardrails Applied</h4>
              {appliedGuardrails.map((g, i) => (
                <p key={i} className="guardrail-msg">{g.message}</p>
              ))}
            </div>
          </div>
        )}

        {/* Level 2: Component Breakdown & Tolerance vs Capacity Analysis */}
        <div className="risk-grid-2col">
          {/* Component Score Progress Bars */}
          <div className="section-card glass-panel">
            <h3 className="card-section-title">📊 4 Core Factor Component Breakdown</h3>
            <p className="card-section-sub">
              Evaluating the 3 mandatory IEEE factors alongside real-world financial situation:
            </p>

            <div className="pillar-bars-list">
              <div className="pillar-bar-item">
                <div className="pillar-bar-header">
                  <span className="pillar-name">1. Risk Tolerance (Psychological Appetite)</span>
                  <span className="pillar-score font-mono font-bold" style={{ color: getRiskScoreColor(componentScores.riskToleranceScore) }}>
                    {componentScores.riskToleranceScore} / 100
                  </span>
                </div>
                <div className="pillar-bar-track">
                  <div
                    className="pillar-bar-fill"
                    style={{ width: `${componentScores.riskToleranceScore}%`, backgroundColor: getRiskScoreColor(componentScores.riskToleranceScore) }}
                  />
                </div>
              </div>

              <div className="pillar-bar-item">
                <div className="pillar-bar-header">
                  <span className="pillar-name">2. Investment Horizon (Compounding Time)</span>
                  <span className="pillar-score font-mono font-bold text-cyan">
                    {componentScores.investmentHorizonScore} / 100 ({data?.investmentHorizonYears}y)
                  </span>
                </div>
                <div className="pillar-bar-track">
                  <div
                    className="pillar-bar-fill"
                    style={{ width: `${componentScores.investmentHorizonScore}%`, backgroundColor: "#06b6d4" }}
                  />
                </div>
              </div>

              <div className="pillar-bar-item">
                <div className="pillar-bar-header">
                  <span className="pillar-name">3. Goal Compatibility (Purpose & Urgency)</span>
                  <span className="pillar-score font-mono font-bold text-amber">
                    {componentScores.goalCompatibilityScore} / 100
                  </span>
                </div>
                <div className="pillar-bar-track">
                  <div
                    className="pillar-bar-fill"
                    style={{ width: `${componentScores.goalCompatibilityScore}%`, backgroundColor: "#f59e0b" }}
                  />
                </div>
              </div>

              <div className="pillar-bar-item">
                <div className="pillar-bar-header">
                  <span className="pillar-name">4. Financial Capacity (Runway & Cashflow)</span>
                  <span className="pillar-score font-mono font-bold text-teal">
                    {componentScores.riskCapacityScore} / 100
                  </span>
                </div>
                <div className="pillar-bar-track">
                  <div
                    className="pillar-bar-fill"
                    style={{ width: `${componentScores.riskCapacityScore}%`, backgroundColor: "#10b981" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Risk Tolerance vs Financial Capacity Visual & Analysis */}
          <div className="section-card glass-panel">
            <h3 className="card-section-title">⚖️ Risk Tolerance vs. Financial Capacity</h3>
            <p className="card-section-sub">
              Differentiating emotional appetite from real ability to absorb losses:
            </p>

            <div className="tolerance-capacity-comparison-box">
              <div className="tc-metrics-row">
                <div className="tc-metric-card">
                  <span className="tc-label">Emotional Tolerance</span>
                  <span className="tc-val font-mono" style={{ color: getRiskScoreColor(toleranceVsCapacity.toleranceScore) }}>
                    {toleranceVsCapacity.toleranceScore}
                  </span>
                  <span className="tc-sub">Willingness to endure drawdowns</span>
                </div>

                <div className="tc-divider-arrow">↔</div>

                <div className="tc-metric-card">
                  <span className="tc-label">Financial Capacity</span>
                  <span className="tc-val font-mono text-teal">
                    {toleranceVsCapacity.capacityScore}
                  </span>
                  <span className="tc-sub">Runway & debt absorption power</span>
                </div>
              </div>

              <div className={`tc-insight-banner tc-status-${toleranceVsCapacity.status}`}>
                <h4 className="tc-headline">
                  {toleranceVsCapacity.status === "aligned" ? "✅ " : "⚠️ "}
                  {toleranceVsCapacity.headline}
                </h4>
                <p className="tc-explanation">{toleranceVsCapacity.explanation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Level 3: Why This Profile & Goal Compatibility */}
        <div className="risk-grid-2col">
          {/* Why WealthX Classified You This Way */}
          <div className="section-card glass-panel">
            <h3 className="card-section-title">🧬 Why WealthX Classified You This Way</h3>
            <div className="reasons-list">
              {whyReasons.map((reason, idx) => (
                <div key={idx} className="reason-item positive">
                  <span className="reason-icon">✓</span>
                  <span className="reason-text">{reason}</span>
                </div>
              ))}
              {warnings.map((warn, idx) => (
                <div key={idx} className="reason-item warning">
                  <span className="reason-icon">⚠</span>
                  <span className="reason-text">{warn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Compatibility Matrix */}
          <div className="section-card glass-panel">
            <h3 className="card-section-title">🎯 Goal Compatibility Assessment</h3>
            <p className="card-section-sub">
              How your Risk DNA interacts with your active WealthX goals:
            </p>
            <div className="goals-compatibility-list">
              {goalCompatibilityList.map((g, idx) => (
                <div key={idx} className="goal-compatibility-item">
                  <div className="gc-top-row">
                    <span className="gc-title font-bold">{g.title}</span>
                    <span className="gc-badge">{g.suitabilityTag}</span>
                  </div>
                  <p className="gc-note">{g.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level 4: Recommended Allocation vs Current Portfolio */}
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <h3 className="card-section-title">🎯 Recommended Allocation vs. Your Current Portfolio</h3>
              <p className="card-section-sub">
                Comparing your target Risk DNA distribution against assets tracked in Wealth Vault:
              </p>
            </div>
            <Link to="/wealth-vault" className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "12px" }}>
              Manage Vault Assets &rarr;
            </Link>
          </div>

          {/* Allocation Comparison Visualizer */}
          <div className="allocation-compare-container">
            {/* Target */}
            <div className="allocation-side-box">
              <div className="allocation-side-header">
                <span className="font-bold text-teal">🎯 Target Risk DNA Allocation</span>
                <span className="badge badge-green">Recommended</span>
              </div>
              <AllocationBar slices={recommendedSlices} total={actualPortfolio.totalValue || 100000} showCards={true} />
            </div>

            {/* Actual */}
            <div className="allocation-side-box">
              <div className="allocation-side-header">
                <span className="font-bold text-cyan">🏦 Your Actual Portfolio Holdings</span>
                <span className="badge badge-blue">Wealth Vault</span>
              </div>
              <AllocationBar slices={actualSlices} total={actualPortfolio.totalValue || 100000} showCards={true} />
            </div>
          </div>

          {/* Alignment Insight */}
          <div className={`portfolio-alignment-card status-${portfolioAlignment.status}`}>
            <div className="alignment-header">
              <span className="alignment-badge">{portfolioAlignment.badge}</span>
              <p className="alignment-msg">{portfolioAlignment.message}</p>
            </div>
          </div>
        </div>

        {/* Level 5: Personalized Guidance & Action Plan Connection */}
        <div className="risk-grid-2col">
          <div className="section-card glass-panel">
            <h3 className="card-section-title">🧭 Personalized Behavioral Guidance</h3>
            <ul className="guidance-bullets-list">
              {guidance.map((guide, idx) => (
                <li key={idx} className="guidance-bullet-item">{guide}</li>
              ))}
            </ul>
          </div>

          <div className="section-card glass-panel cta-action-card">
            <h3 className="card-section-title">🚀 Connect with Financial Ecosystem</h3>
            <p className="card-section-sub">
              Your Risk DNA directly synchronizes with all WealthX intelligence modules:
            </p>
            <div className="ecosystem-links-grid">
              <Link to="/financial-xray" className="eco-link-item">
                <span className="eco-icon">🔬</span>
                <div>
                  <span className="eco-title">Financial X-Ray</span>
                  <span className="eco-desc">View financial health score & emergency runway</span>
                </div>
              </Link>
              <Link to="/action-plan" className="eco-link-item">
                <span className="eco-icon">📋</span>
                <div>
                  <span className="eco-title">Action Plan</span>
                  <span className="eco-desc">Prioritized steps for savings and asset rebalancing</span>
                </div>
              </Link>
              <Link to="/investments" className="eco-link-item">
                <span className="eco-icon">📊</span>
                <div>
                  <span className="eco-title">Investment Explorer</span>
                  <span className="eco-desc">Discover AMFI mutual funds tailored to your Risk DNA</span>
                </div>
              </Link>
              <button type="button" className="eco-link-item btn-as-link" onClick={handleAskAIAboutRisk}>
                <span className="eco-icon">🤖</span>
                <div>
                  <span className="eco-title">AI Decision Lab</span>
                  <span className="eco-desc">Deep-dive into portfolio simulations with AI mentor</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Assessment History (if available) */}
        {history.length > 0 && (
          <div className="section-card glass-panel">
            <h3 className="card-section-title">📜 Risk DNA Evolution History</h3>
            <div className="history-timeline-list">
              {history.map((h, idx) => (
                <div key={idx} className="history-row">
                  <span className="history-date font-mono">{new Date(h.date).toLocaleDateString("en-IN")}</span>
                  <span className="history-score font-mono font-bold" style={{ color: getRiskScoreColor(h.score) }}>
                    {h.score} / 100
                  </span>
                  <span className="history-label">{h.categoryLabel}</span>
                  <span className="history-reason text-muted">{h.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4-Step Questionnaire Wizard Modal */}
        {isWizardOpen && (
          <div className="modal-backdrop" onClick={() => setIsWizardOpen(false)}>
            <div className="modal-card wizard-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="wizard-progress-header">
                <div className="wizard-progress-track">
                  <div
                    className="wizard-progress-fill"
                    style={{ width: `${(wizardStep / 4) * 100}%` }}
                  />
                </div>
                <div className="wizard-step-counter">
                  STEP {wizardStep} OF 4
                </div>
              </div>

              {/* STEP 1: FINANCIAL GOALS */}
              {wizardStep === 1 && (
                <div className="wizard-question-box">
                  <h3 className="wizard-q-title">Step 1: Financial Goals & Importance</h3>
                  <p className="wizard-q-sub">
                    What is your overarching primary financial objective, and how flexible is this goal?
                  </p>

                  <div className="wizard-form-subgroup">
                    <label className="wizard-sub-label">Primary Investment Objective:</label>
                    <div className="wizard-options-list">
                      {GOAL_OPTIONS.map((opt) => {
                        const isSelected = answers.primaryGoal === opt.value;
                        return (
                          <div
                            key={opt.value}
                            className={`wizard-opt-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectAnswer("primaryGoal", opt.value)}
                          >
                            <div className="wizard-radio-circle">
                              {isSelected && <span className="wizard-radio-dot" />}
                            </div>
                            <div>
                              <div className="wizard-opt-label">{opt.label}</div>
                              <div className="wizard-opt-desc">{opt.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="wizard-form-subgroup" style={{ marginTop: "16px" }}>
                    <label className="wizard-sub-label">How important is this goal?</label>
                    <div className="wizard-importance-row">
                      {[
                        { value: "essential", label: "🔴 Essential (Non-Negotiable)", desc: "Must be protected" },
                        { value: "important", label: "🟡 Important (Standard Priority)", desc: "Core target" },
                        { value: "flexible", label: "🟢 Flexible (Growth Focus)", desc: "Can adjust timeline" },
                      ].map((imp) => (
                        <button
                          type="button"
                          key={imp.value}
                          className={`importance-pill-btn ${answers.goalImportance === imp.value ? "active" : ""}`}
                          onClick={() => handleSelectAnswer("goalImportance", imp.value)}
                        >
                          <span className="font-bold">{imp.label}</span>
                          <span className="text-muted" style={{ fontSize: "11px" }}>{imp.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: INVESTMENT HORIZON */}
              {wizardStep === 2 && (
                <div className="wizard-question-box">
                  <h3 className="wizard-q-title">Step 2: Investment Horizon Duration</h3>
                  <p className="wizard-q-sub">
                    How long can you keep this money invested without needing to withdraw it?
                  </p>

                  <div className="wizard-educational-callout">
                    💡 <strong>Investor Principle:</strong> Longer investment horizons give investors more time to recover from cyclical market volatility, though all market investments carry risk.
                  </div>

                  <div className="wizard-options-list">
                    {HORIZON_OPTIONS.map((opt) => {
                      const isSelected = answers.investmentHorizon === opt.value;
                      return (
                        <div
                          key={opt.value}
                          className={`wizard-opt-item ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectAnswer("investmentHorizon", opt.value)}
                        >
                          <div className="wizard-radio-circle">
                            {isSelected && <span className="wizard-radio-dot" />}
                          </div>
                          <div>
                            <div className="wizard-opt-label font-bold">{opt.label}</div>
                            <div className="wizard-opt-desc">{opt.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: RISK TOLERANCE (SCENARIO-BASED) */}
              {wizardStep === 3 && (
                <div className="wizard-question-box">
                  <h3 className="wizard-q-title">Step 3: Psychological Risk Tolerance</h3>
                  <p className="wizard-q-sub">
                    Scenario-based questions measuring your emotional composure under market stress:
                  </p>

                  {/* Scenario 1 */}
                  <div className="wizard-form-subgroup">
                    <label className="wizard-sub-label font-bold">
                      1. Your ₹1,00,000 investment temporarily falls to ₹80,000 (-20%). What would you do?
                    </label>
                    <div className="wizard-options-grid-2">
                      {SCENARIO_1_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          className={`scenario-card-btn ${answers.marketDropReaction === opt.value ? "active" : ""}`}
                          onClick={() => handleSelectAnswer("marketDropReaction", opt.value)}
                        >
                          <span className="scenario-label font-bold">{opt.label}</span>
                          <span className="scenario-desc">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scenario 2 */}
                  <div className="wizard-form-subgroup" style={{ marginTop: "16px" }}>
                    <label className="wizard-sub-label font-bold">
                      2. Which statement best describes your risk-return mindset?
                    </label>
                    <div className="wizard-options-grid-2">
                      {SCENARIO_2_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          className={`scenario-card-btn ${answers.growthPreference === opt.value ? "active" : ""}`}
                          onClick={() => handleSelectAnswer("growthPreference", opt.value)}
                        >
                          <span className="scenario-label font-bold">{opt.label}</span>
                          <span className="scenario-desc">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scenario 3 */}
                  <div className="wizard-form-subgroup" style={{ marginTop: "16px" }}>
                    <label className="wizard-sub-label font-bold">
                      3. If markets fall sharply for a short period, how would you feel?
                    </label>
                    <div className="wizard-options-grid-2">
                      {SCENARIO_3_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          className={`scenario-card-btn ${answers.marketCrashFeeling === opt.value ? "active" : ""}`}
                          onClick={() => handleSelectAnswer("marketCrashFeeling", opt.value)}
                        >
                          <span className="scenario-label font-bold">{opt.label}</span>
                          <span className="scenario-desc">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: FINANCIAL CAPACITY PREVIEW */}
              {wizardStep === 4 && (
                <div className="wizard-question-box">
                  <h3 className="wizard-q-title">Step 4: Financial Capacity & Reserves</h3>
                  <p className="wizard-q-sub">
                    Evaluating your real financial ability to absorb market drawdowns without distress:
                  </p>

                  <div className="capacity-preview-grid">
                    <div className="cap-stat-card">
                      <span className="cap-label">Monthly Inflow</span>
                      <span className="cap-val font-mono text-teal">
                        ₹{(snapshot.monthlyIncome || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="cap-stat-card">
                      <span className="cap-label">Monthly Expenses</span>
                      <span className="cap-val font-mono text-rose">
                        ₹{(snapshot.monthlyExpenses || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="cap-stat-card">
                      <span className="cap-label">Monthly Surplus</span>
                      <span className="cap-val font-mono text-cyan">
                        ₹{Math.max(0, (snapshot.monthlyIncome || 0) - (snapshot.monthlyExpenses || 0)).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="cap-stat-card">
                      <span className="cap-label">Liquid Savings</span>
                      <span className="cap-val font-mono text-amber">
                        ₹{(snapshot.currentSavings || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="capacity-notice-box">
                    💡 <strong>Live Calibration:</strong> WealthX dynamically combines your stated psychological tolerance with your live financial reserves. You can adjust your income and expenses in <strong>Settings</strong> at any time.
                  </div>
                </div>
              )}

              <div className="wizard-actions-bar">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevStep}
                  disabled={wizardStep === 1 || submitting}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                  disabled={submitting}
                >
                  {submitting
                    ? "Calculating Risk DNA..."
                    : wizardStep === 4
                    ? "🧬 Calculate My Risk DNA →"
                    : `Next: Step ${wizardStep + 1} →`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RiskDNA;
