import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../utils/apiClient";

const AuthContext = createContext(null);

// 10 Minutes Inactivity Timeout (600,000 ms)
export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
export const WARNING_THRESHOLD_MS = 9 * 60 * 1000; // 9 minutes (1 min warning)
const ACTIVITY_STORAGE_KEY = "wealthx_last_activity";
const TIMEOUT_MSG_KEY = "session_timeout_msg";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastRecordedTimeRef = useRef(Date.now());

  // Record user activity across tabs
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle writing to localStorage to once every 5 seconds for optimal performance
    if (now - lastRecordedTimeRef.current > 5000) {
      lastRecordedTimeRef.current = now;
      localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    }
  }, [showInactivityWarning]);

  const fetchCurrentUser = useCallback(async () => {
    const activeToken = localStorage.getItem("token");
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/api/auth/me");
      if (response && response.data) {
        setUser(response.data);
      }
    } catch (err) {
      console.warn("Failed to fetch authenticated user session:", err.message);
      if (err.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Handle Inactivity Timer (10 Minutes)
  useEffect(() => {
    if (!token) {
      setShowInactivityWarning(false);
      return;
    }

    // Set initial activity timestamp if not present
    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY)) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleUserInteraction = () => {
      recordActivity();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Check inactivity every 5 seconds
    const interval = setInterval(() => {
      const storedLastActivity = parseInt(
        localStorage.getItem(ACTIVITY_STORAGE_KEY) || Date.now().toString(),
        10
      );
      const elapsed = Date.now() - storedLastActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Log out immediately due to 10 min inactivity
        localStorage.removeItem("token");
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
        sessionStorage.setItem(
          TIMEOUT_MSG_KEY,
          "Your session expired after 10 minutes of inactivity for your security. Please log in again."
        );
        setToken(null);
        setUser(null);
        setShowInactivityWarning(false);

        // Redirect to login if on private route
        const publicPaths = ["/login", "/signup", "/forgot-password", "/"];
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = "/login";
        }
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        // Show 1-minute warning banner / modal
        setShowInactivityWarning(true);
        const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        setShowInactivityWarning(false);
      }
    }, 5000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      clearInterval(interval);
    };
  }, [token, recordActivity]);

  const login = async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
      setToken(data.token);
      setUser(data.user);
      setShowInactivityWarning(false);
      return data;
    }
    throw new Error(data.message || "Login failed");
  };

  const signup = async (name, email, password) => {
    return await api.post("/api/auth/signup", { name, email, password });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setShowInactivityWarning(false);
  };

  const resetInactivityTimer = () => {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
    lastRecordedTimeRef.current = Date.now();
    setShowInactivityWarning(false);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isOnboarded: Boolean(user?.isOnboarded),
    isAdmin: user?.role === "admin",
    loading,
    login,
    signup,
    logout,
    resetInactivityTimer,
    showInactivityWarning,
    secondsRemaining,
    refreshUser: fetchCurrentUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* 10-Minute Inactivity Warning Banner */}
      {showInactivityWarning && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(245, 158, 11, 0.6)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#f8fafc",
            maxWidth: "420px",
            animation: "slideInUp 0.3s ease",
          }}
        >
          <span style={{ fontSize: "24px" }}>⏰</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "800", fontSize: "13.5px", color: "#fbbf24", marginBottom: "2px" }}>
              Session Inactivity Alert
            </div>
            <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.4" }}>
              Your session will expire in <strong>{secondsRemaining}s</strong> due to 10 minutes of inactivity.
            </div>
          </div>
          <button
            type="button"
            onClick={resetInactivityTimer}
            style={{
              padding: "7px 14px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
            }}
          >
            Stay Signed In
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
