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
  Refresh,
} from "@mui/icons-material";
import { getPendingSubmissions, getGradedSubmissions } from "../../../../services/questionBankApi";
import { apiGet } from "../../../../utils/api";
import "./SubmissionsList.css";

const SubmissionsList = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [venues, setVenues] = useState([]);

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [selectedVenue]);

  const fetchVenues = async () => {
    try {
      const response = await apiGet('/tasks/venues');
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        setVenues(data.data);
        // Auto-select first venue if available
        if (data.data.length === 1) {
          setSelectedVenue(data.data[0].venue_id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  const handleRequestResubmit = async (submissionId, submissionType) => {
    if (!confirm('Request student to resubmit this assignment? The status will be changed to "Needs Revision".')) {
      return;
    }
    
    try {
      const endpoint = submissionType === 'web' 
        ? `/tasks/web-submissions/${submissionId}/request-resubmit`
        : `/tasks/code-submission/${submissionId}/request-resubmit`;
      
      const response = await apiPut(endpoint, {
        status: 'Needs Revision'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Resubmission request sent successfully!');
        loadSubmissions(); // Refresh the list
      } else {
        alert(data.message || 'Failed to request resubmission');
      }
    } catch (error) {
      console.error('Error requesting resubmit:', error);
      alert('Failed to request resubmission');
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const venueId = selectedVenue === 'all' ? null : parseInt(selectedVenue);
      
      const allSubmissions = [];
      
      // Fetch coding submissions (from student_submissions table)
      if (venueId) {
        try {
          const codingRes = await apiGet(`/tasks/coding-submissions/venue/${venueId}`);
          const codingData = await codingRes.json();
          
          if (codingData.success && codingData.data) {
            const codingSubs = codingData.data.map(sub => {
              let status = 'pending';
              if (sub.status === 'Graded' || sub.status === 'Auto-Graded') {
                status = sub.grade >= 50 ? 'graded' : 'revision';
              }
              return {
                id: sub.submission_id,
                studentName: sub.student_name,
                studentId: sub.student_roll || sub.student_id || 'N/A',
                taskTitle: sub.task_title || 'Coding Task',
                submittedAt: sub.submitted_at,
                status: status,
                finalScore: sub.grade || 0,
                maxScore: 100,
                type: 'coding',
                technology: 'Coding',
                avatarBg: '#FEF3C7',
                avatarColor: '#F59E0B',
              };
            });
            allSubmissions.push(...codingSubs);
          }
        } catch (err) {
          console.error('Error fetching coding submissions:', err);
        }
      }
      
      // Fetch web code submissions (HTML/CSS/JS from web_code_submissions table)
      if (venueId) {
        try {
          const webRes = await apiGet(`/tasks/web-submissions/venue/${venueId}`);
          const webData = await webRes.json();
          
          if (webData.success && webData.data) {
            const webSubs = webData.data.map(sub => {
              let status = 'pending';
              if (sub.status === 'Graded' || sub.status === 'Needs Revision') {
                status = sub.grade >= 50 ? 'graded' : 'revision';
              }
              return {
                id: sub.submission_id,
                studentName: sub.student_name,
                studentId: sub.student_roll || sub.student_id || 'N/A',
                taskTitle: sub.task_title || 'Web Practice',
                submittedAt: sub.submitted_at,
                status: status,
                finalScore: sub.grade || 0,
                maxScore: 100,
                type: 'web',
                technology: sub.workspace_mode === 'html-css-js' ? 'HTML+CSS+JS' : 'HTML+CSS',
                avatarBg: '#DBEAFE',
                avatarColor: '#3B82F6',
              };
            });
            allSubmissions.push(...webSubs);
          }
        } catch (err) {
          console.error('Error fetching web submissions:', err);
        }
      }
      
      // Remove duplicates by submission_id (in case of any overlap)
      const uniqueSubmissions = allSubmissions.reduce((acc, current) => {
        const existing = acc.find(item => item.id === current.id && item.type === current.type);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      console.log('Total submissions before dedup:', allSubmissions.length);
      console.log('Unique submissions after dedup:', uniqueSubmissions.length);
      console.log('Submissions with revision status:', uniqueSubmissions.filter(s => s.status === 'revision').length);
      
      setSubmissions(uniqueSubmissions);
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
          <Assessment style={{ fontSize: '18px', marginRight: '4px' }} />
          Review & Grade
        </>
      );
    }
    if (status === "graded") {
      return (
        <>
          <Visibility style={{ fontSize: '18px', marginRight: '4px' }} />
          View Details
        </>
      );
    }
    if (status === "revision") {
      return (
        <>
          <Refresh style={{ fontSize: '18px', marginRight: '4px' }} />
          Request Resubmit
        </>
      );
    }
    return (
      <>
        <Visibility style={{ fontSize: '18px', marginRight: '4px' }} />
        View Details
      </>
    );
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
                {submission.status === 'revision' ? (
                  <button
                    className="action-btn primary"
                    onClick={() => handleRequestResubmit(submission.id, submission.type)}
                  >
                    <Refresh style={{ fontSize: '18px', marginRight: '4px' }} />
                    Request Resubmit
                  </button>
                ) : (
                  <button
                    className={`action-btn ${submission.status === 'pending' ? 'primary' : 'secondary'}`}
                    onClick={() => {
                      // Navigate to code evaluation screen
                      navigate(`/submissions/${submission.id}`);
                    }}
                  >
                    {getButtonContent(submission.status)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionsList;
