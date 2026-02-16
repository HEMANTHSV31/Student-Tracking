import React, { useState, useEffect } from "react";
import { MapPin, Calendar, Users, Loader2 } from "lucide-react";
import useAuthStore from "../../../store/useAuthStore";
import { apiGet } from "../../../utils/api";

// --- FIXED SESSION DEFINITIONS ---
const SESSION_SLOTS = [
  { id: 1, label: "Session 1", time: "08:45 AM - 10:30 AM" },
  { id: 2, label: "Session 2", time: "10:40 AM - 12:30 PM" },
  { id: 3, label: "Session 3", time: "01:30 PM - 03:10 PM" },
  { id: 4, label: "Session 4", time: "03:25 PM - 04:30 PM" },
];

const MyClassRoom = () => {
  // --- AUTH & STATE ---
  const { user } = useAuthStore();
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- FETCH DATA ---
  const fetchSchedule = async (date) => {
    if (!user) return;
    setLoading(true);
    try {
      // Adjust for timezone to get correct YYYY-MM-DD
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - offset * 60 * 1000);
      const dateStr = localDate.toISOString().split("T")[0];

      // Add timestamp to prevent caching
      const response = await apiGet(`/schedule?date=${dateStr}&_t=${Date.now()}`);

      if (response.ok) {
        const result = await response.json();
        setScheduleData(result.data || []);
      } else {
        setScheduleData([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when date changes
  useEffect(() => {
    fetchSchedule(selectedDate);
  }, [selectedDate, user]);

  // Auto-refresh at 8 PM to show tomorrow's schedule
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      // If it's 8:00 PM or later, refresh the schedule
      if (hour === 20 && minute === 0) {
        fetchSchedule(selectedDate);
      }
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // --- HELPER: GET STATUS ---
  const getSlotStatus = (slotTimeStr, date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (!isToday) return date > today ? "upcoming" : "completed";

    try {
      const [startStr, endStr] = slotTimeStr.split(" - ");

      const parseToMinutes = (str) => {
        const [time, mod] = str.trim().split(" ");
        let [h, m] = time.split(":").map(Number);
        if (h === 12 && mod === "AM") h = 0;
        if (h !== 12 && mod === "PM") h += 12;
        return h * 60 + m;
      };

      const currentMins = today.getHours() * 60 + today.getMinutes();
      const startMins = parseToMinutes(startStr);
      const endMins = parseToMinutes(endStr);

      if (currentMins >= startMins && currentMins <= endMins) return "ongoing";
      if (currentMins < startMins) return "upcoming";
      return "completed";
    } catch (e) {
      return "upcoming";
    }
  };

  // Find class for a specific slot
  const findClassForSlot = (slotId) => {
    return scheduleData.find((classItem) => classItem.slotId === slotId);
  };

  const formatDate = (date) => {
    const options = { weekday: "long", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  // --- CALENDAR RENDERER ---
  const renderDatePicker = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={d}
          style={{
            ...styles.calendarDay,
            ...(isSelected ? styles.calendarDaySelected : {}),
            ...(isToday ? styles.calendarDayToday : {}),
          }}
          onClick={() => {
            setSelectedDate(date);
            setShowDatePicker(false);
          }}
        >
          {d}
        </button>,
      );
    }

    return (
      <div style={styles.calendarPopup}>
        <div style={styles.calendarHeader}>
          <button
            onClick={() => setSelectedDate(new Date(year, month - 1))}
            style={styles.navBtn}
          >
            ‹
          </button>
          <span style={{ fontWeight: 600 }}>
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            onClick={() => setSelectedDate(new Date(year, month + 1))}
            style={styles.navBtn}
          >
            ›
          </button>
        </div>
        <div style={styles.calendarGrid}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d} style={styles.weekDay}>
              {d}
            </div>
          ))}
          {days}
        </div>
        <button
          style={styles.todayBtn}
          onClick={() => {
            setSelectedDate(new Date());
            setShowDatePicker(false);
          }}
        >
          Today
        </button>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .header-container { flex-direction: column; align-items: flex-start !important; gap: 16px; }
          .timeline-item { gap: 12px !important; }
          .time-label { width: 80px !important; text-align: left !important; }
          .class-card { flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .card-actions { width: 100%; border-top: 1px solid #f3f4f6; padding-top: 12px; margin-left: 0 !important; text-align: left !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={styles.header} className="header-container">
        <div>
          <h1 style={styles.title}>My Classroom</h1>
          <p style={styles.subtitle}>Welcome back, {user?.name || "Student"}</p>
        </div>
        <div style={{ position: "relative" }}>
          <button
            style={styles.dateDisplay}
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <Calendar size={18} style={{ marginRight: 10 }} />
            <span>
              {selectedDate.toDateString() === new Date().toDateString()
                ? "Today"
                : formatDate(selectedDate)}
            </span>
          </button>
          {showDatePicker && (
            <div style={styles.datePickerWrapper}>{renderDatePicker()}</div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={styles.mainLayout}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Daily Schedule</h2>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <Loader2 className="animate-spin" size={32} color="#2563EB" />
          </div>
        ) : scheduleData.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No schedule assigned for this date.</p>
          </div>
        ) : (
          <div style={styles.timeline}>
            {SESSION_SLOTS.map((slot, index) => {
              const classData = findClassForSlot(slot.id);
              const status = getSlotStatus(slot.time, selectedDate);

              return (
                <div
                  key={slot.id}
                  style={styles.timelineItem}
                  className="timeline-item"
                >
                  {/* Left: Time & Label */}
                  <div style={styles.timeLabel} className="time-label">
                    <div style={styles.timeText}>
                      {slot.time.split(" - ")[0]}
                    </div>
                    <div style={styles.timeSubtext}>
                      {slot.time.split(" - ")[1]}
                    </div>
                    <div style={styles.sessionLabel}>{slot.label}</div>
                  </div>

                  {/* Middle: Connector */}
                  <div style={styles.connector}>
                    <div
                      style={{
                        ...styles.dot,
                        backgroundColor:
                          classData && status === "ongoing" ? "#2563EB" : "#E5E7EB",
                      }}
                    />
                    {index !== SESSION_SLOTS.length - 1 && (
                      <div style={styles.line} />
                    )}
                  </div>

                  {/* Right: Card */}
                  {classData ? (
                    <div
                      style={{
                        ...styles.classCard,
                        borderLeft:
                          status === "ongoing"
                            ? "4px solid #2563EB"
                            : "4px solid #E5E7EB",
                        opacity: status === "completed" ? 0.6 : 1,
                      }}
                      className="class-card"
                    >
                      <div style={styles.cardContent}>
                        <h3 style={styles.subjectName}>{classData.subject}</h3>

                        <div style={styles.infoRow}>
                          <MapPin size={16} color="#EF4444" />
                          <span style={styles.venueText}>{classData.venue}</span>
                        </div>

                        <div style={styles.infoRow}>
                          <Users size={16} color="#6B7280" />
                          <span style={styles.instructorText}>
                            {classData.instructor}
                          </span>
                        </div>
                      </div>

                      <div style={styles.cardActions} className="card-actions">
                        <div
                          style={{
                            ...styles.statusBadge,
                            color: status === "ongoing" ? "#2563EB" : "#6B7280",
                            backgroundColor:
                              status === "ongoing" ? "#EFF6FF" : "transparent",
                          }}
                        >
                          {status === "ongoing"
                            ? "• HAPPENING NOW"
                            : status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        ...styles.classCard,
                        borderLeft: "4px solid #E5E7EB",
                        backgroundColor: "#F9FAFB",
                      }}
                      className="class-card"
                    >
                      <div style={styles.cardContent}>
                        <h3 style={{ ...styles.subjectName, color: "#9CA3AF" }}>
                          No Class Scheduled
                        </h3>
                        <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
                          Free period
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#F9FAFB",
    minHeight: "100vh",
    fontFamily: '"Inter", sans-serif',
    paddingBottom: "0px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: "24px",
    margin: "20px",
    borderRadius: "16px",
    border: "1px solid #E5E7EB",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#111827",
    margin: "0 0 4px 0",
  },
  subtitle: { fontSize: "14px", color: "#6B7280", margin: 0 },

  // Date Picker
  dateDisplay: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "#F3F4F6",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    color: "#374151",
  },
  datePickerWrapper: {
    position: "absolute",
    top: "110%",
    right: 0,
    zIndex: 50,
  },
  calendarPopup: {
    backgroundColor: "white",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    border: "1px solid #E5E7EB",
    width: "280px",
  },
  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  navBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    padding: "4px",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "10px",
  },
  weekDay: {
    textAlign: "center",
    fontSize: "12px",
    color: "#9CA3AF",
    fontWeight: 600,
  },
  calendarDay: {
    height: "32px",
    borderRadius: "6px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "13px",
  },
  calendarDaySelected: { backgroundColor: "#2563EB", color: "white" },
  calendarDayToday: { color: "#2563EB", fontWeight: "bold" },
  todayBtn: {
    width: "100%",
    padding: "8px",
    backgroundColor: "#F3F4F6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },

  // Layout
  mainLayout: { maxWidth: "1600px", margin: "0 auto", padding: "0 20px" },
  sectionHeader: { marginBottom: "24px" },
  sectionTitle: { fontSize: "18px", fontWeight: "700", color: "#111827" },

  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "40px",
  },
  emptyState: { textAlign: "center", padding: "40px", color: "#6B7280" },

  // Timeline
  timeline: { display: "flex", flexDirection: "column" },
  timelineItem: {
    display: "flex",
    gap: "32px",
    marginBottom: "24px",
    minHeight: "130px",
  },

  timeLabel: {
    width: "110px",
    textAlign: "right",
    paddingTop: "20px",
    flexShrink: 0,
  },
  timeText: { fontSize: "15px", fontWeight: "700", color: "#111827" },
  timeSubtext: { fontSize: "12px", color: "#6B7280" },
  sessionLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#9CA3AF",
    marginTop: "4px",
    textTransform: "uppercase",
  },

  connector: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "24px",
    width: "20px",
    flexShrink: 0,
  },
  dot: { width: "12px", height: "12px", borderRadius: "50%", zIndex: 1 },
  line: { width: "2px", flex: 1, backgroundColor: "#E5E7EB", marginTop: "4px" },

  // Cards
  classCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "24px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    marginBottom: "20px",
    transition: "all 0.2s",
  },
  cardContent: { flex: 1 },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  codeBadge: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  lectureBadge: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    padding: "2px 8px",
    borderRadius: "4px",
    textTransform: "uppercase",
  },

  subjectName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 10px 0",
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  venueText: { fontSize: "13px", fontWeight: "500", color: "#374151" },
  instructorText: { fontSize: "13px", color: "#6B7280" },

  cardActions: { marginLeft: "16px", minWidth: "100px", textAlign: "right" },
  statusBadge: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "6px",
  },
};

export default MyClassRoom;