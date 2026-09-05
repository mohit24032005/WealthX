import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/apiClient";
import Disclaimer from "../components/common/Disclaimer";
import "./Onboarding.css";

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    employmentStatus: "salaried",
    monthlyIncome: "",
    monthlyExpenses: "",
    currentSavings: "",
    investmentExperience: ["mutual_fund"],
    riskProfile: "moderate",
    primaryGoals: ["wealth_creation", "emergency_fund"],
    dependentsCount: 0,
    emergencyFundTargetMonths: 6,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
  };

  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (!formData.monthlyIncome || Number(formData.monthlyIncome) <= 0) {
        setError("Please enter a valid monthly income (in ₹)");
        return;
      }
    }
    if (step === 2) {
      if (!formData.monthlyExpenses || Number(formData.monthlyExpenses) < 0) {
        setError("Please enter your estimated monthly expenses");
        return;
      }
      if (Number(formData.monthlyExpenses) > Number(formData.monthlyIncome)) {
        setError("Monthly expenses cannot exceed your total income");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        employmentStatus: formData.employmentStatus,
        monthlyIncome: Number(formData.monthlyIncome),
        monthlyExpenses: Number(formData.monthlyExpenses),
        currentSavings: Number(formData.currentSavings) || 0,
        investmentExperience: formData.investmentExperience,
        riskProfile: formData.riskProfile,
        primaryGoals: formData.primaryGoals,
        dependentsCount: Number(formData.dependentsCount) || 0,
        emergencyFundTargetMonths: Number(formData.emergencyFundTargetMonths) || 6,
      };

      const response = await api.post("/api/profile", payload);
      if (response.success) {
        await refreshUser();
        navigate("/dashboard");
      } else {
        throw new Error(response.message || "Failed to save profile");
      }
    } catch (err) {
      setError(err.message || "An error occurred while setting up your financial profile.");
    } finally {
      setLoading(false);
    }
  };

  const goalOptions = [
    { id: "emergency_fund", label: "🛡️ Emergency Fund", desc: "6 months safety cushion" },
    { id: "wealth_creation", label: "📈 Long-term Wealth", desc: "Compounding via equity/SIPs" },
    { id: "buy_home", label: "🏠 Buying a Home", desc: "Down payment & EMI planning" },
    { id: "retirement", label: "🌅 Early Retirement", desc: "Financial freedom & FIRE" },
    { id: "debt_freedom", label: "💳 Debt Payoff", desc: "Clear loans & credit card dues" },
    { id: "child_education", label: "🎓 Higher Education", desc: "Tuition & future funds" },
  ];

  const experienceOptions = [
    { id: "savings_fd", label: "Fixed Deposits & Savings" },
    { id: "mutual_fund", label: "Mutual Funds & SIPs" },
    { id: "direct_stocks", label: "Direct Indian Stocks (NSE/BSE)" },
    { id: "gold_real_estate", label: "Gold & Real Estate" },
    { id: "crypto_derivatives", label: "Futures / Options / Crypto" },
  ];

  return (
    <div className="onboarding-page">
      <div className="onboarding-container glass-panel">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo-badge">WealthX Intelligence</div>
          <h2>Welcome, {user?.name || "Investor"}! Let’s Build Your Financial Profile</h2>
          <p>
            Answer a few quick questions to calibrate your personalized Financial Health Score,
            Wealth Vault, and AI Decision Lab.
          </p>

          {/* Stepper Progress */}
          <div className="stepper-bar">
            <div className={`step-node ${step >= 1 ? "active" : ""}`}>
              <div className="step-num">1</div>
              <span>Income</span>
            </div>
            <div className={`step-line ${step >= 2 ? "active" : ""}`}></div>
            <div className={`step-node ${step >= 2 ? "active" : ""}`}>
              <div className="step-num">2</div>
              <span>Expenses</span>
            </div>
            <div className={`step-line ${step >= 3 ? "active" : ""}`}></div>
            <div className={`step-node ${step >= 3 ? "active" : ""}`}>
              <div className="step-num">3</div>
              <span>Goals</span>
            </div>
            <div className={`step-line ${step >= 4 ? "active" : ""}`}></div>
            <div className={`step-node ${step >= 4 ? "active" : ""}`}>
              <div className="step-num">4</div>
              <span>Risk</span>
            </div>
          </div>
        </div>

        {error && <div className="onboarding-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* STEP 1: Income & Employment */}
          {step === 1 && (
            <div className="step-content">
              <h3 className="step-heading">Step 1: Employment & Inflow</h3>
              <p className="step-subtext">How do you earn and what is your monthly take-home?</p>

              <div className="form-group">
                <label>Employment Type</label>
                <div className="employment-grid">
                  {[
                    { id: "salaried", label: "Salaried Professional" },
                    { id: "self_employed", label: "Self-Employed / Freelancer" },
                    { id: "business", label: "Business Owner" },
                    { id: "student", label: "Student" },
                    { id: "retired", label: "Retired" },
                    { id: "other", label: "Other" },
                  ].map((emp) => (
                    <div
                      key={emp.id}
                      className={`radio-card ${formData.employmentStatus === emp.id ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, employmentStatus: emp.id })}
                    >
                      <input
                        type="radio"
                        name="employmentStatus"
                        checked={formData.employmentStatus === emp.id}
                        onChange={() => {}}
                      />
                      <span>{emp.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Monthly Take-Home Inflow (₹ INR)</label>
                <div className="input-with-symbol">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    name="monthlyIncome"
                    placeholder="e.g. 75000"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    required
                    min="1"
                  />
                </div>
                <small className="form-hint">Net in-hand post-tax monthly amount.</small>
              </div>

              <div className="form-group">
                <label>Number of Financial Dependents</label>
                <input
                  type="number"
                  name="dependentsCount"
                  placeholder="0"
                  value={formData.dependentsCount}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Expenses & Liquid Savings */}
          {step === 2 && (
            <div className="step-content">
              <h3 className="step-heading">Step 2: Outflows & Existing Cushion</h3>
              <p className="step-subtext">
                Your monthly burn rate helps calculate your Emergency Runway and Savings Rate.
              </p>

              <div className="form-group">
                <label>Estimated Total Monthly Expenses (₹ INR)</label>
                <div className="input-with-symbol">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    name="monthlyExpenses"
                    placeholder="e.g. 35000"
                    value={formData.monthlyExpenses}
                    onChange={handleInputChange}
                    required
                    min="0"
                  />
                </div>
                <small className="form-hint">Includes rent, groceries, EMIs, utilities, and lifestyle.</small>
              </div>

              <div className="form-group">
                <label>Current Liquid Savings & Bank Balance (₹ INR)</label>
                <div className="input-with-symbol">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    name="currentSavings"
                    placeholder="e.g. 150000"
                    value={formData.currentSavings}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
                <small className="form-hint">Easily accessible funds in savings accounts and FDs.</small>
              </div>

              <div className="form-group">
                <label>Target Emergency Fund Duration</label>
                <select
                  name="emergencyFundTargetMonths"
                  value={formData.emergencyFundTargetMonths}
                  onChange={handleInputChange}
                >
                  <option value={3}>3 Months Expenses (Aggressive / Dual Income)</option>
                  <option value={6}>6 Months Expenses (Standard Recommended)</option>
                  <option value={12}>12 Months Expenses (Conservative / High Responsibility)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: Goals & Experience */}
          {step === 3 && (
            <div className="step-content">
              <h3 className="step-heading">Step 3: Priorities & Experience</h3>
              <p className="step-subtext">Select all the assets you have experience with and your core goals.</p>

              <div className="form-group">
                <label>Primary Financial Milestones</label>
                <div className="options-grid">
                  {goalOptions.map((goal) => {
                    const isSelected = formData.primaryGoals.includes(goal.id);
                    return (
                      <div
                        key={goal.id}
                        className={`checkbox-card ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleArrayItem("primaryGoals", goal.id)}
                      >
                        <span className="option-title">{goal.label}</span>
                        <span className="option-desc">{goal.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Investment Experience</label>
                <div className="tags-grid">
                  {experienceOptions.map((exp) => {
                    const isSelected = formData.investmentExperience.includes(exp.id);
                    return (
                      <div
                        key={exp.id}
                        className={`tag-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleArrayItem("investmentExperience", exp.id)}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {exp.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Risk Profile Assessment */}
          {step === 4 && (
            <div className="step-content">
              <h3 className="step-heading">Step 4: Investment Temperament</h3>
              <p className="step-subtext">How do you react to market fluctuations?</p>

              <div className="risk-cards-grid">
                {[
                  {
                    id: "conservative",
                    title: "Conservative (Capital Preservation)",
                    tag: "Low Risk",
                    color: "teal",
                    desc: "You prioritize safety of capital. You prefer FDs, Govt Bonds, and Debt Funds over volatile stock market swings.",
                  },
                  {
                    id: "moderate",
                    title: "Moderate (Balanced Growth)",
                    tag: "Medium Risk",
                    color: "blue",
                    desc: "You seek a balanced blend of equity mutual funds (SIP) and debt instruments. You can tolerate 10-15% market dips for higher long-term gains.",
                  },
                  {
                    id: "aggressive",
                    title: "Aggressive (Wealth Maximizer)",
                    tag: "High Growth",
                    color: "amber",
                    desc: "You are focused on maximum compounding through equity, direct stocks, and index ETFs, and comfortable with short-term volatility.",
                  },
                ].map((risk) => (
                  <div
                    key={risk.id}
                    className={`risk-card ${formData.riskProfile === risk.id ? "selected" : ""}`}
                    onClick={() => setFormData({ ...formData, riskProfile: risk.id })}
                  >
                    <div className="risk-card-top">
                      <span className={`badge badge-${risk.color}`}>{risk.tag}</span>
                      <input
                        type="radio"
                        name="riskProfile"
                        checked={formData.riskProfile === risk.id}
                        onChange={() => {}}
                      />
                    </div>
                    <h4>{risk.title}</h4>
                    <p>{risk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="onboarding-controls">
            {step > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                ← Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Continue →
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Generating Intelligence Profile..." : "Complete Setup & Enter Dashboard 🚀"}
              </button>
            )}
          </div>
        </form>

        <Disclaimer variant="general" />
      </div>
    </div>
  );
};

export default Onboarding;
