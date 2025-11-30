import React from "react";

export default function ConfidenceGauge({ confidence }) {
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (confidence / 100) * circumference;

  // color based on confidence
  const getColor = () => {
    if (confidence >= 75) return "#2ecc71"; // green
    if (confidence >= 50) return "#f1c40f"; // yellow
    return "#e74c3c"; // red
  };

  return (
    <div style={{ textAlign: "center", marginBottom: "20px" }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="#e6e6e6"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="22px"
          fill="#333"
        >
          {confidence}%
        </text>
      </svg>
      <p style={{ marginTop: "-10px" }}>
        Profile Confidence
      </p>
    </div>
  );
}
