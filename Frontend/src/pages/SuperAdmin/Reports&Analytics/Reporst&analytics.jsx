import React, { useState, useMemo, useEffect } from "react";
// Material Icons
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import CodeIcon from "@mui/icons-material/Code";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import LinkIcon from "@mui/icons-material/Link";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/useAuthStore";
import ReportsHeader from "./ReportsHeader";
import { apiGet, apiPut } from '../../../utils/api';

const ReportsAnalytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;

  // --- States ---
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTaskTitle, setSelectedTaskTitle] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "All Statuses",
  });
  const [loading, setLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [paginationData, setPaginationData] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  // Menu States
  const [anchorElStatus, setAnchorElStatus] = useState(null);

  const itemsPerPage = 10;

  // Fetch venues on mount
  useEffect(() => {
    const fetchVenues = async () => {
      if (!user) return;

      setVenuesLoading(true);
      try {
        const response = await apiGet('/tasks/venues');

        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setVenues(data.data);
          
          // Check if we have venue from navigation
          if (location.state?.venueId) {
            setSelectedVenueId(location.state.venueId.toString());
          } else {
            setSelectedVenueId(data.data[0].venue_id.toString());
          }
        }
      } catch (err) {
        console.error("Error fetching venues:", err);
      } finally {
        setVenuesLoading(false);
      }
    };

    fetchVenues();
  }, [user, location.state]);

  // Fetch tasks when venue changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedVenueId) return;

      setTasksLoading(true);
      try {
        const response = await apiGet(`/tasks/venue/${selectedVenueId}`);

        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setTasks(data.data);
          
          // Check if we have location state with task info
          if (location.state?.autoSelectTask && location.state?.taskId) {
            const taskFromNav = data.data.find(t => t.task_id.toString() === location.state.taskId.toString());
            if (taskFromNav) {
              setSelectedTaskId(taskFromNav.task_id.toString());
              setSelectedTaskTitle(taskFromNav.title);
              // Clear location state after using it
              window.history.replaceState({}, document.title);
            } else {
              setSelectedTaskId(data.data[0].task_id.toString());
              setSelectedTaskTitle(data.data[0].title);
            }
          } else {
            setSelectedTaskId(data.data[0].task_id.toString());
            setSelectedTaskTitle(data.data[0].title);
          }
        } else {
          setTasks([]);
          setSelectedTaskId("");
          setSelectedTaskTitle("");
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [selectedVenueId, location.state]);

  // Fetch submissions when task changes
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedTaskId) {
        setSubmissions([]);
        return;
      }

      setLoading(true);

      try {
        const statusParam = encodeURIComponent(filters.status);
        const searchParam = encodeURIComponent(searchTerm);
        const response = await apiGet(
          `/tasks/submissions/${selectedTaskId}?status=${statusParam}&search=${searchParam}&page=${currentPage}&limit=${itemsPerPage}`
        );

        const data = await response.json();

        if (data.success) {
          const transformed = data.data.map((sub) => {
            const hasFile =
              sub.file_path &&
              sub.file_name &&
              sub.file_name !== "Link Submission";
            const hasLink =
              sub.link_url ||
              (sub.file_path &&
                (sub.file_path.startsWith("http://") ||
                  sub.file_path.startsWith("https://")));
            const hasSubmitted = sub.submitted_at !== null;

            // Determine the grade to display
            // For MCQ tasks: use mcq_percentage or auto_graded_score or student_grade
            // For manual/coding tasks: use grade from task_submissions
            let displayGrade = "";
            if (sub.submission_type === 'mcq') {
              // Priority: student_grade > mcq_percentage > auto_graded_score > grade
              if (sub.student_grade !== null && sub.student_grade !== undefined) {
                displayGrade = sub.student_grade.toString();
              } else if (sub.mcq_percentage !== null && sub.mcq_percentage !== undefined) {
                displayGrade = sub.mcq_percentage.toString();
              } else if (sub.auto_graded_score !== null && sub.auto_graded_score !== undefined) {
                displayGrade = sub.auto_graded_score.toString();
              } else if (sub.grade !== null) {
                displayGrade = sub.grade.toString();
              }
            } else if (sub.grade !== null) {
              displayGrade = sub.grade.toString();
            }

            return {
              id: sub.student_roll,
              submission_id: sub.submission_id,
              name: sub.student_name,
              date: sub.submitted_at
                ? formatDate(sub.submitted_at)
                : "Not submitted",
              file: hasFile ? sub.file_name || "File" : null,
              fileUrl: hasFile ? sub.file_path : null,
              link:
                sub.link_url || (hasLink && !hasFile ? sub.file_path : null),
              status: sub.status,
              grade: displayGrade,
              action: sub.status === "Graded" || sub.status === "Submitted" || sub.status === "Auto-Graded" ? "Edit" : "Save",
              type: getFileType(sub.file_name),
              isLate: sub.is_late,
              hasSubmitted: hasSubmitted,
              submissionType: sub.submission_type, // Store submission type for reference
              mcqPercentage: sub.mcq_percentage, // Store original MCQ percentage
              autoGradedScore: sub.auto_graded_score, // Store original auto-graded score
              codingContent: sub.coding_content, // Store coding content if available
            };
          });

          setSubmissions(transformed);
          // Store pagination data from backend
          if (data.pagination) {
            setPaginationData(data.pagination);
          }
        }
      } catch (err) {
        console.error("Error fetching submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [selectedTaskId, currentPage, filters.status, searchTerm]);

  // Format date without AM0/PM0 issue
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleString("en-US", options).replace(/\s+/g, " ");
  };

  const getFileType = (filename) => {
    if (!filename) return "pdf";
    const ext = filename.split(".").pop().toLowerCase();
    if (["cpp", "c", "py", "js", "java"].includes(ext)) return "code";
    if (["zip", "rar"].includes(ext)) return "zip";
    return "pdf";
  };

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter(
      (s) => s.status === "Pending Review",
    ).length;
    const late = submissions.filter((s) => s.isLate).length;
    const notSubmitted = submissions.filter((s) => !s.hasSubmitted).length;

    const gradedSubs = submissions.filter((s) => s.grade && !isNaN(s.grade));
    const avgScore =
      gradedSubs.length > 0
        ? Math.round(
            gradedSubs.reduce((acc, curr) => acc + Number(curr.grade), 0) /
              gradedSubs.length,
          )
        : 0;

    return { total, pending, late, avgScore, notSubmitted };
  }, [submissions]);

  // --- Pagination Logic ---
  // Backend handles filtering, just use submissions directly
  const totalPages = paginationData.totalPages || 1;
  const currentItems = submissions; // Backend already returns paginated data
  
  // Calculate display indices based on current page
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + currentItems.length;
  const totalItems = paginationData.total || currentItems.length;

  // --- Handlers ---
  const handleVenueChange = (e) => {
    setSelectedVenueId(e.target.value);
    setCurrentPage(1);
  };

  const handleTaskChange = (e) => {
    const taskId = e.target.value;
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.task_id.toString() === taskId);
    setSelectedTaskTitle(task ? task.title : "");
    setCurrentPage(1);
  };

  const handleGradeChange = (id, newVal) => {
    if (newVal !== "" && (isNaN(newVal) || newVal < 0 || newVal > 100)) return;

    setSubmissions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, grade: newVal } : sub)),
    );
  };

  const handleAction = async (id, currentAction) => {
    const submission = submissions.find((s) => s.id === id);

    // Check if student has submitted before allowing grade
    if (!submission.hasSubmitted) {
      alert("Cannot grade - student has not submitted yet.");
      return;
    }

    if (currentAction === "Save" || currentAction === "Update") {
      if (submission.grade === "") {
        alert("Please enter a grade before saving.");
        return;
      }

      try {
        const response = await apiPut(
          `/tasks/grade/${submission.submission_id}`,
          { grade: Number(submission.grade) }
        );

        const data = await response.json();

        if (data.success) {
          setSubmissions((prev) =>
            prev.map((sub) => {
              if (sub.id !== id) return sub;
              return {
                ...sub,
                status: data.data.status,
                action: data.data.status === "Graded" ? "Edit" : "Update",
              };
            }),
          );
        } else {
          alert(data.message || "Failed to save grade");
        }
      } catch (err) {
        console.error("Error saving grade:", err);
        alert("Failed to save grade");
      }
    } else if (currentAction === "Edit") {
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, action: "Save" } : sub)),
      );
    }
  };

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "ID,Name,Date,File,Link,Status,Grade\n" +
      submissions
        .map(
          (e) =>
            `${e.id},${e.name},${e.date},${e.file || "N/A"},${e.link || "N/A"},${e.hasSubmitted ? e.status : "Not Submitted"},${e.grade}`,
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "code":
        return <CodeIcon sx={{ fontSize: 18 }} />;
      case "zip":
        return <FolderZipIcon sx={{ fontSize: 18 }} />;
      case "pdf":
        return <DescriptionIcon sx={{ fontSize: 18 }} />;
      default:
        return <DescriptionIcon sx={{ fontSize: 18 }} />;
    }
  };

  const getCurrentVenueName = () => {
    const venue = venues.find((v) => v.venue_id.toString() === selectedVenueId);
    return venue ? venue.venue_name : "";
  };

  return (
    <div className="dashboard-wrapper">
      <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

            .dashboard-wrapper {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
            min-height: 100vh;
            color: #1e293b;
            margin: 0;
            padding: 0;
            }

            .dashboard-content {
            max-width: 1600px;
            margin: 0 auto;
            padding: 16px;
            }

            /* Stats Section */
            .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            margin-bottom: 32px;
            }

            @media (max-width: 1024px) {
            .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            }
            }

            @media (max-width: 640px) {
            .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
            }
            }

            .stat-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s ease;
            }

            .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

            .stat-label { font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500; }
            .stat-value { font-size: 32px; font-weight: 700; margin-bottom: 12px; display: block; }

            .stat-trend {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            }

            .trend-up { color: #10b981; }
            .trend-down { color: #f43f5e; }
            .trend-neutral { color: #f97316; }

            /* Toolbar */
            .toolbar {
            display: flex;
            justify-content: space-between;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
            }

            @media (max-width: 768px) {
            .toolbar {
            flex-direction: column;
            }
            }

            .filters { display: flex; gap: 12px; flex-wrap: wrap; }

            .btn-ui {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.2s;
            }

            .btn-ui:hover { background: #f1f5f9; border-color: #cbd5e1; }
            .btn-ui.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }

            .search-box {
            position: relative;
            width: 320px;
            }

            @media (max-width: 768px) {
            .search-box {
            width: 100%;
            }
            }

            .search-box input {
            width: 100%;
            padding: 10px 10px 10px 42px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
            }

            .search-box input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

            /* Table */
            .table-wrap {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            overflow: hidden;
            }

            @media (max-width: 768px) {
            .table-wrap {
            overflow-x: auto;
            }
            }

            table { width: 100%; border-collapse: collapse; }

            @media (max-width: 768px) {
            table { min-width: 900px; }
            }

            th { 
            background: #fcfdfe; 
            padding: 16px 24px; 
            text-align: left; 
            font-size: 12px; 
            text-transform: uppercase; 
            color: #64748b; 
            letter-spacing: 0.05em; 
            }

            td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; transition: background 0.1s; vertical-align: middle; }
            tr:hover td { background: #f8fafc; }

            .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #eff6ff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3b82f6;
            font-weight: 700;
            font-size: 14px;
            flex-shrink: 0;
            }

            .file-attachment {
            color: #2563eb;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            padding: 4px 8px;
            border-radius: 6px;
            }
            .file-attachment:hover { background: #eff6ff; }

            .link-attachment {
            color: #7c3aed;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            padding: 4px 8px;
            border-radius: 6px;
            }
            .link-attachment:hover { background: #f5f3ff; }

            .no-submission {
            color: #94a3b8;
            font-style: italic;
            font-size: 13px;
            }

            /* Status Badge UI */
            .status-tag {
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            border: 1px solid transparent;
            width: fit-content;
            }

            .tag-pending { background: #fffcf0; border-color: #fde68a; color: #d97706; }
            .tag-graded { background: #f0fdf4; border-color: #bcf3cc; color: #166534; }
            .tag-revision { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
            .tag-not-submitted { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }

            /* Action Buttons */
            .save-btn { background: #2563eb; color: white; padding: 8px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
            .save-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
            .save-btn:disabled { background: #94a3b8; cursor: not-allowed; transform: none; }
            .edit-btn { background: white; border: 1px solid #e2e8f0; color: #475569; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
            .edit-btn:hover { background: #f1f5f9; }
            .edit-btn:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

            .mark-pill {
            display: flex;
            align-items: center;
            gap: 10px;
            }
            .mark-pill input { 
                width: 50px; 
                padding: 6px; 
                border: 1px solid #e2e8f0; 
                border-radius: 6px; 
                text-align: center; 
                font-weight: 600; 
                transition: all 0.2s;
            }
            .mark-pill input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
            .mark-pill input:disabled { background: #f1f5f9; color: #94a3b8; }

            .pagination-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background: #fcfdfe;
            border-top: 1px solid #e2e8f0;
            }

            @media (max-width: 640px) {
            .pagination-bar {
            flex-direction: column;
            gap: 16px;
            }
            }

            .empty-state {
            text-align: center;
            padding: 60px 20px;
            }

            .empty-state h3 {
            font-size: 18px;
            color: #334155;
            margin-bottom: 8px;
            }

            .empty-state p {
            color: #64748b;
            font-size: 14px;
            }
        `}</style>

      {/* --- STICKY HEADER WITH VENUE & TASK SELECTION --- */}
      <ReportsHeader
        venues={venues}
        venuesLoading={venuesLoading}
        selectedVenueId={selectedVenueId}
        handleVenueChange={handleVenueChange}
        tasks={tasks}
        tasksLoading={tasksLoading}
        selectedTaskId={selectedTaskId}
        handleTaskChange={handleTaskChange}
        selectedTaskTitle={selectedTaskTitle}
        handleExport={handleExport}
      />

      <div className="dashboard-content">
        {!selectedVenueId || !selectedTaskId ? (
          <div className="table-wrap">
            <div className="empty-state">
              <h3>Select a Venue and Task</h3>
              <p>
                Please select a venue and task from the dropdowns above to view
                submissions.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* --- STATS CARDS --- */}
            <div className="stats-grid">
              <StatCard
                title="Total Students"
                value={stats.total}
                trend={
                  <>
                    <ArrowUpwardIcon sx={{ fontSize: 16 }} /> In this task
                  </>
                }
                color="trend-up"
              />
              <StatCard
                title="Pending Grading"
                value={stats.pending}
                trend={
                  <>
                    <AccessTimeIcon sx={{ fontSize: 16 }} /> Needs Action
                  </>
                }
                color="trend-neutral"
              />
              <StatCard
                title="Average Score"
                value={`${stats.avgScore}%`}
                trend={
                  <>
                    <ArrowUpwardIcon sx={{ fontSize: 16 }} /> Graded submissions
                  </>
                }
                color="trend-up"
              />
              <StatCard
                title="Late Submissions"
                value={stats.late}
                trend={
                  <>
                    <ArrowDownwardIcon sx={{ fontSize: 16 }} /> After due date
                  </>
                }
                color="trend-down"
              />
            </div>

            {/* --- TOOLBAR --- */}
            <div className="toolbar">
              <div className="filters">
                {/* Status Filter */}
                <div
                  onClick={(e) => setAnchorElStatus(e.currentTarget)}
                  className={`btn-ui ${filters.status !== "All Statuses" ? "active" : ""}`}
                >
                  {filters.status} <ExpandMoreIcon fontSize="small" />
                </div>
                <Menu
                  anchorEl={anchorElStatus}
                  open={Boolean(anchorElStatus)}
                  onClose={() => setAnchorElStatus(null)}
                >
                  <MenuItem
                    onClick={() => {
                      setFilters({ ...filters, status: "All Statuses" });
                      setCurrentPage(1);
                      setAnchorElStatus(null);
                    }}
                  >
                    All Statuses
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setFilters({ ...filters, status: "Pending Review" });
                      setCurrentPage(1);
                      setAnchorElStatus(null);
                    }}
                  >
                    Pending Review
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setFilters({ ...filters, status: "Graded" });
                      setCurrentPage(1);
                      setAnchorElStatus(null);
                    }}
                  >
                    Graded
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setFilters({ ...filters, status: "Needs Revision" });
                      setCurrentPage(1);
                      setAnchorElStatus(null);
                    }}
                  >
                    Needs Revision
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setFilters({ ...filters, status: "Not Submitted" });
                      setCurrentPage(1);
                      setAnchorElStatus(null);
                    }}
                  >
                    Not Submitted
                  </MenuItem>
                </Menu>
              </div>
              <div className="filters">
                <div className="search-box">
                  <SearchIcon
                    sx={{
                      position: "absolute",
                      left: "12px",
                      top: "10px",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search student or ID..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* --- MAIN TABLE --- */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Submission Date</th>
                    <th>File</th>
                    <th>Link</th>
                    <th>Status</th>
                    <th>Mark / Grade</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#94a3b8",
                        }}
                      >
                        Loading submissions...
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#94a3b8",
                        }}
                      >
                        No submissions found.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "14px",
                              alignItems: "center",
                            }}
                          >
                            <div
                              className="avatar"
                              style={
                                student.name.startsWith("M")
                                  ? { background: "#fef3c7", color: "#b45309" }
                                  : {}
                              }
                            >
                              {student.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {student.name}
                              </div>
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                ID: {student.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 500,
                              fontSize: 13,
                              color: student.isLate ? "#f43f5e" : "#64748b",
                            }}
                          >
                            {student.date}
                            {student.isLate && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginLeft: 4,
                                  fontSize: 10,
                                  background: "#ffe4e6",
                                  color: "#e11d48",
                                  padding: "1px 4px",
                                  borderRadius: 4,
                                }}
                              >
                                LATE
                              </span>
                            )}
                          </span>
                        </td>
                        <td>
                          {student.fileUrl ? (
                            <a
                              href={`${API_URL}/${student.fileUrl}`}
                              className="file-attachment"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {getFileIcon(student.type)} {student.file}
                            </a>
                          ) : (
                            <span className="no-submission">—</span>
                          )}
                        </td>
                        <td>
                          {student.link ? (
                            <a
                              href={student.link}
                              className="link-attachment"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <LinkIcon style={{ fontSize: 16 }} /> View Link
                            </a>
                          ) : (
                            <span className="no-submission">—</span>
                          )}
                        </td>
                        <td>
                          <div
                            className={`status-tag ${
                              !student.hasSubmitted
                                ? "tag-not-submitted"
                                : student.status === "Graded"
                                  ? "tag-graded"
                                  : student.status === "Needs Revision"
                                    ? "tag-revision"
                                    : "tag-pending"
                            }`}
                          >
                            {student.hasSubmitted
                              ? student.status
                              : "Not Submitted"}
                          </div>
                        </td>
                        <td>
                          <div className="mark-pill">
                            <input
                              type="text"
                              value={student.grade}
                              onChange={(e) =>
                                handleGradeChange(student.id, e.target.value)
                              }
                              placeholder="--"
                              disabled={
                                !student.hasSubmitted ||
                                (student.status === "Graded" &&
                                  student.action !== "Update" &&
                                  student.action !== "Save" &&
                                  student.action === "Edit")
                              }
                            />
                            <span style={{ fontSize: 14, color: "#94a3b8" }}>
                              / 100
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className={
                              student.action === "Save" ||
                              student.action === "Update"
                                ? "save-btn"
                                : "edit-btn"
                            }
                            onClick={() =>
                              handleAction(student.id, student.action)
                            }
                            disabled={!student.hasSubmitted}
                          >
                            {student.action}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* --- PAGINATION FOOTER --- */}
              <div className="pagination-bar">
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  Showing{" "}
                  <b>
                    {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}-
                    {indexOfLastItem}
                  </b>{" "}
                  of <b>{totalItems}</b> submissions
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    className="btn-ui"
                    style={{ padding: "5px 8px" }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    <ChevronLeftIcon />
                  </button>
                  {totalPages > 0 &&
                    [...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        className="btn-ui"
                        style={{
                          padding: "6px 14px",
                          background:
                            i + 1 === currentPage ? "#2563eb" : "white",
                          color: i + 1 === currentPage ? "white" : "#64748b",
                          borderColor:
                            i + 1 === currentPage ? "#2563eb" : "#e2e8f0",
                        }}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  <button
                    className="btn-ui"
                    style={{ padding: "5px 8px" }}
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Reusable Stat Component
const StatCard = ({ title, value, trend, color }) => (
  <div className="stat-card">
    <span className="stat-label">{title}</span>
    <span className="stat-value">{value}</span>
    <div className={`stat-trend ${color}`}>{trend}</div>
  </div>
);

export default ReportsAnalytics;