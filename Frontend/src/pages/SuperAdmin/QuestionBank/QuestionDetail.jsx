import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './QuestionDetail.css';

const QuestionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/questions/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setQuestion(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching question:', err);
      setError('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/question-bank/questions/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Question deleted successfully');
      navigate('/admin/question-bank/questions');
    } catch (err) {
      console.error('Error deleting question:', err);
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div className="question-detail-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="question-detail-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>{error || 'Question not found'}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/admin/question-bank/questions')}>
            Back to Questions
          </button>
        </div>
      </div>
    );
  }

  const parsedOptions = question.mcq_options ? JSON.parse(question.mcq_options) : null;
  const parsedTestCases = question.coding_test_cases ? JSON.parse(question.coding_test_cases) : null;

  return (
    <div className="question-detail-container">
      {/* Header */}
      <div className="detail-header">
        <div>
          <div className="breadcrumb">
            <span onClick={() => navigate('/admin/question-bank')}>Dashboard</span>
            <span className="separator">›</span>
            <span onClick={() => navigate('/admin/question-bank/questions')}>Questions</span>
            <span className="separator">›</span>
            <span className="active">View Question</span>
          </div>
          <h1>{question.title}</h1>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/admin/question-bank/questions/${id}/edit`)}
          >
            ✏️ Edit
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="metadata-section">
        <div className="metadata-card">
          <span className="label">Course</span>
          <span className="course-badge">{question.course_name}</span>
        </div>
        <div className="metadata-card">
          <span className="label">Type</span>
          <span className={`type-badge ${question.question_type}`}>
            {question.question_type === 'mcq' ? '✅ MCQ' : '💻 Coding'}
          </span>
        </div>
        <div className="metadata-card">
          <span className="label">Difficulty</span>
          <span className={`difficulty-badge ${question.difficulty_level.toLowerCase()}`}>
            {question.difficulty_level}
          </span>
        </div>
        <div className="metadata-card">
          <span className="label">Max Score</span>
          <span className="value">{question.max_score} pts</span>
        </div>
        <div className="metadata-card">
          <span className="label">Time Limit</span>
          <span className="value">{question.time_limit_minutes} min</span>
        </div>
        <div className="metadata-card">
          <span className="label">Status</span>
          <span className={`status-badge ${question.status.toLowerCase()}`}>
            {question.status}
          </span>
        </div>
      </div>

      {/* Description */}
      {question.description && (
        <div className="detail-section">
          <h2 className="section-title">Description</h2>
          <div className="description-content">
            {question.description}
          </div>
        </div>
      )}

      {/* MCQ Details */}
      {question.question_type === 'mcq' && parsedOptions && (
        <div className="detail-section">
          <h2 className="section-title">MCQ Options</h2>
          <div className="mcq-options">
            {['option_a', 'option_b', 'option_c', 'option_d'].map((key, idx) => {
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              const isCorrect = question.mcq_correct_answer === letter;
              return (
                <div
                  key={key}
                  className={`mcq-option ${isCorrect ? 'correct' : ''}`}
                >
                  <span className="option-letter">{letter}</span>
                  <span className="option-text">{parsedOptions[key]}</span>
                  {isCorrect && <span className="correct-indicator">✓ Correct Answer</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coding Details */}
      {question.question_type === 'coding' && (
        <>
          <div className="detail-section">
            <h2 className="section-title">Programming Language</h2>
            <span className="language-badge">{question.coding_language}</span>
          </div>

          {question.coding_starter_code && (
            <div className="detail-section">
              <h2 className="section-title">Starter Code</h2>
              <pre className="code-block">
                <code>{question.coding_starter_code}</code>
              </pre>
            </div>
          )}

          {question.coding_solution_code && (
            <div className="detail-section">
              <h2 className="section-title">Solution Code (Faculty Only)</h2>
              <pre className="code-block solution">
                <code>{question.coding_solution_code}</code>
              </pre>
            </div>
          )}

          {parsedTestCases && parsedTestCases.length > 0 && (
            <div className="detail-section">
              <h2 className="section-title">Test Cases</h2>
              <div className="test-cases">
                {parsedTestCases.map((testCase, idx) => (
                  <div key={idx} className="test-case-card">
                    <div className="test-case-header">
                      <h4>Test Case {idx + 1}</h4>
                      {testCase.is_hidden && (
                        <span className="hidden-badge">🔒 Hidden</span>
                      )}
                    </div>
                    <div className="test-case-content">
                      <div className="test-case-field">
                        <strong>Input:</strong>
                        <pre className="code-inline"><code>{testCase.input}</code></pre>
                      </div>
                      <div className="test-case-field">
                        <strong>Expected Output:</strong>
                        <pre className="code-inline"><code>{testCase.expected_output}</code></pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Timestamps */}
      <div className="detail-section timestamps">
        <div className="timestamp-item">
          <span className="label">Created At:</span>
          <span className="value">{new Date(question.created_at).toLocaleString()}</span>
        </div>
        {question.updated_at && (
          <div className="timestamp-item">
            <span className="label">Last Updated:</span>
            <span className="value">{new Date(question.updated_at).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionDetail;
