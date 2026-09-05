import React, { useState } from "react";
import "./Disclaimer.css";

export const Disclaimer = ({ variant = "general" }) => {
  const [collapsed, setCollapsed] = useState(false);

  const getDisclaimerText = () => {
    switch (variant) {
      case "investment":
        return "WealthX is an educational intelligence and simulation platform. Calculations, projections, and market simulations do not constitute SEBI-registered investment advice. Past performance is not indicative of future returns. Please consult a SEBI-registered financial advisor before making actual investments.";
      case "loans":
        return "Loan EMI estimates, interest calculations, and repayment schedules are illustrative based on standard formulas. Actual terms, processing charges, and interest rates are determined solely by lending institutions subject to credit approval.";
      case "ai":
        return "WealthX AI Decision Lab provides structured algorithmic scenario analysis based on your self-reported financial profile. AI outputs are experimental educational simulations, not customized financial or legal advice.";
      case "schemes":
        return "Government scheme criteria, benefits, and guidelines are sourced from public official portals. Policies are subject to periodic government updates. Users should verify details directly at official government websites before applying.";
      default:
        return "WealthX (VisionX) is a personal financial intelligence and educational simulator. We are not an RBI or SEBI registered entity. Projections are illustrative and do not guarantee financial returns.";
    }
  };

  if (collapsed) {
    return (
      <div className="disclaimer-mini" onClick={() => setCollapsed(false)}>
        <span>⚖️ Educational Disclaimer (Click to expand)</span>
      </div>
    );
  }

  return (
    <div className="disclaimer-banner glass-panel">
      <div className="disclaimer-content">
        <span className="disclaimer-icon">⚖️</span>
        <div className="disclaimer-body">
          <strong>FINANCIAL INTELLIGENCE & STATUTORY DISCLAIMER:</strong> {getDisclaimerText()}
        </div>
      </div>
      <button
        type="button"
        className="disclaimer-close-btn"
        title="Minimize disclaimer"
        onClick={() => setCollapsed(true)}
      >
        ✕
      </button>
    </div>
  );
};

export default Disclaimer;
