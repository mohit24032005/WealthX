import React from "react";
import "./Charts.css";

/**
 * Circular Glowing Progress Meter for Health Score & Goal Milestones
 */
export const ProgressRing = ({
  score = 0,
  max = 100,
  size = 90,
  strokeWidth = 7,
  color = "#10b981",
  label = "",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(max, Math.max(0, Number(score) || 0));
  const progressOffset = circumference - (safeScore / max) * circumference;

  return (
    <div className="progress-ring-wrap" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(150, 150, 150, 0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      <div className="progress-ring-text">
        <span style={{ fontSize: `${Math.round(size * 0.26)}px`, fontWeight: 800, fontFamily: "var(--font-mono)", color }}>
          {safeScore}
        </span>
        {label && <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", marginTop: "-2px" }}>{label}</span>}
      </div>
    </div>
  );
};

export default ProgressRing;
