import React, { useState, useMemo, useRef } from "react";
import "./Charts.css";

/**
 * Responsive SVG Line Chart supporting smooth bezier curves, glow gradients, interactive crosshairs & dual series.
 * @param {Array} data - Array of objects with x (label/date) and y (number)
 * @param {Array} secondaryData - Optional second series (e.g. baseline or comparison)
 * @param {String} color - Primary line hex or color token (default: #06b6d4)
 * @param {String} secondaryColor - Secondary line color
 * @param {String} valuePrefix - e.g. "₹"
 * @param {Number} height - Chart height in px (default: 220)
 * @param {Boolean} showArea - Whether to render gradient area under curve
 */
export const LineChart = ({
  data = [],
  secondaryData = null,
  color = "#06b6d4",
  secondaryColor = "#64748b",
  valuePrefix = "₹",
  height = 220,
  showArea = true,
  title = "",
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);

  const padding = { top: 20, right: 20, bottom: 35, left: 55 };
  const width = 600; // SVG viewBox coordinate width

  const { points, secondaryPoints, yMin, yMax, yTicks, xLabels } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], secondaryPoints: [], yMin: 0, yMax: 100, yTicks: [], xLabels: [] };
    }

    const allValues = [...data.map((d) => Number(d.y) || 0)];
    if (secondaryData && secondaryData.length > 0) {
      allValues.push(...secondaryData.map((d) => Number(d.y) || 0));
    }

    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);

    if (minVal === maxVal) {
      minVal = Math.max(0, minVal - 1000);
      maxVal = maxVal + 1000;
    }

    // Add 10% buffer
    const range = maxVal - minVal;
    const yMin = Math.max(0, Math.floor(minVal - range * 0.05));
    const yMax = Math.ceil(maxVal + range * 0.05);

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    const computePoints = (dataset) => {
      if (!dataset || dataset.length === 0) return [];
      return dataset.map((d, i) => {
        const x = padding.left + (i / (dataset.length - 1 || 1)) * graphWidth;
        const normalizedY = (d.y - yMin) / (yMax - yMin || 1);
        const y = padding.top + graphHeight - normalizedY * graphHeight;
        return { x, y, rawX: d.x, rawY: d.y };
      });
    };

    const points = computePoints(data);
    const secondaryPoints = secondaryData ? computePoints(secondaryData) : [];

    // 4 Y-Axis ticks
    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount }).map((_, i) => {
      const val = yMin + (i / (tickCount - 1)) * (yMax - yMin);
      const y = padding.top + graphHeight - (i / (tickCount - 1)) * graphHeight;
      return { val: Math.round(val), y };
    });

    const xLabels = data.map((d, i) => ({
      label: d.x,
      x: padding.left + (i / (data.length - 1 || 1)) * graphWidth,
    }));

    return { points, secondaryPoints, yMin, yMax, yTicks, xLabels };
  }, [data, secondaryData, height]);

  // Construct smooth cubic bezier SVG path
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

  const linePath = useMemo(() => createSmoothPath(points), [points]);
  const secondaryPath = useMemo(() => createSmoothPath(secondaryPoints), [secondaryPoints]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const first = points[0];
    const last = points[points.length - 1];
    const bottomY = height - padding.bottom;
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, points, height]);

  const formatShortNumber = (num) => {
    if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toLocaleString("en-IN");
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    // Find nearest point
    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((pt, index) => {
      const dist = Math.abs(pt.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  if (!data || data.length === 0) {
    return (
      <div className="chart-container" style={{ height: `${height}px`, justifyContent: "center", alignItems: "center" }}>
        <span className="text-muted" style={{ fontSize: "13px" }}>Insufficient historical points to plot trend.</span>
      </div>
    );
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;
  const activeSecondaryPoint = hoverIndex !== null && secondaryPoints.length > 0 ? secondaryPoints[hoverIndex] : null;

  return (
    <div className="chart-container" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {title && <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>{title}</h4>}
      <div className="chart-svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          <defs>
            <linearGradient id={`area-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="rgba(150, 150, 150, 0.18)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 4}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {valuePrefix}
                {formatShortNumber(tick.val)}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {xLabels.map((lbl, i) => {
            // Show every Nth label to prevent clutter on mobile
            if (data.length > 8 && i % 2 !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={lbl.x}
                y={height - 10}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {lbl.label}
              </text>
            );
          })}

          {/* Area Fill */}
          {showArea && <path d={areaPath} fill={`url(#area-grad-${color.replace("#", "")})`} />}

          {/* Secondary Line */}
          {secondaryPath && (
            <path
              d={secondaryPath}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* Primary Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Crosshair and Dot */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={height - padding.bottom}
                stroke="rgba(255, 255, 255, 0.2)"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill={color}
                stroke="#ffffff"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))" }}
              />
              {activeSecondaryPoint && (
                <circle
                  cx={activeSecondaryPoint.x}
                  cy={activeSecondaryPoint.y}
                  r="4"
                  fill={secondaryColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip HTML */}
        {activePoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="chart-tooltip-title">{activePoint.rawX}</div>
            <div className="chart-tooltip-val" style={{ color }}>
              {valuePrefix}
              {Number(activePoint.rawY).toLocaleString("en-IN")}
            </div>
            {activeSecondaryPoint && (
              <div className="chart-tooltip-val" style={{ color: secondaryColor, fontSize: "11px", marginTop: "2px" }}>
                Baseline: {valuePrefix}
                {Number(activeSecondaryPoint.rawY).toLocaleString("en-IN")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LineChart;
