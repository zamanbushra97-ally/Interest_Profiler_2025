import React from "react";

export default function TraitStrength({ mean_probs }) {
  const traits = ["I/E", "S/N", "T/F", "J/P"];

  const colorize = (value) => {
    if (value >= 0.66) return "#2ecc71";  // strong → green
    if (value >= 0.33) return "#f1c40f";  // moderate → yellow
    return "#e74c3c";                     // weak → red
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Trait Strengths</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {mean_probs.map((v, i) => (
          <li key={i} style={{ 
            marginBottom: "8px", 
            fontSize: "18px",
            fontWeight: "500" }}>
            <span style={{
              color: colorize(v),
              fontWeight: "bold"
            }}>
              {traits[i]}:
            </span>
            &nbsp; {Math.round(v * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
