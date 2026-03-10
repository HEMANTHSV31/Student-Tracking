import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Building2,
  UserCheck, UserX, ClipboardCheck, Save, Search, RefreshCw,
  Grid3X3, BarChart3, CheckCircle, AlertCircle, Filter, X, Download, Lock, Unlock
} from 'lucide-react';
import {
  fetchSlots, fetchAllocation, fetchAttendance, saveAttendance as saveAttendanceApi
} from '../../../../../services/assessmentVenueApi';
import emptyAnimation from '../../../../../animation/empty-file.json';
import './AssessmentAttendance.css';

const AssessmentAttendance = () => {
  const navigate = useNavigate();
  
  // ── Helper: Get Today's Date as YYYY-MM-DD ─────────────────────────────────
  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── State ────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dateFilter, setDateFilter] = useState(getTodayDateStr());
  const [venueAllocations, setVenueAllocations] = useState({});
  const [activeVenue, setActiveVenue] = useState('');
  const [overallStats, setOverallStats] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceModified, setAttendanceModified] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // ── Helper Functions ─────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // ── Time-based Access Control ────────────────────────────────────────────
  // Access window: 30 minutes before slot start to 2 hours after slot end
  const getTimeAccessStatus = (slot) => {
    if (!slot?.slot_date || !slot?.start_time || !slot?.end_time) {
      return { allowed: true, status: 'unknown', message: '' };
    }

    const now = new Date();
    const slotDate = normalizeDateForFilter(slot.slot_date);
    
    // Parse slot start and end times
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    
    const slotStart = new Date(`${slotDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const slotEnd = new Date(`${slotDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    
    // Access window: 30 min before to 2 hours after
    const windowStart = new Date(slotStart.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(slotEnd.getTime() + 2 * 60 * 60 * 1000);
    
    if (now < windowStart) {
      const diff = windowStart - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return {
        allowed: false,
        status: 'early',
        message: `Attendance opens in ${hours > 0 ? `${hours}h ` : ''}${mins}m (30 min before slot)`,
        windowStart: formatTime12(slot.start_time),
      };
    }
    
    if (now > windowEnd) {
      return {
        allowed: false,
        status: 'expired',
        message: 'Attendance window closed (2 hours after slot end)',
        closedAt: formatTime12(`${String(endH + 2).padStart(2, '0')}:${String(endM).padStart(2, '0')}`),
      };
    }
    
    // Within the allowed window
    const remaining = windowEnd - now;
    const remHours = Math.floor(remaining / (1000 * 60 * 60));
    const remMins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      allowed: true,
      status: now < slotStart ? 'early-open' : now <= slotEnd ? 'in-progress' : 'grace-period',
      message: now <= slotEnd 
        ? 'Slot in progress' 
        : `Grace period: ${remHours > 0 ? `${remHours}h ` : ''}${remMins}m remaining`,
      remaining: `${remHours > 0 ? `${remHours}h ` : ''}${remMins}m`,
    };
  };

  const normalizeDepartment = (dept) => {
    if (!dept) return 'OTHER';
    const d = String(dept).toUpperCase().trim();
    const map = {
      'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
      'COMPUTER SCIENCE': 'CSE',
      'INFORMATION TECHNOLOGY': 'IT',
      'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AIDS',
      'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING': 'AIML',
      'COMPUTER SCIENCE AND BUSINESS SYSTEMS': 'CSBS',
      'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
      'ELECTRONICS AND COMMUNICATION': 'ECE',
      'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
      'ELECTRICAL AND ELECTRONICS': 'EEE',
      'ELECTRONICS AND INSTRUMENTATION ENGINEERING': 'E&I',
      'ELECTRONICS AND INSTRUMENTATION': 'E&I',
      'MECHANICAL ENGINEERING': 'MECH',
      'MECHANICAL': 'MECH',
      'MECHATRONICS ENGINEERING': 'MECTRONIC',
      'MECHATRONICS': 'MECTRONIC',
      'AGRICULTURAL ENGINEERING': 'AGRI',
      'AGRICULTURAL': 'AGRI',
      'BIO TECHNOLOGY': 'BIOTECH',
      'BIOTECHNOLOGY': 'BIOTECH',
    };
    return map[d] || d;
  };

  const getDepartmentColor = (dept) => {
    const colors = {
      CSE: '#3b82f6', IT: '#6366f1', AIDS: '#8b5cf6', AIML: '#a855f7', CSBS: '#d946ef',
      ECE: '#10b981', EEE: '#14b8a6', 'E&I': '#06b6d4', MECH: '#f59e0b', MECTRONIC: '#f97316',
      AGRI: '#84cc16', BIOTECH: '#22c55e', MBA: '#64748b', 'M.TECH': '#475569',
    };
    return colors[dept] || '#94a3b8';
  };

  const getDepartmentTextColor = (dept) => {
    const lightBgDepts = ['AIDS', 'AIML', 'CSBS', 'MECH', 'MECTRONIC', 'AGRI', 'BIOTECH'];
    return lightBgDepts.includes(dept) ? '#1e293b' : '#ffffff';
  };

  const getColumnLabel = (col) => String.fromCharCode(65 + col);
  const getSeatLabel = (row, col) => `${getColumnLabel(col)}${row + 1}`;

  // Normalize date to YYYY-MM-DD format for comparison
  const normalizeDateForFilter = (dateValue) => {
    if (!dateValue) return '';
    const str = String(dateValue);
    if (str.includes('T')) return str.split('T')[0];
    return str;
  };

  // Format date label for display
  const formatDateLabel = (dateValue) => {
    if (!dateValue) return '—';
    const str = String(dateValue);
    let dateOnly = str;
    if (str.includes('T')) dateOnly = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }
    return dateValue;
  };

  // ── Load Slots ───────────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetchSlots();
      if (res.success) {
        // Only show allocated slots
        const allocatedSlots = (res.data || []).filter(s => s.status === 'Allocated');
        setSlots(allocatedSlots);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // ── Load Slot Allocation ─────────────────────────────────────────────────
  const handleSlotSelect = async (slot) => {
    setSelectedSlot(slot);
    setAttendanceModified(false);
    
    try {
      // Fetch allocation data
      const allocRes = await fetchAllocation(slot.id);
      if (allocRes.success && allocRes.hasAllocation && allocRes.data) {
        setVenueAllocations(allocRes.data.allocation_data);
        setOverallStats(allocRes.data.overall_stats);
        
        const usedVenues = Object.keys(allocRes.data.allocation_data).filter(
          v => allocRes.data.allocation_data[v]?.stats?.totalStudents > 0
        );
        setActiveVenue(usedVenues[0] || Object.keys(allocRes.data.allocation_data)[0] || '');
      }
      
      // Fetch attendance data
      const attRes = await fetchAttendance(slot.id);
      if (attRes.success && attRes.data?.attendance_data) {
        setAttendanceData(attRes.data.attendance_data);
      } else {
        setAttendanceData({});
      }
    } catch (err) {
      console.error('Failed to load allocation:', err);
    }
  };

  // ── Attendance Functions ─────────────────────────────────────────────────
  const timeAccess = selectedSlot ? getTimeAccessStatus(selectedSlot) : { allowed: true, status: 'unknown', message: '' };

  const toggleSeatAttendance = (venueId, rowIdx, colIdx) => {
    // Check time-based access
    if (!timeAccess.allowed) return;
    
    const key = `${rowIdx}-${colIdx}`;
    setAttendanceData(prev => {
      const venueAttendance = { ...(prev[venueId] || {}) };
      
      if (venueAttendance[key] === true) {
        venueAttendance[key] = false; // Present -> Absent
      } else if (venueAttendance[key] === false) {
        delete venueAttendance[key]; // Absent -> Unmarked
      } else {
        venueAttendance[key] = true; // Unmarked -> Present
      }
      
      return { ...prev, [venueId]: venueAttendance };
    });
    setAttendanceModified(true);
  };

  const markAllPresent = () => {
    if (!timeAccess.allowed || !activeVenue || !venueAllocations[activeVenue]) return;
    
    const alloc = venueAllocations[activeVenue];
    const newAttendance = {};
    
    alloc.seatMap.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        if (seat) {
          newAttendance[`${rowIdx}-${colIdx}`] = true;
        }
      });
    });
    
    setAttendanceData(prev => ({ ...prev, [activeVenue]: newAttendance }));
    setAttendanceModified(true);
  };

  const markAllAbsent = () => {
    if (!timeAccess.allowed || !activeVenue || !venueAllocations[activeVenue]) return;
    
    const alloc = venueAllocations[activeVenue];
    const newAttendance = {};
    
    alloc.seatMap.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        if (seat) {
          newAttendance[`${rowIdx}-${colIdx}`] = false;
        }
      });
    });
    
    setAttendanceData(prev => ({ ...prev, [activeVenue]: newAttendance }));
    setAttendanceModified(true);
  };

  const clearAttendance = () => {
    if (!timeAccess.allowed || !activeVenue) return;
    setAttendanceData(prev => ({ ...prev, [activeVenue]: {} }));
    setAttendanceModified(true);
  };

  const exportAttendance = () => {
    if (!selectedSlot || !activeVenue || !venueAllocations[activeVenue]) return;
    
    const alloc = venueAllocations[activeVenue];
    const venueAttendance = attendanceData[activeVenue] || {};
    
    // Header with slot info
    const slotInfo = `${selectedSlot.slotName} | ${selectedSlot.subject_code || ''} | ${formatDate(selectedSlot.slot_date)} | ${formatTime12(selectedSlot.start_time)} - ${formatTime12(selectedSlot.end_time)} | ${activeVenue}`;
    const rows = [
      [slotInfo],
      [],
      ['Seat', 'Roll Number', 'Name', 'Department', 'Status']
    ];
    
    alloc.seatMap.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        if (seat) {
          const seatLabel = getSeatLabel(rowIdx, colIdx);
          const key = `${rowIdx}-${colIdx}`;
          const status = venueAttendance[key] === true ? 'Present' : venueAttendance[key] === false ? 'Absent' : 'Unmarked';
          const dept = normalizeDepartment(seat.normalizedDept || seat.department);
          rows.push([seatLabel, seat.rollNumber, seat.name, dept, status]);
        }
      });
    });
    
    const csvContent = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${selectedSlot.slotName}_${activeVenue}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSlot?.id || !attendanceModified) return;
    
    setAttendanceSaving(true);
    try {
      const res = await saveAttendanceApi(selectedSlot.id, attendanceData);
      if (res.success) {
        setAttendanceModified(false);
        alert('Attendance saved successfully!');
      } else {
        alert(res.message || 'Failed to save attendance');
      }
    } catch (err) {
      console.error('Save attendance error:', err);
      alert('Failed to save attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  const getAttendanceStats = (venueId) => {
    const alloc = venueAllocations[venueId];
    if (!alloc) return { present: 0, absent: 0, unmarked: 0, total: 0 };
    
    const venueAttendance = attendanceData[venueId] || {};
    let present = 0, absent = 0, unmarked = 0;
    
    alloc.seatMap.forEach((row, rowIdx) => {
      row.forEach((seat, colIdx) => {
        if (seat) {
          const key = `${rowIdx}-${colIdx}`;
          if (venueAttendance[key] === true) present++;
          else if (venueAttendance[key] === false) absent++;
          else unmarked++;
        }
      });
    });
    
    return { present, absent, unmarked, total: present + absent + unmarked };
  };

  const getOverallAttendanceStats = () => {
    let present = 0, absent = 0, unmarked = 0;
    
    Object.keys(venueAllocations).forEach(venueId => {
      const stats = getAttendanceStats(venueId);
      present += stats.present;
      absent += stats.absent;
      unmarked += stats.unmarked;
    });
    
    return { present, absent, unmarked, total: present + absent + unmarked };
  };

  // ── Filter Slots ─────────────────────────────────────────────────────────
  const filteredSlots = slots.filter(slot => {
    const matchesSearch = !search || 
      slot.subject_code?.toLowerCase().includes(search.toLowerCase()) ||
      formatDate(slot.slot_date).toLowerCase().includes(search.toLowerCase());
    const matchesYear = !yearFilter || slot.year === parseInt(yearFilter);
    const matchesDate = !dateFilter || normalizeDateForFilter(slot.slot_date) === dateFilter;
    return matchesSearch && matchesYear && matchesDate;
  });

  const uniqueYears = [...new Set(slots.map(s => s.year))].sort();
  
  // Get unique dates that have allocated slots
  const uniqueDates = [...new Set(slots.map(s => normalizeDateForFilter(s.slot_date)))].filter(Boolean).sort();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="asa-root">
      {/* Header */}
      <div className="asa-header">
        <div className="asa-header-left">
          <button className="asa-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="asa-title">
            <ClipboardCheck size={22} /> Assessment Attendance
          </h1>
        </div>
        {selectedSlot && (
          <div className="asa-header-right">
            <button
              className="asa-btn asa-btn-primary"
              onClick={handleSaveAttendance}
              disabled={attendanceSaving || !attendanceModified || !timeAccess.allowed}
              title={!timeAccess.allowed ? timeAccess.message : 'Save attendance'}
            >
              <Save size={16} /> {attendanceSaving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      <div className="asa-content">
        {/* Slot List */}
        {!selectedSlot ? (
          <div className="asa-slot-section">
            {/* Unified Topbar: Date Filter + Search + Year */}
            <div className="asa-topbar">
              <div className="asa-topbar-left">
                <div className="asa-date-filter-wrap">
                  <Calendar size={16} className="asa-date-icon" />
                  <input
                    type="date"
                    className="asa-date-input"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <button
                      className="asa-date-clear-btn"
                      onClick={() => setDateFilter('')}
                      title="Clear date filter"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="asa-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search slots..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="asa-topbar-right">
                <select
                  className="asa-select"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="">All Years</option>
                  {uniqueYears.map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {slotsLoading ? (
              <div className="asa-loading">
                <RefreshCw size={32} className="asa-spin" />
                <p>Loading allocated slots...</p>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="asa-empty">
                <Lottie 
                  animationData={emptyAnimation} 
                  loop={true} 
                  style={{ width: 180, height: 180 , marginTop: '-40px'}} 
                />
                <p>No allocated slots found{dateFilter ? ` for ${formatDateLabel(dateFilter)}` : ''}</p>
              </div>
            ) : (
              <div className="asa-slot-grid">
                {filteredSlots.map(slot => (
                  <div
                    key={slot.id}
                    className="asa-slot-card"
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <div className="asa-slot-card-header">
                      <span className="asa-slot-date">
                        <Calendar size={14} /> {formatDate(slot.slot_date)}
                      </span>
                      <span className="asa-slot-year">Year {slot.year}</span>
                    </div>
                    <div className="asa-slot-card-body">
                      <div className="asa-slot-time">
                        <Clock size={14} />
                        {formatTime12(slot.start_time)} - {formatTime12(slot.end_time)}
                      </div>
                      {slot.subject_code && (
                        <div className="asa-slot-subject">{slot.subject_code}</div>
                      )}
                    </div>
                    <div className="asa-slot-card-footer">
                      <span className="asa-status-badge asa-status-allocated">
                        <CheckCircle size={12} /> Allocated
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Attendance View */
          <div className="asa-attendance-section">
            <div className="asa-attendance-header">
              <button className="asa-btn asa-btn-ghost" onClick={() => {
                setSelectedSlot(null);
                setVenueAllocations({});
                setAttendanceData({});
                setAttendanceModified(false);
              }}>
                <ArrowLeft size={16} /> Back to Slots
              </button>
              <div className="asa-slot-info">
                <span><Calendar size={14} /> {formatDate(selectedSlot.slot_date)}</span>
                <span><Clock size={14} /> {formatTime12(selectedSlot.start_time)} - {formatTime12(selectedSlot.end_time)}</span>
                {selectedSlot.subject_code && <span>{selectedSlot.subject_code}</span>}
                <span className="asa-year-badge">Year {selectedSlot.year}</span>
              </div>
            </div>

            {/* Overall Stats */}
            {overallStats && (() => {
              const attStats = getOverallAttendanceStats();
              return (
                <div className="asa-stats-row">
                  <div className="asa-stat-card asa-stat-blue">
                    <span className="asa-stat-dot"></span>
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{overallStats.totalStudents}</div>
                      <div className="asa-stat-label">Total Students</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-green">
                    <span className="asa-stat-dot"></span>
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{attStats.present}</div>
                      <div className="asa-stat-label">Present</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-red">
                    <span className="asa-stat-dot"></span>
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{attStats.absent}</div>
                      <div className="asa-stat-label">Absent</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-gray">
                    <span className="asa-stat-dot"></span>
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{attStats.unmarked}</div>
                      <div className="asa-stat-label">Unmarked</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Venue Tabs */}
            <div className="asa-venue-section">
              <div className="asa-venue-header">
                <div className="asa-venue-tabs">
                  {Object.keys(venueAllocations)
                    .filter(v => venueAllocations[v]?.stats?.totalStudents > 0)
                    .map((venueName, i) => {
                      const stats = getAttendanceStats(venueName);
                      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
                      return (
                        <button
                          key={venueName}
                          className={`asa-venue-tab ${activeVenue === venueName ? 'asa-tab-active' : ''}`}
                          style={activeVenue === venueName ? { background: colors[i % colors.length] } : {}}
                          onClick={() => setActiveVenue(venueName)}
                        >
                          <MapPin size={14} /> {venueName}
                          <span className="asa-tab-count">{venueAllocations[venueName].stats.totalStudents}</span>
                          {stats.present > 0 && (
                            <span className="asa-tab-present">{stats.present}✓</span>
                          )}
                        </button>
                      );
                    })}
                </div>
                <div className="asa-quick-actions">
                  <button 
                    className="asa-btn asa-btn-sm asa-btn-outline" 
                    onClick={markAllPresent}
                    disabled={!timeAccess.allowed}
                    title={!timeAccess.allowed ? timeAccess.message : 'Mark all as present'}
                  >
                    <UserCheck size={14} /> All Present
                  </button>
                  <button 
                    className="asa-btn asa-btn-sm asa-btn-ghost" 
                    onClick={clearAttendance}
                    disabled={!timeAccess.allowed}
                    title={!timeAccess.allowed ? timeAccess.message : 'Clear all attendance'}
                  >
                    Clear
                  </button>
                  <button className="asa-btn asa-btn-sm asa-btn-ghost" onClick={exportAttendance}>
                    <Download size={14} /> Export
                  </button>
                </div>
              </div>

              {/* Time Access Status Banner */}
              {selectedSlot && (
                <div className={`asa-time-access ${timeAccess.allowed ? 'asa-time-allowed' : 'asa-time-locked'}`}>
                  {timeAccess.allowed ? (
                    <>
                      <Unlock size={16} />
                      <span>
                        <strong>Attendance Open</strong> — {timeAccess.message}
                        {timeAccess.remaining && <span className="asa-time-remaining"> ({timeAccess.remaining} left)</span>}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>
                        <strong>Attendance Locked</strong> — {timeAccess.message}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Attendance Legend */}
              {activeVenue && (() => {
                const stats = getAttendanceStats(activeVenue);
                return (
                  <div className="asa-legend">
                    <span className="asa-legend-item asa-legend-present">
                      <span className="asa-legend-dot"></span> Present: <strong>{stats.present}</strong>
                    </span>
                    <span className="asa-legend-item asa-legend-absent">
                      <span className="asa-legend-dot"></span> Absent: <strong>{stats.absent}</strong>
                    </span>
                    <span className="asa-legend-item asa-legend-unmarked">
                      <span className="asa-legend-dot"></span> Unmarked: <strong>{stats.unmarked}</strong>
                    </span>
                    <span className="asa-legend-help">
                      Click seat: Unmarked → Present → Absent → Unmarked
                    </span>
                  </div>
                );
              })()}

              {/* Seat Map */}
              {venueAllocations[activeVenue] && (() => {
                const alloc = venueAllocations[activeVenue];
                const COLS = alloc.columns;
                
                return (
                  <div className="asa-seatmap-container">
                    <div className="asa-seatmap" style={{ '--asa-cols': COLS }}>
                      <div className="asa-col-headers">
                        <div className="asa-row-spacer"></div>
                        {Array.from({ length: COLS }, (_, i) => (
                          <div key={i} className="asa-col-header">{getColumnLabel(i)}</div>
                        ))}
                      </div>
                      {alloc.seatMap.map((row, rowIdx) => (
                        <div key={rowIdx} className="asa-seat-row">
                          <div className="asa-row-header">{rowIdx + 1}</div>
                          {row.map((seat, colIdx) => {
                            const seatLabel = getSeatLabel(rowIdx, colIdx);
                            const dept = seat ? normalizeDepartment(seat.normalizedDept || seat.department) : null;
                            const key = `${rowIdx}-${colIdx}`;
                            const venueAttendance = attendanceData[activeVenue] || {};
                            const attendanceStatus = venueAttendance[key];
                            const isPresent = attendanceStatus === true;
                            const isAbsent = attendanceStatus === false;
                            const isLocked = !timeAccess.allowed;

                            return (
                              <div
                                key={colIdx}
                                className={`asa-seat ${seat ? 'asa-seat-occupied' : 'asa-seat-empty'} ${isPresent ? 'asa-seat-present' : ''} ${isAbsent ? 'asa-seat-absent' : ''} ${isLocked && seat ? 'asa-seat-locked' : ''}`}
                                onClick={() => seat && !isLocked && toggleSeatAttendance(activeVenue, rowIdx, colIdx)}
                                title={seat 
                                  ? isLocked 
                                    ? `${seatLabel} • ${seat.name}\n${seat.rollNumber} • ${dept}\n\n🔒 ${timeAccess.message}` 
                                    : `${seatLabel} • ${seat.name}\n${seat.rollNumber} • ${dept}\n\nClick to toggle attendance` 
                                  : 'Empty'}
                              >
                                {seat ? (
                                  <div className="asa-seat-inner">
                                    <span className={`asa-seat-status ${isPresent ? 'asa-status-present' : isAbsent ? 'asa-status-absent' : 'asa-status-unmarked'}`}>
                                      {isPresent ? <UserCheck size={12} /> : isAbsent ? <UserX size={12} /> : '?'}
                                    </span>
                                    <span className="asa-seat-label">{seatLabel}</span>
                                    <span className="asa-seat-dept">{dept}</span>
                                    <span className="asa-seat-roll">{seat.rollNumber}</span>
                                  </div>
                                ) : (
                                  <span className="asa-seat-empty-dash">—</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentAttendance;
