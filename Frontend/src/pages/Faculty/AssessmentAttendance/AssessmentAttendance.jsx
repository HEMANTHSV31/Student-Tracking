import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, Building2,
  UserCheck, UserX, ClipboardCheck, Save, Search, RefreshCw,
  Grid3X3, BarChart3, CheckCircle, AlertCircle, Filter
} from 'lucide-react';
import {
  fetchSlots, fetchAllocation, fetchAttendance, saveAttendance as saveAttendanceApi
} from '../../../services/assessmentVenueApi';
import './AssessmentAttendance.css';

const AssessmentAttendance = () => {
  const navigate = useNavigate();
  
  // ── State ────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
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
      if (attRes.success && attRes.data) {
        const attendanceMap = {};
        attRes.data.forEach(alloc => {
          if (alloc.attendance_data) {
            attendanceMap[alloc.venue_id] = alloc.attendance_data;
          }
        });
        setAttendanceData(attendanceMap);
      } else {
        setAttendanceData({});
      }
    } catch (err) {
      console.error('Failed to load allocation:', err);
    }
  };

  // ── Attendance Functions ─────────────────────────────────────────────────
  const toggleSeatAttendance = (venueId, rowIdx, colIdx) => {
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
    if (!activeVenue || !venueAllocations[activeVenue]) return;
    
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
    if (!activeVenue || !venueAllocations[activeVenue]) return;
    
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
    if (!activeVenue) return;
    setAttendanceData(prev => ({ ...prev, [activeVenue]: {} }));
    setAttendanceModified(true);
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
    return matchesSearch && matchesYear;
  });

  const uniqueYears = [...new Set(slots.map(s => s.year))].sort();

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
              disabled={attendanceSaving || !attendanceModified}
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
            <div className="asa-slot-header">
              <h2><Calendar size={18} /> Select Assessment Slot</h2>
              <div className="asa-slot-filters">
                <div className="asa-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search slots..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
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
                <button className="asa-btn asa-btn-ghost" onClick={loadSlots}>
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
            </div>

            {slotsLoading ? (
              <div className="asa-loading">
                <RefreshCw size={32} className="asa-spin" />
                <p>Loading allocated slots...</p>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="asa-empty">
                <AlertCircle size={48} />
                <p>No allocated slots found</p>
                <span>Slots must be allocated before attendance can be marked</span>
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
                    <Users size={22} />
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{overallStats.totalStudents}</div>
                      <div className="asa-stat-label">Total Students</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-green">
                    <UserCheck size={22} />
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{attStats.present}</div>
                      <div className="asa-stat-label">Present</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-red">
                    <UserX size={22} />
                    <div className="asa-stat-info">
                      <div className="asa-stat-num">{attStats.absent}</div>
                      <div className="asa-stat-label">Absent</div>
                    </div>
                  </div>
                  <div className="asa-stat-card asa-stat-gray">
                    <AlertCircle size={22} />
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
                  <button className="asa-btn asa-btn-sm asa-btn-success" onClick={markAllPresent}>
                    <UserCheck size={14} /> All Present
                  </button>
                  <button className="asa-btn asa-btn-sm asa-btn-danger" onClick={markAllAbsent}>
                    <UserX size={14} /> All Absent
                  </button>
                  <button className="asa-btn asa-btn-sm asa-btn-ghost" onClick={clearAttendance}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Attendance Legend */}
              {activeVenue && (() => {
                const stats = getAttendanceStats(activeVenue);
                return (
                  <div className="asa-legend">
                    <span className="asa-legend-item asa-legend-present">
                      <UserCheck size={14} /> Present: <strong>{stats.present}</strong>
                    </span>
                    <span className="asa-legend-item asa-legend-absent">
                      <UserX size={14} /> Absent: <strong>{stats.absent}</strong>
                    </span>
                    <span className="asa-legend-item asa-legend-unmarked">
                      <Users size={14} /> Unmarked: <strong>{stats.unmarked}</strong>
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

                            return (
                              <div
                                key={colIdx}
                                className={`asa-seat ${seat ? 'asa-seat-occupied' : 'asa-seat-empty'} ${isPresent ? 'asa-seat-present' : ''} ${isAbsent ? 'asa-seat-absent' : ''}`}
                                style={{ background: seat ? getDepartmentColor(dept) : '' }}
                                onClick={() => seat && toggleSeatAttendance(activeVenue, rowIdx, colIdx)}
                                title={seat ? `${seatLabel} • ${seat.name}\n${seat.rollNumber} • ${dept}\n\nClick to toggle attendance` : 'Empty'}
                              >
                                {seat ? (
                                  <div className="asa-seat-inner">
                                    <span className="asa-seat-label">{seatLabel}</span>
                                    <span className="asa-seat-dept" style={{ color: getDepartmentTextColor(dept) }}>{dept}</span>
                                    <span className="asa-seat-roll">{seat.rollNumber}</span>
                                    <span className={`asa-seat-status ${isPresent ? 'asa-status-present' : isAbsent ? 'asa-status-absent' : 'asa-status-unmarked'}`}>
                                      {isPresent ? <UserCheck size={14} /> : isAbsent ? <UserX size={14} /> : '?'}
                                    </span>
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

            {/* Modified Warning */}
            {attendanceModified && (
              <div className="asa-save-banner">
                <AlertCircle size={18} />
                <span>You have unsaved changes</span>
                <button className="asa-btn asa-btn-primary" onClick={handleSaveAttendance} disabled={attendanceSaving}>
                  <Save size={16} /> {attendanceSaving ? 'Saving...' : 'Save Now'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentAttendance;
