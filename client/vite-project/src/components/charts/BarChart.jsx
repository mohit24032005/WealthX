import React, { useState } from "react";
import "./Charts.css";

/**
 * Responsive Bar Chart for cashflow comparison (Income vs Outflows vs Surplus)
 * @param {Array} categories - e.g. ["Current Month", "3-Mo Average", "Projected"]
 * @param {Array} series - e.g. [{ name: "Inflow", color: "#10b981", values: [100000, 95000] }, ...]
 */
export const BarChart = ({
  categories = [],
  series = [],
  height = 220,
  valuePrefix = "₹",
  title = "",
}) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  const padding = { top: 20, right: 20, bottom: 35, left: 55 };
  const width = 600;

  const allValues = series.flatMap((s) => s.values.map(Number));
  const maxVal = Math.max(...allValues, 1000);
  const yMax = Math.ceil(maxVal * 1.15);

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const groupWidth = graphWidth / (categories.length || 1);
  const barWidth = Math.min(28, (groupWidth * 0.75) / (series.length || 1));

  const formatShortNumber = (num) => {
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num;
  };

  return (
    <div className="chart-container">
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>{title}</h4>
          <div style={{ display: "flex", gap: "12px" }}>
            {series.map((s, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: s.color }}></span>
                <span className="text-muted">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chart-svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          {/* Y Axis Grid Lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = padding.top + graphHeight - ratio * graphHeight;
            const val = Math.round(ratio * yMax);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(150, 150, 150, 0.18)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {valuePrefix}
                  {formatShortNumber(val)}
                </text>
              </g>
            );
          })}

          {/* Render Bars per category */}
          {categories.map((cat, catIdx) => {
            const groupX = padding.left + catIdx * groupWidth + groupWidth / 2;
            const totalBarsWidth = series.length * barWidth + (series.length - 1) * 4;
            const startX = groupX - totalBarsWidth / 2;

            return (
              <g key={catIdx}>
                {series.map((s, sIdx) => {
                  const val = Number(s.values[catIdx]) || 0;
                  const barH = (val / yMax) * graphHeight;
                  const x = startX + sIdx * (barWidth + 4);
                  const y = padding.top + graphHeight - barH;

                  return (
                    <rect
                      key={sIdx}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, barH)}
                      rx="3"
                      fill={s.color}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        filter:
                          hoveredBar?.catIdx === catIdx && hoveredBar?.sIdx === sIdx
                            ? "brightness(1.25) drop-shadow(0 0 6px rgba(255,255,255,0.3))"
                            : "none",
                      }}
                      onMouseEnter={() =>
                        setHoveredBar({
                          catIdx,
                          sIdx,
                          category: cat,
                          name: s.name,
                          value: val,
                          color: s.color,
                          x: x + barWidth / 2,
                          y,
                        })
                      }
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  );
                })}

                {/* X Category Label */}
                <text
                  x={groupX}
                  y={height - 10}
                  fill="var(--text-muted)"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {cat}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredBar && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoveredBar.x / width) * 100}%`,
              top: `${(hoveredBar.y / height) * 100}%`,
            }}
          >
            <div className="chart-tooltip-title">
              {hoveredBar.category} • {hoveredBar.name}
            </div>
            <div className="chart-tooltip-val" style={{ color: hoveredBar.color }}>
              {valuePrefix}
              {Number(hoveredBar.value).toLocaleString("en-IN")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarChart;
