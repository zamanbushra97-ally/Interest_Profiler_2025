// components/RIASECQuiz.jsx
import React, { useState, useEffect } from 'react';
import { riasecStart, riasecCapture, riasecResult } from '../api';
import RIASECWelcomeScreen from './RIASECWelcomeScreen';
import QuestionCardRiasec from './QuestionCardRiasec';
import ResultCardRiasec from './ResultCardRiasec';
import './RIASECQuiz.css';

const RIASEC_STORAGE_KEY = 'riasecQuizState';

function RIASECQuiz() {
  // Load initial state from localStorage
  const loadState = () => {
    try {
      const saved = localStorage.getItem(RIASEC_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          sessionID: parsed.sessionID || null,
          question: parsed.question || null,
          result: parsed.result || null,
        };
      }
    } catch (e) {
      console.error('Failed to load RIASEC state:', e);
    }
    return { sessionID: null, question: null, result: null };
  };

  const initialState = loadState();
  const [sessionID, setSessionID] = useState(initialState.sessionID);
  const [question, setQuestion] = useState(initialState.question);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialState.result);
  const [error, setError] = useState(null);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      sessionID,
      question,
      result,
    };
    localStorage.setItem(RIASEC_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [sessionID, question, result]);

  const beginQuiz = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await riasecStart("User");
      console.log("RIASEC start response:", response);
      if (response && response.sessionID) {
        setSessionID(response.sessionID);
        setQuestion(response);
      } else {
        throw new Error("Invalid response from server: missing sessionID");
      }
    } catch (error) {
      console.error("Failed to start RIASEC quiz", error);
      setError(error.message || "Failed to start quiz. Please check if the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const answerQuiz = async (value) => {
    if (!sessionID || !question) return;
    setLoading(true);
    setError(null);
    try {
      // api.js expects (sessionID, questionID, value)
      const next = await riasecCapture(sessionID, question.questionID, value);

      if (next.sentinel === 1 || next.result_ready) {
        const res = await riasecResult(sessionID);
        setResult(res);
        setQuestion(null);
        // Store RIASEC results in localStorage for use in MBTI ResultCard
        localStorage.setItem("riasecResult", JSON.stringify(res));
      } else {
        setQuestion(next);
      }
      // State will be saved automatically via useEffect
    } catch (error) {
      console.error("Failed to submit RIASEC response", error);
      const errorMessage = error.message || "Failed to submit answer. Please try again.";
      
      // Check if it's a session expiration error (404 or session not found)
      if (errorMessage.includes("Session expired") || 
          errorMessage.includes("Session not found") || 
          errorMessage.includes("404") ||
          errorMessage.toLowerCase().includes("session")) {
        // Clear the expired session and reset to welcome screen
        console.log("Session expired - clearing state and resetting quiz");
        localStorage.removeItem(RIASEC_STORAGE_KEY);
        localStorage.removeItem('riasecResult');
        // Clear all state to show welcome screen
        setError("Your quiz session has expired. The backend may have restarted. Please click 'Start Your Assessment' to begin again.");
        setSessionID(null);
        setQuestion(null);
        setResult(null);
        setLoading(false);
        return; // Exit early, welcome screen will show
      } else {
        setError(errorMessage);
        setQuestion(question); // Keep the current question so user can retry
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    // Clear all quiz state
    localStorage.removeItem(RIASEC_STORAGE_KEY);
    localStorage.removeItem('riasecResult');
    
    // Reset all state to show welcome screen
    setSessionID(null);
    setQuestion(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="riasec-quiz">
      {!sessionID && !question && !result && !loading && (
        <div>
          <RIASECWelcomeScreen onStart={beginQuiz} />
          {error && (
            <div className="riasec-error" style={{ maxWidth: '1000px', margin: '20px auto' }}>
              Error: {error}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="riasec-loading">
          <div>Loading...</div>
        </div>
      )}

      {error && sessionID && !question && (
        <div className="riasec-error" style={{ maxWidth: '1000px', margin: '20px auto' }}>
          Error: {error}
          <button
            className="riasec-error-button"
            onClick={() => {
              setError(null);
              setSessionID(null);
              setQuestion(null);
              setResult(null);
              localStorage.removeItem(RIASEC_STORAGE_KEY);
              localStorage.removeItem('riasecResult');
            }}
          >
            Restart Quiz
          </button>
        </div>
      )}

      {error && sessionID && question && (
        <div className="riasec-error" style={{ maxWidth: '1000px', margin: '20px auto', marginBottom: '20px' }}>
          Error: {error}
          <button
            className="riasec-error-button"
            onClick={() => {
              setError(null);
            }}
            style={{ marginLeft: '10px', fontSize: '0.9rem', padding: '8px 16px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {!loading && question && (
        <QuestionCardRiasec question={question} onAnswer={answerQuiz} />
      )}

      {!loading && !question && result && (
        <ResultCardRiasec result={result} onRestart={handleRestart} />
      )}
    </div>
  );
}

export default RIASECQuiz;