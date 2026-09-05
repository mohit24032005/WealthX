import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import DonutChart from "../components/charts/DonutChart";
import LineChart from "../components/charts/LineChart";
import Disclaimer from "../components/common/Disclaimer";
import api from "../utils/apiClient";
import "./InvestorQuest.css";

const GAME_MODES = [
  {
    id: "quick_play",
    title: "⚡ Quick Play",
    tagline: "5-Year Horizon • 12 Turns",
    desc: "Experience market cycles, emergency defenses, and SIP compounding in an accelerated 10-minute simulation.",
    badge: "Recommended",
    badgeColor: "badge-green",
    duration: "10-15 Mins",
  },
  {
    id: "career",
    title: "💼 Career Mode",
    tagline: "10-Year Journey • 24 Turns",
    desc: "Navigate promotions, inflation spikes, real estate milestones, and long-term multi-cycle wealth expansion.",
    badge: "Deep Dive",
    badgeColor: "badge-blue",
    duration: "20-25 Mins",
  },
  {
    id: "learn_challenge",
    title: "🧠 Learn Mode",
    tagline: "Emergency & Volatility Focus",
    desc: "Targeted challenge testing how well you navigate sudden market corrections and high-severity life expenses.",
    badge: "Challenge",
    badgeColor: "badge-purple",
    duration: "5-8 Mins",
  },
];

const InvestorQuest = () => {
  const navigate = useNavigate();

  // Screen Stages: "landing" | "setup" | "playing" | "game_over"
  const [stage, setStage] = useState("landing");
  const [selectedMode, setSelectedMode] = useState("quick_play");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Config & Snapshot
  const [initLoading, setInitLoading] = useState(true);
  const [profileSnapshot, setProfileSnapshot] = useState(null);
  const [hasRealProfile, setHasRealProfile] = useState(false);
  const [setupType, setSetupType] = useState("profile"); // "profile" | "custom"

  // Custom Setup Form State
  const [customIncome, setCustomIncome] = useState(50000);
  const [customExpenses, setCustomExpenses] = useState(30000);
  const [customSavings, setCustomSavings] = useState(40000);
  const [customGoalTarget, setCustomGoalTarget] = useState(500000);
  const [customGoalTitle, setCustomGoalTitle] = useState("5-Year Wealth Milestone");

  // Game Engine State
  const [gameState, setGameState] = useState(null);
  const [turnLoading, setTurnLoading] = useState(false);
  const [lastTurnResult, setLastTurnResult] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState("balanced_split");
  const [customSplits, setCustomSplits] = useState({
    emergencyPct: 30,
    mfPct: 40,
    stocksPct: 15,
    goldPct: 15,
  });

  // Interactive AI Mentor Chat
  const [mentorQuery, setMentorQuery] = useState("");
  const [mentorChatHistory, setMentorChatHistory] = useState([]);
  const [mentorAsking, setMentorAsking] = useState(false);

  // End Game What-If Trajectory
  const [whatIfData, setWhatIfData] = useState(null);

  // 1. Fetch initial configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      setInitLoading(true);
      try {
        const res = await api.get("/api/investor-quest/config");
        const respData = res.data?.data || res.data;
        if (respData) {
          setHasRealProfile(respData.hasRealProfile);
          setProfileSnapshot(respData.profileSnapshot);
          if (!respData.hasRealProfile) {
            setSetupType("custom");
          }
        }
      } catch (err) {
        console.warn("Failed to load quest config:", err);
      } finally {
        setInitLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // 2. Start new simulation
  const handleStartSimulation = async () => {
    setTurnLoading(true);
    try {
      const payload = {
        mode: selectedMode,
        useProfileSnapshot: setupType === "profile",
        customConfig:
          setupType === "custom"
            ? {
                monthlyIncome: Number(customIncome),
                monthlyExpenses: Number(customExpenses),
                startingSavings: Number(customSavings),
                goalTarget: Number(customGoalTarget),
                goalTitle: customGoalTitle,
              }
            : {},
      };

      const res = await api.post("/api/investor-quest/start", payload);
      const respData = res.data?.data || res.data;

      if (respData) {
        setGameState(respData);
        setLastTurnResult(null);
        setMentorChatHistory([]);
        setStage("playing");
      }
    } catch (err) {
      console.error("Start simulation failed, using offline simulator state:", err);
      // Client-side fallback state
      const defaultIncome = setupType === "custom" ? Number(customIncome) : (profileSnapshot?.monthlyIncome || 50000);
      const defaultExpenses = setupType === "custom" ? Number(customExpenses) : (profileSnapshot?.monthlyExpenses || 30000);
      const defaultSavings = setupType === "custom" ? Number(customSavings) : (profileSnapshot?.currentSavings || 40000);
      const defaultGoal = setupType === "custom" ? Number(customGoalTarget) : (profileSnapshot?.goalTarget || 500000);

      const fallbackState = {
        mode: selectedMode,
        currentTurn: 1,
        totalTurns: selectedMode === "career" ? 24 : 12,
        turnDurationMonths: 5,
        simulatedMonthsElapsed: 0,
        isCompleted: false,
        monthlyIncome: defaultIncome,
        monthlyExpenses: defaultExpenses,
        liquidCash: defaultSavings,
        emergencyFund: Math.min(defaultSavings, defaultExpenses * 3),
        debt: 0,
        portfolio: {
          cash: Math.max(0, defaultSavings - Math.min(defaultSavings, defaultExpenses * 3)),
          debt: 0,
          mutual_funds: 40000,
          stocks: 20000,
          gold: 10000,
        },
        totalContributions: defaultSavings + 70000,
        startingNetWorth: defaultSavings + 70000,
        peakNetWorth: defaultSavings + 70000,
        maxDrawdownPct: 0,
        goal: {
          title: customGoalTitle || "Wealth Milestone",
          targetAmount: defaultGoal,
          timeHorizonYears: 5,
        },
        riskCategoryLabel: profileSnapshot?.riskCategoryLabel || "Moderate Growth",
        history: [],
        events: [],
        achievements: [],
        strategyScores: {
          overall: 75,
          emergencyPreparedness: 65,
          diversification: 75,
          riskManagement: 80,
          goalDiscipline: 70,
          savingsDiscipline: 85,
        },
      };
      setGameState(fallbackState);
      setLastTurnResult(null);
      setMentorChatHistory([]);
      setStage("playing");
    } finally {
      setTurnLoading(false);
    }
  };

  // 3. Process turn decision
  const handleExecuteTurn = async () => {
    if (!gameState || turnLoading) return;
    setTurnLoading(true);

    try {
      const payload = {
        state: gameState,
        decision: {
          allocationType: selectedAllocation,
          customSplits: selectedAllocation === "custom" ? customSplits : null,
        },
      };

      const res = await api.post("/api/investor-quest/turn", payload);
      const respData = res.data?.data || res.data;

      if (respData) {
        setGameState(respData.state);
        setLastTurnResult(respData);

        // If completed, trigger What-If analysis
        if (respData.state.isCompleted) {
          fetchWhatIfAnalysis(respData.state);
          setStage("game_over");
        }
      }
    } catch (err) {
      console.error("Turn execution failed:", err);
    } finally {
      setTurnLoading(false);
    }
  };

  // 4. Fetch What-If Analysis
  const fetchWhatIfAnalysis = async (state) => {
    try {
      const res = await api.post("/api/investor-quest/what-if", { state });
      const respData = res.data?.data || res.data;
      if (respData) {
        setWhatIfData(respData);
      }
    } catch (err) {
      console.warn("What-if analysis error:", err);
    }
  };

  // 5. Ask WealthX Mentor in-game question
  const handleAskMentor = async (e) => {
    e?.preventDefault();
    if (!mentorQuery.trim() || mentorAsking) return;

    const userQ = mentorQuery.trim();
    setMentorQuery("");
    setMentorAsking(true);

    const tempHistory = [...mentorChatHistory, { sender: "user", text: userQ }];
    setMentorChatHistory(tempHistory);

    try {
      const res = await api.post("/api/investor-quest/ask-mentor", {
        question: userQ,
        gameState,
      });
      const respData = res.data?.data || res.data;

      if (respData) {
        setMentorChatHistory([
          ...tempHistory,
          {
            sender: "mentor",
            text: respData.answer,
            conceptTip: respData.conceptTip,
          },
        ]);
      }
    } catch (err) {
      setMentorChatHistory([
        ...tempHistory,
        {
          sender: "mentor",
          text: "Market volatility is a normal feature of growth investing. Staying diversified and keeping emergency reserves preserves your long-term wealth compounding.",
        },
      ]);
    } finally {
      setMentorAsking(false);
    }
  };

  // 6. Ask AI Decision Lab about score & simulation decisions
  const handleAskAIAboutScore = () => {
    if (!gameState) return;
    const overallScore = gameState.strategyScores?.overall || 80;
    const epScore = gameState.strategyScores?.emergencyPreparedness || 0;
    const divScore = gameState.strategyScores?.diversification || 0;
    const rmScore = gameState.strategyScores?.riskManagement || 0;
    const gdScore = gameState.strategyScores?.goalDiscipline || 0;
    const finWealth = currentNetWorth || 0;
    const startWealth = gameState.startingNetWorth || 0;
    const totContrib = gameState.totalContributions || 0;

    const analysisPrompt = `I just completed an Investor Quest simulation session in ${gameState.mode === "career" ? "Career Mode (10-Year)" : "Quick Play (5-Year)"} with an overall Wealth Strategy Score of ${overallScore}/100.
Pillar Breakdown:
- Emergency Preparedness: ${epScore}%
- Asset Diversification: ${divScore}%
- Risk Management: ${rmScore}%
- Goal Discipline: ${gdScore}%

Financial Outcome:
- Starting Net Worth: ₹${startWealth.toLocaleString("en-IN")}
- Total Surplus Contributed: ₹${totContrib.toLocaleString("en-IN")}
- Final Virtual Wealth: ₹${finWealth.toLocaleString("en-IN")}
- Goal Target: ₹${gameState.goal?.targetAmount?.toLocaleString("en-IN")} (${goalProgressPct}% achieved)

Please evaluate my simulation decisions, explain where I demonstrated financial discipline, analyze where my allocations exposed me to drawdown or distress risks, and suggest 3 concrete steps to optimize my real-world portfolio.`;

    navigate("/ai-decision-lab", {
      state: {
        initialQuery: analysisPrompt,
        presetQuery: analysisPrompt,
      },
    });
  };

  const handleAskMentorDirectly = async (queryText) => {
    if (!queryText?.trim() || mentorAsking) return;
    const userQ = queryText.trim();
    setMentorAsking(true);
    const tempHistory = [...mentorChatHistory, { sender: "user", text: userQ }];
    setMentorChatHistory(tempHistory);

    try {
      const res = await api.post("/api/investor-quest/ask-mentor", {
        question: userQ,
        gameState,
      });
      const respData = res.data?.data || res.data;
      if (respData) {
        setMentorChatHistory([
          ...tempHistory,
          {
            sender: "mentor",
            text: respData.answer,
            conceptTip: respData.conceptTip,
          },
        ]);
      }
    } catch (err) {
      setMentorChatHistory([
        ...tempHistory,
        {
          sender: "mentor",
          text: "Your strategy balanced liquidity with capital growth. Maintaining 6 months of emergency reserves and consistent asset allocation will protect your long-term compounding.",
        },
      ]);
    } finally {
      setMentorAsking(false);
    }
  };

  // 7. Reset simulation
  const handleRestartGame = () => {
    setShowRestartConfirm(false);
    setGameState(null);
    setLastTurnResult(null);
    setStage("landing");
  };

  // 8. Computed Metrics & Visual Chart Data
  const currentNetWorth = useMemo(() => {
    if (!gameState) return 0;
    const p = gameState.portfolio || {};
    return (
      (p.stocks || 0) +
      (p.mutual_funds || 0) +
      (p.debt || 0) +
      (p.gold || 0) +
      (gameState.emergencyFund || 0) +
      (gameState.liquidCash || 0) -
      (gameState.debt || 0)
    );
  }, [gameState]);

  const emergencyMonths = useMemo(() => {
    if (!gameState || !gameState.monthlyExpenses) return 0;
    return Number((gameState.emergencyFund / gameState.monthlyExpenses).toFixed(1));
  }, [gameState]);

  const goalProgressPct = useMemo(() => {
    if (!gameState || !gameState.goal?.targetAmount) return 0;
    return Math.min(100, Math.round((currentNetWorth / gameState.goal.targetAmount) * 100));
  }, [gameState, currentNetWorth]);

  // Donut chart asset distribution
  const portfolioDonutData = useMemo(() => {
    if (!gameState) return [];
    const p = gameState.portfolio || {};
    return [
      { label: "Mutual Funds", value: p.mutual_funds || 0, color: "#10b981" },
      { label: "Direct Equities", value: p.stocks || 0, color: "#06b6d4" },
      { label: "Emergency Buffer", value: gameState.emergencyFund || 0, color: "#3b82f6" },
      { label: "Digital Gold", value: p.gold || 0, color: "#f59e0b" },
      { label: "Liquid Cash", value: gameState.liquidCash || 0, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [gameState]);

  // Line chart wealth growth history
  const wealthGrowthHistory = useMemo(() => {
    if (!gameState || !gameState.history || gameState.history.length === 0) {
      return [{ x: "T0", y: gameState?.startingNetWorth || 100000 }];
    }
    const points = [{ x: "Start", y: gameState.startingNetWorth }];
    gameState.history.forEach((h) => {
      points.push({ x: `T${h.turnNumber}`, y: h.netWorth });
    });
    return points;
  }, [gameState]);

  return (
    <AppLayout>
      <div className="investor-quest-container">
        {/* ========================================================
            STAGE 1: LANDING SCREEN
        ======================================================== */}
        {stage === "landing" && (
          <div className="quest-landing-screen">
            {/* Hero Banner */}
            <div className="quest-hero-banner glass-panel">
              <div className="quest-hero-header">
                <span className="quest-simulator-badge">
                  <span className="live-pulse-dot"></span> FINANCIAL LEARNING SIMULATOR
                </span>
                <h1 className="quest-hero-title">
                  🎮 Investor Quest
                </h1>
                <p className="quest-hero-tagline">
                  "Learn. Decide. Invest. Grow."
                </p>
                <p className="quest-hero-description">
                  Build your financial future through consequence-driven simulation.
                  Experience real market volatility, manage cashflows, build emergency buffers,
                  and learn how disciplined investing protects and multiplies your wealth.
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="quest-features-grid">
                <div className="quest-feature-pill">
                  <span className="feat-icon">🎮</span>
                  <div>
                    <strong>Risk-Free Simulation</strong>
                    <span>100% virtual sandbox with no real money</span>
                  </div>
                </div>
                <div className="quest-feature-pill">
                  <span className="feat-icon">🤖</span>
                  <div>
                    <strong>AI Financial Mentor</strong>
                    <span>Real-time feedback explaining every decision</span>
                  </div>
                </div>
                <div className="quest-feature-pill">
                  <span className="feat-icon">📊</span>
                  <div>
                    <strong>Dynamic Portfolio</strong>
                    <span>Stocks, Mutual Funds, SGB Gold & Debt assets</span>
                  </div>
                </div>
                <div className="quest-feature-pill">
                  <span className="feat-icon">🎯</span>
                  <div>
                    <strong>Goal-Based Milestones</strong>
                    <span>Track progress toward home, independence, or retirement</span>
                  </div>
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="quest-modes-section">
                <h3 className="section-mini-label">SELECT SIMULATION MODE</h3>
                <div className="quest-modes-grid">
                  {GAME_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      className={`quest-mode-card ${selectedMode === mode.id ? "mode-selected" : ""}`}
                      onClick={() => setSelectedMode(mode.id)}
                    >
                      <div className="mode-card-header">
                        <h4>{mode.title}</h4>
                        <span className={`badge ${mode.badgeColor}`}>{mode.badge}</span>
                      </div>
                      <span className="mode-tagline">{mode.tagline}</span>
                      <p className="mode-desc">{mode.desc}</p>
                      <div className="mode-footer">
                        <span className="mode-duration">⏱️ {mode.duration}</span>
                        <span className="mode-radio-dot">{selectedMode === mode.id ? "●" : "○"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="quest-cta-row">
                <button
                  type="button"
                  className="btn btn-primary btn-start-quest"
                  onClick={() => setStage("setup")}
                  disabled={initLoading}
                >
                  Start Simulation →
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowHowItWorks(true)}
                >
                  How It Works
                </button>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <Disclaimer customText="Investor Quest is a risk-free personal financial literacy simulator. All market movements, investment returns, and life events are simulated and do not involve real money or represent guaranteed returns." />
          </div>
        )}

        {/* ========================================================
            STAGE 2: SCENARIO SETUP SCREEN
        ======================================================== */}
        {stage === "setup" && (
          <div className="quest-setup-screen">
            <div className="quest-setup-card glass-panel">
              <div className="setup-header">
                <button type="button" className="btn-back-link" onClick={() => setStage("landing")}>
                  &larr; Back to Modes
                </button>
                <span className="quest-simulator-badge">CONFIGURE YOUR SIMULATION</span>
                <h2>Setup Your Virtual Financial Profile</h2>
                <p className="setup-sub">
                  Choose whether to use a snapshot of your active WealthX profile or create a custom simulation scenario.
                </p>
              </div>

              {/* Setup Selector Tabs */}
              <div className="setup-tabs-row">
                {hasRealProfile && (
                  <button
                    type="button"
                    className={`setup-tab-btn ${setupType === "profile" ? "active" : ""}`}
                    onClick={() => setSetupType("profile")}
                  >
                    ✨ Use My WealthX Profile Snapshot
                  </button>
                )}
                <button
                  type="button"
                  className={`setup-tab-btn ${setupType === "custom" ? "active" : ""}`}
                  onClick={() => setSetupType("custom")}
                >
                  🛠️ Create Custom Virtual Scenario
                </button>
              </div>

              {/* Option A: Profile Snapshot Preview */}
              {setupType === "profile" && profileSnapshot && (
                <div className="setup-profile-preview-box">
                  <div className="preview-profile-badge-row">
                    <span className="badge badge-green">Connected: WealthX Profile</span>
                    <span className="badge badge-blue">{profileSnapshot.riskCategoryLabel}</span>
                  </div>
                  <div className="preview-metrics-grid">
                    <div className="preview-metric-card">
                      <span className="metric-lbl">Monthly Income</span>
                      <span className="metric-val text-teal">₹{Number(profileSnapshot.monthlyIncome).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="preview-metric-card">
                      <span className="metric-lbl">Living Expenses</span>
                      <span className="metric-val text-rose">₹{Number(profileSnapshot.monthlyExpenses).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="preview-metric-card">
                      <span className="metric-lbl">Starting Savings</span>
                      <span className="metric-val text-cyan">₹{Number(profileSnapshot.currentSavings).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="preview-metric-card">
                      <span className="metric-lbl">Goal Milestone</span>
                      <span className="metric-val text-amber">₹{Number(profileSnapshot.goalTarget).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <p className="preview-privacy-note">
                    🔒 <strong>Data Isolation Guarantee:</strong> Investor Quest uses an isolated snapshot. Your real WealthX records will never be modified.
                  </p>
                </div>
              )}

              {/* Option B: Custom Scenario Form */}
              {setupType === "custom" && (
                <div className="setup-custom-form-grid">
                  <div className="form-group">
                    <label>Monthly Virtual Salary / Inflow (₹)</label>
                    <input
                      type="number"
                      value={customIncome}
                      onChange={(e) => setCustomIncome(e.target.value)}
                      step="5000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Monthly Living Expenses (₹)</label>
                    <input
                      type="number"
                      value={customExpenses}
                      onChange={(e) => setCustomExpenses(e.target.value)}
                      step="2000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Starting Bank Savings (₹)</label>
                    <input
                      type="number"
                      value={customSavings}
                      onChange={(e) => setCustomSavings(e.target.value)}
                      step="5000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Target Goal Amount (₹)</label>
                    <input
                      type="number"
                      value={customGoalTarget}
                      onChange={(e) => setCustomGoalTarget(e.target.value)}
                      step="50000"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Goal Milestone Name</label>
                    <input
                      type="text"
                      value={customGoalTitle}
                      onChange={(e) => setCustomGoalTitle(e.target.value)}
                      placeholder="e.g. 5-Year Home Downpayment Corpus"
                    />
                  </div>
                </div>
              )}

              <div className="setup-actions-row">
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  onClick={handleStartSimulation}
                  disabled={turnLoading}
                >
                  {turnLoading ? "Initializing Simulation..." : "Launch Quest Session 🚀"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 3: ACTIVE GAMEPLAY DASHBOARD
        ======================================================== */}
        {stage === "playing" && gameState && (
          <div className="quest-active-game-view">
            {/* Top Game Bar */}
            <div className="quest-top-turn-header glass-panel">
              <div className="turn-progress-left">
                <span className="quest-turn-pill">
                  TURN {gameState.currentTurn} / {gameState.totalTurns}
                </span>
                <span className="turn-time-elapsed">
                  Simulated Time: Year {Math.floor((gameState.simulatedMonthsElapsed || 0) / 12) + 1}, Month {((gameState.simulatedMonthsElapsed || 0) % 12) + 1}
                </span>
              </div>
              <div className="turn-controls-right">
                <button
                  type="button"
                  className="btn-pause-quest"
                  onClick={() => setShowRestartConfirm(true)}
                >
                  Restart Simulation 🔄
                </button>
              </div>
            </div>

            {/* KPI Cards Ribbon */}
            <div className="quest-kpi-ribbon">
              <div className="quest-kpi-card">
                <span className="kpi-icon">💰</span>
                <div className="kpi-info">
                  <span className="kpi-lbl">Total Net Wealth</span>
                  <span className="kpi-val text-teal font-mono">₹{currentNetWorth.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="quest-kpi-card">
                <span className="kpi-icon">🛡️</span>
                <div className="kpi-info">
                  <span className="kpi-lbl">Emergency Buffer ({emergencyMonths} Mos)</span>
                  <span className="kpi-val text-cyan font-mono">₹{(gameState.emergencyFund || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="quest-kpi-card">
                <span className="kpi-icon">📈</span>
                <div className="kpi-info">
                  <span className="kpi-lbl">Investments (MF + Stocks + Gold)</span>
                  <span className="kpi-val text-blue font-mono">
                    ₹{((gameState.portfolio?.mutual_funds || 0) + (gameState.portfolio?.stocks || 0) + (gameState.portfolio?.gold || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="quest-kpi-card">
                <span className="kpi-icon">🎯</span>
                <div className="kpi-info">
                  <span className="kpi-lbl">Goal Progress ({goalProgressPct}%)</span>
                  <span className="kpi-val text-amber font-mono">₹{gameState.goal?.targetAmount?.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Last Turn Event & Consequence Banner (if present) */}
            {lastTurnResult && lastTurnResult.triggeredEvent && (
              <div className={`quest-event-consequence-card severity-${lastTurnResult.triggeredEvent.severity || "info"}`}>
                <div className="event-header-row">
                  <span className="event-badge-tag">SIMULATED MARKET & LIFE EVENT</span>
                  <h3 className="event-title">{lastTurnResult.triggeredEvent.title}</h3>
                </div>
                <p className="event-desc">{lastTurnResult.triggeredEvent.description}</p>
                <div className="consequence-summary-box">
                  <strong>Outcome:</strong> {lastTurnResult.eventConsequenceSummary}
                </div>

                {/* AI Mentor Review Box */}
                {lastTurnResult.mentorReview && (
                  <div className="mentor-turn-review-box">
                    <div className="mentor-review-header">
                      <span className="mentor-avatar-icon">🤖</span>
                      <span className="mentor-name-tag">{lastTurnResult.mentorReview.mentorName}</span>
                    </div>
                    <h4 className="mentor-headline">{lastTurnResult.mentorReview.headline}</h4>
                    <p className="mentor-reason">{lastTurnResult.mentorReview.reason}</p>
                    <div className="mentor-takeaway-pill">
                      💡 <strong>Key Takeaway:</strong> {lastTurnResult.mentorReview.lesson}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Core Turn Decision Console Grid */}
            <div className="quest-decision-and-analytics-grid">
              {/* Left Column: Surplus Allocation Console */}
              <div className="quest-decision-console glass-panel">
                <div className="console-header">
                  <span className="console-step-badge">DECISION STEP</span>
                  <h3>Allocate Month's Surplus (₹{((gameState.monthlyIncome - gameState.monthlyExpenses) * gameState.turnDurationMonths).toLocaleString("en-IN")})</h3>
                  <p className="console-sub">
                    Inflow: ₹{(gameState.monthlyIncome * gameState.turnDurationMonths).toLocaleString("en-IN")} | Expenses: ₹{(gameState.monthlyExpenses * gameState.turnDurationMonths).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Allocation Choices */}
                <div className="allocation-options-list">
                  <label
                    className={`allocation-option-row ${selectedAllocation === "balanced_split" ? "selected" : ""}`}
                    onClick={() => setSelectedAllocation("balanced_split")}
                  >
                    <input type="radio" checked={selectedAllocation === "balanced_split"} onChange={() => {}} />
                    <div className="opt-details">
                      <strong>⚖️ Disciplined Balanced Split (Recommended)</strong>
                      <span>30% Emergency Buffer • 40% Mutual Funds • 15% Stocks • 15% SGB Gold</span>
                    </div>
                  </label>

                  <label
                    className={`allocation-option-row ${selectedAllocation === "emergency_first" ? "selected" : ""}`}
                    onClick={() => setSelectedAllocation("emergency_first")}
                  >
                    <input type="radio" checked={selectedAllocation === "emergency_first"} onChange={() => {}} />
                    <div className="opt-details">
                      <strong>🛡️ Fortify Emergency Buffer (80% Reserve)</strong>
                      <span>Prioritize liquid emergency reserves to protect against health and income shocks</span>
                    </div>
                  </label>

                  <label
                    className={`allocation-option-row ${selectedAllocation === "mutual_funds" ? "selected" : ""}`}
                    onClick={() => setSelectedAllocation("mutual_funds")}
                  >
                    <input type="radio" checked={selectedAllocation === "mutual_funds"} onChange={() => {}} />
                    <div className="opt-details">
                      <strong>🌱 Systematic Mutual Funds SIP (70% Allocation)</strong>
                      <span>Focus on disciplined compounding in broad-market flexi-cap index funds</span>
                    </div>
                  </label>

                  <label
                    className={`allocation-option-row ${selectedAllocation === "stocks_growth" ? "selected" : ""}`}
                    onClick={() => setSelectedAllocation("stocks_growth")}
                  >
                    <input type="radio" checked={selectedAllocation === "stocks_growth"} onChange={() => {}} />
                    <div className="opt-details">
                      <strong>⚡ High-Growth Direct Equities (80% Stocks)</strong>
                      <span>Higher growth potential, but exposes portfolio to intense cyclical drawdowns</span>
                    </div>
                  </label>

                  <label
                    className={`allocation-option-row ${selectedAllocation === "custom" ? "selected" : ""}`}
                    onClick={() => setSelectedAllocation("custom")}
                  >
                    <input type="radio" checked={selectedAllocation === "custom"} onChange={() => {}} />
                    <div className="opt-details">
                      <strong>🛠️ Custom Allocation Split</strong>
                      <span>Manually specify exact percentage allocations across asset classes</span>
                    </div>
                  </label>
                </div>

                {/* Custom Split Inputs (if custom chosen) */}
                {selectedAllocation === "custom" && (
                  <div className="custom-split-controls-grid">
                    <div>
                      <label>Emergency: {customSplits.emergencyPct}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customSplits.emergencyPct}
                        onChange={(e) => setCustomSplits({ ...customSplits, emergencyPct: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Mutual Funds: {customSplits.mfPct}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customSplits.mfPct}
                        onChange={(e) => setCustomSplits({ ...customSplits, mfPct: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Direct Stocks: {customSplits.stocksPct}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customSplits.stocksPct}
                        onChange={(e) => setCustomSplits({ ...customSplits, stocksPct: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Digital Gold: {customSplits.goldPct}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={customSplits.goldPct}
                        onChange={(e) => setCustomSplits({ ...customSplits, goldPct: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                <div className="console-action-footer">
                  <button
                    type="button"
                    className="btn btn-primary btn-execute-turn"
                    onClick={handleExecuteTurn}
                    disabled={turnLoading}
                  >
                    {turnLoading ? "Simulating Market Cycle..." : "Execute Allocation & Advance Turn →"}
                  </button>
                </div>
              </div>

              {/* Right Column: Visual Charts & Interactive AI Mentor */}
              <div className="quest-visuals-col">
                {/* Visual Charts Card */}
                <div className="quest-chart-card glass-panel">
                  <div className="card-top-header">
                    <h4>Portfolio Asset Allocation</h4>
                    <span className="badge badge-blue">Interactive Readout</span>
                  </div>
                  <DonutChart
                    data={portfolioDonutData}
                    centerLabel="Total Assets"
                    centerValue={`₹${currentNetWorth.toLocaleString("en-IN")}`}
                    size={160}
                  />
                  <div style={{ marginTop: "16px" }}>
                    <LineChart
                      data={wealthGrowthHistory}
                      title="Simulated Wealth Trajectory (₹)"
                      height={140}
                      color="#10b981"
                    />
                  </div>
                </div>

                {/* In-Game Ask WealthX Mentor Panel */}
                <div className="quest-mentor-chat-card glass-panel">
                  <div className="mentor-card-header">
                    <div className="mentor-header-title">
                      <span className="mentor-icon">🤖</span>
                      <strong>Ask WealthX AI Mentor</strong>
                    </div>
                    <span className="badge badge-cyan">In-Game Guidance</span>
                  </div>

                  <div className="mentor-chat-messages-container">
                    {mentorChatHistory.length === 0 ? (
                      <div className="mentor-empty-chat-prompt">
                        <span>Have a question about your simulated scenario? Ask your AI coach below:</span>
                        <div className="mentor-suggested-prompts">
                          <button
                            type="button"
                            className="prompt-pill"
                            onClick={() => {
                              setMentorQuery("Why did my portfolio experience a drawdown?");
                            }}
                          >
                            "Why did my portfolio experience a drawdown?"
                          </button>
                          <button
                            type="button"
                            className="prompt-pill"
                            onClick={() => {
                              setMentorQuery("How much emergency fund do I need right now?");
                            }}
                          >
                            "How much emergency fund do I need?"
                          </button>
                        </div>
                      </div>
                    ) : (
                      mentorChatHistory.map((msg, idx) => (
                        <div key={idx} className={`chat-msg-bubble msg-${msg.sender}`}>
                          <p>{msg.text}</p>
                          {msg.conceptTip && (
                            <div className="chat-concept-tip">
                              💡 <em>{msg.conceptTip}</em>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <form className="mentor-query-form" onSubmit={handleAskMentor}>
                    <input
                      type="text"
                      placeholder="Ask mentor about your portfolio or strategy..."
                      value={mentorQuery}
                      onChange={(e) => setMentorQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={mentorAsking}>
                      {mentorAsking ? "Thinking..." : "Ask"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 4: GAME OVER & STRATEGY REPORT
        ======================================================== */}
        {stage === "game_over" && gameState && (
          <div className="quest-results-screen">
            <div className="quest-results-card glass-panel">
              <div className="results-hero-header">
                <span className="badge badge-green">QUEST SIMULATION COMPLETED</span>
                <h1>Your Investor Quest Results</h1>
                <p className="results-sub">
                  Congratulations! You navigated {gameState.totalTurns} market cycles, balanced emergency risks, and built a simulated wealth foundation.
                </p>
              </div>

              {/* Top Financial Outcome Numbers */}
              <div className="results-summary-numbers-grid">
                <div className="res-stat-card">
                  <span className="stat-label">Starting Wealth</span>
                  <span className="stat-value font-mono">₹{gameState.startingNetWorth.toLocaleString("en-IN")}</span>
                </div>
                <div className="res-stat-card">
                  <span className="stat-label">Total Contributions</span>
                  <span className="stat-value font-mono text-cyan">₹{gameState.totalContributions.toLocaleString("en-IN")}</span>
                </div>
                <div className="res-stat-card highlight">
                  <span className="stat-label">Final Simulated Wealth</span>
                  <span className="stat-value font-mono text-teal">₹{currentNetWorth.toLocaleString("en-IN")}</span>
                </div>
                <div className="res-stat-card">
                  <span className="stat-label">Goal Target (₹{gameState.goal?.targetAmount?.toLocaleString("en-IN")})</span>
                  <span className="stat-value font-mono text-amber">{goalProgressPct}% Achieved</span>
                </div>
              </div>

              {/* Wealth Strategy Score Breakdown */}
              <div className="strategy-score-section">
                <div className="strategy-score-header">
                  <div>
                    <h3>Wealth Strategy Score</h3>
                    <p className="text-secondary">Deterministic evaluation of disciplined financial decision-making</p>
                  </div>
                  <div className="score-badge-circle">
                    <span className="score-num">{gameState.strategyScores?.overall || 82}</span>
                    <span className="score-max">/ 100</span>
                  </div>
                </div>

                <div className="score-bars-grid">
                  <div className="score-bar-item">
                    <div className="bar-label-row">
                      <span>Emergency Preparedness</span>
                      <span className="font-mono text-cyan">{gameState.strategyScores?.emergencyPreparedness}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${gameState.strategyScores?.emergencyPreparedness}%`, background: "var(--accent-cyan)" }} />
                    </div>
                  </div>

                  <div className="score-bar-item">
                    <div className="bar-label-row">
                      <span>Asset Diversification</span>
                      <span className="font-mono text-teal">{gameState.strategyScores?.diversification}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${gameState.strategyScores?.diversification}%`, background: "var(--accent-teal)" }} />
                    </div>
                  </div>

                  <div className="score-bar-item">
                    <div className="bar-label-row">
                      <span>Risk Management</span>
                      <span className="font-mono text-blue">{gameState.strategyScores?.riskManagement}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${gameState.strategyScores?.riskManagement}%`, background: "var(--accent-primary)" }} />
                    </div>
                  </div>

                  <div className="score-bar-item">
                    <div className="bar-label-row">
                      <span>Goal & Savings Discipline</span>
                      <span className="font-mono text-amber">{gameState.strategyScores?.goalDiscipline}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${gameState.strategyScores?.goalDiscipline}%`, background: "var(--accent-amber)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* "What If You Had Chosen Differently?" Section */}
              {whatIfData && (
                <div className="what-if-comparison-card">
                  <div className="what-if-header">
                    <span className="badge badge-purple">COMPARATIVE SIMULATION</span>
                    <h3>What If You Had Chosen Differently?</h3>
                    <p className="text-secondary">{whatIfData.coreLesson}</p>
                  </div>

                  <div className="what-if-paths-grid">
                    <div className="what-if-path-box actual-path">
                      <span className="path-tag">YOUR PATH</span>
                      <h4>Balanced Strategy</h4>
                      <span className="path-wealth text-teal font-mono">₹{whatIfData.actualPath.finalWealth.toLocaleString("en-IN")}</span>
                      <span className="path-drawdown">Max Drawdown: -{whatIfData.actualPath.maxDrawdownPct}%</span>
                    </div>

                    <div className="what-if-path-box">
                      <span className="path-tag">ALTERNATIVE A</span>
                      <h4>100% High-Risk Equities</h4>
                      <span className="path-wealth text-blue font-mono">₹{whatIfData.alternativeAggressive.finalWealth.toLocaleString("en-IN")}</span>
                      <span className="path-drawdown text-rose">Max Drawdown: -{whatIfData.alternativeAggressive.maxDrawdownPct}%</span>
                      <p className="path-analysis">{whatIfData.alternativeAggressive.comparisonTakeaway}</p>
                    </div>

                    <div className="what-if-path-box">
                      <span className="path-tag">ALTERNATIVE B</span>
                      <h4>100% Cash / Bank Savings</h4>
                      <span className="path-wealth text-muted font-mono">₹{whatIfData.alternativeConservative.finalWealth.toLocaleString("en-IN")}</span>
                      <span className="path-drawdown text-teal">Max Drawdown: -{whatIfData.alternativeConservative.maxDrawdownPct}%</span>
                      <p className="path-analysis">{whatIfData.alternativeConservative.comparisonTakeaway}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Educational Achievements Unlocked */}
              {gameState.achievements && gameState.achievements.length > 0 && (
                <div className="results-achievements-box">
                  <h3>🏆 Educational Achievements Unlocked</h3>
                  <div className="achievements-badges-row">
                    {gameState.achievements.map((ach, i) => (
                      <span key={i} className="achievement-pill">
                        {ach === "emergency_ready" && "🛡️ Emergency Ready (6-Month Reserve)"}
                        {ach === "diversification_pro" && "🌐 Diversification Pro (Multi-Asset Shield)"}
                        {ach === "sip_disciplined" && "🌱 SIP Compounding Champion"}
                        {ach === "goal_achiever" && "🎯 Milestone Achiever"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* What You Learned Takeaways */}
              <div className="results-learnings-box">
                <h3>💡 Core Financial Lessons Mastered</h3>
                <div className="learnings-list-grid">
                  <div className="learning-item">
                    <strong>✓ Emergency Buffers Matter:</strong> Prevents emergency health or auto repairs from forcing distressed sales of equities.
                  </div>
                  <div className="learning-item">
                    <strong>✓ Diversification Cushions Drawdowns:</strong> Gold and debt assets offset stock pullbacks during cyclical corrections.
                  </div>
                  <div className="learning-item">
                    <strong>✓ Disciplined SIP Compounding:</strong> Regular monthly surplus contributions build substantial long-term wealth over time.
                  </div>
                  <div className="learning-item">
                    <strong>✓ Sequence-of-Returns Resilience:</strong> Staying invested through market dips avoids locking in permanent losses.
                  </div>
                </div>
              </div>

              {/* Interactive AI Mentor Consultation on Results */}
              <div className="results-ai-mentor-card glass-panel">
                <div className="mentor-header-row">
                  <div className="mentor-badge-row">
                    <span className="mentor-avatar">🤖</span>
                    <div>
                      <h4>Ask AI Mentor About Your Strategy Score & Decisions</h4>
                      <span className="mentor-status-text">Instant Decision Feedback • Personalized Financial Review</span>
                    </div>
                  </div>
                </div>

                {/* Quick Consultation Chips */}
                <div className="results-prompt-chips-row">
                  <button
                    type="button"
                    className="results-prompt-chip"
                    onClick={() =>
                      handleAskMentorDirectly(
                        `Why did I receive an overall Strategy Score of ${gameState.strategyScores?.overall || 80}/100? What were my best and weakest decisions?`
                      )
                    }
                  >
                    💬 Why did I get this Strategy Score?
                  </button>
                  <button
                    type="button"
                    className="results-prompt-chip"
                    onClick={() =>
                      handleAskMentorDirectly(
                        `How did my Emergency Fund allocation (${gameState.strategyScores?.emergencyPreparedness}%) protect me during emergency shocks?`
                      )
                    }
                  >
                    🛡️ How did my Emergency Buffer perform?
                  </button>
                  <button
                    type="button"
                    className="results-prompt-chip"
                    onClick={() =>
                      handleAskMentorDirectly(
                        `Analyze my Diversification score (${gameState.strategyScores?.diversification}%). How can I better balance Equities vs Gold vs Debt?`
                      )
                    }
                  >
                    📊 How to improve my Diversification?
                  </button>
                </div>

                {/* Chat History */}
                {mentorChatHistory.length > 0 && (
                  <div className="results-mentor-chat-stream">
                    {mentorChatHistory.map((msg, i) => (
                      <div key={i} className={`mentor-chat-bubble ${msg.sender}`}>
                        <span className="bubble-sender">{msg.sender === "user" ? "You" : "🤖 WealthX Mentor"}</span>
                        <p>{msg.text}</p>
                        {msg.conceptTip && (
                          <div className="concept-tip-box">
                            <strong>💡 Key Lesson:</strong> {msg.conceptTip}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Bar */}
                <form onSubmit={handleAskMentor} className="mentor-input-form" style={{ marginTop: "12px" }}>
                  <input
                    type="text"
                    placeholder="Ask anything about your score, drawdown, or simulated investments..."
                    value={mentorQuery}
                    onChange={(e) => setMentorQuery(e.target.value)}
                    disabled={mentorAsking}
                  />
                  <button type="submit" className="btn btn-primary" disabled={mentorAsking || !mentorQuery.trim()}>
                    {mentorAsking ? "Analyzing..." : "Ask Mentor →"}
                  </button>
                </form>
              </div>

              {/* Next Steps: AI Decision Lab & Action Plan */}
              <div className="results-next-steps-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAskAIAboutScore}
                >
                  🤖 Deep-Dive in AI Decision Lab →
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate("/action-plan")}
                >
                  📊 View My Strategic Action Plan →
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRestartGame}
                >
                  🔄 Play Again / Try New Scenario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: How It Works */}
        {showHowItWorks && (
          <div className="modal-backdrop" onClick={() => setShowHowItWorks(false)}>
            <div className="quest-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3>🎮 How Investor Quest Works</h3>
                <button type="button" className="modal-close" onClick={() => setShowHowItWorks(false)}>✕</button>
              </div>
              <div className="modal-body-content">
                <ol className="how-it-works-steps">
                  <li>
                    <strong>1. Receive Monthly Cashflow:</strong> Earn simulated income, cover living expenses, and calculate investable surplus.
                  </li>
                  <li>
                    <strong>2. Allocate Your Surplus:</strong> Decide how much to place into Emergency Buffers, Mutual Funds, Direct Stocks, or SGB Gold.
                  </li>
                  <li>
                    <strong>3. Experience Market & Life Events:</strong> Navigate market corrections (-15%), health emergencies, promotions, and gold rallies.
                  </li>
                  <li>
                    <strong>4. AI Financial Mentor Explanations:</strong> Understand the exact consequence of every decision and ask questions anytime.
                  </li>
                  <li>
                    <strong>5. Earn Wealth Strategy Score:</strong> Receive deterministic scores across 5 financial disciplines and compare alternative paths.
                  </li>
                </ol>
              </div>
              <div className="modal-footer-row">
                <button type="button" className="btn btn-primary" onClick={() => setShowHowItWorks(false)}>
                  Got It, Let's Play! 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Restart Confirmation */}
        {showRestartConfirm && (
          <div className="modal-backdrop" onClick={() => setShowRestartConfirm(false)}>
            <div className="quest-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3>Restart Simulation Session?</h3>
                <button type="button" className="modal-close" onClick={() => setShowRestartConfirm(false)}>✕</button>
              </div>
              <p className="text-secondary" style={{ margin: "16px 0" }}>
                Are you sure you want to restart? Your current virtual quest progress will be reset. Your actual WealthX profile is completely safe.
              </p>
              <div className="modal-footer-row">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRestartConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleRestartGame}>
                  Yes, Restart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InvestorQuest;
