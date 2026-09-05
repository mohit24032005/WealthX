import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

import "./Login.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [resetData, setResetData] = useState({ email: "", otp: "", password: "" });
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const hasMinLength = resetData.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(resetData.password);
  const hasLowercase = /[a-z]/.test(resetData.password);
  const hasNumber = /[0-9]/.test(resetData.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(resetData.password);
  const isResetPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  useEffect(() => {
    const sessionTimeoutMsg = sessionStorage.getItem("session_timeout_msg");
    if (sessionTimeoutMsg) {
      setError(sessionTimeoutMsg);
      sessionStorage.removeItem("session_timeout_msg");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const fieldName = name === "loginEmail" ? "email" : name === "loginPassword" ? "password" : name;
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    const fieldName =
      name === "resetEmail" || name === "verifyEmail" || name === "resetEmailFinal"
        ? "email"
        : name;
    setResetData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(formData.email, formData.password);
      if (data.user && data.user.isOnboarded) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setOtpVerified(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP");
      }

      setMessage(data.message || "OTP sent to your email. Please check your inbox.");
      if (data.sandboxOtp) {
        setResetData((prev) => ({ ...prev, otp: data.sandboxOtp }));
      } else {
        setResetData((prev) => ({ ...prev, otp: "" }));
      }
      setMode("verify");
    } catch (err) {
      setError(err.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetData.email,
          otp: resetData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      setOtpVerified(true);
      setMessage(data.message || "OTP verified");
      setMode("reset");
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const passwordError = validatePassword(resetData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetData.email,
          otp: resetData.otp,
          password: resetData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed");
      }

      setMessage(data.message || "Password updated successfully");
      setMode("login");
      setFormData({ email: resetData.email, password: "" });
      setResetData({ email: "", otp: "", password: "" });
      setOtpVerified(false);
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="login-page">
        <div className="card">
          {mode === "login" ? (
            <>
              <h2>Login</h2>

              <form onSubmit={handleSubmit} autoComplete="off">
                <input
                  type="email"
                  name="loginEmail"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />

                <input
                  type="password"
                  name="loginPassword"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  spellCheck={false}
                  required
                />

                <button type="button" className="link-button" onClick={() => setMode("forgot")}>
                  Forgot Password?
                </button>

                {error ? <p className="status error">{error}</p> : null}
                {message ? <p className="status success">{message}</p> : null}

                <button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </>
          ) : null}

          {mode === "forgot" ? (
            <>
              <h2>Forgot Password</h2>

              <form onSubmit={handleForgotPassword} autoComplete="off">
                <input
                  type="email"
                  name="resetEmail"
                  placeholder="Enter your email"
                  value={resetData.email}
                  onChange={handleResetChange}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />

                {error ? <p className="status error">{error}</p> : null}
                {message ? <p className="status success">{message}</p> : null}

                <button type="submit" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>

                <button type="button" className="link-button" onClick={() => setMode("login")}>
                  Back to Login
                </button>
              </form>
            </>
          ) : null}

          {mode === "verify" ? (
            <>
              <h2>Verify OTP</h2>

              <form onSubmit={handleVerifyOtp} autoComplete="off">
                <input
                  type="email"
                  name="verifyEmail"
                  placeholder="Email"
                  value={resetData.email}
                  onChange={handleResetChange}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />

                <input
                  type="text"
                  name="otp"
                  placeholder="Enter 6-digit OTP"
                  value={resetData.otp}
                  onChange={handleResetChange}
                  autoComplete="off"
                  inputMode="numeric"
                  required
                />

                {error ? <p className="status error">{error}</p> : null}
                {message ? <p className="status success">{message}</p> : null}

                <button type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>

                <button type="button" className="link-button" onClick={() => setMode("forgot")}>
                  Change Email
                </button>
              </form>
            </>
          ) : null}

          {mode === "reset" ? (
            <>
              <h2>Reset Password</h2>

              <form onSubmit={handleResetPassword} autoComplete="off">
                <input
                  type="email"
                  name="resetEmailFinal"
                  placeholder="Email"
                  value={resetData.email}
                  onChange={handleResetChange}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />

                <input
                  type="text"
                  name="otp"
                  placeholder="OTP"
                  value={resetData.otp}
                  onChange={handleResetChange}
                  autoComplete="off"
                  inputMode="numeric"
                  required
                />

                <input
                  type="password"
                  name="password"
                  placeholder="New Password"
                  value={resetData.password}
                  onChange={handleResetChange}
                  autoComplete="new-password"
                  spellCheck={false}
                  required
                />

                {/* Realtime Password Policy Checklist for Reset Mode */}
                {resetData.password.length > 0 && (
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

                {error ? <p className="status error">{error}</p> : null}
                {message ? <p className="status success">{message}</p> : null}

                <button type="submit" disabled={loading || !otpVerified || (resetData.password.length > 0 && !isResetPasswordValid)}>
                  {loading ? "Updating..." : "Reset Password"}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default Login;