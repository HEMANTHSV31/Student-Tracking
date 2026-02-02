import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PeopleAltOutlined,
  LayersOutlined,
  TimelineOutlined,
  ErrorOutline,
  ChevronLeft,
  ChevronRight,
  FilterList,
  Search,
  ArrowDownward,
  ArrowUpward,
  LocationOn,
  Assignment,
  WarningAmber,
  CheckCircleOutline,
  AccessTime,
  Person,
  CalendarMonth
} from '@mui/icons-material';
import useAuthStore from '../../../store/useAuthStore';
import { encodeIdSimple } from '../../../utils/idEncoder';
import { apiGet } from '../../../utils/api';
import YearSelector, { YearBadge } from '../../../components/YearSelector/YearSelector';

// --- Custom Hook for Responsive Logic ---
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
  });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const EducationDashboard = () => {
  const { width } = useWindowSize();
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState({
    metrics: false,
    alerts: false,
    unmarkedAttendance: false,
    pendingTasks: false
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Year filter state
  const [selectedYear, setSelectedYear] = useState('');
  
  const API_URL = import.meta.env.VITE_API_URL;

  // State for data
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unmarkedAttendance, setUnmarkedAttendance] = useState([]);
  const [venuesWithoutTasks, setVenuesWithoutTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Pagination for attendance and tasks sections
  const [attendancePagination, setAttendancePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 1
  });
  const [tasksPagination, setTasksPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 1
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    issueType: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const isMobile = width <= 768;
  const isTablet = width <= 1024 && width > 768;

  // Fetch dashboard metrics
  const fetchDashboardMetrics = async (year = selectedYear) => {
    try {
      setLoading(prev => ({ ...prev, metrics: true }));
      const yearParam = year ? `?year=${year}` : '';
      const response = await apiGet(`/dashboard/metrics${yearParam}`);
      
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  };

  // Fetch alerts with pagination and filters
  const fetchAlerts = async (page = 1, filterParams = filters, year = selectedYear) => {
    try {
      setLoading(prev => ({ ...prev, alerts: true }));
      
      // Build query string with filters
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.itemsPerPage,
        search: filterParams.search,
        issueType: filterParams.issueType,
        sortBy: filterParams.sortBy,
        sortOrder: filterParams.sortOrder
      });
      
      if (year) queryParams.append('year', year);

      const response = await apiGet(`/dashboard/alerts?${queryParams.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  };

  // Fetch unmarked attendance venues
  const fetchUnmarkedAttendance = async (page = 1, year = selectedYear) => {
    try {
      setLoading(prev => ({ ...prev, unmarkedAttendance: true }));
      const yearParam = year ? `&year=${year}` : '';
      const response = await apiGet(`/dashboard/unmarked-attendance?page=${page}&limit=1${yearParam}`);
      
      if (!response.ok) throw new Error('Failed to fetch unmarked attendance');
      
      const data = await response.json();
      if (data.success) {
        setUnmarkedAttendance(data.data || []);
        setAttendancePagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: data.data?.length || 0,
          itemsPerPage: 1
        });
      }
    } catch (err) {
      console.error('Error fetching unmarked attendance:', err);
    } finally {
      setLoading(prev => ({ ...prev, unmarkedAttendance: false }));
    }
  };

  // Fetch venues without task assignments
  const fetchVenuesWithoutTasks = async (page = 1, year = selectedYear) => {
    try {
      setLoading(prev => ({ ...prev, pendingTasks: true }));
      const yearParam = year ? `&year=${year}` : '';
      const response = await apiGet(`/dashboard/pending-tasks?page=${page}&limit=1${yearParam}`);
      
      if (!response.ok) throw new Error('Failed to fetch venues without tasks');
      
      const data = await response.json();
      if (data.success) {
        setVenuesWithoutTasks(data.data || []);
        setTaskStats({ ...data.stats, deadline_passed: data.deadline_passed, message: data.message });
        setTasksPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: data.data?.length || 0,
          itemsPerPage: 1
        });
      }
    } catch (err) {
      console.error('Error fetching venues without tasks:', err);
    } finally {
      setLoading(prev => ({ ...prev, pendingTasks: false }));
    }
  };

  // Load all data on component mount
  useEffect(() => {
    fetchDashboardMetrics();
    fetchAlerts(1);
    fetchUnmarkedAttendance();
    fetchVenuesWithoutTasks();
  }, []);

  // Refresh data when year changes
  useEffect(() => {
    fetchDashboardMetrics(selectedYear);
    fetchAlerts(1, filters, selectedYear);
    fetchUnmarkedAttendance(1, selectedYear);
    fetchVenuesWithoutTasks(1, selectedYear);
  }, [selectedYear]);

  // Handle year change
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= pagination.totalPages) {
      setCurrentPage(pageNumber);
      fetchAlerts(pageNumber);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchAlerts(1, newFilters);
  };

  // Handle sort
  const handleSort = (column) => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    const newFilters = { ...filters, sortBy: column, sortOrder: newSortOrder };
    setFilters(newFilters);
    fetchAlerts(currentPage, newFilters);
  };

  // Format metrics data for display
  const metricsData = metrics.length > 0 ? metrics.map(m => ({
    ...m,
    icon: m.id === 1 ? <PeopleAltOutlined sx={{ fontSize: 20, color: '#64748b' }} /> :
          m.id === 2 ? <LayersOutlined sx={{ fontSize: 20, color: '#64748b' }} /> :
          m.id === 3 ? <TimelineOutlined sx={{ fontSize: 20, color: '#64748b' }} /> :
          <ErrorOutline sx={{ fontSize: 20, color: '#64748b' }} />
  })) : [
    { id: 1, label: 'Total Students', value: '0', trend: '+0%', trendContext: 'from last semester', isPositive: true, icon: <PeopleAltOutlined sx={{ fontSize: 20, color: '#64748b' }} /> },
    { id: 2, label: 'Active Groups', value: '0', context: 'Active classes this term', icon: <LayersOutlined sx={{ fontSize: 20, color: '#64748b' }} /> },
    { id: 3, label: 'Avg Attendance', value: '0%', trend: '+0%', trendContext: 'vs last week', isPositive: true, icon: <TimelineOutlined sx={{ fontSize: 20, color: '#64748b' }} /> },
    { id: 4, label: 'Tasks Due', value: '0', context: 'Within next 48 hours', icon: <ErrorOutline sx={{ fontSize: 20, color: '#64748b' }} /> },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Year Filter Header */}
        <div style={styles.yearFilterHeader}>
          <h1 style={styles.pageTitle}>Dashboard Overview</h1>
          <div style={styles.yearFilterRight}>
            {selectedYear && (
              <YearBadge 
                year={selectedYear} 
                onClear={() => setSelectedYear('')} 
              />
            )}
            <YearSelector
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              label="Filter by Year"
              showAllOption={true}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={styles.errorClose}>×</button>
          </div>
        )}

        {/* 1. Header Metrics Grid */}
        <div style={{
          ...styles.metricsGrid,
          gridTemplateColumns: isMobile ? '1fr' : (isTablet ? '1fr 1fr' : 'repeat(4, 1fr)')
        }}>
          {metricsData.map(m => (
            <div key={m.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.metricLabel}>{m.label}</span>
                <div style={styles.iconContainer}>
                  {loading.metrics ? (
                    <div style={styles.loadingSpinnerSmall}></div>
                  ) : (
                    m.icon || <PeopleAltOutlined sx={{ fontSize: 20, color: '#64748b' }} />
                  )}
                </div>
              </div>
              <h2 style={styles.metricValue}>
                {loading.metrics ? '...' : m.value}
              </h2>
              <div style={styles.metricFooter}>
                {m.trend && (
                  <span style={{ ...styles.trend, color: m.isPositive ? '#10b981' : '#ef4444' }}>
                    {m.trend}
                  </span>
                )}
                <span style={styles.footerText}>{m.trendContext || m.context || ''}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Side by Side Container for Attendance & Tasks */}
        <div style={{
          display: 'flex',
          gap: '24px',
          marginTop: '24px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          {/* 2. Unmarked Attendance Section */}
          <div style={{ ...styles.card, padding: 0, flex: isMobile ? '1 1 100%' : '1 1 50%', minWidth: isMobile ? '100%' : '0' }}>
          <div style={{ ...styles.tableHeader, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                backgroundColor: '#fef2f2', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <LocationOn sx={{ fontSize: 22, color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ ...styles.sectionTitle, marginBottom: '2px' }}>Attendance Overdue</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {attendancePagination?.totalItems || 0} venue(s) overdue • 45 min after session start
                </span>
              </div>
            </div>
            <button 
              onClick={() => fetchUnmarkedAttendance(1)}
              style={{ ...styles.actionBtn, padding: '6px 12px', fontSize: '13px' }}
              disabled={loading.unmarkedAttendance}
            >
              {loading.unmarkedAttendance ? '...' : '↻ Refresh'}
            </button>
          </div>

          {loading.unmarkedAttendance ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <span>Loading...</span>
            </div>
          ) : unmarkedAttendance.length > 0 ? (
            <div>
              {/* Venue Cards */}
              {unmarkedAttendance.map((venue, index) => (
                <div key={venue.venue_id} style={{
                  padding: '16px',
                  borderBottom: index < unmarkedAttendance.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafbfc'
                }}>
                  {/* Venue Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{venue.venue_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{venue.location || 'No location'}</div>
                    </div>
                    <button 
                      onClick={() => navigate('/attendance')} 
                      style={{ 
                        ...styles.actionBtn, 
                        padding: '6px 12px', 
                        fontSize: '12px',
                        backgroundColor: '#ef4444',
                        color: '#fff',
                        border: 'none'
                      }}
                    >
                      Mark Now
                    </button>
                  </div>
                  
                  {/* Faculty & Students Row */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Person sx={{ fontSize: 14, color: '#64748b' }} />
                      <span style={{ fontSize: '12px', color: '#475569' }}>{venue.faculty_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PeopleAltOutlined sx={{ fontSize: 14, color: '#64748b' }} />
                      <span style={{ fontSize: '12px', color: '#475569' }}>{venue.student_count} students</span>
                    </div>
                  </div>

                  {/* Unmarked Sessions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {venue.unmarked_sessions.map(session => (
                      <span key={session.id} style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        <AccessTime sx={{ fontSize: 12 }} />
                        {session.name} • {session.minutes_overdue}m late
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {(attendancePagination?.totalPages || 0) > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '12px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#fafafa',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  border: '1px solid #e2e8f0',
                  borderTopLeftRadius: '0',
                  borderTopRightRadius: '0'
                }}>
                  <button
                    onClick={() => fetchUnmarkedAttendance((attendancePagination?.currentPage || 1) - 1)}
                    disabled={(attendancePagination?.currentPage || 1) === 1}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: (attendancePagination?.currentPage || 1) === 1 ? '#f1f5f9' : '#fff',
                      color: (attendancePagination?.currentPage || 1) === 1 ? '#94a3b8' : '#475569',
                      cursor: (attendancePagination?.currentPage || 1) === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <ChevronLeft sx={{ fontSize: 16 }} />
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Page {attendancePagination?.currentPage || 1} of {attendancePagination?.totalPages || 1}
                  </span>
                  <button
                    onClick={() => fetchUnmarkedAttendance((attendancePagination?.currentPage || 1) + 1)}
                    disabled={(attendancePagination?.currentPage || 1) === (attendancePagination?.totalPages || 1)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: (attendancePagination?.currentPage || 1) === (attendancePagination?.totalPages || 1) ? '#f1f5f9' : '#fff',
                      color: (attendancePagination?.currentPage || 1) === (attendancePagination?.totalPages || 1) ? '#94a3b8' : '#475569',
                      cursor: (attendancePagination?.currentPage || 1) === (attendancePagination?.totalPages || 1) ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <ChevronRight sx={{ fontSize: 16 }} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.successContainer}>
              <CheckCircleOutline sx={{ fontSize: 48, color: '#10b981' }} />
              <span style={{ color: '#10b981', fontWeight: '600' }}>No attendance overdue! All venues on track.</span>
            </div>
          )}
          </div>

          {/* 3. Pending Task Assignments Section */}
          <div style={{ ...styles.card, padding: 0, flex: isMobile ? '1 1 100%' : '1 1 50%', minWidth: isMobile ? '100%' : '0' }}>
          <div style={{ ...styles.tableHeader, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                backgroundColor: '#fffbeb', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Assignment sx={{ fontSize: 22, color: '#f59e0b' }} />
              </div>
              <div>
                <h3 style={{ ...styles.sectionTitle, marginBottom: '2px' }}>Task Assignments Overdue</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {tasksPagination?.totalItems || 0} venue(s) overdue • Deadline 12:30 PM
                </span>
              </div>
            </div>
            <button 
              onClick={() => fetchVenuesWithoutTasks(1)}
              style={{ ...styles.actionBtn, padding: '6px 12px', fontSize: '13px' }}
              disabled={loading.pendingTasks}
            >
              {loading.pendingTasks ? '...' : '↻ Refresh'}
            </button>
          </div>

          {loading.pendingTasks ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <span>Loading...</span>
            </div>
          ) : venuesWithoutTasks.length > 0 ? (
            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {/* Venue Cards */}
              {venuesWithoutTasks.map((venue, index) => (
                <div key={venue.venue_id} style={{
                  padding: '16px',
                  borderBottom: index < venuesWithoutTasks.length - 1 ? '1px solid #f1f5f9' : 'none',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#fafbfc'
                }}>
                  {/* Venue Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{venue.venue_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{venue.location || 'No location'}</div>
                    </div>
                    <button 
                      onClick={() => navigate('/tasks')} 
                      style={{ 
                        ...styles.actionBtn, 
                        padding: '6px 12px', 
                        fontSize: '12px',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none'
                      }}
                    >
                      Assign Now
                    </button>
                  </div>
                  
                  {/* Faculty & Students Row */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Person sx={{ fontSize: 14, color: '#64748b' }} />
                      <span style={{ fontSize: '12px', color: '#475569' }}>{venue.faculty_name || 'Not Assigned'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PeopleAltOutlined sx={{ fontSize: 14, color: '#64748b' }} />
                      <span style={{ fontSize: '12px', color: '#475569' }}>{venue.student_count} students</span>
                    </div>
                  </div>

                  {/* Overdue Status */}
                  <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fffbeb',
                    color: '#d97706',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    <AccessTime sx={{ fontSize: 12 }} />
                    {venue.overdue_display || 'No Tasks Today'}
                  </span>
                </div>
              ))}

              {/* Pagination */}
              {(tasksPagination?.totalPages || 0) > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '12px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#fafafa',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  border: '1px solid #e2e8f0',
                  borderTopLeftRadius: '0',
                  borderTopRightRadius: '0'
                }}>
                  <button
                    onClick={() => fetchVenuesWithoutTasks((tasksPagination?.currentPage || 1) - 1)}
                    disabled={(tasksPagination?.currentPage || 1) === 1}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: (tasksPagination?.currentPage || 1) === 1 ? '#f1f5f9' : '#fff',
                      color: (tasksPagination?.currentPage || 1) === 1 ? '#94a3b8' : '#475569',
                      cursor: (tasksPagination?.currentPage || 1) === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <ChevronLeft sx={{ fontSize: 16 }} />
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Page {tasksPagination?.currentPage || 1} of {tasksPagination?.totalPages || 1}
                  </span>
                  <button
                    onClick={() => fetchVenuesWithoutTasks((tasksPagination?.currentPage || 1) + 1)}
                    disabled={(tasksPagination?.currentPage || 1) === (tasksPagination?.totalPages || 1)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: (tasksPagination?.currentPage || 1) === (tasksPagination?.totalPages || 1) ? '#f1f5f9' : '#fff',
                      color: (tasksPagination?.currentPage || 1) === (tasksPagination?.totalPages || 1) ? '#94a3b8' : '#475569',
                      cursor: (tasksPagination?.currentPage || 1) === (tasksPagination?.totalPages || 1) ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <ChevronRight sx={{ fontSize: 16 }} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.successContainer}>
              <CheckCircleOutline sx={{ fontSize: 48, color: '#10b981' }} />
              <span style={{ color: '#10b981', fontWeight: '600' }}>
                {taskStats.deadline_passed === false 
                  ? 'Task deadline (12:30 PM) not yet reached' 
                  : 'All venues have assigned tasks today!'}
              </span>
            </div>
          )}
          </div>
        </div>

        {/* 4. Alerts Table with Filters and Pagination */}
        <div style={{ ...styles.card, padding: 0, marginTop: '24px', overflow: 'hidden' }}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>Recent Alerts & Attention Needed</h3>
            
            {/* Filters */}
            <div style={styles.filterContainer}>
              <div style={styles.searchBox}>
                <Search sx={{ fontSize: 18, color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              <select
                value={filters.issueType}
                onChange={(e) => handleFilterChange('issueType', e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All Issues</option>
                <option value="danger">Critical Issues</option>
                <option value="warning">Warnings</option>
                <option value="attendance">Attendance Issues</option>
                <option value="task">Task Issues</option>
                <option value="absence">Absence Issues</option>
              </select>
            </div>
          </div>

          {loading.alerts ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <span>Loading alerts...</span>
            </div>
          ) : alerts.length > 0 ? (
            <>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        <button 
                          onClick={() => handleSort('name')} 
                          style={styles.sortButton}
                        >
                          Student Name
                          {filters.sortBy === 'name' && (
                            filters.sortOrder === 'asc' ? 
                              <ArrowUpward sx={{ fontSize: 14, marginLeft: '4px' }} /> : 
                              <ArrowDownward sx={{ fontSize: 14, marginLeft: '4px' }} />
                          )}
                        </button>
                      </th>
                      <th style={styles.th}>Group / Class</th>
                      <th style={styles.th}>
                        <button 
                          onClick={() => handleSort('issue')} 
                          style={styles.sortButton}
                        >
                          Issue Type
                          {filters.sortBy === 'issue' && (
                            filters.sortOrder === 'asc' ? 
                              <ArrowUpward sx={{ fontSize: 14, marginLeft: '4px' }} /> : 
                              <ArrowDownward sx={{ fontSize: 14, marginLeft: '4px' }} />
                          )}
                        </button>
                      </th>
                      <th style={styles.th}>
                        <button 
                          onClick={() => handleSort('date')} 
                          style={styles.sortButton}
                        >
                          Date
                          {filters.sortBy === 'date' && (
                            filters.sortOrder === 'asc' ? 
                              <ArrowUpward sx={{ fontSize: 14, marginLeft: '4px' }} /> : 
                              <ArrowDownward sx={{ fontSize: 14, marginLeft: '4px' }} />
                          )}
                        </button>
                      </th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((row, index) => (
                      <tr key={`${row.id}-${index}`} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div style={styles.studentName}>{row.name}</div>
                          <div style={styles.studentId}>ID: {row.id}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.regularText}>{row.venue_name || row.group}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={row.type === 'danger' ? styles.badgeDanger : styles.badgeWarning}>
                            {row.issue}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.regularText}>{row.date}</span>
                          {row.attendance_percentage && (
                            <div style={styles.attendanceDetail}>
                              Attendance: {row.attendance_percentage}%
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <span style={row.type === 'danger' ? styles.statusCritical : styles.statusWarning}>
                            {row.type === 'danger' ? 'Critical' : 'Warning'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => navigate(`/students/${encodeIdSimple(row.student_id)}`)} 
                            style={styles.actionBtn}
                          >
                            View Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div style={styles.paginationWrapper}>
                <div style={styles.paginationInfo}>
                  Showing <span style={{ fontWeight: '600' }}>{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span> to{' '}
                  <span style={{ fontWeight: '600' }}>{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> of{' '}
                  <span style={{ fontWeight: '600' }}>{pagination.totalItems}</span> alerts
                </div>
                <div style={styles.paginationControls}>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1 || loading.alerts}
                    style={{ 
                      ...styles.pageBtn, 
                      opacity: currentPage === 1 ? 0.5 : 1, 
                      cursor: currentPage === 1 || loading.alerts ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <ChevronLeft sx={{ fontSize: 18 }} />
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(pageNum => {
                      // Show limited pages on mobile
                      if (isMobile) {
                        return pageNum === 1 || 
                               pageNum === pagination.totalPages || 
                               Math.abs(pageNum - currentPage) <= 1;
                      }
                      return true;
                    })
                    .map((pageNum, index, array) => {
                      // Add ellipsis for mobile
                      if (isMobile && index > 0 && pageNum - array[index - 1] > 1) {
                        return (
                          <span key={`ellipsis-${pageNum}`} style={styles.ellipsis}>
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading.alerts}
                          style={currentPage === pageNum ? styles.pageBtnActive : styles.pageBtn}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                  <button 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={currentPage === pagination.totalPages || loading.alerts}
                    style={{ 
                      ...styles.pageBtn, 
                      opacity: currentPage === pagination.totalPages ? 0.5 : 1, 
                      cursor: currentPage === pagination.totalPages || loading.alerts ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <ChevronRight sx={{ fontSize: 18 }} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.noDataContainer}>
              <span>No alerts found. Try changing your filters.</span>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation Styles */}
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
          
          input:focus, select:focus {
            outline: none;
            border-color: #3b82f6;
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: { width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, sans-serif', display: 'flex', justifyContent: 'center' },
  wrapper: { width: '100%', boxSizing: 'border-box' },
  
  // Year Filter Header
  yearFilterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  yearFilterRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  
  // Error Banner
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    border: '1px solid #FECACA'
  },
  errorClose: { 
    background: 'none', 
    border: 'none', 
    fontSize: '20px', 
    cursor: 'pointer', 
    color: '#991B1B',
    padding: '0'
  },

  // Loading States
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
    color: '#64748b',
    fontSize: '14px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingSpinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid #e2e8f0',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  noDataContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    fontSize: '14px',
    fontStyle: 'italic'
  },

  // Metrics Grid
  metricsGrid: { display: 'grid', gap: '24px', marginBottom: '24px' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  metricLabel: { fontSize: '14px', fontWeight: '500', color: '#64748b' },
  metricValue: { fontSize: '28px', fontWeight: '800', margin: '0 0 6px 0', color: '#1e293b' },
  metricFooter: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' },
  trend: { fontWeight: '600' },
  footerText: { color: '#94a3b8' },
  iconContainer: { width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Table Header
  tableHeader: { 
    padding: '20px 24px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 },
  
  // Filter Container
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    minWidth: '250px'
  },
  searchInput: {
    border: 'none',
    background: 'none',
    fontSize: '14px',
    color: '#334155',
    width: '100%',
    padding: '0'
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    color: '#334155',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '150px'
  },

  // Table Styles
  tableContainer: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { 
    padding: '16px 24px', 
    color: '#64748b', 
    fontSize: '13px', 
    textAlign: 'left', 
    borderBottom: '1px solid #e2e8f0', 
    backgroundColor: '#fafbfc',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  sortButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0'
  },
  td: { 
    padding: '20px 24px', 
    borderBottom: '1px solid #f1f5f9', 
    verticalAlign: 'top',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    transition: 'background-color 0.2s ease'
  },
    '&:hover': {
      backgroundColor: '#f8fafc'
  },
  
  // Cell Content Styles
  studentName: { fontWeight: '600', color: '#334155', fontSize: '14px', marginBottom: '4px' },
  studentId: { fontSize: '12px', color: '#94a3b8' },
  regularText: { color: '#64748b', fontSize: '14px' },
  attendanceDetail: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
    fontStyle: 'italic'
  },
  
  // Badge Styles
  badgeDanger: { 
    backgroundColor: '#fff1f2', 
    color: '#e11d48', 
    padding: '6px 16px', 
    borderRadius: '20px', 
    fontSize: '12px', 
    fontWeight: '600',
    display: 'inline-block'
  },
  badgeWarning: { 
    backgroundColor: '#fffbeb', 
    color: '#d97706', 
    padding: '6px 16px', 
    borderRadius: '20px', 
    fontSize: '12px', 
    fontWeight: '600',
    display: 'inline-block'
  },
  
  // Status Badges
  statusCritical: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  
  actionBtn: { 
    backgroundColor: '#eff6ff', 
    color: '#3b82f6', 
    border: 'none', 
    padding: '8px 16px', 
    borderRadius: '6px', 
    fontWeight: '600', 
    fontSize: '13px', 
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#dbeafe'
    }
  },

  // Pagination Styles
  paginationWrapper: { 
    padding: '20px 24px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTop: '1px solid #f1f5f9', 
    backgroundColor: '#ffffff',
    flexWrap: 'wrap',
    gap: '16px'
  },
  paginationInfo: { 
    fontSize: '14px', 
    color: '#64748b' 
  },
  paginationControls: { 
    display: 'flex', 
    gap: '8px', 
    alignItems: 'center' 
  },
  pageBtn: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minWidth: '36px', 
    height: '36px', 
    padding: '0 8px', 
    border: '1px solid #e2e8f0', 
    borderRadius: '6px', 
    backgroundColor: '#fff', 
    color: '#64748b', 
    fontSize: '14px', 
    fontWeight: '600', 
    cursor: 'pointer', 
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#f8fafc',
      borderColor: '#cbd5e1'
    }
  },
  pageBtnActive: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minWidth: '36px', 
    height: '36px', 
    padding: '0 8px', 
    border: '1px solid #3b82f6', 
    borderRadius: '6px', 
    backgroundColor: '#3b82f6', 
    color: '#ffffff', 
    fontSize: '14px', 
    fontWeight: '600', 
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#2563eb'
    }
  },
  ellipsis: { 
    color: '#94a3b8', 
    fontSize: '14px', 
    padding: '0 4px' 
  },

  // New Styles for Unmarked Attendance & Pending Tasks
  sessionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  progressBar: {
    width: '60px',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600'
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px'
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    flex: '1',
    minWidth: '150px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b'
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '4px'
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  }
};

export default EducationDashboard;