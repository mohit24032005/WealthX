import { useState } from "react";
import Navbar from "../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Disclaimer from "../components/common/Disclaimer";
import background from "../assets/images/Gemini_Generated_Image_e60xnhe60xnhe60x.png";
import "./Home.css";

const FEATURE_PILLARS = [
  {
    id: "xray",
    title: "Financial X-Ray",
    icon: "🔬",
    desc: "Calculate emergency runway, debt burden (DTI), and financial resilience.",
    route: "/financial-xray",
    badge: "Diagnostic",
  },
  {
    id: "risk",
    title: "Your Risk DNA",
    icon: "🧬",
    desc: "Personalized risk profiling evaluating Goals, Horizon, Capacity & Tolerance.",
    route: "/risk-dna",
    badge: "Risk Profiling",
  },
  {
    id: "vault",
    title: "Wealth Vault",
    icon: "🏦",
    desc: "Unified tracking for Indian Stocks, Mutual Funds, SIPs, Gold, and FDs.",
    route: "/wealth-vault",
    badge: "Portfolio",
  },
  {
    id: "decision",
    title: "AI Decision Lab",
    icon: "🤖",
    desc: "Simulate financial trade-offs with structured risk analysis & guardrails.",
    route: "/decision-lab",
    badge: "AI Powered",
  },
  {
    id: "game",
    title: "Gamified Learning",
    icon: "🎮",
    desc: "Learn. Decide. Invest. Grow. Risk-free simulation with AI Mentor.",
    route: "/investor-quest",
    badge: "Investor Quest",
  },
  {
    id: "schemes",
    title: "Govt Schemes",
    icon: "🏛️",
    desc: "Instant eligibility discovery across central & state welfare policies.",
    route: "/schemes",
    badge: "Welfare",
  },
];

function Home() {
  const { isAuthenticated, isOnboarded } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState(null);

  const handlePillarClick = (pillar) => {
    if (isAuthenticated) {
      navigate(isOnboarded ? pillar.route : "/onboarding");
    } else {
      setSelectedPillar(pillar);
      setShowAuthModal(true);
    }
  };

  return (
    <div
      className="home"
      style={{
        backgroundImage: `url(${background})`,
        backgroundColor: "#070b14",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <Navbar />

      <div className="overlay" style={{ pointerEvents: "none" }}></div>

      <div className="hero-wealthx" style={{ position: "relative", zIndex: 2 }}>
        <div className="hero-badge">
          <span>🚀 VisionX Intelligence Platform</span>
        </div>

        <h1 className="hero-title">
          Intelligence for Every <br />
          <span className="hero-gradient-text">Financial Decision</span>
        </h1>

        <p className="hero-subtitle">
          Diagnose where you stand with <strong>Financial X-Ray</strong>, decode your <strong>Risk DNA</strong>, track where your money compounds in <strong>Wealth Vault</strong>, and simulate your next moves with the <strong>AI Decision Lab</strong>.
        </p>

        <div className="hero-buttons">
          {isAuthenticated ? (
            <Link to={isOnboarded ? "/dashboard" : "/onboarding"} className="btn-hero-primary">
              Enter Command Center →
            </Link>
          ) : (
            <>
              <Link to="/signup" className="btn-hero-primary">
                Get Started Free →
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="hero-pillars-grid">
          {FEATURE_PILLARS.map((pillar) => (
            <div
              key={pillar.id}
              className="pillar-card glass-panel interactive-pillar-card"
              onClick={() => handlePillarClick(pillar)}
              role="button"
              tabIndex={0}
            >
              <div className="pillar-header-row">
                <span className="pillar-icon">{pillar.icon}</span>
                <span className="pillar-badge">{pillar.badge}</span>
              </div>
              <h3>{pillar.title}</h3>
              <p>{pillar.desc}</p>
              <span className="pillar-explore-hint">Click to explore →</span>
            </div>
          ))}
        </div>

        <div style={{ maxWidth: "800px", margin: "40px auto 0" }}>
          <Disclaimer variant="general" />
        </div>
      </div>

      {/* Sign In To Explore Modal */}
      {showAuthModal && selectedPillar && (
        <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="home-auth-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="home-modal-header">
              <div className="home-modal-badge">
                <span>🔒 MEMBER ACCESS ONLY</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAuthModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="home-modal-content">
              <span className="home-modal-icon">{selectedPillar.icon}</span>
              <h3 className="home-modal-title">Sign in to explore {selectedPillar.title}</h3>
              <p className="home-modal-desc">
                {selectedPillar.desc}
              </p>
              <p className="home-modal-sub">
                Sign in or create your free account to access institutional-grade financial diagnostics, real-time tracking, risk DNA calibration, and interactive AI simulators.
              </p>
            </div>

            <div className="home-modal-actions">
              <Link
                to="/login"
                className="btn btn-primary btn-modal-auth"
                onClick={() => setShowAuthModal(false)}
              >
                Sign In to Explore →
              </Link>
              <Link
                to="/signup"
                className="btn btn-secondary btn-modal-auth"
                onClick={() => setShowAuthModal(false)}
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;