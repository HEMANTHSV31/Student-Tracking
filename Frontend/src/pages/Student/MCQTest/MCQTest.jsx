/**
 * MCQ Test Interface
 * Component for students to take MCQ tests with timer and auto-submit
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../../utils/api';
import './MCQTest.css';

const MCQTest = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  
  const timerRef = useRef(null);

  useEffect(() => {
    fetchTestData();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [taskId]);

  useEffect(() => {
    if (testStarted && timeRemaining !== null && timeRemaining > 0 && !showResult) {
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
  }, [timeRemaining, showResult, testStarted]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      // Fetch task details
      const taskResponseRaw = await apiGet(`/tasks/student/${taskId}`);
      const taskResponse = await taskResponseRaw.json();
      console.log('Task Response:', taskResponse);
      
      if (!taskResponse.success) {
        setError('Failed to load test details');
        return;
      }

      const taskData = taskResponse.data;
      
      // Verify this is an MCQ test
      if (taskData.taskType !== 'code_practice' || taskData.questionType !== 'mcq') {
        setError('This is not an MCQ test');
        return;
      }

      setTask(taskData);

      // Fetch assigned questions
      const questionsResponseRaw = await apiGet(`/tasks/${taskId}/questions`);
      console.log('Questions Response Raw Status:', questionsResponseRaw.status);
      const questionsResponse = await questionsResponseRaw.json();
      console.log('Questions Response:', questionsResponse);
      
      if (!questionsResponse.success) {
        setError(questionsResponse.message || 'Failed to load questions');
        console.error('Questions API Error:', questionsResponse);
        return;
      }
      
      if (!questionsResponse.data || questionsResponse.data.length === 0) {
        setError('No questions assigned for this test');
        return;
      }

      const mcqQuestions = questionsResponse.data.map(q => {
        console.log('Processing question:', q);
        let options = [];
        try {
          // sample_answer contains mcq_options as JSON string
          if (typeof q.sample_answer === 'string') {
            options = JSON.parse(q.sample_answer);
          } else if (Array.isArray(q.sample_answer)) {
            options = q.sample_answer;
          } else {
            console.warn('Unexpected sample_answer format:', q.sample_answer);
            options = [];
          }
        } catch (error) {
          console.error('Error parsing question options:', error, q.sample_answer);
          options = [];
        }
        
        return {
          id: q.question_id,
          question: q.question_text,
          description: q.description,
          options: options,
          correctAnswer: q.correct_answer,
          sample_image: q.sample_image
        };
      });

      console.log('Processed MCQ Questions:', mcqQuestions);
      setQuestions(mcqQuestions);
      
      // Set timer (1 minute per question)
      if (taskData.totalQuestions) {
        setTimeRemaining(mcqQuestions.length * 60);
      }

    } catch (err) {
      console.error('Error loading test:', err);
      setError(err.message || 'Failed to load test. Please try again.');
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

  const handleNextQuestion = () => {
    if (selectedOption !== null) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: selectedOption
      }));
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      const nextQuestion = questions[currentQuestionIndex + 1];
      setSelectedOption(answers[nextQuestion.id] || null);
    }
  };

  const handlePreviousQuestion = () => {
    if (selectedOption !== null) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: selectedOption
      }));
    }
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      const prevQuestion = questions[currentQuestionIndex - 1];
      setSelectedOption(answers[prevQuestion.id] || null);
    }
  };

  const handleNavigateToQuestion = (index) => {
    // Save current answer before navigating
    if (selectedOption !== null) {
      setAnswers(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: selectedOption
      }));
    }
    
    setCurrentQuestionIndex(index);
    const targetQuestion = questions[index];
    setSelectedOption(answers[targetQuestion.id] || null);
  };

  const handleSubmit = async () => {
    // Save current answer first
    const finalAnswers = {
      ...answers,
      ...(selectedOption !== null ? { [questions[currentQuestionIndex].id]: selectedOption } : {})
    };

    if (!confirm('Are you sure you want to submit your test? You won\'t be able to change your answers.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('Submitting answers:', finalAnswers);
      
      // Submit all answers
      const response = await apiPost(`/tasks/${taskId}/submit-mcq`, { 
        answers: finalAnswers,
        timeSpent: task?.totalQuestions ? (questions.length * 60 - timeRemaining) : null
      });
      
      if (response.success) {
        setResult(response.data);
        setShowResult(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      } else {
        alert(response.message || 'Failed to submit test');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to submit test');
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

  // Pre-test instructions
  if (!testStarted && !showResult) {
    return (
      <div className="mcq-test">
        <div className="test-instructions">
          <h1>{task?.title || 'MCQ Test'}</h1>
          <div className="instructions-content">
            <h3>Test Instructions:</h3>
            <ul>
              <li>This test contains {questions.length} multiple choice questions</li>
              <li>You have {formatTime(timeRemaining)} to complete the test</li>
              <li>You can navigate between questions using Next/Previous buttons</li>
              <li>Select one option for each question</li>
              <li>Click Submit when you're done</li>
            </ul>
            <button 
              className="btn btn-primary btn-lg" 
              onClick={() => setTestStarted(true)}
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="mcq-test">
      <div className="test-header">
        <div className="test-info">
          <h2>{task?.title || 'MCQ Test'}</h2>
          <div className="test-meta">
            <span className="badge">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
        {timeRemaining !== null && testStarted && (
          <div className={`timer ${timeRemaining < 60 ? 'timer-warning' : ''}`}>
            <span className="timer-icon">⏱</span>
            <span className="timer-value">{formatTime(timeRemaining)}</span>
          </div>
        )}
        
        <div className="question-navigator">
          <h4>Questions</h4>
          <div className="question-nav-grid">
            {questions.map((q, index) => (
              <div
                key={index}
                className={`question-nav-item ${
                  index === currentQuestionIndex ? 'active' : ''
                } ${answers[q.id] !== undefined ? 'answered' : ''}`}
                onClick={() => handleNavigateToQuestion(index)}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="nav-legend">
            <div className="nav-legend-item">
              <div className="nav-legend-dot answered"></div>
              <span>Answered</span>
            </div>
            <div className="nav-legend-item">
              <div className="nav-legend-dot current"></div>
              <span>Current</span>
            </div>
            <div className="nav-legend-item">
              <div className="nav-legend-dot unanswered"></div>
              <span>Not Answered</span>
            </div>
          </div>
        </div>
      </div>

      <div className="test-content">
        <div className="question-section">
          <div className="question-text">
            <h3>Question {currentQuestionIndex + 1}:</h3>
            <p>{currentQuestion.question}</p>
            {currentQuestion.description && (
              <p className="question-description">{currentQuestion.description}</p>
            )}
          </div>

          {currentQuestion.sample_image && (
            <div className="question-image">
              <img src={currentQuestion.sample_image} alt="Question illustration" />
            </div>
          )}

          <div className="options-container">
            <h4>Select your answer:</h4>
            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              currentQuestion.options.map((option, index) => {
                const optionId = typeof option === 'object' && option.id ? option.id : String.fromCharCode(65 + index); // A, B, C, D
                return (
                  <div
                    key={index}
                    className={`option-card ${selectedOption === optionId ? 'selected' : ''}`}
                    onClick={() => !submitting && setSelectedOption(optionId)}
                  >
                    <span className="option-label">
                      {optionId}
                    </span>
                    <p className="option-text">
                      {typeof option === 'object' && option.text ? option.text : option}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="no-options">No options available</p>
            )}
          </div>
        </div>
      </div>

      <div className="test-footer">
        <div className="navigation-buttons">
          <button
            className="btn btn-secondary"
            onClick={handlePreviousQuestion}
            disabled={isFirstQuestion || submitting}
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleBackToDashboard}
            disabled={submitting}
          >
            Cancel
          </button>
          {!isLastQuestion ? (
            <button
              className="btn btn-primary"
              onClick={handleNextQuestion}
              disabled={submitting}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MCQTest;
