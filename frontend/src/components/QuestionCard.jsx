import React, { useState, useEffect } from 'react';
import './MBTIQuiz.css';

// Dimension mapping: Display names (O/R, P/V, L/E, S/F) to MBTI traits (E/I, S/N, T/F, J/P)
const DIMENSION_MAP = {
  'O': 'E', 'R': 'I',  // Outward/Reserved -> Extraversion/Introversion
  'P': 'S', 'V': 'N',  // Practical/Visionary -> Sensing/Intuition
  'L': 'T', 'E': 'F',  // Logical/Emotional -> Thinking/Feeling
  'S': 'J', 'F': 'P',  // Structured/Flexible -> Judging/Perceiving
};

// Reverse mapping for display
const MBTI_TO_DISPLAY = {
  'E': 'O', 'I': 'R',
  'S': 'P', 'N': 'V',
  'T': 'L', 'F': 'E',
  'J': 'S', 'P': 'F',
};

const DIMENSION_LABELS = {
  'O': 'Outward', 'R': 'Reserved',
  'P': 'Practical', 'V': 'Visionary',
  'L': 'Logical', 'E': 'Emotional',
  'S': 'Structured', 'F': 'Flexible',
};

// Track answers using MBTI traits (for backend compatibility)
let answerHistory = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

// Get dimension icons
function getDimensionIcon(dimension) {
  const icons = {
    'O': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" fill="#FFD93D"/><path d="M12 13c-3 0-5 1.5-5 3v2h10v-2c0-1.5-2-3-5-3z" fill="#FFD93D"/><path d="M8 8c0-1 1-2 2-2M16 8c0-1-1-2-2-2" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="8" r="0.8" fill="#FF6B6B"/><circle cx="14" cy="8" r="0.8" fill="#FF6B6B"/><path d="M10 9.5c0.5 0.5 1.5 0.5 2 0" stroke="#FF6B6B" strokeWidth="1" strokeLinecap="round"/></svg>,
    'R': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M7 18c0-2 2-3 5-3s5 1 5 3v2H7v-2z" fill="#A8DADC"/><circle cx="12" cy="10" r="3.5" fill="#A8DADC"/><circle cx="10.5" cy="9.5" r="0.8" fill="#457B9D"/><circle cx="13.5" cy="9.5" r="0.8" fill="#457B9D"/><path d="M10.5 11.5c0.5 0.3 1 0.3 1.5 0" stroke="#457B9D" strokeWidth="1" strokeLinecap="round"/><path d="M6 10c-1-1-1-2 0-3M18 10c1-1 1-2 0-3" stroke="#A8DADC" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    'P': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="5" height="5" rx="1" fill="#FF9ECD" stroke="#FF6BA9" strokeWidth="1.5"/><rect x="13" y="6" width="5" height="5" rx="1" fill="#A8E6CF" stroke="#56C596" strokeWidth="1.5"/><rect x="6" y="13" width="5" height="5" rx="1" fill="#FFD93D" stroke="#FFC107" strokeWidth="1.5"/><rect x="13" y="13" width="5" height="5" rx="1" fill="#9EC9FF" stroke="#5BA3FF" strokeWidth="1.5"/></svg>,
    'V': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#E8C4FF" stroke="#B388FF" strokeWidth="1.5"/><path d="M12 7l1.5 3 3.5 0.5-2.5 2.5 0.5 3.5-3-1.5-3 1.5 0.5-3.5L7 10.5l3.5-0.5L12 7z" fill="#FFD93D"/><circle cx="8" cy="9" r="1" fill="#FFE082"/><circle cx="16" cy="9" r="1" fill="#FFE082"/><circle cx="12" cy="16" r="1" fill="#FFE082"/></svg>,
    'L': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="8" width="6" height="10" rx="1" fill="#96CEB4" stroke="#6AB18F" strokeWidth="1.5"/><rect x="13" y="5" width="6" height="13" rx="1" fill="#FFEAA7" stroke="#FDCB6E" strokeWidth="1.5"/><circle cx="8" cy="13" r="1" fill="#6AB18F"/><circle cx="16" cy="11" r="1" fill="#FDCB6E"/><path d="M5 19h14" stroke="#4A5568" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    'E': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5c-3 0-5 2-5 5 0 4 5 9 5 9s5-5 5-9c0-3-2-5-5-5z" fill="#FF6B9D" stroke="#FF477E" strokeWidth="1.5"/><circle cx="12" cy="10" r="2" fill="#FFE0E9"/><path d="M8 4c-0.5-1-1-1.5-2-1.5M16 4c0.5-1 1-1.5 2-1.5" stroke="#FF6B9D" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    'S': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="3" rx="1" fill="#74B9FF" stroke="#0984E3" strokeWidth="1.5"/><rect x="5" y="10" width="14" height="3" rx="1" fill="#A29BFE" stroke="#6C5CE7" strokeWidth="1.5"/><rect x="5" y="15" width="14" height="3" rx="1" fill="#FD79A8" stroke="#E84393" strokeWidth="1.5"/><circle cx="8" cy="6.5" r="0.8" fill="#0984E3"/><circle cx="8" cy="11.5" r="0.8" fill="#6C5CE7"/><circle cx="8" cy="16.5" r="0.8" fill="#E84393"/></svg>,
    'F': <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#FFE66D" stroke="#FFD93D" strokeWidth="1.5"/><path d="M12 4v16M4 12h16" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="3" fill="#FF6B6B"/><path d="M9 9l6 6M15 9l-6 6" stroke="#FFE66D" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  };
  return icons[dimension] || null;
}

function getIconForCategory(category) {
  const icons = {
    'Energy': <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg>,
    'Information': <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
    'Decisions': <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>,
    'Lifestyle': <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
  };
  return icons[category] || icons['Information'];
}

// Get dominant trait for display (using display labels)
function getDominantDisplayTrait(display1, display2) {
  const mbti1 = DIMENSION_MAP[display1];
  const mbti2 = DIMENSION_MAP[display2];
  const score1 = answerHistory[mbti1] || 0;
  const score2 = answerHistory[mbti2] || 0;
  if (score1 === score2) return '';
  return score1 > score2 ? display1 : display2;
}

// Helper to determine question category and dimension
function getQuestionInfo(questionDesc) {
  const text = questionDesc.toLowerCase();
  
  if (text.includes('attention') || text.includes('center') || text.includes('social') || text.includes('gathering')) {
    return { dimension: 'E', displayDimension: 'O', category: 'Energy' };
  }
  if (text.includes('alone') || text.includes('quiet') || text.includes('recharge')) {
    return { dimension: 'I', displayDimension: 'R', category: 'Energy' };
  }
  if (text.includes('fact') || text.includes('concrete') || text.includes('present') || text.includes('details')) {
    return { dimension: 'S', displayDimension: 'P', category: 'Information' };
  }
  if (text.includes('imagine') || text.includes('future') || text.includes('possibility') || text.includes('scenarios')) {
    return { dimension: 'N', displayDimension: 'V', category: 'Information' };
  }
  if (text.includes('logic') || text.includes('decision') || text.includes('logic')) {
    return { dimension: 'T', displayDimension: 'L', category: 'Decisions' };
  }
  if (text.includes('feeling') || text.includes('harmony') || text.includes('feelings')) {
    return { dimension: 'F', displayDimension: 'E', category: 'Decisions' };
  }
  if (text.includes('schedule') || text.includes('plan') || text.includes('structure') || text.includes('structured')) {
    return { dimension: 'J', displayDimension: 'S', category: 'Lifestyle' };
  }
  if (text.includes('spontaneous') || text.includes('open') || text.includes('flexible') || text.includes('options')) {
    return { dimension: 'P', displayDimension: 'F', category: 'Lifestyle' };
  }
  
  return { dimension: '', displayDimension: '', category: 'Personality' };
}

export default function QuestionCard({ question, onAnswer }) {
  const { currentIndex, maxQuestions, questionDesc } = question;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  
  const progress = Math.round(((currentIndex - 1) / maxQuestions) * 100);
  const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
  
  const questionInfo = getQuestionInfo(questionDesc);
  
  // Reset submitting state when question changes
  useEffect(() => {
    setIsSubmitting(false);
  }, [question.questionID]);
  
  const handleAnswer = async (answer) => {
    if (isSubmitting) return;
    
    // Track answer using MBTI traits for backend compatibility
    if (answer === 'Yes' && questionInfo.dimension) {
      answerHistory[questionInfo.dimension] = (answerHistory[questionInfo.dimension] || 0) + 1;
    }
    
    setIsSubmitting(true);
    try {
      await onAnswer(answer);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mbti-question-screen">
      {/* Header with Character Icons */}
      <div className="mbti-quiz-header">
        <div className="mbti-header-icon-container">
          {/* Boy Character on Left */}
          <div className="mbti-character-icon mbti-boy-character">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="35" r="18" fill="#FFD7A8"/>
              <path d="M32 28 Q32 16 50 16 Q68 16 68 28 L68 32 L32 32 Z" fill="#4A3728"/>
              <path d="M35 22 Q40 18 45 22" stroke="#3D2E21" strokeWidth="2" fill="none"/>
              <path d="M55 22 Q60 18 65 22" stroke="#3D2E21" strokeWidth="2" fill="none"/>
              <circle cx="44" cy="35" r="5" fill="none" stroke="#2C2C2C" strokeWidth="2"/>
              <circle cx="56" cy="35" r="5" fill="none" stroke="#2C2C2C" strokeWidth="2"/>
              <line x1="49" y1="35" x2="51" y2="35" stroke="#2C2C2C" strokeWidth="2"/>
              <line x1="39" y1="35" x2="37" y2="36" stroke="#2C2C2C" strokeWidth="2"/>
              <line x1="61" y1="35" x2="63" y2="36" stroke="#2C2C2C" strokeWidth="2"/>
              <circle cx="44" cy="35" r="2" fill="#2C2C2C"/>
              <circle cx="56" cy="35" r="2" fill="#2C2C2C"/>
              <path d="M46 42 Q50 44 54 42" stroke="#2C2C2C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <rect x="38" y="53" width="24" height="28" rx="4" fill="#5B9BD5"/>
              <path d="M44 53 L50 58 L56 53" fill="white"/>
              <rect x="24" y="62" width="10" height="14" rx="1" fill="#8B4513"/>
              <line x1="26" y1="66" x2="32" y2="66" stroke="#D2691E" strokeWidth="1"/>
              <line x1="26" y1="69" x2="32" y2="69" stroke="#D2691E" strokeWidth="1"/>
              <line x1="26" y1="72" x2="32" y2="72" stroke="#D2691E" strokeWidth="1"/>
              <rect x="28" y="58" width="8" height="16" rx="4" fill="#FFD7A8"/>
              <rect x="64" y="58" width="8" height="20" rx="4" fill="#FFD7A8"/>
              <circle cx="68" cy="79" r="4" fill="#FFD7A8"/>
              <rect x="42" y="81" width="7" height="16" rx="3" fill="#34495E"/>
              <rect x="51" y="81" width="7" height="16" rx="3" fill="#34495E"/>
              <ellipse cx="45.5" cy="97" rx="5" ry="2.5" fill="#2C3E50"/>
              <ellipse cx="54.5" cy="97" rx="5" ry="2.5" fill="#2C3E50"/>
            </svg>
          </div>

          {/* Center Icon */}
          <div style={{ position: 'relative' }}>
            <div className="mbti-icon-ring mbti-ring-1"></div>
            <div className="mbti-icon-ring mbti-ring-2"></div>
            <div className="mbti-icon-ring mbti-ring-3"></div>
            <div className="mbti-header-main-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="35" stroke="url(#grad1-question)" strokeWidth="3" fill="none"/>
                <path d="M40 10 L50 35 L75 40 L50 45 L40 70 L30 45 L5 40 L30 35 Z" fill="url(#grad2-question)"/>
                <defs>
                  <linearGradient id="grad1-question" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="grad2-question" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#f093fb', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Girl Character on Right */}
          <div className="mbti-character-icon mbti-girl-character">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="35" r="18" fill="#FFE5CC"/>
              <path d="M32 25 Q32 15 50 15 Q68 15 68 25 L68 32 Q68 38 62 38 L38 38 Q32 38 32 32 Z" fill="#8B4513"/>
              <circle cx="50" cy="18" r="8" fill="#8B4513"/>
              <circle cx="50" cy="15" r="7" fill="#8B4513"/>
              <circle cx="50" cy="13" r="5" fill="#6B3410"/>
              <circle cx="43" cy="35" r="6" fill="none" stroke="#B8860B" strokeWidth="2"/>
              <circle cx="57" cy="35" r="6" fill="none" stroke="#B8860B" strokeWidth="2"/>
              <line x1="49" y1="35" x2="51" y2="35" stroke="#B8860B" strokeWidth="2"/>
              <line x1="37" y1="35" x2="35" y2="36" stroke="#B8860B" strokeWidth="2"/>
              <line x1="63" y1="35" x2="65" y2="36" stroke="#B8860B" strokeWidth="2"/>
              <circle cx="43" cy="35" r="2.5" fill="#2C2C2C"/>
              <circle cx="57" cy="35" r="2.5" fill="#2C2C2C"/>
              <path d="M45 43 Q50 45 55 43" stroke="#FF69B4" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <circle cx="38" cy="39" r="2" fill="#FFB6C1" opacity="0.6"/>
              <circle cx="62" cy="39" r="2" fill="#FFB6C1" opacity="0.6"/>
              <path d="M38 53 L38 70 Q38 82 50 82 Q62 82 62 70 L62 53 Z" fill="#9B6B9E"/>
              <path d="M44 53 L50 58 L56 53" fill="white"/>
              <circle cx="50" cy="60" r="1.5" fill="white"/>
              <circle cx="50" cy="65" r="1.5" fill="white"/>
              <circle cx="50" cy="70" r="1.5" fill="white"/>
              <rect x="66" y="60" width="12" height="16" rx="1" fill="#F4A460"/>
              <line x1="68" y1="64" x2="76" y2="64" stroke="#DEB887" strokeWidth="1"/>
              <line x1="68" y1="68" x2="76" y2="68" stroke="#DEB887" strokeWidth="1"/>
              <line x1="68" y1="72" x2="76" y2="72" stroke="#DEB887" strokeWidth="1"/>
              <rect x="77" y="62" width="2" height="10" fill="#FFD700"/>
              <path d="M77 62 L78 60 L79 62" fill="#FFB6C1"/>
              <rect x="64" y="58" width="8" height="18" rx="4" fill="#FFE5CC"/>
              <rect x="28" y="58" width="8" height="20" rx="4" fill="#FFE5CC"/>
              <circle cx="32" cy="79" r="4" fill="#FFE5CC"/>
              <rect x="31" y="70" width="2" height="9" rx="1" fill="#FFE5CC"/>
              <rect x="44" y="82" width="5" height="14" rx="2.5" fill="#FFE5CC"/>
              <rect x="51" y="82" width="5" height="14" rx="2.5" fill="#FFE5CC"/>
              <ellipse cx="46.5" cy="96" rx="5" ry="2.5" fill="#9B6B9E"/>
              <ellipse cx="53.5" cy="96" rx="5" ry="2.5" fill="#9B6B9E"/>
            </svg>
          </div>
        </div>
        <h1 className="mbti-quiz-title">Personality Compass</h1>
        <p className="mbti-quiz-subtitle">Discover your unique character profile</p>
      </div>

      <div className="mbti-stats-bar">
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="#667eea"/>
          </svg>
          <div className="mbti-stat-label">Progress</div>
          <div className="mbti-stat-value">{currentIndex}/{maxQuestions}</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="#764ba2"/>
          </svg>
          <div className="mbti-stat-label">Time</div>
          <div className="mbti-stat-value">{timeElapsed}s</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="#f093fb"/>
          </svg>
          <div className="mbti-stat-label">Complete</div>
          <div className="mbti-stat-value">{progress}%</div>
        </div>
      </div>

      <div className="mbti-progress-section">
        <div className="mbti-progress-header">
          <span className="mbti-progress-label">Assessment Progress</span>
          <span className="mbti-progress-percentage">{progress}%</span>
        </div>
        <div className="mbti-progress-bar-container">
          <div className="mbti-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="mbti-question-container">
        <div className="mbti-question-header">
          <div className="mbti-question-icon">
            {getIconForCategory(questionInfo.category)}
          </div>
          <div className="mbti-question-badge">Question {currentIndex}</div>
          <div className="mbti-question-category">{questionInfo.category}</div>
        </div>
        <h2 className="mbti-question-text">{questionDesc}</h2>

        <div className="mbti-answer-buttons">
          <button 
            className={`mbti-answer-btn yes-btn ${isSubmitting ? 'disabled' : ''}`}
            onClick={() => handleAnswer('Yes')}
            disabled={isSubmitting}
          >
            <svg className="mbti-answer-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>
            </svg>
            Yes
          </button>
          <button 
            className={`mbti-answer-btn no-btn ${isSubmitting ? 'disabled' : ''}`}
            onClick={() => handleAnswer('No')}
            disabled={isSubmitting}
          >
            <svg className="mbti-answer-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
            No
          </button>
        </div>
      </div>

      <div className="mbti-dimension-pairs">
        <div className="mbti-dimension-card">
          <div className="mbti-dimension-header">
            <div className="mbti-dimension-icon">{getDimensionIcon('O')}</div>
            <div className="mbti-dimension-title">Energy Source</div>
          </div>
          <div className="mbti-dimension-options">
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('O', 'R') === 'O' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">O</div>
              <div className="mbti-dimension-option-name">Outward</div>
            </div>
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('O', 'R') === 'R' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">R</div>
              <div className="mbti-dimension-option-name">Reserved</div>
            </div>
          </div>
        </div>

        <div className="mbti-dimension-card">
          <div className="mbti-dimension-header">
            <div className="mbti-dimension-icon">{getDimensionIcon('P')}</div>
            <div className="mbti-dimension-title">Information Style</div>
          </div>
          <div className="mbti-dimension-options">
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('P', 'V') === 'P' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">P</div>
              <div className="mbti-dimension-option-name">Practical</div>
            </div>
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('P', 'V') === 'V' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">V</div>
              <div className="mbti-dimension-option-name">Visionary</div>
            </div>
          </div>
        </div>

        <div className="mbti-dimension-card">
          <div className="mbti-dimension-header">
            <div className="mbti-dimension-icon">{getDimensionIcon('L')}</div>
            <div className="mbti-dimension-title">Decision Method</div>
          </div>
          <div className="mbti-dimension-options">
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('L', 'E') === 'L' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">L</div>
              <div className="mbti-dimension-option-name">Logical</div>
            </div>
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('L', 'E') === 'E' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">E</div>
              <div className="mbti-dimension-option-name">Emotional</div>
            </div>
          </div>
        </div>

        <div className="mbti-dimension-card">
          <div className="mbti-dimension-header">
            <div className="mbti-dimension-icon">{getDimensionIcon('S')}</div>
            <div className="mbti-dimension-title">Lifestyle Mode</div>
          </div>
          <div className="mbti-dimension-options">
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('S', 'F') === 'S' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">S</div>
              <div className="mbti-dimension-option-name">Structured</div>
            </div>
            <div className={`mbti-dimension-option ${getDominantDisplayTrait('S', 'F') === 'F' ? 'active' : ''}`}>
              <div className="mbti-dimension-option-letter">F</div>
              <div className="mbti-dimension-option-name">Flexible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
