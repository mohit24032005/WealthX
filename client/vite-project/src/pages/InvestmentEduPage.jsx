import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./InvestmentEduPage.css";

const CATEGORY_TABS = [
  { key: "sip", label: "🌱 SIP & Mutual Funds", path: "/investments/sip" },
  { key: "gold", label: "🥇 Digital Gold & SGB", path: "/investments/gold" },
  { key: "fd", label: "🔒 Fixed Deposits", path: "/investments/fd" },
  { key: "bonds", label: "🏛️ Govt Bonds", path: "/investments/bonds" },
  { key: "etfs", label: "🌐 Index & ETFs", path: "/investments/etfs" },
  { key: "stocks", label: "⚡ Stocks Explorer", path: "/investments/stocks" },
];

export const InvestmentEduPage = ({ defaultCategory }) => {
  const params = useParams();
  const categoryKey = defaultCategory || params.category || "sip";

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/investments/educational/${categoryKey}`);
      if (res && res.data) {
        setContent(res.data);
      } else {
        throw new Error(res.message || "Failed to load educational module.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to investment knowledge engine.");
    } finally {
      setLoading(false);
    }
  }, [categoryKey]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const { liveData, personalizedSuggestion } = content || {};

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="edu-page-view">
        {/* Navigation Sub-bar */}
        <div className="edu-nav-tabs">
          {CATEGORY_TABS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={`edu-tab-link ${categoryKey === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <LoadingState message="Loading live market benchmarks and personal earnings-based recommendations..." />
        ) : error ? (
          <ErrorState
            title="Investment Guide Offline"
            message={error}
            onRetry={fetchContent}
          />
        ) : content ? (
          <div className="edu-content-container">
            {/* Header Banner */}
            <div className="edu-header-banner glass-panel">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span className="welcome-tag">Asset Class Blueprint</span>
                  {liveData?.source && (
                    <span className="badge badge-green font-mono" style={{ fontSize: "10px" }}>
                      ● {liveData.source}
                    </span>
                  )}
                </div>
                <h1 className="edu-title">{content.title}</h1>
                <p className="edu-tagline">{content.tagline}</p>
              </div>
              <div className="edu-header-actions">
                <Link to="/ai-decision-lab" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  🤖 ASK AI &rarr;
                </Link>
                <Link to="/wealth-vault" className="btn btn-secondary">
                  + Add to Wealth Vault
                </Link>
              </div>
            </div>

            {/* 🌟 PERSONALIZED EARNINGS-BASED BUYING RECOMMENDATION */}
            {personalizedSuggestion && (
              <div className="personalized-sugg-card glass-panel glow-hover">
                <div className="sugg-header-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="sugg-hero-icon">💡</span>
                    <div>
                      <span className="section-mini-label">Earnings & Cashflow Suitability</span>
                      <h3 className="sugg-headline">{personalizedSuggestion.headline}</h3>
                    </div>
                  </div>
                  <div className="sugg-score-wrap">
                    <span className="font-mono text-cyan" style={{ fontSize: "18px", fontWeight: 800 }}>
                      {personalizedSuggestion.suitabilityScore}/100
                    </span>
                    <span className="text-muted" style={{ fontSize: "10px", textTransform: "uppercase" }}>Suitability</span>
                  </div>
                </div>

                <div className="sugg-body-grid">
                  <div className="sugg-left-col">
                    <div className="sugg-metric-row">
                      <div>
                        <span className="text-muted" style={{ fontSize: "11px" }}>Recommended Allocation</span>
                        <div className="font-mono text-teal font-bold" style={{ fontSize: "18px" }}>
                          ₹{Number(personalizedSuggestion.recommendedMonthlyAllocation).toLocaleString("en-IN")}/month
                        </div>
                      </div>
                    </div>
                    <p className="sugg-reason-text">{personalizedSuggestion.whyBuyForYourEarnings}</p>
                  </div>

                  <div className="sugg-right-col">
                    <span className="text-muted font-bold" style={{ fontSize: "11.5px", textTransform: "uppercase" }}>
                      Top Screened Instruments:
                    </span>
                    <ul className="sugg-picks-list">
                      {personalizedSuggestion.topPicks?.map((pick, i) => (
                        <li key={i} className="sugg-pick-item">
                          <span className="text-teal font-bold">✓</span> {pick}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 📊 LIVE REAL-TIME DATA SECTION */}
            {liveData && (
              <div className="live-data-container glass-panel">
                <div className="live-section-header">
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 800 }}>📈 Real-Time Market Benchmarks</h3>
                    <span className="text-muted" style={{ fontSize: "12px" }}>Source: {liveData.source}</span>
                  </div>
                  {liveData.lastUpdated && (
                    <span className="badge badge-blue font-mono" style={{ fontSize: "10.5px" }}>
                      As of: {liveData.lastUpdated}
                    </span>
                  )}
                </div>

                {/* Case 1: Mutual Funds (AMFI) */}
                {liveData.type === "mutual_funds" && liveData.funds && (
                  <div className="live-funds-grid">
                    {liveData.funds.map((fund) => (
                      <div key={fund.schemeCode} className="live-fund-row-card glass-panel">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span className="badge badge-blue" style={{ fontSize: "10px" }}>{fund.category}</span>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0 2px 0" }}>{fund.name}</h4>
                            <span className="text-muted" style={{ fontSize: "11px" }}>{fund.amc} &bull; Scheme: {fund.schemeCode}</span>
                          </div>
                          <div className="font-mono text-teal font-bold" style={{ fontSize: "14px", textAlign: "right" }}>
                            {fund.suitabilityScore}/100 Fit
                          </div>
                        </div>

                        <div className="fund-specs-row">
                          <div>
                            <span className="text-muted" style={{ fontSize: "10.5px" }}>Official NAV</span>
                            <div className="font-mono font-bold text-cyan" style={{ fontSize: "13px" }}>₹{fund.latestNav}</div>
                          </div>
                          <div>
                            <span className="text-muted" style={{ fontSize: "10.5px" }}>3Y CAGR</span>
                            <div className="font-mono font-bold text-teal" style={{ fontSize: "13px" }}>+{fund.cagr3Y}%</div>
                          </div>
                          <div>
                            <span className="text-muted" style={{ fontSize: "10.5px" }}>Expense Ratio</span>
                            <div className="font-mono" style={{ fontSize: "13px" }}>{fund.expenseRatio}%</div>
                          </div>
                          <div>
                            <span className="text-muted" style={{ fontSize: "10.5px" }}>Riskometer</span>
                            <div className="text-amber" style={{ fontSize: "12px", fontWeight: 600 }}>{fund.riskLevel}</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                          <Link to="/calculators/sip" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px", flex: 1, textAlign: "center" }}>
                            Simulate SIP &rarr;
                          </Link>
                          <Link to="/ai-decision-lab" className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 800 }}>
                            🤖 Ask AI
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Case 2: Digital Gold & SGB */}
                {liveData.type === "gold" && (
                  <div className="gold-live-wrap">
                    <div className="gold-spot-banner glass-panel">
                      <div>
                        <span className="text-muted" style={{ fontSize: "12px" }}>24K 99.9% Pure Gold Spot Rate</span>
                        <div className="font-mono font-bold text-amber" style={{ fontSize: "28px" }}>
                          ₹{Number(liveData.spotPrice24KPerGram).toLocaleString("en-IN")}/gram
                        </div>
                        <span className="text-teal font-bold" style={{ fontSize: "12px" }}>
                          +₹{liveData.spotChangePerGram} (+{liveData.spotChangePct}%) Today
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="badge badge-amber font-mono">IBJA Benchmark</span>
                        <div className="text-muted" style={{ fontSize: "11.5px", marginTop: "6px" }}>
                          Recommended: 5% - 10% of portfolio as inflation hedge
                        </div>
                      </div>
                    </div>

                    <div className="sgb-series-list">
                      <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "14px 0 8px 0" }}>📜 Sovereign Gold Bond (SGB) Tranches</h4>
                      <div className="sgb-grid">
                        {liveData.sgbSeries?.map((sgb, idx) => (
                          <div key={idx} className="sgb-card glass-panel">
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <h5 style={{ fontSize: "13.5px", fontWeight: 700 }}>{sgb.seriesName}</h5>
                              <span className="badge badge-green" style={{ fontSize: "10px" }}>{sgb.annualInterestRate}</span>
                            </div>
                            <div className="sgb-metrics">
                              <div>
                                <span className="text-muted" style={{ fontSize: "11px" }}>Current Market Price</span>
                                <div className="font-mono font-bold text-cyan">₹{sgb.currentMarketPrice}/g</div>
                              </div>
                              <div>
                                <span className="text-muted" style={{ fontSize: "11px" }}>Maturity</span>
                                <div className="font-mono font-bold text-teal">{sgb.maturityYear}</div>
                              </div>
                            </div>
                            <p className="text-muted" style={{ fontSize: "11.5px", margin: "6px 0 0 0" }}>{sgb.taxBenefit}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 3: Fixed Deposits (FD) */}
                {liveData.type === "fixed_deposits" && (
                  <div className="fd-live-wrap">
                    <div className="fd-table-wrap">
                      <table className="custom-fin-table">
                        <thead>
                          <tr>
                            <th>Bank / Institution</th>
                            <th>Type</th>
                            <th>1-Year Rate</th>
                            <th>3-Year Rate</th>
                            <th>5-Year (Tax-Saver)</th>
                            <th>Safety / Insurance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveData.rates?.map((fd, idx) => (
                            <tr key={idx}>
                              <td className="font-bold">{fd.institution}</td>
                              <td className="text-muted" style={{ fontSize: "12px" }}>{fd.type}</td>
                              <td className="font-mono text-cyan font-bold">{fd.rate1Y}</td>
                              <td className="font-mono text-teal font-bold">{fd.rate3Y}</td>
                              <td className="font-mono font-bold">{fd.rate5Y}</td>
                              <td>
                                <span className="badge badge-green" style={{ fontSize: "10px" }}>
                                  ✓ DICGC ₹5L
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Case 4: Government Bonds */}
                {liveData.type === "government_bonds" && (
                  <div className="bonds-live-wrap">
                    <div className="bonds-grid">
                      {liveData.bonds?.map((bond, idx) => (
                        <div key={idx} className="bond-card glass-panel">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <span className="badge badge-blue" style={{ fontSize: "10px" }}>{bond.type}</span>
                              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0 2px 0" }}>{bond.securityName}</h4>
                              <span className="text-muted" style={{ fontSize: "11px" }}>Tenure: {bond.tenure} &bull; {bond.frequency}</span>
                            </div>
                            <div className="font-mono text-teal font-bold" style={{ fontSize: "16px", textAlign: "right" }}>
                              {bond.currentYield}
                              <span style={{ fontSize: "10px", display: "block", color: "var(--text-muted)" }}>Current Yield</span>
                            </div>
                          </div>
                          <p className="text-muted" style={{ fontSize: "12px", margin: "8px 0 0 0" }}>{bond.suitability}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case 5: Index & ETFs */}
                {liveData.type === "etfs" && (
                  <div className="etfs-live-wrap">
                    <div className="etfs-grid">
                      {liveData.etfs?.map((etf, idx) => (
                        <div key={idx} className="etf-card glass-panel">
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <span className="font-mono font-bold text-cyan" style={{ fontSize: "14px" }}>{etf.symbol}</span>
                              <h4 style={{ fontSize: "13px", fontWeight: 600 }}>{etf.name}</h4>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div className="font-mono font-bold" style={{ fontSize: "15px" }}>₹{etf.price}</div>
                              <span className="text-teal font-bold" style={{ fontSize: "11px" }}>+{etf.changePct}%</span>
                            </div>
                          </div>

                          <div className="etf-specs-row">
                            <div>
                              <span className="text-muted" style={{ fontSize: "10.5px" }}>Underlying</span>
                              <div style={{ fontSize: "11.5px", fontWeight: 600 }}>{etf.underlyingIndex}</div>
                            </div>
                            <div>
                              <span className="text-muted" style={{ fontSize: "10.5px" }}>Expense TER</span>
                              <div className="font-mono text-teal" style={{ fontSize: "12px", fontWeight: 700 }}>{etf.expenseRatio}</div>
                            </div>
                            <div>
                              <span className="text-muted" style={{ fontSize: "10.5px" }}>3Y CAGR</span>
                              <div className="font-mono text-cyan" style={{ fontSize: "12px", fontWeight: 700 }}>{etf.cagr3Y}</div>
                            </div>
                          </div>
                          <p className="text-muted" style={{ fontSize: "11.5px", margin: "6px 0 0 0" }}>{etf.suitability}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="edu-metrics-bar">
              <div className="edu-stat-pill glass-panel">
                <span className="stat-pill-label">Risk Profile</span>
                <span className="stat-pill-val font-bold text-amber">{content.riskLevel}</span>
              </div>
              <div className="edu-stat-pill glass-panel">
                <span className="stat-pill-label">Liquidity Window</span>
                <span className="stat-pill-val font-bold text-teal">{content.liquidity}</span>
              </div>
              <div className="edu-stat-pill glass-panel">
                <span className="stat-pill-label">Optimal Horizon</span>
                <span className="stat-pill-val font-bold text-cyan">{content.typicalHorizon}</span>
              </div>
            </div>

            {/* Deep-Dive Educational Grid */}
            <div className="edu-sections-grid">
              <div className="edu-section-card glass-panel">
                <h3 className="section-card-title">📖 What Is It & How It Works</h3>
                <p className="section-card-text">{content.whatIsIt}</p>
              </div>

              <div className="edu-section-card glass-panel">
                <h3 className="section-card-title text-teal">✓ Core Advantages</h3>
                <ul className="edu-list">
                  {content.advantages?.map((adv, idx) => (
                    <li key={idx}>{adv}</li>
                  ))}
                </ul>
              </div>

              <div className="edu-section-card glass-panel">
                <h3 className="section-card-title text-rose">⚠️ Risks & Considerations</h3>
                <ul className="edu-list">
                  {content.risks?.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>

              <div className="edu-section-card glass-panel">
                <h3 className="section-card-title text-cyan">🎯 Strategic Factors to Evaluate</h3>
                <ul className="edu-list">
                  {content.importantFactors?.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default InvestmentEduPage;
