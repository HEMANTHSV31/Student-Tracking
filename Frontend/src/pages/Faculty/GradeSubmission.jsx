/**
 * Faculty Grade Submission Component
 * View student code and grade coding submissions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmissionDetails, gradeSubmission } from '../../services/questionBankApi';
import { apiGet, apiPut } from '../../utils/api';
import Editor from '@monaco-editor/react';
import '../../styles/GradeSubmission.css';

const GradeSubmission = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showTestCases, setShowTestCases] = useState(false);
  const [submissionType, setSubmissionType] = useState(null); // 'question-bank', 'coding', or 'web'

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      
      // Try coding submission from student_submissions table first
      try {
        const codingResponse = await apiGet(`/tasks/code-submission/${submissionId}`);
        const codingData = await codingResponse.json();
        if (codingData.success) {
          setSubmissionType('coding');
          setSubmission({
            ...codingData.data,
            code: codingData.data.coding_content,
            language: codingData.data.programming_language || 'javascript'
          });
          if (codingData.data.feedback) {
            setFeedback(codingData.data.feedback);
          }
          if (codingData.data.grade !== null) {
            setScore(codingData.data.grade.toString());
          }
          setLoading(false);
          return;
        }
      } catch (codingErr) {
        // Not a coding submission, try question bank
      }
      
      // Fall back to question bank submission
      const response = await getSubmissionDetails(submissionId);
      if (response.success) {
        setSubmissionType('question-bank');
        setSubmission(response.data);
        if (response.data.feedback) {
          setFeedback(response.data.feedback);
        }
        if (response.data.score !== null) {
          setScore(response.data.score.toString());
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();

    const scoreValue = parseInt(score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
      alert('Please enter a valid score between 0 and 100');
      return;
    }

    if (!feedback.trim()) {
      if (!confirm('You haven\'t provided any feedback. Continue without feedback?')) {
        return;
      }
    }

    if (!confirm('Are you sure you want to submit this grade? This action cannot be undone.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      let response;
      if (submissionType === 'coding') {
        // Grade coding submission using student_submissions table
        const gradeResponse = await apiPut(`/tasks/code-submission/${submissionId}/grade`, {
          grade: scoreValue,
          feedback: feedback,
          status: scoreValue >= 50 ? 'Graded' : 'Needs Revision'
        });
        response = await gradeResponse.json();
      } else {
        // Use question bank grading for question-bank submissions
        response = await gradeSubmission(submissionId, scoreValue, feedback);
      }
      
      if (response.success) {
        const message = response.data?.reassigned
          ? `Grade submitted successfully! Student scored ${scoreValue}% (below 50%), so a new question has been assigned automatically.`
          : `Grade submitted successfully! Student scored ${scoreValue}%.`;
        
        // Show success message
        const confirmMsg = confirm(message + '\n\nClick OK to return to pending submissions.');
        if (confirmMsg) {
          navigate('/faculty/question-bank/pending');
        }
      }
    } catch (err) {
      const errorMsg = err.message.includes('<!DOCTYPE') 
        ? 'Backend server is not running. Please start the server with: node server/index.js'
        : err.message || 'Failed to submit grade';
      alert('Error: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreClass = (scoreValue) => {
    if (scoreValue >= 80) return 'score-excellent';
    if (scoreValue >= 50) return 'score-pass';
    return 'score-fail';
  };

  if (loading) {
    return (
      <div className="grade-submission">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grade-submission">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/faculty/question-bank/pending')}>
            Back to Pending Submissions
          </button>
        </div>
      </div>
    );
  }

  const testCases = submission.test_cases ? JSON.parse(submission.test_cases) : [];

  return (
    <div className="grade-submission">
      <div className="grade-header">
        <button className="btn-back" onClick={() => navigate('/faculty/question-bank/pending')}>
          ← Back to Pending
        </button>
        <div className="submission-info">
          <h2>Grade Submission</h2>
          <div className="student-details">
            <span className="student-name">{submission.student_name}</span>
            <span className="roll-number">({submission.roll_number})</span>
            <span className="submitted-date">
              Submitted: {new Date(submission.submitted_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="grade-layout">
        <div className="problem-panel">
          <div className="panel-tabs">
            <button
              className={`tab ${!showTestCases ? 'active' : ''}`}
              onClick={() => setShowTestCases(false)}
            >
              Problem Description
            </button>
            <button
              className={`tab ${showTestCases ? 'active' : ''}`}
              onClick={() => setShowTestCases(true)}
            >
              Test Cases ({testCases.length})
            </button>
          </div>

          <div className="panel-content">
            {!showTestCases ? (
              <div className="problem-section">
                <div className="problem-header">
                  <h3>{submission.skill_name}</h3>
                  <div className="problem-badges">
                    <span className={`badge badge-${submission.difficulty?.toLowerCase() || 'medium'}`}>
                      {submission.difficulty || 'Medium'}
                    </span>
                    <span className="badge badge-info">Coding</span>
                  </div>
                </div>

                <div className="question-section">
                  <h4>Question:</h4>
                  <p>{submission.question_text}</p>
                </div>

                {submission.code_snippet && (
                  <div className="example-section">
                    <h4>Example:</h4>
                    <pre>
                      <code>{submission.code_snippet}</code>
                    </pre>
                  </div>
                )}

                {submission.constraints && (
                  <div className="constraints-section">
                    <h4>Constraints:</h4>
                    <pre>{submission.constraints}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="test-cases-section">
                <h3>Test Cases</h3>
                {testCases.length === 0 ? (
                  <p className="empty-state">No test cases available</p>
                ) : (
                  <div className="test-cases-list">
                    {testCases.map((testCase, index) => (
                      <div key={index} className="test-case-card">
                        <div className="test-case-header">
                          <strong>Test Case {index + 1}</strong>
                        </div>
                        <div className="test-case-content">
                          <div className="test-case-input">
                            <strong>Input:</strong>
                            <pre>{JSON.stringify(testCase.input, null, 2)}</pre>
                          </div>
                          <div className="test-case-output">
                            <strong>Expected Output:</strong>
                            <pre>{JSON.stringify(testCase.expected_output, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="code-panel">
          <div className="code-header">
            <h3>Student's Solution</h3>
            <span className="language-badge">Language: {submission.language || 'python'}</span>
          </div>
          
          <div className="code-editor-container">
            <Editor
              height="400px"
              language={submission.language || 'python'}
              value={submission.code_solution || '// No code submitted'}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          <form className="grading-form" onSubmit={handleSubmitGrade}>
            <div className="form-section">
              <h3>Grading</h3>
              
              <div className="form-group">
                <label htmlFor="score">
                  Score (0-100) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="score"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Enter score"
                  className="form-input"
                  required
                />
                {score && (
                  <div className={`score-preview ${getScoreClass(parseInt(score))}`}>
                    {parseInt(score) >= 50 ? '✓ Pass' : '✗ Fail'} 
                    {parseInt(score) < 50 && ' - Student will be auto-assigned a new question'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feedback">
                  Feedback (Optional)
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  className="form-textarea"
                  rows="6"
                />
                <small className="form-hint">
                  Tip: Explain what was done well and what could be improved
                </small>
              </div>

              <div className="info-box">
                <strong>ℹ️ Grading Policy:</strong>
                <ul>
                  <li>Score ≥ 50%: Student passes this question</li>
                  <li>Score &lt; 50%: A new question will be automatically assigned</li>
                  <li>Student can view feedback after grading</li>
                </ul>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/faculty/question-bank/pending')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={submitting || !score}
                >
                  {submitting ? 'Submitting...' : 'Submit Grade'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GradeSubmission;
