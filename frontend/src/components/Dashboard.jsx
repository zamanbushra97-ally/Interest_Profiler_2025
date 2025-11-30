import React, { useState, useEffect } from 'react';
import MBTI_DESCRIPTIONS from '../data/mbtiDescriptions';
import { recommendClusters } from '../api';
import './Dashboard.css';

// Dimension mapping for MBTI display
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

const RIASEC_SCALE_INFO = {
  R: { name: 'Realistic', icon: '🔨', color: '#FF6B6B' },
  I: { name: 'Investigative', icon: '🔬', color: '#4D96FF' },
  A: { name: 'Artistic', icon: '🎭', color: '#9D4EDD' },
  S: { name: 'Social', icon: '💬', color: '#38B000' },
  E: { name: 'Enterprising', icon: '💼', color: '#FF8E00' },
  C: { name: 'Conventional', icon: '📊', color: '#4BC6B9' },
};

function Dashboard({ onNavigateToMBTI, onNavigateToRIASEC }) {
  const [mbtiResult, setMbtiResult] = useState(null);
  const [riasecResult, setRiasecResult] = useState(null);
  const [careerClusters, setCareerClusters] = useState(null);
  const [clustersLoading, setClustersLoading] = useState(false);

  // Load results from localStorage
  useEffect(() => {
    // Load MBTI result
    try {
      const mbtiState = localStorage.getItem('mbtiQuizState');
      if (mbtiState) {
        const parsed = JSON.parse(mbtiState);
        if (parsed.result && parsed.result.mbti) {
          setMbtiResult(parsed.result);
        }
      }
    } catch (e) {
      console.error('Failed to load MBTI result:', e);
    }

    // Load RIASEC result
    try {
      const riasecData = localStorage.getItem('riasecResult');
      if (riasecData) {
        const parsed = JSON.parse(riasecData);
        if (parsed.riasec_code || parsed.axis_percents) {
          setRiasecResult(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load RIASEC result:', e);
    }
  }, []);

  // Load career clusters if both MBTI and RIASEC are available
  useEffect(() => {
    const loadCareerClusters = async () => {
      // Get raw_scores from riasecResult - could be in raw_scores field or calculated from axis_percents
      const riasecRaw = riasecResult?.raw_scores;
      
      if (!mbtiResult?.mbti || !riasecRaw) {
        setCareerClusters(null);
        return;
      }

      try {
        setClustersLoading(true);
        const clusters = await recommendClusters(mbtiResult.mbti, riasecRaw);
        setCareerClusters(clusters);
      } catch (error) {
        console.error('Failed to load career clusters:', error);
        setCareerClusters(null);
      } finally {
        setClustersLoading(false);
      }
    };

    loadCareerClusters();
  }, [mbtiResult?.mbti, riasecResult]);

  // Navigation handlers
  const handleMBTIClick = () => {
    if (onNavigateToMBTI) {
      onNavigateToMBTI();
    }
  };

  const handleRIASECClick = () => {
    if (onNavigateToRIASEC) {
      onNavigateToRIASEC();
    }
  };

  // Decode RIASEC code
  const decodeRiasecCode = (code) => {
    if (!code || code.length < 3) return '';
    return code.split('').map(letter => RIASEC_SCALE_INFO[letter]?.name || letter).join(' • ');
  };

  // Get top 3 RIASEC interests
  const getTopInterests = () => {
    if (!riasecResult?.axis_percents) return [];
    const scores = Object.entries(riasecResult.axis_percents)
      .map(([key, value]) => ({ trait: key, score: value }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return scores;
  };

  const topInterests = getTopInterests();

  return (
    <div className="dashboard">
      {/* Background Layer */}
      <div className="dashboard-background">
        <div className="dashboard-gradient-orb dashboard-orb-1"></div>
        <div className="dashboard-gradient-orb dashboard-orb-2"></div>
        <div className="dashboard-gradient-orb dashboard-orb-3"></div>
        <div className="dashboard-grid-overlay"></div>
      </div>

      <div className="dashboard-content">
        {/* Hero Section */}
        <div className="dashboard-hero">
          <h1 className="dashboard-hero-title">Personality & Interest Dashboard</h1>
          <p className="dashboard-hero-subtitle">
            Discover your unique personality type and explore career paths that match your interests and values
          </p>
          <div className="dashboard-hero-cta">
            <button className="dashboard-btn-primary" onClick={handleMBTIClick}>
              🎯 Start MBTI Quiz
            </button>
            <button className="dashboard-btn-secondary" onClick={handleRIASECClick}>
              📊 Start RIASEC Quiz
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="dashboard-overview-grid">
          <div className="dashboard-overview-card">
            <span className="dashboard-overview-icon">🧠</span>
            <h3 className="dashboard-overview-title">Personality Assessment</h3>
            <p className="dashboard-overview-desc">
              Discover your MBTI personality type through a series of insightful questions. Understand how you process information, make decisions, and interact with the world.
            </p>
          </div>
          <div className="dashboard-overview-card">
            <span className="dashboard-overview-icon">💡</span>
            <h3 className="dashboard-overview-title">Interest Profiler</h3>
            <p className="dashboard-overview-desc">
              Explore your career interests using the RIASEC model. Identify which work environments and activities align with your passions and natural inclinations.
            </p>
          </div>
          <div className="dashboard-overview-card">
            <span className="dashboard-overview-icon">🎯</span>
            <h3 className="dashboard-overview-title">Career Matching</h3>
            <p className="dashboard-overview-desc">
              Get personalized career cluster recommendations based on your personality type and interest profile. Find the perfect career path that suits who you are.
            </p>
          </div>
        </div>

        {/* Results Summary */}
        {(mbtiResult || riasecResult) && (
          <div className="dashboard-results-section">
            <h2 className="dashboard-section-title">Your Assessment Results</h2>
            <div className="dashboard-results-grid">
              {/* MBTI Result Card */}
              {mbtiResult && (
                <div className="dashboard-mbti-card">
                  <div className="dashboard-mbti-header">
                    <span className="dashboard-mbti-icon">🧠</span>
                    <h3 className="dashboard-mbti-title">Personality Type</h3>
                  </div>
                  <div className="dashboard-mbti-type-display">
                    {mbtiResult.mbti.split('').map((letter, idx) => {
                      const display = MBTI_TO_DISPLAY[letter];
                      return (
                        <div key={idx} className="dashboard-mbti-letter">
                          <div className="dashboard-mbti-letter-value">{display?.letter || letter}</div>
                          <div className="dashboard-mbti-letter-label">{display?.label || letter}</div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="dashboard-mbti-description">
                    {MBTI_DESCRIPTIONS[mbtiResult.mbti]?.title || 'Your Personality Type'}
                  </p>
                  <div className="dashboard-mbti-stats">
                    <div className="dashboard-stat-item">
                      <div className="dashboard-stat-label">Confidence</div>
                      <div className="dashboard-stat-value">{Math.round(mbtiResult.confidence || 0)}%</div>
                    </div>
                    <div className="dashboard-stat-item">
                      <div className="dashboard-stat-label">Questions</div>
                      <div className="dashboard-stat-value">{mbtiResult.total_questions || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* RIASEC Result Card */}
              {riasecResult && (
                <div className="dashboard-riasec-card">
                  <div className="dashboard-riasec-header">
                    <span className="dashboard-riasec-icon">💡</span>
                    <h3 className="dashboard-riasec-title">Interest Profile</h3>
                  </div>
                  <div className="dashboard-riasec-code">
                    <div className="dashboard-riasec-code-badge">{riasecResult.riasec_code || '—'}</div>
                    <p className="dashboard-riasec-code-desc">{decodeRiasecCode(riasecResult.riasec_code)}</p>
                  </div>
                  {topInterests.length > 0 && (
                    <div className="dashboard-interest-profile">
                      <h4 className="dashboard-interest-profile-title">Top Interests</h4>
                      <div className="dashboard-interest-list">
                        {topInterests.map((interest, idx) => (
                          <div key={idx} className="dashboard-interest-item">
                            <span className="dashboard-interest-icon">
                              {RIASEC_SCALE_INFO[interest.trait]?.icon || '🎯'}
                            </span>
                            <div className="dashboard-interest-name">
                              {RIASEC_SCALE_INFO[interest.trait]?.name || interest.trait}
                            </div>
                            <div className="dashboard-interest-value">{Math.round(interest.score)}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="dashboard-riasec-stats">
                    <div className="dashboard-stat-item">
                      <div className="dashboard-stat-label">Confidence</div>
                      <div className="dashboard-stat-value">{Math.round(riasecResult.confidence_pct || 0)}%</div>
                    </div>
                    <div className="dashboard-stat-item">
                      <div className="dashboard-stat-label">Questions</div>
                      <div className="dashboard-stat-value">{riasecResult.answered || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Career Clusters Preview */}
        {careerClusters && careerClusters.length > 0 && (
          <div className="dashboard-clusters-section">
            <h2 className="dashboard-section-title">Recommended Career Clusters</h2>
            <div className="dashboard-clusters-grid">
              {careerClusters.slice(0, 3).map((cluster, idx) => (
                <div key={idx} className="dashboard-cluster-preview">
                  <div className="dashboard-cluster-preview-header">
                    <span className="dashboard-cluster-preview-icon">{cluster.icon || '🎯'}</span>
                    <h3 className="dashboard-cluster-preview-title">{cluster.cluster}</h3>
                    <span className="dashboard-cluster-preview-rank">#{idx + 1}</span>
                  </div>
                  <p className="dashboard-cluster-preview-desc">
                    {cluster.short_description || cluster.explanation?.substring(0, 150) || 'Career cluster description'}
                  </p>
                  <span className="dashboard-cluster-preview-match">
                    Match: {(cluster.probability * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            {careerClusters.length > 3 && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button className="dashboard-btn-secondary" onClick={handleMBTIClick}>
                  View All Recommendations
                </button>
              </div>
            )}
          </div>
        )}

        {/* Personality Insights */}
        {mbtiResult && (
          <div className="dashboard-insights-section">
            <h2 className="dashboard-section-title">Your Personality Insights</h2>
            <div className="dashboard-insights-grid">
              <div className="dashboard-insight-card">
                <span className="dashboard-insight-icon">🌟</span>
                <h3 className="dashboard-insight-title">Your Strengths</h3>
                <p className="dashboard-insight-desc">
                  {MBTI_DESCRIPTIONS[mbtiResult.mbti]?.description || 'Discover your natural strengths and talents based on your personality type.'}
                </p>
              </div>
              <div className="dashboard-insight-card">
                <span className="dashboard-insight-icon">💼</span>
                <h3 className="dashboard-insight-title">Career Fit</h3>
                <p className="dashboard-insight-desc">
                  Careers that align with your personality type tend to leverage your natural preferences and decision-making style.
                </p>
              </div>
              <div className="dashboard-insight-card">
                <span className="dashboard-insight-icon">🤝</span>
                <h3 className="dashboard-insight-title">Work Style</h3>
                <p className="dashboard-insight-desc">
                  Understanding your personality helps you identify the work environments where you'll thrive and be most productive.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!mbtiResult && !riasecResult && (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">📊</div>
            <h2 className="dashboard-empty-title">Start Your Assessment Journey</h2>
            <p className="dashboard-empty-desc">
              Take our personality and interest assessments to discover your unique profile and get personalized career recommendations.
            </p>
            <div className="dashboard-hero-cta">
              <button className="dashboard-btn-primary" onClick={handleMBTIClick}>
                🎯 Start MBTI Quiz
              </button>
              <button className="dashboard-btn-secondary" onClick={handleRIASECClick}>
                📊 Start RIASEC Quiz
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {(mbtiResult || riasecResult) && (
          <div className="dashboard-quick-actions">
            {!mbtiResult && (
              <button className="dashboard-action-btn primary" onClick={handleMBTIClick}>
                🎯 Take MBTI Quiz
              </button>
            )}
            {!riasecResult && (
              <button className="dashboard-action-btn primary" onClick={handleRIASECClick}>
                📊 Take RIASEC Quiz
              </button>
            )}
            {mbtiResult && (
              <button className="dashboard-action-btn" onClick={handleMBTIClick}>
                🔄 Retake MBTI Quiz
              </button>
            )}
            {riasecResult && (
              <button className="dashboard-action-btn" onClick={handleRIASECClick}>
                🔄 Retake RIASEC Quiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
