import React, { useState, useEffect } from 'react';
import './RIASECQuiz.css';

// Helper function to get icon based on RIASEC scale or question text
function getQuestionIcon(questionText = '', scale = '') {
  const text = questionText.toLowerCase();
  const scaleUpper = scale.toUpperCase();
  
  // Check for specific keywords in question text
  if (text.includes('tool') || text.includes('machine') || text.includes('build') || text.includes('repair') || scaleUpper === 'R') {
    return '⚙️';
  }
  if (text.includes('research') || text.includes('science') || text.includes('analyze') || text.includes('investigate') || scaleUpper === 'I') {
    return '🧪';
  }
  if (text.includes('art') || text.includes('creative') || text.includes('design') || text.includes('music') || scaleUpper === 'A') {
    return '🎨';
  }
  if (text.includes('help') || text.includes('people') || text.includes('teach') || text.includes('care') || scaleUpper === 'S') {
    return '🤝';
  }
  if (text.includes('business') || text.includes('lead') || text.includes('manage') || text.includes('sell') || scaleUpper === 'E') {
    return '📈';
  }
  if (text.includes('organize') || text.includes('data') || text.includes('record') || text.includes('file') || scaleUpper === 'C') {
    return '📊';
  }
  
  // Default icon
  return '💭';
}

// Helper function to get encouraging messages
function getCharacterMessage(progress) {
  const percent = (progress.current / progress.total) * 100;
  
  if (percent < 20) {
    return "Hi! Let's discover your interests together";
  } else if (percent < 40) {
    return "You're doing great! Keep going!";
  } else if (percent < 60) {
    return "Halfway there! You're discovering your path!";
  } else if (percent < 80) {
    return "Almost done! You're almost there!";
  } else {
    return "Final questions! You're doing amazing!";
  }
}

// Helper to get character emoji based on progress
function getCharacterEmoji(progress) {
  const percent = (progress.current / progress.total) * 100;
  
  if (percent < 30) {
    return '👋';
  } else if (percent < 60) {
    return '👍';
  } else if (percent < 90) {
    return '🎯';
  } else {
    return '🎉';
  }
}

const SMILEY_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Strongly\nDisagree' }, // Crying/sad child face
  { value: 2, emoji: '😞', label: 'Somewhat\nDisagree' }, // Disappointed/slightly sad
  { value: 3, emoji: '😐', label: 'Neutral' }, // Neutral expression
  { value: 4, emoji: '🙂', label: 'Somewhat\nAgree' }, // Slight smile
  { value: 5, emoji: '😄', label: 'Strongly\nAgree' }, // Very happy/excited
];

export default function QuestionCardRiasec({ question, onAnswer }) {
  const { index, total, questionText } = question;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const progress = {
    current: index,
    total: total,
    percent: Math.round((index / total) * 100)
  };
  
  const questionIcon = getQuestionIcon(questionText, question.scale || '');
  const characterMessage = getCharacterMessage(progress);
  const characterEmoji = getCharacterEmoji(progress);
  
  // Calculate progress circle degrees
  const progressDegrees = (progress.percent / 100) * 360;
  
  // Reset submitting state when question changes
  useEffect(() => {
    setIsSubmitting(false);
  }, [question.questionID]);
  
  const handleSelect = async (value) => {
    // Prevent multiple clicks
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Automatically submit the answer when a card is clicked
      await onAnswer(value);
      // Note: isSubmitting will be reset when the next question loads or quiz ends
    } catch (error) {
      // Reset submitting state on error so user can retry
      setIsSubmitting(false);
      // Error will be handled by parent component (RIASECQuiz)
    }
  };

  return (
    <div className="riasec-question-screen">
      {/* Progress Circle */}
      <div className="riasec-progress-circle-container">
        <div 
          className="riasec-progress-circle"
          style={{
            background: `conic-gradient(#2E86DE 0deg ${progressDegrees}deg, #e1e8ed ${progressDegrees}deg 360deg)`
          }}
        >
          <div className="riasec-progress-text">
            <div className="riasec-progress-number">{index}/{total}</div>
            <div className="riasec-progress-label">{progress.percent}%</div>
          </div>
        </div>
      </div>

      {/* Animated Character */}
      <div className="riasec-character-section">
        <div className="riasec-animated-character">{characterEmoji}</div>
        <div className="riasec-character-message">{characterMessage}</div>
      </div>

      {/* Question Card */}
      <div className="riasec-question-card">
        <div className="riasec-question-number">Question {index} of {total}</div>
        <span className="riasec-question-icon-large">{questionIcon}</span>
        <div className="riasec-question-text">{questionText}</div>
      </div>

      {/* Likert Scale */}
      <div className="riasec-likert-container">
        <div className="riasec-likert-title">How much does this describe you?</div>
        
        <div className="riasec-likert-scale-advanced">
          {SMILEY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`riasec-scale-option-advanced ${isSubmitting ? 'disabled' : ''}`}
              onClick={() => handleSelect(option.value)}
              style={{
                cursor: isSubmitting ? 'wait' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                pointerEvents: isSubmitting ? 'none' : 'auto',
              }}
            >
              <span className="riasec-scale-emoji">{option.emoji}</span>
              <div className="riasec-scale-value">{option.value}</div>
              <div className="riasec-scale-label">{option.label}</div>
            </div>
          ))}
        </div>
        
        {isSubmitting && (
          <div className="riasec-selected-feedback" style={{ textAlign: 'center' }}>
            Processing your response...
          </div>
        )}
      </div>

      {/* Tip Box */}
      <div className="riasec-tip-box">
        <span className="riasec-tip-icon">💡</span>
        <span>Tip: Think about activities you naturally enjoy doing in your free time</span>
      </div>
    </div>
  );
}
