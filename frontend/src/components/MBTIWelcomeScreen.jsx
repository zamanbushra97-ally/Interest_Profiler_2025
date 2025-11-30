import React, { useEffect, useRef } from 'react';
import './MBTIQuiz.css';

function MBTIWelcomeScreen({ name, onNameChange, onStart }) {
  const particlesRef = useRef(null);

  useEffect(() => {
    // Create floating particles
    const createParticles = () => {
      if (!particlesRef.current) return;
      const container = particlesRef.current;
      
      container.innerHTML = '';
      
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'mbti-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
      }
    };

    createParticles();
    
    // Also create particles in the main container
    const mainContainer = document.getElementById('mbti-particles');
    if (mainContainer) {
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'mbti-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        mainContainer.appendChild(particle);
      }
    }

    return () => {
      if (particlesRef.current) {
        particlesRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="mbti-welcome-screen">
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
                <circle cx="40" cy="40" r="35" stroke="url(#grad1)" strokeWidth="3" fill="none"/>
                <path d="M40 10 L50 35 L75 40 L50 45 L40 70 L30 45 L5 40 L30 35 Z" fill="url(#grad2)"/>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
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
          <div className="mbti-stat-label">Personality Types</div>
          <div className="mbti-stat-value">16</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="#764ba2"/>
          </svg>
          <div className="mbti-stat-label">Time</div>
          <div className="mbti-stat-value">10-15 min</div>
        </div>
        <div className="mbti-stat-item">
          <svg className="mbti-stat-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="#f093fb"/>
          </svg>
          <div className="mbti-stat-label">Accuracy</div>
          <div className="mbti-stat-value">95%</div>
        </div>
      </div>

      <div className="mbti-name-input-container">
        <input
          className="mbti-name-input-advanced"
          type="text"
          placeholder="Enter your name to begin"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              onStart();
            }
          }}
        />
      </div>

      <button 
        className="mbti-btn-primary" 
        onClick={onStart}
        disabled={!name.trim()}
      >
        <span>🚀 Start Your Assessment</span>
      </button>

      <div className="mbti-particle-container" ref={particlesRef}></div>
    </div>
  );
}

export default MBTIWelcomeScreen;
