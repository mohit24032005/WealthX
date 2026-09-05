import React from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import "./CalculatorsHub.css";

const CALCULATOR_ITEMS = [
  {
    path: "/calculators/sip",
    icon: "📈",
    title: "SIP Calculator",
    subtitle: "Systematic Compounding",
    description: "Simulate wealth accumulation from regular monthly mutual fund investments with real-time future value projections.",
    badge: "Most Used",
    badgeColor: "badge-green",
  },
  {
    path: "/calculators/step-up-sip",
    icon: "🚀",
    title: "Step-Up SIP Calculator",
    subtitle: "Annual Contribution Increment",
    description: "Model the exponential impact of increasing your monthly investment by an annual percentage matching salary hikes.",
    badge: "High Growth",
    badgeColor: "badge-blue",
  },
  {
    path: "/calculators/emi",
    icon: "💳",
    title: "Loan EMI & Amortization",
    subtitle: "Debt Repayment Modeling",
    description: "Calculate exact monthly installments, total interest costs, and multi-tenure payoff schedules for home, car, or personal loans.",
    badge: "Essential",
    badgeColor: "badge-amber",
  },
  {
    path: "/calculators/fd",
    icon: "🔒",
    title: "Fixed Deposit (FD) Growth",
    subtitle: "Term Deposit Returns",
    description: "Determine guaranteed maturity returns with configurable monthly, quarterly, semi-annual, or annual compounding frequencies.",
    badge: "Guaranteed",
    badgeColor: "badge-blue",
  },
  {
    path: "/calculators/goal",
    icon: "🎯",
    title: "Goal Target Calculator",
    subtitle: "Milestone Feasibility",
    description: "Solve for the exact monthly savings required to hit major future milestones (home down-payment, retirement, higher education).",
    badge: "Milestones",
    badgeColor: "badge-cyan",
  },
];

export const CalculatorsHub = () => {
  return (
    <AppLayout disclaimerVariant="general">
      <div className="calculators-hub-view">
        {/* Header Banner */}
        <div className="hub-banner glass-panel">
          <div className="banner-left">
            <span className="welcome-tag">Algorithmic Financial Calculators</span>
            <h1 className="welcome-name">Calculators Suite</h1>
            <p className="welcome-sub">
              Precision mathematical simulators to model compounding, compare debt tenures, evaluate term deposits, and reverse-engineer milestone savings targets.
            </p>
          </div>
          <div className="banner-right">
            <Link to="/action-plan" className="btn btn-secondary">
              <span>View Action Plan &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Calculators Grid */}
        <div className="calculators-grid">
          {CALCULATOR_ITEMS.map((calc) => (
            <Link key={calc.path} to={calc.path} className="calculator-card glass-panel glow-hover">
              <div className="calc-card-top">
                <div className="calc-card-icon">{calc.icon}</div>
                <span className={`badge ${calc.badgeColor}`}>{calc.badge}</span>
              </div>

              <div className="calc-card-body">
                <h3 className="calc-card-title">{calc.title}</h3>
                <span className="calc-card-sub">{calc.subtitle}</span>
                <p className="calc-card-desc">{calc.description}</p>
              </div>

              <div className="calc-card-footer">
                <span className="calc-launch-link">Launch Calculator &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CalculatorsHub;
