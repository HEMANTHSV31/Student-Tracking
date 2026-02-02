import React, { useState, useEffect } from 'react';
import { apiGet } from '../../../../utils/api';
import { ClipboardList, Clock, Users, CheckCircle, XCircle, AlertCircle, Calendar, UserCheck, Briefcase, Coffee, FileQuestion } from 'lucide-react';

// Sessions - 4 per day with actual time boundaries
const SESSIONS = [
  { id: 1, name: 'Session 1', startTime: '09:00', endTime: '10:30', displayTime: '9:00 AM - 10:30 AM' },
  { id: 2, name: 'Session 2', startTime: '10:45', endTime: '12:15', displayTime: '10:45 AM - 12:15 PM' },
  { id: 3, name: 'Session 3', startTime: '13:30', endTime: '15:00', displayTime: '1:30 PM - 3:00 PM' },
  { id: 4, name: 'Session 4', startTime: '15:15', endTime: '16:45', displayTime: '3:15 PM - 4:45 PM' },
];

const AttendanceView = ({ selectedVenue, selectedVenueName, selectedDate, setSelectedDate, selectedSession, setSelectedSession, selectedYear }) => {
  
  // State for attendance data
  const [attendanceData, setAttendanceData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Function to check if session has started
  const hasSessionStarted = (sessionId) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!isToday) {
      // If it's not today, we can't determine if session has started
      return true; // Allow viewing for past/future dates
    }
    
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    const session = SESSIONS.find(s => s.id === parseInt(sessionId));
    if (!session) return true; // If session not found, allow viewing
    
    const [startHour, startMinute] = session.startTime.split(':').map(Number);
    const sessionStartInMinutes = startHour * 60 + startMinute;
    
    return currentTimeInMinutes >= sessionStartInMinutes;
  };

  // Function to check if session is ongoing
  const isSessionOngoing = (sessionId) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!isToday) return false;
    
    const currentTime = new Date();
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;
    
    const session = SESSIONS.find(s => s.id === parseInt(sessionId));
    if (!session) return false;
    
    const [startHour, startMinute] = session.startTime.split(':').map(Number);
    const [endHour, endMinute] = session.endTime.split(':').map(Number);
    const sessionStartInMinutes = startHour * 60 + startMinute;
    const sessionEndInMinutes = endHour * 60 + endMinute;
    
    return currentTimeInMinutes >= sessionStartInMinutes && currentTimeInMinutes <= sessionEndInMinutes;
  };

  // Function to get session status message
  const getSessionStatusMessage = (sessionId) => {
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;
    
    if (!isToday) return null;
    
    if (!hasSessionStarted(sessionId)) {
      const session = SESSIONS.find(s => s.id === parseInt(sessionId));
      return `Session ${sessionId} starts at ${session.startTime}`;
    }
    
    if (isSessionOngoing(sessionId)) {
      return `Session ${sessionId} is currently ongoing`;
    }
    
    return null;
  };

  // Fetch attendance data when venue, date, or session changes
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedVenue || !selectedSession) {
        setStudents([]);
        setAttendanceData(null);
        return;
      }

      // Check if session has started (only for today)
      const today = new Date().toISOString().split('T')[0];
      const isToday = selectedDate === today;
      
      if (isToday && !hasSessionStarted(selectedSession)) {
        setStudents([]);
        setAttendanceData({ 
          total: 0, 
          present: 0, 
          absent: 0,
          message: `Session ${selectedSession} hasn't started yet. It will begin at ${SESSIONS.find(s => s.id === parseInt(selectedSession))?.startTime || 'its scheduled time'}.`
        });
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        // Fetch students in the venue with their attendance for the selected date/session
        const params = new URLSearchParams({
          date: selectedDate,
          session: selectedSession
        });
        
        // Add year filter if selected
        if (selectedYear) {
          params.append('year', selectedYear);
        }
        
        // console.log('Fetching attendance with params:', { 
        //   venue: selectedVenue, 
        //   date: selectedDate, 
        //   session: selectedSession 
        // });
        
        const response = await apiGet(`/attendance/venue/${selectedVenue}/details?${params}`);
        const data = await response.json();
        
        // console.log('Attendance response:', data);
        
        if (data.success) {
          setStudents(data.data?.students || []);
          setAttendanceData(data.data?.summary || null);
        }
      } catch (err) {
        console.error('Error fetching attendance:', err);
        // For now, show mock data if API fails
        setStudents([]);
        setAttendanceData({ total: 0, present: 0, absent: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedVenue, selectedDate, selectedSession, selectedYear]);

  // Calculate stats from students data
  const attendanceStats = attendanceData || {
    total: students.length,
    present: students.filter(s => s.status === 'Present' || s.status === 'MM' || s.status === 'AD' || s.status === 'Other').length,
    absent: students.filter(s => s.status === 'Absent').length,
    late: students.filter(s => s.status === 'Late').length,
    ps: students.filter(s => s.status === 'PS').length,
    mm: students.filter(s => s.status === 'MM').length,
    ad: students.filter(s => s.status === 'AD').length,
    other: students.filter(s => s.status === 'Other').length,
  };

  // Filter students by status
  const filteredStudents = statusFilter === 'All' 
    ? students 
    : students.filter(s => s.status === statusFilter);

  // Apply student search filter (by roll number or name)
  let searchFilteredStudents = filteredStudents;
  const studentSearchTrimmed = studentSearch.trim().toLowerCase();
  if (studentSearchTrimmed) {
    searchFilteredStudents = filteredStudents.filter((student) => {
      const roll = (student.roll_number ?? '').toString().toLowerCase();
      const name = (student.student_name ?? '').toString().toLowerCase();
      return roll.includes(studentSearchTrimmed) || name.includes(studentSearchTrimmed);
    });
  }

  // Pagination calculations
  const totalPages = Math.ceil(searchFilteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = searchFilteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, studentSearch, selectedVenue, selectedDate, selectedSession]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return { bg: '#dcfce7', text: '#166534' };
      case 'Absent': return { bg: '#fee2e2', text: '#991b1b' };
      case 'Late': return { bg: '#fef3c7', text: '#92400e' };
      case 'PS': return { bg: '#ede9fe', text: '#6b21a8' };
      case 'MM': return { bg: '#d1fae5', text: '#065f46' };
      case 'AD': return { bg: '#dbeafe', text: '#1e40af' };
      case 'Other': return { bg: '#e0e7ff', text: '#3730a3' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check if current session hasn't started yet
  const sessionStatusMessage = getSessionStatusMessage(selectedSession);
  const sessionNotStarted = sessionStatusMessage && !hasSessionStarted(selectedSession);

  return (
    <div>
      {/* Contextual Filters */}
      <div style={styles.contextFilters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Select Date</label>
          <input 
            type="date" 
            style={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Session</label>
          <select 
            style={styles.select} 
            value={selectedSession} 
            onChange={(e) => {
              // console.log('Session changed from', selectedSession, 'to', e.target.value);
              setSelectedSession(e.target.value);
            }}
          >
            <option value="">Select Session</option>
            {SESSIONS.map((session) => (
              <option key={session.id} value={session.id.toString()}>
                {session.name} ({session.displayTime})
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Search Student</label>
          <input
            style={styles.input}
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name or roll number"
          />
        </div>
      </div>

      <div style={styles.mainContent}>
        {!selectedSession ? (
          <div style={styles.noDataContainer}>
            <div style={{ marginBottom: '16px', color: '#9ca3af' }}>
              <ClipboardList size={48} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Please select a session
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              Choose a session from the dropdown to view attendance data
            </div>
          </div>
        ) : (
          <>
            {/* Session Status Banner */}
            {sessionStatusMessage && (
              <div style={{
                padding: '12px 16px',
                marginBottom: '20px',
                borderRadius: '8px',
                backgroundColor: sessionNotStarted ? '#fef3c7' : '#dbeafe',
                border: `1px solid ${sessionNotStarted ? '#fbbf24' : '#93c5fd'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Clock size={20} color={sessionNotStarted ? '#f59e0b' : '#3b82f6'} />
                <span style={{ 
                  color: sessionNotStarted ? '#92400e' : '#1e40af',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {sessionStatusMessage}
                </span>
              </div>
            )}

            <p style={styles.sectionTitle}>
              Attendance for: {selectedVenueName} – {formatDate(selectedDate)}
              {selectedSession && ` – ${SESSIONS.find(s => s.id.toString() === selectedSession)?.name || ''}`}
            </p>

            {loading ? (
              <div style={styles.loadingContainer}>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading attendance data...</div>
              </div>
            ) : error ? (
              <div style={styles.errorContainer}>
                <div style={{ color: '#991b1b' }}>{error}</div>
              </div>
            ) : sessionNotStarted ? (
              <div style={styles.sessionNotStartedContainer}>
                <div style={{ marginBottom: '16px', color: '#f59e0b' }}>
                  <Clock size={48} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#92400e' }}>
                  Session Not Started
                </div>
                <div style={{ fontSize: '14px', color: '#b45309', marginTop: '8px' }}>
                  {attendanceData?.message || `Session ${selectedSession} hasn't started yet.`}
                </div>
                <div style={{ fontSize: '13px', color: '#d97706', marginTop: '12px' }}>
                  Please check back later when the session begins.
                </div>
              </div>
            ) : (
              <>
                <div style={styles.statsRow}>
                  <div style={styles.statBox}>
                    <div style={styles.statLabel}>
                      <Users size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Total Students</span>
                    </div>
                    <div style={styles.statValue}>{attendanceStats.total}</div>
                    <div style={styles.statSub}>Enrolled in this venue</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#166534' }}>
                      <CheckCircle size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Present</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#166534' }}>{attendanceStats.present}</div>
                    <div style={styles.statSub}>Attended on selected date</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#991b1b' }}>
                      <XCircle size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Absent</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#991b1b' }}>{attendanceStats.absent}</div>
                    <div style={styles.statSub}>Missed sessions</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#f59e0b' }}>
                      <Clock size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Late</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{attendanceStats.late || 0}</div>
                    <div style={styles.statSub}>Came in late</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#8b5cf6' }}>
                      <UserCheck size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>PS</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{attendanceStats.ps || 0}</div>
                    <div style={styles.statSub}>Personalized Skill</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#3b82f6' }}>
                      <Calendar size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Attendance Rate</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#3b82f6' }}>
                      {attendanceStats.total > 0
                        ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)
                        : 0}%
                    </div>
                    <div style={styles.statSub}>For selected period</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#3B82F6' }}>
                      <Briefcase size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>AD</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#3B82F6' }}>{attendanceStats.ad || 0}</div>
                    <div style={styles.statSub}>Academics</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#10B981' }}>
                      <Coffee size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>MM</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#10B981' }}>{attendanceStats.mm || 0}</div>
                    <div style={styles.statSub}>Mentor meeting</div>
                  </div>
                  <div style={styles.statBox}>
                    <div style={{ ...styles.statLabel, color: '#6b7280' }}>
                      <FileQuestion size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                      <span style={{verticalAlign: 'middle'}}>Other</span>
                    </div>
                    <div style={{ ...styles.statValue, color: '#6b7280' }}>{attendanceStats.other || 0}</div>
                    <div style={styles.statSub}>Other reasons</div>
                  </div>
                </div>

                <div style={styles.tableControls}>
                  <button
                    style={statusFilter === 'All' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('All')}
                  >
                    All ({attendanceStats.total})
                  </button>
                  <button
                    style={statusFilter === 'Present' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('Present')}
                  >
                    Present ({attendanceStats.present})
                  </button>
                  <button
                    style={statusFilter === 'Absent' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('Absent')}
                  >
                    Absent ({attendanceStats.absent})
                  </button>
                  <button
                    style={statusFilter === 'Late' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('Late')}
                  >
                    Late ({attendanceStats.late || 0})
                  </button>
                  <button
                    style={statusFilter === 'PS' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('PS')}
                  >
                    PS ({attendanceStats.ps || 0})
                  </button>
                  <button
                    style={statusFilter === 'MM' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('MM')}
                  >
                    MM ({attendanceStats.mm || 0})
                  </button>
                  <button
                    style={statusFilter === 'AD' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('AD')}
                  >
                    AD ({attendanceStats.ad || 0})
                  </button>
                  <button
                    style={statusFilter === 'Other' ? styles.filterBadgeActive : styles.filterBadge}
                    onClick={() => setStatusFilter('Other')}
                  >
                    Other ({attendanceStats.other || 0})
                  </button>
                </div>

                {filteredStudents.length === 0 ? (
                  <div style={styles.noDataContainer}>
                    <div style={{ marginBottom: '16px', color: '#9ca3af' }}>
                      <ClipboardList size={48} />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                      No attendance records found
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                      Select a different date or session to view attendance data
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={styles.tableCard}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.thRow}>
                            <th style={styles.th}>Student Name</th>
                            <th style={styles.th}>Roll Number</th>
                            <th style={styles.th}>Department</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Session</th>
                            <th style={styles.th}>Overall Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStudents.map((student, index) => {
                            const statusInfo = getStatusColor(student.status);
                            return (
                              <tr key={student.student_id || index} style={styles.tr}>
                                <td style={styles.td}>{student.name || student.student_name}</td>
                                <td style={styles.td}>{student.roll_number || student.rollNumber}</td>
                                <td style={styles.td}>{student.department || 'N/A'}</td>
                                <td style={styles.td}>
                                  <span
                                    style={{
                                      ...styles.statusBadge,
                                      backgroundColor: statusInfo.bg,
                                      color: statusInfo.text,
                                    }}
                                  >
                                    {student.status || 'N/A'}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  {student.session
                                    ? SESSIONS.find((s) => s.id === parseInt(student.session))?.name ||
                                      `Session ${student.session}`
                                    : 'All'}
                                </td>
                                <td style={styles.td}>
                                  {student.attendance_percentage ? `${student.attendance_percentage}%` : 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredStudents.length > 0 && (
                      <div style={styles.paginationContainer}>
                        <div style={styles.paginationInfo}>
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of{' '}
                          {filteredStudents.length} students
                        </div>

                        <div style={styles.paginationControls}>
                          <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            style={styles.itemsPerPageSelect}
                          >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                          </select>

                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{
                              ...styles.paginationButton,
                              opacity: currentPage === 1 ? 0.5 : 1,
                              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Previous
                          </button>

                          <div style={styles.pageNumbers}>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  style={{
                                    ...styles.pageButton,
                                    backgroundColor: currentPage === pageNum ? '#3b82f6' : '#fff',
                                    color: currentPage === pageNum ? '#fff' : '#374151',
                                  }}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            style={{
                              ...styles.paginationButton,
                              opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1,
                              cursor:
                                currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  contextFilters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '180px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    minWidth: '180px',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    backgroundColor: '#fff',
    width: '260px',
  },
  mainContent: {
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  noDataContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  sessionNotStartedContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    border: '1px solid #fde68a',
    textAlign: 'center',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statBox: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '4px',
  },
  statSub: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  tableControls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBadgeActive: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #0066FF',
    backgroundColor: '#0066FF',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'auto',
    marginBottom: '32px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px',
  },
  thRow: {
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  tr: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#1f2937',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    borderRadius: '0 0 8px 8px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemsPerPageSelect: {
    padding: '6px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  paginationButton: {
    padding: '6px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500',
  },
  pageNumbers: {
    display: 'flex',
    gap: '4px',
  },
  pageButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default AttendanceView;