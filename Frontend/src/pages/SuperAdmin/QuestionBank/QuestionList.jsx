import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './QuestionList.css';

const QuestionList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    course_id: searchParams.get('course_id') || '',
    question_type: searchParams.get('question_type') || '',
    difficulty_level: searchParams.get('difficulty_level') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/courses`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query params
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/question-bank/questions?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setQuestions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const newParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
    });
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setFilters({
      course_id: '',
      question_type: '',
      difficulty_level: '',
      status: '',
      search: ''
    });
    setSearchParams({});
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/question-bank/questions/${questionId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Question deleted successfully');
      fetchQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
      alert(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const getQuestionTypeIcon = (type) => {
    return type === 'mcq' ? '✅' : '💻';
  };

  const getDifficultyClass = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'easy';
      case 'Medium':
        return 'medium';
      case 'Hard':
        return 'hard';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'active';
      case 'Inactive':
        return 'inactive';
      case 'Draft':
        return 'draft';
      default:
        return '';
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="question-list-container">
      <div className="page-header">
        <div>
          <h1>Question Bank</h1>
          <p className="subtitle">Manage MCQ and Coding questions</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-outline"
            onClick={() => navigate('/admin/question-bank')}
          >
            Dashboard
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/question-bank/questions/create')}
          >
            + Create Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Course</label>
            <select
              value={filters.course_id}
              onChange={(e) => handleFilterChange('course_id', e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.question_type}
              onChange={(e) => handleFilterChange('question_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="mcq">MCQ</option>
              <option value="coding">Coding</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Difficulty</label>
            <select
              value={filters.difficulty_level}
              onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by title or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="active-filters">
            <span>Active filters: {activeFilterCount}</span>
            <button className="btn-link" onClick={handleClearFilters}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="results-section">
        <div className="results-header">
          <h3>
            {loading ? 'Loading...' : `${questions.length} Question${questions.length !== 1 ? 's' : ''} Found`}
          </h3>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && questions.length === 0 && (
          <div className="no-questions">
            <div className="no-questions-icon">📝</div>
            <h3>No questions found</h3>
            <p>Try adjusting your filters or create a new question</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/question-bank/questions/create')}
            >
              Create First Question
            </button>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="questions-table">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Score</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.question_id}>
                    <td>
                      <div className="question-title">
                        <span className="question-icon">
                          {getQuestionTypeIcon(question.question_type)}
                        </span>
                        <div>
                          <strong>{question.title}</strong>
                          <small>Created: {new Date(question.created_at).toLocaleDateString()}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="course-tag">{question.course_name}</span>
                    </td>
                    <td>
                      <span className={`type-badge ${question.question_type}`}>
                        {question.question_type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`difficulty-badge ${getDifficultyClass(question.difficulty_level)}`}>
                        {question.difficulty_level}
                      </span>
                    </td>
                    <td className="text-center">{question.max_score}</td>
                    <td className="text-center">{question.time_limit_minutes} min</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(question.status)}`}>
                        {question.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/admin/question-bank/questions/${question.question_id}`)}
                          title="View"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/admin/question-bank/questions/${question.question_id}/edit`)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon delete"
                          onClick={() => handleDelete(question.question_id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionList;
