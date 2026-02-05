import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    Save,
    Download,
    Calendar,
    ChevronDown,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import useAuthStore from '../../../store/useAuthStore';
import { apiGet, apiPost } from '../../../utils/api';

const AttendanceManagement = () => {
    const { user } = useAuthStore();
    
    // Track the last initialized session to prevent loops
    const lastInitializedRef = useRef(null);

    // Year filter state
    const [selectedYear, setSelectedYear] = useState('');


    // Responsive state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // State variables
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [timeSlot, setTimeSlot] = useState('09:00 AM - 10:30 AM');
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sessionId, setSessionId] = useState(null);

    const TIME_SLOTS = [
        '09:00 AM - 10:30 AM',
        '10:30 AM - 12:30 PM',
        '01:30 PM - 03:00 PM',
        '03:00 PM - 04:30 PM'
    ];


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
            console.error('❌ Error fetching venues:', err);
            setError('Failed to fetch venues. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        if (!selectedVenue) {
            setError('Please select a venue first');
            return;
        }

        
        setLoading(true);
        try {
            const yearParam = selectedYear ? `?year=${selectedYear}` : '';
            const response = await apiGet(
                `/attendance/students/${selectedVenue.venue_id}${yearParam}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                // Ensure each student has status and remarks fields initialized
                const studentsWithDefaults = data.data.map(s => ({
                    ...s,
                    status: s.status || '',
                    remarks: s.remarks || ''
                }));
                setStudents(studentsWithDefaults);
                // After students are loaded, initialize the session
                await initializeSessionWithAttendance(studentsWithDefaults);
            } else {
                setStudents([]);
                setError(data.message || 'Failed to fetch students');
            }
        } catch (err) {
            console.error(' Error fetching students:', err);
            setError('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    // Combined function: Get/create session and load existing attendance
    const initializeSessionWithAttendance = async (studentsList) => {
        if (!selectedVenue || !user) return;

        // Check if we've already initialized this exact session
        const sessionKey = `${selectedVenue.venue_id}-${date}-${timeSlot}`;
        if (lastInitializedRef.current === sessionKey) {
            return;
        }

        const sessionData = {
            sessionName: `Venue${selectedVenue.venue_id}_${date}`,
            date,
            timeSlot,
            venueId: selectedVenue.venue_id
        };


        try {
            const response = await apiPost('/attendance/session', sessionData);

            const data = await response.json();

            if (data.success) {
                setSessionId(data.data.session_id);
                lastInitializedRef.current = sessionKey;

                // If session already exists, fetch and merge existing attendance
                if (data.data.existing) {
                    await loadExistingAttendance(data.data.session_id, studentsList);
                } 
            }
        } catch (err) {
            console.error(' Error initializing session:', err);
        }
    };

    // Load existing attendance and merge with students
    const loadExistingAttendance = async (sessionIdToFetch, studentsList) => {
        if (!selectedVenue) return;

        try {
            const response = await apiGet(
                `/attendance/session/${sessionIdToFetch}/${selectedVenue.venue_id}`
            );

            const data = await response.json();

            if (data.success && Object.keys(data.data).length > 0) {
                // Merge attendance with students
                const updatedStudents = studentsList.map(student => {
                    const existingRecord = data.data[student.student_id];
                    if (existingRecord) {
                        return {
                            ...student,
                            status: existingRecord.status,
                            remarks: existingRecord.remarks || ''
                        };
                    }
                    return student;
                });

                setStudents(updatedStudents);
            }
        } catch (err) {
            console.error('Error fetching existing attendance:', err);
        }
    };


    const saveAttendance = async () => {
       
        
        // Validations
        if (!sessionId) {
            alert('Session not initialized. Please try again.');
            return;
        }
        
        const markedStudents = students.filter(s => s.status);
        if (markedStudents.length === 0) {
            alert('Please mark attendance for at least one student');
            return;
        }

        const attendanceData = {
            venueId: selectedVenue.venue_id,
            sessionId: sessionId,
            date,
            timeSlot,
            attendance: markedStudents.map(s => ({
                student_id: s.student_id,
                status: s.status,
                remarks: s.remarks || null
            }))
        };


        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            
            const response = await apiPost('/attendance/save', attendanceData);

           
            
            const responseText = await response.text();
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error(' Failed to parse JSON:', responseText);
                throw new Error('Invalid server response');
            }
            
            if (data.success) {
               
                setSuccess(`Attendance saved successfully! (${data.data?.total || markedStudents.length} students)`);
                
                
                
                // Show success for 5 seconds
                setTimeout(() => setSuccess(''), 5000);
            } else {
                console.error(' Save failed:', data);
                setError(data.message || 'Failed to save attendance');
            }
        } catch (err) {
            console.error(' Error saving attendance:', err);
            setError('Failed to save attendance: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatAttendanceStatus = (status) => {
        if (!status) return 'Not Marked';
        switch (status) {
            case 'present':
                return 'Present';
            case 'absent':
                return 'Absent';
            case 'late':
                return 'Late';
            case 'ps':
                return 'PS';
            case 'mm':
                return 'MM';
            case 'ad':
                return 'AD';
            case 'other':
                return 'Other';
            default:
                return String(status);
        }
    };

    const exportAttendanceToExcel = () => {
        if (!selectedVenue) {
            alert('Please select a venue first');
            return;
        }

        if (!students || students.length === 0) {
            alert('No students available to export');
            return;
        }

        const facultyName = selectedVenue?.assigned_faculty_name || user?.name || '';
        const venueName = selectedVenue?.venue_name || '';
        const sessionInfo = `${date} | ${timeSlot}`;

        const escapeCsv = (value) => {
            const str = value === null || value === undefined ? '' : String(value);
            const needsQuotes = /[\",\n\r]/.test(str);
            const escaped = str.replace(/\"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
        };

        const headers = [
            'Roll Number',
            'Email',
            'Student Name',
            'Attendance',
            'Faculty Name',
            'Venue Name',
            'Session'
        ];

        const lines = [headers.map(escapeCsv).join(',')];

        students.forEach((s) => {
            lines.push([
                escapeCsv(s.id),
                escapeCsv(s.email),
                escapeCsv(s.name),
                escapeCsv(formatAttendanceStatus(s.status)),
                escapeCsv(facultyName),
                escapeCsv(venueName),
                escapeCsv(sessionInfo)
            ].join(','));
        });

        // Add UTF-8 BOM so Excel opens it cleanly
        const csvWithBom = `\ufeff${lines.join('\n')}`;

        const safeVenue = venueName.replace(/[\\/:*?"<>|]/g, '-').trim();
        const safeDate = String(date || '').replace(/[\\/:*?"<>|]/g, '-');
        const filename = `attendance_${safeVenue || 'venue'}_${safeDate || 'date'}.csv`;

        const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    // ====================== EVENT HANDLERS ======================
    const updateStatus = (id, status) => {
        
        setStudents(prev =>
            prev.map(s => (s.id === id ? { ...s, status, remarks: '' } : s))
        );
    };

    const updateRemark = (id, value) => {
        setStudents(prev =>
            prev.map(s => (s.id === id ? { ...s, remarks: value } : s))
        );
    };

    const markAllPresent = () => {
        setStudents(prev =>
            prev.map(s => ({ 
                ...s, 
                status: 'present',
                remarks: '' 
            }))
        );
    };

    const clearAllAttendance = () => {
        setStudents(prev =>
            prev.map(s => ({ 
                ...s, 
                status: '', 
                remarks: '' 
            }))
        );
    };

    const handleTimeSlotChange = (slot) => {
        setTimeSlot(slot);
        // Reset attendance when time slot changes
        setStudents(prev => prev.map(s => ({ ...s, status: '', remarks: '' })));
    };

    const handleVenueChange = (venueId) => {
        const venue = venues.find(v => v.venue_id === parseInt(venueId));
        setSelectedVenue(venue);
    };

    // ====================== USE EFFECTS ======================
    useEffect(() => {
        if (user) {
            fetchVenues();
        }
    }, [user, selectedYear]); // Re-fetch when year changes

    // Single effect that handles session initialization
    useEffect(() => {
        if (selectedVenue) {
            // Reset the last initialized ref when key dependencies change
            lastInitializedRef.current = null;
            fetchStudents(); // This will call initializeSessionWithAttendance
        }
    }, [selectedVenue, date, timeSlot, selectedYear]);

    // ====================== COMPUTED VALUES ======================
    const filteredStudents = useMemo(() => {
        return students
            .filter(
                s =>
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.id.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => {
                // First sort by department alphabetically
                const deptCompare = (a.department || '').localeCompare(b.department || '');
                if (deptCompare !== 0) return deptCompare;
                
                // Then sort by roll number within same department
                const rollA = a.id || '';
                const rollB = b.id || '';
                return rollA.localeCompare(rollB, undefined, { numeric: true });
            });
    }, [students, search]);

    const stats = useMemo(() => ({
        total: students.length,
        present: students.filter(s => s.status === 'present').length,
        absent: students.filter(s => s.status === 'absent').length,
        late: students.filter(s => s.status === 'late').length,
        ps: students.filter(s => s.status === 'ps').length,
        mm: students.filter(s => s.status === 'mm').length,
        ad: students.filter(s => s.status === 'ad').length,
        other: students.filter(s => s.status === 'other').length,
        marked: students.filter(s => s.status).length
    }), [students]);

    // ====================== STYLES ======================
    const styles = {
        container: {
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: isMobile ? '10px 12px' : '12px 16px',
        },
        header: {
            marginBottom: isMobile ? '12px' : '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '16px'
        },
        titleSection: {
            flex: 1
        },
        title: {
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '2px',
        },
        subtitle: {
            fontSize: '14px',
            color: '#6B7280',
        },
        alertBanner: {
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: isMobile ? '12px' : '14px'
        },
        errorBanner: {
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FECACA',
        },
        successBanner: {
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            border: '1px solid #A7F3D0',
        },
        alertClose: { 
            background: 'none', 
            border: 'none', 
            fontSize: '20px', 
            cursor: 'pointer', 
            color: 'inherit',
            padding: '0 0 0 12px'
        },
        loading: { 
            textAlign: 'center', 
            padding: '40px', 
            color: '#6B7280', 
            fontSize: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
        },
        card: {
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            padding: isMobile ? '16px' : '24px',
            marginBottom: '24px',
        },
        filterWrapper: {
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-end',
            paddingBottom: '24px',
            borderBottom: '1px solid #F3F4F6',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
        },
        filterGrid: {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? '12px' : '20px',
            flex: 1,
        },
        inputGroup: { 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
        },
        label: { 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        },
        selectWrapper: { 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center' 
        },
        select: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1F2937',
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer',
        },
        exportBtn: {
            padding: '12px 24px',
            backgroundColor: '#3B82F6',
            border: '1px solid #3B82F6',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#FFFFFF',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '44px',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            minWidth: isMobile ? '100%' : 'fit-content',
        },
        exportBtnDisabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
        },
        selectDisabled: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#F3F4F6',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6B7280',
            outline: 'none',
        },
        chevron: { 
            position: 'absolute', 
            right: '12px', 
            color: '#9CA3AF', 
            pointerEvents: 'none' 
        },
        calendarIcon: { 
            position: 'absolute', 
            right: '12px', 
            color: '#374151', 
            pointerEvents: 'none' 
        },
        statsStrip: { 
            display: 'flex', 
            gap: isMobile ? '16px' : '32px', 
            marginTop: '24px', 
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'space-between' : 'flex-start'
        },
        statItem: { 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px', 
            minWidth: isMobile ? '45%' : 'auto' 
        },
        statLabel: { 
            fontSize: '12px', 
            color: '#9CA3AF', 
            fontWeight: '500' 
        },
        statValue: { 
            fontSize: isMobile ? '20px' : '24px', 
            fontWeight: '700',
        },
        statValueBlack: { color: '#111827' },
        statValueGreen: { color: '#10B981' },
        statValueRed: { color: '#EF4444' },
        statValueOrange: { color: '#F59E0B' },
        statValueBlue: { color: '#3B82F6' },

        tableToolbar: {
            padding: isMobile ? '16px' : '24px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            borderBottom: '1px solid #F3F4F6',
            gap: '16px'
        },
        searchBox: { 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center', 
            width: isMobile ? '100%' : '280px' 
        },
        searchIcon: { 
            position: 'absolute', 
            left: '12px', 
            color: '#9CA3AF' 
        },
        searchInput: {
            width: '100%',
            padding: '10px 12px 10px 40px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FAFBFC',
            outline: 'none',
        },
        toolbarButtons: {
            display: 'flex',
            gap: '12px',
            width: isMobile ? '100%' : 'auto',
        },
        btnSecondary: {
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            backgroundColor: '#FFF',
            color: '#374151',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'center',
            flex: isMobile ? 1 : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        },
        btnClear: {
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #DC2626',
            backgroundColor: '#FFF',
            color: '#DC2626',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            textAlign: 'center',
            flex: isMobile ? 1 : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        },

        table: { 
            display: 'flex', 
            flexDirection: 'column' 
        },
        thRow: {
            display: isMobile ? 'none' : 'flex',
            padding: '12px 24px',
            backgroundColor: '#FAFBFC',
            borderBottom: '1px solid #F3F4F6',
        },
        th: { 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#9CA3AF' 
        },
        tr: {
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            padding: isMobile ? '16px' : '18px 24px',
            alignItems: isMobile ? 'stretch' : 'center',
            borderBottom: '1px solid #F3F4F6',
            gap: isMobile ? '16px' : '0',
            backgroundColor: '#FFFFFF',
            transition: 'background-color 0.2s'
        },
        studentCell: { 
            flex: 0.8, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '14px' 
        },
        avatar: {
            width: '36px', 
            height: '36px', 
            borderRadius: '50%',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#4B5563', 
            fontSize: '12px', 
            fontWeight: '600',
            flexShrink: 0
        },
        studentInfo: {
            flex: 1,
            minWidth: 0 // For text truncation
        },
        studentName: { 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#111827',
            marginBottom: '2px'
        },
        studentId: { 
            fontSize: '12px', 
            color: '#9CA3AF',
        },
        studentDetails: {
            fontSize: '11px',
            color: '#6B7280',
            marginTop: '2px'
        },

        statusCell: { 
            flex: 1.4,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        toggleGroup: {
            display: 'flex',
            backgroundColor: '#F3F4F6',
            borderRadius: isMobile ? '8px' : '100px',
            padding: '3px',
            width: isMobile ? '100%' : 'fit-content',
        },
        toggleBtn: {
            flex: isMobile ? 1 : 'none',
            border: 'none', 
            backgroundColor: 'transparent',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '600', 
            color: '#9CA3AF', 
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
        },
        toggleActivePresent: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#10B981', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveAbsent: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#EF4444', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveLate: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#F59E0B', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActivePs: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#8B5CF6', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveMm: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#10B981', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveAd: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#3B82F6', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveOther: {
            flex: isMobile ? 1 : 'none',
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: isMobile ? '10px 8px' : '8px 18px', 
            borderRadius: isMobile ? '6px' : '100px',
            fontSize: isMobile ? '12px' : '13px', 
            fontWeight: '700', 
            color: '#6366F1', 
            border: 'none', 
            cursor: 'pointer'
        },
        toggleActiveOthers: {
            backgroundColor: '#FFF', 
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            fontWeight: '700', 
            color: '#8B5CF6', 
            border: '2px solid #8B5CF6'
        },
        statusIndicator: {
            fontSize: '11px',
            color: '#6B7280',
            fontStyle: 'italic'
        },

       remarksCell: { 
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
},
remarkInput: {
    width: '100%', 
    border: isMobile ? '1px solid #E5E7EB' : 'none',
    borderBottom: '1px solid transparent',
    background: isMobile ? '#FAFBFC' : 'transparent',
    padding: isMobile ? '8px 12px' : '0', 
    borderRadius: isMobile ? '6px' : '0',
    fontSize: '14px', 
    color: '#9CA3AF', 
    outline: 'none',
    transition: 'all 0.2s'
},
remarkInputActive: {
    width: '100%', 
    border: isMobile ? '1px solid #E5E7EB' : 'none',
    borderBottom: '1px solid #E5E7EB',
    background: isMobile ? '#FAFBFC' : 'transparent',
    padding: isMobile ? '8px 12px' : '0', 
    borderRadius: isMobile ? '6px' : '0',
    fontSize: '14px', 
    color: '#4B5563', 
    outline: 'none'
},
        remarkLabel: {
            fontSize: '11px',
            color: '#9CA3AF',
            fontStyle: 'italic'
        },

        footer: { 
            marginTop: '32px', 
            display: 'flex', 
            flexDirection: isMobile ? 'column-reverse' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'center', 
            gap: isMobile ? '16px' : '32px',
            paddingBottom: isMobile ? '24px' : '0'
        },
        footerInfo: {
            fontSize: '13px',
            color: '#6B7280',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        },
        btnCancel: { 
            background: 'none', 
            border: 'none', 
            fontWeight: '600', 
            color: '#6B7280', 
            fontSize: '14px', 
            cursor: 'pointer', 
            textAlign: 'center',
            padding: isMobile ? '12px' : '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        btnPrimary: {
            padding: '12px 28px', 
            borderRadius: '10px',
            backgroundColor: '#2563EB', 
            color: '#FFF', 
            fontWeight: '700',
            fontSize: '15px', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
            opacity: (loading || stats.marked === 0) ? 0.5 : 1,
            pointerEvents: (loading || stats.marked === 0) ? 'none' : 'auto',
            transition: 'all 0.2s',
            gap: '8px'
        },
        loadingSpinner: {
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        }
    };

    return (
        <div style={styles.container}>
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

            {/* Filter Card */}
            <div style={styles.card}>
                <div style={styles.filterWrapper}>
                    <div style={styles.filterGrid}>
                        {/* Year Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Calendar size={12} />
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

                        {/* Date Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Calendar size={12} />
                                <span>Date</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={styles.select}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <Calendar size={16} style={styles.calendarIcon} />
                            </div>
                        </div>

                        {/* Time Slot Selection */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                <Clock size={12} />
                                <span>Time Slot</span>
                            </label>
                            <div style={styles.selectWrapper}>
                                <select
                                    style={styles.select}
                                    value={timeSlot}
                                    onChange={(e) => handleTimeSlotChange(e.target.value)}
                                >
                                    {TIME_SLOTS.map(slot => (
                                        <option key={slot} value={slot}>{slot}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} style={styles.chevron} />
                            </div>
                        </div>
                    </div>

                    {/* Export Button - Aligned Right */}
                    <button
                        style={{
                            ...styles.exportBtn,
                            ...((loading || !selectedVenue || students.length === 0) ? styles.exportBtnDisabled : {})
                        }}
                        onClick={exportAttendanceToExcel}
                        disabled={loading || !selectedVenue || students.length === 0}
                        title={students.length === 0 ? 'No students to export' : 'Export attendance to Excel'}
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                </div>

                {/* Stats */}
                <div style={styles.statsStrip}>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Total Students</span>
                        <span style={{ ...styles.statValue, ...styles.statValueBlack }}>{stats.total}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Present</span>
                        <span style={{ ...styles.statValue, ...styles.statValueGreen }}>{stats.present}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Absent</span>
                        <span style={{ ...styles.statValue, ...styles.statValueRed }}>{stats.absent}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Late</span>
                        <span style={{ ...styles.statValue, ...styles.statValueOrange }}>{stats.late}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>PS</span>
                        <span style={{ ...styles.statValue, color: '#8B5CF6' }}>{stats.ps || 0}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>MM</span>
                        <span style={{ ...styles.statValue, color: '#10B981' }}>{stats.mm || 0}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>AD</span>
                        <span style={{ ...styles.statValue, color: '#3B82F6' }}>{stats.ad || 0}</span>
                    </div>
                    <div style={styles.statItem}>
                        <span style={styles.statLabel}>Marked</span>
                        <span style={{ ...styles.statValue, ...styles.statValueBlue }}>{stats.marked}</span>
                    </div>
                </div>
            </div>

            {/* Students Table Card */}
            <div style={{ ...styles.card, marginTop: isMobile ? '12px' : '16px', padding: 0 }}>
                <div style={styles.tableToolbar}>
                    <div style={styles.searchBox}>
                        <Search size={16} style={styles.searchIcon} />
                        <input
                            style={styles.searchInput}
                            placeholder="Search student by name or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={styles.toolbarButtons}>
                        <button style={styles.btnClear} onClick={clearAllAttendance}>
                            <XCircle size={14} />
                            Clear All
                        </button>
                        <button style={styles.btnSecondary} onClick={markAllPresent}>
                            <CheckCircle2 size={14} />
                            Mark All Present
                        </button>
                    </div>
                </div>

                {/* Loading/Empty States */}
                {loading && !students.length ? (
                    <div style={styles.loading}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                        <div>Loading students...</div>
                    </div>
                ) : students.length === 0 ? (
                    <div style={styles.loading}>
                        <AlertCircle size={24} />
                        <div>{selectedVenue ? 'No students found in this venue' : 'Please select a venue'}</div>
                    </div>
                ) : (
                    <div style={styles.table}>
                        {/* Table Header - Desktop only */}
                        <div style={styles.thRow}>
                            <div style={{ ...styles.th, flex: 0.8 }}>Student</div>
                            <div style={{ ...styles.th, flex: 1.4 }}>Status (Others: PS, MM, AD)</div>
                            <div style={{ ...styles.th, flex: 1 }}>Remarks (Optional)</div>
                        </div>

                        {/* Student Rows */}
                        {filteredStudents.map(s => (
                            <div key={s.id} style={{
                                ...styles.tr,
                                backgroundColor: s.status ? (s.status === 'present' ? '#F0F9FF' : 
                                                          s.status === 'absent' ? '#FEF2F2' : 
                                                          '#FFFBEB') : '#FFFFFF'
                            }}>
                                <div style={styles.studentCell}>
                                    <div style={{ ...styles.avatar, backgroundColor: s.avatarColor || '#E5E7EB' }}>
                                        {s.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div style={styles.studentInfo}>
                                        <div style={styles.studentName}>{s.name}</div>
                                        <div style={styles.studentId}>ID: {s.id}</div>
                                        {(isMobile || s.department) && (
                                            <div style={styles.studentDetails}>
                                                {s.department}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={styles.statusCell}>
                                    <div style={styles.toggleGroup}>
                                        <button
                                            style={s.status === 'present' ? styles.toggleActivePresent : styles.toggleBtn}
                                            onClick={() => updateStatus(s.id, 'present')}
                                            title="Mark Present"
                                        >
                                            <CheckCircle2 size={14} style={{ marginRight: isMobile ? '4px' : '6px' }} /> 
                                            {isMobile ? 'P' : 'Present'}
                                        </button>
                                        <button
                                            style={s.status === 'absent' ? styles.toggleActiveAbsent : styles.toggleBtn}
                                            onClick={() => updateStatus(s.id, 'absent')}
                                            title="Mark Absent"
                                        >
                                            <XCircle size={14} style={{ marginRight: isMobile ? '4px' : '6px' }} /> 
                                            {isMobile ? 'A' : 'Absent'}
                                        </button>
                                        <button
                                            style={s.status === 'late' ? styles.toggleActiveLate : styles.toggleBtn}
                                            onClick={() => updateStatus(s.id, 'late')}
                                            title="Mark Late"
                                        >
                                            <Clock size={14} style={{ marginRight: isMobile ? '4px' : '6px' }} /> 
                                            {isMobile ? 'L' : 'Late'}
                                        </button>
                                        <button
                                            style={s.status === 'ps' ? styles.toggleActivePs : styles.toggleBtn}
                                            onClick={() => updateStatus(s.id, 'ps')}
                                            title="Mark PS (Personalized Skill)"
                                        >
                                            <CheckCircle2 size={14} style={{ marginRight: isMobile ? '4px' : '6px' }} /> 
                                            {isMobile ? 'PS' : 'PS'}
                                        </button>
                                        <select
                                            style={{
                                                ...styles.toggleBtn,
                                                ...(s.status === 'mm' || s.status === 'ad' || s.status === 'other' ? styles.toggleActiveOthers : {}),
                                                padding: isMobile ? '10px 8px' : '8px 12px',
                                                cursor: 'pointer'
                                            }}
                                            value={s.status === 'mm' || s.status === 'ad' || s.status === 'other' ? s.status : ''}
                                            onChange={(e) => e.target.value && updateStatus(s.id, e.target.value)}
                                            title="Mark Others"
                                        >
                                            <option value="">Others</option>
                                            <option value="mm">MM</option>
                                            <option value="ad">AD</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    {s.status && (
                                        <div style={styles.statusIndicator}>
                                            Marked as <strong>{s.status}</strong>
                                        </div>
                                    )}
                                </div>

                                <div style={styles.remarksCell}>
                                    <input
                                        style={s.remarks || s.status ? styles.remarkInputActive : styles.remarkInput}
                                        placeholder={s.status ? "Add remark (optional)..." : "Mark status first"}
                                        value={s.remarks || ''}
                                        onChange={e => updateRemark(s.id, e.target.value)}
                                        disabled={!s.status}
                                    />
                                    {s.remarks && (
                                        <div style={styles.remarkLabel}>
                                            Remark added
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <div style={styles.footerInfo}>
                    <div>
                        <strong>Session ID:</strong> {sessionId || 'Not initialized'}
                    </div>
                    <div>
                        <strong>Venue:</strong> {selectedVenue?.venue_name || 'None selected'}
                    </div>
                    <div>
                        <strong>Date & Time:</strong> {date} • {timeSlot}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button style={styles.btnCancel} onClick={clearAllAttendance}>
                        <XCircle size={14} />
                        Clear All
                    </button>
                    <button 
                        style={styles.btnPrimary} 
                        onClick={saveAttendance}
                        disabled={loading || stats.marked === 0}
                        title={stats.marked === 0 ? 'Mark at least one student' : 'Save attendance'}
                    >
                        {loading ? (
                            <>
                                <div style={styles.loadingSpinner}></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Attendance ({stats.marked} marked)
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* CSS Animations */}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    button:disabled {
                        cursor: not-allowed;
                    }
                    
                    select:disabled, input:disabled {
                        cursor: not-allowed;
                        opacity: 0.7;
                    }
                `}
            </style>
        </div>
    );
};

export default AttendanceManagement;