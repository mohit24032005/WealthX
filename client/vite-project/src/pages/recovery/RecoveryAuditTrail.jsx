import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AskWealthXCopilot from "../../components/recovery/AskWealthXCopilot";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import api from "../../utils/apiClient";
import "./AIRecoveryStudio.css";
import "./RecoveryAuditTrail.css";

export const RecoveryAuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      let url = `/api/recovery/audit?page=${page}&limit=20`;
      if (actionTypeFilter !== "all") url += `&actionType=${actionTypeFilter}`;
      if (resultFilter !== "all") url += `&result=${resultFilter}`;
      if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(url);
      if (res && res.data) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionTypeFilter, resultFilter, searchTerm]);

  useEffect(() => {
    setLoading(true);
    fetchLogs(1);
  }, [fetchLogs]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading immutable recovery audit ledger..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState title="Audit Ledger Offline" message={error} onRetry={() => fetchLogs(1)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout disclaimerVariant="general">
      <div className="audit-container">
        {/* Header */}
        <div className="recovery-header-banner">
          <div>
            <div className="recovery-badge-row">
              <span className="audit-badge">Compliance & Transparency</span>
              <span className="badge-simulated">Immutable Event Log</span>
            </div>
            <h1 className="recovery-title">Autonomous Recovery Audit Trail</h1>
            <p className="recovery-subtitle">
              Every algorithmic detection, diagnostic confidence score, bounded intervention attempt, and human authorization is logged immutably with complete state transitions.
            </p>
          </div>

          <a href="/revenue-recovery" className="btn-secondary-action" style={{ textDecoration: "none" }}>
            ← Back to Recovery Studio
          </a>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-inputs">
            <input
              type="text"
              placeholder="Search TXN ID, problem, diagnosis..."
              className="search-box"
              style={{ width: "280px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="select-filter"
              value={actionTypeFilter}
              onChange={(e) => setActionTypeFilter(e.target.value)}
            >
              <option value="all">All Action Types</option>
              <option value="auto_retry">Auto Retry</option>
              <option value="batch_campaign">Batch Campaign</option>
              <option value="manual_approval">Manual Approval</option>
              <option value="halt_stopping_rule">Halted by Policy</option>
              <option value="demo_reset">Demo Reset</option>
            </select>

            <select
              className="select-filter"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option value="all">All Execution Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="STOPPED">STOPPED</option>
              <option value="ESCALATED">ESCALATED</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Transaction</th>
                <th>Problem</th>
                <th>AI Decision</th>
                <th>Confidence</th>
                <th>Action</th>
                <th>Result</th>
                <th>Recovered Amount</th>
                <th>Policy Rule</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No audit records match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: "0.78rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td>
                      <div className="txn-id-cell">{log.transactionId}</div>
                      {log.humanApprovalRequired && (
                        <span style={{ fontSize: "0.68rem", color: "#fbbf24", display: "block" }}>
                          Human Approved
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      <div style={{ fontSize: "0.82rem", color: "#f87171" }}>
                        {log.detectedProblem || "Payment Failure"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "JetBrains Mono" }}>
                        {log.previousState} → {log.newState}
                      </div>
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                        {log.diagnosis}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                        {log.reason}
                      </div>
                    </td>
                    <td>
                      <span className="prob-badge high" style={{ fontSize: "0.75rem" }}>
                        {log.confidence}%
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#c7d2fe", fontSize: "0.82rem" }}>
                        {log.selectedIntervention ? log.selectedIntervention.replace(/_/g, " ").toUpperCase() : "SMART RETRY"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                        {log.actionType ? log.actionType.replace(/_/g, " ") : "autonomous"}
                      </div>
                    </td>
                    <td>
                      <span className={`audit-result-pill ${log.executionResult}`}>
                        {log.executionResult}
                      </span>
                    </td>
                    <td className="amount-cell">
                      {log.recoveredAmount > 0 ? (
                        <span style={{ color: "#34d399", fontWeight: 700 }}>
                          +₹{log.recoveredAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span style={{ color: "#64748b" }}>₹0</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      Max {log.policyEvaluated?.maxRetries || 3} retries • {log.policyEvaluated?.minConfidence || 70}% min
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Showing {logs.length} of {pagination.total} audit entries
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn-inspect"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn-inspect"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </div>

        <AskWealthXCopilot />
      </div>
    </AppLayout>
  );
};

export default RecoveryAuditTrail;
