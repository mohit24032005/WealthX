import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand-link">
        <div className="brand-logo-pill">WX</div>
        <div className="logo-text">
          <span className="logo-title">WealthX</span>
          <span className="logo-sub">VisionX</span>
        </div>
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-highlight-btn">
              Command Center →
            </Link>
            <button type="button" className="nav-logout-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="nav-highlight-btn">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;