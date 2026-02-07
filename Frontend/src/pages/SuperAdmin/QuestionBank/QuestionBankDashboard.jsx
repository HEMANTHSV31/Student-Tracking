import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './QuestionBankDashboard.css';

const QuestionBankDashboard = () => {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/statistics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError(err.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const { overall, by_course } = statistics || {};

  return (
    <div className="question-bank-dashboard">
      <div className="dashboard-header">
        <h1>Question Bank Dashboard</h1>
        <div className="dashboard-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/question-bank/questions')}
          >
            View All Questions
          </button>
          <button
            className="btn btn-success"
            onClick={() => navigate('/admin/question-bank/questions/create')}
          >
            + Add New Question
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Total Questions</h3>
            <p className="stat-number">{overall?.total_questions || 0}</p>
          </div>
        </div>

        <div className="stat-card mcq">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>MCQ Questions</h3>
            <p className="stat-number">{overall?.mcq_count || 0}</p>
          </div>
        </div>

        <div className="stat-card coding">
          <div className="stat-icon">💻</div>
          <div className="stat-content">
            <h3>Coding Questions</h3>
            <p className="stat-number">{overall?.coding_count || 0}</p>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h3>Active</h3>
            <p className="stat-number">{overall?.active_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div className="section-card">
        <h2>Questions by Difficulty</h2>
        <div className="difficulty-grid">
          <div className="difficulty-item easy">
            <span className="difficulty-label">Easy</span>
            <span className="difficulty-count">{overall?.easy_count || 0}</span>
            <div className="difficulty-bar">
              <div
                className="difficulty-fill easy-fill"
                style={{
                  width: `${
                    overall?.total_questions
                      ? (overall.easy_count / overall.total_questions) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
          </div>

          <div className="difficulty-item medium">
            <span className="difficulty-label">Medium</span>
            <span className="difficulty-count">{overall?.medium_count || 0}</span>
            <div className="difficulty-bar">
              <div
                className="difficulty-fill medium-fill"
                style={{
                  width: `${
                    overall?.total_questions
                      ? (overall.medium_count / overall.total_questions) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
          </div>

          <div className="difficulty-item hard">
            <span className="difficulty-label">Hard</span>
            <span className="difficulty-count">{overall?.hard_count || 0}</span>
            <div className="difficulty-bar">
              <div
                className="difficulty-fill hard-fill"
                style={{
                  width: `${
                    overall?.total_questions
                      ? (overall.hard_count / overall.total_questions) * 100
                      : 0
                  }%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions by Course */}
      <div className="section-card">
        <div className="section-header">
          <h2>Questions by Course</h2>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/admin/question-bank/courses')}
          >
            Manage Courses
          </button>
        </div>

        <div className="course-stats-table">
          <table>
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Category</th>
                <th>Total Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {by_course && by_course.length > 0 ? (
                by_course.map((course) => (
                  <tr key={course.course_id}>
                    <td>{course.course_name}</td>
                    <td>
                      <span className="category-badge">{course.skill_category}</span>
                    </td>
                    <td>
                      <span className="question-count-badge">
                        {course.question_count}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-link"
                        onClick={() =>
                          navigate(
                            `/admin/question-bank/questions?course_id=${course.course_id}`
                          )
                        }
                      >
                        View Questions
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-data">
                    No courses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="section-card">
        <h2>Question Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-circle active-status"></div>
            <span>Active: {overall?.active_count || 0}</span>
          </div>
          <div className="status-item">
            <div className="status-circle inactive-status"></div>
            <span>Inactive: {overall?.inactive_count || 0}</span>
          </div>
          <div className="status-item">
            <div className="status-circle draft-status"></div>
            <span>Draft: {overall?.draft_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankDashboard;
