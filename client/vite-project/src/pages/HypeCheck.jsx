import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProgressRing from "../components/charts/ProgressRing";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./HypeCheck.css";

export const HypeCheck = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("nifty50");
  const [trending, setTrending] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await api.get("/api/hype-check/trending");
      if (res && res.data) {
        setTrending(res.data);
      }
    } catch (err) {
      console.error("Failed to load trending hype topics:", err);
    }
  }, []);

  const analyzeAsset = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/hype-check/analyze", { query: q });
      if (res && res.data) {
        setResult(res.data);
      } else {
        throw new Error(res.message || "Failed to analyze hype score.");
      }
    } catch (err) {
      setError(err.message || "Hype evaluation engine offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    analyzeAsset("nifty50");
  }, []);

  const handleSelectTrending = (key) => {
    setQuery(key);
    analyzeAsset(key);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    analyzeAsset(query);
  };

  const handleAskAIAboutHype = (assetName) => {
    navigate("/ai-decision-lab", {
      state: {
        presetQuery: `What are the structural speculative risks of investing in ${assetName}? Should I avoid it given my financial stage?`,
      },
    });
  };

  const getHypeColor = (score) => {
    if (score > 65) return "#f43f5e"; // Red (High Hype)
    if (score > 30) return "#f59e0b"; // Amber (Caution)
    return "#10b981"; // Green (Evidence-backed)
  };

  const scoreColor = result ? getHypeColor(result.hypeScore) : "#10b981";
  const liveMarket = result?.liveMarketData;

  return (
    <AppLayout disclaimerVariant="general">
      <div className="hype-check-view">
        {/* Header */}
        <div className="hype-header">
          <div className="breadcrumb-pill">
            <span className="live-dot"></span>
            <span>LIVE FINANCIAL FOMO & SPECULATION FILTER</span>
          </div>
          <h1 className="hype-title">Investment Hype Check</h1>
          <p className="hype-sub">
            Filter out social-media euphoria, unverified Telegram tips, and speculative bubble momentum using real-time market data APIs (Groww, Yahoo Finance, Binance) and quantitative forensic metrics.
          </p>
        </div>

        {/* Search & Trending Bar */}
        <div className="hype-search-card glass-panel">
          <form onSubmit={handleSearchSubmit} className="hype-search-form">
            <div className="hype-input-wrapper">
              <span className="hype-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search any stock, crypto, ETF, or asset topic (e.g. Dogecoin, Suzlon, Zomato, Nifty 50, F&O Options)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="hype-input-field"
              />
              <button type="submit" className="btn btn-primary btn-hype-submit">
                Run Hype Audit &rarr;
              </button>
            </div>
          </form>

          {/* Quick Trending Chips */}
          <div className="trending-chips-row">
            <span className="trending-label">Trending Asset Audits:</span>
            {trending.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`trending-chip ${query.toLowerCase() === t.key ? "active" : ""}`}
                onClick={() => handleSelectTrending(t.key)}
              >
                <span>{t.name}</span>
                {t.livePrice && (
                  <span className="trending-price-tag font-mono">{t.livePrice}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results Box */}
        {loading ? (
          <LoadingState message="Auditing live cash flows, valuation multiples, retail frenzy, and historical drawdowns..." />
        ) : error ? (
          <ErrorState title="Hype Check Engine Offline" message={error} onRetry={() => analyzeAsset(query)} />
        ) : result ? (
          <div className="hype-results-box">
            {/* Status Hero Card */}
            <div className="hype-hero-card glass-panel glow-hover" style={{ borderLeft: `4px solid ${scoreColor}` }}>
              <div className="hype-hero-left">
                <ProgressRing
                  score={result.hypeScore}
                  size={120}
                  strokeWidth={9}
                  color={scoreColor}
                  label="/ 100 Hype"
                />
                <div className="hype-hero-title-box">
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span className="welcome-tag" style={{ color: scoreColor }}>
                      {result.category}
                    </span>
                    <span className="badge badge-green font-mono" style={{ fontSize: "10px" }}>
                      ● {result.engineTag || "LIVE DATA FEED"}
                    </span>
                  </div>
                  <h2 className="hype-asset-name">{result.name}</h2>
                  <div className="hype-status-pill" style={{ color: scoreColor }}>
                    {result.statusLabel}
                  </div>
                  <p className="hype-summary-text">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* 📊 LIVE REAL-TIME DATA CARD */}
            {liveMarket && (
              <div className="hype-live-metrics-card glass-panel">
                <div className="hype-live-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="live-pulse-dot"></span>
                    <span className="font-bold text-cyan" style={{ fontSize: "12.5px", textTransform: "uppercase" }}>
                      Live Market Indicators ({liveMarket.source || "Live Feed"})
                    </span>
                  </div>
                </div>

                <div className="hype-live-grid">
                  {liveMarket.price && (
                    <div className="live-stat-pill">
                      <span className="text-muted" style={{ fontSize: "11px" }}>Current Market Price</span>
                      <div className="font-mono font-bold text-teal" style={{ fontSize: "18px" }}>
                        {liveMarket.price}
                      </div>
                      {liveMarket.secondaryPrice && (
                        <span className="text-muted" style={{ fontSize: "11px" }}>({liveMarket.secondaryPrice})</span>
                      )}
                    </div>
                  )}

                  {liveMarket.dayChange && (
                    <div className="live-stat-pill">
                      <span className="text-muted" style={{ fontSize: "11px" }}>24h Delta / Stat</span>
                      <div className="font-mono font-bold" style={{ fontSize: "16px", color: liveMarket.dayChange.includes("-") ? "#f43f5e" : "#10b981" }}>
                        {liveMarket.dayChange}
                      </div>
                    </div>
                  )}

                  {liveMarket.peRatio && (
                    <div className="live-stat-pill">
                      <span className="text-muted" style={{ fontSize: "11px" }}>Valuation Ratio</span>
                      <div className="font-mono font-bold text-cyan" style={{ fontSize: "15px" }}>
                        {liveMarket.peRatio}
                      </div>
                    </div>
                  )}

                  {liveMarket.volume && (
                    <div className="live-stat-pill">
                      <span className="text-muted" style={{ fontSize: "11px" }}>Trading Liquidity / Detail</span>
                      <div className="font-mono font-bold" style={{ fontSize: "14px" }}>
                        {liveMarket.volume}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6 Structural Dimension Cards */}
            <div className="dimensions-section">
              <h3 className="section-title">🔬 Structural Evaluation Dimensions</h3>
              <div className="dimensions-grid">
                {Object.entries(result.metrics || {}).map(([key, m]) => (
                  <div key={key} className="dimension-card glass-panel">
                    <div className="dimension-header">
                      <span className="dimension-title">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                      </span>
                      <span className="font-bold font-mono" style={{ fontSize: "13px", color: m.score > 60 ? "#f43f5e" : "#10b981" }}>
                        {m.label}
                      </span>
                    </div>
                    <p className="dimension-detail">{m.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Takeaway Recommendation & Ask AI Action */}
            <div className="hype-takeaway-card glass-panel">
              <div>
                <span className="welcome-tag text-teal">WealthX Verdict</span>
                <h4 className="takeaway-text">{result.recommendation}</h4>
              </div>
              <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: "10px 20px" }}
                  onClick={() => handleAskAIAboutHype(result.name)}
                >
                  🤖 ASK AI DECISION LAB ABOUT THIS &rarr;
                </button>
                <Link to="/action-plan" className="btn btn-secondary" style={{ padding: "10px 18px" }}>
                  View Safe Action Plan &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default HypeCheck;
