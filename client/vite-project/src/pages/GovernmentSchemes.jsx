import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "../components/layout/AppLayout";
import { LoadingState, ErrorState } from "../components/common/StateViews";
import api from "../utils/apiClient";
import "./GovernmentSchemes.css";

export const GovernmentSchemes = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/schemes");
      if (res && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || "Failed to load government schemes.");
      }
    } catch (err) {
      setError(err.message || "Government schemes directory offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Matching sovereign schemes with your profile and tax bracket..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState title="Schemes Finder Offline" message={error} onRetry={fetchSchemes} />
      </AppLayout>
    );
  }

  const schemes = data?.schemes || [];

  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.purpose.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "all") return true;
    if (activeFilter === "recommended") return s.isRecommended;
    if (activeFilter === "retirement") return s.category.toLowerCase().includes("retirement") || s.category.toLowerCase().includes("pension");
    if (activeFilter === "tax") return s.taxSection.toLowerCase().includes("80c") || s.taxStatus.toLowerCase().includes("eee");
    if (activeFilter === "gold") return s.id === "sgb";
    return true;
  });

  return (
    <AppLayout disclaimerVariant="general">
      <div className="schemes-view">
        {/* Header */}
        <div className="schemes-header">
          <div className="breadcrumb-pill">
            <span className="live-dot"></span>
            <span>SOVEREIGN WEALTH & WELFARE DISCOVERY</span>
          </div>
          <h1 className="schemes-title">Government Schemes Finder</h1>
          <p className="schemes-sub">
            Discover verified sovereign-backed small savings schemes, tax exemptions under Section 80C/80CCD, and long-term pension safety nets backed by the Government of India.
          </p>
        </div>

        {/* Filters & Search Row */}
        <div className="schemes-filters-card glass-panel">
          <div className="schemes-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search scheme name, ministry, or keyword (e.g. PPF, NPS, Sukanya, Gold)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="schemes-search-input"
            />
          </div>

          <div className="filter-pills-row">
            {[
              { id: "all", label: "All Schemes" },
              { id: "recommended", label: "⭐ Matched for You" },
              { id: "retirement", label: "Retirement & Pension" },
              { id: "tax", label: "Tax Saving (80C / EEE)" },
              { id: "gold", label: "Sovereign Gold" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-pill ${activeFilter === f.id ? "active" : ""}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schemes Grid */}
        <div className="schemes-grid">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className={`scheme-card glass-panel ${scheme.isRecommended ? "scheme-recommended glow-hover" : ""}`}
            >
              <div className="scheme-card-top">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <span className="scheme-category-badge">{scheme.category}</span>
                  {scheme.isRecommended && (
                    <span className="badge badge-green" style={{ fontSize: "10px" }}>
                      ⭐ High Fit
                    </span>
                  )}
                </div>
                <h3 className="scheme-name">{scheme.name}</h3>
                <span className="scheme-ministry">{scheme.ministry}</span>
              </div>

              <p className="scheme-purpose">{scheme.purpose}</p>

              {scheme.isRecommended && scheme.matchReason && (
                <div className="scheme-match-box">
                  <span className="font-bold text-teal">Profile Alignment:</span> {scheme.matchReason}
                </div>
              )}

              {/* Key Specs Grid */}
              <div className="scheme-specs-grid">
                <div className="spec-box">
                  <span className="spec-label">Yield / Return</span>
                  <span className="spec-val font-mono text-teal">{scheme.interestRate}</span>
                </div>
                <div className="spec-box">
                  <span className="spec-label">Tax Status</span>
                  <span className="spec-val font-mono text-cyan">{scheme.taxStatus}</span>
                </div>
                <div className="spec-box">
                  <span className="spec-label">Lock-in / Tenure</span>
                  <span className="spec-val">{scheme.tenure}</span>
                </div>
                <div className="spec-box">
                  <span className="spec-label">Deposit Bounds</span>
                  <span className="spec-val font-mono">{scheme.minDeposit}</span>
                </div>
              </div>

              {/* Eligibility & Official Link */}
              <div className="scheme-footer">
                <span className="scheme-eligibility">
                  <strong>Eligibility:</strong> {scheme.eligibility}
                </span>
                <a
                  href={scheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary scheme-link-btn"
                >
                  Official Ministry Portal &rarr;
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default GovernmentSchemes;
