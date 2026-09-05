import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import DonutChart from "../components/charts/DonutChart";
import { LoadingState, ErrorState, EmptyState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./WealthVault.css";

const CATEGORY_META = {
  stock: { label: "Stocks", icon: "⚡", color: "blue" },
  mutual_fund: { label: "Mutual Funds", icon: "🌱", color: "teal" },
  sip: { label: "SIP Portfolio", icon: "📈", color: "cyan" },
  gold: { label: "Digital Gold & SGB", icon: "🥇", color: "amber" },
  fd: { label: "Fixed Deposits", icon: "🔒", color: "purple" },
  bond: { label: "Govt & Corp Bonds", icon: "🏛️", color: "blue" },
  etf: { label: "Index & ETFs", icon: "🌐", color: "teal" },
  savings: { label: "Liquid Savings", icon: "💵", color: "teal" },
  other: { label: "Other Holdings", icon: "📦", color: "muted" },
};

export const WealthVault = () => {
  const [data, setData] = useState({ assets: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    category: "stock",
    investedAmount: "",
    currentValue: "",
    notes: "",
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/assets");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load assets.");
      }
    } catch (err) {
      setError(err.message || "Error connecting to Wealth Vault.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleOpenAddModal = (presetCategory = "stock") => {
    setEditingAsset(null);
    setFormData({
      name: "",
      category: presetCategory,
      investedAmount: "",
      currentValue: "",
      notes: "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      investedAmount: asset.investedAmount,
      currentValue: asset.currentValue,
      notes: asset.notes || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Please enter an asset name.");
      return;
    }
    const invested = Number(formData.investedAmount);
    const current = Number(formData.currentValue);

    if (isNaN(invested) || invested < 0) {
      setFormError("Invested amount must be a number ≥ 0.");
      return;
    }
    if (isNaN(current) || current < 0) {
      setFormError("Current value must be a number ≥ 0.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingAsset) {
        await api.put(`/api/assets/${editingAsset._id}`, {
          ...formData,
          investedAmount: invested,
          currentValue: current,
        });
      } else {
        await api.post("/api/assets", {
          ...formData,
          investedAmount: invested,
          currentValue: current,
        });
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      setFormError(err.message || "Failed to save asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/assets/${deletingId}`);
      setDeletingId(null);
      fetchAssets();
    } catch (err) {
      alert(err.message || "Failed to delete asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return (data.assets || []).filter((asset) => {
      const matchesCategory =
        activeCategory === "all" || asset.category === activeCategory;
      const matchesSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.notes && asset.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [data.assets, activeCategory, searchQuery]);

  const summary = data.summary || {};

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="wealth-vault-view">
        {/* Header Title & Actions */}
        <div className="vault-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>PORTFOLIO ASSET REGISTRY</span>
            </div>
            <h1 className="vault-title">Wealth Vault</h1>
            <p className="vault-sub">
              Securely track stocks, mutual funds, gold, fixed deposits, and alternative holdings in a single unified ledger.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-add-vault"
            onClick={() => handleOpenAddModal(activeCategory !== "all" ? activeCategory : "stock")}
          >
            <span>+ Add Asset</span>
          </button>
        </div>

        {loading ? (
          <LoadingState message="Calculating consolidated asset valuation and returns..." />
        ) : error ? (
          <ErrorState title="Unable to Load Vault" message={error} onRetry={fetchAssets} />
        ) : (
          <>
            {/* Top Metrics Cards */}
            <div className="metrics-grid">
              {/* Total Vault Assets */}
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Total Vault Holdings</span>
                  <span className="metric-icon">🏦</span>
                </div>
                <div className="metric-value currency text-teal">
                  ₹{Number(summary.totalCurrentValue || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <span className="text-muted">
                    Invested: ₹{Number(summary.totalInvested || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="footer-sep">•</span>
                  <span className="text-cyan">{summary.count || 0} Assets</span>
                </div>
              </div>

              {/* Unrealized Gain / Loss */}
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Unrealized P&L</span>
                  <span className="metric-icon">📈</span>
                </div>
                <div
                  className={`metric-value currency ${
                    (summary.totalGainLoss || 0) >= 0 ? "text-teal" : "text-rose"
                  }`}
                >
                  {(summary.totalGainLoss || 0) >= 0 ? "+" : ""}
                  ₹{Number(summary.totalGainLoss || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <span
                    className={`badge ${
                      (summary.totalGainLossPercentage || 0) >= 0 ? "badge-green" : "badge-rose"
                    }`}
                  >
                    {(summary.totalGainLossPercentage || 0) >= 0 ? "▲ +" : "▼ "}
                    {summary.totalGainLossPercentage || 0}%
                  </span>
                  <span className="text-muted">Absolute Return</span>
                </div>
              </div>

              {/* Liquid Bank Savings */}
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Liquid Savings (Profile)</span>
                  <span className="metric-icon">💵</span>
                </div>
                <div className="metric-value currency">
                  ₹{Number(summary.liquidSavings || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  <Link to="/onboarding" className="text-cyan" style={{ fontSize: "11.5px" }}>
                    Update in Profile →
                  </Link>
                </div>
              </div>

              {/* Consolidated Net Worth */}
              <div className="metric-card glass-panel glow-hover">
                <div className="metric-header">
                  <span className="metric-label">Consolidated Net Worth</span>
                  <span className="metric-icon">💎</span>
                </div>
                <div className="metric-value currency text-cyan">
                  ₹{Number(summary.netWorth || 0).toLocaleString("en-IN")}
                </div>
                <div className="metric-footer">
                  {(summary.totalLiabilities || 0) > 0 ? (
                    <Link to="/loans" className="text-rose font-bold" style={{ fontSize: "11.5px" }}>
                      Liabilities: -₹{Number(summary.totalLiabilities || 0).toLocaleString("en-IN")} ({summary.activeLoansCount || 1} {summary.activeLoansCount === 1 ? "Loan" : "Loans"}) &rarr;
                    </Link>
                  ) : (
                    <span className="text-muted">Total Liabilities: ₹0 (Debt-Free)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Allocation Breakdown & Donut */}
            {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
              <div className="section-card glass-panel allocation-card">
                <div className="section-card-header">
                  <h3>📊 Portfolio Asset Allocation & Composition</h3>
                  <Link to="/risk-dna" className="btn btn-secondary" style={{ padding: "6px 14px", fontSize: "12px" }}>
                    Compare with Risk DNA Target &rarr;
                  </Link>
                </div>

                <div style={{ margin: "16px 0" }}>
                  <DonutChart
                    data={summary.categoryBreakdown.map((c) => ({
                      label: CATEGORY_META[c.category]?.label || c.category,
                      value: c.currentValue,
                      color: c.category === "stock" ? "#3b82f6" : c.category === "mutual_fund" ? "#06b6d4" : c.category === "gold" ? "#f59e0b" : c.category === "fd" ? "#8b5cf6" : "#10b981",
                    }))}
                    centerLabel="Vault Total"
                    centerValue={`₹${Number(summary.totalCurrentValue || 0).toLocaleString("en-IN")}`}
                    size={170}
                  />
                </div>
              </div>
            )}

            {/* Table & Controls Section */}
            <div className="section-card glass-panel table-card">
              <div className="table-controls-bar">
                {/* Category Filter Chips */}
                <div className="category-filter-chips">
                  <button
                    type="button"
                    className={`chip-btn ${activeCategory === "all" ? "active" : ""}`}
                    onClick={() => setActiveCategory("all")}
                  >
                    All Assets ({data.assets?.length || 0})
                  </button>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = (data.assets || []).filter((a) => a.category === key).length;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`chip-btn ${activeCategory === key ? "active" : ""}`}
                        onClick={() => setActiveCategory(key)}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                        {count > 0 && <span className="chip-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Search Box */}
                <div className="table-search-box">
                  <input
                    type="text"
                    placeholder="Search by asset name or note..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Data Table */}
              {filteredAssets.length === 0 ? (
                <EmptyState
                  icon="🏦"
                  title={
                    data.assets.length === 0
                      ? "Your Wealth Vault is empty"
                      : "No assets match this filter"
                  }
                  description={
                    data.assets.length === 0
                      ? "Add your first asset to see your financial picture in one place."
                      : "Try clearing your search query or selecting another category."
                  }
                  actionText={data.assets.length === 0 ? "+ Add First Asset" : "Reset Filter"}
                  onAction={() =>
                    data.assets.length === 0
                      ? handleOpenAddModal()
                      : (setActiveCategory("all"), setSearchQuery(""))
                  }
                />
              ) : (
                <div className="vault-table-wrapper">
                  <table className="vault-table">
                    <thead>
                      <tr>
                        <th>Asset Name</th>
                        <th>Category</th>
                        <th className="text-right">Invested (₹)</th>
                        <th className="text-right">Current Value (₹)</th>
                        <th className="text-right">Gain / Loss</th>
                        <th>Notes</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset) => {
                        const meta = CATEGORY_META[asset.category] || CATEGORY_META.other;
                        const gain = Number(asset.currentValue || 0) - Number(asset.investedAmount || 0);
                        const gainPct =
                          asset.investedAmount > 0
                            ? Number(((gain / asset.investedAmount) * 100).toFixed(2))
                            : 0;
                        const isPositive = gain >= 0;

                        return (
                          <tr key={asset._id} className="vault-row">
                            <td className="asset-title-cell">
                              <span className="asset-icon">{meta.icon}</span>
                              <span className="asset-name-text">{asset.name}</span>
                            </td>
                            <td>
                              <span className={`badge badge-${meta.color}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="text-right currency">
                              ₹{Number(asset.investedAmount).toLocaleString("en-IN")}
                            </td>
                            <td className="text-right currency font-bold">
                              ₹{Number(asset.currentValue).toLocaleString("en-IN")}
                            </td>
                            <td className="text-right">
                              <span
                                className={`gain-badge ${
                                  isPositive ? "gain-positive" : "gain-negative"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {gainPct}% (₹{Math.abs(gain).toLocaleString("en-IN")})
                              </span>
                            </td>
                            <td className="asset-notes-cell">
                              {asset.notes ? (
                                <span className="notes-text" title={asset.notes}>
                                  {asset.notes}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-center actions-cell">
                              <button
                                type="button"
                                className="action-btn edit-btn"
                                title="Edit Asset"
                                onClick={() => handleOpenEditModal(asset)}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="action-btn delete-btn"
                                title="Delete Asset"
                                onClick={() => setDeletingId(asset._id)}
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
          </>
        )}

        {/* Add / Edit Asset Modal */}
        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingAsset ? "Edit Vault Asset" : "+ Add Asset to Vault"}</h3>
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
                  <label>Asset / Holding Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank, Parag Parikh Flexi Cap, Sovereign Gold Bond"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.icon} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Principal Invested (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 50000"
                      value={formData.investedAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, investedAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Current Market Value (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="e.g. 62500"
                      value={formData.currentValue}
                      onChange={(e) =>
                        setFormData({ ...formData, currentValue: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes / Folio / Broker (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Zerodha account, 3-year lock-in"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    {submitting ? "Saving..." : editingAsset ? "Save Changes" : "Add Asset"}
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
                <h3 className="text-rose">Confirm Asset Deletion</h3>
                <button type="button" className="modal-close" onClick={() => setDeletingId(null)}>
                  ✕
                </button>
              </div>
              <p className="delete-warning-text">
                Are you sure you want to remove this asset from your Wealth Vault? This action will permanently remove it from your net worth and portfolio allocation.
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
                  {isDeleting ? "Deleting..." : "Delete Asset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default WealthVault;
