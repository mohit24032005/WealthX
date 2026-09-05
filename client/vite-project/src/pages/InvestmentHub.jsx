import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import api from "../utils/apiClient";
import "./InvestmentHub.css";

const INVESTMENT_CATEGORIES = [
  {
    path: "/investments/stocks",
    icon: "⚡",
    title: "Stocks Explorer",
    subtitle: "Direct Equity Ownership",
    description: "Search Indian blue-chip stocks, inspect Upstox valuation ratios (P/E, Market Cap), and analyze earnings growth.",
    badge: "Live NSE Quotes",
    badgeColor: "badge-blue",
    risk: "High Risk",
    key: "stocks",
  },
  {
    path: "/investments/sip",
    icon: "🌱",
    title: "SIP & Mutual Funds",
    subtitle: "Disciplined Compounding",
    description: "Official AMFI NAV feeds, 3Y CAGR, and automated rupee-cost averaging to compound steady multi-year wealth.",
    badge: "Official AMFI NAVs",
    badgeColor: "badge-green",
    risk: "Moderate to High",
    key: "sip",
  },
  {
    path: "/investments/gold",
    icon: "🥇",
    title: "Digital Gold & SGB",
    subtitle: "Inflation & Crisis Hedge",
    description: "Real-time 24K pure gold rates, RBI Sovereign Gold Bond tranches (2.5% p.a. interest), and zero making charges.",
    badge: "Live 24K Spot",
    badgeColor: "badge-amber",
    risk: "Low to Moderate",
    key: "gold",
  },
  {
    path: "/investments/fd",
    icon: "🔒",
    title: "Fixed Deposits (FD)",
    subtitle: "Guaranteed Term Yield",
    description: "Live bank FD interest rates (SBI, HDFC, SFBs up to 8.5%), compounding frequencies, and ₹5L DICGC insurance.",
    badge: "DICGC Insured",
    badgeColor: "badge-blue",
    risk: "Very Low",
    key: "fd",
  },
  {
    path: "/investments/bonds",
    icon: "🏛️",
    title: "Government Bonds",
    subtitle: "Sovereign Debt Papers",
    description: "Real-time RBI 10Y Benchmark G-Sec yields (~7.04%), 91-Day T-Bills, and State Development Loans with zero credit risk.",
    badge: "Zero Default Risk",
    badgeColor: "badge-blue",
    risk: "Lowest Default Risk",
    key: "bonds",
  },
  {
    path: "/investments/etfs",
    icon: "🌐",
    title: "Index & ETFs",
    subtitle: "Passive Market Replication",
    description: "Ultra low-cost exchange-traded funds tracking Nifty 50, Nifty Bank, and Gold with live real-time market prices.",
    badge: "0.04% Low TER",
    badgeColor: "badge-green",
    risk: "Market Linked",
    key: "etfs",
  },
];

export const InvestmentHub = () => {
  const [hubData, setHubData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHubSummary = async () => {
      try {
        const res = await api.get("/api/investments/hub-summary");
        if (res && res.data) {
          setHubData(res.data);
        }
      } catch (err) {
        console.error("Hub summary error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHubSummary();
  }, []);

  const tickers = hubData?.tickers || [
    { symbol: "NIFTY 50", price: "24,850.30", change: "+142.60", changePct: "+0.58%", isPositive: true },
    { symbol: "SENSEX", price: "81,385.40", change: "+420.10", changePct: "+0.52%", isPositive: true },
    { symbol: "24K GOLD/g", price: "₹7,485", change: "+₹35", changePct: "+0.47%", isPositive: true },
    { symbol: "10Y G-SEC", price: "7.04%", change: "-0.02%", changePct: "-0.28%", isPositive: true },
  ];

  const userContext = hubData?.userContext;
  const suggestions = hubData?.suggestions;

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="investment-hub-view">
        {/* Real-Time Live Ticker Tape */}
        <div className="live-ticker-strip glass-panel">
          <div className="ticker-live-badge">
            <span className="live-pulse-dot"></span>
            <span>LIVE MARKETS</span>
          </div>
          <div className="ticker-items-wrap">
            {tickers.map((t, idx) => (
              <div key={idx} className="ticker-item">
                <span className="ticker-symbol font-bold">{t.symbol}</span>
                <span className="ticker-price font-mono text-cyan">{t.price}</span>
                <span className={`ticker-delta ${t.isPositive ? "text-teal" : "text-rose"}`}>
                  {t.change} ({t.changePct})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="hub-header-banner glass-panel">
          <div className="banner-left">
            <span className="welcome-tag">Asset Class Intelligence & Real-Time Data</span>
            <h1 className="welcome-name">Investment Hub</h1>
            <p className="welcome-sub">
              Live market feeds across Indian Equities, AMFI Mutual Funds, 24K Gold, Fixed Deposits, and RBI Sovereign Bonds. Includes algorithmic buying suggestions tailored to your monthly earnings.
            </p>
          </div>
          <div className="banner-right">
            <Link to="/ai-decision-lab" className="btn btn-primary" style={{ fontWeight: 800 }}>
              🤖 ASK AI DECISION LAB &rarr;
            </Link>
          </div>
        </div>

        {/* Personalized Earnings-Based Investment Blueprint */}
        {userContext && suggestions && userContext.monthlyIncome > 0 && (
          <div className="earnings-blueprint-card glass-panel">
            <div className="blueprint-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="blueprint-icon">💡</span>
                <div>
                  <h3 className="blueprint-title">Your Earnings-Based Allocation Blueprint</h3>
                  <span className="text-muted" style={{ fontSize: "12.5px" }}>
                    Tuned to your ₹{Number(userContext.monthlyIncome).toLocaleString("en-IN")}/mo income & ₹{Number(userContext.monthlySurplus).toLocaleString("en-IN")}/mo surplus
                  </span>
                </div>
              </div>
              <span className="badge badge-teal font-mono">{userContext.riskCategory}</span>
            </div>

            <div className="blueprint-grid">
              <div className="blueprint-col">
                <span className="blueprint-col-label">🌱 Monthly Mutual Fund SIP</span>
                <span className="blueprint-col-val font-mono text-teal">
                  ₹{Number(suggestions.sip?.recommendedMonthlyAllocation || 0).toLocaleString("en-IN")}/mo
                </span>
                <span className="blueprint-col-desc">Core wealth compounding</span>
              </div>

              <div className="blueprint-col">
                <span className="blueprint-col-label">🥇 Digital Gold / SGB Hedge</span>
                <span className="blueprint-col-val font-mono text-amber">
                  ₹{Number(suggestions.gold?.recommendedMonthlyAllocation || 0).toLocaleString("en-IN")}/mo
                </span>
                <span className="blueprint-col-desc">Inflation & currency hedge</span>
              </div>

              <div className="blueprint-col">
                <span className="blueprint-col-label">🔒 Fixed Income / FD Buffer</span>
                <span className="blueprint-col-val font-mono text-cyan">
                  ₹{Number(suggestions.fd?.recommendedMonthlyAllocation || 0).toLocaleString("en-IN")}/mo
                </span>
                <span className="blueprint-col-desc">Guaranteed capital protection</span>
              </div>

              <div className="blueprint-col">
                <span className="blueprint-col-label">⚡ Direct Equity Allocation</span>
                <span className="blueprint-col-val font-mono text-blue">
                  ₹{Number(suggestions.stocks?.recommendedMonthlyAllocation || 0).toLocaleString("en-IN")}/mo
                </span>
                <span className="blueprint-col-desc">Bluechip growth opportunities</span>
              </div>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="investment-grid">
          {INVESTMENT_CATEGORIES.map((cat) => {
            const catSuggestion = suggestions ? suggestions[cat.key] : null;

            return (
              <Link key={cat.path} to={cat.path} className="investment-category-card glass-panel glow-hover">
                <div className="category-top">
                  <div className="category-icon">{cat.icon}</div>
                  <div className="category-badges">
                    <span className={`badge ${cat.badgeColor}`}>{cat.badge}</span>
                    <span className="risk-tag">{cat.risk}</span>
                  </div>
                </div>

                <div className="category-info">
                  <h3 className="category-title">{cat.title}</h3>
                  <span className="category-subtitle">{cat.subtitle}</span>
                  <p className="category-desc">{cat.description}</p>
                </div>

                {/* Earnings Suggestion Tag */}
                {catSuggestion && (
                  <div className="category-suggestion-pill">
                    <span className="sugg-tag-icon">🎯</span>
                    <span className="sugg-tag-text">
                      <strong>Rec:</strong> ₹{Number(catSuggestion.recommendedMonthlyAllocation).toLocaleString("en-IN")}/mo ({catSuggestion.headline})
                    </span>
                  </div>
                )}

                <div className="category-footer">
                  <span className="explore-link">Inspect Real-Time Data & Recommendations &rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default InvestmentHub;
