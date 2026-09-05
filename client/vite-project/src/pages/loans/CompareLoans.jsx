import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import "./Loans.css";

const calculateLoanMetrics = (P, rate, years, feePct = 0) => {
  const numP = Number(P) || 0;
  const numRate = Number(rate) || 0;
  const numYears = Number(years) || 1;
  const numFeePct = Number(feePct) || 0;
  const n = numYears * 12;

  let emi = 0;
  let totalRepayment = 0;
  let totalInterest = 0;

  if (numRate === 0) {
    emi = Math.round(numP / n);
    totalRepayment = numP;
    totalInterest = 0;
  } else {
    const r = numRate / 12 / 100;
    const factor = Math.pow(1 + r, n);
    emi = Math.round((numP * r * factor) / (factor - 1));
    totalRepayment = emi * n;
    totalInterest = Math.max(0, totalRepayment - numP);
  }

  const processingFee = Math.round((numP * numFeePct) / 100);
  const totalCost = totalRepayment + processingFee;

  return {
    principal: numP,
    rate: numRate,
    years: numYears,
    months: n,
    monthlyEMI: emi,
    totalInterest,
    processingFee,
    totalRepayment,
    totalCost,
  };
};

export const CompareLoans = () => {
  // Loan A State
  const [loanA, setLoanA] = useState({
    title: "Option A (e.g. Bank 1)",
    principal: 4000000,
    rate: 8.5,
    years: 20,
    feePct: 0.5,
  });

  // Loan B State
  const [loanB, setLoanB] = useState({
    title: "Option B (e.g. Bank 2)",
    principal: 4000000,
    rate: 8.9,
    years: 18,
    feePct: 0.25,
  });

  const metricsA = useMemo(
    () => calculateLoanMetrics(loanA.principal, loanA.rate, loanA.years, loanA.feePct),
    [loanA]
  );

  const metricsB = useMemo(
    () => calculateLoanMetrics(loanB.principal, loanB.rate, loanB.years, loanB.feePct),
    [loanB]
  );

  const emiDiff = metricsA.monthlyEMI - metricsB.monthlyEMI;
  const totalCostDiff = metricsA.totalCost - metricsB.totalCost;
  const interestDiff = metricsA.totalInterest - metricsB.totalInterest;

  return (
    <AppLayout disclaimerVariant="loans">
      <div className="loans-view">
        {/* Header */}
        <div className="loans-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>SIDE-BY-SIDE DEBT COMPARISON</span>
            </div>
            <h1 className="loans-title">Compare Loan Options</h1>
            <p className="loans-sub">
              Evaluate competing loan offers side-by-side to uncover total interest discrepancies, processing fee impacts, and true cost differences.
            </p>
          </div>
          <div className="loans-top-actions">
            <Link to="/loans" className="btn btn-secondary">
              ← Loans Overview
            </Link>
            <Link to="/loans/finder" className="btn btn-secondary">
              🔍 Loan Finder
            </Link>
          </div>
        </div>

        {/* Top Winner Card */}
        <div className="section-card glass-panel debt-explanation-card" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
          <div className="section-card-header">
            <h3>📊 Head-to-Head Comparison Summary</h3>
            <span className="badge badge-green">Cost Analysis</span>
          </div>
          <div style={{ marginTop: "10px", fontSize: "14px", lineHeight: "1.6" }}>
            {totalCostDiff === 0 ? (
              <p>Both loan options have identical total borrowing outlays.</p>
            ) : totalCostDiff < 0 ? (
              <p>
                🏆 <strong>{loanA.title}</strong> is more cost effective overall, saving you{" "}
                <span className="text-teal font-bold currency">
                  ₹{Math.abs(totalCostDiff).toLocaleString("en-IN")}
                </span>{" "}
                in total lifetime borrowing costs compared to {loanB.title}.
              </p>
            ) : (
              <p>
                🏆 <strong>{loanB.title}</strong> is more cost effective overall, saving you{" "}
                <span className="text-teal font-bold currency">
                  ₹{Math.abs(totalCostDiff).toLocaleString("en-IN")}
                </span>{" "}
                in total lifetime borrowing costs compared to {loanA.title}.
              </p>
            )}
          </div>
        </div>

        {/* 2-Column Comparison Grid */}
        <div className="calc-layout-grid">
          {/* Option A Card */}
          <div className="calc-form-card glass-panel">
            <div className="section-card-header">
              <input
                type="text"
                value={loanA.title}
                onChange={(e) => setLoanA({ ...loanA, title: e.target.value })}
                style={{ fontWeight: 700, fontSize: "16px", color: "var(--accent-cyan)" }}
              />
              <span className="badge badge-blue">Option 1</span>
            </div>

            <div className="calc-input-group">
              <label>Loan Amount (Principal ₹)</label>
              <input
                type="number"
                min="10000"
                step="50000"
                value={loanA.principal}
                onChange={(e) => setLoanA({ ...loanA, principal: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Interest Rate (% p.a.)</label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.05"
                value={loanA.rate}
                onChange={(e) => setLoanA({ ...loanA, rate: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Tenure (Years)</label>
              <input
                type="number"
                min="1"
                max="35"
                value={loanA.years}
                onChange={(e) => setLoanA({ ...loanA, years: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Processing Fee (% of Principal)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={loanA.feePct}
                onChange={(e) => setLoanA({ ...loanA, feePct: Number(e.target.value) })}
              />
            </div>

            {/* Results A */}
            <div className="sim-stat-banner" style={{ marginTop: "12px" }}>
              <div className="calc-stat-box">
                <span className="stat-box-label">Monthly EMI</span>
                <span className="stat-box-val currency text-rose">
                  ₹{Number(metricsA.monthlyEMI).toLocaleString("en-IN")}/mo
                </span>
              </div>
              <div className="calc-stat-box" style={{ marginTop: "8px" }}>
                <span className="stat-box-label">Total Interest Outflow</span>
                <span className="stat-box-val currency">
                  ₹{Number(metricsA.totalInterest).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box" style={{ marginTop: "8px" }}>
                <span className="stat-box-label">Total Cost (Principal + Interest + Fees)</span>
                <span className="stat-box-val currency font-bold text-cyan">
                  ₹{Number(metricsA.totalCost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Option B Card */}
          <div className="calc-form-card glass-panel">
            <div className="section-card-header">
              <input
                type="text"
                value={loanB.title}
                onChange={(e) => setLoanB({ ...loanB, title: e.target.value })}
                style={{ fontWeight: 700, fontSize: "16px", color: "var(--accent-teal)" }}
              />
              <span className="badge badge-green">Option 2</span>
            </div>

            <div className="calc-input-group">
              <label>Loan Amount (Principal ₹)</label>
              <input
                type="number"
                min="10000"
                step="50000"
                value={loanB.principal}
                onChange={(e) => setLoanB({ ...loanB, principal: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Interest Rate (% p.a.)</label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.05"
                value={loanB.rate}
                onChange={(e) => setLoanB({ ...loanB, rate: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Tenure (Years)</label>
              <input
                type="number"
                min="1"
                max="35"
                value={loanB.years}
                onChange={(e) => setLoanB({ ...loanB, years: Number(e.target.value) })}
              />
            </div>

            <div className="calc-input-group">
              <label>Processing Fee (% of Principal)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={loanB.feePct}
                onChange={(e) => setLoanB({ ...loanB, feePct: Number(e.target.value) })}
              />
            </div>

            {/* Results B */}
            <div className="sim-stat-banner" style={{ marginTop: "12px" }}>
              <div className="calc-stat-box">
                <span className="stat-box-label">Monthly EMI</span>
                <span className="stat-box-val currency text-rose">
                  ₹{Number(metricsB.monthlyEMI).toLocaleString("en-IN")}/mo
                </span>
              </div>
              <div className="calc-stat-box" style={{ marginTop: "8px" }}>
                <span className="stat-box-label">Total Interest Outflow</span>
                <span className="stat-box-val currency">
                  ₹{Number(metricsB.totalInterest).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="calc-stat-box" style={{ marginTop: "8px" }}>
                <span className="stat-box-label">Total Cost (Principal + Interest + Fees)</span>
                <span className="stat-box-val currency font-bold text-teal">
                  ₹{Number(metricsB.totalCost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Comparison Table */}
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <h3>📑 Metric-by-Metric Breakdown</h3>
          </div>
          <div className="loans-table-wrapper">
            <table className="loans-table">
              <thead>
                <tr>
                  <th>Comparison Parameter</th>
                  <th className="text-right">{loanA.title}</th>
                  <th className="text-right">{loanB.title}</th>
                  <th className="text-right">Difference (A - B)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Monthly Installment (EMI)</td>
                  <td className="text-right currency font-bold">₹{metricsA.monthlyEMI.toLocaleString("en-IN")}</td>
                  <td className="text-right currency font-bold">₹{metricsB.monthlyEMI.toLocaleString("en-IN")}</td>
                  <td className={`text-right currency font-bold ${emiDiff < 0 ? "text-teal" : "text-rose"}`}>
                    {emiDiff < 0 ? `Save ₹${Math.abs(emiDiff).toLocaleString("en-IN")}/mo` : `+₹${emiDiff.toLocaleString("en-IN")}/mo`}
                  </td>
                </tr>
                <tr>
                  <td>Total Interest Over Life of Loan</td>
                  <td className="text-right currency">₹{metricsA.totalInterest.toLocaleString("en-IN")}</td>
                  <td className="text-right currency">₹{metricsB.totalInterest.toLocaleString("en-IN")}</td>
                  <td className={`text-right currency font-bold ${interestDiff < 0 ? "text-teal" : "text-rose"}`}>
                    {interestDiff < 0 ? `Save ₹${Math.abs(interestDiff).toLocaleString("en-IN")}` : `+₹${interestDiff.toLocaleString("en-IN")}`}
                  </td>
                </tr>
                <tr>
                  <td>Processing Fee Outlay</td>
                  <td className="text-right currency">₹{metricsA.processingFee.toLocaleString("en-IN")}</td>
                  <td className="text-right currency">₹{metricsB.processingFee.toLocaleString("en-IN")}</td>
                  <td className="text-right currency text-muted">
                    ₹{Math.abs(metricsA.processingFee - metricsB.processingFee).toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                  <td className="font-bold">Total Cost of Borrowing</td>
                  <td className="text-right currency font-bold text-cyan">₹{metricsA.totalCost.toLocaleString("en-IN")}</td>
                  <td className="text-right currency font-bold text-teal">₹{metricsB.totalCost.toLocaleString("en-IN")}</td>
                  <td className={`text-right currency font-bold ${totalCostDiff < 0 ? "text-teal" : "text-rose"}`}>
                    {totalCostDiff < 0
                      ? `Option A Saves ₹${Math.abs(totalCostDiff).toLocaleString("en-IN")}`
                      : `Option B Saves ₹${totalCostDiff.toLocaleString("en-IN")}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CompareLoans;
