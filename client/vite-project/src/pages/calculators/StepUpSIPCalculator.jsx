import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../utils/apiClient";
import "./CalculatorPages.css";

export const StepUpSIPCalculator = () => {
  const [initialMonthlyInvestment, setInitialMonthlyInvestment] = useState(10000);
  const [annualRate, setAnnualRate] = useState(12);
  const [tenureYears, setTenureYears] = useState(10);
  const [annualStepUpPct, setAnnualStepUpPct] = useState(10);
  const [serverResult, setServerResult] = useState(null);

  // Client-side live calculation for instant feedback
  const clientResult = useMemo(() => {
    const P = Number(initialMonthlyInvestment) || 0;
    const rate = Number(annualRate) || 0;
    const years = Number(tenureYears) || 1;
    const stepUp = Number(annualStepUpPct) || 0;

    const monthlyRate = rate / 12 / 100;
    let accumulatedFV = 0;
    let totalInvested = 0;
    let currentSIP = P;
    const yearlyBreakdown = [];

    // Standard SIP for comparison
    const standardTotalInvested = P * years * 12;
    const compoundFactor = Math.pow(1 + monthlyRate, years * 12);
    const standardFV = monthlyRate > 0
      ? Math.round(P * ((compoundFactor - 1) / monthlyRate) * (1 + monthlyRate))
      : standardTotalInvested;

    for (let y = 1; y <= years; y++) {
      let yearInvested = 0;
      for (let m = 1; m <= 12; m++) {
        totalInvested += currentSIP;
        yearInvested += currentSIP;
        accumulatedFV = (accumulatedFV + currentSIP) * (1 + monthlyRate);
      }
      yearlyBreakdown.push({
        year: y,
        monthlySIP: Math.round(currentSIP),
        yearlyInvested: Math.round(yearInvested),
        cumulativeInvested: Math.round(totalInvested),
        portfolioValue: Math.round(accumulatedFV),
      });
      currentSIP = currentSIP * (1 + stepUp / 100);
    }

    const finalFV = Math.round(accumulatedFV);
    const estimatedReturns = Math.max(0, finalFV - totalInvested);
    const extraWealthGenerated = Math.max(0, finalFV - standardFV);

    return {
      standard: {
        totalInvested: standardTotalInvested,
        futureValue: standardFV,
        estimatedReturns: Math.max(0, standardFV - standardTotalInvested),
      },
      stepUp: {
        totalInvested: Math.round(totalInvested),
        futureValue: finalFV,
        estimatedReturns,
        extraWealthGenerated,
      },
      yearlyBreakdown,
    };
  }, [initialMonthlyInvestment, annualRate, tenureYears, annualStepUpPct]);

  // Sync with backend API
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const res = await api.post("/api/calculators/step-up-sip", {
          initialMonthlyInvestment,
          annualRate,
          tenureYears,
          annualStepUpPct,
        });
        if (res && res.data) {
          setServerResult(res.data);
        }
      } catch (err) {
        console.error("Backend calculation sync:", err);
      }
    };
    const timer = setTimeout(syncWithBackend, 200);
    return () => clearTimeout(timer);
  }, [initialMonthlyInvestment, annualRate, tenureYears, annualStepUpPct]);

  const activeResult = serverResult || clientResult;

  return (
    <AppLayout disclaimerVariant="investment">
      <div className="calculator-view">
        {/* Header */}
        <div className="calc-header-row">
          <div>
            <div className="breadcrumb-pill">
              <span className="live-dot"></span>
              <span>EXPONENTIAL STEP-UP COMPOUNDING</span>
            </div>
            <h1 className="calc-title">Step-Up SIP Calculator</h1>
            <p className="calc-sub">
              See how compounding expands when you increase your monthly contribution every year by an annual percentage matching your career increments.
            </p>
          </div>
          <div className="calc-presets-row">
            <Link to="/calculators/sip" className="btn btn-secondary">
              Standard SIP &rarr;
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="calc-layout-grid">
          {/* Left: Input Form */}
          <div className="calc-form-card glass-panel">
            {/* Initial Monthly Investment */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Starting Monthly Investment</label>
                <span className="calc-unit-pill">
                  ₹{Number(initialMonthlyInvestment).toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1000"
                max="200000"
                step="1000"
                value={initialMonthlyInvestment}
                onChange={(e) => setInitialMonthlyInvestment(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                step="500"
                value={initialMonthlyInvestment}
                onChange={(e) => setInitialMonthlyInvestment(Number(e.target.value))}
              />
            </div>

            {/* Annual Step-Up Percentage */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Annual Step-Up Increment (%)</label>
                <span className="calc-unit-pill">+{annualStepUpPct}% / year</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="1"
                value={annualStepUpPct}
                onChange={(e) => setAnnualStepUpPct(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="50"
                value={annualStepUpPct}
                onChange={(e) => setAnnualStepUpPct(Number(e.target.value))}
              />
              <div className="calc-presets-row">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`calc-preset-btn ${annualStepUpPct === pct ? "active" : ""}`}
                    onClick={() => setAnnualStepUpPct(pct)}
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Annual Return Rate */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Expected Return Rate (p.a.)</label>
                <span className="calc-unit-pill">{annualRate}%</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="30"
                step="0.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
              />
            </div>

            {/* Time Period */}
            <div className="calc-input-group">
              <div className="calc-label-row">
                <label>Investment Horizon</label>
                <span className="calc-unit-pill">{tenureYears} Years</span>
              </div>
              <input
                type="range"
                className="calc-slider"
                min="1"
                max="35"
                step="1"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
              <input
                type="number"
                min="1"
                max="50"
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="calc-results-card glass-panel">
            <div className="results-hero-strip">
              <div>
                <span className="hero-label">Step-Up Maturity Corpus</span>
                <div className="hero-val currency text-teal">
                  ₹{Number(activeResult.stepUp?.futureValue || 0).toLocaleString("en-IN")}
                </div>
              </div>
              <div className="badge badge-green">
                +₹{Number(activeResult.stepUp?.extraWealthGenerated || 0).toLocaleString("en-IN")} Extra vs Regular SIP
              </div>
            </div>

            {/* Side-by-Side Comparison Box */}
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th className="text-right">Total Invested</th>
                    <th className="text-right">Estimated Gain</th>
                    <th className="text-right">Maturity Corpus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="font-bold text-secondary">Regular SIP</span>
                    </td>
                    <td className="text-right currency">
                      ₹{Number(activeResult.standard?.totalInvested || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="text-right currency text-teal">
                      ₹{Number(activeResult.standard?.estimatedReturns || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="text-right currency font-bold">
                      ₹{Number(activeResult.standard?.futureValue || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ background: "rgba(16, 185, 129, 0.08)" }}>
                    <td>
                      <span className="font-bold text-teal">Step-Up SIP (+{annualStepUpPct}%)</span>
                    </td>
                    <td className="text-right currency text-cyan">
                      ₹{Number(activeResult.stepUp?.totalInvested || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="text-right currency text-teal">
                      ₹{Number(activeResult.stepUp?.estimatedReturns || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="text-right currency font-bold text-teal">
                      ₹{Number(activeResult.stepUp?.futureValue || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Annual Breakdown Snippet */}
            <div className="section-card glass-panel" style={{ padding: "16px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "10px" }}>📅 Year-by-Year Growth Progression</h4>
              <div className="comparison-table-wrapper" style={{ maxHeight: "200px" }}>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Monthly SIP</th>
                      <th className="text-right">Total Invested</th>
                      <th className="text-right">Portfolio Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeResult.yearlyBreakdown || []).slice(0, 10).map((row) => (
                      <tr key={row.year}>
                        <td>Year {row.year}</td>
                        <td className="currency">₹{Number(row.monthlySIP).toLocaleString("en-IN")}/mo</td>
                        <td className="text-right currency">₹{Number(row.cumulativeInvested).toLocaleString("en-IN")}</td>
                        <td className="text-right currency font-bold text-teal">₹{Number(row.portfolioValue).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <div className="calc-disclaimer-box">
              ⚖️ <strong>Statutory Disclaimer:</strong> Illustrative calculation only. Actual returns are not guaranteed and are subject to market risks.
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StepUpSIPCalculator;
