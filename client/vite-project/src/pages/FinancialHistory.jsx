import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout";
import LineChart from "../components/charts/LineChart";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./FinancialHistory.css";

export const FinancialHistory = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/history");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load financial audit history.");
      }
    } catch (err) {
      setError(err.message || "History engine offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Compiling chronological audit ledger & net worth trajectory..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState title="History Ledger Offline" message={error} onRetry={fetchHistory} />
      </AppLayout>
    );
  }

  const history = data?.history || [];
  const netWorthTrend = data?.netWorthTrend || [];

  const filteredEvents = history.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "assets") return ev.eventType.includes("asset");
    if (filter === "goals") return ev.eventType.includes("goal");
    if (filter === "loans") return ev.eventType.includes("loan");
    if (filter === "decisions") return ev.eventType.includes("decision") || ev.eventType.includes("risk");
    return true;
  });

  const getEventIcon = (type) => {
    if (type.includes("asset")) return "🏦";
    if (type.includes("goal")) return "🎯";
    if (type.includes("loan")) return "💳";
    if (type.includes("risk")) return "🧬";
    if (type.includes("decision")) return "🤖";
    return "📝";
  };

  return (
    <AppLayout disclaimerVariant="general">
      <div className="history-view">
        {/* Header */}
        <div className="history-header">
          <div className="breadcrumb-pill">
            <span className="live-dot"></span>
            <span>AUDIT TRAIL & BALANCE SHEET CHRONOLOGY</span>
          </div>
          <h1 className="history-title">Audit & Financial History</h1>
          <p className="history-sub">
            A tamper-evident chronological timeline of your assets, loan commitments, milestone contributions, Risk DNA assessments, and simulated actions.
          </p>
        </div>

        {/* Net Worth Progression Chart */}
        <div className="history-chart-card glass-panel glow-hover">
          <div className="history-chart-header">
            <h3 className="section-title">📈 Net Worth Progression (Last 6 Months)</h3>
            <span className="badge badge-green">Compounding Active</span>
          </div>
          <LineChart data={netWorthTrend} color="#10b981" height={220} valuePrefix="₹" />
        </div>

        {/* Timeline Events Section */}
        <div className="timeline-section-card glass-panel">
          <div className="timeline-filters-header">
            <h3 className="section-title">🕒 Chronological Event Log ({filteredEvents.length})</h3>
            <div className="history-filter-pills">
              {[
                { id: "all", label: "All Activity" },
                { id: "assets", label: "Assets" },
                { id: "goals", label: "Goals" },
                { id: "loans", label: "Loans" },
                { id: "decisions", label: "Decisions & Risk DNA" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  className={`hist-filter-pill ${filter === btn.id ? "active" : ""}`}
                  onClick={() => setFilter(btn.id)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="empty-history-box">
              <span className="empty-icon">📂</span>
              <p className="text-muted">No timeline events recorded under this category yet.</p>
            </div>
          ) : (
            <div className="timeline-list">
              {filteredEvents.map((ev, i) => (
                <div key={ev._id || i} className="timeline-item">
                  <div className="timeline-left-column">
                    <div className="timeline-dot">{getEventIcon(ev.eventType)}</div>
                    {i < filteredEvents.length - 1 && <div className="timeline-connector-line"></div>}
                  </div>
                  <div className="timeline-content-card">
                    <div className="timeline-item-header">
                      <h4 className="timeline-item-title">{ev.title}</h4>
                      <span className="timeline-item-date font-mono">
                        {new Date(ev.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {ev.description && <p className="timeline-item-desc">{ev.description}</p>}
                    {ev.amount > 0 && (
                      <div className="timeline-item-amt font-mono text-teal">
                        Valuation / Commitment: ₹{Number(ev.amount).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default FinancialHistory;
