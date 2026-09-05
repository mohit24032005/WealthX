import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import LineChart from "../components/charts/LineChart";
import AllocationBar from "../components/charts/AllocationBar";
import api from "../utils/apiClient";
import "./AIDecisionLab.css";

export const AIDecisionLab = () => {
  const location = useLocation();
  const [presetTopics, setPresetTopics] = useState([]);
  const [customQuery, setCustomQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Unified Conversational History — starts clean with 0 messages
  const [messages, setMessages] = useState([]);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Selected Mutual Fund for modal inspection & SIP simulation
  const [selectedFund, setSelectedFund] = useState(null);
  const [simSIPAmount, setSimSIPAmount] = useState(5000);
  const [simYears, setSimYears] = useState(10);
  const [simExpectedReturn, setSimExpectedReturn] = useState(14);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await api.get("/api/decision-lab/preset-questions");
      if (res && res.data) {
        setPresetTopics(res.data);
      }
    } catch (err) {
      console.error("Failed to load preset questions:", err);
    }
  }, []);

  const sendQuery = async (queryText, topicId = null) => {
    if (!queryText || loading) return;

    const userMsgText = queryText.trim();
    if (!userMsgText) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message ONLY on explicit user action
    const userMsg = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      role: "user",
      text: userMsgText,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history payload for multi-turn grounding
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text || m.summary || "",
      }));

      const res = await api.post("/api/decision-lab/evaluate", {
        topicId: topicId || null,
        query: userMsgText,
        conversationHistory: historyPayload,
      });

      if (res && res.data) {
        const aiMsg = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          role: "model",
          text: res.data.summary,
          summary: res.data.summary,
          decisionState: res.data.decisionState || "CONSIDER",
          statusLabel: res.data.statusLabel || "Recommended with High Confidence",
          aiExplanation: res.data.aiExplanation || {},
          recommendations: res.data.recommendations || null,
          researchStocks: res.data.researchStocks || null,
          allocationPlan: res.data.allocationPlan || null,
          portfolioDiagnostics: res.data.portfolioDiagnostics || null,
          pillars: res.data.pillars || null,
          suggestedAction: res.data.suggestedAction || null,
          followUpPrompts: res.data.aiExplanation?.followUpPrompts || [
            "What if I invest ₹5,000 every month instead?",
            "Is my portfolio too risky compared to my Risk DNA?",
            "Where should my next ₹10,000 surplus go?",
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(res.message || "Failed to evaluate financial decision.");
      }
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: "model",
        isError: true,
        text: err.message || "WealthX decision engine is currently offline. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // On page load: Fetch presets. Only auto-send if explicitly navigated with initialQuery state from another page
  useEffect(() => {
    fetchPresets();
    const queryToRun = location.state?.initialQuery || location.state?.presetQuery;
    if (queryToRun) {
      sendQuery(queryToRun);
    }
    // Clean initial state on fresh visit - NO auto-sending of presets
  }, []);

  // Auto scroll to bottom only when messages exist or loading
  useEffect(() => {
    if (messages.length > 0 && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSelectPreset = (topic) => {
    if (loading) return;
    sendQuery(topic.prompt || topic.title, topic.id);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!customQuery.trim() || loading) return;
    const q = customQuery.trim();
    setCustomQuery("");
    sendQuery(q);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  const handleFollowUpClick = (promptText) => {
    if (loading) return;
    sendQuery(promptText);
  };

  const handleClearChat = () => {
    setMessages([]);
    setShowClearConfirm(false);
    // Returns to clean initial empty state without auto-sending anything
  };

  // Open fund detail modal and fetch full history
  const handleOpenFundDetail = async (fund) => {
    try {
      const res = await api.get(`/api/mutual-funds/${fund.schemeCode}`);
      if (res && res.data) {
        setSelectedFund({
          ...fund,
          ...res.data,
          history: res.data.history || [],
        });
      } else {
        setSelectedFund(fund);
      }
    } catch {
      setSelectedFund(fund);
    }
  };

  // Calculate SIP simulation numbers
  const calculateSIPSimulation = () => {
    const P = Number(simSIPAmount) || 5000;
    const n = (Number(simYears) || 10) * 12;
    const i = (Number(simExpectedReturn) || 14) / 12 / 100;

    const totalInvested = P * n;
    const estimatedCorpus = Math.round(P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i));
    const estimatedGains = Math.max(0, estimatedCorpus - totalInvested);

    return { totalInvested, estimatedCorpus, estimatedGains };
  };

  const { totalInvested, estimatedCorpus, estimatedGains } = calculateSIPSimulation();

  return (
    <AppLayout disclaimerVariant="general">
      <div className="ai-chat-view-container">
        {/* Header */}
        <div className="ai-chat-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>FINANCIAL DECISION LAB</span>
            </div>
            <h1 className="ai-chat-title">AI Decision Lab</h1>
            <p className="ai-chat-sub">
              Ask any financial question. WealthX AI explains decisions grounded strictly in your real balance sheet, Risk DNA, AMFI NAVs, and Upstox market data.
            </p>
          </div>

          <div className="ai-header-controls">
            <div className="ai-status-indicator-pill">
              <span className="ai-status-dot"></span>
              <span>Using WealthX Financial Context</span>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                className="btn-clear-chat"
                onClick={() => setShowClearConfirm(true)}
                title="Clear conversation history"
              >
                🗑️ Clear Conversation
              </button>
            )}
          </div>
        </div>

        {/* Clear Confirmation Modal / Banner */}
        {showClearConfirm && (
          <div className="clear-confirm-banner glass-panel">
            <span>Clear this conversation? Your financial records and balance sheet will not be affected.</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 12px", fontSize: "12px" }}
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "4px 12px", fontSize: "12px", background: "var(--accent-rose)" }}
                onClick={handleClearChat}
              >
                Clear Conversation
              </button>
            </div>
          </div>
        )}

        {/* Central Unified Conversation Area */}
        <div className="chat-conversation-area glass-panel">
          {/* INITIAL CLEAN EMPTY STATE (Shown when 0 messages exist) */}
          {messages.length === 0 && !loading ? (
            <div className="chat-empty-state-wrap">
              <div className="empty-state-hero-badge">
                <span className="empty-state-icon">🤖</span>
              </div>
              <h2 className="empty-state-title">How can WealthX help you decide?</h2>
              <p className="empty-state-sub">
                Ask a question about your finances, investments, goals, loans, or portfolio. Your verified balance sheet context, emergency runway, and Risk DNA are loaded and ready.
              </p>

              {/* Responsive Quick Scenarios Grid */}
              <div className="quick-scenarios-section">
                <div className="quick-scenarios-header">
                  <span className="quick-scenarios-label">⚡ QUICK SCENARIO SUGGESTIONS</span>
                  <span className="text-muted" style={{ fontSize: "11px" }}>Click to evaluate instantly</span>
                </div>

                <div className="quick-scenarios-grid">
                  {presetTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className="quick-scenario-card"
                      onClick={() => handleSelectPreset(topic)}
                      disabled={loading}
                    >
                      <div className="scenario-card-header">
                        <span className="scenario-icon">💡</span>
                        <span className="scenario-title">{topic.title}</span>
                      </div>
                      <span className="scenario-arrow">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* CONVERSATION THREAD (Shown when messages exist or loading) */
            <div className="chat-thread-scroll">
              {/* Compact Quick Scenarios Bar when in active chat */}
              <div className="in-chat-presets-bar">
                <span className="in-chat-presets-label">⚡ SUGGESTIONS:</span>
                <div className="in-chat-presets-wrap">
                  {presetTopics.slice(0, 4).map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className="in-chat-preset-pill"
                      onClick={() => handleSelectPreset(topic)}
                      disabled={loading}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              </div>

              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message-row ${msg.role === "user" ? "row-user" : "row-ai"}`}>
                  {/* User Message Bubble */}
                  {msg.role === "user" ? (
                    <div className="user-message-bubble">
                      <div className="message-meta-header">
                        <span className="user-avatar-tag">👤 You</span>
                        <span className="message-time">{msg.timestamp}</span>
                      </div>
                      <p className="user-text-content">{msg.text}</p>
                    </div>
                  ) : (
                    /* Unified AI Response Container */
                    <div className={`ai-message-card ${msg.isError ? "ai-error-card" : ""}`}>
                      {/* AI Header Line */}
                      <div className="ai-message-header">
                        <div className="ai-brand-wrap">
                          <span className="ai-avatar-icon">🤖</span>
                          <div>
                            <span className="ai-sender-name">WealthX AI</span>
                            <span className="ai-rule-engine-tag">Deterministic Grounding Engine</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {msg.decisionState && (
                            <span
                              className={`decision-state-pill pill-${msg.decisionState.toLowerCase()}`}
                            >
                              {msg.decisionState === "CONSIDER"
                                ? "🟢 CONSIDER"
                                : msg.decisionState === "REVIEW"
                                ? "🟡 REVIEW"
                                : msg.decisionState === "WATCH"
                                ? "🔵 WATCH"
                                : "🔴 NOT SUITABLE"}
                            </span>
                          )}
                          <span className="message-time">{msg.timestamp}</span>
                        </div>
                      </div>

                      {/* Primary Answer Paragraph */}
                      <div className="ai-summary-box">
                        <p className="ai-summary-text">{msg.summary || msg.text}</p>
                      </div>

                      {/* Candidate Mutual Funds (if present) */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="embedded-funds-section">
                          <div className="embedded-section-header">
                            <span className="embedded-section-title">🎯 Screened Mutual Fund Candidates (AMFI)</span>
                            <span className="badge badge-green" style={{ fontSize: "10px" }}>AMFI Official NAV</span>
                          </div>

                          <div className="embedded-funds-grid">
                            {msg.recommendations.map((fund) => (
                              <div key={fund.schemeCode} className="embedded-fund-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                  <div>
                                    <span className="badge badge-blue" style={{ fontSize: "10px" }}>{fund.category}</span>
                                    <h4 style={{ fontSize: "13.5px", fontWeight: 700, margin: "4px 0 2px 0" }}>{fund.name}</h4>
                                    <span className="text-muted" style={{ fontSize: "11px" }}>{fund.amc} &bull; Direct Plan</span>
                                  </div>
                                  <div className="suitability-chip font-mono">
                                    <span style={{ fontSize: "15px", fontWeight: 800 }}>{fund.suitabilityScore}</span>
                                    <span style={{ fontSize: "9px", textTransform: "uppercase" }}>Fit Score</span>
                                  </div>
                                </div>

                                <div className="fund-mini-metrics">
                                  <div>
                                    <span className="text-muted" style={{ fontSize: "10.5px" }}>Latest NAV</span>
                                    <span className="font-mono font-bold text-cyan" style={{ fontSize: "12.5px" }}>₹{fund.latestNav}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted" style={{ fontSize: "10.5px" }}>3Y CAGR</span>
                                    <span className="font-mono font-bold text-teal" style={{ fontSize: "12.5px" }}>+{fund.cagr3Y}%</span>
                                  </div>
                                  <div>
                                    <span className="text-muted" style={{ fontSize: "10.5px" }}>Expense Ratio</span>
                                    <span className="font-mono" style={{ fontSize: "12.5px" }}>{fund.expenseRatio}%</span>
                                  </div>
                                  <div>
                                    <span className="text-muted" style={{ fontSize: "10.5px" }}>Riskometer</span>
                                    <span className="text-amber" style={{ fontSize: "11.5px", fontWeight: 600 }}>{fund.riskLevel}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ width: "100%", padding: "6px", fontSize: "11.5px", marginTop: "8px" }}
                                  onClick={() => handleOpenFundDetail(fund)}
                                >
                                  📈 Inspect NAV History & Simulate SIP &rarr;
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Candidate Stocks (if present) */}
                      {msg.researchStocks && msg.researchStocks.length > 0 && (
                        <div className="embedded-stocks-section">
                          <div className="embedded-section-header">
                            <span className="embedded-section-title">⚡ Bluechip Stock Research Candidates</span>
                            <span className="badge badge-blue" style={{ fontSize: "10px" }}>Market Research</span>
                          </div>

                          <div className="embedded-stocks-grid">
                            {msg.researchStocks.map((stock) => (
                              <div key={stock.symbol} className="embedded-stock-card">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div>
                                  <span className="font-mono font-bold text-cyan" style={{ fontSize: "13px" }}>{stock.symbol}</span>
                                  <h4 style={{ fontSize: "13px", fontWeight: 600 }}>{stock.name}</h4>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <span className="font-mono font-bold" style={{ fontSize: "13.5px" }}>₹{stock.price.toLocaleString("en-IN")}</span>
                                  <div style={{ fontSize: "11px", color: stock.change >= 0 ? "var(--accent-teal)" : "var(--accent-rose)" }}>
                                    {stock.change >= 0 ? "+" : ""}{stock.change} ({stock.changePct}%)
                                  </div>
                                </div>
                              </div>
                              <p className="text-muted" style={{ fontSize: "11.5px", margin: "6px 0 0 0", lineHeight: "1.4" }}>
                                {stock.researchThesis}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dynamic Rupee Allocation (if present) */}
                    {msg.allocationPlan && (
                      <div className="embedded-allocation-section">
                        <span className="embedded-section-title">💡 Next ₹{Number(msg.allocationPlan.totalBudget).toLocaleString("en-IN")} Allocation Blueprint</span>
                        <div style={{ margin: "10px 0" }}>
                          <AllocationBar slices={msg.allocationPlan.slices} totalAmount={msg.allocationPlan.totalBudget} />
                        </div>
                      </div>
                    )}

                    {/* Why It May Fit & Risks Split Grid */}
                    {msg.aiExplanation && (
                      <div className="ai-structured-split-grid">
                        {msg.aiExplanation.reasons && msg.aiExplanation.reasons.length > 0 && (
                          <div className="ai-reasons-box">
                            <span className="reasons-header-title text-teal">✓ Why It May Fit:</span>
                            <ul className="reasons-list">
                              {msg.aiExplanation.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {msg.aiExplanation.risks && msg.aiExplanation.risks.length > 0 && (
                          <div className="ai-risks-box">
                            <span className="risks-header-title text-amber">⚠️ Risks & Cautions:</span>
                            <ul className="risks-list">
                              {msg.aiExplanation.risks.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Compact Financial Context Row */}
                    {msg.aiExplanation && (msg.aiExplanation.riskDNACompatibility || msg.aiExplanation.goalCompatibility || msg.aiExplanation.portfolioImpact) && (
                      <div className="ai-context-chips-row">
                        {msg.aiExplanation.riskDNACompatibility && (
                          <div className="ai-context-tag">
                            <span className="ctx-tag-label">🧬 Risk DNA:</span>
                            <span>{msg.aiExplanation.riskDNACompatibility}</span>
                          </div>
                        )}
                        {msg.aiExplanation.goalCompatibility && (
                          <div className="ai-context-tag">
                            <span className="ctx-tag-label">🎯 Goal Pacing:</span>
                            <span>{msg.aiExplanation.goalCompatibility}</span>
                          </div>
                        )}
                        {msg.aiExplanation.portfolioImpact && (
                          <div className="ai-context-tag">
                            <span className="ctx-tag-label">⚖️ Portfolio Impact:</span>
                            <span>{msg.aiExplanation.portfolioImpact}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Suggested Action Bar */}
                    {msg.suggestedAction && (
                      <div className="ai-action-footer-bar">
                        <span className="text-muted" style={{ fontSize: "12px" }}>Recommended Action:</span>
                        <Link to={msg.suggestedAction.route || "/calculators/sip"} className="btn btn-primary" style={{ padding: "6px 16px", fontSize: "12.5px" }}>
                          {msg.suggestedAction.text || "Explore Options"} &rarr;
                        </Link>
                      </div>
                    )}

                    {/* Interactive Follow-Up Questions Chips */}
                    {msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                      <div className="chat-followups-container">
                        <span className="followups-title">💡 Continue exploring:</span>
                        <div className="followup-chips-wrap">
                          {msg.followUpPrompts.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              className="chat-followup-chip"
                              onClick={() => handleFollowUpClick(prompt)}
                              disabled={loading}
                            >
                              {prompt} &rarr;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* In-Chat Compact Loading State */}
            {loading && (
              <div className="chat-message-row row-ai">
                <div className="ai-message-card ai-loading-card">
                  <div className="ai-message-header">
                    <div className="ai-brand-wrap">
                      <span className="ai-avatar-icon">🤖</span>
                      <span className="ai-sender-name">WealthX AI</span>
                    </div>
                    <span className="ai-status-pulse">Analyzing...</span>
                  </div>

                  <div className="loading-dots-row">
                    <span className="pulse-dot dot-1"></span>
                    <span className="pulse-dot dot-2"></span>
                    <span className="pulse-dot dot-3"></span>
                  </div>

                  <div className="loading-context-sub">
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                      Analyzing your financial profile...
                    </span>
                    <span className="text-muted" style={{ fontSize: "11.5px", marginTop: "2px" }}>
                      Reviewing Risk DNA &bull; Cashflow &bull; Portfolio Diversification &bull; AMFI Reference Data
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
          )}

          {/* Sticky Professional Chat Composer */}
          <div className="chat-composer-area">
            <form onSubmit={handleFormSubmit} className="composer-form">
              <div className="composer-input-wrap">
                <span className="composer-icon">💬</span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about SIPs, investments, loans, goals or your portfolio..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="composer-input"
                />
                <button
                  type="submit"
                  className="btn btn-primary composer-send-btn"
                  disabled={loading || !customQuery.trim()}
                >
                  {loading ? "Analyzing..." : "Send →"}
                </button>
              </div>
            </form>

            <div className="data-source-footer-line">
              <span>Data sources: AMFI Official Feed &bull; Upstox Market Feed &bull; WealthX Verified Balance Sheet</span>
            </div>
          </div>
        </div>

        {/* Modal: Mutual Fund Historical NAV & SIP Simulator */}
        {selectedFund && (
          <div className="modal-backdrop" onClick={() => setSelectedFund(null)}>
            <div className="fund-detail-modal glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-row">
                <div>
                  <span className="badge badge-blue">{selectedFund.category} &bull; {selectedFund.subCategory}</span>
                  <h2 style={{ fontSize: "18px", fontWeight: 800, marginTop: "6px" }}>{selectedFund.name}</h2>
                  <span className="text-muted" style={{ fontSize: "12.5px" }}>{selectedFund.amc} &bull; Scheme Code: {selectedFund.schemeCode}</span>
                </div>
                <button type="button" className="modal-close" onClick={() => setSelectedFund(null)}>✕</button>
              </div>

              {/* Fund NAV & Freshness Banner */}
              <div className="modal-nav-banner">
                <div>
                  <span className="text-muted" style={{ fontSize: "12px" }}>Latest Official NAV</span>
                  <div className="font-mono text-cyan font-bold" style={{ fontSize: "24px" }}>₹{selectedFund.latestNav}</div>
                  <span className="badge badge-green" style={{ fontSize: "10px", marginTop: "4px" }}>NAV Date: {selectedFund.navDate}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="text-muted" style={{ fontSize: "12px" }}>WealthX Suitability</span>
                  <div className="font-mono text-teal font-bold" style={{ fontSize: "24px" }}>{selectedFund.suitabilityScore}/100</div>
                  <span className="text-muted" style={{ fontSize: "11px" }}>Risk: {selectedFund.riskLevel}</span>
                </div>
              </div>

              {/* Chart: Historical NAV */}
              {selectedFund.history && selectedFund.history.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span className="font-bold" style={{ fontSize: "14px" }}>📈 Historical NAV Progression</span>
                    <span className="text-muted" style={{ fontSize: "11.5px" }}>Source: AMFI Official Feed</span>
                  </div>
                  <LineChart
                    data={selectedFund.history.map((h) => ({ x: h.date, y: h.nav }))}
                    color="#06b6d4"
                    height={180}
                    valuePrefix="₹"
                  />
                  <span className="text-muted" style={{ fontSize: "11px", display: "block", marginTop: "4px", textAlign: "center" }}>
                    Historical NAV data for educational reference. Past performance does not guarantee future returns.
                  </span>
                </div>
              )}

              {/* Live SIP Simulation Calculator */}
              <div className="sip-sim-box">
                <h4 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>🚀 Interactive SIP Compounding Simulation</h4>
                <div className="sip-sim-inputs">
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Monthly SIP (₹)</label>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={simSIPAmount}
                      onChange={(e) => setSimSIPAmount(Number(e.target.value))}
                      className="sim-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Duration (Years)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={simYears}
                      onChange={(e) => setSimYears(Number(e.target.value))}
                      className="sim-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Expected Return (% p.a.)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="0.5"
                      value={simExpectedReturn}
                      onChange={(e) => setSimExpectedReturn(Number(e.target.value))}
                      className="sim-input"
                    />
                  </div>
                </div>

                <div className="sip-sim-results">
                  <div>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Total Invested</span>
                    <div className="font-mono" style={{ fontSize: "16px", fontWeight: 700 }}>₹{totalInvested.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Estimated Growth</span>
                    <div className="font-mono text-teal" style={{ fontSize: "16px", fontWeight: 700 }}>+₹{estimatedGains.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: "11px" }}>Projected Corpus</span>
                    <div className="font-mono text-cyan" style={{ fontSize: "18px", fontWeight: 800 }}>₹{estimatedCorpus.toLocaleString("en-IN")}</div>
                  </div>
                </div>
                <span className="text-muted" style={{ fontSize: "11px", display: "block", marginTop: "8px", textAlign: "center" }}>
                  * Projection for illustration only. Not a guaranteed return. Mutual fund investments are subject to market risks.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AIDecisionLab;
