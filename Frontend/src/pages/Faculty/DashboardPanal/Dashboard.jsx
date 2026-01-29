import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BookOpen, Calendar, Clock, ClipboardCheck,
    MapPin, Users, ChevronRight,
    BarChart3, PieChart,
    AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';

// API Configuration - Use environment variable
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_BASE + '/faculty/dashboard',
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to include credentials for cookies
api.interceptors.request.use(
    (config) => {
        config.withCredentials = true;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Graph Components
const BarChart = ({ data }) => {
    const baseline = 100;

    return (
        <div style={{ padding: '24px 8px 10px 8px', marginTop: '25px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                height: '180px',
                gap: '20px',
                paddingBottom: '30px',
                borderBottom: '1px solid #f1f5f9',
                position: 'relative'
            }}>
                {data.labels.map((label, index) => {
                    const value = data.datasets[0].data[index] || 0;
                    const height = (value / baseline) * 100;

                    return (
                        <div key={index} style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative'
                        }}>
                            {/* Background Bar (Track) */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                width: '32px',
                                height: '100%',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '6px',
                                zIndex: 1
                            }} />

                            {/* Actual Data Bar */}
                            <div style={{
                                width: '32px',
                                height: `${height}%`,
                                backgroundColor: data.datasets[0].color,
                                borderRadius: '6px',
                                transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                zIndex: 2,
                                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                            }}>
                                {/* Value Header */}
                                <span style={{
                                    position: 'absolute',
                                    top: '-25px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {value}%
                                </span>
                            </div>

                            {/* Label */}
                            <span style={{
                                position: 'absolute',
                                bottom: '-25px',
                                fontSize: '11px',
                                color: '#64748b',
                                fontWeight: 700,
                                textAlign: 'center',
                                width: 'max-content'
                            }}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '32px',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                    Class-wise Performance
                </span>
                <div style={{
                    fontSize: '13px',
                    color: '#22c55e',
                    backgroundColor: '#f0fdf4',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                }}>
                    <TrendingUp size={14} />
                    +2.4%
                </div>
            </div>
        </div>
    );
};

const DonutChart = ({ data }) => {
    const total = data.data.reduce((a, b) => a + b, 0);
    let accumulatedAngle = 0;

    return (
        <div style={{ padding: '8px 4px' }}>
            <div style={{
                position: 'relative',
                width: '150px',
                height: '150px',
                margin: '0 auto'
            }}>
                {/* SVG Donut Chart */}
                <svg width="150" height="150" viewBox="0 0 100 100">
                    {data.data.map((value, index) => {
                        const percentage = (value / total) * 100;
                        const angle = (percentage / 100) * 360;
                        const startAngle = accumulatedAngle;
                        const endAngle = startAngle + angle;
                        accumulatedAngle = endAngle;

                        // Convert to radians
                        const startRad = (startAngle - 90) * (Math.PI / 180);
                        const endRad = (endAngle - 90) * (Math.PI / 180);

                        // Calculate coordinates
                        const x1 = 50 + 40 * Math.cos(startRad);
                        const y1 = 50 + 40 * Math.sin(startRad);
                        const x2 = 50 + 40 * Math.cos(endRad);
                        const y2 = 50 + 40 * Math.sin(endRad);

                        // Large arc flag
                        const largeArcFlag = angle > 180 ? 1 : 0;

                        return (
                            <path
                                key={index}
                                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                fill={data.colors[index]}
                                stroke="white"
                                strokeWidth="2"
                            />
                        );
                    })}
                </svg>

                {/* Center Text */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>
                        {total}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        Completed
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ marginTop: '16px' }}>
                {data.labels.map((label, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #f9fafb'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '4px',
                                backgroundColor: data.colors[index]
                            }} />
                            <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>
                                {label}
                            </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                            {data.data[index]}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard = () => {
    // Auth state
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    
    // Dashboard state
    const [stats, setStats] = useState([]);
    const [classes, setClasses] = useState([]);
    const [groups, setGroups] = useState([]);
    const [taskReview, setTaskReview] = useState({
        pendingReviews: 0,
        avgCompletion: 0,
        tasks: []
    });
    const [attendance, setAttendance] = useState({
        overall: 0,
        target: 90,
        pendingSessions: 0,
        highest: { class: '', percentage: 0 },
        lowest: { class: '', percentage: 0 }
    });
    const [quickActions] = useState([
        { id: 1, title: 'Mark attendance for a class', desc: 'Opens attendance marking flow' },
        { id: 2, title: 'Create a new task', desc: 'Assign work linked to study material' },
        { id: 3, title: 'Upload study material', desc: 'Day-wise roadmap for your groups' },
        { id: 4, title: 'View student performance', desc: 'Open student tracking & profiles' }
    ]);
    const [engagementData, setEngagementData] = useState({
        attendance: {
            labels: [],
            datasets: [{ data: [], label: 'Attendance %', color: '#2563eb' }]
        },
        taskCompletion: {
            labels: ['Submitted', 'Pending', 'Overdue'],
            data: [0, 0, 0],
            colors: ['#10b981', '#f59e0b', '#ef4444']
        }
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [markingAttendance, setMarkingAttendance] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        
        if (!storedUser) {
            window.location.href = '/login';
        } else {
            try {
                setUser(JSON.parse(storedUser));
                setAuthLoading(false);
            } catch {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
    }, []);

    // Fetch dashboard data
    useEffect(() => {
        if (authLoading) return;

        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // console.log('Fetching dashboard data from:', api.defaults.baseURL);
                const response = await api.get('/');
                // console.log('Dashboard response received:', response.data);
                
                const data = response.data;

                setStats(data.stats || []);
                setClasses(data.classes || []);
                setGroups(data.groups || []);
                setTaskReview(data.taskReview || {
                    pendingReviews: 0,
                    avgCompletion: 0,
                    tasks: []
                });
                setAttendance(data.attendance || {
                    overall: 0,
                    target: 90,
                    pendingSessions: 0,
                    highest: { class: '', percentage: 0 },
                    lowest: { class: '', percentage: 0 }
                });
                setEngagementData(data.engagementData || {
                    attendance: {
                        labels: data.engagementData?.attendance?.labels || [],
                        datasets: [{
                            data: data.engagementData?.attendance?.datasets?.[0]?.data || [],
                            label: 'Attendance %',
                            color: '#2563eb'
                        }]
                    },
                    taskCompletion: {
                        labels: ['Submitted', 'Pending', 'Overdue'],
                        data: data.engagementData?.taskCompletion?.data || [0, 0, 0],
                        colors: ['#10b981', '#f59e0b', '#ef4444']
                    }
                });
            } catch (err) {
                console.error('Failed to load dashboard:', err);
                console.error('Error details:', err);
                setError(err.message || 'Failed to load dashboard data');
                
                // If it's an auth error, redirect to login
                if (err.response?.status === 401) {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        
        // Set up real-time updates interval
        const interval = setInterval(async () => {
            try {
                const response = await api.get('/overview');
                setStats(response.data.stats || []);
            } catch (err) {
                console.error('Failed to update dashboard:', err);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [authLoading]);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            // Update pending reviews randomly
            setTaskReview(prev => ({
                ...prev,
                pendingReviews: Math.max(0, prev.pendingReviews + Math.floor(Math.random() * 3) - 1)
            }));

            // Update attendance percentages slightly
            setGroups(prev => prev.map(group => ({
                ...group,
                attend: `${Math.min(100, Math.max(70, parseInt(group.attend) + Math.floor(Math.random() * 3) - 1))}%`
            })));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Function Handlers
    const handleClassAction = async (classId, action) => {
        // console.log(`Action "${action}" on class ${classId}`);

        switch (action) {
            case 'Mark Attendance':
                setMarkingAttendance(true);
                setSelectedClass(classId);
                try {
                    // In production, this would be an API call
                    await new Promise(resolve => setTimeout(resolve, 500));
                    alert(`Marking attendance for ${classId}. This would open a modal in production.`);
                    
                    // Update class status
                    setClasses(prev => prev.map(cls =>
                        cls.id === classId
                            ? { ...cls, status: 'Attendance marked', statusType: 'completed' }
                            : cls
                    ));
                    
                    // Update attendance count
                    setAttendance(prev => ({
                        ...prev,
                        pendingSessions: Math.max(0, prev.pendingSessions - 1)
                    }));
                } finally {
                    setMarkingAttendance(false);
                }
                break;

            case 'View Class':
                alert(`Opening class details for ${classId}`);
                break;

            case 'Post Task':
                alert(`Posting new task for ${classId}`);
                // Update task review count
                setTaskReview(prev => ({
                    ...prev,
                    pendingReviews: prev.pendingReviews + 5
                }));
                break;

            case 'Edit Attendance':
                alert(`Editing attendance for ${classId}`);
                break;

            case 'View Tasks':
                alert(`Viewing tasks for ${classId}`);
                break;
        }
    };

    const handleQuickAction = (actionId) => {
        const action = quickActions.find(a => a.id === actionId);
        alert(`Performing: ${action.title}`);

        // Simulate action effects
        switch (actionId) {
            case 1: // Mark attendance
                setAttendance(prev => ({
                    ...prev,
                    pendingSessions: Math.max(0, prev.pendingSessions - 1)
                }));
                break;
            case 2: // Create task
                setTaskReview(prev => ({
                    ...prev,
                    pendingReviews: prev.pendingReviews + 5
                }));
                break;
        }
    };

    const handlePlanNextWeek = () => {
        alert('Opening weekly planner. This would show a scheduling interface in production.');
    };

    const handleOpenTasks = () => {
        alert('Opening task management interface');
    };

    const handleViewAllGroups = () => {
        alert('Opening all groups view');
    };

    const handleGoToTasks = () => {
        alert('Navigating to Tasks & Submissions');
    };

    const handleOpenAttendance = () => {
        alert('Opening attendance management');
    };

    const handleGroupClick = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        alert(`Opening details for ${group?.title}\nStatus: ${group?.status}\nAttendance: ${group?.attend}`);
    };

    const handleTaskReviewClick = (taskId) => {
        const task = taskReview.tasks.find(t => t.id === taskId);
        alert(`Reviewing: ${task?.name}\n${task?.submitted}/${task?.total} submissions`);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    // Calculate dynamic stats
    const calculateDynamicStats = () => {
        const totalClasses = classes.length;
        const completedSessions = classes.filter(c => c.statusType === 'completed').length;
        const pendingAttendance = classes.filter(c => c.statusType === 'pending').length;

        return {
            totalClasses,
            completedSessions,
            pendingAttendance,
            upcomingSessions: totalClasses - completedSessions
        };
    };

    const dynamicStats = calculateDynamicStats();

    if (authLoading || loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e5e7eb',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }}></div>
                <span style={{ marginLeft: '12px' }}>Loading dashboard...</span>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '24px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <div style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    margin: '16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertCircle size={20} />
                    <span>Error: {error}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => {
                            // console.log('API Base URL:', API_BASE);
                            // console.log('Full API URL:', api.defaults.baseURL);
                            // console.log('Using cookie authentication');
                            alert(`API URL: ${api.defaults.baseURL}\n\nCheck browser console for details.`);
                        }}
                        style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Debug Info
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            <style>{`
                .dashboard-wrapper {
                    background-color: #f9fafb;
                    min-height: 100vh;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    color: #111827;
                    padding: 24px;
                    max-width: 1920px;
                    margin: 0 auto;
                }
                .header { margin-bottom: 32px; }
                .header h1 { font-size: 24px; font-weight: 600; color: #374151; letter-spacing: -0.02em; margin-bottom: 8px; }
                .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                
                /* Stats Grid */
                .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 40px; }
                .stat-card { 
                    background: white; 
                    padding: 28px 24px; 
                    border-radius: 16px; 
                    border: 1px solid #e5e7eb; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                .stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 12px rgba(0,0,0,0.08);
                    border-color: #d1d5db;
                }
                .stat-top { display: flex; justify-content: space-between; color: #6b7280; margin-bottom: 16px; font-size: 15px; font-weight: 500; }
                .stat-val { font-size: 36px; font-weight: 700; display: flex; align-items: center; gap: 10px; line-height: 1; }
                .stat-sub { font-size: 14px; color: #9ca3af; margin-top: 8px; }
                .pill-green { background: #dcfce7; color: #166534; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
                .pill-blue { background: #dbeafe; color: #1e40af; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }

                /* Main Layout */
                .main-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 420px; 
                    gap: 32px; 
                    align-items: start;
                }
                .sidebar {
                    height: 100%;
                }
                .sticky-sidebar-section {
                    position: sticky;
                    top: 20px;
                    z-index: 10;
                }
                @media (max-width: 1200px) {
                    .main-grid { grid-template-columns: 1fr; }
                    .stats-row { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 640px) {
                    .stats-row { grid-template-columns: 1fr; }
                    .main-grid { grid-template-columns: 1fr; }
                }
                
                .section-label { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .section-label h2 { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
                .section-label p { font-size: 14px; color: #6b7280; margin-top: 4px; }

                /* Class Cards */
                .class-card { 
                    background: white; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 16px; 
                    padding: 24px 28px; 
                    margin-bottom: 16px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center;
                    transition: all 0.2s ease;
                }
                .class-card:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.12);
                }
                .class-info-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
                .class-name { font-weight: 700; font-size: 16px; }
                .std-count { background: #f3f4f6; font-size: 13px; padding: 4px 12px; border-radius: 6px; color: #4b5563; font-weight: 500; display: flex; align-items: center; gap: 4px; }
                .status-badge { font-size: 13px; padding: 4px 12px; border-radius: 6px; font-weight: 600; }
                .status-pending { background: #ecfdf5; color: #059669; }
                .status-progress { background: #eff6ff; color: #2563eb; }
                .status-completed { background: #fff7ed; color: #ea580c; }
                .meta-row { display: flex; gap: 20px; font-size: 14px; color: #6b7280; align-items: center; }
                .btn-action { 
                    background: white; 
                    border: 1px solid #e5e7eb; 
                    padding: 8px 16px; 
                    border-radius: 8px; 
                    font-size: 14px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    margin-left: 10px; 
                    transition: all 0.2s;
                }
                .btn-action:hover { 
                    background: #f9fafb; 
                    border-color: #d1d5db;
                    transform: translateY(-1px);
                }
                .btn-primary { 
                    background: #2563eb; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 10px; 
                    font-size: 15px; 
                    font-weight: 600; 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-primary:hover {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
                }

                /* Table */
                .table-card { 
                    background: white; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 16px; 
                    overflow: hidden; 
                    margin-top: 24px;
                }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { 
                    background: #f9fafb; 
                    text-align: left; 
                    padding: 16px 20px; 
                    font-size: 13px; 
                    color: #6b7280; 
                    text-transform: uppercase; 
                    font-weight: 700; 
                    border-bottom: 1px solid #e5e7eb; 
                    letter-spacing: 0.03em;
                }
                .data-table td { 
                    padding: 20px; 
                    border-bottom: 1px solid #f3f4f6; 
                    font-size: 15px; 
                    cursor: pointer;
                }
                .data-table tr:hover {
                    background: #f9fafb;
                }
                .grp-title { font-weight: 700; color: #111827; font-size: 15px; }
                .grp-sub { font-size: 13px; color: #9ca3af; margin-top: 2px; }
                .badge-flat { font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.02em; }
                .type-success { color: #059669; background: #f0fdf4; }
                .type-warning { color: #d97706; background: #fffbeb; }
                .type-info { color: #2563eb; background: #eff6ff; }

                /* Sidebar */
                .sidebar-card { 
                    background: white; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 16px; 
                    padding: 24px; 
                    margin-bottom: 28px;
                }
                .sb-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .sb-title h3 { font-size: 17px; font-weight: 700; margin: 0; }
                .mini-btn { 
                    font-size: 13px; 
                    color: #6b7280; 
                    border: 1px solid #e5e7eb; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    background: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                }
                .mini-btn:hover {
                    background: #f9fafb;
                    border-color: #d1d5db;
                }
                .review-stats { display: flex; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 20px; }
                .rs-item { flex: 1; }
                .rs-label { font-size: 11px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 0.03em; }
                .rs-val { font-size: 24px; font-weight: 800; margin: 4px 0; }
                .txt-green { color: #10b981; }
                
                .action-row { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 16px 20px; 
                    border-bottom: 1px solid #f9fafb; 
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-row:hover {
                    background: #f9fafb;
                }
                .action-row:last-child { border: none; }
                .at-text { font-size: 15px; font-weight: 600; }
                .as-text { font-size: 13px; color: #9ca3af; margin-top: 2px; }
                .blue-link { 
                    color: #2563eb; 
                    font-size: 14px; 
                    font-weight: 700; 
                    display: block; 
                    text-align: center; 
                    margin-top: 12px; 
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .blue-link:hover {
                    color: #1d4ed8;
                    text-decoration: underline;
                }

                /* Graph Cards */
                .graph-card {
                    flex: 1;
                    min-width: 300px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                }
                .graph-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* Loading State */
                .loading {
                    opacity: 0.7;
                    pointer-events: none;
                }
            `}</style>

            <div className="header">
                <div className="header-row">
                    <div>
                        <h1>Faculty Dashboard</h1>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                            Welcome back, {user?.name || 'Faculty'}! Here's your overview for today.
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button className="btn-action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} />
                            Notifications
                        </button>
                        <button 
                            className="btn-action" 
                            onClick={handleLogout}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Top Cards */}
            <div className="stats-row">
                {stats.map(s => {
                    const IconComponent = {
                        'book-open': BookOpen,
                        'calendar': Calendar,
                        'clock': Clock,
                        'clipboard-check': ClipboardCheck
                    }[s.icon] || BookOpen;

                    return (
                        <div
                            className={`stat-card ${markingAttendance ? 'loading' : ''}`}
                            key={s.id}
                            onClick={() => {
                                if (s.label === 'Attendance Pending') {
                                    handleOpenAttendance();
                                } else if (s.label === 'Tasks to Review') {
                                    handleGoToTasks();
                                }
                            }}
                        >
                            <div className="stat-top">
                                <span>{s.label}</span>
                                <IconComponent size={20} color="#d1d5db" />
                            </div>
                            <div className="stat-val">
                                {s.label === 'My Classes' ? dynamicStats.totalClasses : s.value}
                                {s.badge && <span className="pill-green">{s.badge}</span>}
                                {s.label === "Today's Sessions" && (
                                    <span className="pill-blue">
                                        {dynamicStats.completedSessions}/{dynamicStats.totalClasses}
                                    </span>
                                )}
                            </div>
                            <div className="stat-sub">
                                {s.label === "Today's Sessions"
                                    ? `${dynamicStats.completedSessions} completed, ${dynamicStats.upcomingSessions} upcoming`
                                    : s.sub}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="main-grid">
                {/* LEFT COLUMN */}
                <div className="left-content">
                    <div className="section-label">
                        <div>
                            <h2>Today's Classes</h2>
                            <p>Scheduled sessions with quick actions</p>
                        </div>
                        <button className="btn-primary" onClick={handlePlanNextWeek}>
                            <Calendar size={18} /> Plan next week
                        </button>
                    </div>

                    <div className="class-list">
                        {classes.length > 0 ? classes.map(c => (
                            <div className="class-card" key={c.id}>
                                <div>
                                    <div className="class-info-top">
                                        <span className="class-name">{c.id} {c.name}</span>
                                        <span className="std-count">
                                            <Users size={14} />
                                            {c.students} Students
                                        </span>
                                        <span className={`status-badge status-${c.statusType}`}>
                                            {c.status}
                                            {c.statusType === 'completed' && ' ✓'}
                                        </span>
                                    </div>
                                    <div className="meta-row">
                                        <span>
                                            <Clock size={14} style={{ marginRight: '4px' }} />
                                            {c.time}
                                        </span>
                                        <span>
                                            <MapPin size={14} style={{ marginRight: '4px' }} />
                                            {c.loc}
                                        </span>
                                    </div>
                                </div>
                                <div className="actions">
                                    {c.actions?.map((a, index) => (
                                        <button
                                            key={index}
                                            className="btn-action"
                                            onClick={() => handleClassAction(c.id, a)}
                                            disabled={markingAttendance}
                                        >
                                            {markingAttendance && selectedClass === c.id ? 'Processing...' : a}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="class-card">
                                <div>
                                    <div className="class-info-top">
                                        <span className="class-name">No classes scheduled for today</span>
                                    </div>
                                    <div className="meta-row">
                                        <span>Check back tomorrow or create a new class</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Engagement Graphs */}
                    <div style={{ marginTop: '40px' }}>
                        <div className="section-label" style={{ marginBottom: '24px' }}>
                            <h2>Engagement Overview</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div className="graph-card">
                                <div className="graph-title">
                                    <BarChart3 size={18} /> Class-wise Attendance
                                </div>
                                {engagementData.attendance.labels.length > 0 ? (
                                    <BarChart data={engagementData.attendance} />
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                        No attendance data available
                                    </div>
                                )}
                            </div>
                            <div className="graph-card">
                                <div className="graph-title">
                                    <PieChart size={18} /> Task Completion
                                </div>
                                <DonutChart data={engagementData.taskCompletion} />
                            </div>
                        </div>
                    </div>

                    {/* Groups Table */}
                    <div className="section-label" style={{ marginTop: '40px' }}>
                        <h2>My Groups</h2>
                        <div className="blue-link" onClick={handleViewAllGroups} style={{ margin: 0 }}>
                            View all groups
                        </div>
                    </div>
                    <div className="table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Group / Class</th>
                                    <th>Students</th>
                                    <th>Avg Attendance</th>
                                    <th>Tasks Due</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.length > 0 ? groups.map(g => (
                                    <tr key={g.id} onClick={() => handleGroupClick(g.id)}>
                                        <td>
                                            <div className="grp-title">{g.id} {g.title}</div>
                                            <div className="grp-sub">{g.schedule}</div>
                                        </td>
                                        <td>{g.students}</td>
                                        <td>{g.attend}</td>
                                        <td>{g.tasks}</td>
                                        <td>
                                            <span className={`badge-flat type-${g.type}`}>
                                                {g.type === 'success' && '✓ '}
                                                {g.type === 'warning' && '⚠ '}
                                                {g.type === 'info' && 'ℹ '}
                                                {g.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                            No groups found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COLUMN (SIDEBAR) */}
                <div className="sidebar">
                    <div className="sticky-sidebar-section">
                        <div className="sidebar-card">
                            <div className="sb-title">
                                <h3>Task Review Queue</h3>
                                <button className="mini-btn" onClick={handleOpenTasks}>
                                    Open tasks
                                </button>
                            </div>
                            <div className="review-stats">
                                <div className="rs-item">
                                    <div className="rs-label">Pending reviews</div>
                                    <div className="rs-val">{taskReview.pendingReviews}</div>
                                    <div className="rs-label" style={{ textTransform: 'none', fontWeight: 400 }}>
                                        Across {taskReview.tasks.length} tasks
                                    </div>
                                </div>
                                <div className="rs-item" style={{ borderLeft: '1px solid #f3f4f6', paddingLeft: '20px' }}>
                                    <div className="rs-label">Avg completion</div>
                                    <div className="rs-val txt-green">{taskReview.avgCompletion}%</div>
                                    <div className="rs-label" style={{ textTransform: 'none', fontWeight: 400 }}>
                                        All active groups
                                    </div>
                                </div>
                            </div>
                            <div>
                                {taskReview.tasks.length > 0 ? taskReview.tasks.map(task => (
                                    <div
                                        key={task.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '14px',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        onClick={() => handleTaskReviewClick(task.id)}
                                    >
                                        <div>
                                            <div className="at-text">{task.name}</div>
                                            <div className="as-text">
                                                {task.class} | {task.submitted}/{task.total} submitted
                                            </div>
                                        </div>
                                        <span className={`status-badge ${task.status === 'review' ? 'status-completed' : 'status-progress'}`}>
                                            {task.status === 'review' ? 'Review' : 'In progress'}
                                        </span>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                        No tasks pending review
                                    </div>
                                )}
                            </div>
                            <div className="blue-link" onClick={handleGoToTasks}>
                                Go to Tasks & Submissions
                            </div>
                        </div>

                        <div className="sidebar-card">
                            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>Attendance Summary</h3>
                            <div style={{
                                background: '#f9fafb',
                                padding: '20px',
                                borderRadius: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                margin: '16px 0'
                            }}>
                                <div>
                                    <div className="rs-label">Overall</div>
                                    <div className="rs-val" style={{ fontSize: '28px' }}>
                                        {attendance.overall}%
                                        {attendance.overall >= attendance.target ? ' ✓' : ' ⚠'}
                                    </div>
                                    <div className="as-text">Target: {attendance.target}%</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="rs-label">Sessions pending</div>
                                    <div className="rs-val" style={{ fontSize: '28px' }}>
                                        {attendance.pendingSessions}
                                    </div>
                                    <div className="as-text">Mark today</div>
                                </div>
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Highest group
                                    <span style={{ color: '#111827', fontWeight: 700 }}>
                                        {attendance.highest.class} {attendance.highest.percentage}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Lowest group
                                    <span style={{ color: '#ea580c', fontWeight: 700 }}>
                                        {attendance.lowest.class} {attendance.lowest.percentage}%
                                    </span>
                                </div>
                            </div>
                            <div className="blue-link" onClick={handleOpenAttendance}>
                                Open Attendance
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
                            <div className="table-card" style={{ marginTop: 0 }}>
                                {quickActions.map((act) => (
                                    <div
                                        className="action-row"
                                        key={act.id}
                                        onClick={() => handleQuickAction(act.id)}
                                    >
                                        <div style={{ flex: 1, paddingRight: '12px' }}>
                                            <div className="at-text">{act.title}</div>
                                            <div className="as-text">{act.desc}</div>
                                        </div>
                                        <ChevronRight size={18} color="#d1d5db" style={{ flexShrink: 0 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;