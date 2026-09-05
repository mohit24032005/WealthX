import React, { useState, useMemo, useRef } from "react";
import "./Charts.css";

/**
 * Dual Trajectory Comparison Chart for Future You Simulation
 * @param {Array} currentPath - [{ year: 5, value: 500000 }, ...]
 * @param {Array} optimizedPath - [{ year: 5, value: 1200000 }, ...]
 */
export const ComparisonAreaChart = ({
  currentPath = [],
  optimizedPath = [],
  height = 260,
  valuePrefix = "₹",
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);

  const padding = { top: 20, right: 30, bottom: 35, left: 60 };
  const width = 650;

  const { pointsCurrent, pointsOpt, yMax, yTicks, xLabels } = useMemo(() => {
    if (!optimizedPath || optimizedPath.length === 0) {
      return { pointsCurrent: [], pointsOpt: [], yMax: 100, yTicks: [], xLabels: [] };
    }

    const allValues = [
      ...currentPath.map((d) => Number(d.value) || 0),
      ...optimizedPath.map((d) => Number(d.value) || 0),
    ];
    const maxVal = Math.max(...allValues, 1000);
    const yMax = Math.ceil(maxVal * 1.1);

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const computePoints = (data) => {
      return data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * graphWidth;
        const normalizedY = (d.value || 0) / yMax;
        const y = padding.top + graphHeight - normalizedY * graphHeight;
        return { x, y, year: d.year, rawVal: d.value };
      });
    };

    const pointsCurrent = computePoints(currentPath);
    const pointsOpt = computePoints(optimizedPath);

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount }).map((_, i) => {
      const val = (i / (tickCount - 1)) * yMax;
      const y = padding.top + graphHeight - (i / (tickCount - 1)) * graphHeight;
      return { val: Math.round(val), y };
    });

    const xLabels = optimizedPath.map((d, i) => ({
      label: `${d.year}Y`,
      x: padding.left + (i / (optimizedPath.length - 1 || 1)) * graphWidth,
    }));

    return { pointsCurrent, pointsOpt, yMax, yTicks, xLabels };
  }, [currentPath, optimizedPath, height]);

  const createSmoothPath = (pts) => {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpx1 = curr.x + (next.x - curr.x) / 2;
      const cpy1 = curr.y;
      const cpx2 = curr.x + (next.x - curr.x) / 2;
      const cpy2 = next.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const pathCurrent = useMemo(() => createSmoothPath(pointsCurrent), [pointsCurrent]);
  const pathOpt = useMemo(() => createSmoothPath(pointsOpt), [pointsOpt]);

  const areaOpt = useMemo(() => {
    if (pointsOpt.length < 2) return "";
    const first = pointsOpt[0];
    const last = pointsOpt[pointsOpt.length - 1];
    const bottomY = height - padding.bottom;
    return `${pathOpt} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [pathOpt, pointsOpt, height]);

  const formatShortNumber = (num) => {
    if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num;
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current || pointsOpt.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    let closest = 0;
    let minD = Infinity;
    pointsOpt.forEach((pt, i) => {
      const d = Math.abs(pt.x - svgX);
      if (d < minD) {
        minD = d;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  const activeOpt = hoverIndex !== null ? pointsOpt[hoverIndex] : null;
  const activeCurr = hoverIndex !== null && pointsCurrent.length > hoverIndex ? pointsCurrent[hoverIndex] : null;
  const diffVal = activeOpt && activeCurr ? activeOpt.rawVal - activeCurr.rawVal : 0;

  return (
    <div
      className="chart-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>
          📈 Wealth Trajectory: Baseline vs. Optimized
        </h4>
        <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "3px", background: "#64748b", borderRadius: "2px" }}></span>
            <span className="text-muted">Current Path</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "3px", background: "#10b981", borderRadius: "2px" }}></span>
            <span className="text-teal font-bold">WealthX Optimized</span>
          </div>
        </div>
      </div>

      <div className="chart-svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          <defs>
            <linearGradient id="optAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={t.y}
                x2={width - padding.right}
                y2={t.y}
                stroke="rgba(150, 150, 150, 0.18)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={t.y + 4}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {valuePrefix}
                {formatShortNumber(t.val)}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {xLabels.map((lbl, i) => (
            <text
              key={i}
              x={lbl.x}
              y={height - 10}
              fill="var(--text-muted)"
              fontSize="11"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {lbl.label}
            </text>
          ))}

          {/* Optimized Area */}
          <path d={areaOpt} fill="url(#optAreaGrad)" />

          {/* Current Path Line */}
          <path
            d={pathCurrent}
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          {/* Optimized Path Line */}
          <path
            d={pathOpt}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshairs & Dots */}
          {activeOpt && (
            <g>
              <line
                x1={activeOpt.x}
                y1={padding.top}
                x2={activeOpt.x}
                y2={height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeDasharray="3 3"
              />
              <circle
                cx={activeOpt.x}
                cy={activeOpt.y}
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {activeCurr && (
                <circle
                  cx={activeCurr.x}
                  cy={activeCurr.y}
                  r="4"
                  fill="#64748b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {activeOpt && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(activeOpt.x / width) * 100}%`,
              top: `${(activeOpt.y / height) * 100}%`,
            }}
          >
            <div className="chart-tooltip-title">Horizon: {activeOpt.year} Years</div>
            <div className="chart-tooltip-val text-teal">
              Optimized: {valuePrefix}
              {Number(activeOpt.rawVal).toLocaleString("en-IN")}
            </div>
            {activeCurr && (
              <div className="chart-tooltip-val text-muted" style={{ fontSize: "11px" }}>
                Current: {valuePrefix}
                {Number(activeCurr.rawVal).toLocaleString("en-IN")}
              </div>
            )}
            {diffVal > 0 && (
              <div className="badge badge-green" style={{ fontSize: "10px", marginTop: "4px", padding: "2px 6px" }}>
                +₹{formatShortNumber(diffVal)} Extra Wealth
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonAreaChart;
