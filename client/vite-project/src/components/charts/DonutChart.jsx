import React, { useState, useMemo } from "react";
import "./Charts.css";

/**
 * Responsive SVG Donut Chart with center total and interactive legend
 * @param {Array} data - e.g. [{ label: "Stocks", value: 150000, color: "#3b82f6" }, ...]
 * @param {String} centerLabel - Center text label (e.g. "Total Assets")
 * @param {String} centerValue - Formatted string or number
 */
export const DonutChart = ({
  data = [],
  centerLabel = "Total",
  centerValue = "",
  valuePrefix = "₹",
  size = 180,
  strokeWidth = 26,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const totalValue = useMemo(() => {
    return data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  }, [data]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment offsets
  const segments = useMemo(() => {
    if (totalValue === 0) return [];
    let accumulatedAngle = 0;

    return data.map((item, index) => {
      const pct = (Number(item.value) || 0) / totalValue;
      const strokeDasharray = `${pct * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += pct;

      return {
        ...item,
        percentage: Number((pct * 100).toFixed(1)),
        strokeDasharray,
        strokeDashoffset,
        index,
      };
    });
  }, [data, totalValue, circumference]);

  if (!data || data.length === 0 || totalValue === 0) {
    return (
      <div className="donut-chart-layout" style={{ justifyContent: "center", padding: "20px" }}>
        <span className="text-muted" style={{ fontSize: "13px" }}>No portfolio assets to display.</span>
      </div>
    );
  }

  const activeSegment = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="donut-chart-layout">
      {/* SVG Donut */}
      <div className="donut-svg-box" style={{ width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(150, 150, 150, 0.18)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color || "#06b6d4"}
              strokeWidth={hoveredIndex === i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                cursor: "pointer",
                transition: "stroke-width 0.2s ease, filter 0.2s ease",
                filter: hoveredIndex === i ? "brightness(1.2) drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="donut-center-metric">
          <span className="donut-center-label">
            {activeSegment ? activeSegment.label : centerLabel}
          </span>
          <span className="donut-center-val">
            {activeSegment
              ? `${activeSegment.percentage}%`
              : centerValue || `${valuePrefix}${totalValue.toLocaleString("en-IN")}`}
          </span>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`donut-legend-item ${hoveredIndex === i ? "active" : ""}`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="legend-left">
              <span className="legend-color-dot" style={{ background: seg.color }}></span>
              <span className="legend-label">{seg.label}</span>
            </div>
            <div className="legend-right">
              <span className="text-muted" style={{ fontSize: "12px" }}>
                {valuePrefix}{Number(seg.value).toLocaleString("en-IN")}
              </span>
              <span className="legend-pct" style={{ color: seg.color }}>
                {seg.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
