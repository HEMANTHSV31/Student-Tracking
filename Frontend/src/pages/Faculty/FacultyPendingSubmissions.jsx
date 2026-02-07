/**
 * Faculty Pending Submissions Dashboard
 * Lists all coding submissions awaiting grading
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingSubmissions } from '../../services/questionBankApi';
import '../../styles/FacultySubmissions.css';

const FacultyPendingSubmissions = () => {
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'student', 'skill'

  useEffect(() => {
    fetchSubmissions();
  }, [selectedVenue]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const venueId = selectedVenue === 'all' ? null : parseInt(selectedVenue);
      const response = await getPendingSubmissions(venueId);
      
      if (response.success) {
        setSubmissions(response.data.submissions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pending submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = (submissionId) => {
    navigate(`/faculty/question-bank/grade/${submissionId}`);
  };

  const getUniqueVenues = () => {
    const venues = submissions.reduce((acc, sub) => {
      if (!acc.find(v => v.venue_id === sub.venue_id)) {
        acc.push({ venue_id: sub.venue_id, venue_name: sub.venue_name });
      }
      return acc;
    }, []);
    return venues;
  };

  const getFilteredSubmissions = () => {
    let filtered = [...submissions];

    // Filter by search term (student name or skill name)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        sub =>
          sub.student_name?.toLowerCase().includes(term) ||
          sub.skill_name?.toLowerCase().includes(term) ||
          sub.roll_number?.toLowerCase().includes(term)
      );
    }

    // Sort submissions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.submitted_at) - new Date(a.submitted_at);
        case 'student':
          return (a.student_name || '').localeCompare(b.student_name || '');
        case 'skill':
          return (a.skill_name || '').localeCompare(b.skill_name || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  if (loading) {
    return (
      <div className="faculty-submissions">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="faculty-submissions">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={fetchSubmissions}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredSubmissions = getFilteredSubmissions();
  const venues = getUniqueVenues();

  return (
    <div className="faculty-submissions">
      <div className="submissions-header">
        <div>
          <h2>Pending Coding Submissions</h2>
          <p className="header-subtitle">Review and grade student code submissions</p>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="stat-count">{filteredSubmissions.length}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="submissions-filters">
        <div className="filter-group">
          <label htmlFor="venue-filter">Venue:</label>
          <select
            id="venue-filter"
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Venues</option>
            {venues.map(venue => (
              <option key={venue.venue_id} value={venue.venue_id}>
                {venue.venue_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by">Sort By:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Date (Newest First)</option>
            <option value="student">Student Name</option>
            <option value="skill">Skill Name</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <input
            type="text"
            placeholder="Search by student or skill name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No Pending Submissions</h3>
          <p>All submissions have been graded!</p>
        </div>
      ) : (
        <div className="submissions-table-container">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Skill/Question</th>
                <th>Venue</th>
                <th>Submitted</th>
                <th>Language</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.submission_id}>
                  <td>
                    <div className="student-cell">
                      <strong>{submission.student_name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="roll-number">{submission.roll_number || 'N/A'}</span>
                  </td>
                  <td>
                    <div className="skill-cell">
                      <div className="skill-name">{submission.skill_name}</div>
                      <span className={`badge badge-${submission.difficulty?.toLowerCase() || 'medium'}`}>
                        {submission.difficulty || 'Medium'}
                      </span>
                    </div>
                  </td>
                  <td>{submission.venue_name}</td>
                  <td>
                    <span className="date-text">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </span>
                    <br />
                    <small className="time-text">
                      {new Date(submission.submitted_at).toLocaleTimeString()}
                    </small>
                  </td>
                  <td>
                    <span className="language-badge">
                      {submission.language || 'python'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleGradeSubmission(submission.submission_id)}
                    >
                      Grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FacultyPendingSubmissions;
