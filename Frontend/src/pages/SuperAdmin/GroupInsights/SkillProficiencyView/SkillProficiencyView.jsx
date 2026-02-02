import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, Award, Target, Plus, X, ChevronLeft, ChevronRight, Users, BookOpen } from 'lucide-react';
import { apiPost } from '../../../../utils/api';

const SkillProficiencyView = ({ selectedVenue, selectedVenueName, facultyName, initialSkill = '' }) => {
  
  // Selected skill (single dropdown selection)
  const [selectedSkill, setSelectedSkill] = useState(initialSkill);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [studentSearch, setStudentSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All Years');
  // Default to venue filter when a specific venue is selected (not 'all')
  const [venueFilter, setVenueFilter] = useState(selectedVenue && selectedVenue !== 'all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Backend data states
  const [skillReports, setSkillReports] = useState([]);
  const [venueStudents, setVenueStudents] = useState([]); // All students in venue for "Not Attempted"
  const [assignedVenueStudents, setAssignedVenueStudents] = useState([]); // Students assigned to venue(s) for year filtering
  const [attemptedStudentIds, setAttemptedStudentIds] = useState([]); // All student IDs who attempted the skill
  const [availableSkills, setAvailableSkills] = useState([]); // Skills list from API
  const [skillStats, setSkillStats] = useState({
    totalStudentsDB: 0,
    totalAssignedStudents: 0,
    totalVenueStudents: 0,
    totalStudents: 0,
    cleared: 0,
    notCleared: 0,
    ongoing: 0,
    notAttempted: 0,
    avgBestScore: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounce search to avoid too many API calls
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(studentSearch);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Fetch skill reports with server-side filtering and pagination
  const fetchSkillReports = useCallback(async () => {
    if (!selectedVenue) {
      setSkillReports([]);
      setVenueStudents([]);
      setAvailableSkills([]);
      return;
    }

    // Only fetch detailed reports when a skill is selected
    if (!selectedSkill) {
      // Just fetch to get available skills
      try {
        const response = await apiPost('/skill-reports/faculty/venue/reports', {
          venueId: selectedVenue,
          page: 1,
          limit: 1, // Minimal fetch just to get available skills
          sortBy: 'last_slot_date',
          sortOrder: 'DESC',
        });
        
        const data = await response.json();
        
        // Set available skills from API response
        if (data.availableSkills) {
          setAvailableSkills(data.availableSkills.map((name, idx) => ({ id: idx + 1, name })));
        }
        // Store venue students for "Not Attempted" calculation
        if (data.venueStudents) {
          setVenueStudents(data.venueStudents);
        }
        setSkillReports([]);
        setTotalRecords(0);
        setTotalPages(1);
      } catch (err) {
        console.error('Error fetching available skills:', err);
      }
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Map status filter to API format
      let statusParam = null;
      if (statusFilter === 'Cleared') statusParam = 'Cleared';
      else if (statusFilter === 'Not Cleared') statusParam = 'Not Cleared';
      else if (statusFilter === 'Ongoing') statusParam = 'Ongoing';
      
      // console.log('[SKILL REPORTS] Sending request with:', { 
      //   venueId: selectedVenue, 
      //   skill: selectedSkill, 
      //   filterByVenue: venueFilter,
      //   statusFilter: statusParam,
      //   year: yearFilter
      // });
      
      const response = await apiPost('/skill-reports/faculty/venue/reports', {
        venueId: selectedVenue,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'last_slot_date',
        sortOrder: 'DESC',
        skill: selectedSkill, // Pass selected skill for server-side filtering
        status: statusParam,
        search: debouncedSearch || undefined,
        filterByVenue: venueFilter, // Send venue filter to backend
        year: yearFilter !== 'All Years' ? yearFilter : undefined, // Send year filter to backend
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch skill reports');
      }
      
      const data = await response.json();
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      setSkillReports(data.reports || []);
      setTotalRecords(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      
      // Set available skills from API response
      if (data.availableSkills) {
        setAvailableSkills(data.availableSkills.map((name, idx) => ({ id: idx + 1, name })));
      }
      
      // Store venue students for "Not Attempted" calculation
      if (data.venueStudents) {
        setVenueStudents(data.venueStudents);
      }
      
      // Store assigned venue students for year filtering on second card
      if (data.assignedVenueStudents) {
        setAssignedVenueStudents(data.assignedVenueStudents);
      }
      
      // Store attempted student IDs (all students who have attempted the skill, not paginated)
      if (data.attemptedStudentIds) {
        setAttemptedStudentIds(data.attemptedStudentIds);
      } else {
        setAttemptedStudentIds([]);
      }
      
      // Set stats from API response (backend returns 'statistics')
      if (data.statistics) {
        const totalVenueStudents = data.venueStudents?.length || 0;
        // Use statistics.total which is the count of unique students who have attempted this skill
        const attemptedCount = data.statistics.total || 0;
        const notAttemptedCount = Math.max(0, totalVenueStudents - attemptedCount);
        
        setSkillStats({
          totalStudentsDB: data.statistics.total_students || 0, // All students in DB
          totalAssignedStudents: data.statistics.total_assigned_students || 0, // Always show total assigned
          totalVenueStudents: totalVenueStudents,
          totalStudents: attemptedCount + notAttemptedCount, // Total includes attempted + not attempted
          cleared: data.statistics.cleared || 0,
          notCleared: data.statistics.not_cleared || 0,
          ongoing: data.statistics.ongoing || 0,
          notAttempted: notAttemptedCount,
          avgBestScore: data.statistics.avg_best_score || 0
        });
      }
    } catch (err) {
      console.error('Error fetching skill reports:', err);
      setError('Failed to load skill reports');
    } finally {
      setLoading(false);
    }
  }, [selectedVenue, selectedSkill, currentPage, itemsPerPage, statusFilter, debouncedSearch, venueFilter, yearFilter]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchSkillReports();
  }, [fetchSkillReports]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVenue, selectedSkill, statusFilter, venueFilter, yearFilter]);

  // Reset venueFilter when venue changes
  useEffect(() => {
    setVenueFilter(selectedVenue && selectedVenue !== 'all');
  }, [selectedVenue]);

  // Update selectedSkill when initialSkill changes
  useEffect(() => {
    if (initialSkill) {
      setSelectedSkill(initialSkill);
    }
  }, [initialSkill]);

  // Memoize the "Not Attempted" students list
  const notAttemptedStudents = useMemo(() => {
    if (!selectedSkill) return [];
    // Use attemptedStudentIds from API (all students who attempted, not just current page)
    const attemptedIdsSet = new Set(attemptedStudentIds);
    return venueStudents
      .filter(vs => !attemptedIdsSet.has(vs.student_id))
      .map(vs => ({
        rollNumber: vs.roll_number,
        studentId: vs.student_id,
        name: vs.student_name,
        year: vs.year || 'N/A',
        courseName: selectedSkill,
        venue: selectedVenueName || 'N/A',
        attempt: 0,
        status: 'Not Attempted',
        score: '-',
        attendance: '-',
        slotDate: '-',
        startTime: '-',
        endTime: '-'
      }));
  }, [attemptedStudentIds, venueStudents, selectedSkill, selectedVenueName]);

  // Transform skill reports to display format
  const attemptedStudents = useMemo(() => {
    return skillReports.map(report => ({
      rollNumber: report.roll_number,
      studentId: report.student_id,
      name: report.student_name,
      year: report.year || 'N/A',
      courseName: report.course_name,
      venue: report.student_current_venue || report.excel_venue_name || 'N/A',
      attempt: report.total_attempts || 1,
      status: report.status,
      score: report.latest_score ?? report.best_score ?? 0,
      attendance: report.last_attendance || 'N/A',
      slotDate: report.last_slot_date ? new Date(report.last_slot_date).toISOString().split('T')[0] : 'N/A',
      startTime: report.last_start_time || 'N/A',
      endTime: report.last_end_time || 'N/A'
    }));
  }, [skillReports]);

  // Combine all students for "All Status" view
  const allStudents = useMemo(() => {
    if (!selectedSkill) return [];
    return [...attemptedStudents, ...notAttemptedStudents];
  }, [attemptedStudents, notAttemptedStudents, selectedSkill]);

  // filteredStats - backend now handles year filtering, so we just use skillStats directly
  // The only exception is for Not Attempted count which is calculated on frontend
  const filteredStats = useMemo(() => {
    // Backend now returns year-filtered statistics
    // We still need to calculate notAttempted from frontend data for accuracy
    const filteredVenueStudents = yearFilter === 'All Years' 
      ? venueStudents 
      : venueStudents.filter(vs => String(vs.year || '') === yearFilter);
    
    const filteredAssignedVenueStudents = yearFilter === 'All Years'
      ? assignedVenueStudents
      : assignedVenueStudents.filter(vs => String(vs.year || '') === yearFilter);
    
    // Calculate not attempted from venue students minus attempted IDs
    const attemptedIdsSet = new Set(attemptedStudentIds);
    const notAttemptedCount = filteredVenueStudents.filter(vs => !attemptedIdsSet.has(vs.student_id)).length;
    
    return {
      ...skillStats,
      totalVenueStudents: filteredVenueStudents.length,
      totalAssignedStudents: filteredAssignedVenueStudents.length,
      notAttempted: notAttemptedCount,
    };
  }, [skillStats, yearFilter, venueStudents, assignedVenueStudents, attemptedStudentIds]);

  // Memoize the transformed data to avoid expensive recalculations
  const displayData = useMemo(() => {
    let baseData = attemptedStudents;
    
    // Determine base data based on status filter
    if (statusFilter === 'Not Attempted' && selectedSkill) {
      baseData = notAttemptedStudents;
    } else if (statusFilter === 'All Status' && selectedSkill) {
      baseData = allStudents;
    }
    
    // Apply year filter
    if (yearFilter !== 'All Years') {
      baseData = baseData.filter(student => {
        const studentYear = student.year?.toString();
        return studentYear === yearFilter;
      });
    }
    
    // Apply pagination (backend already filtered by venue if filterByVenue=true)
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return baseData.slice(startIndex, endIndex);
  }, [attemptedStudents, notAttemptedStudents, allStudents, statusFilter, selectedSkill, yearFilter, currentPage, itemsPerPage]);

  // Get correct pagination values based on filter
  const paginationInfo = useMemo(() => {
    let baseData = attemptedStudents;
    
    // Determine base data based on status filter
    if (statusFilter === 'Not Attempted' && selectedSkill) {
      baseData = notAttemptedStudents;
    } else if (statusFilter === 'All Status' && selectedSkill) {
      baseData = allStudents;
    } else {
      baseData = attemptedStudents;
    }
    
    // Apply year filter for count
    if (yearFilter !== 'All Years') {
      baseData = baseData.filter(student => {
        const studentYear = student.year?.toString();
        return studentYear === yearFilter;
      });
    }
    
    const total = baseData.length;
    
    return {
      totalRecords: total,
      totalPages: Math.ceil(total / itemsPerPage) || 1
    };
  }, [statusFilter, selectedSkill, yearFilter, notAttemptedStudents, allStudents, attemptedStudents, itemsPerPage]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Cleared':
        return { 
          icon: <CheckCircle size={16} />, 
          bg: '#dcfce7', 
          text: '#166534',
          label: 'Cleared'
        };
      case 'Not Cleared':
        return { 
          icon: <XCircle size={16} />, 
          bg: '#fee2e2', 
          text: '#991b1b',
          label: 'Not Cleared'
        };
      case 'Ongoing':
        return { 
          icon: <Clock size={16} />, 
          bg: '#fef3c7', 
          text: '#92400e',
          label: 'Ongoing'
        };
      case 'Not Attempted':
        return { 
          icon: <Target size={16} />, 
          bg: '#f3f4f6', 
          text: '#6b7280',
          label: 'Not Attempted'
        };
      default:
        return { 
          icon: null, 
          bg: '#f3f4f6', 
          text: '#374151',
          label: status
        };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#166534'; // Green
    if (score >= 50) return '#92400e'; // Yellow
    return '#991b1b'; // Red
  };

  return (
    <div>
      {/* Contextual Filters */}
      <div style={styles.contextFilters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Select Skill</label>
          <select 
            style={styles.select} 
            value={selectedSkill} 
            onChange={(e) => setSelectedSkill(e.target.value)}
            disabled={availableSkills.length === 0}
          >
            <option value="">-- Select a Skill --</option>
            {availableSkills.map((skill) => (
              <option key={skill.id} value={skill.name}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Status Filter</label>
          <select 
            style={styles.select} 
            value={statusFilter} 
            onChange={(e) => {
              // Prevent selecting Not Attempted when showing all students
              if (e.target.value === 'Not Attempted' && !venueFilter) {
                alert('"Not Attempted" filter is only available when viewing venue-assigned students. Please click the "Total Students In Venue" card first.');
                return;
              }
              setStatusFilter(e.target.value);
            }}
            disabled={!selectedSkill}
          >
            <option>All Status</option>
            <option>Cleared</option>
            <option>Not Cleared</option>
            <option>Ongoing</option>
            <option disabled={!venueFilter} title={!venueFilter ? 'Only available for venue-assigned students' : ''}>
              Not Attempted {!venueFilter ? '(Venue filter required)' : ''}
            </option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Year Filter</label>
          <select 
            style={styles.select} 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            disabled={!selectedSkill}
          >
            <option>All Years</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Search Student</label>
          <input
            style={styles.input}
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by name or roll number"
            disabled={!selectedSkill}
          />
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading skill reports...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && selectedVenue && availableSkills.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '16px', color: '#64748b' }}>No skill reports found for this venue</div>
          </div>
        )}

        {!loading && !error && selectedSkill && (
          <>
        <p style={styles.sectionTitle}>
          Skill completion status for: {selectedVenueName}
          {facultyName && (
            <span style={styles.facultyBadge}>
              <span style={styles.facultyLabel}>Faculty:</span> {facultyName}
            </span>
          )}
        </p>

        {/* Statistics Row */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>
                <Users size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Total Students</span>
              </div>
              <div 
                style={{
                  ...styles.statValue, 
                  cursor: 'pointer', 
                  backgroundColor: !venueFilter ? '#f0fdf4' : 'transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setVenueFilter(false);
                  setCurrentPage(1);
                  // Reset status filter if it's "Not Attempted" since it's not valid for all students
                  if (statusFilter === 'Not Attempted') {
                    setStatusFilter('All Status');
                  }
                }}
                title="Click to show all students"
              >
                {skillStats.totalStudentsDB || 0}
              </div>
              <div style={styles.statSub}>Click to show all</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>
                <BookOpen size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Total Students</span>
              </div>
              <div 
                style={{
                  ...styles.statValue, 
                  cursor: 'pointer',
                  backgroundColor: venueFilter ? '#f0fdf4' : 'transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setVenueFilter(true);
                  setCurrentPage(1);
                }}
                title="Click to filter by venue-assigned students"
              >
                {selectedVenueName === 'All Venues' 
                  ? (filteredStats.totalAssignedStudents || 0) 
                  : (filteredStats.totalVenueStudents || 0)}
              </div>
              <div style={styles.statSub}>
                {selectedVenueName === 'All Venues' 
                  ? 'Assigned to venues (click to filter)' 
                  : `In ${selectedVenueName} (click to filter)`}
              </div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={{...styles.statLabel, color: '#166534'}}>
                <CheckCircle size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Cleared</span>
              </div>
              <div style={{...styles.statValue, color: '#166534', cursor: 'pointer', transition: 'all 0.2s ease'}}
                onClick={() => setStatusFilter('Cleared')}
                title="Click to filter by Cleared"
              >
                {filteredStats.cleared}
              </div>
              <div style={styles.statSub}>Click to filter</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={{...styles.statLabel, color: '#991b1b'}}>
                <XCircle size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Not Cleared</span>
              </div>
              <div style={{...styles.statValue, color: '#991b1b', cursor: 'pointer', transition: 'all 0.2s ease'}}
                onClick={() => setStatusFilter('Not Cleared')}
                title="Click to filter by Not Cleared"
              >
                {filteredStats.notCleared}
              </div>
              <div style={styles.statSub}>Click to filter</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={{...styles.statLabel, color: '#f59e0b'}}>
                <Clock size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Ongoing</span>
              </div>
              <div style={{...styles.statValue, color: '#f59e0b', cursor: 'pointer', transition: 'all 0.2s ease'}}
                onClick={() => setStatusFilter('Ongoing')}
                title="Click to filter by Ongoing"
              >
                {filteredStats.ongoing}
              </div>
              <div style={styles.statSub}>Click to filter</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={{...styles.statLabel, color: '#6b7280'}}>
                <AlertCircle size={16} style={{verticalAlign: 'middle', marginRight: '6px'}} />
                <span style={{verticalAlign: 'middle'}}>Not Attempted</span>
              </div>
              <div 
                style={{
                  ...styles.statValue, 
                  color: '#6b7280', 
                  cursor: venueFilter ? 'pointer' : 'default', 
                  transition: 'all 0.2s ease',
                  opacity: venueFilter ? 1 : 0.7
                }}
                onClick={() => {
                  if (!venueFilter) {
                    return; // Don't do anything when showing all students
                  }
                  setStatusFilter('Not Attempted');
                }}
                title={venueFilter ? 'Click to filter by Not Attempted' : 'Not Attempted count (click venue card to filter)'}
              >
                {filteredStats.notAttempted}
              </div>
              <div style={styles.statSub}>{venueFilter ? 'Click to filter' : 'View only'}</div>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statContent}>
              <div style={{...styles.statLabel, color: '#8b5cf6'}}>% Cleared</div>
              <div style={{...styles.statValue, color: '#8b5cf6', cursor: 'pointer', transition: 'all 0.2s ease'}}
                onClick={() => setStatusFilter('Cleared')}
                title="Click to filter by Cleared"
              >
                {filteredStats.totalStudents > 0 
                  ? ((filteredStats.cleared / filteredStats.totalStudents) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div style={styles.statSub}>Click to filter</div>
            </div>
          </div>
        </div>
        {/* Status Filter Badges */}
        <div style={styles.tableControls}>
          <button 
            style={statusFilter === 'All Status' ? styles.filterBadgeActive : styles.filterBadge}
            onClick={() => setStatusFilter('All Status')}
          >
            All ({skillStats.totalAssignedStudents})
          </button>
          <button 
            style={statusFilter === 'Cleared' ? styles.filterBadgeActive : styles.filterBadge}
            onClick={() => setStatusFilter('Cleared')}
          >
            Cleared ({skillStats.cleared})
          </button>
          <button 
            style={statusFilter === 'Not Cleared' ? styles.filterBadgeActive : styles.filterBadge}
            onClick={() => setStatusFilter('Not Cleared')}
          >
            Not Cleared ({skillStats.notCleared})
          </button>
          <button 
            style={statusFilter === 'Ongoing' ? styles.filterBadgeActive : styles.filterBadge}
            onClick={() => setStatusFilter('Ongoing')}
          >
            Ongoing ({skillStats.ongoing})
          </button>
          <button 
            style={statusFilter === 'Not Attempted' ? styles.filterBadgeActive : styles.filterBadge}
            onClick={() => setStatusFilter('Not Attempted')}
          >
            Not Attempted ({skillStats.notAttempted})
          </button>
        </div>

        {/* Student Skill Attempts Table */}
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Roll Number</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Year</th>
                <th style={styles.th}>Skill / Course</th>
                <th style={styles.th}>Venue</th>
                <th style={styles.th}>Attempt #</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}>Slot Date</th>
                <th style={styles.th}>Time Slot</th>
              </tr>
            </thead>
            <tbody>
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{...styles.td, textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
                    {!selectedSkill 
                      ? 'Please select a skill to view student data'
                      : loading ? 'Loading...' : 'No student data found for the selected skill'}
                  </td>
                </tr>
              ) : (
                displayData.map((student, idx) => {
                  const statusInfo = getStatusBadge(student.status);
                  return (
                    <tr key={`${student.rollNumber}-${idx}`} style={styles.tr}>
                      <td style={styles.td}>{student.rollNumber}</td>
                      <td style={styles.td}>{student.name}</td>
                      <td style={styles.td}>{student.year}</td>
                      <td style={styles.td}>{student.courseName}</td>
                      <td style={styles.td}>{student.venue}</td>
                      <td style={styles.td}>
                        <span style={{ 
                          fontWeight: '600',
                          backgroundColor: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          {student.attempt}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          fontWeight: '600',
                          color: getScoreColor(student.score)
                        }}>
                          {student.score}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          ...styles.statusBadge, 
                          backgroundColor: statusInfo.bg, 
                          color: statusInfo.text,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: 'fit-content'
                        }}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ 
                          color: student.attendance === 'Present' ? '#166534' : '#991b1b'
                        }}>
                          {student.attendance}
                        </span>
                      </td>
                      <td style={styles.td}>{student.slotDate}</td>
                      <td style={styles.td}>
                        {student.startTime} - {student.endTime}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {paginationInfo.totalPages > 0 && (
          <div style={styles.pagination}>
            <div style={styles.paginationInfo}>
              Showing {paginationInfo.totalRecords > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} records
            </div>
            <div style={styles.paginationControls}>
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                }}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              {paginationInfo.totalPages > 1 && (
                <div style={styles.pageNumbers}>
                  {[...Array(Math.min(5, paginationInfo.totalPages))].map((_, idx) => {
                    let pageNum;
                    if (paginationInfo.totalPages <= 5) {
                      pageNum = idx + 1;
                    } else if (currentPage <= 3) {
                      pageNum = idx + 1;
                    } else if (currentPage >= paginationInfo.totalPages - 2) {
                      pageNum = paginationInfo.totalPages - 4 + idx;
                    } else {
                      pageNum = currentPage - 2 + idx;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        style={{
                          ...styles.pageNumberButton,
                          ...(currentPage === pageNum ? styles.pageNumberButtonActive : {})
                        }}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              )}
              
              <button
                style={{
                  ...styles.paginationButton,
                  ...(currentPage === paginationInfo.totalPages ? styles.paginationButtonDisabled : {})
                }}
                onClick={() => setCurrentPage(prev => Math.min(paginationInfo.totalPages, prev + 1))}
                disabled={currentPage === paginationInfo.totalPages}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
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
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  facultyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '13px',
    color: '#1e40af',
    fontWeight: '500',
  },
  facultyLabel: {
    color: '#6b7280',
    fontWeight: '400',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statBox: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  statIconWrapper: {
    flexShrink: 0,
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '20px',
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
  },
  filterBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterBadgeActive: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #0066FF',
    backgroundColor: '#0066FF',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    marginBottom: '32px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
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
  sectionHeader: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    marginTop: '0px',
    marginBottom: '4px',
  },
  sectionSubHeader: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  skillSelectorSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  skillSelectorHeader: {
    marginBottom: '16px',
  },
  skillSelectorTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
  },
  skillSelectorSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  selectedSkillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
  skillChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '20px',
    padding: '8px 12px',
  },
  skillChipText: {
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '500',
  },
  skillChipRemove: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    color: '#1e40af',
    transition: 'color 0.2s',
  },
  addSkillButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#fff',
    border: '1px dashed #9ca3af',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500',
  },
  skillPickerDropdown: {
    marginTop: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  skillPickerTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  skillList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '8px',
  },
  skillOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
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
  paginationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageNumbers: {
    display: 'flex',
    gap: '4px',
  },
  pageNumberButton: {
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    minWidth: '36px',
    textAlign: 'center',
  },
  pageNumberButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
};

export default SkillProficiencyView;