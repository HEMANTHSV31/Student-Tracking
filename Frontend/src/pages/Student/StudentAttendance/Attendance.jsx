import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    BookOpen,
    Filter,
    ChevronRight,
    Search,
    TrendingUp,
    Info,
    ChevronLeft
} from 'lucide-react';
import useAuthStore from '../../../store/useAuthStore';
import { apiGet } from '../../../utils/api';

const StudentAttendance = () => {
    const { user } = useAuthStore();
    const API_URL = import.meta.env.VITE_API_URL;

    // --- STATE MANAGEMENT ---
    const [attendanceSummary, setAttendanceSummary] = useState({
        overall: 0,
        totalClasses: 0,
        present: 0,
        absent: 0,
        late: 0,
        standing: "Loading..."
    });

    const [subjectAttendance, setSubjectAttendance] = useState([]);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filter, setFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(''); // Don't auto-select today - show all records
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Define standard time slots for a day (matching actual session timings)
    const TIME_SLOTS = [
        { hour: 1, name: 'Hour 1', time: '08:45 - 10:25' },
        { hour: 2, name: 'Hour 2', time: '10:45 - 12:25' },
        { hour: 3, name: 'Hour 3', time: '13:30 - 15:10' },
        { hour: 4, name: 'Hour 4', time: '15:25 - 16:30' }
    ];

    // --- FETCH DATA FROM BACKEND ---
    useEffect(() => {
        const fetchAttendanceData = async () => {
            if (!user?.user_id) return;

            setLoading(true);
            setError(null);

            try {
                // Fetch dashboard data
                const dashboardResponse = await apiGet('/attendance/dashboard');

                const dashboardData = await dashboardResponse.json();

                if (dashboardData.success) {
                    const data = dashboardData.data;
                    
                    console.log('📊 Dashboard data received:', data);
                    
                    // Extract session counts from overallStats sub text
                    // Format: "Total days: X (present_hours/total_hours hours)"
                    const overallStats = data.overallStats?.[0];
                    let totalSessions = 0, presentSessions = 0, lateSessions = 0;
                    
                    if (overallStats?.sub) {
                        const match = overallStats.sub.match(/(\d+)\/(\d+) hours/);
                        if (match) {
                            presentSessions = parseInt(match[1]) || 0;
                            totalSessions = parseInt(match[2]) || 0;
                        }
                    }
                    
                    // Get late count from sessionStatus (backend doesn't calculate this correctly for days)
                    // We need to count late sessions from the actual attendance history
                    lateSessions = data.sessionStatus?.find(s => s.label === 'Late')?.count || 0;
                    const absentSessions = totalSessions - presentSessions;
                    
                    // Use overall percentage from backend
                    const overallPercent = overallStats?.value ? 
                        parseInt(overallStats.value.replace('%', '')) : 0;

                    setAttendanceSummary({
                        overall: overallPercent,
                        totalClasses: totalSessions,
                        present: presentSessions - lateSessions, // Subtract late to get pure present
                        absent: absentSessions,
                        late: lateSessions,
                        standing: overallPercent >= 75 ? "Good Standing" : "Warning"
                    });
                    
                    console.log('✅ Summary set:', { overallPercent, totalSessions, presentSessions, lateSessions, absentSessions });

                    // Set subject attendance
                    const subjects = data.subjects.map((sub, index) => ({
                        id: index + 1,
                        name: sub.name,
                        code: `VENUE-${index + 1}`,
                        present: sub.current,
                        total: sub.total,
                        percent: sub.percent,
                        status: sub.percent >= 75 ? 'safe' : 'warning'
                    }));
                    setSubjectAttendance(subjects);
                }

                // Fetch attendance history
                const historyResponse = await apiGet('/attendance/history');

                const historyData = await historyResponse.json();

                console.log('📊 Attendance history response:', historyData);

                if (historyData.success) {
                    const history = historyData.data.map((record, index) => {
                        console.log('Processing record:', record);
                        
                        // Backend now provides session_date and session_number directly
                        const sessionDate = record.session_date || new Date(record.created_at).toISOString().split('T')[0];
                        const hour = record.session_number || 1; // Session number 1-4
                        
                        // Format time display based on session number
                        const timeSlotMap = {
                            1: 'Hour 1 (08:45 - 10:30)',
                            2: 'Hour 2 (10:40 - 12:30)',
                            3: 'Hour 3 (13:30 - 15:10)',
                            4: 'Hour 4 (15:25 - 16:30)'
                        };
                        
                        const timeDisplay = `Hour ${hour}`;
                        const fullTimeDisplay = timeSlotMap[hour] || `Hour ${hour}`;

                        // Determine status based on remarks or is_present flag
                        let status = 'absent';
                        if (record.remarks === 'PS') {
                            status = 'ps';
                        } else if (record.remarks === 'MM') {
                            status = 'mm';
                        } else if (record.remarks === 'AD') {
                            status = 'ad';
                        } else if (record.remarks === 'Other') {
                            status = 'other';
                        } else if (record.is_present === 1) {
                            status = record.is_late === 1 ? 'late' : 'present';
                        }

                        console.log(`Record ${index}: date=${sessionDate}, hour=${hour}, status=${status}, venue=${record.venue_name}`);

                        return {
                            id: record.attendance_id || index,
                            date: sessionDate,
                            subject: record.venue_name || record.subject_name || 'Unknown Subject',
                            time: timeDisplay,
                            displayTime: fullTimeDisplay,
                            hour: hour,
                            status: status,
                            originalData: record // Keep original data for reference
                        };
                    });
                    // Data is already sorted by backend: ORDER BY session_date DESC, session_number ASC
                    
                    console.log('✅ Processed attendance history:', history);
                    setAttendanceHistory(history);
                }

            } catch (err) {
                console.error('❌ Error fetching attendance data:', err);
                setError('Failed to load attendance data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchAttendanceData();
    }, [user, API_URL]);

    // Create a map of dates with attendance records grouped by hour
    const attendanceByDateAndHour = attendanceHistory.reduce((acc, record) => {
        if (!acc[record.date]) {
            acc[record.date] = {};
        }
        
        // Only add records with valid hour numbers (1-4)
        // Skip records without proper session/hour information
        if (record.hour && record.hour >= 1 && record.hour <= 4) {
            acc[record.date][record.hour] = record;
        } else {
            console.warn('⚠️ Attendance record missing valid hour/session number:', record);
        }
        
        return acc;
    }, {});

    // Get unique dates from actual attendance records only
    const uniqueDates = [...new Set(attendanceHistory.map(record => record.date))].sort((a, b) => new Date(b) - new Date(a));

    // Just use the attendance history as-is without creating fake "No Session" entries
    // This shows only actual attendance records that were marked by faculty
    const completeHistory = attendanceHistory;

    // Filter history based on filter and selected date
    const filteredHistory = completeHistory.filter(record => {
        const matchesFilter = filter === 'all' || record.status === filter;
        const matchesDate = !selectedDate || record.date === selectedDate;
        return matchesFilter && matchesDate;
    });

    // Group filtered history by date to show daily breakdown
    const groupedByDate = filteredHistory.reduce((acc, record) => {
        if (!acc[record.date]) {
            acc[record.date] = [];
        }
        acc[record.date].push(record);
        return acc;
    }, {});

    // If a date is selected, show only that date's records
    const displayHistory = selectedDate ? (groupedByDate[selectedDate] || []) : filteredHistory;

    // Pagination calculations
    const totalPages = Math.ceil(displayHistory.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, displayHistory.length);
    const currentItems = displayHistory.slice(startIndex, endIndex);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'present': return { color: '#10B981', bg: '#F0FDF4', icon: <CheckCircle2 size={16} />, label: 'PRESENT' };
            case 'absent': return { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={16} />, label: 'ABSENT' };
            case 'late': return { color: '#F59E0B', bg: '#FFF7ED', icon: <Clock size={16} />, label: 'LATE' };
            case 'ps': return { color: '#8B5CF6', bg: '#F5F3FF', icon: <CheckCircle2 size={16} />, label: 'PS (PERMISSION)' };
            case 'mm': return { color: '#06B6D4', bg: '#ECFEFF', icon: <CheckCircle2 size={16} />, label: 'MM (MEETING)' };
            case 'ad': return { color: '#14B8A6', bg: '#F0FDFA', icon: <CheckCircle2 size={16} />, label: 'AD (ACADEMICS)' };
            case 'other': return { color: '#6366F1', bg: '#EEF2FF', icon: <Info size={16} />, label: 'OTHER' };
            default: return { color: '#6B7280', bg: '#F3F4F6', icon: <Info size={16} />, label: status?.toUpperCase() || 'UNKNOWN' };
        }
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 3;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 2) {
                pages.push(1, 2, 3);
            } else if (currentPage >= totalPages - 1) {
                pages.push(totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(currentPage - 1, currentPage, currentPage + 1);
            }
        }
        return pages;
    };

    // Helper to get time slots display
    const getTimeSlotsDisplay = () => {
        return TIME_SLOTS.map(slot => `${slot.name}`).join(' • ');
    };

    // Handle date change
    const handleDateChange = (date) => {
        setSelectedDate(date);
        setCurrentPage(1);
    };

    return (
        <div style={styles.container}>
            {/* Responsive Styles Injection */}
            <style>{`
                @media (max-width: 768px) {
                    .header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px;
                    }
                    .standing-badge {
                        align-self: flex-start !important;
                    }
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 12px !important;
                    }
                    .main-layout {
                        grid-template-columns: 1fr !important;
                        gap: 24px !important;
                    }
                    .subject-card {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px;
                    }
                    .percent-group {
                        flex-direction: row !important;
                        width: 100%;
                        justify-content: space-between !important;
                        align-items: center;
                    }
                    .filter-group {
                        flex-direction: column !important;
                        gap: 12px;
                    }
                    .search-box {
                        width: 100% !important;
                    }
                    .history-item {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 12px;
                    }
                    .history-left {
                        width: 100%;
                    }
                    .history-status-text {
                        align-self: flex-end;
                    }
                    .pagination-container {
                        flex-direction: column !important;
                        align-items: center !important;
                        gap: 16px !important;
                        padding: 16px !important;
                    }
                    .pagination-info {
                        width: 100%;
                        text-align: center !important;
                    }
                    .pagination-controls {
                        width: 100%;
                        justify-content: center !important;
                    }
                    .time-slots-display {
                        display: none !important;
                    }
                    .daily-summary {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 12px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .stat-card {
                        padding: 20px !important;
                    }
                    .container {
                        padding: 16px !important;
                    }
                    .section-title {
                        font-size: 16px !important;
                    }
                    .subject-name {
                        font-size: 14px !important;
                    }
                    .pagination-buttons {
                        flex-wrap: wrap !important;
                        justify-content: center !important;
                        gap: 8px !important;
                    }
                    .page-number {
                        min-width: 36px !important;
                        height: 36px !important;
                    }
                }
            `}</style>

            {/* Loading State */}
            {loading && (
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '80px 20px',
                    minHeight: '60vh'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #E5E7EB',
                        borderTop: '4px solid #2563EB',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '20px'
                    }}></div>
                    <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '500' }}>Loading your attendance data...</p>
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{ 
                    padding: '24px', 
                    backgroundColor: '#FEF2F2', 
                    borderRadius: '12px', 
                    marginBottom: '24px',
                    border: '1px solid #FEE2E2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <AlertCircle size={20} color="#EF4444" />
                    <p style={{ color: '#EF4444', fontSize: '14px', margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Content - Only show when not loading */}
            {!loading && !error && (
                <>
                    {/* Header Section */}
                    <header style={styles.header} className="header">
                        <div style={styles.headerLeft}>
                            <h1 style={styles.title}>My Attendance</h1>
                            <p style={styles.subtitle}>Track your presence and maintain your academic standing</p>
                        </div>
                        <div style={styles.standingBadge} className="standing-badge">
                            <TrendingUp size={16} style={{ marginRight: 8 }} />
                            {attendanceSummary.standing}
                        </div>
                    </header>

                    {/* Quick Stats Grid */}
                    <div style={styles.statsGrid} className="stats-grid">
                        <div style={styles.statCard}>
                            <div style={styles.statIconBox}><CheckCircle2 color="#10B981" /></div>
                            <div style={styles.statInfo}>
                                <span style={styles.statLabel}>Overall Attendance</span>
                                <span style={styles.statValue}>{attendanceSummary.overall}%</span>
                            </div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIconBox}><BookOpen color="#2563EB" /></div>
                            <div style={styles.statInfo}>
                                <span style={styles.statLabel}>Total Classes</span>
                                <span style={styles.statValue}>{attendanceSummary.totalClasses}</span>
                            </div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIconBox}><Clock color="#F59E0B" /></div>
                            <div style={styles.statInfo}>
                                <span style={styles.statLabel}>Present / Late</span>
                                <span style={styles.statValue}>{attendanceSummary.present} / {attendanceSummary.late}</span>
                            </div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={styles.statIconBox}><XCircle color="#EF4444" /></div>
                            <div style={styles.statInfo}>
                                <span style={styles.statLabel}>Absent</span>
                                <span style={styles.statValue}>{attendanceSummary.absent}</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Banner for Empty State */}
                    {attendanceSummary.totalClasses === 0 && (
                        <div style={{
                            backgroundColor: '#FFFBEB',
                            border: '1px solid #FCD34D',
                            borderRadius: '12px',
                            padding: '20px 24px',
                            marginBottom: '32px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#FEF3C7',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Info size={20} color="#F59E0B" />
                            </div>
                            <div>
                                <h3 style={{ 
                                    fontSize: '16px', 
                                    fontWeight: '700', 
                                    color: '#92400E',
                                    marginBottom: '8px',
                                    marginTop: '4px'
                                }}>
                                    Welcome to Your Attendance Dashboard!
                                </h3>
                                <p style={{ 
                                    fontSize: '14px', 
                                    color: '#78350F',
                                    lineHeight: '1.6',
                                    margin: 0
                                }}>
                                    Your attendance records will automatically appear here once your faculty starts marking attendance. 
                                    Make sure to attend your classes regularly to maintain good academic standing!
                                </p>
                            </div>
                        </div>
                    )}

                    <div style={styles.mainLayout} className="main-layout">
                        {/* Right Side: Attendance History (now full width) */}
                        <div style={{...styles.rightCol, width: '100%', maxWidth: '100%'}}>
                            <div style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h2 style={styles.sectionTitle} className="section-title">
                                        {selectedDate ? `Attendance for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'All Attendance Records'}
                                    </h2>
                                    <div style={styles.filterGroup} className="filter-group">
                                        <select
                                            style={styles.filterSelect}
                                            value={filter}
                                            onChange={(e) => setFilter(e.target.value)}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="present">Present</option>
                                            <option value="late">Late</option>
                                            <option value="ps">PS (Permission)</option>
                                            <option value="mm">MM (Meeting)</option>
                                            <option value="ad">AD (Academics)</option>
                                            <option value="other">Other</option>
                                            <option value="absent">Absent</option>
                                        </select>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <Calendar size={14} style={{ position: 'absolute', left: '10px', color: '#9CA3AF', zIndex: 1 }} />
                                            <input
                                                type="date"
                                                style={{
                                                    ...styles.filterSelect,
                                                    paddingLeft: '32px',
                                                    minWidth: '160px',
                                                    cursor: 'pointer'
                                                }}
                                                value={selectedDate}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                min={uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : ''}
                                                placeholder="All dates"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Daily Summary - Show when date is selected */}
                                {selectedDate && groupedByDate[selectedDate] && (
                                    <div style={{
                                        padding: '16px',
                                        backgroundColor: '#F9FAFB',
                                        borderBottom: '1px solid #E5E7EB',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }} className="daily-summary">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={18} color="#6366F1" />
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                                    4 hours per day
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6B7280' }} className="time-slots-display">
                                                {getTimeSlotsDisplay()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {['present', 'late', 'absent'].map(status => {
                                                const count = groupedByDate[selectedDate].filter(r => r.status === status).length;
                                                const statusStyle = getStatusStyle(status);
                                                return count > 0 && (
                                                    <div key={status} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        backgroundColor: statusStyle.bg,
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        color: statusStyle.color
                                                    }}>
                                                        {statusStyle.icon}
                                                        <span>{count} {status}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {groupedByDate[selectedDate].filter(r => r.status === 'present' || r.status === 'late').length === 4 && (
                                            <div style={{
                                                width: '100%',
                                                marginTop: '8px',
                                                padding: '8px 12px',
                                                backgroundColor: '#ECFDF5',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '13px',
                                                color: '#059669'
                                            }}>
                                                <Info size={14} />
                                                <span>Perfect attendance - all 4 hours attended!</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={styles.historyList}>
                                    {currentItems.length === 0 ? (
                                        <div style={{ 
                                            padding: '60px 40px', 
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                width: '80px',
                                                height: '80px',
                                                margin: '0 auto 24px',
                                                backgroundColor: '#F3F4F6',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Calendar size={40} color="#9CA3AF" />
                                            </div>
                                            <h3 style={{ 
                                                fontSize: '18px', 
                                                fontWeight: '700', 
                                                color: '#1F2937',
                                                marginBottom: '8px' 
                                            }}>
                                                {displayHistory.length === 0 && attendanceHistory.length > 0 
                                                    ? 'No Matching Records' 
                                                    : 'No Attendance History'}
                                            </h3>
                                            <p style={{ 
                                                fontSize: '14px', 
                                                color: '#6B7280',
                                                lineHeight: '1.6',
                                                maxWidth: '300px',
                                                margin: '0 auto'
                                            }}>
                                                {displayHistory.length === 0 && attendanceHistory.length > 0
                                                    ? selectedDate 
                                                        ? `No attendance records found for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}. Try selecting a different date or clear the date filter.`
                                                        : 'Try adjusting your search or filter criteria'
                                                    : 'Your attendance records will appear here once faculty marks your attendance. Check the browser console for debugging info.'}
                                            </p>
                                        </div>
                                    ) : (
                                        currentItems.map(record => {
                                            const status = getStatusStyle(record.status);
                                            return (
                                                <div key={record.id} style={styles.historyItem} className="history-item">
                                                    <div style={styles.historyLeft} className="history-left">
                                                        <div style={{ ...styles.statusIndicator, backgroundColor: status.bg, color: status.color }}>
                                                            {status.icon}
                                                        </div>
                                                        <div style={styles.historyDetails}>
                                                            <div style={styles.historySubject}>{record.subject}</div>
                                                            <div style={styles.historyMeta}>
                                                                <Calendar size={12} style={{ marginRight: 4 }} /> 
                                                                {record.date}
                                                                <span style={{ margin: '0 8px' }}>•</span>
                                                                <Clock size={12} style={{ marginRight: 4 }} /> 
                                                                {record.displayTime || record.time}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ ...styles.historyStatusText, color: status.color }} className="history-status-text">
                                                        {status.label || record.status.toUpperCase()}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                
                                {/* Pagination Component - Only show if there's data */}
                                {displayHistory.length > 0 && (
                                    <div style={styles.paginationContainer} className="pagination-container">
                                        <div style={styles.paginationInfo} className="pagination-info">
                                            Showing {startIndex + 1}-{endIndex} of {displayHistory.length} records
                                        </div>
                                        <div style={styles.paginationControls} className="pagination-controls">
                                            <div style={styles.paginationButtons} className="pagination-buttons">
                                                <button
                                                    style={{
                                                        ...styles.paginationButton,
                                                        ...styles.prevButton,
                                                        opacity: currentPage === 1 ? 0.5 : 1
                                                    }}
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft size={16} /> Prev
                                                </button>
                                                
                                                {getPageNumbers().map(page => (
                                                    <button
                                                        key={page}
                                                        style={{
                                                            ...styles.paginationButton,
                                                            ...styles.pageNumber,
                                                            backgroundColor: currentPage === page ? '#2563EB' : 'transparent',
                                                            color: currentPage === page ? '#FFFFFF' : '#374151'
                                                        }}
                                                        onClick={() => setCurrentPage(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                
                                                <button
                                                    style={{
                                                        ...styles.paginationButton,
                                                        ...styles.nextButton,
                                                        opacity: currentPage === totalPages ? 0.5 : 1
                                                    }}
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#F8F9FA',
        minHeight: '100vh',
        fontFamily: '"Inter", sans-serif',
        padding: '24px'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
    },
    title: {
        fontSize: '28px',
        fontWeight: '800',
        color: '#111827',
        margin: '0 0 8px 0'
    },
    subtitle: {
        fontSize: '15px',
        color: '#6B7280',
        margin: 0
    },
    standingBadge: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#ECFDF5',
        color: '#059669',
        borderRadius: '100px',
        fontWeight: '700',
        fontSize: '14px'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
        marginBottom: '32px'
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    },
    statIconBox: {
        width: '48px',
        height: '48px',
        backgroundColor: '#F3F4F6',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statInfo: {
        display: 'flex',
        flexDirection: 'column'
    },
    statLabel: {
        fontSize: '13px',
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: '4px'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '800',
        color: '#111827'
    },
    mainLayout: {
        display: 'grid',
        gridTemplateColumns: '1fr 450px',
        gap: '24px'
    },
    sectionTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#111827',
        margin: 0
    },
    subjectList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    subjectCard: {
        backgroundColor: '#FFFFFF',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    subjectInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden'
    },
    subjectCode: {
        fontSize: '11px',
        fontWeight: '800',
        color: '#2563EB',
        backgroundColor: '#EFF6FF',
        width: 'fit-content',
        padding: '2px 8px',
        borderRadius: '4px',
        marginBottom: '4px'
    },
    subjectName: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#111827',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%'
    },
    classCounts: {
        fontSize: '13px',
        color: '#6B7280',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    percentGroup: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
    },
    percentCircle: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        border: '4px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        fontWeight: '800',
        color: '#111827'
    },
    statusText: {
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    rightCol: {
        display: 'flex',
        flexDirection: 'column'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: 'fit-content'
    },
    cardHeader: {
        padding: '24px',
        borderBottom: '1px solid #F3F4F6'
    },
    filterGroup: {
        display: 'flex',
        gap: '12px',
        marginTop: '16px'
    },
    searchBox: {
        position: 'relative',
        flex: 1
    },
    searchIcon: {
        position: 'absolute',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9CA3AF'
    },
    searchInput: {
        width: '100%',
        padding: '8px 12px 8px 32px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        fontSize: '13px',
        outline: 'none',
        transition: 'border-color 0.2s',
        '&:focus': {
            borderColor: '#2563EB'
        }
    },
    filterSelect: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        fontSize: '13px',
        color: '#374151',
        outline: 'none',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        '&:focus': {
            borderColor: '#2563EB'
        }
    },
    historyList: {
        display: 'flex',
        flexDirection: 'column'
    },
    historyItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #F3F4F6',
        gap: '12px',
        minWidth: 0,
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#F9FAFB'
        }
    },
    historyLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden'
    },
    statusIndicator: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    },
    historyDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden'
    },
    historySubject: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1F2937',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%'
    },
    historyMeta: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        color: '#6B7280',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        flexWrap: 'wrap'
    },
    historyStatusText: {
        fontSize: '11px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    // Pagination Styles
    paginationContainer: {
        padding: '20px 24px',
        borderTop: '1px solid #F3F4F6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px'
    },
    paginationInfo: {
        fontSize: '14px',
        color: '#6B7280',
        fontWeight: '500'
    },
    paginationControls: {
        display: 'flex',
        alignItems: 'center'
    },
    paginationButtons: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    paginationButton: {
        padding: '8px 16px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        '&:hover:not(:disabled)': {
            backgroundColor: '#F3F4F6',
            borderColor: '#D1D5DB'
        },
        '&:disabled': {
            cursor: 'not-allowed',
            opacity: 0.5
        }
    },
    prevButton: {
        backgroundColor: '#FFFFFF',
        color: '#374151'
    },
    nextButton: {
        backgroundColor: '#FFFFFF',
        color: '#374151'
    },
    pageNumber: {
        minWidth: '40px',
        height: '40px',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #E5E7EB'
    }
};

export default StudentAttendance;