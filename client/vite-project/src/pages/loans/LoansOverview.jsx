import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { LoadingState, ErrorState, EmptyState } from "../../components/common/StateViews";
import api from "../../utils/apiClient";
import "./Loans.css";

const LOAN_TYPE_META = {
  home: { label: "Home Loan", icon: "🏠", color: "blue" },
  education: { label: "Education Loan", icon: "🎓", color: "teal" },
  vehicle: { label: "Vehicle Loan", icon: "🚗", color: "cyan" },
  personal: { label: "Personal Loan", icon: "💳", color: "amber" },
  business: { label: "Business Credit", icon: "💼", color: "purple" },
  credit_card: { label: "Credit Card Debt", icon: "⚡", color: "rose" },
  other: { label: "Other Obligation", icon: "📑", color: "muted" },
};

export const LoansOverview = () => {
  const [data, setData] = useState({ loans: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Repayment simulation state
  const [selectedLoanForSim, setSelectedLoanForSim] = useState(null);
  const [extraMonthlyPayment, setExtraMonthlyPayment] = useState(2000);
  const [lumpSumPrepayment, setLumpSumPrepayment] = useState(50000);
  const [simResult, setSimResult] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    loanType: "home",
    lenderName: "",
    principal: "",
    outstandingAmount: "",
    interestRate: "8.75",
    tenureMonths: "240",
    monthlyEMI: "",
  });

  // Calculate live mathematically exact standard EMI
  const computedLiveEMI = useMemo(() => {
    const P = Number(formData.principal);
    const r = Number(formData.interestRate) / 12 / 100;
    const n = Number(formData.tenureMonths);
    if (P > 0 && r > 0 && n > 0) {
      return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    }
    return null;
  }, [formData.principal, formData.interestRate, formData.tenureMonths]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/loans");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load loans.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to Debt Management service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleOpenAddModal = () => {
    setEditingLoan(null);
    setFormData({
      loanType: "home",
      lenderName: "",
      principal: "",
      outstandingAmount: "",
      interestRate: "8.75",
      tenureMonths: "240",
      monthlyEMI: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loan) => {
    setEditingLoan(loan);
    setFormData({
      loanType: loan.loanType,
      lenderName: loan.lenderName || "",
      principal: loan.principal,
      outstandingAmount: loan.outstandingAmount,
      interestRate: loan.interestRate,
      tenureMonths: loan.tenureMonths,
      monthlyEMI: loan.monthlyEMI || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const p = Number(formData.principal);
    const out = Number(formData.outstandingAmount);
    const rate = Number(formData.interestRate);
    const tenure = Number(formData.tenureMonths);

    if (isNaN(p) || p < 0) {
      setFormError("Principal must be >= 0");
      return;
    }
    if (isNaN(out) || out < 0) {
      setFormError("Outstanding amount must be >= 0");
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setFormError("Interest rate must be >= 0");
      return;
    }
    if (isNaN(tenure) || tenure <= 0) {
      setFormError("Tenure must be > 0 months");
      return;
    }

    // Ensure monthlyEMI is mathematically synced
    const finalPayload = {
      ...formData,
      monthlyEMI: formData.monthlyEMI ? Number(formData.monthlyEMI) : computedLiveEMI || undefined,
    };

    setSubmitting(true);
    try {
      if (editingLoan) {
        await api.put(`/api/loans/${editingLoan._id}`, finalPayload);
      } else {
        await api.post("/api/loans", finalPayload);
      }
      setIsModalOpen(false);
      fetchLoans();
    } catch (err) {
      setFormError(err.message || "Failed to save loan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/loans/${deletingId}`);
      setDeletingId(null);
      if (selectedLoanForSim?._id === deletingId) {
        setSelectedLoanForSim(null);
        setSimResult(null);
      }
      fetchLoans();
    } catch (err) {
      alert(err.message || "Failed to delete loan.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Run prepayment simulation
  const runSimulation = useCallback(async (loan, extraMonthly, lumpSum) => {
    if (!loan) return;
    try {
      const res = await api.post("/api/loans/simulate-repayment", {
        currentBalance: loan.outstandingAmount,
        interestRate: loan.interestRate,
        currentEMI: loan.monthlyEMI,
        extraMonthlyPayment: Number(extraMonthly) || 0,
        lumpSumPrepayment: Number(lumpSum) || 0,
      });
      if (res && res.data) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  }, []);

  const handleSelectLoanForSim = (loan) => {
    setSelectedLoanForSim(loan);
    runSimulation(loan, extraMonthlyPayment, lumpSumPrepayment);
  };

  const summary = data.summary || {};
  const debtStatus = summary.debtHealthStatus || "not_available";
  const debtBadgeClass =
    debtStatus === "low"
      ? "badge-green"
      : debtStatus === "moderate"
      ? "badge-amber"
      : debtStatus === "high"
      ? "badge-rose"
      : "badge-blue";

  return (
    <AppLayout disclaimerVariant="loans">
      <div className="loans-view">
        {/* Header */}
        <div className="loans-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>LIABILITY LEDGER & DEBT HEALTH</span>
            </div>
            <h1 className="loans-title">Loans & Debt Overview</h1>
            <p className="loans-sub">
              Monitor active borrowing obligations, evaluate Debt-to-Income (DTI) health, and simulate accelerated payoff strategies.
            </p>
          </div>
          <div className="loans-top-actions">
            <Link to="/loans/finder" className="btn btn-secondary">
              🔍 Loan Finder
            </Link>
            <Link to="/loans/compare" className="btn btn-secondary">
              ⚖️ Compare Loans
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAddModal}
            >
              + Add Loan
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Aggregating loan commitments and computing Debt-to-Income ratios..." />
        ) : error ? (
          <ErrorState title="Unable to Load Loans" message={error} onRetry={fetchLoans} />
        ) : (
          <>
            {/* Top Debt Health Cards */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Total Outstanding Debt</span>
                  <span className="metric-icon">💳</span>
                </div>
                <div className="metric-value currency text-rose">
                  ₹{Number(summary.totalOutstanding || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <span className="text-muted">
                    Total Borrowed: ₹{Number(summary.totalPrincipal || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="footer-sep">•</span>
                  <span className="text-cyan">
                    {summary.totalLoans || 0} {summary.totalLoans === 1 ? "Loan" : "Loans"}
                  </span>
                </div>
              </div>

              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Total Monthly EMI Commitment</span>
                  <span className="metric-icon">📉</span>
                </div>
                <div className="metric-value currency text-rose">
                  ₹{Number(summary.totalMonthlyEMI || 0).toLocaleString("en-IN")}/mo
                </div>
                <div className="metric-footer">
                  <span className="text-muted">
                    Income: ₹{Number(summary.monthlyIncome || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">EMI Burden (DTI Ratio)</span>
                  <span className="metric-icon">🩺</span>
                </div>
                <div className="metric-value">
                  {summary.emiBurdenPct || 0}%
                </div>
                <div className="metric-footer">
                  <span className={`badge ${debtBadgeClass}`}>
                    {summary.debtHealthLabel || "No Loans Tracked"}
                  </span>
                </div>
              </div>
            </div>

            {/* Debt Health Explanation Card */}
            {data.loans.length > 0 && (
              <div className="section-card glass-panel debt-explanation-card">
                <div className="section-card-header">
                  <h3>🩺 Debt Health Diagnostic Evaluation</h3>
                  <span className={`badge ${debtBadgeClass}`}>{summary.debtHealthLabel}</span>
                </div>
                <p className="debt-exp-text">{summary.debtExplanation}</p>
              </div>
            )}

            {/* Loans List & Table */}
            <div className="section-card glass-panel">
              <div className="section-card-header">
                <h3>📑 Tracked Borrowing Obligations ({data.loans.length})</h3>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenAddModal}
                >
                  + Add Loan
                </button>
              </div>

              {data.loans.length === 0 ? (
                <EmptyState
                  icon="💳"
                  title="No active loans tracked"
                  description="Add a loan to understand your repayment picture, calculate EMI burden, and activate Debt Health diagnostics."
                  actionText="+ Add First Loan"
                  onAction={handleOpenAddModal}
                />
              ) : (
                <div className="loans-table-wrapper">
                  <table className="loans-table">
                    <thead>
                      <tr>
                        <th>Loan Type & Lender</th>
                        <th className="text-right">Outstanding (₹)</th>
                        <th className="text-right">Monthly EMI (₹)</th>
                        <th className="text-right">Interest Rate</th>
                        <th className="text-right">Tenure</th>
                        <th className="text-center">Payoff Simulation</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.loans.map((loan) => {
                        const meta = LOAN_TYPE_META[loan.loanType] || LOAN_TYPE_META.other;
                        const isSimulating = selectedLoanForSim?._id === loan._id;

                        return (
                          <tr key={loan._id} className="loan-row">
                            <td>
                              <div className="loan-type-cell">
                                <span className="loan-icon">{meta.icon}</span>
                                <div>
                                  <span className="loan-type-name font-bold">{meta.label}</span>
                                  <span className="loan-lender-name">
                                    {loan.lenderName || "Unspecified Lender"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="text-right currency font-bold text-rose">
                              ₹{Number(loan.outstandingAmount).toLocaleString("en-IN")}
                            </td>
                            <td className="text-right currency text-teal font-bold">
                              ₹{Number(loan.monthlyEMI).toLocaleString("en-IN")}/mo
                            </td>
                            <td className="text-right font-mono">
                              {loan.interestRate}%
                            </td>
                            <td className="text-right text-muted">
                              {loan.tenureMonths} mos ({Number((loan.tenureMonths / 12).toFixed(1))} yrs)
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className={`btn-sim-payoff ${isSimulating ? "active" : ""}`}
                                onClick={() => handleSelectLoanForSim(loan)}
                              >
                                ⚡ Simulate Payoff
                              </button>
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="action-btn"
                                title="Edit Loan"
                                onClick={() => handleOpenEditModal(loan)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="action-btn delete-btn"
                                title="Delete Loan"
                                onClick={() => setDeletingId(loan._id)}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Accelerated Payoff Simulator Panel (When Loan Selected) */}
            {selectedLoanForSim && (
              <div className="section-card glass-panel sim-panel">
                <div className="section-card-header">
                  <h3>
                    ⚡ Accelerated Repayment Simulator: {LOAN_TYPE_META[selectedLoanForSim.loanType]?.label || "Loan"} (
                    {selectedLoanForSim.lenderName || "Lender"})
                  </h3>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedLoanForSim(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="sim-grid">
                  {/* Controls */}
                  <div className="sim-controls">
                    <div className="calc-input-group">
                      <label>Extra Monthly Payment (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={extraMonthlyPayment}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setExtraMonthlyPayment(val);
                          runSimulation(selectedLoanForSim, val, lumpSumPrepayment);
                        }}
                      />
                    </div>

                    <div className="calc-input-group">
                      <label>One-Time Lump-Sum Prepayment (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={lumpSumPrepayment}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLumpSumPrepayment(val);
                          runSimulation(selectedLoanForSim, extraMonthlyPayment, val);
                        }}
                      />
                    </div>
                  </div>

                  {/* Simulator Results */}
                  {simResult && (
                    <div className="sim-results-box">
                      <div className="sim-stat-banner">
                        <span className="badge badge-green">
                          🎉 Save {simResult.savings?.yearsSaved || 0} Years ({simResult.savings?.monthsSaved || 0} Mos) Earlier!
                        </span>
                        <div className="currency text-teal font-bold" style={{ fontSize: "20px" }}>
                          Save ₹{Number(simResult.savings?.interestSaved || 0).toLocaleString("en-IN")} in Interest
                        </div>
                      </div>

                      <div className="sim-compare-grid">
                        <div className="sim-sub-box">
                          <span className="stat-box-label">Standard Schedule</span>
                          <span className="stat-box-val text-muted">
                            {simResult.originalSchedule?.yearsRemaining} Years (₹
                            {Number(simResult.originalSchedule?.totalInterest || 0).toLocaleString("en-IN")} interest)
                          </span>
                        </div>
                        <div className="sim-sub-box highlight-box">
                          <span className="stat-box-label text-teal">Accelerated Schedule</span>
                          <span className="stat-box-val text-teal">
                            {simResult.acceleratedSchedule?.yearsRemaining} Years (₹
                            {Number(simResult.acceleratedSchedule?.totalInterest || 0).toLocaleString("en-IN")} interest)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="calc-disclaimer-box" style={{ marginTop: "14px" }}>
                  ℹ️ <strong>Estimates only:</strong> Prepayment penalties, floating rate adjustments, and tax deductions under Section 24/80EE should be verified with the lender.
                </div>
              </div>
            )}
          </>
        )}

        {/* Add / Edit Loan Modal */}
        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingLoan ? "Edit Loan Obligation" : "+ Add Loan Obligation"}</h3>
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
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Loan Type</label>
                    <select
                      value={formData.loanType}
                      onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                    >
                      {Object.entries(LOAN_TYPE_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.icon} {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Lender / Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. SBI, HDFC, ICICI"
                      value={formData.lenderName}
                      onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Original Principal (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 3000000"
                      value={formData.principal}
                      onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Current Outstanding Balance (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 2450000"
                      value={formData.outstandingAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, outstandingAmount: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 8.75"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Remaining Tenure (Months)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 180"
                      value={formData.tenureMonths}
                      onChange={(e) => setFormData({ ...formData, tenureMonths: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>Monthly EMI (₹)</label>
                    {computedLiveEMI && (
                      <span
                        className="text-teal font-mono font-bold"
                        style={{ fontSize: "11.5px", cursor: "pointer" }}
                        onClick={() => setFormData({ ...formData, monthlyEMI: computedLiveEMI })}
                        title="Click to set exact standard amortization EMI"
                      >
                        ⚡ Standard: ₹{computedLiveEMI.toLocaleString("en-IN")}/mo
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder={computedLiveEMI ? `Standard: ₹${computedLiveEMI}` : "Auto-computed if omitted"}
                    value={formData.monthlyEMI}
                    onChange={(e) => setFormData({ ...formData, monthlyEMI: e.target.value })}
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
                    {submitting ? "Saving..." : editingLoan ? "Save Changes" : "Add Loan"}
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
                <h3 className="text-rose">Confirm Loan Deletion</h3>
                <button type="button" className="modal-close" onClick={() => setDeletingId(null)}>
                  ✕
                </button>
              </div>
              <p className="delete-warning-text">
                Are you sure you want to remove this loan? This will update your total liabilities, net worth, and Debt Health score.
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
                  {isDeleting ? "Deleting..." : "Delete Loan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LoansOverview;
