import React from "react";
import { motion } from "framer-motion";

export default function ProgressBar({ current, total }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div style={{ margin: "20px 0" }}>
      <div
        style={{
          background: "#ddd",
          height: "14px",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          style={{
            background: "#1e90ff",
            height: "14px",
            borderRadius: "10px",
          }}
        />
      </div>
      <p style={{ fontSize: "14px", marginTop: "5px", textAlign: "center" }}>
        {percentage}% completed
      </p>
    </div>
  );
}
