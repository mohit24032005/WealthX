import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import AllocationBar from "../components/charts/AllocationBar";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./MyNextMoney.css";

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export const MyNextMoney = () => {
  const [amount, setAmount] = useState(10000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllocation = useCallback(async (customAmt) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/next-money/allocate", {
        amount: customAmt || amount,
      });
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to calculate next money allocation.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to allocation intelligence engine.");
    } finally {
      setLoading(false);
    }
  }, [amount]);

  useEffect(() => {
    fetchAllocation(10000);
  }, []);

  const handleAmountChange = (newVal) => {
    const val = Number(newVal);
    setAmount(val);
    fetchAllocation(val);
  };

  return (
    <AppLayout disclaimerVariant="general">
      <div className="next-money-view">
        {/* Header */}
        <div className="next-money-header">
          <div className="breadcrumb-pill">
            <span className="live-dot"></span>
            <span>BALANCE SHEET SURPLUS OPTIMIZER</span>
          </div>
          <h1 className="next-money-title">Where Should Your Next ₹{amount.toLocaleString("en-IN")} Go?</h1>
          <p className="next-money-sub">
            Algorithmic surplus distribution tuned to your live balance sheet — balancing emergency liquidity defense, debt reduction, and long-term compounding.
          </p>
        </div>

        {/* Input & Quick Selector Card */}
        <div className="amount-selector-card glass-panel">
          <div className="amount-input-group">
            <label className="amount-input-label">Select or Enter Available Surplus Amount</label>
            <div className="amount-input-wrapper">
              <span className="amount-currency-prefix">₹</span>
              <input
                type="number"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                onBlur={() => fetchAllocation(amount)}
                className="amount-input-field"
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fetchAllocation(amount)}
                style={{ padding: "8px 18px", fontSize: "13px" }}
              >
                Recalculate ⚡
              </button>
            </div>
          </div>

          <div className="quick-amount-pills">
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                className={`quick-pill ${amount === amt ? "active" : ""}`}
                onClick={() => handleAmountChange(amt)}
              >
                ₹{amt.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Analyzing live emergency runway, debt burden, and growth capacity..." />
        ) : error ? (
          <ErrorState title="Allocation Engine Offline" message={error} onRetry={() => fetchAllocation(amount)} />
        ) : data ? (
          <div className="allocation-results-box">
            {/* Scenario Banner */}
            <div className="scenario-banner glass-panel">
              <div className="scenario-banner-left">
                <span className="welcome-tag text-teal">Active Strategy</span>
                <h2 className="scenario-title">{data.scenarioName}</h2>
                <p className="scenario-desc">{data.scenarioDescription}</p>
              </div>
              <div className="scenario-metrics-badge">
                <div className="scenario-badge-item">
                  <span className="text-muted" style={{ fontSize: "11px" }}>Emergency Buffer</span>
                  <span className="font-bold text-teal">{data.emergencyMonths} Mos</span>
                </div>
                <div className="scenario-badge-item">
                  <span className="text-muted" style={{ fontSize: "11px" }}>EMI Load</span>
                  <span className="font-bold text-cyan">{data.emiBurdenPct}%</span>
                </div>
              </div>
            </div>

            {/* Visual Allocation Bar & Legend */}
            <div className="allocation-bar-card glass-panel glow-hover">
              <h3 className="section-title">📊 Optimized Capital Distribution</h3>
              <AllocationBar slices={data.slices} total={data.totalAmount} showCards={true} />
            </div>

            {/* Actionable Next Steps Grid */}
            <div className="action-steps-section">
              <h3 className="section-title">🚀 How to Deploy Your ₹{amount.toLocaleString("en-IN")}</h3>
              <div className="action-steps-grid">
                {data.slices.map((slice, idx) => {
                  let link = "/investments";
                  if (slice.label.toLowerCase().includes("emergency")) link = "/financial-xray";
                  else if (slice.label.toLowerCase().includes("loan") || slice.label.toLowerCase().includes("debt")) link = "/loans";
                  else if (slice.label.toLowerCase().includes("goal")) link = "/goals";
                  else if (slice.label.toLowerCase().includes("sip")) link = "/calculators/sip";
                  else if (slice.label.toLowerCase().includes("gold")) link = "/investments/gold";

                  return (
                    <div key={idx} className="action-step-card glass-panel">
                      <div className="action-step-header">
                        <span className="action-step-dot" style={{ background: slice.color }}></span>
                        <h4 className="action-step-name">{slice.label}</h4>
                      </div>
                      <div className="action-step-amt" style={{ color: slice.color }}>
                        ₹{Number(slice.amount).toLocaleString("en-IN")}{" "}
                        <span className="action-step-pct">({slice.percentage}%)</span>
                      </div>
                      <p className="action-step-rationale">{slice.rationale}</p>
                      <Link to={link} className="btn btn-secondary action-step-btn">
                        Execute in {slice.label.split(" ")[0]} &rarr;
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default MyNextMoney;
