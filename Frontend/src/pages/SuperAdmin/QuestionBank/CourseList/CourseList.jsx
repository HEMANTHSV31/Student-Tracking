import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Add,
  Edit,
  Delete,
  Close,
  Quiz,
  Code,
  ExpandMore,
  MenuBook,
  ArrowForward,
} from "@mui/icons-material";
import useAuthStore from "../../../../store/useAuthStore";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../../utils/api";

// Dummy courses data
const DUMMY_COURSES = [
  {
    id: "course-1",
    name: "React Fundamentals",
    description:
      "Learn the basics of React including components, props, state, and hooks.",
    totalQuestions: 45,
    mcqCount: 30,
    codeCount: 15,
    level: "beginner",
    createdAt: "2024-01-15",
  },
  {
    id: "course-2",
    name: "Advanced JavaScript",
    description:
      "Deep dive into JavaScript concepts like closures, prototypes, and async programming.",
    totalQuestions: 62,
    mcqCount: 40,
    codeCount: 22,
    level: "advanced",
    createdAt: "2024-02-10",
  },
  {
    id: "course-3",
    name: "HTML & CSS Basics",
    description:
      "Master the fundamentals of web development with HTML5 and CSS3.",
    totalQuestions: 38,
    mcqCount: 25,
    codeCount: 13,
    level: "beginner",
    createdAt: "2024-01-20",
  },
  {
    id: "course-4",
    name: "Node.js Backend",
    description:
      "Build server-side applications with Node.js, Express, and MongoDB.",
    totalQuestions: 55,
    mcqCount: 35,
    codeCount: 20,
    level: "intermediate",
    createdAt: "2024-03-05",
  },
  {
    id: "course-5",
    name: "TypeScript Essentials",
    description: "Learn TypeScript to write type-safe JavaScript applications.",
    totalQuestions: 42,
    mcqCount: 28,
    codeCount: 14,
    level: "intermediate",
    createdAt: "2024-02-28",
  },
];

const CourseList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [courses, setCourses] = useState(DUMMY_COURSES);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: "beginner",
  });

  // Filter courses
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !selectedLevel || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  // Open add modal
  const openAddModal = () => {
    setModalMode("add");
    setFormData({ name: "", description: "", level: "beginner" });
    setEditingCourse(null);
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (course, e) => {
    e.stopPropagation();
    setModalMode("edit");
    setFormData({
      name: course.name,
      description: course.description,
      level: course.level,
    });
    setEditingCourse(course);
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalMode === "add") {
      const newCourse = {
        id: `course-${Date.now()}`,
        ...formData,
        totalQuestions: 0,
        mcqCount: 0,
        codeCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setCourses([newCourse, ...courses]);
    } else {
      setCourses(
        courses.map((c) =>
          c.id === editingCourse.id ? { ...c, ...formData } : c,
        ),
      );
    }
    setShowModal(false);
  };

  // Handle delete
  const handleDelete = (courseId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this course?")) {
      setCourses(courses.filter((c) => c.id !== courseId));
    }
  };

  // Navigate to question bank
  const handleCourseClick = (courseId) => {
    navigate(`/question-bank/${courseId}`);
  };

  // Get level color
  const getLevelColor = (level) => {
    switch (level) {
      case "beginner":
        return "#10b981";
      case "intermediate":
        return "#f59e0b";
      case "advanced":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  return (
    <div style={s.container}>
      {loading && <div style={s.loadingOverlay}>Loading...</div>}

      {/* Top Bar */}
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <div style={s.searchWrapper}>
            <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
            <input
              type="text"
              placeholder="Search courses..."
              style={s.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={s.selectWrapper}>
            <select
              style={s.filterSelect}
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <ExpandMore
              sx={{
                fontSize: 20,
                color: "#64748b",
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>

          <button style={s.addBtn} onClick={openAddModal}>
            <Add sx={{ fontSize: 20 }} />
            Add Course
          </button>
        </div>

        <div style={s.topBarRight}>
          <div style={s.headerStats}>
            <div style={s.statBox}>
              <span style={s.statNumber}>{courses.length}</span>
              <span style={s.statLabel}>Total Courses</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statNumber}>
                {courses.reduce((sum, c) => sum + c.totalQuestions, 0)}
              </span>
              <span style={s.statLabel}>Total Questions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div style={s.coursesGrid}>
        {filteredCourses.map((course) => (
          <div
            key={course.id}
            style={s.courseCard}
            onClick={() => handleCourseClick(course.id)}
          >
            <div style={s.cardHeader}>
              <div style={s.cardIcon}>
                <MenuBook sx={{ fontSize: 24, color: "#4f46e5" }} />
              </div>
              <div style={s.cardActions}>
                <button
                  style={s.iconBtn}
                  onClick={(e) => openEditModal(course, e)}
                  title="Edit course"
                >
                  <Edit sx={{ fontSize: 18 }} />
                </button>
                <button
                  style={{ ...s.iconBtn, color: "#ef4444" }}
                  onClick={(e) => handleDelete(course.id, e)}
                  title="Delete course"
                >
                  <Delete sx={{ fontSize: 18 }} />
                </button>
              </div>
            </div>

            <h3 style={s.courseName}>{course.name}</h3>
            <p style={s.courseDesc}>{course.description}</p>

            <div style={s.cardMeta}>
              <span
                style={{
                  ...s.levelBadge,
                  color: getLevelColor(course.level),
                  backgroundColor: `${getLevelColor(course.level)}15`,
                }}
              >
                {course.level}
              </span>
              <span style={s.dateText}>Created: {course.createdAt}</span>
            </div>

            <div style={s.cardStats}>
              <div style={s.statItem}>
                <Quiz sx={{ fontSize: 16, color: "#6366f1" }} />
                <span>{course.mcqCount} MCQs</span>
              </div>
              <div style={s.statItem}>
                <Code sx={{ fontSize: 16, color: "#10b981" }} />
                <span>{course.codeCount} Code</span>
              </div>
              <div style={s.totalQuestions}>
                {course.totalQuestions} Questions
              </div>
            </div>

            <div style={s.cardFooter}>
              <span style={s.viewLink}>
                Manage Questions
                <ArrowForward sx={{ fontSize: 16 }} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div style={s.emptyState}>
          <MenuBook sx={{ fontSize: 48, color: "#cbd5e1" }} />
          <p>No courses found</p>
          <button style={s.addBtn} onClick={openAddModal}>
            <Add sx={{ fontSize: 20 }} />
            Create First Course
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={s.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {modalMode === "add" ? "Add New Course" : "Edit Course"}
              </h2>
              <button style={s.closeBtn} onClick={() => setShowModal(false)}>
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={s.formGroup}>
                <label style={s.formLabel}>Course Name</label>
                <input
                  type="text"
                  style={s.formInput}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter course name"
                  required
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Description</label>
                <textarea
                  style={s.formTextarea}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter course description"
                  rows={3}
                  required
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.formLabel}>Level</label>
                <select
                  style={s.formSelect}
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={s.submitBtn}>
                  {modalMode === "add" ? "Create Course" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const s = {
  container: {
    padding: "2px",
    width: "100%",
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "0",
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    fontSize: "18px",
    color: "#4f46e5",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  headerLeft: {},
  pageTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  headerStats: {
    display: "flex",
    gap: "10px",
  },
  statBox: {
    backgroundColor: "#ffffff",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "110px",
  },
  statNumber: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#4f46e5",
  },
  statLabel: {
    fontSize: "12px",
    color: "#64748b",
    marginTop: "4px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: "320px",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 16px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    flex: 1,
    maxWidth: "400px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: "14px",
    width: "100%",
    backgroundColor: "transparent",
  },
  selectWrapper: {
    position: "relative",
    minWidth: "160px",
  },
  filterSelect: {
    width: "100%",
    padding: "10px 40px 10px 16px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    appearance: "none",
    outline: "none",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  coursesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "12px",
  },
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "16px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  cardIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardActions: {
    display: "flex",
    gap: "4px",
  },
  iconBtn: {
    padding: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    cursor: "pointer",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s",
  },
  courseName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 8px 0",
  },
  courseDesc: {
    fontSize: "13px",
    color: "#64748b",
    margin: "0 0 16px 0",
    lineHeight: "1.5",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  levelBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  dateText: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  cardStats: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "12px 0",
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#64748b",
  },
  totalQuestions: {
    marginLeft: "auto",
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e293b",
  },
  cardFooter: {
    paddingTop: "12px",
  },
  viewLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#4f46e5",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: "16px",
    color: "#64748b",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
  },
  closeBtn: {
    padding: "6px",
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },
  formGroup: {
    padding: "0 24px",
    marginTop: "20px",
  },
  formLabel: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "8px",
  },
  formInput: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  formTextarea: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    outline: "none",
    resize: "vertical",
    fontFamily: "'Inter', sans-serif",
    boxSizing: "border-box",
  },
  formSelect: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    outline: "none",
    cursor: "pointer",
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "20px 24px",
    borderTop: "1px solid #e2e8f0",
    marginTop: "20px",
  },
  cancelBtn: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#64748b",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    cursor: "pointer",
  },
};

export default CourseList;