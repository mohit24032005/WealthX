import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AskWealthXCopilot from "../../components/recovery/AskWealthXCopilot";
import { LoadingState } from "../../components/common/StateViews";
import api from "../../utils/apiClient";
import "./AIRecoveryStudio.css";
import "./RecoverySimulator.css";

export const RecoverySimulator = () => {
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState("balanced");

  // Strategy Parameters
  const [maxRetries, setMaxRetries] = useState(3);
  const [minConfidence, setMinConfidence] = useState(70);
  const [highValueThreshold, setHighValueThreshold] = useState(25000);

  // Simulation Output
  const [simulationResult, setSimulationResult] = useState(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post("/api/recovery/simulate-strategy", {
        maxRetries,
        minConfidence,
        highValueThreshold,
      });
      if (res && res.data) {
        setSimulationResult(res.data.projections);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setLoading(false);
    }
  }, [maxRetries, minConfidence, highValueThreshold]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const applyPreset = (type) => {
    setActivePreset(type);
    if (type === "conservative") {
      setMaxRetries(2);
      setMinConfidence(80);
      setHighValueThreshold(15000);
    } else if (type === "balanced") {
      setMaxRetries(3);
      setMinConfidence(70);
      setHighValueThreshold(25000);
    } else if (type === "aggressive") {
      setMaxRetries(4);
      setMinConfidence(60);
      setHighValueThreshold(50000);
    }
  };

  const sim = simulationResult || {};

  return (
    <AppLayout disclaimerVariant="general">
      <div className="simulator-container">
        {/* Banner */}
        <div className="recovery-header-banner">
          <div>
            <div className="recovery-badge-row">
              <span className="badge-track">Decision Modeling</span>
              <span className="badge-simulated">SIMULATED STRATEGY ESTIMATE</span>
            </div>
            <h1 className="recovery-title">Recovery Strategy Simulator</h1>
            <p className="recovery-subtitle">
              Stress-test hypothetical recovery policies across your active payment failures. Quantify projected revenue upside against customer friction and churn risk.
            </p>
          </div>

          <a href="/revenue-recovery" className="btn-secondary-action" style={{ textDecoration: "none" }}>
            ← Back to Recovery Studio
          </a>
        </div>

        <div className="sim-grid">
          {/* Controls Panel */}
          <div className="sim-panel">
            <div>
              <h2 className="sim-section-title">Policy Parameters</h2>
              <p className="sim-section-sub">Adjust thresholds to project recovery yield & trade-offs</p>
            </div>

            {/* Presets */}
            <div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "8px" }}>
                Strategy Archetypes
              </span>
              <div className="sim-presets">
                <button
                  type="button"
                  className={`preset-btn ${activePreset === "conservative" ? "active" : ""}`}
                  onClick={() => applyPreset("conservative")}
                >
                  🛡️ Conservative (Min Friction)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === "balanced" ? "active" : ""}`}
                  onClick={() => applyPreset("balanced")}
                >
                  ⚖️ AI Balanced (Recommended)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${activePreset === "aggressive" ? "active" : ""}`}
                  onClick={() => applyPreset("aggressive")}
                >
                  ⚡ Aggressive (Max Capture)
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="sim-slider-group">
              <div className="sim-slider-header">
                <span className="sim-slider-label">Maximum Automated Retries</span>
                <span className="sim-slider-val">{maxRetries} Retries</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                className="sim-slider"
                value={maxRetries}
                onChange={(e) => {
                  setMaxRetries(Number(e.target.value));
                  setActivePreset("custom");
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Higher retry limits attempt more recoveries, but cause fatigue on bank cards.
              </span>
            </div>

            <div className="sim-slider-group">
              <div className="sim-slider-header">
                <span className="sim-slider-label">Minimum Confidence Threshold</span>
                <span className="sim-slider-val">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                className="sim-slider"
                value={minConfidence}
                onChange={(e) => {
                  setMinConfidence(Number(e.target.value));
                  setActivePreset("custom");
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Transactions below this likelihood are escalated to human agents.
              </span>
            </div>

            <div className="sim-slider-group">
              <div className="sim-slider-header">
                <span className="sim-slider-label">High-Value Escalation Cutoff</span>
                <span className="sim-slider-val">₹{highValueThreshold.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="100000"
                step="5000"
                className="sim-slider"
                value={highValueThreshold}
                onChange={(e) => {
                  setHighValueThreshold(Number(e.target.value));
                  setActivePreset("custom");
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Transactions above this amount require mandatory human approval.
              </span>
            </div>
          </div>

          {/* Projections Panel */}
          <div className="sim-panel">
            <div>
              <h2 className="sim-section-title">Projected Impact Analysis</h2>
              <p className="sim-section-sub">Estimated statistical yields across active dataset</p>
            </div>

            {loading ? (
              <LoadingState message="Recalculating Monte Carlo strategy projections..." />
            ) : (
              <>
                <div className="diag-summary-grid">
                  <div className="diag-item">
                    <span className="diag-item-label">Projected Recovered Revenue</span>
                    <div className="diag-item-val" style={{ color: "#34d399", fontSize: "1.4rem" }}>
                      ₹{(sim.projectedRecoveredRevenue || 0).toLocaleString("en-IN")}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Across {sim.projectedRecoveredCount || 0} transactions
                    </span>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">Projected Recovery Rate</span>
                    <div className="diag-item-val" style={{ color: "#38bdf8", fontSize: "1.4rem" }}>
                      {sim.projectedRecoveryRate || 0}%
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Of ₹{(sim.totalPotentialAtRisk || 0).toLocaleString("en-IN")} total volume
                    </span>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">Total Recovery Attempts</span>
                    <div className="diag-item-val">{sim.projectedAttempts || 0}</div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Gateway requests</span>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">Customer Friction Points</span>
                    <div className="diag-item-val" style={{ color: sim.projectedCustomerFrictionCount > 0 ? "#fbbf24" : "#10b981" }}>
                      {sim.projectedCustomerFrictionCount || 0}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      {sim.projectedCustomerFrictionCount > 0 ? "High churn risk" : "Low churn risk"}
                    </span>
                  </div>
                </div>

                <div className="tradeoff-box">
                  <strong>⚠️ Strategic Trade-Off Analysis:</strong>
                  <p style={{ margin: "6px 0 0 0" }}>{sim.tradeoffNote}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <AskWealthXCopilot />
      </div>
    </AppLayout>
  );
};

export default RecoverySimulator;
