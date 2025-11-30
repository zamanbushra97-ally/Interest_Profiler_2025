import React, { useEffect, useRef, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import './RIASECQuiz.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const SCALES = ['R', 'I', 'A', 'S', 'E', 'C'];

// Updated colors to match provided palette
const SCALE_INFO = {
  R: {
    name: 'Realistic',
    icon: '🔨',
    description: "You enjoy working with tools, machines, and hands-on activities.",
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FF5252)',
    subtitle: 'Hands-on Work',
  },
  I: {
    name: 'Investigative',
    icon: '🔬',
    description: "You like analyzing problems and exploring scientific concepts.",
    color: '#4D96FF',
    gradient: 'linear-gradient(135deg, #4D96FF, #3D7EDB)',
    subtitle: 'Analytical Thinking',
  },
  A: {
    name: 'Artistic',
    icon: '🎭',
    description: "You're drawn to creative expression and imaginative work.",
    color: '#9D4EDD',
    gradient: 'linear-gradient(135deg, #9D4EDD, #7B2CBF)',
    subtitle: 'Creative Expression',
  },
  S: {
    name: 'Social',
    icon: '💬',
    description: "You enjoy helping others and working with people.",
    color: '#38B000',
    gradient: 'linear-gradient(135deg, #38B000, #2B8800)',
    subtitle: 'Helping & People Work',
  },
  E: {
    name: 'Enterprising',
    icon: '💼',
    description: "You're motivated by leadership and business opportunities.",
    color: '#FF8E00',
    gradient: 'linear-gradient(135deg, #FF8E00, #E67E00)',
    subtitle: 'Leadership & Business',
  },
  C: {
    name: 'Conventional',
    icon: '📊',
    description: "You prefer structured, organized, and detail-oriented work.",
    color: '#4BC6B9',
    gradient: 'linear-gradient(135deg, #4BC6B9, #3BA89B)',
    subtitle: 'Organization & Detail Work',
  },
};

// Value labels plugin for radar chart
const valueLabelsPlugin = {
  id: 'riasecValueLabels',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const { ctx, chartArea } = chart;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    const values = chart.data.datasets?.[0]?.data ?? [];

    ctx.save();
    ctx.font = 'bold 14px Inter';
    ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    meta.data.forEach((pt, i) => {
      const { x, y } = pt.getProps(['x', 'y'], true);
      const val = Number.isFinite(values[i]) ? Math.round(values[i]) : null;
      if (val === null) return;
      const dx = (x - cx) * 0.08;
      const dy = (y - cy) * 0.08;
      ctx.fillText(`${val}%`, x + dx, y + dy);
    });

    ctx.restore();
  },
};

// Helper to get confidence interpretation
function getConfidenceInterpretation(confidence) {
  if (confidence >= 75) {
    return 'High precision — very clear and distinct interest patterns.';
  } else if (confidence >= 50) {
    return 'Moderate precision — consistent but not very strong differentiation.';
  } else if (confidence >= 25) {
    return 'Lower precision — some variability in responses.';
  } else {
    return 'Low precision — responses show high variability.';
  }
}

// Helper to decode Holland code into full names
function decodeHollandCode(code) {
  if (!code || code.length < 3) return '';
  const parts = code.split('').map(letter => SCALE_INFO[letter]?.name || letter);
  return parts.join(' – ');
}

// Generate random similarity scores for students (in real app, would come from backend)
const STUDENT_GALLERY = [
  { name: 'Alex', code: 'AIS', avatar: '👨‍🎓', similarity: 78 },
  { name: 'Sarah', code: 'ASI', avatar: '👩‍🎨', similarity: 82 },
  { name: 'Mike', code: 'ISA', avatar: '👨‍🔬', similarity: 75 },
  { name: 'Emma', code: 'SAI', avatar: '👩‍💼', similarity: 80 },
  { name: 'David', code: 'RSC', avatar: '🧑‍🎓', similarity: 72 },
  { name: 'Lily', code: 'CER', avatar: '👧', similarity: 76 },
];

export default function ResultCardRiasec({ result, onRestart }) {
  const confettiRef = useRef(null);

  // Defensive defaults
  const safeNum = (v, d = 0) => (Number.isFinite(v) ? v : d);

  const axis = result?.axis_percents || {};
  const values = SCALES.map((k) => Math.round(safeNum(axis[k])));
  const code = result?.riasec_code ?? '—';
  const confidence = Math.round(safeNum(result?.confidence_pct));
  const answered = result?.answered ?? 0;
  const total = result?.total ?? 0;
  
  // Get Holland code explanation
  const codeExplanation = decodeHollandCode(code);
  
  // Get 95% Confidence Intervals
  const traitMetrics = result?.trait_metrics || {};
  const hollandAnalysis = result?.holland_analysis;
  const top3Traits = hollandAnalysis?.top_3 || [];
  
  // Get CI ranges for top 3 traits with additional info
  const top3CIs = top3Traits.map((trait) => {
    const metrics = traitMetrics[trait];
    if (!metrics) return null;
    const score = safeNum(axis[trait]);
    const ci_lower = safeNum(metrics.ci_95_lower);
    const ci_upper = safeNum(metrics.ci_95_upper);
    const sem = safeNum(metrics.sem);
    const margin = 1.96 * sem;
    
    // Calculate progress bar position (where score lies within CI range)
    const ciRange = ci_upper - ci_lower;
    const scorePosition = ciRange > 0 ? ((score - ci_lower) / ciRange) * 100 : 50;
    
    return {
      trait,
      name: SCALE_INFO[trait].name,
      score: score,
      ci_lower,
      ci_upper,
      sem,
      margin,
      scorePosition: Math.max(0, Math.min(100, scorePosition)),
      color: SCALE_INFO[trait].color,
    };
  }).filter(Boolean);

  // Create enhanced confetti on mount
  useEffect(() => {
    const createConfetti = () => {
      if (!confettiRef.current) return;
      const container = confettiRef.current;
      const colors = ['#6C63FF', '#4da6ff', '#FF6B6B', '#4D96FF', '#9D4EDD', '#38B000', '#FF8E00', '#4BC6B9'];
      
      container.innerHTML = '';
      
      for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'riasec-confetti-enhanced';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 3 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
        container.appendChild(confetti);
      }
    };

    createConfetti();
  }, []);

  // Sort scales by percentage for display
  const sortedScales = SCALES.map((scale, idx) => ({
    scale,
    value: values[idx],
    ...SCALE_INFO[scale],
  })).sort((a, b) => b.value - a.value);

  const data = {
    labels: SCALES.map((s) => SCALE_INFO[s].name),
    datasets: [
      {
        label: 'RIASEC Percent',
        data: values,
        backgroundColor: 'rgba(108, 99, 255, 0.15)',
        borderColor: 'rgba(108, 99, 255, 0.8)',
        pointBackgroundColor: 'rgba(108, 99, 255, 1)',
        pointBorderColor: '#fff',
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 1200, easing: 'easeOutQuart' },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMax: 100,
        ticks: { display: false, backdropColor: 'transparent' },
        grid: { color: 'rgba(108, 99, 255, 0.1)', lineWidth: 1.5 },
        angleLines: { color: 'rgba(108, 99, 255, 0.15)', lineWidth: 1.5 },
        pointLabels: {
          font: { size: 13, weight: '600', family: 'Inter' },
          color: '#2c3e50',
          padding: 12,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(44, 62, 80, 0.9)',
        padding: 12,
        titleFont: { size: 14, weight: '600', family: 'Inter' },
        bodyFont: { size: 13, family: 'Inter' },
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.formattedValue}%`,
        },
      },
    },
  };

  const handleRestart = () => {
    // Clear localStorage
    localStorage.removeItem('riasecQuizState');
    localStorage.removeItem('riasecResult');
    
    // Call the parent's restart handler if provided
    if (onRestart) {
      onRestart();
    } else {
      // Fallback: reload page if no handler provided
      window.location.reload();
    }
  };

  // Calculate confidence circle progress (0-100 to 0-360 degrees)
  const confidenceProgress = (confidence / 100) * 360;

  return (
    <div className="riasec-result-screen">
      <div className="riasec-confetti-container" ref={confettiRef}></div>

      {/* 1. Header Section - Enhanced */}
      <div className="riasec-result-header-enhanced">
        <h1>🎉 Congratulations!</h1>
        <div className="riasec-header-label">Your Holland Interest Code</div>
        <div className="riasec-code-badge">{code}</div>
        {codeExplanation && (
          <div className="riasec-code-explanation">"{codeExplanation}"</div>
        )}
      </div>

      {/* 2. Confidence Panel - Circular Progress */}
      <div className="riasec-confidence-panel">
        <div className="riasec-confidence-circle-container">
          <svg className="riasec-confidence-circle" viewBox="0 0 120 120">
            <circle
              className="riasec-confidence-bg"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e1e8ed"
              strokeWidth="8"
            />
            <circle
              className="riasec-confidence-progress"
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="url(#confidenceGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${confidenceProgress} 360`}
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6C63FF" />
                <stop offset="100%" stopColor="#4da6ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="riasec-confidence-value">{confidence}%</div>
        </div>
        <div className="riasec-confidence-label">Confidence</div>
        <div className="riasec-confidence-interpretation">
          {getConfidenceInterpretation(confidence)}
        </div>
      </div>

      {/* 3. Confidence in Accuracy (95% CI) Cards - Redesigned */}
      {top3CIs && top3CIs.length > 0 && (
        <div className="riasec-ci-section">
          <h3 className="riasec-section-title">Confidence in Accuracy (95% CI)</h3>
          <div className="riasec-ci-cards">
            {top3CIs.map((ci) => (
              <div key={ci.trait} className="riasec-ci-card" style={{ '--trait-color': ci.color }}>
                <div className="riasec-ci-header">
                  <span className="riasec-ci-icon">{SCALE_INFO[ci.trait].icon}</span>
                  <div>
                    <div className="riasec-ci-trait-name">{ci.name} ({ci.trait})</div>
                    <div className="riasec-ci-score">Score: {ci.score.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="riasec-ci-progress-bar-container">
                  <div className="riasec-ci-progress-bar-bg">
                    <div 
                      className="riasec-ci-progress-bar-fill"
                      style={{ 
                        width: `${ci.score}%`,
                        backgroundColor: ci.color,
                      }}
                    />
                    <div 
                      className="riasec-ci-score-marker"
                      style={{ left: `${ci.score}%`, borderColor: ci.color }}
                    />
                  </div>
                  <div className="riasec-ci-range">
                    <span>{ci.ci_lower.toFixed(1)}%</span>
                    <span>{ci.ci_upper.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="riasec-ci-details">
                  <div className="riasec-ci-ci-range">95% CI: {ci.ci_lower.toFixed(1)}% – {ci.ci_upper.toFixed(1)}%</div>
                  <div className="riasec-ci-margin">Error Margin: ±{ci.margin.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Radar Chart Section - Enhanced */}
      <div className="riasec-radar-container">
        <h3 className="riasec-section-title">Interest Profile Visualization</h3>
        <div className="riasec-radar-wrapper">
          <Radar data={data} options={options} plugins={[valueLabelsPlugin]} />
        </div>
      </div>

      {/* 5. Interest Profile Section - Enhanced */}
      <h3 className="riasec-section-title">Your Interest Profile</h3>
      <div className="riasec-interest-grid-enhanced">
        {sortedScales.map((item) => (
          <div
            key={item.scale}
            className={`riasec-interest-card-enhanced ${item.scale}`}
            style={{ '--card-color': item.color, '--card-gradient': item.gradient }}
          >
            <div className="riasec-interest-top-bar" />
            <span className="riasec-interest-icon-enhanced">{item.icon}</span>
            <div className="riasec-interest-subtitle">{item.subtitle}</div>
            <div className="riasec-interest-name-enhanced">{item.name}</div>
            <div className="riasec-interest-percentage-enhanced">{item.value}%</div>
            <div className="riasec-interest-description-enhanced">{item.description}</div>
          </div>
        ))}
      </div>

      {/* 6. Students Like You Section - Enhanced */}
      <div className="riasec-student-gallery-enhanced">
        <h3 className="riasec-section-title">🌟 Students Like You</h3>
        <div className="riasec-gallery-scroll">
          {STUDENT_GALLERY.map((student, idx) => (
            <div key={idx} className="riasec-student-card">
              <div className="riasec-student-avatar-enhanced">{student.avatar}</div>
              <div className="riasec-student-name-enhanced">{student.name}</div>
              <div className="riasec-student-code-enhanced">{student.code} Code</div>
              <div className="riasec-student-similarity">Similarity: {student.similarity}%</div>
              <div className="riasec-student-buttons">
                <button className="riasec-student-btn">View Profile</button>
                <button className="riasec-student-btn secondary">Explore Roles</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Footer Section - Enhanced */}
      <div className="riasec-footer-enhanced">
        <div className="riasec-footer-gradient" />
        <button className="riasec-btn-restart-large" onClick={handleRestart}>
          🔄 Restart Quiz
        </button>
      </div>
    </div>
  );
}
