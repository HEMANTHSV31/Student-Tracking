/**
 * Student Question Bank Dashboard
 * Displays all assigned MCQ and Coding tasks grouped by status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAssignedTasks } from '../../services/questionBankApi';
import '../../styles/QuestionBankDashboard.css';

const QuestionBankDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState({
    pending: [],
    in_progress: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getMyAssignedTasks();
      if (response.success) {
        setTasks(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (task) => {
    if (task.question_type === 'MCQ') {
      navigate(`/question-bank/mcq/${task.task_id}`);
    } else if (task.question_type === 'Coding') {
      navigate(`/question-bank/coding/${task.task_id}`);
    }
  };

  const handleViewHistory = (taskId) => {
    navigate(`/question-bank/history/${taskId}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Pending Review': 'badge badge-warning',
      'Graded': 'badge badge-success',
      'Not Started': 'badge badge-secondary',
      'In Progress': 'badge badge-info'
    };
    return badges[status] || 'badge badge-secondary';
  };

  const getDifficultyBadge = (difficulty) => {
    const badges = {
      'Easy': 'badge-success',
      'Medium': 'badge-warning',
      'Hard': 'badge-danger'
    };
    return badges[difficulty] || 'badge-secondary';
  };

  const renderTaskCard = (task) => (
    <div key={task.task_id} className="task-card">
      <div className="task-header">
        <div className="task-title-section">
          <h4 className="task-title">{task.skill_name || 'Untitled'}</h4>
          <div className="task-badges">
            <span className={`badge ${getDifficultyBadge(task.difficulty)}`}>
              {task.difficulty || 'Medium'}
            </span>
            <span className={`badge ${task.question_type === 'MCQ' ? 'badge-primary' : 'badge-info'}`}>
              {task.question_type}
            </span>
            {task.latest_status && (
              <span className={getStatusBadge(task.latest_status)}>
                {task.latest_status}
              </span>
            )}
          </div>
        </div>
        <div className="task-score">
          {task.best_score !== null && (
            <div className="score-display">
              <span className="score-label">Best Score:</span>
              <span className={`score-value ${task.best_score >= 50 ? 'score-pass' : 'score-fail'}`}>
                {task.best_score}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="task-meta">
        <div className="task-info">
          <span className="info-label">Course:</span>
          <span className="info-value">{task.course_name || 'N/A'}</span>
        </div>
        <div className="task-info">
          <span className="info-label">Venue:</span>
          <span className="info-value">{task.venue_name || 'N/A'}</span>
        </div>
        <div className="task-info">
          <span className="info-label">Attempts:</span>
          <span className="info-value">{task.attempt_count || 0}</span>
        </div>
        {task.assigned_date && (
          <div className="task-info">
            <span className="info-label">Assigned:</span>
            <span className="info-value">{new Date(task.assigned_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {task.latest_feedback && (
        <div className="task-feedback">
          <strong>Latest Feedback:</strong>
          <p>{task.latest_feedback}</p>
        </div>
      )}

      <div className="task-actions">
        <button
          className="btn btn-primary"
          onClick={() => handleStartTask(task)}
          disabled={task.latest_status === 'Pending Review'}
        >
          {task.attempt_count > 0 ? 'Retry' : 'Start'}
        </button>
        {task.attempt_count > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => handleViewHistory(task.task_id)}
          >
            View History ({task.attempt_count})
          </button>
        )}
      </div>
    </div>
  );

  const renderTasksTab = (status, tasksArray) => (
    <div className="tasks-grid">
      {tasksArray.length === 0 ? (
        <div className="empty-state">
          <p>No tasks in this category</p>
        </div>
      ) : (
        tasksArray.map(renderTaskCard)
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="question-bank-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="question-bank-dashboard">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={fetchTasks}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabCounts = {
    pending: tasks.pending?.length || 0,
    in_progress: tasks.in_progress?.length || 0,
    completed: tasks.completed?.length || 0
  };

  return (
    <div className="question-bank-dashboard">
      <div className="dashboard-header">
        <h2>My Question Bank</h2>
        <p className="dashboard-subtitle">
          Complete assigned tasks to improve your skills
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{tabCounts.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tabCounts.in_progress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tabCounts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {tabCounts.pending + tabCounts.in_progress + tabCounts.completed}
          </div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({tabCounts.pending})
        </button>
        <button
          className={`tab ${activeTab === 'in_progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('in_progress')}
        >
          In Progress ({tabCounts.in_progress})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({tabCounts.completed})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'pending' && renderTasksTab('pending', tasks.pending)}
        {activeTab === 'in_progress' && renderTasksTab('in_progress', tasks.in_progress)}
        {activeTab === 'completed' && renderTasksTab('completed', tasks.completed)}
      </div>
    </div>
  );
};

export default QuestionBankDashboard;
