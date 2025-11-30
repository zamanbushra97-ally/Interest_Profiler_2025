// frontend/src/components/RadarChart.jsx
import React from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Safer: never assume mean_probs is present or length 4
const toPercents = (arr = []) => {
  const safe = (v) => (Number.isFinite(v) ? v : 0);
  const a = [safe(arr[0]), safe(arr[1]), safe(arr[2]), safe(arr[3])];
  return a.map((v) => Math.round(v * 100));
};

// Custom plugin to draw value labels near each point
const valueLabelsPlugin = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const { ctx, chartArea } = chart;
    // Compute actual plot center for better offset
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;

    const values = chart.data.datasets?.[0]?.data ?? [];

    ctx.save();
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    meta.data.forEach((pt, i) => {
      const { x, y } = pt.getProps(["x", "y"], true);
      const pct = Number.isFinite(values[i]) ? `${Math.round(values[i])}%` : "";
      // Nudge label slightly away from center so it doesn’t overlap the point
      const dx = (x - cx) * 0.06;
      const dy = (y - cy) * 0.06;
      ctx.fillText(pct, x + dx, y + dy);
    });

    ctx.restore();
  },
};

export default function RadarChart({ mean_probs }) {
  const valuesPct = toPercents(mean_probs);
  const labels = ["I/E", "S/N", "T/F", "J/P"];

  const data = {
    labels,
    datasets: [
      {
        label: "Trait Strength",
        data: valuesPct, // 0..100
        backgroundColor: "rgba(102, 126, 234, 0.25)",
        borderColor: "rgba(102, 126, 234, 1)",
        pointBackgroundColor: "rgba(102, 126, 234, 1)",
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: { duration: 900, easing: "easeOutQuart" },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { display: false, backdropColor: "transparent" },
        grid: { color: "rgba(255,255,255,0.1)" },
        angleLines: { color: "rgba(255,255,255,0.15)" },
        // Optional: show percentages in axis labels too
        pointLabels: {
          callback: (label, i) => `${label} (${valuesPct[i]}%)`,
          font: { size: 13, weight: "600" },
          color: "rgba(255,255,255,0.8)",
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) {
            return `${labels[ctx.dataIndex]}: ${ctx.formattedValue}%`;
          },
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: 460, margin: "20px auto" }}>
      <Radar data={data} options={options} plugins={[valueLabelsPlugin]} />
    </div>
  );
}
