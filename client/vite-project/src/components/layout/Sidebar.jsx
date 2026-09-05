import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, isAdmin } = useAuth();
  // True Accordion State: starts completely collapsed (null). Exactly 0 or 1 section open.
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (sectionKey) => {
    setActiveSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const navSections = [
    {
      key: "ai_finance",
      title: "AI Revenue & Finance",
      items: [
        { label: "AI Revenue Recovery", path: "/revenue-recovery", icon: "⚡", badge: "Track 03" },
        { label: "AI Finance Controller", path: "/finance-controller", icon: "⚖️", badge: "Track 04" },
        { label: "Recovery Audit Trail", path: "/recovery-audit", icon: "📜" },
        { label: "Strategy Simulator", path: "/recovery-simulator", icon: "🎯" },
      ],
    },
    {
      key: "understand",
      title: "Understand",
      items: [
        { label: "Financial X-Ray", path: "/financial-xray", icon: "🔬" },
        { label: "Wealth Vault", path: "/wealth-vault", icon: "🏦" },
        { label: "Goals", path: "/goals", icon: "🎯" },
        { label: "Action Plan", path: "/action-plan", icon: "📋" },
        { label: "Your Risk DNA", path: "/risk-dna", icon: "🧬" },
      ],
    },
    {
      key: "decide",
      title: "Decide Smarter",
      items: [
        { label: "AI Decision Lab", path: "/ai-decision-lab", icon: "🤖", badge: "AI" },
        { label: "My Next ₹10,000", path: "/my-next-money", icon: "💡" },
        { label: "Future You Simulator", path: "/future-you", icon: "⏳" },
        { label: "Hype Check", path: "/hype-check", icon: "🛡️" },
      ],
    },
    {
      key: "invest",
      title: "Invest & Save",
      items: [
        { label: "Investment Hub", path: "/investments", icon: "📈" },
        { label: "Stocks Explorer", path: "/investments/stocks", icon: "⚡" },
        { label: "SIP & Mutual Funds", path: "/investments/sip", icon: "🌱" },
        { label: "Digital Gold", path: "/investments/gold", icon: "🥇" },
        { label: "Fixed Deposits", path: "/investments/fd", icon: "📜" },
        { label: "Govt Bonds", path: "/investments/bonds", icon: "🏛️" },
        { label: "Index & ETFs", path: "/investments/etfs", icon: "🌐" },
      ],
    },
    {
      key: "calculators",
      title: "Plan & Calculate",
      items: [
        { label: "Calculators Suite", path: "/calculators", icon: "🧮", badge: "5 Tools" },
      ],
    },
    {
      key: "loans",
      title: "Loans & Debt",
      items: [
        { label: "Loans Overview", path: "/loans", icon: "📄" },
        { label: "Loan Finder", path: "/loans/finder", icon: "🔎" },
        { label: "Compare Loans", path: "/loans/compare", icon: "⚖️" },
      ],
    },
    {
      key: "discover",
      title: "Discover",
      items: [
        { label: "Government Schemes", path: "/schemes", icon: "🏛️" },
        { label: "Investor Quest", path: "/investor-quest", icon: "🎮", badge: "Game" },
      ],
    },
    {
      key: "system",
      title: "System",
      items: [
        { label: "Audit & History", path: "/history", icon: "🕘" },
        { label: "Settings & Profile", path: "/settings", icon: "⚙️" },
        ...(isAdmin
          ? [{ label: "Admin Portal", path: "/admin", icon: "👑", badge: "Admin" }]
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}

      <aside className={`app-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">WX</div>
            <div className="brand-text">
              <span className="brand-title">WealthX</span>
              <span className="brand-subtitle">by VisionX</span>
            </div>
          </div>
          {isMobileOpen && (
            <button type="button" className="mobile-close-btn" onClick={onCloseMobile} aria-label="Close sidebar">
              ✕
            </button>
          )}
        </div>

        <div className="sidebar-nav-container">
          {/* STANDALONE COMMAND CENTER (Always Visible) */}
          <div className="nav-standalone-group">
            <span className="nav-group-caption">COMMAND CENTER</span>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={onCloseMobile}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Dashboard</span>
              <span className="nav-live-dot" title="Live Sync"></span>
            </NavLink>
          </div>

          {/* ACCORDION CATEGORIES (Starts fully collapsed, only 1 open at a time) */}
          <div className="nav-accordion-container">
            {navSections.map((section) => {
              const isOpen = activeSection === section.key;

              return (
                <div key={section.key} className={`nav-accordion-section ${isOpen ? "section-open" : ""}`}>
                  <button
                    type="button"
                    className={`nav-accordion-header ${isOpen ? "active-header" : ""}`}
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={isOpen}
                    aria-controls={`section-menu-${section.key}`}
                  >
                    <span className="header-title-text">{section.title}</span>
                    <span className={`header-chevron ${isOpen ? "chevron-open" : ""}`}>›</span>
                  </button>

                  {isOpen && (
                    <div id={`section-menu-${section.key}`} className="nav-items-list">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === "/investments" || item.path === "/loans"}
                          className={({ isActive }) => `nav-link nav-child-link ${isActive ? "active" : ""}`}
                          onClick={onCloseMobile}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          <span className="nav-label">{item.label}</span>
                          {item.badge && (
                            <span className="nav-badge nav-badge-cyan">{item.badge}</span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* User Mini Card Footer */}
        <div className="sidebar-footer">
          <div className="user-mini-card">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || "Client User"}</span>
              <span className="user-role">{isAdmin ? "Administrator" : "Verified Account"}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
