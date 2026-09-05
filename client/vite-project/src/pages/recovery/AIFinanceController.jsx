import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AskWealthXCopilot from "../../components/recovery/AskWealthXCopilot";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import api from "../../utils/apiClient";
import "./AIRecoveryStudio.css";
import "./AIFinanceController.css";

export const AIFinanceController = () => {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [onlyExceptions, setOnlyExceptions] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Explain Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/reconciliation/stats");
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load recon stats:", err);
    }
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    try {
      let url = `/api/reconciliation/records?page=${page}&limit=15`;
      if (onlyExceptions) url += "&onlyExceptions=true";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(url);
      if (res && res.data) {
        setRecords(res.data.records || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Failed to load recon records:", err);
    }
  }, [onlyExceptions, statusFilter, searchTerm]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchStats(), fetchRecords(1)]);
      } catch (err) {
        setError(err.message || "Failed to load Finance Controller");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [fetchStats, fetchRecords]);

  const handleExplain = async (record) => {
    setSelectedRecord(record);
    setExplanationData(null);
    setExplaining(true);

    try {
      const res = await api.post(`/api/reconciliation/explain/${record._id}`);
      if (res && res.data) {
        setExplanationData(res.data);
      }
    } catch (err) {
      console.error("Failed to explain discrepancy:", err);
    } finally {
      setExplaining(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedRecord || resolving) return;
    setResolving(true);
    try {
      const res = await api.post(`/api/reconciliation/resolve/${selectedRecord._id}`, {
        notes: "Audited & reconciled by finance controller via WealthX portal",
      });
      if (res) {
        await Promise.all([fetchStats(), fetchRecords(pagination.page)]);
        setSelectedRecord(null);
        alert(`Discrepancy for Order ${selectedRecord.orderId} marked as resolved!`);
      }
    } catch (err) {
      alert(`Resolution failed: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Reconciling payment gateways, merchant orders, and bank settlements..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState title="Finance Controller Offline" message={error} onRetry={fetchStats} />
      </AppLayout>
    );
  }

  const s = stats?.stats || {};
  const breakdown = stats?.exceptionBreakdown || {};

  return (
    <AppLayout disclaimerVariant="general">
      <div className="controller-container">
        {/* Banner */}
        <div className="controller-header-banner">
          <div>
            <div className="recovery-badge-row">
              <span className="controller-badge">Track 04 • AI Finance Controller</span>
              <span className="badge-simulated">3-Way Ledger Reconciliation</span>
            </div>
            <h1 className="recovery-title">AI Finance Controller & Reconciliation</h1>
            <p className="recovery-subtitle">
              Automated 3-way matching across merchant orders, payment gateway collections, and banking settlements—surfacing discrepancies, refund timing differences, and fee leakages.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className={`btn-secondary-action ${onlyExceptions ? "active" : ""}`}
              onClick={() => setOnlyExceptions(!onlyExceptions)}
            >
              <span>{onlyExceptions ? "Showing Exceptions Only" : "Filter: All Exceptions"}</span>
            </button>
          </div>
        </div>

        {/* Top KPIs with Explicit Dynamic Tooltips */}
        <div className="kpi-grid">
          <div
            className="kpi-card"
            title="Reconciliation Match Rate = (Matched Records / Total Records) × 100. Computed dynamically across 3-way orders, gateway captures, and bank settlement batches."
          >
            <span className="kpi-label">Match Rate <span style={{ opacity: 0.6 }}>ℹ️</span></span>
            <span className="kpi-value success">{s.matchRate || 0}%</span>
            <span className="kpi-subtext">{s.matchedCount || 0} of {s.totalRecords || 0} matched perfectly</span>
          </div>

          <div
            className="kpi-card"
            title="Total records with mathematical discrepancies (amount variances, delayed settlement batches, duplicate UPI retries, or fee surcharges)"
          >
            <span className="kpi-label">Open Exceptions <span style={{ opacity: 0.6 }}>ℹ️</span></span>
            <span className="kpi-value danger">{s.exceptionsCount || 0}</span>
            <span className="kpi-subtext">{s.exceptionsCount || 0} exceptions requiring reconciliation</span>
          </div>

          <div
            className="kpi-card"
            title="Total rupee value of all unreconciled variances and pending settlement releases"
          >
            <span className="kpi-label">Discrepancy Volume <span style={{ opacity: 0.6 }}>ℹ️</span></span>
            <span className="kpi-value warning">
              ₹{(s.totalDiscrepancyAmount || 0).toLocaleString("en-IN")}
            </span>
            <span className="kpi-subtext">Unsettled or variance pool</span>
          </div>

          <div
            className="kpi-card"
            title="Net settlement received in bank accounts after acquiring bank 2% MDR and 18% GST deductions"
          >
            <span className="kpi-label">Total Settled <span style={{ opacity: 0.6 }}>ℹ️</span></span>
            <span className="kpi-value">
              ₹{(s.totalSettledAmount || 0).toLocaleString("en-IN")}
            </span>
            <span className="kpi-subtext">Net after 2% MDR & GST fees</span>
          </div>

          <div
            className="kpi-card"
            title="Average latency for automated 3-way matching engine across 100 orders"
          >
            <span className="kpi-label">Avg Engine Latency <span style={{ opacity: 0.6 }}>ℹ️</span></span>
            <span className="kpi-value">{s.avgProcessingTimeSeconds || 1.4}s</span>
            <span className="kpi-subtext">Per 100 3-way record matches</span>
          </div>
        </div>

        {/* Exception Type Pills */}
        <div className="policy-banner">
          <div className="policy-info">
            <span className="policy-title">
              <span>🔍</span> 3-Way Ledger ({s.totalRecords || 100} Total • {s.matchedCount || 70} Matched • {s.exceptionsCount || 30} Exceptions):
            </span>
            <span className="policy-pill">
              Unmatched Order: <strong>{breakdown.unmatched || 0}</strong>
            </span>
            <span className="policy-pill">
              Amount Mismatch: <strong>{breakdown.unmatched_amount || 0}</strong>
            </span>
            <span className="policy-pill">
              Missing Settlement: <strong>{breakdown.missing_settlement || 0}</strong>
            </span>
            <span className="policy-pill">
              Duplicate Capture: <strong>{breakdown.duplicate_payment || 0}</strong>
            </span>
            <span className="policy-pill">
              Fee Variance: <strong>{breakdown.fee_discrepancy || 0}</strong>
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="filter-bar">
          <div className="filter-inputs">
            <input
              type="text"
              placeholder="Search Order ID, Payment ID, Customer..."
              className="search-box"
              style={{ width: "280px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Reconciliation Statuses</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched Order</option>
              <option value="unmatched_amount">Amount Mismatch</option>
              <option value="missing_settlement">Missing Settlement</option>
              <option value="duplicate_payment">Duplicate Payment</option>
              <option value="fee_discrepancy">Fee Discrepancy</option>
            </select>
          </div>
        </div>

        {/* Reconciliation Ledger Table */}
        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Order & Payment</th>
                <th>Customer</th>
                <th>Order Amount</th>
                <th>Collected</th>
                <th>Settled (Bank)</th>
                <th>Gateway Fee</th>
                <th>Discrepancy</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No reconciliation records found matching filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="txn-id-cell">{r.orderId}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "JetBrains Mono" }}>
                        {r.paymentId}
                      </div>
                    </td>
                    <td>
                      <div className="customer-name">{r.customerName}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        Gateway: {r.gateway}
                      </div>
                    </td>
                    <td className="amount-cell">₹{r.orderAmount.toLocaleString("en-IN")}</td>
                    <td className="amount-cell">₹{r.collectedAmount.toLocaleString("en-IN")}</td>
                    <td className="amount-cell" style={{ color: r.settledAmount === 0 ? "#f43f5e" : "#34d399" }}>
                      ₹{r.settledAmount.toLocaleString("en-IN")}
                    </td>
                    <td>₹{r.feeAmount.toLocaleString("en-IN")}</td>
                    <td>
                      <span style={{ color: r.discrepancyAmount > 0 ? "#fbbf24" : "#94a3b8", fontWeight: 700, fontFamily: "JetBrains Mono" }}>
                        {r.discrepancyAmount > 0 ? `₹${r.discrepancyAmount.toLocaleString("en-IN")}` : "₹0"}
                      </span>
                    </td>
                    <td>
                      <span className={`recon-status-pill ${r.status}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      {r.status !== "matched" ? (
                        <button
                          type="button"
                          className="btn-inspect"
                          onClick={() => handleExplain(r)}
                        >
                          Explain →
                        </button>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>
                          ✓ Balanced
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Explain Discrepancy Modal */}
        {selectedRecord && (
          <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
            <div className="diagnosis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">AI Reconciliation Explanation</h2>
                  <p className="modal-sub">
                    Order {selectedRecord.orderId} • Payment {selectedRecord.paymentId}
                  </p>
                </div>
                <button
                  type="button"
                  className="copilot-close-btn"
                  onClick={() => setSelectedRecord(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="diag-summary-grid">
                  <div className="diag-item">
                    <span className="diag-item-label">Order Billed</span>
                    <div className="diag-item-val">₹{selectedRecord.orderAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="diag-item">
                    <span className="diag-item-label">Amount Collected</span>
                    <div className="diag-item-val">₹{selectedRecord.collectedAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="diag-item">
                    <span className="diag-item-label">Settled in Account</span>
                    <div className="diag-item-val">₹{selectedRecord.settledAmount.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="diag-item">
                    <span className="diag-item-label">Discrepancy</span>
                    <div className="diag-item-val" style={{ color: "#f43f5e" }}>
                      ₹{selectedRecord.discrepancyAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="explanation-card">
                  <div className="explanation-title">
                    🤖 AI Root Cause Explanation {explanationData?.isAI && "(Powered by Gemini)"}
                  </div>
                  <p className="explanation-text">
                    {explaining
                      ? "Analyzing mathematical variances across ledger records..."
                      : explanationData?.explanation || selectedRecord.aiExplanation}
                  </p>
                </div>

                <div className="diag-item">
                  <span className="diag-item-label">Gateway Fee Breakdown</span>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "6px" }}>
                    Standard MDR Fee: ₹{selectedRecord.feeAmount.toLocaleString("en-IN")} • GST: ₹{selectedRecord.taxAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </button>
                {selectedRecord.resolutionStatus !== "resolved" && (
                  <button
                    type="button"
                    className="btn-execute-recovery"
                    onClick={handleResolve}
                    disabled={resolving}
                  >
                    {resolving ? "Resolving..." : "Mark Discrepancy Resolved ✓"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <AskWealthXCopilot />
      </div>
    </AppLayout>
  );
};

export default AIFinanceController;
