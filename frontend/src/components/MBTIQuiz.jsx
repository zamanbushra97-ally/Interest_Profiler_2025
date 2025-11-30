// components/MBTIQuiz.jsx
import React, { useState, useEffect } from 'react';
import { mbtiStart, mbtiCapture, mbtiResult } from '../api';
import MBTIWelcomeScreen from './MBTIWelcomeScreen';
import QuestionCard from './QuestionCard';
import ResultCard from './ResultCard';
import './MBTIQuiz.css';

const MBTI_STORAGE_KEY = 'mbtiQuizState';

function MBTIQuiz() {
  // Load initial state from localStorage
  const loadState = () => {
    try {
      const saved = localStorage.getItem(MBTI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          userID: parsed.userID || '',
          sessionID: parsed.sessionID || null,
          question: parsed.question || null,
          result: parsed.result || null,
        };
      }
    } catch (e) {
      console.error('Failed to load MBTI state:', e);
    }
    return { userID: '', sessionID: null, question: null, result: null };
  };

  const initialState = loadState();
  const [userID, setUserID] = useState(initialState.userID);
  const [sessionID, setSessionID] = useState(initialState.sessionID);
  const [question, setQuestion] = useState(initialState.question);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialState.result);
  const [error, setError] = useState(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      userID,
      sessionID,
      question,
      result,
    };
    localStorage.setItem(MBTI_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [userID, sessionID, question, result]);

  const beginQuiz = async () => {
    if (!userID.trim()) {
      alert('Enter your name');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    // Store quiz start time
    const quizStartTime = Date.now();
    localStorage.setItem('mbtiQuizStartTime', quizStartTime.toString());
    localStorage.setItem('mbtiQuestionsAnswered', '0');
    try {
      const response = await mbtiStart(userID.trim());
      console.log('MBTI start response:', response);
      if (response && response.sessionID) {
        setSessionID(response.sessionID);
        setQuestion(response);
      } else {
        throw new Error('Invalid response from server: missing sessionID');
      }
    } catch (error) {
      console.error('Failed to start MBTI quiz', error);
      setError(error.message || 'Failed to start quiz. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const answerQuiz = async (ans) => {
    if (!sessionID || !question) return;
    setLoading(true);
    setError(null);
    try {
      // Increment questions answered counter
      const currentCount = parseInt(localStorage.getItem('mbtiQuestionsAnswered') || '0', 10);
      localStorage.setItem('mbtiQuestionsAnswered', (currentCount + 1).toString());
      
      // api.js expects (sessionID, questionID, answer) - not an object
      const next = await mbtiCapture(sessionID, question.questionID, ans);
      console.log('MBTI next question response:', next);

      if (next && (next.sentinel === 1 || next.result_ready)) {
        const res = await mbtiResult(sessionID);
        console.log('MBTI result:', res);
        // Add questions answered count to result
        const questionsAnswered = parseInt(localStorage.getItem('mbtiQuestionsAnswered') || '0', 10);
        res.total_questions = questionsAnswered;
        setResult(res);
        setQuestion(null);
      } else if (next && next.questionID) {
        // Valid next question
        setQuestion(next);
      } else {
        console.error('Unexpected response format:', next);
        throw new Error('Unexpected response from server. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit MBTI response', error);
      setError(error.message || 'Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    // Clear all quiz state
    localStorage.removeItem(MBTI_STORAGE_KEY);
    localStorage.removeItem('mbtiQuizStartTime');
    localStorage.removeItem('mbtiQuestionsAnswered');
    localStorage.removeItem('riasecQuizState');
    localStorage.removeItem('riasecResult');
    
    // Reset all state to show welcome screen
    setUserID('');
    setSessionID(null);
    setQuestion(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="mbti-quiz">
      {/* Background Layer */}
      <div className="mbti-background-layer">
        <div className="mbti-gradient-orb mbti-orb-1"></div>
        <div className="mbti-gradient-orb mbti-orb-2"></div>
        <div className="mbti-gradient-orb mbti-orb-3"></div>
        <div className="mbti-grid-overlay"></div>
        <div className="mbti-particle-container" id="mbti-particles"></div>
        <div className="mbti-floating-figures">
          <div className="mbti-figure mbti-figure-1">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="40" r="20" fill="#667eea" opacity="0.3" />
              <rect x="45" y="65" width="30" height="40" rx="5" fill="#667eea" opacity="0.3" />
              <circle cx="50" cy="75" r="3" fill="white" opacity="0.5" />
              <circle cx="70" cy="75" r="3" fill="white" opacity="0.5" />
            </svg>
          </div>
          <div className="mbti-figure mbti-figure-2">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 L60 40 L90 45 L65 65 L72 95 L50 80 L28 95 L35 65 L10 45 L40 40 Z" fill="#764ba2" opacity="0.3" />
            </svg>
          </div>
          <div className="mbti-figure mbti-figure-3">
            <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="55" cy="55" r="30" stroke="#f093fb" strokeWidth="3" fill="none" opacity="0.3" />
              <circle cx="55" cy="55" r="15" fill="#f093fb" opacity="0.3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="mbti-content-wrapper">
        <div className="mbti-quiz-card">
          <div className="mbti-card-glow"></div>
          <div className="mbti-inner-content">
            {!sessionID && !question && !result && !loading && (
              <MBTIWelcomeScreen
                name={userID}
                onNameChange={setUserID}
                onStart={beginQuiz}
              />
            )}

            {loading && (
              <div className="mbti-loading">
                <div>Loading...</div>
              </div>
            )}

            {error && (
              <div className="mbti-error">
                Error: {error}
                {sessionID && (
                  <button
                    className="mbti-error-button"
                    onClick={() => {
                      setError(null);
                      setSessionID(null);
                      setQuestion(null);
                      setResult(null);
                      setUserID('');
                      localStorage.removeItem(MBTI_STORAGE_KEY);
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {!loading && question && (
              <QuestionCard question={question} onAnswer={answerQuiz} />
            )}

            {!loading && !question && result && (
              <ResultCard result={result} onRestart={handleRestart} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MBTIQuiz;
