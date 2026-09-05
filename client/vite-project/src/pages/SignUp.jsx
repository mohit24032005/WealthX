import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

import "./Signup.css";

const validatePassword = (password) => {
  if (!password || password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password)) return "Password must contain at least 1 uppercase letter (A-Z)";
  if (!/[a-z]/.test(password)) return "Password must contain at least 1 lowercase letter (a-z)";
  if (!/[0-9]/.test(password)) return "Password must contain at least 1 number (0-9)";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return "Password must contain at least 1 special character (!@#$%^&*)";
  }
  return null;
};

function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMinLength = formData.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasLowercase = /[a-z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(formData.password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      await signup(formData.name, formData.email, formData.password);
      navigate("/login");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="signup-page">
        <div className="card">
          <h2>Create Account</h2>

          <form onSubmit={handleSubmit} autoComplete="off">
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="off"
              spellCheck={false}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="off"
              spellCheck={false}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              spellCheck={false}
              required
            />

            {/* Realtime Password Policy Checklist */}
            {formData.password.length > 0 && (
              <div className="password-checklist">
                <div className="checklist-title">Password must contain:</div>
                <div className="checklist-grid">
                  <div className={`checklist-item ${hasMinLength ? "valid" : "invalid"}`}>
                    <span className="chk-icon">{hasMinLength ? "✓" : "•"}</span>
                    <span>8+ Characters</span>
                  </div>
                  <div className={`checklist-item ${hasUppercase ? "valid" : "invalid"}`}>
                    <span className="chk-icon">{hasUppercase ? "✓" : "•"}</span>
                    <span>1 Uppercase (A-Z)</span>
                  </div>
                  <div className={`checklist-item ${hasLowercase ? "valid" : "invalid"}`}>
                    <span className="chk-icon">{hasLowercase ? "✓" : "•"}</span>
                    <span>1 Lowercase (a-z)</span>
                  </div>
                  <div className={`checklist-item ${hasNumber ? "valid" : "invalid"}`}>
                    <span className="chk-icon">{hasNumber ? "✓" : "•"}</span>
                    <span>1 Number (0-9)</span>
                  </div>
                  <div className={`checklist-item ${hasSpecial ? "valid" : "invalid"}`}>
                    <span className="chk-icon">{hasSpecial ? "✓" : "•"}</span>
                    <span>1 Special (!@#$)</span>
                  </div>
                </div>
              </div>
            )}

            {error ? <p style={{ color: "#fb7185", fontSize: "13px", marginTop: "4px", lineHeight: "1.4" }}>{error}</p> : null}

            <button type="submit" disabled={loading || (formData.password.length > 0 && !isPasswordValid)}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", marginTop: "10px" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--accent-cyan)", fontWeight: "700" }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Signup;