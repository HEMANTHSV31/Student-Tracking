import React, { useState, useEffect } from "react";
import {
  Calendar,
  ClipboardCheck,
  ChevronRight,
  BarChart3,
  PieChart,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Loader2,
  Activity,
  BookOpen,
  FileText,
  Award,
  ListChecks,
} from "lucide-react";
import { apiGet } from "../../../utils/api";

// API Functions
const getStudentDashboardStats = async () => {
  const response = await apiGet('/dashboard/stats');
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
};

const getStudentRecentAssignments = async () => {
  const response = await apiGet('/assignments/recent');
  if (!response.ok) throw new Error('Failed to fetch recent assignments');
  return response.json();
};

const getStudentSubjectWiseAttendance = async () => {
  const response = await apiGet('/attendance/subject-wise');
  if (!response.ok) throw new Error('Failed to fetch subject-wise attendance');
  return response.json();
};

const getStudentActivityHeatmap = async (year = new Date().getFullYear()) => {
  const response = await apiGet(`/activity/heatmap?year=${year}`);
  if (!response.ok) throw new Error('Failed to fetch activity heatmap');
  return response.json();
};

const getStudentTaskCompletionStats = async () => {
  const response = await apiGet('/dashboard/task-completion-stats');
  if (!response.ok) throw new Error('Failed to fetch task completion stats');
  return response.json();
};

// Helper to format date for display
const formatDate = (dateString) => {
  if (!dateString) return "No deadline";
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Get status from assignment data
const getTaskStatus = (task) => {
  if (task.is_submitted && task.submission_status === "Graded") return "completed";
  if (task.is_submitted) return "submitted";
  const dueDate = new Date(task.due_date);
  const today = new Date();
  if (dueDate < today) return "overdue";
  return "pending";
};

// HeatMap Component - Dynamic version
const ActivityHeatMap = ({ data, selectedYear, onYearChange, loading }) => {
  const [hoveredDay, setHoveredDay] = React.useState(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Group data by month
  const getMonthData = () => {
    if (!data || data.length === 0) {
      return months.map(() => Array(30).fill({ level: 0, date: "", activities: [] }));
    }

    const monthData = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = i * 30;
      const monthEnd = Math.min((i + 1) * 30, data.length);
      monthData.push(data.slice(monthStart, monthEnd));
    }
    return monthData;
  };

  const monthData = getMonthData();

  const getColor = (value) => {
    switch (value) {
      case 0:
        return "#f1f5f9";
      case 1:
        return "#bbf7d0";
      case 2:
        return "#4ade80";
      case 3:
        return "#22c55e";
      case 4:
        return "#16a34a";
      default:
        return "#f1f5f9";
    }
  };

  const currentYear = new Date().getFullYear();
  const startYear = 2026;
  // Generate year options from 2026 to current year (adds years automatically as they pass)
  const yearOptions = [];
  for (let year = currentYear; year >= startYear; year--) {
    yearOptions.push(year);
  }

  if (loading) {
    return (
      <div
        className="heatmap-card"
        style={{
          background: "white",
          borderRadius: "24px",
          border: "1px solid #f1f5f9",
          padding: "32px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
        }}
      >
        <Loader2 className="animate-spin" size={32} color="#22c55e" />
      </div>
    );
  }

  return (
    <div
      className="heatmap-card"
      style={{
        background: "white",
        borderRadius: "24px",
        border: "1px solid #f1f5f9",
        padding: "32px",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={24} color="#6b7280" />
            <h3
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.025em",
              }}
            >
              Task Submission Activity
            </h3>
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              style={{
                appearance: "none",
                padding: "8px 40px 8px 16px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                fontSize: "14px",
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "#94a3b8",
              }}
            >
              <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            background: "#f8fafc",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Less
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            {[0, 1, 2, 3, 4].map((v) => (
              <div
                key={v}
                style={{
                  width: "12px",
                  height: "12px",
                  backgroundColor: getColor(v),
                  borderRadius: "3px",
                  border: "1px solid rgba(15, 23, 42, 0.05)",
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontSize: "11px",
              color: "#64748b",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            More
          </span>
        </div>
      </div>

      {/* Responsive Grid (no scrolling) */}
      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))",
          gap: "2px",
          padding: "10px 0",
        }}
      >
        {months.map((month, mIdx) => (
          <div
            key={month}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateRows: "repeat(7, 12px)",
                gridAutoFlow: "column",
                gap: "3px",
              }}
            >
              {monthData[mIdx] &&
                monthData[mIdx].map((day, dIdx) => (
                  <div
                    key={dIdx}
                    style={{
                      width: "13px",
                      height: "13px",
                      backgroundColor: getColor(day.activity_level || day.level || 0),
                      borderRadius: "3px",
                      border: "1px solid #e2e8f0",
                      transition: "all 0.1s ease",
                      cursor: "pointer",
                      position: "relative",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      setHoveredDay(day);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredDay(null);
                    }}
                  />
                ))}
            </div>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
                marginTop: "6px",
              }}
            >
              {month}
            </span>
          </div>
        ))}
      </div>

      {hoveredDay && (
        <div
          style={{
            position: "fixed",
            top: `${mousePos.y + 15}px`,
            left: `${mousePos.x + 15}px`,
            background: "rgba(15, 23, 42, 0.98)",
            backdropFilter: "blur(12px)",
            color: "white",
            padding: "20px",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            zIndex: 100,
            width: "300px",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            pointerEvents: "none",
            transition: "top 0.1s ease-out, left 0.1s ease-out",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "14px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "12px",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "15px" }}>
              {hoveredDay.date || "Unknown Date"}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                background: "rgba(255,255,255,0.1)",
                padding: "2px 10px",
                borderRadius: "8px",
                fontWeight: 700,
              }}
            >
              {(hoveredDay.activity_level || hoveredDay.level || 0) === 0 
                ? "NO ACTIVITY" 
                : `${hoveredDay.activities?.length || 0} SUBMISSIONS`}
            </span>
          </div>

          {(hoveredDay.activity_level || hoveredDay.level || 0) === 0 ? (
            <div
              style={{
                fontSize: "13.5px",
                color: "#94a3b8",
                textAlign: "center",
                padding: "12px 0",
                fontWeight: 500,
              }}
            >
              No tasks submitted on this day
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {(hoveredDay.activities || []).slice(0, 5).map((activity, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "13px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      background: "#22c55e",
                      borderRadius: "50%",
                      boxShadow: "0 0 12px rgba(34, 197, 94, 0.5)",
                    }}
                  />
                  {activity}
                </div>
              ))}
              {(hoveredDay.activities?.length || 0) > 5 && (
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  +{hoveredDay.activities.length - 5} more...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const BarChart = ({ data, loading }) => {
  const baseline = 100;

  if (loading || !data?.labels?.length) {
    return (
      <div style={{ padding: "24px 0", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        {loading ? <Loader2 className="animate-spin" size={24} color="#2563eb" /> : <span style={{ color: "#9ca3af" }}>No attendance data available</span>}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0 10px 0", marginTop: "25px" }}>
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "20px",
        }}
        className="barchart-scroll"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            height: "180px",
            gap: "20px",
            paddingBottom: "30px",
            borderBottom: "1px solid #f1f5f9",
            position: "relative",
            minWidth: "max-content",
            paddingRight: "10px",
          }}
        >
          {data.labels.map((label, index) => {
            const value = data.datasets?.[0]?.data?.[index] || 0;
            const height = (value / baseline) * 100;
            return (
              <div
                key={index}
                style={{
                  width: "50px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "32px",
                    height: "100%",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "6px",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    width: "32px",
                    height: `${height}%`,
                    backgroundColor: data.datasets?.[0]?.color || "#2563eb",
                    borderRadius: "6px",
                    transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    zIndex: 2,
                    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "-25px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}%
                  </span>
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: "-25px",
                    fontSize: "11px",
                    color: "#64748b",
                    fontWeight: 700,
                    textAlign: "center",
                    width: "max-content",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "32px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
          Attendance by Subject
        </span>
      </div>
      <style>{`
        .barchart-scroll::-webkit-scrollbar { height: 4px; }
        .barchart-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const DonutChart = ({ data, loading }) => {
  if (loading || !data?.data?.length) {
    return (
      <div style={{ padding: "24px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        {loading ? <Loader2 className="animate-spin" size={24} color="#10b981" /> : <span style={{ color: "#9ca3af" }}>No task data available</span>}
      </div>
    );
  }

  const total = data.data.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        No tasks assigned yet
      </div>
    );
  }

  let accumulatedAngle = 0;
  return (
    <div style={{ padding: "8px 4px" }}>
      <div
        style={{
          position: "relative",
          width: "150px",
          height: "150px",
          margin: "0 auto",
        }}
      >
        <svg width="150" height="150" viewBox="0 0 100 100">
          {data.data.map((value, index) => {
            if (value === 0) return null;
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = accumulatedAngle;
            const endAngle = startAngle + angle;
            accumulatedAngle = endAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);
            const largeArcFlag = angle > 180 ? 1 : 0;
            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={data.colors[index]}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>
            {Math.round((data.data[0] / total) * 100)}%
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>Completed</div>
        </div>
      </div>
      <div style={{ marginTop: "16px" }}>
        {data.labels.map((label, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #f9fafb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  backgroundColor: data.colors[index],
                }}
              />
              <span
                style={{ fontSize: "13px", color: "#111827", fontWeight: 500 }}
              >
                {label}
              </span>
            </div>
            <span
              style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}
            >
              {data.data[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  // State for dynamic data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    overallAttendance: 0,
    pendingTasks: 0,
    tasksCompleted: 0,
    courseProgress: 0,
    attendanceTrend: 0,
    tasksDueTomorrow: 0,
    totalTasks: 0,
  });
  const [assignments, setAssignments] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ labels: [], datasets: [] });
  const [taskCompletionData, setTaskCompletionData] = useState({ labels: [], data: [], colors: [] });
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [statsRes, assignmentsRes, attendanceRes, taskCompletionRes] = await Promise.all([
          getStudentDashboardStats().catch(() => ({ success: false })),
          getStudentRecentAssignments().catch(() => ({ success: false, data: [] })),
          getStudentSubjectWiseAttendance().catch(() => ({ success: false, data: [] })),
          getStudentTaskCompletionStats().catch(() => ({ success: false, data: { completed: 0, pending: 0, overdue: 0 } })),
        ]);

        if (statsRes.success) {
          setStats({
            overallAttendance: statsRes.data.overallAttendance || 0,
            pendingTasks: statsRes.data.pendingTasks || 0,
            tasksCompleted: statsRes.data.tasksCompleted || 0,
            courseProgress: statsRes.data.courseProgress || 0,
            attendanceTrend: statsRes.data.attendanceTrend || 0,
            tasksDueTomorrow: statsRes.data.tasksDueTomorrow || 0,
            totalTasks: statsRes.data.totalTasks || 0,
          });
        }

        if (assignmentsRes.success) {
          setAssignments(assignmentsRes.data || []);
        }

        if (attendanceRes.success && attendanceRes.data?.length) {
          setAttendanceData({
            labels: attendanceRes.data.map(item => item.subject_code || item.subject),
            datasets: [{
              data: attendanceRes.data.map(item => item.attendance_percentage),
              label: "Attendance %",
              color: "#2563eb",
            }],
          });
        }

        if (taskCompletionRes.success) {
          const taskData = taskCompletionRes.data;
          setTaskCompletionData({
            labels: ["Completed", "Pending", "Overdue"],
            data: [taskData.completed || 0, taskData.pending || 0, taskData.overdue || 0],
            colors: ["#10b981", "#f59e0b", "#ef4444"],
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch heatmap data separately (allows year change)
  useEffect(() => {
    const fetchHeatmapData = async () => {
      setHeatmapLoading(true);
      try {
        const heatmapRes = await getStudentActivityHeatmap(selectedYear);
        if (heatmapRes.success) {
          setHeatmapData(heatmapRes.data || []);
        }
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
        setHeatmapData([]);
      } finally {
        setHeatmapLoading(false);
      }
    };

    fetchHeatmapData();
  }, [selectedYear]);

  // Build stats cards dynamically
  const statsCards = [
    {
      id: 1,
      label: "Overall Attendance",
      value: `${stats.overallAttendance}%`,
      icon: <Calendar size={22} color="#6b7280" />,
      badge: stats.overallAttendance >= 75 ? "Good" : stats.overallAttendance >= 50 ? "Average" : "Low",
    },
    {
      id: 2,
      label: "Pending Tasks",
      value: String(stats.pendingTasks),
      sub: stats.tasksDueTomorrow > 0 ? `${stats.tasksDueTomorrow} due tomorrow` : null,
      icon: <ListChecks size={22} color="#6b7280" />,
      badge: stats.pendingTasks > 5 ? "Urgent" : stats.pendingTasks > 0 ? "Active" : "Clear",
    },
    {
      id: 3,
      label: "Tasks Completed",
      value: String(stats.tasksCompleted),
      sub: stats.totalTasks > 0 ? `of ${stats.totalTasks} total` : null,
      icon: <CheckCircle size={22} color="#6b7280" />,
      badge: null,
    },
    {
      id: 4,
      label: "Course Progress",
      value: `${stats.courseProgress}%`,
      icon: <Target size={22} color="#6b7280" />,
      badge: null,
    },
  ];

  return (
    <div className="dashboard-wrapper">
      <style>{`
        .dashboard-wrapper {
          background-color: #f9fafb;
          min-height: 100vh;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #111827;
          padding: 24px;
          max-width: 1920px;
          margin: 0 auto;
        }
        .header { margin-bottom: 32px; }
        .header > div { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .header h1 { font-size: 24px; font-weight: 600; color: #374151; letter-spacing: -0.02em; margin: 0; }
        
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
        .stat-card { 
          background: white; 
          padding: 24px 20px; 
          border-radius: 16px; 
          border: 1px solid #e5e7eb; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          min-height: 120px;
        }
        .stat-top { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          color: #6b7280; 
          margin-bottom: 12px; 
          font-size: 14px; 
          font-weight: 500; 
        }
        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f8fafc;
          flex-shrink: 0;
        }
        .stat-val { font-size: 32px; font-weight: 700; display: flex; align-items: center; gap: 10px; line-height: 1; color: #111827; }
        .stat-sub { font-size: 13px; color: #9ca3af; margin-top: 8px; }
        .pill-green { background: #dcfce7; color: #166534; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .pill-blue { background: #dbeafe; color: #1e40af; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .pill-yellow { background: #fef3c7; color: #92400e; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
        .pill-red { background: #fee2e2; color: #991b1b; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }

        .main-grid { 
          display: grid; 
          grid-template-columns: 1fr 420px; 
          gap: 24px; 
          align-items: start;
        }
        .left-content {
          position: sticky;
          top: 4px;
          align-self: start;
        }

        /* Tablet styles */
        @media (max-width: 1200px) {
          .main-grid { 
            grid-template-columns: 1fr; 
            gap: 24px; 
          }
          .stats-row { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 16px; 
          }
          .left-content { 
            position: relative; 
            top: 0; 
          }
          .sidebar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .dashboard-wrapper { 
            padding: 20px; 
          }
        }

        /* Mobile landscape */
        @media (max-width: 768px) {
          .dashboard-wrapper { 
            padding: 16px; 
          }
          .header h1 { 
            font-size: 18px; 
          }
          .stats-row { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 12px; 
            margin-bottom: 32px;
          }
          .stat-card { 
            padding: 16px; 
            min-height: 100px; 
          }
          .stat-val { 
            font-size: 24px; 
          }
          .stat-top { 
            font-size: 12px; 
            margin-bottom: 10px; 
          }
          .stat-icon { 
            width: 32px; 
            height: 32px; 
          }
          .stat-sub { 
            font-size: 11px; 
          }
          .section-label { 
            flex-direction: column; 
            align-items: flex-start; 
            gap: 8px; 
            margin-bottom: 16px;
          }
          .section-label h2 { 
            font-size: 18px; 
          }
          .data-table { 
            min-width: 500px; 
          }
          .data-table th, .data-table td { 
            padding: 12px 14px; 
            font-size: 13px; 
          }
          .sidebar {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .graph-card {
            padding: 20px;
            margin-bottom: 20px;
          }
          .main-grid {
            gap: 20px;
          }
        }

        /* Mobile portrait */
        @media (max-width: 640px) {
          .dashboard-wrapper { 
            padding: 12px; 
          }
          .header h1 { 
            font-size: 16px; 
            line-height: 1.4;
          }
          .stats-row { 
            grid-template-columns: 1fr 1fr; 
            gap: 10px; 
            margin-bottom: 28px;
          }
          .stat-card { 
            padding: 14px; 
            min-height: 90px; 
          }
          .stat-val { 
            font-size: 20px; 
          }
          .stat-top { 
            font-size: 11px; 
            margin-bottom: 8px; 
          }
          .stat-icon { 
            width: 28px; 
            height: 28px; 
          }
          .stat-sub { 
            font-size: 10px; 
          }
          .section-label h2 { 
            font-size: 16px; 
          }
          .section-label p {
            font-size: 13px;
          }
          .data-table th, .data-table td { 
            padding: 10px 12px; 
            font-size: 12px; 
          }
          .graph-card {
            padding: 16px;
            margin-bottom: 16px;
          }
          .sb-title h3 {
            font-size: 15px;
          }
          .main-grid {
            gap: 16px;
          }
          .table-card {
            border-radius: 12px;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .dashboard-wrapper { 
            padding: 8px; 
          }
          .stats-row { 
            grid-template-columns: 1fr; 
            gap: 8px;
            margin-bottom: 24px;
          }
          .stat-card { 
            padding: 12px; 
            min-height: 80px; 
          }
          .stat-val { 
            font-size: 18px; 
          }
          .stat-top { 
            font-size: 10px; 
            margin-bottom: 8px; 
          }
          .stat-icon { 
            width: 24px; 
            height: 24px; 
          }
          .header > div { 
            justify-content: center; 
            text-align: center; 
            flex-direction: column;
            gap: 8px;
          }
          .header h1 { 
            font-size: 14px; 
            text-align: center;
          }
          .section-label {
            margin-bottom: 12px;
          }
          .section-label h2 { 
            font-size: 14px; 
          }
          .section-label p {
            font-size: 12px;
          }
          .data-table { 
            min-width: 400px; 
          }
          .data-table th, .data-table td { 
            padding: 8px 10px; 
            font-size: 11px; 
          }
          .graph-card {
            padding: 12px;
            margin-bottom: 12px;
          }
          .sb-title h3 {
            font-size: 14px;
          }
          .main-grid {
            gap: 12px;
          }
        }

        /* Extra small screens */
        @media (max-width: 360px) {
          .dashboard-wrapper { 
            padding: 6px; 
          }
          .header h1 { 
            font-size: 13px; 
          }
          .stat-card { 
            padding: 10px; 
            min-height: 70px; 
          }
          .stat-val { 
            font-size: 16px; 
          }
          .data-table th, .data-table td { 
            padding: 6px 8px; 
            font-size: 10px; 
          }
          .section-label h2 { 
            font-size: 13px; 
          }
          .graph-card {
            padding: 10px;
            margin-bottom: 10px;
          }
          .sb-title h3 {
            font-size: 13px;
          }
        }
          .header > div { justify-content: center; text-align: center; }
        }
        
        .section-label { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .section-label h2 { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .section-label p { font-size: 14px; color: #6b7280; margin-top: 4px; }

        .table-card { 
          background: white; 
          border: 1px solid #e5e7eb; 
          border-radius: 16px; 
          overflow-x: auto; 
        }
        .data-table { width: 100%; border-collapse: collapse; min-width: 500px; }
        .data-table th { 
          background: #f9fafb; 
          text-align: left; 
          padding: 16px 20px; 
          font-size: 13px; 
          color: #6b7280; 
          text-transform: uppercase; 
          font-weight: 700; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .data-table td { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .badge-flat { font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; }
        .type-success { color: #059669; background: #f0fdf4; }
        .type-warning { color: #d97706; background: #fffbeb; }
        .type-danger { color: #dc2626; background: #fef2f2; }
        .type-info { color: #2563eb; background: #eff6ff; }

        .graph-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .sb-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .sb-title h3 { font-size: 17px; font-weight: 700; margin: 0; }

        .loading-skeleton {
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen size={24} color="#6b7280" />
          <h1>Overview of today's classes, attendance, and pending tasks</h1>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-row">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="loading-skeleton" style={{ height: "20px", width: "60%", marginBottom: "16px" }} />
              <div className="loading-skeleton" style={{ height: "36px", width: "40%", marginBottom: "8px" }} />
              <div className="loading-skeleton" style={{ height: "14px", width: "80%" }} />
            </div>
          ))
        ) : (
          statsCards.map((s) => (
            <div className="stat-card" key={s.id}>
              <div className="stat-top">
                <span>{s.label}</span>
                <div className="stat-icon">{s.icon}</div>
              </div>
              <div className="stat-val">
                {s.value}
                {s.badge && (
                  <span
                    className={
                      s.badge === "Urgent" ? "pill-blue" : 
                      s.badge === "Low" ? "pill-red" :
                      s.badge === "Average" ? "pill-yellow" :
                      s.badge === "Clear" ? "pill-green" :
                      s.badge === "Active" ? "pill-yellow" :
                      "pill-green"
                    }
                  >
                    {s.badge}
                  </span>
                )}
              </div>
              {s.sub && <div className="stat-sub">{s.sub}</div>}
            </div>
          ))
        )}
      </div>

      {/* Activity Heatmap */}
      <div style={{ width: "100%", margin: "0 auto 40px auto" }}>
        <ActivityHeatMap 
          data={heatmapData} 
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          loading={heatmapLoading}
        />
      </div>

      <div className="main-grid">
        <div className="left-content">
          <div className="section-label">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} color="#6b7280" />
                <h2>Assignments & Tasks</h2>
              </div>
              <p>Recent tasks requiring your attention</p>
            </div>
          </div>

          <div className="table-card">
            {loading ? (
              <div style={{ padding: "24px" }}>
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="loading-skeleton" style={{ height: "48px", marginBottom: "12px" }} />
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                <ClipboardCheck size={48} color="#d1d5db" style={{ marginBottom: "12px" }} />
                <p>No assignments found. You're all caught up!</p>
                <Award size={20} color="#6b7280" style={{ marginTop: "8px" }} />
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment Name</th>
                    <th>Subject</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((t) => {
                    const status = getTaskStatus(t);
                    return (
                      <tr key={t.assignment_id}>
                        <td>
                          <span style={{ fontWeight: 700 }}>{t.title}</span>
                        </td>
                        <td>{t.subject_name}</td>
                        <td>{formatDate(t.due_date)}</td>
                        <td>
                          <span
                            className={`badge-flat ${
                              status === "completed" ? "type-success" :
                              status === "submitted" ? "type-info" :
                              status === "overdue" ? "type-danger" :
                              "type-warning"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="graph-card">
            <div className="sb-title">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart3 size={18} color="#6b7280" />
                <h3>Course-wise Attendance</h3>
              </div>
            </div>
            <BarChart data={attendanceData} loading={loading} />
          </div>

          <div className="graph-card">
            <div className="sb-title">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ListChecks size={18} color="#6b7280" />
                <h3>Task Completion</h3>
              </div>
            </div>
            <DonutChart data={taskCompletionData} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;