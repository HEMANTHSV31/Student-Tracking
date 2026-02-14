import React, { useState, useEffect } from 'react';
import {
    Download,
    Calendar,
    Clock,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    FileSpreadsheet,
    Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/useAuthStore';
import { apiGet } from '../../../utils/api';

const AttendanceExport = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [hoveredButton, setHoveredButton] = React.useState(null);

    // State variables
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [selectedYear, setSelectedYear] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return firstDayOfMonth.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);

    const TIME_SLOTS = [
        { value: 'all', label: 'All Time Slots' },
        { value: '09:00 AM - 10:30 AM', label: '09:00 AM - 10:30 AM' },
        { value: '10:30 AM - 12:30 PM', label: '10:30 AM - 12:30 PM' },
        { value: '01:30 PM - 03:00 PM', label: '01:30 PM - 03:00 PM' },
        { value: '03:00 PM - 04:30 PM', label: '03:00 PM - 04:30 PM' }
    ];

    useEffect(() => {
        fetchVenues();
    }, [selectedYear]);

    const fetchVenues = async () => {
        if (!user) {
            setError('User information not available. Please login again.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const yearParam = selectedYear ? `?year=${selectedYear}` : '';
            const response = await apiGet(`/attendance/venues${yearParam}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data.length > 0) {
                setVenues(data.data);
                setSelectedVenue(data.data[0]);
            } else {
                setVenues([]);
                setSelectedVenue(null);
                setError(data.message || 'No venues found for the selected year');
            }
        } catch (err) {
            console.error('Error fetching venues:', err);
            setError('Failed to fetch venues. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        if (!selectedVenue) {
            setError('Please select a venue first');
            return;
        }

        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after end date');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            // Build query parameters
            const params = new URLSearchParams({
                venueId: selectedVenue.venue_id,
                startDate,
                endDate
            });

            if (selectedTimeSlot !== 'all') {
                params.append('timeSlot', selectedTimeSlot);
            }

            if (selectedYear) {
                params.append('year', selectedYear);
            }

            const response = await apiGet(`/attendance/export?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setAttendanceData(data.data || []);
                setSuccess(`Loaded ${data.data?.length || 0} attendance records`);
            } else {
                setAttendanceData([]);
                setError(data.message || 'Failed to fetch attendance data');
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            setError('Failed to fetch attendance data');
            setAttendanceData([]);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!attendanceData || attendanceData.length === 0) {
            alert('No attendance data to export. Please load data first.');
            return;
        }

        const escapeCsv = (value) => {
            const str = value === null || value === undefined ? '' : String(value);
            const needsQuotes = /[\",\n\r]/.test(str);
            const escaped = str.replace(/\"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
        };

        const headers = [
            'Date',
            'Time Slot',
            'Roll Number',
            'Student Name',
            'Email',
            'Status',
            'Remarks',
            'Venue',
            'Faculty'
        ];

        const lines = [headers.map(escapeCsv).join(',')];

        attendanceData.forEach((record) => {
            lines.push([
                escapeCsv(record.date),
                escapeCsv(record.time_slot),
                escapeCsv(record.student_id || record.roll_number),
                escapeCsv(record.student_name),
                escapeCsv(record.email),
                escapeCsv(formatStatus(record.status)),
                escapeCsv(record.remarks || ''),
                escapeCsv(record.venue_name || selectedVenue?.venue_name),
                escapeCsv(record.faculty_name || selectedVenue?.assigned_faculty_name)
            ].join(','));
        });

        // Add UTF-8 BOM
        const csvWithBom = `\ufeff${lines.join('\n')}`;

        const safeVenue = (selectedVenue?.venue_name || 'venue').replace(/[\\/:*?"<>|]/g, '-').trim();
        const filename = `attendance_export_${safeVenue}_${startDate}_to_${endDate}.csv`;

        const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setSuccess('Attendance data exported successfully!');
    };

    const formatStatus = (status) => {
        const statusMap = {
            'present': 'Present',
            'absent': 'Absent',
            'late': 'Late',
            'excused': 'Excused',
            '': 'Not Marked'
        };
        return statusMap[status] || status || 'Not Marked';
    };

    const handleVenueChange = (venueId) => {
        const venue = venues.find(v => v.venue_id === parseInt(venueId));
        setSelectedVenue(venue || null);
        setAttendanceData([]); // Clear data when venue changes
    };

    return (
        <div style={styles.container}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <button 
                        style={{
                            ...styles.backButton,
                            ...(hoveredButton === 'back' ? styles.backButtonHover : {})
                        }}
                        onClick={() => navigate('/admin-tools')}
                        onMouseEnter={() => setHoveredButton('back')}
                        onMouseLeave={() => setHoveredButton(null)}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={styles.iconWrapper}>
                        <FileSpreadsheet size={28} color="#6366F1" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Attendance Data Export</h1>
                        <p style={styles.subtitle}>Export attendance records with custom filters</p>
                    </div>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div style={{ ...styles.alertBanner, ...styles.errorBanner }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} style={styles.alertClose}>×</button>
                </div>
            )}

            {success && (
                <div style={{ ...styles.alertBanner, ...styles.successBanner }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} />
                        <span>{success}</span>
                    </div>
                    <button onClick={() => setSuccess('')} style={styles.alertClose}>×</button>
                </div>
            )}

            {/* Main Content */}
            <div style={styles.content}>
                {/* Filter Card */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <div style={styles.cardTitleWrapper}>
                            <Filter size={18} color="#6366F1" />
                            <h2 style={styles.cardTitle}>Filter Options</h2>
                        </div>
                    </div>

                    <div style={styles.filterGrid}>
                        {/* Year Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Calendar size={14} />
                                <span>Academic Year</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <select
                                    style={styles.select}
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    <option value="">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                                <ChevronDown size={16} style={styles.chevron} />
                            </div>
                        </div>

                        {/* Venue Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <span>Venue / Class</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <select
                                    style={styles.select}
                                    value={selectedVenue?.venue_id || ''}
                                    onChange={(e) => handleVenueChange(e.target.value)}
                                    disabled={loading || venues.length === 0}
                                >
                                    {venues.length === 0 ? (
                                        <option value="">No venues available</option>
                                    ) : (
                                        <>
                                            <option value="">Select a venue</option>
                                            {venues.map(v => (
                                                <option key={v.venue_id} value={v.venue_id}>
                                                    {v.venue_name}
                                                    {v.assigned_faculty_name && ` (${v.assigned_faculty_name})`}
                                                    {v.student_count > 0 && ` - ${v.student_count} students`}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                                <ChevronDown size={16} style={styles.chevron} />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Calendar size={14} />
                                <span>Start Date</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={styles.select}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Calendar size={14} />
                                <span>End Date</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={styles.select}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        {/* Time Slot */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Clock size={14} />
                                <span>Time Slot</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <select
                                    style={styles.select}
                                    value={selectedTimeSlot}
                                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                                >
                                    {TIME_SLOTS.map(slot => (
                                        <option key={slot.value} value={slot.value}>
                                            {slot.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={16} style={styles.chevron} />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={styles.actionButtons}>
                        <button
                            style={{
                                ...styles.loadButton,
                                ...(loading || !selectedVenue ? styles.buttonDisabled : {})
                            }}
                            onClick={fetchAttendanceData}
                            disabled={loading || !selectedVenue}
                        >
                            {loading ? (
                                <>
                                    <div style={styles.spinner}></div>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Filter size={16} />
                                    Load Data
                                </>
                            )}
                        </button>

                        <button
                            style={{
                                ...styles.exportButton,
                                ...(attendanceData.length === 0 ? styles.buttonDisabled : {})
                            }}
                            onClick={exportToExcel}
                            disabled={attendanceData.length === 0}
                        >
                            <Download size={16} />
                            Export to Excel
                        </button>
                    </div>
                </div>

                {/* Data Preview Card */}
                {attendanceData.length > 0 && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h2 style={styles.cardTitle}>Data Preview</h2>
                            <span style={styles.recordCount}>
                                {attendanceData.length} record{attendanceData.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Date</th>
                                        <th style={styles.th}>Time Slot</th>
                                        <th style={styles.th}>Roll No</th>
                                        <th style={styles.th}>Student Name</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceData.slice(0, 50).map((record, index) => (
                                        <tr key={index} style={styles.tr}>
                                            <td style={styles.td}>{record.date}</td>
                                            <td style={styles.td}>{record.time_slot}</td>
                                            <td style={styles.td}>{record.student_id || record.roll_number}</td>
                                            <td style={styles.td}>{record.student_name}</td>
                                            <td style={styles.td}>
                                                <span style={getStatusBadgeStyle(record.status)}>
                                                    {formatStatus(record.status)}
                                                </span>
                                            </td>
                                            <td style={styles.td}>{record.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {attendanceData.length > 50 && (
                            <div style={styles.tableFooter}>
                                Showing first 50 of {attendanceData.length} records. Export to view all.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const getStatusBadgeStyle = (status) => {
    const baseStyle = {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-block'
    };

    switch (status) {
        case 'present':
            return { ...baseStyle, backgroundColor: '#D1FAE5', color: '#065F46' };
        case 'absent':
            return { ...baseStyle, backgroundColor: '#FEE2E2', color: '#991B1B' };
        case 'late':
            return { ...baseStyle, backgroundColor: '#FEF3C7', color: '#92400E' };
        case 'excused':
            return { ...baseStyle, backgroundColor: '#DBEAFE', color: '#1E40AF' };
        default:
            return { ...baseStyle, backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F9FAFB'
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '20px 32px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '1400px',
        margin: '0 auto'
    },
    backButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      
    backButtonHover: {
        backgroundColor: '#E5E7EB',
        color: '#374151'
    },  padding: '8px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6B7280',
        transition: 'all 0.2s',
        backgroundColor: '#F3F4F6'
    },
    iconWrapper: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: '#EEF2FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 4px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: '#6B7280',
        margin: '0'
    },
    content: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px 32px'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #E5E7EB'
    },
    cardTitleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#111827',
        margin: '0'
    },
    recordCount: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#6366F1',
        backgroundColor: '#EEF2FF',
        padding: '4px 12px',
        borderRadius: '12px'
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    selectWrapper: {
        position: 'relative'
    },
    select: {
        width: '100%',
        padding: '10px 36px 10px 12px',
        fontSize: '14px',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        color: '#111827',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.2s'
    },
    chevron: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: '#9CA3AF'
    },
    actionButtons: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
    },
    loadButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#FFFFFF',
        backgroundColor: '#6366F1',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
    },
    exportButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#FFFFFF',
        backgroundColor: '#10B981',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none'
    },
    spinner: {
        width: '14px',
        height: '14px',
        border: '2px solid #FFFFFF',
        borderTop: '2px solid transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    tableWrapper: {
        overflowX: 'auto'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: '#F9FAFB'
    },
    tr: {
        borderBottom: '1px solid #E5E7EB'
    },
    td: {
        padding: '12px',
        fontSize: '14px',
        color: '#374151'
    },
    tableFooter: {
        padding: '12px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        borderTop: '1px solid #E5E7EB',
        marginTop: '16px',
        borderRadius: '8px'
    },
    alertBanner: {
        padding: '16px 24px',
        margin: '0 32px 16px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '1400px',
        marginLeft: 'auto',
        marginRight: 'auto'
    },
    errorBanner: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
        border: '1px solid #FCA5A5'
    },
    successBanner: {
        backgroundColor: '#D1FAE5',
        color: '#065F46',
        border: '1px solid #6EE7B7'
    },
    alertClose: {
        background: 'none',
        border: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: 'inherit',
        padding: '0 8px',
        lineHeight: '1'
    }
};

export default AttendanceExport;
