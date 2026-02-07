/**
 * Submission History Component
 * Displays all attempts for a specific task with scores and feedback
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMySubmissionHistory } from '../../services/questionBankApi';
import '../../styles/SubmissionHistory.css';

const SubmissionHistory = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubmission, setExpandedSubmission] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [taskId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await getMySubmissionHistory(taskId);
      
      if (response.success) {
        setHistory(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load submission history');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubmission = (submissionId) => {
    setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Graded': 'badge-success',
      'Pending Review': 'badge-warning',
      'In Progress': 'badge-info'
    };
    return badges[status] || 'badge-secondary';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 50) return 'score-pass';
    return 'score-fail';
  };

  if (loading) {
    return (
      <div className="submission-history">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submission history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="submission-history">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  if (!history || history.submissions.length === 0) {
    return (
      <div className="submission-history">
        <div className="empty-state">
          <h3>No Submissions Yet</h3>
          <p>You haven't submitted any answers for this task.</p>
          <button className="btn btn-primary" onClick={() => navigate('/question-bank')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-history">
      <div className="history-header">
        <button className="btn-back" onClick={() => navigate('/question-bank')}>
          ← Back
        </button>
        <div className="task-info">
          <h2>{history.task.skill_name}</h2>
          <div className="task-badges">
            <span className={`badge badge-${history.task.difficulty?.toLowerCase() || 'medium'}`}>
              {history.task.difficulty || 'Medium'}
            </span>
            <span className={`badge ${history.task.question_type === 'MCQ' ? 'badge-primary' : 'badge-info'}`}>
              {history.task.question_type}
            </span>
          </div>
        </div>
      </div>

      <div className="history-stats">
        <div className="stat-card">
          <div className="stat-label">Total Attempts</div>
          <div className="stat-value">{history.submissions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Best Score</div>
          <div className={`stat-value ${getScoreBadge(history.task.best_score || 0)}`}>
            {history.task.best_score !== null ? `${history.task.best_score}%` : 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latest Score</div>
          <div className={`stat-value ${getScoreBadge(history.task.latest_score || 0)}`}>
            {history.task.latest_score !== null ? `${history.task.latest_score}%` : 'N/A'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value">
            <span className={`badge ${getStatusBadge(history.task.latest_status)}`}>
              {history.task.latest_status}
            </span>
          </div>
        </div>
      </div>

      <div className="submissions-list">
        <h3>All Submissions</h3>
        {history.submissions.map((submission, index) => (
          <div key={submission.submission_id} className="submission-card">
            <div
              className="submission-header"
              onClick={() => toggleSubmission(submission.submission_id)}
            >
              <div className="submission-info">
                <div className="submission-title">
                  <strong>Attempt {history.submissions.length - index}</strong>
                  <span className="submission-date">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                </div>
                <div className="submission-meta">
                  <span className={`badge ${getStatusBadge(submission.status)}`}>
                    {submission.status}
                  </span>
                  {submission.score !== null && (
                    <span className={`score-badge ${getScoreBadge(submission.score)}`}>
                      {submission.score}%
                    </span>
                  )}
                </div>
              </div>
              <div className="expand-icon">
                {expandedSubmission === submission.submission_id ? '▼' : '▶'}
              </div>
            </div>

            {expandedSubmission === submission.submission_id && (
              <div className="submission-details">
                {history.task.question_type === 'MCQ' && (
                  <div className="mcq-details">
                    <div className="detail-row">
                      <strong>Selected Answer:</strong>
                      <span>Option {submission.selected_option}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Correct:</strong>
                      <span className={submission.is_correct ? 'text-success' : 'text-danger'}>
                        {submission.is_correct ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                  </div>
                )}

                {history.task.question_type === 'Coding' && submission.code_solution && (
                  <div className="code-details">
                    <strong>Submitted Code:</strong>
                    <pre className="code-preview">
                      <code>{submission.code_solution}</code>
                    </pre>
                  </div>
                )}

                {submission.feedback && (
                  <div className="feedback-section">
                    <strong>Feedback:</strong>
                    <p className="feedback-text">{submission.feedback}</p>
                  </div>
                )}

                {submission.graded_by_name && (
                  <div className="grading-info">
                    <small>
                      Graded by {submission.graded_by_name} on{' '}
                      {submission.graded_at ? new Date(submission.graded_at).toLocaleString() : 'N/A'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="history-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            if (history.task.question_type === 'MCQ') {
              navigate(`/question-bank/mcq/${taskId}`);
            } else {
              navigate(`/question-bank/coding/${taskId}`);
            }
          }}
          disabled={history.task.latest_status === 'Pending Review'}
        >
          {history.task.latest_status === 'Pending Review' ? 'Awaiting Review' : 'Try Again'}
        </button>
      </div>
    </div>
  );
};

export default SubmissionHistory;
