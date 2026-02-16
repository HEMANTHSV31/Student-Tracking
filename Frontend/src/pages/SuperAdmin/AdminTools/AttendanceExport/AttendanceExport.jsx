import React, { useState, useEffect } from 'react';
import {
    Download,
    Calendar,
    Clock,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../../store/useAuthStore';
import { apiGet } from '../../../../utils/api';

const AttendanceExport = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // State variables
    const [venues, setVenues] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [selectedVenues, setSelectedVenues] = useState([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [filterMode, setFilterMode] = useState('venue'); // 'venue', 'year', 'faculty', 'all'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);

    const TIME_SLOTS = [
        { value: 'S1', label: 'S1 (08:45 AM - 10:30 AM)' },
        { value: 'S2', label: 'S2 (10:40 AM - 12:30 PM)' },
        { value: 'S3', label: 'S3 (01:30 PM - 03:10 PM)' },
        { value: 'S4', label: 'S4 (03:25 PM - 04:30 PM)' }
    ];

    useEffect(() => {
        fetchVenues();
        fetchFaculties();
    }, []);

    useEffect(() => {
        // Auto-select venues based on filter mode
        if (filterMode === 'year' && selectedYear) {
            const yearVenues = venues.filter(v => !v.year || v.year === parseInt(selectedYear));
            setSelectedVenues(yearVenues.map(v => v.venue_id));
        } else if (filterMode === 'faculty' && selectedFaculty) {
            const facultyVenues = venues.filter(v => v.assigned_faculty_id === parseInt(selectedFaculty));
            setSelectedVenues(facultyVenues.map(v => v.venue_id));
        } else if (filterMode === 'all') {
            setSelectedVenues(venues.map(v => v.venue_id));
        }
    }, [filterMode, selectedYear, selectedFaculty, venues]);

    const fetchVenues = async () => {
        if (!user) {
            setError('User information not available. Please login again.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await apiGet('/attendance/venues');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data.length > 0) {
                setVenues(data.data);
            } else {
                setVenues([]);
                setError(data.message || 'No venues found');
            }
        } catch (err) {
            console.error('Error fetching venues:', err);
            setError('Failed to fetch venues. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculties = async () => {
        try {
            const response = await apiGet('/faculty');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                setFaculties(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching faculties:', err);
        }
    };

    const fetchAttendanceData = async () => {
        if (selectedVenues.length === 0) {
            setError('Please select at least one venue');
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
                venueIds: selectedVenues.join(','),
                startDate,
                endDate
            });

            if (selectedTimeSlots.length > 0) {
                params.append('timeSlots', selectedTimeSlots.join(','));
            }

            if (filterMode === 'year' && selectedYear) {
                params.append('year', selectedYear);
            }

            if (filterMode === 'faculty' && selectedFaculty) {
                params.append('facultyId', selectedFaculty);
            }

            console.log('Fetching attendance with params:', params.toString());
            console.log('Selected time slots:', selectedTimeSlots);
            
            const response = await apiGet(`/attendance/export?${params.toString()}`);
            const data = await response.json();

            console.log('Backend response:', data);

            if (data.success) {
                setAttendanceData(data.data || []);
                
                // Log unique time slots in the results
                const uniqueSlots = [...new Set(data.data.map(r => r.time_slot))];
                console.log('Unique time slots in results:', uniqueSlots);
                
                setSuccess(`Loaded ${data.data?.length || 0} attendance records from ${selectedVenues.length} venue(s) - Time slots: ${uniqueSlots.join(', ')}`);
            } else {
                setAttendanceData([]);
                console.error('Backend error:', data);
                setError(data.message || 'Failed to fetch attendance data');
            }
        } catch (err) {
            console.error('Error fetching attendance data:', err);
            setError(`Failed to fetch attendance data: ${err.message}`);
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
                escapeCsv(record.roll_number),
                escapeCsv(record.student_name),
                escapeCsv(record.email),
                escapeCsv(formatStatus(record.status)),
                escapeCsv(record.remarks || ''),
                escapeCsv(record.venue_name),
                escapeCsv(record.faculty_name || '')
            ].join(','));
        });

        // Add UTF-8 BOM
        const csvWithBom = `\ufeff${lines.join('\n')}`;

        const venueText = selectedVenues.length === 1 
            ? venues.find(v => v.venue_id === selectedVenues[0])?.venue_name || 'venue'
            : `${selectedVenues.length}_venues`;
        const safeVenue = venueText.replace(/[\\/:*?"<>|]/g, '-').trim();
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
            'Present': 'Present',
            'Absent': 'Absent',
            'Late': 'Late',
            '': 'Not Marked'
        };
        return statusMap[status] || status || 'Not Marked';
    };

    const toggleVenue = (venueId) => {
        setSelectedVenues(prev => {
            if (prev.includes(venueId)) {
                return prev.filter(id => id !== venueId);
            } else {
                return [...prev, venueId];
            }
        });
        setAttendanceData([]); // Clear data when selection changes
    };

    const toggleAllVenues = () => {
        const filteredVenues = getFilteredVenues();
        if (selectedVenues.length === filteredVenues.length) {
            setSelectedVenues([]);
        } else {
            setSelectedVenues(filteredVenues.map(v => v.venue_id));
        }
        setAttendanceData([]);
    };

    const getFilteredVenues = () => {
        let filtered = venues;
        
        if (filterMode === 'year' && selectedYear) {
            filtered = filtered.filter(v => !v.year || v.year === parseInt(selectedYear));
        } else if (filterMode === 'faculty' && selectedFaculty) {
            filtered = filtered.filter(v => v.assigned_faculty_id === parseInt(selectedFaculty));
        }
        
        return filtered;
    };

    const toggleTimeSlot = (slotValue) => {
        setSelectedTimeSlots(prev => {
            if (prev.includes(slotValue)) {
                return prev.filter(slot => slot !== slotValue);
            } else {
                return [...prev, slotValue];
            }
        });
        setAttendanceData([]);
    };

    const toggleAllTimeSlots = () => {
        if (selectedTimeSlots.length === TIME_SLOTS.length) {
            setSelectedTimeSlots([]);
        } else {
            setSelectedTimeSlots(TIME_SLOTS.map(slot => slot.value));
        }
        setAttendanceData([]);
    };

    return (
        <div style={styles.container}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    /* Hover Effects */
                    button:hover:not(:disabled) {
                        transform: translateY(-1px);
                    }
                    
                    .va-mode-btn:hover {
                        background-color: #f1f5f9;
                        border-color: #cbd5e1;
                    }
                    
                    .va-mode-btn-active:hover {
                        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
                    }
                    
                    .venue-checkbox-item:hover {
                        background-color: #f8fafc;
                        border-color: #6366f1;
                    }
                    
                    .time-slot-item:hover {
                        background-color: #f8fafc;
                        border-color: #6366f1;
                    }
                    
                    input[type="date"]:focus,
                    select:focus {
                        border-color: #6366f1;
                        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                    }
                    
                    .load-btn:hover:not(:disabled) {
                        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
                    }
                    
                    .export-btn:hover:not(:disabled) {
                        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
                    }
                    
                    .select-all-btn:hover {
                        background-color: #eef2ff;
                        border-color: #a5b4fc;
                    }
                    
                    tbody tr:hover {
                        background-color: #f8fafc;
                    }
                `}
            </style>
            
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
                            <Filter size={18} color="#FFFFFF" style={{background: '#6366f1', borderRadius: '6px', padding: '4px'}} />
                            <h2 style={styles.cardTitle}>Filter Options</h2>
                        </div>
                    </div>

                    {/* Filter Mode Selector */}
                    <div style={styles.filterModeWrapper}>
                        <label style={styles.label}>
                            <Filter size={14} />
                            <span>Filter By:</span>
                        </label>
                        <div style={styles.filterModeButtons}>
                            <button
                                className={filterMode === 'venue' ? 'va-mode-btn-active' : 'va-mode-btn'}
                                style={{
                                    ...styles.modeButton,
                                    ...(filterMode === 'venue' ? styles.modeButtonActive : {})
                                }}
                                onClick={() => { setFilterMode('venue'); setSelectedVenues([]); }}
                            >
                                Specific Venues
                            </button>
                            <button
                                className={filterMode === 'year' ? 'va-mode-btn-active' : 'va-mode-btn'}
                                style={{
                                    ...styles.modeButton,
                                    ...(filterMode === 'year' ? styles.modeButtonActive : {})
                                }}
                                onClick={() => { setFilterMode('year'); setSelectedVenues([]); }}
                            >
                                Academic Year
                            </button>
                            <button
                                className={filterMode === 'faculty' ? 'va-mode-btn-active' : 'va-mode-btn'}
                                style={{
                                    ...styles.modeButton,
                                    ...(filterMode === 'faculty' ? styles.modeButtonActive : {})
                                }}
                                onClick={() => { setFilterMode('faculty'); setSelectedVenues([]); }}
                            >
                                Faculty
                            </button>
                            <button
                                className={filterMode === 'all' ? 'va-mode-btn-active' : 'va-mode-btn'}
                                style={{
                                    ...styles.modeButton,
                                    ...(filterMode === 'all' ? styles.modeButtonActive : {})
                                }}
                                onClick={() => { setFilterMode('all'); setSelectedVenues(venues.map(v => v.venue_id)); }}
                            >
                                All Venues
                            </button>
                        </div>
                    </div>

                    <div style={styles.filterGrid}>
                        {/* Year Selection - Show when filter mode is 'year' */}
                        {filterMode === 'year' && (
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
                                        <option value="">Select Year</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                    </select>
                                    <ChevronDown size={16} style={styles.chevron} />
                                </div>
                            </div>
                        )}

                        {/* Faculty Selection - Show when filter mode is 'faculty' */}
                        {filterMode === 'faculty' && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    <span>Faculty</span>
                                </label>
                                <div style={styles.selectWrapper}>
                                    <select
                                        style={styles.select}
                                        value={selectedFaculty}
                                        onChange={(e) => setSelectedFaculty(e.target.value)}
                                    >
                                        <option value="">Select Faculty</option>
                                        {faculties.map(f => (
                                            <option key={f.faculty_id} value={f.faculty_id}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} style={styles.chevron} />
                                </div>
                            </div>
                        )}

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
                                />
                            </div>
                        </div>

                        {/* Time Slot Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Clock size={14} />
                                <span>Time Slots ({selectedTimeSlots.length} selected)</span>
                            </label>
                            <div style={styles.timeSlotSelection}>
                                <div style={styles.timeSlotHeader}>
                                    <button
                                        className="select-all-btn"
                                        style={styles.selectAllTimeSlotsButton}
                                        onClick={toggleAllTimeSlots}
                                        type="button"
                                    >
                                        {selectedTimeSlots.length === TIME_SLOTS.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div style={styles.timeSlotList}>
                                    {TIME_SLOTS.map(slot => (
                                        <label key={slot.value} className="time-slot-item" style={styles.timeSlotCheckbox}>
                                            <input
                                                type="checkbox"
                                                checked={selectedTimeSlots.includes(slot.value)}
                                                onChange={() => toggleTimeSlot(slot.value)}
                                                style={styles.checkbox}
                                            />
                                            <span style={styles.timeSlotLabel}>{slot.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Venue Multi-Select */}
                    {(filterMode === 'venue' || filterMode === 'year' || filterMode === 'faculty' || filterMode === 'all') && (
                        <div style={styles.venueSelection}>
                            <div style={styles.venueHeader}>
                                <label style={styles.label}>
                                    <span>Selected Venues ({selectedVenues.length} of {getFilteredVenues().length})</span>
                                </label>
                                {filterMode === 'venue' && (
                                    <button
                                        className="select-all-btn"
                                        style={styles.selectAllButton}
                                        onClick={toggleAllVenues}
                                    >
                                        {selectedVenues.length === getFilteredVenues().length ? 'Deselect All' : 'Select All'}
                                    </button>
                                )}
                            </div>
                            <div style={styles.venueList}>
                                {getFilteredVenues().map(venue => (
                                    <label key={venue.venue_id} className="venue-checkbox-item" style={styles.venueCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={selectedVenues.includes(venue.venue_id)}
                                            onChange={() => toggleVenue(venue.venue_id)}
                                            disabled={filterMode !== 'venue'}
                                            style={styles.checkbox}
                                        />
                                        <span style={styles.venueLabel}>
                                            <strong>{venue.venue_name}</strong>
                                            {venue.assigned_faculty_name && (
                                                <span style={styles.venueInfo}> • {venue.assigned_faculty_name}</span>
                                            )}
                                            {venue.student_count > 0 && (
                                                <span style={styles.venueInfo}> • {venue.student_count} students</span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                                {getFilteredVenues().length === 0 && (
                                    <div style={styles.noVenues}>No venues found for the selected filter</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={styles.actionButtons}>
                        <button
                            className="load-btn"
                            style={{
                                ...styles.loadButton,
                                ...(loading || selectedVenues.length === 0 ? styles.buttonDisabled : {})
                            }}
                            onClick={fetchAttendanceData}
                            disabled={loading || selectedVenues.length === 0}
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
                            className="export-btn"
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
                                            <td style={styles.td}>{record.roll_number}</td>
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

    const normalizedStatus = status?.toLowerCase() || '';
    
    switch (normalizedStatus) {
        case 'present':
            return { ...baseStyle, background: '#D1FAE5', color: '#065F46' };
        case 'absent':
            return { ...baseStyle, background: '#FEE2E2', color: '#991B1B' };
        case 'late':
            return { ...baseStyle, background: '#FEF3C7', color: '#92400E' };
        default:
            return { ...baseStyle, background: '#F3F4F6', color: '#6B7280' };
    }
};

const styles = {
    container: {
        minHeight: '100vh',
        background: '#f8fafc'
    },
    content: {
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 40px'
    },
    card: {
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f1f5f9'
    },
    cardTitleWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
        margin: '0',
        letterSpacing: '-0.02em',
        fontFamily: 'Outfit, sans-serif'
    },
    recordCount: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#6366f1',
        background: '#eef2ff',
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid #c7d2fe'
    },
    filterGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '28px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '2px'
    },
    selectWrapper: {
        position: 'relative'
    },
    select: {
        width: '100%',
        padding: '12px 40px 12px 14px',
        fontSize: '14px',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        background: '#FFFFFF',
        color: '#0f172a',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontWeight: '500'
    },
    chevron: {
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: '#64748b'
    },
    actionButtons: {
        display: 'flex',
        gap: '16px',
        justifyContent: 'flex-end',
        marginTop: '32px'
    },
    loadButton: {
        padding: '14px 32px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
    },
    exportButton: {
        padding: '14px 32px',
        fontSize: '15px',
        fontWeight: '600',
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none'
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderTop: '3px solid #FFFFFF',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    tableWrapper: {
        overflowX: 'auto',
        borderRadius: '12px',
        border: '1px solid #E8EAED'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc'
    },
    tr: {
        borderBottom: '1px solid #e2e8f0',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    td: {
        padding: '14px 16px',
        fontSize: '14px',
        color: '#0f172a',
        fontWeight: '500'
    },
    tableFooter: {
        padding: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#64748b',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        marginTop: '20px',
        borderRadius: '12px',
        fontWeight: '600'
    },
    alertBanner: {
        padding: '18px 32px',
        margin: '0 40px 20px',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        fontWeight: '600',
        maxWidth: '1400px',
        marginLeft: 'auto',
        marginRight: 'auto',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    errorBanner: {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fca5a5'
    },
    successBanner: {
        background: '#d1fae5',
        color: '#065f46',
        border: '1px solid #6ee7b7'
    },
    alertClose: {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        color: 'inherit',
        padding: '0 8px',
        lineHeight: '1',
        fontWeight: '700'
    },
    filterModeWrapper: {
        marginBottom: '28px',
        paddingBottom: '24px',
        borderBottom: '1px solid #e2e8f0'
    },
    filterModeButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '14px',
        flexWrap: 'wrap'
    },
    modeButton: {
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#64748b',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    modeButtonActive: {
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: '1px solid #6366f1',
        fontWeight: '600',
        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
        transform: 'translateY(-2px)'
    },
    venueSelection: {
        marginTop: '20px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    venueHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    selectAllButton: {
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6366f1',
        background: '#FFFFFF',
        border: '1px solid #c7d2fe',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    venueList: {
        maxHeight: '340px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingRight: '8px'
    },
    venueCheckbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    checkbox: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        accentColor: '#6366f1'
    },
    venueLabel: {
        fontSize: '14px',
        color: '#0f172a',
        flex: 1,
        fontWeight: '500'
    },
    venueInfo: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '500'
    },
    noVenues: {
        padding: '24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '600'
    },
    timeSlotSelection: {
        marginTop: '10px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    },
    timeSlotHeader: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '12px'
    },
    selectAllTimeSlotsButton: {
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: '600',
        color: '#6366f1',
        background: '#FFFFFF',
        border: '1px solid #c7d2fe',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    timeSlotList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    timeSlotCheckbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    timeSlotLabel: {
        fontSize: '13px',
        color: '#0f172a',
        flex: 1,
        fontWeight: '600'
    }
};

export default AttendanceExport;
