/**
 * MCQ Test Interface
 * Component for students to take MCQ tests with timer and auto-submit
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskQuestion, submitMCQAnswer } from '../../services/questionBankApi';
import '../../styles/MCQTest.css';

const MCQTest = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuestion();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [taskId]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !showResult) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, showResult]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await getTaskQuestion(taskId);
      
      if (response.success) {
        setQuestion(response.data);
        // Set timer if time limit specified (in minutes)
        if (response.data.time_limit) {
          setTimeRemaining(response.data.time_limit * 60);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (!selectedOption) {
      alert('Time\'s up! No answer was selected.');
      navigate('/tasks');
      return;
    }
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!selectedOption) {
      alert('Please select an answer before submitting.');
      return;
    }

    if (!confirm('Are you sure you want to submit your answer?')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitMCQAnswer(taskId, selectedOption);
      
      if (response.success) {
        setResult(response.data);
        setShowResult(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBackToDashboard = () => {
    navigate('/tasks');
  };

  if (loading) {
    return (
      <div className="mcq-test">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mcq-test">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="mcq-test">
        <div className="result-container">
          <div className={`result-card ${result.is_correct ? 'result-success' : 'result-failure'}`}>
            <div className="result-icon">
              {result.is_correct ? '✓' : '✗'}
            </div>
            <h2 className="result-title">
              {result.is_correct ? 'Correct Answer!' : 'Incorrect Answer'}
            </h2>
            <div className="result-score">
              Score: <strong>{result.score}%</strong>
            </div>
            {result.explanation && (
              <div className="result-explanation">
                <h4>Explanation:</h4>
                <p>{result.explanation}</p>
              </div>
            )}
            {!result.is_correct && result.correct_option && (
              <div className="correct-answer-info">
                <p><strong>Correct Answer:</strong> Option {result.correct_option}</p>
              </div>
            )}
            <div className="result-actions">
              <button className="btn btn-primary" onClick={handleBackToDashboard}>
                Back to Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mcq-test">
      <div className="test-header">
        <div className="test-info">
          <h2>{question.skill_name}</h2>
          <div className="test-meta">
            <span className={`badge badge-${question.difficulty?.toLowerCase() || 'medium'}`}>
              {question.difficulty || 'Medium'}
            </span>
            <span className="badge badge-primary">MCQ</span>
          </div>
        </div>
        {timeRemaining !== null && (
          <div className={`timer ${timeRemaining < 60 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱</span>
            <span className="timer-value">{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      <div className="test-content">
        <div className="question-section">
          <div className="question-text">
            <h3>Question:</h3>
            <p>{question.question_text}</p>
          </div>

          {question.code_snippet && (
            <div className="code-snippet">
              <h4>Code Snippet:</h4>
              <pre>
                <code>{question.code_snippet}</code>
              </pre>
            </div>
          )}

          <div className="options-container">
            <h4>Select your answer:</h4>
            {[
              { num: 1, text: question.option_1 },
              { num: 2, text: question.option_2 },
              { num: 3, text: question.option_3 },
              { num: 4, text: question.option_4 },
            ].map((option) => (
              <div
                key={option.num}
                className={`option-card ${selectedOption === option.num ? 'selected' : ''}`}
                onClick={() => !submitting && setSelectedOption(option.num)}
              >
                <div className="option-radio">
                  <input
                    type="radio"
                    name="mcq-option"
                    checked={selectedOption === option.num}
                    onChange={() => setSelectedOption(option.num)}
                    disabled={submitting}
                  />
                </div>
                <div className="option-content">
                  <span className="option-label">Option {option.num}</span>
                  <p className="option-text">{option.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="test-footer">
        <button
          className="btn btn-secondary"
          onClick={handleBackToDashboard}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={submitting || !selectedOption}
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
};

export default MCQTest;
