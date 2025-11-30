// frontend/src/components/ResultCard.jsx
import React, { useState, useEffect, useRef } from 'react';
import MBTI_DESCRIPTIONS from '../data/mbtiDescriptions';
import RadarChart from './RadarChart';
import { recommendClusters } from '../api';
import './MBTIQuiz.css';

// Dimension mapping and labels
const MBTI_TO_DISPLAY = {
  'E': { letter: 'O', label: 'Outward' },
  'I': { letter: 'R', label: 'Reserved' },
  'S': { letter: 'P', label: 'Practical' },
  'N': { letter: 'V', label: 'Visionary' },
  'T': { letter: 'L', label: 'Logical' },
  'F': { letter: 'E', label: 'Emotional' },
  'J': { letter: 'S', label: 'Structured' },
  'P': { letter: 'F', label: 'Flexible' },
};

function getDimensionIcon(letter) {
  const icons = {
    'O': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3" fill="#FFD93D"/><path d="M12 13c-3 0-5 1.5-5 3v2h10v-2c0-1.5-2-3-5-3z" fill="#FFD93D"/></svg>,
    'R': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M7 18c0-2 2-3 5-3s5 1 5 3v2H7v-2z" fill="#A8DADC"/><circle cx="12" cy="10" r="3.5" fill="#A8DADC"/></svg>,
    'P': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="5" height="5" rx="1" fill="#FF9ECD"/><rect x="13" y="6" width="5" height="5" rx="1" fill="#A8E6CF"/></svg>,
    'V': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#E8C4FF" stroke="#B388FF" strokeWidth="1.5"/></svg>,
    'L': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="5" y="8" width="6" height="10" rx="1" fill="#96CEB4"/><rect x="13" y="5" width="6" height="13" rx="1" fill="#FFEAA7"/></svg>,
    'E': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 5c-3 0-5 2-5 5 0 4 5 9 5 9s5-5 5-9c0-3-2-5-5-5z" fill="#FF6B9D" stroke="#FF477E" strokeWidth="1.5"/></svg>,
    'S': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="3" rx="1" fill="#74B9FF"/><rect x="5" y="10" width="14" height="3" rx="1" fill="#A29BFE"/></svg>,
    'F': <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#FFE66D" stroke="#FFD93D" strokeWidth="1.5"/></svg>,
  };
  return icons[letter] || null;
}

export default function ResultCard({ result, onRestart }) {
  const confettiRef = useRef(null);
  const info = MBTI_DESCRIPTIONS[result.mbti];
  const [careerClusters, setCareerClusters] = useState(null);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clustersError, setClustersError] = useState(null);
  // Get start time from localStorage
  const getStartTime = () => {
    try {
      const startTimeStr = localStorage.getItem('mbtiQuizStartTime');
      if (startTimeStr) {
        return parseInt(startTimeStr, 10);
      }
    } catch (e) {
      console.error('Failed to get start time:', e);
    }
    // Fallback to current time if not found
    return Date.now();
  };

  const [startTime] = useState(getStartTime());

  const mbtiType = result.mbti || '';
  
  // Convert MBTI to display format for letter cards (O/R, P/V, L/E, S/F)
  const displayLetters = mbtiType ? mbtiType.split('').map(letter => {
    const display = MBTI_TO_DISPLAY[letter];
    if (display) {
      return { letter: display.letter, label: display.label };
    }
    return { letter, label: letter };
  }) : [];

  // Create confetti on mount
  useEffect(() => {
    const createConfetti = () => {
      const colors = ['#667eea', '#764ba2', '#f093fb', '#4da6ff'];
      // Confetti is handled by background particles
    };
    createConfetti();
  }, []);

  // Fetch career clusters
  useEffect(() => {
    let isMounted = true;
    
    const fetchCareerClusters = async () => {
      const riasecData = localStorage.getItem('riasecResult');
      
      if (!riasecData) {
        if (isMounted) setCareerClusters([]);
        return;
      }

      try {
        const riasecResult = JSON.parse(riasecData);
        const riasecRaw = riasecResult.raw_scores || {};
        
        if (!riasecRaw || Object.keys(riasecRaw).length === 0) {
          if (isMounted) setCareerClusters([]);
          return;
        }

        if (isMounted) {
          setClustersLoading(true);
          setClustersError(null);
        }
        
        const clusters = await recommendClusters(result.mbti, riasecRaw);
        
        if (isMounted) {
          setCareerClusters(clusters);
          setClustersLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch career clusters:', error);
        if (isMounted) {
          setClustersError(error.message || 'Failed to load career recommendations');
          setCareerClusters([]);
          setClustersLoading(false);
        }
      }
    };

    if (result.mbti) {
      fetchCareerClusters();
    }

    return () => {
      isMounted = false;
    };
  }, [result.mbti]);

  const handleRestart = () => {
    // Clear localStorage
    localStorage.removeItem('mbtiQuizState');
    localStorage.removeItem('mbtiQuizStartTime');
    localStorage.removeItem('mbtiQuestionsAnswered');
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

  const handleShare = () => {
    const message = `${info?.title || 'My Personality Type'}! ✨`;
    if (navigator.share) {
      navigator.share({
        title: 'My MBTI Personality Type',
        text: message,
      }).catch(() => {
        navigator.clipboard.writeText(message);
        alert('Results copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert('Results copied to clipboard!');
      });
    }
  };

  const timeElapsed = Math.floor((Date.now() - startTime) / 1000);
  // Get questions count from result or localStorage
  const questionsCount = result?.total_questions || 
                        parseInt(localStorage.getItem('mbtiQuestionsAnswered') || '0', 10) || 
                        0;

  // Dimension pairs configuration
  const dimensionPairs = [
    {
      title: 'Energy Source',
      pair1: { letter: 'O', label: 'Outward', mbti: 'E' },
      pair2: { letter: 'R', label: 'Reserved', mbti: 'I' },
    },
    {
      title: 'Information Style',
      pair1: { letter: 'P', label: 'Practical', mbti: 'S' },
      pair2: { letter: 'V', label: 'Visionary', mbti: 'N' },
    },
    {
      title: 'Decision Method',
      pair1: { letter: 'L', label: 'Logical', mbti: 'T' },
      pair2: { letter: 'E', label: 'Emotional', mbti: 'F' },
    },
    {
      title: 'Lifestyle Mode',
      pair1: { letter: 'S', label: 'Structured', mbti: 'J' },
      pair2: { letter: 'F', label: 'Flexible', mbti: 'P' },
    },
  ];

  return (
    <div className="mbti-result-screen">
      {/* Result Badge */}
      <div className="mbti-result-badge">✨ Assessment Complete</div>

      {/* Title */}
      <h2 className="mbti-quiz-title">Your Personality Profile</h2>

      {/* Letter Cards Display */}
      <div className="mbti-result-icon-display">
        {displayLetters.map((display, idx) => (
          <div key={idx} className="mbti-result-letter-card">
            <div className="mbti-result-letter">{display.letter}</div>
            <div className="mbti-result-letter-label">{display.label}</div>
          </div>
        ))}
      </div>

      {/* Type Name */}
      <h3 className="mbti-result-name">{info?.title || 'Your Personality Type'}</h3>

      {/* Description */}
      <p className="mbti-result-description">{info?.description || 'Your unique personality type description'}</p>

      {/* Dimension Pairs */}
      <div className="mbti-dimension-pairs" style={{ marginTop: '48px', marginBottom: '48px' }}>
        {dimensionPairs.map((dimension, idx) => {
          // Determine which dimension is active based on MBTI type
          let activePair = '';
          if (mbtiType && mbtiType.length > idx) {
            const mbtiLetter = mbtiType[idx];
            if (mbtiLetter === dimension.pair1.mbti) {
              activePair = dimension.pair1.letter;
            } else if (mbtiLetter === dimension.pair2.mbti) {
              activePair = dimension.pair2.letter;
            }
          }
          
          return (
            <div key={idx} className="mbti-dimension-card">
              <div className="mbti-dimension-header">
                <div className="mbti-dimension-icon">
                  {getDimensionIcon(dimension.pair1.letter)}
                </div>
                <div className="mbti-dimension-title">{dimension.title}</div>
              </div>
              <div className="mbti-dimension-options">
                <div className={`mbti-dimension-option ${activePair === dimension.pair1.letter ? 'active' : ''}`}>
                  <div className="mbti-dimension-option-letter">{dimension.pair1.letter}</div>
                  <div className="mbti-dimension-option-name">{dimension.pair1.label}</div>
                </div>
                <div className={`mbti-dimension-option ${activePair === dimension.pair2.letter ? 'active' : ''}`}>
                  <div className="mbti-dimension-option-letter">{dimension.pair2.letter}</div>
                  <div className="mbti-dimension-option-name">{dimension.pair2.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div className="mbti-stats-bar" style={{ marginTop: '32px' }}>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#667eea"/>
          </svg>
          <div className="mbti-stat-label">Time</div>
          <div className="mbti-stat-value">{timeElapsed}s</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#764ba2"/>
          </svg>
          <div className="mbti-stat-label">Questions</div>
          <div className="mbti-stat-value">{questionsCount || 'N/A'}</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f093fb"/>
          </svg>
          <div className="mbti-stat-label">Confidence</div>
          <div className="mbti-stat-value">{Math.round(result.confidence || 0)}%</div>
        </div>
      </div>

      {/* Radar Chart Section */}
      <div style={{ margin: '48px 0', padding: '30px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', textAlign: 'center' }}>
          Trait Strength Radar Chart
        </h3>
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
          <RadarChart mean_probs={result.mean_probs} />
        </div>
      </div>

      {/* Career Clusters - Dark Theme */}
      {clustersLoading && (
        <p style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', margin: '40px 0' }}>
          Loading career recommendations...
        </p>
      )}
      {clustersError && (
        <p style={{ color: '#ff6b6b', textAlign: 'center', margin: '40px 0' }}>Error: {clustersError}</p>
      )}
      {!clustersLoading && !clustersError && careerClusters && careerClusters.length > 0 && (
        <>
          <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '48px 0 32px 0', textAlign: 'center' }}>
            Top Career Cluster Matches
          </h3>
          <div style={{ display: 'grid', gap: '30px', marginBottom: '50px' }}>
            {careerClusters.map((item, i) => (
              <div
                key={i}
                className="mbti-cluster-card"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  padding: '35px',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                {/* Icon + Cluster Name + Rank */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '3rem' }}>{item.icon || '🎯'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', fontWeight: '700' }}>
                        {item.cluster}
                      </h3>
                      <span
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                        }}
                      >
                        #{i + 1}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                        }}
                      >
                        Match: {(item.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <p
                  style={{
                    margin: '0 0 20px 0',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.7',
                    fontSize: '1rem',
                  }}
                >
                  {item.short_description || item.explanation?.substring(0, 200) || 'This career cluster offers opportunities aligned with your interests.'}
                </p>

                {/* Why It Fits You */}
                <div
                  style={{
                    background: 'rgba(102, 126, 234, 0.1)',
                    padding: '15px 20px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    borderLeft: '4px solid #667eea',
                  }}
                >
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#667eea', marginBottom: '5px' }}>
                    Why It Fits Your Personality
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
                    {item.why_it_fits || 'This cluster aligns well with your personality profile.'}
                  </div>
                </div>

                {/* Skills You Naturally Use */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
                    Skills You Naturally Use
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(item.natural_skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skills You Can Grow */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
                    Skills You Can Grow Here
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(item.growth_skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Spark Interest Line */}
                {item.spark_interest && (
                  <div
                    style={{
                      background: 'rgba(243, 156, 18, 0.1)',
                      padding: '15px 20px',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      borderLeft: '4px solid #F39C12',
                      fontStyle: 'italic',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {item.spark_interest}
                  </div>
                )}

                {/* Explore Button */}
                <button
                  className="mbti-btn-primary"
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1rem',
                    marginTop: '10px',
                  }}
                  onClick={() => {
                    alert(`Exploring ${item.cluster} cluster`);
                  }}
                >
                  Explore {item.cluster}
                </button>
              </div>
            ))}
          </div>

          {/* Personality-Based Recommendation Block */}
          {(() => {
            const riasecData = localStorage.getItem('riasecResult');
            let riasecCode = '';
            if (riasecData) {
              try {
                const riasecResult = JSON.parse(riasecData);
                riasecCode = riasecResult.riasec_code || '';
              } catch (e) {
                console.error('Failed to parse RIASEC data:', e);
              }
            }

            const getPersonalityInsights = () => {
              const insights = [];
              
              if (mbtiType.includes('E') && mbtiType.includes('F')) {
                insights.push('Enjoy working with people and making a positive impact');
                insights.push('Prefer collaborative environments where you can support others');
              } else if (mbtiType.includes('I') && mbtiType.includes('T')) {
                insights.push('Prefer analytical work and independent problem-solving');
                insights.push('Value precision and logical reasoning in your tasks');
              } else if (mbtiType.includes('S')) {
                insights.push('Prefer practical, real-world tasks over purely theoretical ones');
                insights.push('Feel motivated when you can see concrete results');
              } else if (mbtiType.includes('N')) {
                insights.push('Enjoy exploring possibilities and creative solutions');
                insights.push('Feel energized by innovative and forward-thinking work');
              }
              
              if (insights.length === 0) {
                insights.push('Enjoy work that aligns with your values and interests');
                insights.push('Prefer environments where you can use your natural strengths');
              }
              
              if (!insights.some(i => i.includes('help'))) {
                insights.push('Feel motivated when you can see how your work helps others');
              }
              
              return insights;
            };

            const insights = getPersonalityInsights();

            return (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '35px',
                  borderRadius: '20px',
                  marginTop: '40px',
                  marginBottom: '40px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  How these clusters match you
                </h3>
                <p
                  style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '20px',
                    textAlign: 'center',
                    lineHeight: '1.6',
                  }}
                >
                  Based on your personality profile
                  {riasecCode && (
                    <> and your interest pattern <strong>{riasecCode}</strong></>
                  )}
                  , you tend to:
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 auto',
                    maxWidth: '600px',
                  }}
                >
                  {insights.map((insight, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: '12px 20px',
                        marginBottom: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #667eea',
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: '1.6',
                      }}
                    >
                      ✓ {insight}
                    </li>
                  ))}
                </ul>
                <p
                  style={{
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginTop: '25px',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    lineHeight: '1.7',
                  }}
                >
                  These clusters give you environments where your natural strengths can grow into powerful skills for your future.
                </p>
              </div>
            );
          })()}
        </>
      )}
      {!clustersLoading && !clustersError && (!careerClusters || careerClusters.length === 0) && (
        <p style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', padding: '30px' }}>
          Complete the RIASEC quiz to see your personalized career cluster recommendations.
        </p>
      )}

      {/* Action Buttons */}
      <div className="mbti-action-buttons">
        <button className="mbti-restart-btn" onClick={handleRestart}>
          <span>Take Quiz Again</span>
        </button>
        <button className="mbti-share-btn" onClick={handleShare}>
          <span>Share Results</span>
        </button>
      </div>
    </div>
  );
}
