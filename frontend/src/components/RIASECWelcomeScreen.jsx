import React, { useEffect, useRef } from 'react';
import './RIASECQuiz.css';

function RIASECWelcomeScreen({ onStart }) {
  const particlesRef = useRef(null);

  useEffect(() => {
    // Create floating particles
    const createParticles = () => {
      if (!particlesRef.current) return;
      const container = particlesRef.current;
      const colors = ['#ffffff', '#667eea', '#764ba2'];
      
      // Clear existing particles
      container.innerHTML = '';
      
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'riasec-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.opacity = Math.random() * 0.5 + 0.3;
        container.appendChild(particle);
      }
    };

    createParticles();
  }, []);

  return (
    <div className="riasec-welcome-screen">
      <div className="riasec-particles" ref={particlesRef}></div>
      
      <div className="riasec-floating-caricatures">
        <div className="riasec-floating-caricature">👨‍🎓</div>
        <div className="riasec-floating-caricature">👩‍🎨</div>
        <div className="riasec-floating-caricature">👨‍🔬</div>
        <div className="riasec-floating-caricature">👩‍💼</div>
      </div>

      <div className="riasec-hero-section">
        <div className="riasec-student-caricature-large">👨‍🎓</div>
        <div className="riasec-welcome-header">
          <h1>Discover Your Career Path</h1>
          <p>Find out what career path matches your interests and personality</p>
        </div>
      </div>

      <div className="riasec-stats-container">
        <div className="riasec-stat-card">
          <div className="riasec-stat-icon">👥</div>
          <div className="riasec-stat-content">
            <div className="riasec-stat-value">10K+</div>
            <div className="riasec-stat-label">Students</div>
          </div>
        </div>
        <div className="riasec-stat-card">
          <div className="riasec-stat-icon">⏱️</div>
          <div className="riasec-stat-content">
            <div className="riasec-stat-value">10-15 min</div>
            <div className="riasec-stat-label">Assessment</div>
          </div>
        </div>
        <div className="riasec-stat-card">
          <div className="riasec-stat-icon">✅</div>
          <div className="riasec-stat-content">
            <div className="riasec-stat-value">95%</div>
            <div className="riasec-stat-label">Accuracy</div>
          </div>
        </div>
      </div>

      <div className="riasec-feature-cards">
        <div className="riasec-feature-card card-1">
          <span className="riasec-feature-icon">🧬</span>
          <div className="riasec-feature-title">Get Your Code</div>
          <div className="riasec-feature-desc">Discover your unique RIASEC profile</div>
        </div>
        <div className="riasec-feature-card card-2">
          <span className="riasec-feature-icon">🗺️</span>
          <div className="riasec-feature-title">Find Your Path</div>
          <div className="riasec-feature-desc">Match with ideal career clusters</div>
        </div>
        <div className="riasec-feature-card card-3">
          <span className="riasec-feature-icon">🎯</span>
          <div className="riasec-feature-title">Plan Your Future</div>
          <div className="riasec-feature-desc">Get personalized recommendations</div>
        </div>
      </div>

      <button className="riasec-btn-primary" onClick={onStart}>
        🚀 Start Your Assessment
        <span style={{ fontSize: '1.3rem' }}>→</span>
      </button>
    </div>
  );
}

export default RIASECWelcomeScreen;

