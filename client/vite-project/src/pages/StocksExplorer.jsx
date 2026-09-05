import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./StocksExplorer.css";

export const StocksExplorer = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [isSimulated, setIsSimulated] = useState(true);

  // Search stocks debounced
  const performSearch = useCallback(async (searchTerm) => {
    setLoadingSearch(true);
    try {
      const res = await api.get(`/api/investments/stocks/search?q=${encodeURIComponent(searchTerm)}`);
      if (res && res.data) {
        setResults(res.data);
        if (res.meta?.isSimulated !== undefined) {
          setIsSimulated(res.meta.isSimulated);
        }
      }
    } catch (err) {
      console.error("Stock search error:", err);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Load detailed stock quote
  const loadStockDetails = useCallback(async (symbol) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const res = await api.get(`/api/investments/stocks/${symbol}`);
      if (res && res.data) {
        setSelectedStock(res.data);
        if (res.data.isSimulated !== undefined) {
          setIsSimulated(res.data.isSimulated);
        }
      } else {
        throw new Error("Failed to load stock details.");
      }
    } catch (err) {
      setError(err.message || "Error fetching stock quote.");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Initial load default stock (RELIANCE)
  useEffect(() => {
    loadStockDetails("RELIANCE");
  }, [loadStockDetails]);

  // Render SVG Chart for historical points
  const renderSparkline = (history) => {
    if (!history || history.length < 2) return null;

    const width = 600;
    const height = 180;
    const padding = 20;

    const prices = history.map((h) => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = history.map((item, idx) => {
      const x = padding + (idx / (history.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((item.price - minPrice) / priceRange) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const isPositive = prices[prices.length - 1] >= prices[0];
    const strokeColor = isPositive ? "#10b981" : "#f43f5e";
    const gradientId = `gradient-${isPositive ? "green" : "rose"}`;

    const pathD = `M ${points.join(" L ")}`;
    const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <div className="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="stock-svg-chart">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradientId})`} />
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" />
        </svg>
        <div className="chart-axis-labels">
          <span>{history[0].date}</span>
          <span className="currency font-bold text-muted">30-Day Trendline Action</span>
          <span>{history[history.length - 1].date}</span>
        </div>
      </div>
    );
  };

  const handleAskAIAboutStock = (symbol, name) => {
    navigate("/ai-decision-lab", {
      state: {
        presetQuery: `Analyze whether I should buy ${name} (${symbol}) considering its valuation and my current earnings stage.`,
      },
    });
  };

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="stocks-explorer-view">
        {/* Header */}
        <div className="stocks-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>INDIAN EQUITIES EXPLORER & UPSTOX INTELLIGENCE</span>
            </div>
            <h1 className="stocks-title">Stocks Explorer</h1>
            <p className="stocks-sub">
              Search Indian blue-chip tickers, evaluate key financial valuation ratios (P/E vs Industry, ROE), and inspect earnings-based buying suggestions.
            </p>
          </div>
          <div className="data-source-pill">
            <span className="data-badge-indicator"></span>
            <span>{isSimulated ? "NSE BENCHMARK EOD" : "UPSTOX LIVE FEED"}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="stocks-search-section glass-panel">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="stocks-search-input"
              placeholder="Search by symbol or company (e.g. RELIANCE, TCS, HDFCBANK, INFY)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loadingSearch && <span className="search-spinner">⏳</span>}
          </div>

          {/* Quick Filter Buttons */}
          <div className="popular-tickers-row">
            <span className="popular-label">Popular Tickers:</span>
            {["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "ITC", "SBIN", "BHARTIARTL", "LT"].map(
              (sym) => (
                <button
                  key={sym}
                  type="button"
                  className={`ticker-chip ${selectedStock?.symbol === sym ? "active" : ""}`}
                  onClick={() => loadStockDetails(sym)}
                >
                  {sym}
                </button>
              )
            )}
          </div>
        </div>

        {/* Main Content: Search Results & Stock Detail */}
        <div className="stocks-layout-grid">
          {/* Left Column: Search Results List */}
          <div className="stocks-results-card glass-panel">
            <div className="section-card-header">
              <h3>Market Symbols ({results.length})</h3>
            </div>

            <div className="results-list">
              {results.map((stock) => {
                const isSelected = selectedStock?.symbol === stock.symbol;
                const isPositive = (stock.change || 0) >= 0;

                return (
                  <div
                    key={stock.symbol}
                    className={`result-item ${isSelected ? "selected" : ""}`}
                    onClick={() => loadStockDetails(stock.symbol)}
                  >
                    <div className="result-left">
                      <span className="result-sym">{stock.symbol}</span>
                      <span className="result-name">{stock.name}</span>
                    </div>
                    <div className="result-right">
                      <span className="currency result-price">
                        ₹{Number(stock.price).toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`change-tag ${
                          isPositive ? "text-teal" : "text-rose"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {stock.changePct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Stock Deep-Dive */}
          <div className="stocks-detail-column">
            {loadingDetails ? (
              <div className="glass-panel" style={{ padding: "40px" }}>
                <LoadingState message="Fetching live valuation metrics and price trendline..." />
              </div>
            ) : error ? (
              <ErrorState title="Unable to Load Ticker" message={error} onRetry={() => loadStockDetails("RELIANCE")} />
            ) : selectedStock ? (
              <div className="stock-detail-card glass-panel">
                {/* Header Info */}
                <div className="detail-header">
                  <div>
                    <div className="detail-symbol-row">
                      <h2 className="detail-symbol">{selectedStock.symbol}</h2>
                      <span className="badge badge-blue">{selectedStock.sector}</span>
                      <span className="badge badge-amber">NSE</span>
                    </div>
                    <p className="detail-company-name">{selectedStock.name}</p>
                  </div>

                  <div className="detail-price-box">
                    <div className="detail-price currency">
                      ₹{Number(selectedStock.price).toLocaleString("en-IN")}
                    </div>
                    <div
                      className={`detail-change ${
                        (selectedStock.change || 0) >= 0 ? "text-teal" : "text-rose"
                      }`}
                    >
                      {(selectedStock.change || 0) >= 0 ? "▲ +" : "▼ "}
                      ₹{Math.abs(selectedStock.change || 0)} ({selectedStock.changePct}%)
                    </div>
                  </div>
                </div>

                {/* 🌟 EARNINGS-BASED VALUATION & BUYING INTELLIGENCE */}
                <div className="stock-intelligence-box glass-panel glow-hover">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>💡</span>
                      <span className="font-bold text-cyan" style={{ fontSize: "13px", textTransform: "uppercase" }}>
                        Valuation & Earnings Insight
                      </span>
                    </div>
                    <span className="badge badge-green font-mono">{selectedStock.valuationStatus || "Fair Value"}</span>
                  </div>

                  <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: "1.5" }}>
                    <strong>Suitability:</strong> {selectedStock.suitability || "Long-term Wealth Creation"}.
                    P/E ratio of <strong>{selectedStock.peRatio}</strong> vs Industry benchmark of <strong>{selectedStock.industryPE || "—"}</strong>.
                    ROE of <strong>{selectedStock.roe || "—"}</strong> indicates efficient capital deployment.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: "12.5px", fontWeight: 800, padding: "8px 16px" }}
                    onClick={() => handleAskAIAboutStock(selectedStock.symbol, selectedStock.name)}
                  >
                    🤖 ASK AI ABOUT {selectedStock.symbol} &rarr;
                  </button>
                </div>

                {/* 30-Day Trend Chart */}
                <div className="detail-chart-box">
                  <div className="chart-header">
                    <h4>📊 30-Day Price Trendline</h4>
                    <span className="badge badge-blue">{selectedStock.dataSource || "NSE Feed"}</span>
                  </div>
                  {renderSparkline(selectedStock.history)}
                </div>

                {/* Financial Key Metrics Grid */}
                <div className="stock-metrics-grid">
                  <div className="stat-box">
                    <span className="stat-label">P/E Ratio</span>
                    <span className="stat-val font-bold text-cyan">{selectedStock.peRatio || "—"}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Industry P/E</span>
                    <span className="stat-val font-bold">{selectedStock.industryPE || "—"}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Return on Equity (ROE)</span>
                    <span className="stat-val font-bold text-teal">{selectedStock.roe || "—"}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Market Capitalization</span>
                    <span className="stat-val font-bold">{selectedStock.marketCap || "—"}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">52-Week High</span>
                    <span className="stat-val currency text-teal">
                      ₹{Number(selectedStock.high52w || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">52-Week Low</span>
                    <span className="stat-val currency text-rose">
                      ₹{Number(selectedStock.low52w || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Trading Volume</span>
                    <span className="stat-val font-bold">{selectedStock.volume || "—"}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Dividend Yield</span>
                    <span className="stat-val font-bold text-amber">{selectedStock.dividendYield || "—"}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="stock-description-box">
                  <h4>Business Overview</h4>
                  <p>{selectedStock.description}</p>
                </div>

                {/* Quick Action Footer */}
                <div className="stock-action-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate("/wealth-vault")}
                  >
                    + Track in Wealth Vault &rarr;
                  </button>
                  <Link to="/investments" className="btn btn-secondary">
                    Back to Investment Hub
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StocksExplorer;
