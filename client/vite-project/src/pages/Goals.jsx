import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./Goals.css";

const GOAL_CATEGORIES = {
  emergency_fund: { label: "Emergency Reserve", icon: "🛡️", color: "amber" },
  house: { label: "Home / Real Estate", icon: "🏠", color: "blue" },
  vehicle: { label: "Vehicle / Auto", icon: "🚗", color: "cyan" },
  retirement: { label: "Retirement Corpus", icon: "🌴", color: "purple" },
  education: { label: "Higher Education", icon: "🎓", color: "teal" },
  travel: { label: "Travel & Leisure", icon: "✈️", color: "cyan" },
  wealth_creation: { label: "Wealth Creation", icon: "💎", color: "teal" },
  custom: { label: "Custom Goal", icon: "🎯", color: "blue" },
};

export const Goals = () => {
  const [data, setData] = useState({ goals: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Add Funds State
  const [fundingGoal, setFundingGoal] = useState(null);
  const [fundAmount, setFundAmount] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    title: "",
    category: "wealth_creation",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
    priority: "medium",
  });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/goals");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load goals.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to Goals registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleOpenAddModal = (presetCategory = "wealth_creation") => {
    setEditingGoal(null);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const dateStr = oneYearFromNow.toISOString().split("T")[0];

    setFormData({
      title: "",
      category: presetCategory,
      targetAmount: "",
      currentAmount: "0",
      targetDate: dateStr,
      priority: "medium",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    const dateStr = goal.targetDate ? new Date(goal.targetDate).toISOString().split("T")[0] : "";
    setFormData({
      title: goal.title,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: dateStr,
      priority: goal.priority || "medium",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Please enter a goal title.");
      return;
    }
    const target = Number(formData.targetAmount);
    const current = Number(formData.currentAmount);

    if (isNaN(target) || target <= 0) {
      setFormError("Target amount must be a number > 0.");
      return;
    }
    if (isNaN(current) || current < 0) {
      setFormError("Current saved amount must be a number ≥ 0.");
      return;
    }
    if (!formData.targetDate) {
      setFormError("Please select a target deadline date.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        await api.put(`/api/goals/${editingGoal._id}`, {
          ...formData,
          targetAmount: target,
          currentAmount: current,
        });
      } else {
        await api.post("/api/goals", {
          ...formData,
          targetAmount: target,
          currentAmount: current,
        });
      }
      setIsModalOpen(false);
      fetchGoals();
    } catch (err) {
      setFormError(err.message || "Failed to save goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFundsSubmit = async (e) => {
    e.preventDefault();
    if (!fundingGoal) return;
    const addAmt = Number(fundAmount);
    if (isNaN(addAmt) || addAmt <= 0) {
      alert("Please enter a valid amount to contribute.");
      return;
    }

    setSubmitting(true);
    try {
      const newCurrent = Number(fundingGoal.currentAmount || 0) + addAmt;
      await api.put(`/api/goals/${fundingGoal._id}`, {
        currentAmount: newCurrent,
      });
      setFundingGoal(null);
      setFundAmount("");
      fetchGoals();
    } catch (err) {
      alert(err.message || "Failed to add funds.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/goals/${deletingId}`);
      setDeletingId(null);
      fetchGoals();
    } catch (err) {
      alert(err.message || "Failed to delete goal.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGoals = useMemo(() => {
    return (data.goals || []).filter((goal) => {
      if (filterPriority === "all") return true;
      return goal.priority === filterPriority;
    });
  }, [data.goals, filterPriority]);

  const summary = data.summary || {};

  return (
    <AppLayout disclaimerVariant="general">
      <div className="goals-view">
        {/* Header */}
        <div className="goals-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>FINANCIAL MILESTONE TARGETS</span>
            </div>
            <h1 className="goals-title">Financial Goals</h1>
            <p className="goals-sub">
              Define target milestones, track automated timeline projections, and calculate exact monthly savings needed to hit your targets.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-add-goal"
            onClick={() => handleOpenAddModal()}
          >
            <span>+ Create Goal</span>
          </button>
        </div>

        {loading ? (
          <LoadingState message="Analyzing milestone progress and required monthly contributions..." />
        ) : error ? (
          <ErrorState title="Unable to Load Goals" message={error} onRetry={fetchGoals} />
        ) : (
          <>
            {/* Top Metrics Cards */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Total Milestone Target</span>
                  <span className="metric-icon">🎯</span>
                </div>
                <div className="metric-value currency text-cyan">
                  ₹{Number(summary.totalTargetAmount || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <span className="text-muted">{summary.totalGoals || 0} Active Goals Tracked</span>
                </div>
              </div>

              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Total Corpus Saved</span>
                  <span className="metric-icon">💵</span>
                </div>
                <div className="metric-value currency text-teal">
                  ₹{Number(summary.totalCurrentSaved || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <span className="badge badge-green">{summary.overallProgressPct || 0}% Funded</span>
                </div>
              </div>

              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Milestone Health Pacing</span>
                  <span className="metric-icon">⚡</span>
                </div>
                <div className="metric-value text-teal">
                  {summary.onTrackCount || 0}{" "}
                  <span className="value-unit">On Track</span>
                </div>
                <div className="metric-footer">
                  {(summary.behindCount || 0) > 0 ? (
                    <span className="text-rose">
                      ⚠️ {summary.behindCount} Behind Schedule
                    </span>
                  ) : (
                    <span className="text-teal">✓ All Milestones Healthy</span>
                  )}
                </div>
              </div>
            </div>

            {/* Multi-Goal Progress Overview Card */}
            {data.goals && data.goals.length > 0 && (
              <div className="section-card glass-panel" style={{ padding: "24px", borderRadius: "var(--radius-lg)", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>🎯 Milestone Progress & Target Pacing</h3>
                  <span className="badge badge-blue">{data.goals.length} Goals Active</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {data.goals.map((g) => {
                    const pct = Math.min(100, Math.round(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100));
                    return (
                      <div key={g._id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
                          <span className="font-bold">{g.title}</span>
                          <span className="font-mono text-teal">
                            ₹{Number(g.currentAmount || 0).toLocaleString("en-IN")} / ₹{Number(g.targetAmount || 0).toLocaleString("en-IN")} ({pct}%)
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "var(--bg-surface)", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: pct >= 100 ? "var(--accent-teal)" : pct >= 50 ? "var(--accent-cyan)" : "var(--accent-primary)",
                              borderRadius: "999px",
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="goals-controls-bar">
              <div className="filter-tabs">
                <button
                  type="button"
                  className={`tab-btn ${filterPriority === "all" ? "active" : ""}`}
                  onClick={() => setFilterPriority("all")}
                >
                  All Milestones ({data.goals?.length || 0})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterPriority === "high" ? "active" : ""}`}
                  onClick={() => setFilterPriority("high")}
                >
                  🔥 High Priority ({(data.goals || []).filter((g) => g.priority === "high").length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterPriority === "medium" ? "active" : ""}`}
                  onClick={() => setFilterPriority("medium")}
                >
                  Medium ({(data.goals || []).filter((g) => g.priority === "medium").length})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${filterPriority === "low" ? "active" : ""}`}
                  onClick={() => setFilterPriority("low")}
                >
                  Low ({(data.goals || []).filter((g) => g.priority === "low").length})
                </button>
              </div>
            </div>

            {/* Goals Grid */}
            {filteredGoals.length === 0 ? (
              <EmptyState
                icon="🎯"
                title={
                  data.goals.length === 0
                    ? "You haven't created a financial goal yet"
                    : "No goals match this priority filter"
                }
                description={
                  data.goals.length === 0
                    ? "Start with something important to you — emergency reserves, a home down payment, vehicle, or retirement."
                    : "Switch priority filter to view all active goals."
                }
                actionText={data.goals.length === 0 ? "+ Create First Goal" : "Show All Goals"}
                onAction={() =>
                  data.goals.length === 0 ? handleOpenAddModal() : setFilterPriority("all")
                }
              />
            ) : (
              <div className="goals-grid">
                {filteredGoals.map((goal) => {
                  const catMeta = GOAL_CATEGORIES[goal.category] || GOAL_CATEGORIES.custom;
                  const isBehind = goal.status === "behind_schedule";
                  const isAttention = goal.status === "needs_attention";
                  const isCompleted = goal.status === "completed";

                  const statusClass = isCompleted
                    ? "badge-green"
                    : isBehind
                    ? "badge-rose"
                    : isAttention
                    ? "badge-amber"
                    : "badge-blue";

                  const formattedDate = goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <div key={goal._id} className="goal-card glass-panel glow-hover">
                      <div className="goal-card-header">
                        <div className="goal-category-badge">
                          <span className="cat-icon">{catMeta.icon}</span>
                          <span className="cat-text">{catMeta.label}</span>
                        </div>
                        <div className="goal-badges-row">
                          <span className={`badge ${statusClass}`}>{goal.statusLabel}</span>
                          <span
                            className={`priority-pill priority-${goal.priority || "medium"}`}
                          >
                            {goal.priority?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <h3 className="goal-title">{goal.title}</h3>

                      {/* Amounts Display */}
                      <div className="goal-amounts-row">
                        <div>
                          <span className="amount-sub">Saved so far</span>
                          <div className="amount-val currency text-teal">
                            ₹{Number(goal.currentAmount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="amount-sub">Target Goal</span>
                          <div className="amount-val currency">
                            ₹{Number(goal.targetAmount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="goal-progress-box">
                        <div className="progress-label-row">
                          <span>Progress</span>
                          <span className="progress-pct font-bold">{goal.progressPct}%</span>
                        </div>
                        <div className="goal-progress-track">
                          <div
                            className={`goal-progress-fill ${
                              isCompleted
                                ? "fill-completed"
                                : isBehind
                                ? "fill-behind"
                                : "fill-ontrack"
                            }`}
                            style={{ width: `${Math.min(goal.progressPct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Target Schedule & Monthly Contribution */}
                      <div className="goal-details-box">
                        <div className="detail-row">
                          <span className="detail-label">Target Horizon</span>
                          <span className="detail-val">
                            {formattedDate} ({goal.remainingMonths} mos left)
                          </span>
                        </div>
                        {!isCompleted && (
                          <div className="detail-row highlight-row">
                            <span className="detail-label">Required Monthly Savings</span>
                            <span className="detail-val currency font-bold text-cyan">
                              ₹{Number(goal.requiredMonthlyContribution || 0).toLocaleString("en-IN")}/mo
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="goal-card-footer">
                        <button
                          type="button"
                          className="btn-quick-fund"
                          onClick={() => {
                            setFundingGoal(goal);
                            setFundAmount("");
                          }}
                        >
                          + Add Contribution
                        </button>
                        <div className="goal-mgmt-actions">
                          <button
                            type="button"
                            className="action-icon-btn"
                            title="Edit Goal"
                            onClick={() => handleOpenEditModal(goal)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="action-icon-btn delete-btn"
                            title="Delete Goal"
                            onClick={() => setDeletingId(goal._id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Add / Edit Goal Modal */}
        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingGoal ? "Edit Goal Milestone" : "+ Create Financial Goal"}</h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setIsModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              {formError && <div className="modal-error-banner">{formError}</div>}

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                  <label>Milestone Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dream Home Down Payment, Emergency Buffer, European Vacation"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      {Object.entries(GOAL_CATEGORIES).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.icon} {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                    >
                      <option value="high">🔥 High</option>
                      <option value="medium">⚖️ Medium</option>
                      <option value="low">🌱 Low</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Target Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 500000"
                      value={formData.targetAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, targetAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Currently Saved (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 75000"
                      value={formData.currentAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, currentAmount: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Target Horizon Date</label>
                  <input
                    type="date"
                    required
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData({ ...formData, targetDate: e.target.value })
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : editingGoal ? "Save Changes" : "Create Goal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Add Funds Modal */}
        {fundingGoal && (
          <div className="modal-backdrop" onClick={() => setFundingGoal(null)}>
            <div className="modal-card modal-delete-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>+ Add Contribution</h3>
                <button type="button" className="modal-close" onClick={() => setFundingGoal(null)}>
                  ✕
                </button>
              </div>
              <p className="funding-goal-title">
                Contribute funds toward <strong>{fundingGoal.title}</strong>
              </p>
              <form onSubmit={handleAddFundsSubmit} className="modal-form">
                <div className="form-group">
                  <label>Contribution Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 10000"
                    autoFocus
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFundingGoal(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Record Contribution"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <div className="modal-backdrop" onClick={() => setDeletingId(null)}>
            <div className="modal-card modal-delete-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="text-rose">Confirm Goal Deletion</h3>
                <button type="button" className="modal-close" onClick={() => setDeletingId(null)}>
                  ✕
                </button>
              </div>
              <p className="delete-warning-text">
                Are you sure you want to delete this financial goal? This will remove its milestone tracking and required monthly calculations.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-delete-confirm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Goal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Goals;
