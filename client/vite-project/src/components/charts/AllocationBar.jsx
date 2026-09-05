import React from "react";
import "./Charts.css";

/**
 * Multi-segment horizontal allocation bar with cards
 * @param {Array} slices - e.g. [{ label: "Emergency Reserve", amount: 6000, percentage: 60, color: "#10b981", rationale: "..." }, ...]
 * @param {Number} total - e.g. 10000
 */
export const AllocationBar = ({
  slices = [],
  total = 10000,
  valuePrefix = "₹",
  showCards = true,
}) => {
  if (!slices || slices.length === 0) return null;

  return (
    <div className="allocation-bar-wrap">
      {/* Visual Segment Track */}
      <div className="allocation-track">
        {slices.map((slice, i) => (
          <div
            key={i}
            className="allocation-slice"
            style={{
              width: `${slice.percentage}%`,
              background: slice.color || "#3b82f6",
            }}
            title={`${slice.label}: ${valuePrefix}${Number(slice.amount).toLocaleString("en-IN")} (${slice.percentage}%)`}
          />
        ))}
      </div>

      {/* Breakdown Cards */}
      {showCards && (
        <div className="allocation-legend-grid">
          {slices.map((slice, i) => (
            <div key={i} className="allocation-legend-card">
              <div className="allocation-legend-title">
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: slice.color, display: "inline-block" }}></span>
                <span>{slice.label}</span>
              </div>
              <div className="allocation-legend-val" style={{ color: slice.color }}>
                {valuePrefix}{Number(slice.amount).toLocaleString("en-IN")}{" "}
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                  ({slice.percentage}%)
                </span>
              </div>
              {slice.rationale && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4", marginTop: "2px" }}>
                  {slice.rationale}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllocationBar;
