import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Sidebar from "./Sidebar";
import Disclaimer from "../common/Disclaimer";
import "./AppLayout.css";

export const AppLayout = ({ children, disclaimerVariant = "general" }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Generate breadcrumb from path
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const pageTitle = pathSegments.length > 0
    ? pathSegments[pathSegments.length - 1].replace(/-/g, " ").toUpperCase()
    : "COMMAND CENTER";

  return (
    <div className="app-shell">
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="app-main-wrapper">
        {/* Top Header */}
        <header className="app-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-hamburger"
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>
            <div className="breadcrumb-box">
              <span className="breadcrumb-root">WealthX</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{pageTitle}</span>
            </div>
          </div>

          <div className="header-right">
            <a
              href="https://www.nseindia.com/market-data/live-equity-market?utm_source=chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="market-ticker-pill"
              title="Open Official NSE India Live Equity Market Feed"
            >
              <span className="ticker-pulse"></span>
              <span className="ticker-text">NSE Live Market ↗</span>
            </a>

            <Link
              to="/ai-decision-lab"
              className="ask-ai-header-btn"
              title="Ask AI in WealthX Decision Lab"
            >
              <span className="ask-ai-icon">🤖</span>
              <span className="ask-ai-text">Ask AI</span>
            </Link>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Dark/Light Theme"
            >
              <span className="theme-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>

            <div className="user-profile-menu">
              <button
                type="button"
                className="user-badge-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="user-initials">
                  {user?.name ? user.name[0].toUpperCase() : "W"}
                </div>
                <span className="user-display-name">{user?.name || "Account"}</span>
                <span className="dropdown-caret">▾</span>
              </button>

              {userDropdownOpen && (
                <div
                  className="dropdown-menu glass-panel"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user?.name}</p>
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/settings" className="dropdown-item">
                    ⚙️ Settings & Profile
                  </Link>
                  <Link to="/history" className="dropdown-item">
                    📜 Audit History
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button
                    type="button"
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="app-content-body">
          {children}

          <Disclaimer variant={disclaimerVariant} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
