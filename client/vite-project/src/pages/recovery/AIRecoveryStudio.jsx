import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../../components/layout/AppLayout";
import AskWealthXCopilot from "../../components/recovery/AskWealthXCopilot";
import { LoadingState, ErrorState } from "../../components/common/StateViews";
import api from "../../utils/apiClient";
import "./AIRecoveryStudio.css";

export const AIRecoveryStudio = () => {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing AI Recovery Demo...");
  const [error, setError] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Action States
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [humanApproved, setHumanApproved] = useState(false);
  const [actionExecuting, setActionExecuting] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  // Campaign State
  const [campaignRunning, setCampaignRunning] = useState(false);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [resettingDemo, setResettingDemo] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    const res = await api.get("/api/recovery/stats");
    if (res && res.data) {
      setStats(res.data);
      return res.data;
    }
    throw new Error("Invalid response from stats API");
  }, []);

  // Fetch Records
  const fetchRecords = useCallback(async (page = 1) => {
    let url = `/api/recovery/records?page=${page}&limit=15`;
    if (activeTab === "failed") url += "&status=failed";
    else if (activeTab === "recovered") url += "&status=recovered";
    else if (activeTab === "escalated") url += "&status=escalated";
    else if (activeTab === "unrecoverable") url += "&status=unrecoverable";
    else if (activeTab === "high_prob") url += "&minProbability=70";

    if (segmentFilter !== "all") url += `&segment=${segmentFilter}`;
    if (reasonFilter !== "all") url += `&reason=${reasonFilter}`;
    if (searchTerm.trim()) url += `&search=${encodeURIComponent(searchTerm.trim())}`;

    const res = await api.get(url);
    if (res && res.data) {
      setRecords(res.data.records || []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
      return res.data;
    }
    throw new Error("Invalid response from records API");
  }, [activeTab, segmentFilter, reasonFilter, searchTerm]);

  // Initial Load with progressive loading states
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingMessage("Initializing AI Recovery Demo...");

    const msgTimer = setTimeout(() => {
      setLoadingMessage("Loading recovery intelligence...");
    }, 600);

    try {
      const [statsData] = await Promise.all([fetchStats(), fetchRecords(1)]);
      clearTimeout(msgTimer);

      if (!statsData || !statsData.kpis) {
        throw new Error("Unable to load recovery intelligence. Please ensure the WealthX backend is running.");
      }
    } catch (err) {
      console.error("Failed to load recovery studio:", err);
      setError("Unable to load recovery intelligence. Please ensure the WealthX backend is running.");
    } finally {
      clearTimeout(msgTimer);
      setLoading(false);
    }
  }, [fetchStats, fetchRecords]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Inspect Record
  const handleOpenDiagnosis = async (record) => {
    setSelectedRecord(record);
    setActionResult(null);
    setHumanApproved(false);
    setInspectLoading(true);

    try {
      const res = await api.get(`/api/recovery/records/${record._id}`);
      if (res && res.data && res.data.record) {
        setSelectedRecord({
          ...res.data.record,
          aiAnalysis: res.data.aiAnalysis,
        });
      }
    } catch (err) {
      console.error("Failed deep analysis:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Execute Single Bounded Recovery
  const handleExecuteRecovery = async () => {
    if (!selectedRecord || actionExecuting) return;
    setActionExecuting(true);
    setActionResult(null);

    try {
      const res = await api.post(`/api/recovery/execute/${selectedRecord._id}`, {
        humanApproved,
        approvedBy: "WealthX Demo Operator",
      });

      if (res && res.data) {
        setActionResult(res.data);
        if (res.data.record) {
          setSelectedRecord(res.data.record);
        }
        await Promise.all([fetchStats(), fetchRecords(pagination.page)]);
      }
    } catch (err) {
      setActionResult({
        result: "ERROR",
        message: err.message || "Execution failed",
      });
    } finally {
      setActionExecuting(false);
    }
  };

  // Run Batch Campaign
  const handleRunCampaign = async () => {
    if (campaignRunning) return;
    setCampaignRunning(true);
    setCampaignSummary(null);

    try {
      const res = await api.post("/api/recovery/batch-campaign");
      if (res && res.data && res.data.batchSummary) {
        setCampaignSummary(res.data.batchSummary);
        await Promise.all([fetchStats(), fetchRecords(pagination.page)]);
      }
    } catch (err) {
      alert(`Campaign run failed: ${err.message}`);
    } finally {
      setCampaignRunning(false);
    }
  };

  // Reset / Seed Demo
  const handleResetDemo = async () => {
    if (resettingDemo) return;
    if (!window.confirm("Reset demo dataset? This will restore 120 diverse synthetic payment records & baseline metrics.")) {
      return;
    }
    setResettingDemo(true);
    try {
      const res = await api.post("/api/recovery/reset-demo");
      if (res) {
        await Promise.all([fetchStats(), fetchRecords(1)]);
        alert("Demo dataset calibrated successfully! 120 payments & 60 reconciliation records active.");
      }
    } catch (err) {
      alert(`Demo reset failed: ${err.message}`);
    } finally {
      setResettingDemo(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message={loadingMessage} fullPage />
      </AppLayout>
    );
  }

  if (error || !stats?.kpis) {
    return (
      <AppLayout>
        <ErrorState
          title="Recovery Studio Offline"
          message={error || "Unable to load recovery intelligence. Please ensure the WealthX backend is running."}
          onRetry={loadAll}
        />
      </AppLayout>
    );
  }

  const kpis = stats?.kpis || {};
  const policy = stats?.policy || {};

  return (
    <AppLayout disclaimerVariant="general">
      <div className="recovery-studio-container">
        {/* Header Banner */}
        <div className="recovery-header-banner">
          <div>
            <div className="recovery-badge-row">
              <span className="badge-track">Track 03 • AI Revenue Recovery</span>
              <span className="badge-simulated">SIMULATED / TEST MODE</span>
            </div>
            <h1 className="recovery-title">AI Revenue Recovery Studio</h1>
            <p className="recovery-subtitle">
              An AI agent that detects revenue at risk, diagnoses failure causes, selects bounded recovery actions, measures recovered revenue, and records every decision in an auditable trail.
            </p>
          </div>

          <div className="recovery-actions">
            <button
              type="button"
              className="btn-secondary-action"
              onClick={handleResetDemo}
              disabled={resettingDemo}
            >
              <span>{resettingDemo ? "Seeding Data..." : "🔄 Reset / Load Demo Data"}</span>
            </button>

            <button
              type="button"
              className="btn-primary-campaign"
              onClick={handleRunCampaign}
              disabled={campaignRunning}
            >
              <span>{campaignRunning ? "Executing Campaign..." : "⚡ Run AI Recovery Campaign"}</span>
            </button>
          </div>
        </div>

        {/* 6-Step Autonomous Agent Workflow Strip */}
        <div className="workflow-strip">
          <div className="workflow-step active">
            <span className="workflow-step-num">1</span>
            <span>Detect</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className="workflow-step active">
            <span className="workflow-step-num">2</span>
            <span>Diagnose</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className="workflow-step active">
            <span className="workflow-step-num">3</span>
            <span>Decide</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className="workflow-step active">
            <span className="workflow-step-num">4</span>
            <span>Act (Test Mode)</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className="workflow-step active">
            <span className="workflow-step-num">5</span>
            <span>Measure</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className="workflow-step active">
            <span className="workflow-step-num">6</span>
            <span>Audit</span>
          </div>
        </div>

        {/* Dynamic KPI Cards with Explicit Calculation Tooltips */}
        {(() => {
          const baselineRecovered = 190000;
          const liveCampaignRecovered = Math.max(0, (kpis.recoveredRevenue || 0) - baselineRecovered);
          return (
            <div className="kpi-grid">
              <div className="kpi-card" title="Calculated from MongoDB: Sum of face value of all active unrecovered payment failures.">
                <span className="kpi-label">Revenue At Risk <span style={{ opacity: 0.6 }}>ℹ️</span></span>
                <span className="kpi-value danger">
                  ₹{(kpis.totalRevenueAtRisk || 0).toLocaleString("en-IN")}
                </span>
                <span className="kpi-subtext">Across active payment failures</span>
              </div>

              <div
                className="kpi-card"
                title={`Simulated/Test Mode: Baseline Historical (₹${(190000).toLocaleString('en-IN')}) + Live Campaign (₹${liveCampaignRecovered.toLocaleString('en-IN')}) = Total Recorded (₹${(kpis.recoveredRevenue || 0).toLocaleString('en-IN')})`}
              >
                <span className="kpi-label">Total Recovered (Test Mode) <span style={{ opacity: 0.6 }}>ℹ️</span></span>
                <span className="kpi-value success">
                  ₹{(kpis.recoveredRevenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="kpi-subtext">
                  Baseline: ₹1.90L • Live AI: ₹{(liveCampaignRecovered / 1000).toFixed(1)}K
                </span>
              </div>

              <div className="kpi-card" title="Calculated dynamically: (Recovered Revenue / Total Analyzed Volume) × 100">
                <span className="kpi-label">Recovery Conversion Rate <span style={{ opacity: 0.6 }}>ℹ️</span></span>
                <span className="kpi-value warning">{kpis.recoveryRate || 0}%</span>
                <span className="kpi-subtext">Avg ₹{(kpis.averageRecoveryAmount || 0).toLocaleString("en-IN")} / recovery</span>
              </div>

              <div className="kpi-card" title="Volume meeting autonomous policy: Confidence ≥ 70%, retries < 3, overdue ≤ 45 days, amount < ₹25,000">
                <span className="kpi-label">Eligible for AI Retry <span style={{ opacity: 0.6 }}>ℹ️</span></span>
                <span className="kpi-value">
                  ₹{(kpis.eligibleRevenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="kpi-subtext">{kpis.eligibleCount || 0} policy-cleared opportunities</span>
              </div>

              <div className="kpi-card" title="Stopping rules enforced: Halted after 3 retries or >45d overdue, or escalated to human operator for amount ≥₹25k or confidence <70%">
                <span className="kpi-label">Safety Halts & Escalations <span style={{ opacity: 0.6 }}>ℹ️</span></span>
                <span className="kpi-value">
                  {kpis.stoppedAutomatically || 0}
                </span>
                <span className="kpi-subtext">{kpis.escalatedCount || 0} escalated for human review</span>
              </div>
            </div>
          );
        })()}

        {/* Autonomous Policy & Stopping Rules Card */}
        <div className="policy-banner">
          <div className="policy-info">
            <span className="policy-title">
              <span>🛡️</span> Active Autonomous Policy & Stopping Rules:
            </span>
            <span className="policy-pill">
              Max Retries: <strong>{policy.maxRetries || 3}</strong>
            </span>
            <span className="policy-pill">
              Confidence Cutoff: <strong>{policy.minConfidenceThreshold || 70}%</strong>
            </span>
            <span className="policy-pill">
              High-Value Ceiling: <strong>₹{(policy.highValueThreshold || 25000).toLocaleString("en-IN")}</strong>
            </span>
            <span className="policy-pill">
              Human Escalation: <strong>Active</strong>
            </span>
          </div>
          <a href="/recovery-simulator" className="btn-inspect" style={{ textDecoration: "none" }}>
            Simulate Strategy Variations →
          </a>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => handleTabChange("all")}
            >
              All Records ({kpis.totalRecords || 0})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === "high_prob" ? "active" : ""}`}
              onClick={() => handleTabChange("high_prob")}
            >
              🔥 High Probability (≥70%)
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === "escalated" ? "active" : ""}`}
              onClick={() => handleTabChange("escalated")}
            >
              ⚠️ Needs Human Review
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === "recovered" ? "active" : ""}`}
              onClick={() => handleTabChange("recovered")}
            >
              ✅ Recovered
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeTab === "unrecoverable" ? "active" : ""}`}
              onClick={() => handleTabChange("unrecoverable")}
            >
              🛑 Halted by Policy
            </button>
          </div>

          <div className="filter-inputs">
            <input
              type="text"
              placeholder="Search TXN, order, or name..."
              className="search-box"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="select-filter"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
            >
              <option value="all">All Segments</option>
              <option value="enterprise">Enterprise</option>
              <option value="smb">SMB</option>
              <option value="vip">VIP</option>
              <option value="direct_consumer">Consumer</option>
            </select>

            <select
              className="select-filter"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="all">All Failure Causes</option>
              <option value="gateway_timeout">Gateway Timeout</option>
              <option value="technical_failure">Technical Failure</option>
              <option value="upi_failure">UPI Failure</option>
              <option value="checkout_abandonment">Checkout Abandoned</option>
              <option value="bank_decline">Bank Decline</option>
              <option value="subscription_failure">Subscription Past Due</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="overdue_invoice">Overdue Invoice</option>
              <option value="expired_card">Expired Card</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th>Transaction & Customer</th>
                <th>Segment</th>
                <th>Amount</th>
                <th>Failure Cause</th>
                <th>Recovery Likelihood</th>
                <th>Retries</th>
                <th>Recommended Action</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No payment records matching the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const prob = rec.recoveryProbability;
                  let probClass = "high";
                  if (prob < 40) probClass = "low";
                  else if (prob < 70) probClass = "med";

                  return (
                    <tr key={rec._id}>
                      <td>
                        <div className="txn-id-cell">{rec.transactionId}</div>
                        <div className="customer-name">{rec.customerName}</div>
                      </td>
                      <td>
                        <span className={`segment-badge ${rec.customerSegment}`}>
                          {rec.customerSegment}
                        </span>
                      </td>
                      <td className="amount-cell">
                        ₹{rec.amount.toLocaleString("en-IN")}
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          {rec.paymentMethod.toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div style={{ textTransform: "capitalize", fontWeight: 600 }}>
                          {rec.failureReason.replace(/_/g, " ")}
                        </div>
                        {rec.daysOverdue > 0 && (
                          <div style={{ fontSize: "0.72rem", color: "#f43f5e" }}>
                            {rec.daysOverdue} days overdue
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`prob-badge ${probClass}`}>
                          {prob}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "JetBrains Mono" }}>
                          {rec.retryCount} / {rec.maxRetries}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
                          {rec.recommendedIntervention.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${rec.paymentStatus}`}>
                          {rec.paymentStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-inspect"
                          onClick={() => handleOpenDiagnosis(rec)}
                        >
                          Diagnose →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Showing {records.length} of {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn-inspect"
              disabled={pagination.page <= 1}
              onClick={() => fetchRecords(pagination.page - 1)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn-inspect"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRecords(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Diagnosis & Bounded Execution Modal */}
        {selectedRecord && (
          <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
            <div className="diagnosis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">AI Payment Diagnosis & Intervention</h2>
                  <p className="modal-sub">
                    Transaction {selectedRecord.transactionId} • {selectedRecord.customerName}
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
                {/* Summary Grid */}
                <div className="diag-summary-grid">
                  <div className="diag-item">
                    <span className="diag-item-label">Amount At Risk</span>
                    <div className="diag-item-val" style={{ color: "#f43f5e" }}>
                      ₹{selectedRecord.amount.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">AI Recovery Probability</span>
                    <div className="diag-item-val" style={{ color: selectedRecord.recoveryProbability >= 70 ? "#10b981" : "#f59e0b" }}>
                      {selectedRecord.recoveryProbability}% ({selectedRecord.riskLevel} RISK)
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      Statistical prediction — not a financial guarantee
                    </span>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">Failure Taxonomy</span>
                    <div className="diag-item-val" style={{ fontSize: "0.95rem", textTransform: "capitalize" }}>
                      {selectedRecord.failureReason.replace(/_/g, " ")} ({selectedRecord.paymentMethod.toUpperCase()})
                    </div>
                  </div>

                  <div className="diag-item">
                    <span className="diag-item-label">Current Status</span>
                    <div className="diag-item-val">
                      <span className={`status-pill ${selectedRecord.paymentStatus}`}>
                        {selectedRecord.paymentStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Rationale & Signals */}
                <div className="diag-reason-box">
                  <div className="diag-reason-title">
                    🤖 Why this score? (Scoring Model: {selectedRecord.scoringModelType || "statistical_ml"})
                  </div>
                  <p className="diag-reason-text">
                    {selectedRecord.diagnosis?.mainReason ||
                      `Evaluated with ${selectedRecord.recoveryProbability}% likelihood. Customer has ${selectedRecord.previousSuccessfulPayments} successful historical transactions.`}
                  </p>

                  <div className="signals-list">
                    {selectedRecord.diagnosis?.supportingSignals?.map((sig, sIdx) => (
                      <div key={sIdx} className="signal-item">
                        <span className="signal-bullet">•</span>
                        <span>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Intervention Recommendation Box */}
                <div className="diag-item" style={{ background: "rgba(99, 102, 241, 0.08)", borderColor: "rgba(99, 102, 241, 0.2)" }}>
                  <span className="diag-item-label" style={{ color: "#818cf8" }}>
                    Recommended Intervention Action
                  </span>
                  <div className="diag-item-val" style={{ color: "#c7d2fe", fontSize: "1.05rem" }}>
                    {selectedRecord.recommendedIntervention.replace(/_/g, " ").toUpperCase()}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Intervention balances probability against customer churn and retry fatigue.
                  </span>
                </div>

                {/* Expected Outcome & Policy Decision */}
                <div className="diag-item" style={{ background: "rgba(15, 23, 42, 0.6)", borderColor: "rgba(148, 163, 184, 0.2)" }}>
                  <span className="diag-item-label" style={{ color: "#38bdf8" }}>
                    Expected Outcome & Policy Decision
                  </span>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "4px" }}>
                    <strong>Expected Outcome:</strong> {selectedRecord.recoveryProbability >= 70 ? "High probability of simulated authorization success via secondary route." : "Subdued immediate conversion likelihood; direct reminder link advised to avoid customer friction."}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#cbd5e1", marginTop: "4px" }}>
                    <strong>Policy Decision:</strong> {
                      selectedRecord.amount >= (policy.highValueThreshold || 25000)
                        ? "Requires Human Approval (High Value ≥ ₹25,000)"
                        : selectedRecord.retryCount >= (policy.maxRetries || 3)
                        ? "Halted by Stopping Rule (Max 3 Retries Exceeded)"
                        : selectedRecord.daysOverdue > 45
                        ? "Halted by Stopping Rule (>45 Days Overdue)"
                        : selectedRecord.recoveryProbability < (policy.minConfidenceThreshold || 70)
                        ? "Requires Human Review (Confidence < 70%)"
                        : "Approved for Autonomous Bounded Retry"
                    }
                  </div>
                </div>

                {/* High Value Human Approval Checkbox */}
                {selectedRecord.amount >= (policy.highValueThreshold || 25000) && (
                  <div className="approval-box">
                    <input
                      type="checkbox"
                      id="humanApproval"
                      className="approval-checkbox"
                      checked={humanApproved}
                      onChange={(e) => setHumanApproved(e.target.checked)}
                    />
                    <label htmlFor="humanApproval" className="approval-label">
                      Authorize Human Approval for High-Value Payment (₹{selectedRecord.amount.toLocaleString("en-IN")} &gt; policy threshold ₹{(policy.highValueThreshold || 25000).toLocaleString("en-IN")})
                    </label>
                  </div>
                )}

                {/* Action Execution Result Banner */}
                {actionResult && (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "10px",
                      background:
                        actionResult.result === "SUCCESS"
                          ? "rgba(16, 185, 129, 0.15)"
                          : actionResult.result === "STOPPED"
                          ? "rgba(244, 63, 94, 0.15)"
                          : "rgba(245, 158, 11, 0.15)",
                      border: `1px solid ${
                        actionResult.result === "SUCCESS"
                          ? "rgba(16, 185, 129, 0.3)"
                          : actionResult.result === "STOPPED"
                          ? "rgba(244, 63, 94, 0.3)"
                          : "rgba(245, 158, 11, 0.3)"
                      }`,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: actionResult.result === "SUCCESS" ? "#34d399" : "#fbbf24", marginBottom: "4px" }}>
                      Outcome: {actionResult.result}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                      {actionResult.message}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge-simulated" style={{ fontSize: "0.75rem" }}>
                  SIMULATED / TEST MODE
                </span>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => setSelectedRecord(null)}
                  >
                    Close
                  </button>

                  {selectedRecord.paymentStatus !== "recovered" && selectedRecord.paymentStatus !== "unrecoverable" && (
                    <button
                      type="button"
                      className="btn-execute-recovery"
                      onClick={handleExecuteRecovery}
                      disabled={
                        actionExecuting ||
                        (selectedRecord.amount >= (policy.highValueThreshold || 25000) && !humanApproved)
                      }
                    >
                      {actionExecuting ? "Simulating Execution..." : `Execute Simulated Recovery (₹${selectedRecord.amount.toLocaleString("en-IN")})`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Summary Modal */}
        {campaignSummary && (
          <div className="modal-overlay" onClick={() => setCampaignSummary(null)}>
            <div className="diagnosis-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">AI Recovery Campaign Complete</h2>
                  <p className="modal-sub">Autonomous batch recovery execution report</p>
                </div>
                <button type="button" className="copilot-close-btn" onClick={() => setCampaignSummary(null)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="campaign-summary-card">
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Total Analyzed</span>
                    <span className="campaign-stat-val">{campaignSummary.analyzedCount}</span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Eligible for AI Intervention</span>
                    <span className="campaign-stat-val" style={{ color: "#38bdf8" }}>{campaignSummary.eligibleCount}</span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Skipped (Stopping Rules / High-Value)</span>
                    <span className="campaign-stat-val" style={{ color: "#fbbf24" }}>{campaignSummary.skippedCount}</span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Recovery Attempts</span>
                    <span className="campaign-stat-val">{campaignSummary.attemptedCount}</span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Successfully Recovered Revenue</span>
                    <span className="campaign-stat-val" style={{ color: "#34d399", fontSize: "1.2rem" }}>
                      ₹{campaignSummary.recoveredAmount.toLocaleString("en-IN")} ({campaignSummary.recoveredCount} txns)
                    </span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Unrecovered Volume</span>
                    <span className="campaign-stat-val" style={{ color: "#f43f5e" }}>
                      ₹{campaignSummary.unrecoveredAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Stopped Automatically (Limit reached)</span>
                    <span className="campaign-stat-val">{campaignSummary.stoppedCount}</span>
                  </div>
                  <div className="campaign-stat-row">
                    <span className="campaign-stat-label">Escalated to Human</span>
                    <span className="campaign-stat-val">{campaignSummary.escalatedCount}</span>
                  </div>
                  <div className="campaign-stat-row" style={{ borderBottom: "none" }}>
                    <span className="campaign-stat-label">Batch Recovery Rate</span>
                    <span className="campaign-stat-val" style={{ color: "#a78bfa", fontSize: "1.1rem" }}>
                      {campaignSummary.effectiveBatchRecoveryRate}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <a href="/recovery-audit" className="btn-secondary-action" style={{ textDecoration: "none" }}>
                  View Campaign Audit Logs →
                </a>
                <button type="button" className="btn-primary-campaign" onClick={() => setCampaignSummary(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grounded Copilot Drawer */}
        <AskWealthXCopilot />
      </div>
    </AppLayout>
  );
};

export default AIRecoveryStudio;
