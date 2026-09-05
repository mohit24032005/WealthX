import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { LoadingState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./Settings.css";

const EMPLOYMENT_OPTIONS = [
  { value: "salaried", label: "Salaried Professional" },
  { value: "self_employed", label: "Self-Employed / Business Owner" },
  { value: "freelance", label: "Freelancer / Consultant" },
  { value: "retired", label: "Retired / Passive Income" },
  { value: "student", label: "Student / Early Career" },
];

const INVESTMENT_EXPERIENCE_OPTIONS = [
  { id: "mutual_fund", label: "Mutual Funds & SIPs" },
  { id: "direct_stocks", label: "Direct Indian Stocks (NSE/BSE)" },
  { id: "fixed_deposits", label: "Fixed Deposits & Term Savings" },
  { id: "digital_gold", label: "Digital Gold & Sovereign Gold Bonds (SGB)" },
  { id: "govt_bonds", label: "Government Bonds & T-Bills" },
  { id: "etfs", label: "Index Funds & ETFs" },
  { id: "crypto", label: "Cryptocurrencies & Digital Assets" },
];

export const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setThemeMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    monthlyIncome: "",
    monthlyExpenses: "",
    currentSavings: "",
    employmentStatus: "salaried",
    dependentsCount: 0,
    emergencyFundTargetMonths: 6,
    riskProfile: "moderate",
    investmentExperience: ["mutual_fund", "fixed_deposits"],
    primaryGoals: ["wealth_creation", "emergency_fund"],
  });

  // Fetch current user financial profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/profile");
        if (res && res.data && res.data.profile) {
          const p = res.data.profile;
          setFormData({
            monthlyIncome: p.monthlyIncome || "",
            monthlyExpenses: p.monthlyExpenses || "",
            currentSavings: p.currentSavings || "",
            employmentStatus: p.employmentStatus || "salaried",
            dependentsCount: p.dependentsCount !== undefined ? p.dependentsCount : 0,
            emergencyFundTargetMonths: p.emergencyFundTargetMonths || 6,
            riskProfile: p.riskProfile || "moderate",
            investmentExperience: p.investmentExperience || ["mutual_fund"],
            primaryGoals: p.primaryGoals || ["wealth_creation"],
          });
        }
      } catch (err) {
        console.error("Failed to load settings profile:", err);
        setErrorMsg("Unable to load profile from database. You can still edit and save new values.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMsg("");
    setErrorMsg("");
  };

  const toggleArrayItem = (fieldName, item) => {
    setFormData((prev) => {
      const current = prev[fieldName] || [];
      const exists = current.includes(item);
      return {
        ...prev,
        [fieldName]: exists ? current.filter((x) => x !== item) : [...current, item],
      };
    });
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const income = Number(formData.monthlyIncome);
    const expenses = Number(formData.monthlyExpenses);
    const savings = Number(formData.currentSavings);

    if (isNaN(income) || income < 0) {
      setErrorMsg("Please enter a valid monthly income.");
      setSaving(false);
      return;
    }

    if (isNaN(expenses) || expenses < 0) {
      setErrorMsg("Please enter a valid monthly expenses amount.");
      setSaving(false);
      return;
    }

    if (expenses > income && income > 0) {
      setErrorMsg("Monthly expenses cannot exceed your monthly salary/inflow.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        monthlyIncome: income,
        monthlyExpenses: expenses,
        currentSavings: isNaN(savings) ? 0 : savings,
        employmentStatus: formData.employmentStatus,
        dependentsCount: Number(formData.dependentsCount) || 0,
        emergencyFundTargetMonths: Number(formData.emergencyFundTargetMonths) || 6,
        riskProfile: formData.riskProfile,
        investmentExperience: formData.investmentExperience,
        primaryGoals: formData.primaryGoals,
      };

      const res = await api.put("/api/profile", payload);
      if (res && res.success) {
        setSuccessMsg("✓ Financial profile and cashflow settings successfully updated! Command Center & X-Ray recalibrated.");
      } else {
        throw new Error(res.message || "Failed to update profile.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  // Live Calculations
  const incomeNum = Number(formData.monthlyIncome) || 0;
  const expensesNum = Number(formData.monthlyExpenses) || 0;
  const savingsNum = Number(formData.currentSavings) || 0;
  const surplusNum = Math.max(0, incomeNum - expensesNum);
  const savingsRate = incomeNum > 0 ? Math.round((surplusNum / incomeNum) * 100) : 0;
  const runwayMonths = expensesNum > 0 ? Number((savingsNum / expensesNum).toFixed(1)) : 0;

  return (
    <AppLayout disclaimerVariant="general">
      <div className="settings-view">
        {/* Header */}
        <div className="settings-header glass-panel">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>FINANCIAL SETTINGS & PROFILE CONFIGURATION</span>
            </div>
            <h1 className="settings-title">Settings & Profile</h1>
            <p className="settings-sub">
              Modify your monthly salary, living expenses, liquid cash reserves, employment profile, and risk preferences. Changes immediately recalibrate your Financial Health Score, Emergency Runway, and AI recommendations.
            </p>
          </div>
          <div className="settings-header-actions">
            <Link to="/history" className="btn btn-secondary">
              📜 Audit History &rarr;
            </Link>
            <Link to="/dashboard" className="btn btn-primary" style={{ fontWeight: 800 }}>
              📊 Open Dashboard &rarr;
            </Link>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading your calibrated financial profile..." />
        ) : (
          <div className="settings-layout-grid">
            {/* Left Column: Form Controls */}
            <div className="settings-form-column">
              <form onSubmit={handleSubmit} className="settings-form glass-panel">
                {/* Alerts */}
                {successMsg && (
                  <div className="settings-alert alert-success">
                    <span>{successMsg}</span>
                  </div>
                )}
                {errorMsg && (
                  <div className="settings-alert alert-error">
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Section 1: Monthly Salary & Expenses */}
                <div className="form-section-block">
                  <div className="form-section-title-row">
                    <span className="section-step-num">1</span>
                    <div>
                      <h3 className="form-section-heading">Monthly Cashflow Calibration</h3>
                      <span className="text-muted" style={{ fontSize: "12px" }}>
                        Update your primary income inflows and mandatory household expenses
                      </span>
                    </div>
                  </div>

                  <div className="form-inputs-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="monthlyIncome">
                        Monthly Salary / Net Inflow (₹ INR) <span className="text-rose">*</span>
                      </label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">₹</span>
                        <input
                          id="monthlyIncome"
                          type="number"
                          name="monthlyIncome"
                          className="custom-input"
                          placeholder="e.g. 120000"
                          value={formData.monthlyIncome}
                          onChange={handleInputChange}
                          required
                          min="0"
                        />
                      </div>
                      <span className="input-hint">Total in-hand take-home salary or net business profit per month.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="monthlyExpenses">
                        Essential Monthly Expenses (₹ INR) <span className="text-rose">*</span>
                      </label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">₹</span>
                        <input
                          id="monthlyExpenses"
                          type="number"
                          name="monthlyExpenses"
                          className="custom-input"
                          placeholder="e.g. 45000"
                          value={formData.monthlyExpenses}
                          onChange={handleInputChange}
                          required
                          min="0"
                        />
                      </div>
                      <span className="input-hint">Rent, groceries, utilities, insurance, and non-negotiable living costs.</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Liquid Savings & Reserves */}
                <div className="form-section-block">
                  <div className="form-section-title-row">
                    <span className="section-step-num">2</span>
                    <div>
                      <h3 className="form-section-heading">Liquid Reserves & Runway Target</h3>
                      <span className="text-muted" style={{ fontSize: "12px" }}>
                        Calibrate your emergency cash cushion in savings bank accounts & liquid deposits
                      </span>
                    </div>
                  </div>

                  <div className="form-inputs-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="currentSavings">
                        Current Liquid Savings / Cash in Bank (₹ INR)
                      </label>
                      <div className="input-prefix-wrap">
                        <span className="input-prefix">₹</span>
                        <input
                          id="currentSavings"
                          type="number"
                          name="currentSavings"
                          className="custom-input"
                          placeholder="e.g. 250000"
                          value={formData.currentSavings}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                      <span className="input-hint">Readily accessible liquid cash for unexpected emergencies.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="emergencyFundTargetMonths">
                        Target Emergency Runway (Months)
                      </label>
                      <select
                        id="emergencyFundTargetMonths"
                        name="emergencyFundTargetMonths"
                        className="custom-select"
                        value={formData.emergencyFundTargetMonths}
                        onChange={handleInputChange}
                      >
                        <option value={3}>3 Months (Aggressive / Dual Income)</option>
                        <option value={6}>6 Months (Standard Recommended)</option>
                        <option value={9}>9 Months (Conservative)</option>
                        <option value={12}>12 Months (Maximum Security / Sole Earner)</option>
                      </select>
                      <span className="input-hint">Recommended standard is 6 months of living expenses.</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Professional Profile & Dependents */}
                <div className="form-section-block">
                  <div className="form-section-title-row">
                    <span className="section-step-num">3</span>
                    <div>
                      <h3 className="form-section-heading">Employment & Family Context</h3>
                      <span className="text-muted" style={{ fontSize: "12px" }}>
                        Helps WealthX tune safety buffers to your income stability
                      </span>
                    </div>
                  </div>

                  <div className="form-inputs-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="employmentStatus">
                        Employment Status
                      </label>
                      <select
                        id="employmentStatus"
                        name="employmentStatus"
                        className="custom-select"
                        value={formData.employmentStatus}
                        onChange={handleInputChange}
                      >
                        {EMPLOYMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="dependentsCount">
                        Financial Dependents (Count)
                      </label>
                      <select
                        id="dependentsCount"
                        name="dependentsCount"
                        className="custom-select"
                        value={formData.dependentsCount}
                        onChange={handleInputChange}
                      >
                        <option value={0}>0 (Independent)</option>
                        <option value={1}>1 Dependent (Spouse / Child / Parent)</option>
                        <option value={2}>2 Dependents</option>
                        <option value={3}>3+ Dependents</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Investment Experience Preferences */}
                <div className="form-section-block">
                  <div className="form-section-title-row">
                    <span className="section-step-num">4</span>
                    <div>
                      <h3 className="form-section-heading">Active Asset Classes & Preferences</h3>
                      <span className="text-muted" style={{ fontSize: "12px" }}>
                        Select the asset classes you currently hold or want recommendations on
                      </span>
                    </div>
                  </div>

                  <div className="preferences-chips-grid">
                    {INVESTMENT_EXPERIENCE_OPTIONS.map((opt) => {
                      const isSelected = formData.investmentExperience.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pref-chip-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleArrayItem("investmentExperience", opt.id)}
                        >
                          <span className="pref-checkbox">{isSelected ? "✓" : "+"}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="form-action-row">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: "12px 28px", fontSize: "14px", fontWeight: 800 }}
                    disabled={saving}
                  >
                    {saving ? "Saving Changes..." : "💾 Save & Recalibrate WealthX"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate("/dashboard")}
                  >
                    Cancel & Return
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Calculated Blueprint & Account Card */}
            <div className="settings-preview-column">
              {/* Account Meta Card */}
              <div className="account-meta-card glass-panel">
                <div className="account-avatar-large">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="account-info-box">
                  <h3 className="account-name">{user?.name || "Client User"}</h3>
                  <span className="account-email font-mono">{user?.email}</span>
                  <span className="badge badge-cyan" style={{ width: "fit-content", marginTop: "4px" }}>
                    Verified Investor
                  </span>
                </div>
              </div>

              {/* Real-Time Live Recalibration Preview */}
              <div className="live-preview-card glass-panel glow-hover">
                <div className="preview-header">
                  <span className="live-pulse-dot"></span>
                  <h4 className="preview-title">Live Recalibration Preview</h4>
                </div>

                <div className="preview-metrics-list">
                  <div className="preview-metric-row">
                    <span className="text-muted" style={{ fontSize: "13px" }}>Monthly Inflow:</span>
                    <span className="font-mono font-bold">₹{incomeNum.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="preview-metric-row">
                    <span className="text-muted" style={{ fontSize: "13px" }}>Essential Outflows:</span>
                    <span className="font-mono text-rose">₹{expensesNum.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="preview-metric-row">
                    <span className="text-muted" style={{ fontSize: "13px" }}>Monthly Surplus:</span>
                    <span className="font-mono font-bold text-teal" style={{ fontSize: "15px" }}>
                      ₹{surplusNum.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="preview-metric-row">
                    <span className="text-muted" style={{ fontSize: "13px" }}>Savings Rate:</span>
                    <span className={`badge ${savingsRate >= 30 ? "badge-green" : savingsRate >= 15 ? "badge-blue" : "badge-amber"}`}>
                      {savingsRate}%
                    </span>
                  </div>

                  <div className="preview-metric-row">
                    <span className="text-muted" style={{ fontSize: "13px" }}>Emergency Runway:</span>
                    <span className="font-mono font-bold text-cyan">
                      {runwayMonths} Months
                    </span>
                  </div>
                </div>

                <div className="preview-notice-box">
                  <span className="text-muted" style={{ fontSize: "11.5px", lineHeight: "1.4" }}>
                    💡 Saving your salary & expenses updates all dashboard cards, SIP compounding projections, and AI recommendations in real time.
                  </span>
                </div>
              </div>

              {/* Appearance & Theme Card */}
              <div className="theme-settings-card glass-panel">
                <span className="section-mini-label text-muted">Appearance & Theme</span>
                <div className="theme-select-grid">
                  <button
                    type="button"
                    className={`theme-mode-btn ${theme === "dark" ? "active" : ""}`}
                    onClick={() => setThemeMode("dark")}
                  >
                    <span style={{ fontSize: "18px" }}>🌙</span>
                    <div style={{ textAlign: "left" }}>
                      <div className="font-bold" style={{ fontSize: "13px" }}>Dark Navy</div>
                      <span className="text-muted" style={{ fontSize: "11px" }}>Fintech Glow</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-mode-btn ${theme === "light" ? "active" : ""}`}
                    onClick={() => setThemeMode("light")}
                  >
                    <span style={{ fontSize: "18px" }}>☀️</span>
                    <div style={{ textAlign: "left" }}>
                      <div className="font-bold" style={{ fontSize: "13px" }}>Light Slate</div>
                      <span className="text-muted" style={{ fontSize: "11px" }}>Clean Contrast</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="quick-links-panel glass-panel">
                <span className="section-mini-label text-muted">Quick Management Tools</span>
                <div className="quick-links-list">
                  <Link to="/history" className="quick-link-item">
                    <span>📜 Audit & History</span>
                    <span>&rarr;</span>
                  </Link>
                  <Link to="/risk-dna" className="quick-link-item">
                    <span>🧬 Calibrate Risk DNA</span>
                    <span>&rarr;</span>
                  </Link>
                  <Link to="/wealth-vault" className="quick-link-item">
                    <span>🏦 Manage Wealth Vault Assets</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Settings;
