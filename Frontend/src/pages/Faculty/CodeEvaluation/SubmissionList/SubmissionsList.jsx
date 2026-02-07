import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FilterList,
  CheckCircle,
  Cancel,
  Schedule,
  Code,
  Assessment,
  Visibility,
} from "@mui/icons-material";
import { getPendingSubmissions, getGradedSubmissions } from "../../../../services/questionBankApi";
import "./SubmissionsList.css";

const SubmissionsList = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedVenue, setSelectedVenue] = useState('all');

  useEffect(() => {
    loadSubmissions();
  }, [selectedVenue]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const venueId = selectedVenue === 'all' ? null : parseInt(selectedVenue);
      
      // Fetch both pending and graded submissions
      const [pendingRes, gradedRes] = await Promise.all([
        getPendingSubmissions(venueId),
        getGradedSubmissions(venueId)
      ]);
      
      const allSubmissions = [];
      
      // Transform pending submissions
      if (pendingRes.success && pendingRes.data.submissions) {
        const pending = pendingRes.data.submissions.map(sub => ({
          id: sub.submission_id,
          studentName: sub.student_name,
          studentId: sub.roll_number || 'N/A',
          taskTitle: sub.skill_name,
          submittedAt: sub.submitted_at,
          status: 'pending',
          autoTestScore: 0,
          autoTestTotal: 5,
          type: 'code',
          technology: sub.skill_name,
          avatarBg: '#EFF6FF',
          avatarColor: '#3B82F6',
        }));
        allSubmissions.push(...pending);
      }
      
      // Transform graded submissions
      if (gradedRes.success && gradedRes.data.submissions) {
        const graded = gradedRes.data.submissions.map(sub => ({
          id: sub.submission_id,
          studentName: sub.student_name,
          studentId: sub.roll_number || 'N/A',
          taskTitle: sub.skill_name,
          submittedAt: sub.submitted_at,
          status: sub.score >= 50 ? 'graded' : 'revision',
          finalScore: sub.score,
          maxScore: 100,
          type: 'code',
          technology: sub.skill_name,
          avatarBg: sub.score >= 50 ? '#F3E8FF' : '#FEE2E2',
          avatarColor: sub.score >= 50 ? '#9333EA' : '#DC2626',
        }));
        allSubmissions.push(...graded);
      }
      
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error("Error loading submissions:", error);
      // Only log error, don't show error state for empty data
      // If there's a real connection error, it will be handled by the API layer
      if (!error.message.includes('<!DOCTYPE')) {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((sub) => sub.status === filterStatus);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (sub) =>
          sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.taskTitle.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      } else if (sortBy === "oldest") {
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      } else if (sortBy === "name") {
        return a.studentName.localeCompare(b.studentName);
      }
      return 0;
    });

    return filtered;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getStatusBadge = (submission) => {
    if (submission.status === "graded") {
      return (
        <div className="status-badge passed">
          <span className="status-icon">○</span>
          <span>Passed • Score: {submission.finalScore}/{submission.maxScore}</span>
        </div>
      );
    } else if (submission.status === "pending") {
      return (
        <div className="status-badge pending">
          <span className="status-icon">○</span>
          <span>Pending Review • Auto: {submission.autoTestScore}/{submission.autoTestTotal}</span>
        </div>
      );
    } else if (submission.status === "revision") {
      return (
        <div className="status-badge revision">
          <span className="status-icon">○</span>
          <span>Revision Needed • {submission.finalScore}/{submission.maxScore}</span>
        </div>
      );
    }
  };

  const getButtonContent = (status) => {
    if (status === "pending") {
      return (
        <>
          <span className="btn-icon">👁</span>
          Review & Grade
        </>
      );
    }
    if (status === "graded") {
      return (
        <>
          <span className="btn-icon">📄</span>
          View Details
        </>
      );
    }
    if (status === "revision") {
      return (
        <>
          <span className="btn-icon">🔄</span>
          Request Re-submit
        </>
      );
    }
    return "View Details";
  };

  const filteredSubmissions = getFilteredSubmissions();
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  return (
    <div className="submissions-list-container">
      {/* Unified Header */}
      <div className="submissions-header">
        <div className="header-main">
          <div className="header-left">
            <span className="header-label">CODE REVIEW</span>
            <h1>Student Code Submissions</h1>
            <p className="header-subtitle">
              Review, evaluate, and provide feedback on programming assignments.
            </p>
          </div>
          <div className="header-right">
            <div className="stat-badge pending">
              <span className="stat-icon">⏱</span>
              <span className="stat-number">{pendingCount}</span>
              <span className="stat-label">Pending Reviews</span>
            </div>
            <div className="stat-badge graded">
              <span className="stat-icon">✓</span>
              <span className="stat-number">{gradedCount}</span>
              <span className="stat-label">Graded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="submissions-filters">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by student name, ID, or task title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="graded">Graded</option>
            <option value="revision">Revision Needed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Student Name</option>
          </select>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="empty-state">
          <Assessment className="empty-icon" />
          <h3>No submissions found</h3>
          <p>No submissions match your current filters.</p>
        </div>
      ) : (
        <div className="submissions-grid">
          {filteredSubmissions.map((submission) => (
            <div key={submission.id} className="submission-card">
              <div className="card-header">
                <div className="student-info">
                  <div className="student-avatar" style={{
                    background: submission.avatarBg,
                    color: submission.avatarColor
                  }}>
                    {submission.studentName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="student-details">
                    <h3 className="student-name">{submission.studentName}</h3>
                    <span className="student-id">{submission.studentId}</span>
                  </div>
                </div>
                <button className="menu-btn">⋯</button>
              </div>

              <div className="card-body">
                <h4 className="task-title">{submission.taskTitle}</h4>
                <div className="task-meta">
                  <span className="task-date">
                    <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {formatDate(submission.submittedAt)}
                  </span>
                  {submission.technology && (
                    <span className="task-tech">
                      <svg className="meta-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 7H7v6h6V7z" />
                        <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                      </svg>
                      {submission.technology}
                    </span>
                  )}
                </div>
                {getStatusBadge(submission)}
              </div>

              <div className="card-footer">
                <button
                  className={`action-btn ${submission.status === 'pending' ? 'primary' : 'secondary'}`}
                  onClick={() => navigate(`/faculty/question-bank/grade/${submission.id}`)}
                >
                  {getButtonContent(submission.status)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsList;
