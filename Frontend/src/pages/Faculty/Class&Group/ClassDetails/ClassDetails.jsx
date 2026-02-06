import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../../../store/useAuthStore';
import { encodeIdSimple, decodeIdSimple } from '../../../../utils/idEncoder';
import { apiGet } from '../../../../utils/api';
import { 
  FolderOpen, 
  Assignment, 
  Groups, 
  Search, 
  Verified, 
  CalendarMonth, 
  ArrowForwardIos,
  ChevronRight,
  FactCheck,
  CheckCircle,
  Cancel,
  RemoveCircle,
  TrendingUp,
  Warning,
  Error as ErrorIcon
} from '@mui/icons-material';

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

const ClassDetails = () => {
  const navigate = useNavigate();
  const { venueId: encodedVenueId } = useParams();
  const venueId = decodeIdSimple(encodedVenueId) || encodedVenueId; // Fallback for non-encoded IDs
  const { width } = useWindowSize();
  const isMobile = width <= 768;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [venueData, setVenueData] = useState(null);
  const [skillReports, setSkillReports] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [skillSearchTerm, setSkillSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [yearFilter, setYearFilter] = useState("All Years");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [skillCurrentPage, setSkillCurrentPage] = useState(1);
  const studentsPerPage = 12;
  const skillsPerPage = 3;
  const [currentVenueId, setCurrentVenueId] = useState(venueId);

  // --- FETCH FACULTY'S FIRST VENUE IF NO VENUE ID PROVIDED ---
  useEffect(() => {
    const fetchFacultyVenue = async () => {
      if (venueId) return; // Skip if venueId already provided
      
      try {
        const response = await apiGet('/faculty/my-classes');

        const data = await response.json();
        if (data.success && data.data.classes && data.data.classes.length > 0) {
          // Use the first assigned venue
          setCurrentVenueId(data.data.classes[0].id);
        } else {
          setError('No venues assigned to you');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching faculty venues:', err);
        setError('Failed to fetch assigned venues');
        setLoading(false);
      }
    };

    fetchFacultyVenue();
  }, [venueId, API_URL]);

  // --- FETCH VENUE DETAILS ---
  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (!currentVenueId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiGet(`/groups/venues/${currentVenueId}/details`);

        if (!response.ok) {
          throw new Error('Failed to fetch venue details');
        }

        const result = await response.json();
        
        if (result.success) {
          setVenueData(result.data);
        } else {
          throw new Error(result.message || 'Failed to load venue data');
        }
      } catch (err) {
        console.error('Error fetching venue details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVenueDetails();
  }, [currentVenueId, API_URL]);

  // --- FETCH SKILL COMPLETION DATA (using new API) ---
  useEffect(() => {
    const fetchSkillCompletionData = async () => {
      if (!venueData?.venue?.venue_id) return;
      
      setSkillsLoading(true);
      try {
        // Use the new skill-completion API for course-wise data
        const response = await apiGet(`/skill-completion/venues/${venueData.venue.venue_id}/courses`);

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.courses) {
            setSkillReports(result.data.courses);
          }
        }
      } catch (err) {
        console.error('Error fetching skill completion data:', err);
      } finally {
        setSkillsLoading(false);
      }
    };

    fetchSkillCompletionData();
  }, [venueData?.venue?.venue_id, API_URL]);

  // Get unique departments and years from students
  const { departments, years } = useMemo(() => {
    if (!venueData?.students) return { departments: [], years: [] };
    
    const depts = [...new Set(venueData.students.map(s => s.department).filter(Boolean))];
    const yrs = [...new Set(venueData.students.map(s => `Year ${s.year}`).filter(Boolean))];
    
    return { departments: depts, years: yrs };
  }, [venueData?.students]);

  // Process skill reports to aggregate by course (using new API data)
  const skillStats = useMemo(() => {
    if (!skillReports.length) return [];

    // Data from the new API is already aggregated by course
    return skillReports.map(course => ({
      id: course.course_name,
      groupName: course.course_name,
      venue: venueData?.venue?.venue_name || 'N/A',
      totalStudents: (course.total_attempted || 0) + (course.not_attempted_count || 0),
      completed: course.cleared_count || 0,
      notCompleted: course.not_cleared_count || 0,
      notAttempted: course.not_attempted_count || 0,
      averageScore: course.avg_best_score ? Math.round(parseFloat(course.avg_best_score)) : 0
    }));
  }, [skillReports, venueData?.venue?.venue_name]);

  // --- FILTER STUDENTS ---
  const filteredStudents = useMemo(() => {
    if (!venueData?.students) return [];
    
    return venueData.students.filter(s => {
      const matchesSearch = 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = deptFilter === "All Departments" || s.department === deptFilter;
      const matchesYear = yearFilter === "All Years" || `Year ${s.year}` === yearFilter;
      const matchesStatus = statusFilter === "All Status" || s.status === statusFilter;
      return matchesSearch && matchesDept && matchesYear && matchesStatus;
    });
  }, [venueData?.students, searchTerm, deptFilter, yearFilter, statusFilter]);

  // Pagination
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, deptFilter, yearFilter, statusFilter]);

  // Reset skill page when skill search changes
  useEffect(() => {
    setSkillCurrentPage(1);
  }, [skillSearchTerm]);

  // Filter skills based on search
  const filteredSkills = useMemo(() => {
    if (!skillSearchTerm) return skillStats;
    return skillStats.filter(skill => 
      skill.groupName?.toLowerCase().includes(skillSearchTerm.toLowerCase()) ||
      skill.venue?.toLowerCase().includes(skillSearchTerm.toLowerCase())
    );
  }, [skillStats, skillSearchTerm]);

  // Skill Pagination
  const indexOfLastSkill = skillCurrentPage * skillsPerPage;
  const indexOfFirstSkill = indexOfLastSkill - skillsPerPage;
  const currentSkills = filteredSkills.slice(indexOfFirstSkill, indexOfLastSkill);
  const totalSkillPages = Math.ceil(filteredSkills.length / skillsPerPage);

  // --- STYLES ---
  const s = {
    container: { fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
    
    Wrapper: { padding: '0 0 10px 0' },
    headerCard: { 
      backgroundColor: '#eff6ff', 
      borderRadius: '16px', 
      padding: isMobile ? '20px' : '24px 32px', 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: isMobile ? 'flex-start' : 'center', 
      borderLeft: '6px solid #3b82f6',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      gap: isMobile ? '20px' : '0'
    },
    
    facultySection: { display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' },
    avatarLarge: { width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px' },
    badge: { 
      backgroundColor: '#dcfce7', 
      color: '#166534', 
      padding: '4px 12px', 
      borderRadius: '20px', 
      fontSize: '12px', 
      fontWeight: '600', 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '4px' 
    },
    badgeInactive: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    },
    
    quickActions: { 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', 
      gap: '20px', 
      margin: '32px 0 40px 0' 
    },
    actionCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
    
    filterBar: { 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      gap: '12px', 
      marginBottom: '24px', 
      alignItems: 'stretch' 
    },
    inputWrapper: { flex: 2, position: 'relative', display: 'flex', alignItems: 'center' },
    input: { width: '100%', padding: '12px 16px 12px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' },
    searchIcon: { position: 'absolute', left: '12px', color: '#94a3b8', fontSize: '20px' },
    select: { padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', fontSize: '14px', cursor: 'pointer', flex: 1 },
    
    studentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '24px' },
    
    pagination: { 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: '40px', 
      padding: '20px 0', 
      borderTop: '1px solid #e2e8f0',
      gap: isMobile ? '20px' : '0'
    },
    pageBtn: { padding: '8px 16px', cursor: 'pointer', border: 'none', background: 'none', fontWeight: '600', fontSize: '14px' },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '16px'
    },
    errorContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: '16px',
      color: '#dc2626'
    },
    statBox: {
      backgroundColor: '#f8fafc',
      padding: '12px 16px',
      borderRadius: '8px',
      textAlign: 'center',
      minWidth: '80px'
    }
  };

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div style={s.container}>
        <div style={s.loadingContainer}>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Loading venue details...</div>
        </div>
      </div>
    );
  }

  const SkillStatusCard = ({ skill }) => {
    const [isHovered, setIsHovered] = useState(false);

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: isHovered ? '2px solid #3b82f6' : '1px solid #f1f5f9',
        boxShadow: isHovered ? '0 8px 16px -4px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: 'pointer'
    };

    const completionRate = ((skill.completed / skill.totalStudents) * 100).toFixed(1);

    const handleCardClick = () => {
      navigate(`/group-insights?venue=${venueData?.venue?.venue_id || ''}&skill=${encodeURIComponent(skill.groupName)}&tab=skills`);
    };

    return (
        <div
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
        >
        {/* Header */}
        <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
            {skill.groupName}
            </h4>
            <div style={{ 
            fontSize: '11px', 
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
            }}>
            <span style={{ 
                backgroundColor: '#f1f5f9', 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: '600'
            }}>
                {skill.venue}
            </span>
            <span>•</span>
            <span>{skill.totalStudents} Students</span>
            </div>
        </div>

        {/* Completion Rate Progress Bar */}
        <div style={{ marginBottom: '12px' }}>
            <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '6px'
            }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Completion Rate</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>{completionRate}%</span>
            </div>
            <div style={{ 
            width: '100%', 
            height: '6px', 
            backgroundColor: '#f1f5f9', 
            borderRadius: '8px',
            overflow: 'hidden'
            }}>
            <div style={{ 
                width: `${completionRate}%`, 
                height: '100%', 
                backgroundColor: '#10b981',
                transition: 'width 0.5s ease'
            }} />
            </div>
        </div>

        {/* Status Breakdown */}
        <div style={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginBottom: '12px'
        }}>
            {/* Completed */}
            <div style={{ 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px', 
            padding: '8px 6px',
            textAlign: 'center',
            border: '1px solid #bbf7d0'
            }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>
                {skill.completed}
            </div>
            <div style={{ fontSize: '9px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase' }}>
                Completed
            </div>
            </div>

            {/* Not Completed */}
            <div style={{ 
            backgroundColor: '#fef2f2', 
            borderRadius: '8px', 
            padding: '8px 6px',
            textAlign: 'center',
            border: '1px solid #fecaca'
            }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#dc2626' }}>
                {skill.notCompleted}
            </div>
            <div style={{ fontSize: '9px', color: '#b91c1c', fontWeight: '600', textTransform: 'uppercase' }}>
                Not Cleared
            </div>
            </div>

            {/* Not Attempted */}
            <div style={{ 
            backgroundColor: '#fef3c7', 
            borderRadius: '8px', 
            padding: '8px 6px',
            textAlign: 'center',
            border: '1px solid #fde68a'
            }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#d97706' }}>
                {skill.notAttempted}
            </div>
            <div style={{ fontSize: '9px', color: '#b45309', fontWeight: '600', textTransform: 'uppercase' }}>
                Not Attempted
            </div>
            </div>
        </div>

        {/* Average Score */}
        <div style={{ 
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Average Score</span>
            <span style={{ 
            fontSize: '18px', 
            fontWeight: '800', 
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
            }}>
            {skill.averageScore}
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>/100</span>
            </span>
        </div>
        </div>
    );
    };

  // --- ERROR STATE ---
  if (error) {
    return (
      <div style={s.container}>
        <div style={s.errorContainer}>
          <ErrorIcon style={{ fontSize: '48px' }} />
          <p style={{ fontSize: '16px', fontWeight: '600' }}>Failed to load venue details</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{error}</p>
          <button 
            onClick={() => navigate('/classes')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  // --- NO DATA STATE ---
  if (!venueData) {
    return (
      <div style={s.container}>
        <div style={s.errorContainer}>
          <Warning style={{ fontSize: '48px', color: '#f59e0b' }} />
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>No venue data found</p>
          <button 
            onClick={() => navigate('/classes')}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  const { venue, faculty, group, statistics } = venueData;

  return (
    <div style={s.container}>
      <div style={s.Wrapper}>
        <div style={s.headerCard}>
          {/* Left Side - Venue Details */}
          <div style={{ flex: '0 0 auto' }}>
            <h1 style={{ margin: '0 0 4px 0', fontSize: isMobile ? '20px' : '24px', color: '#1e293b', fontWeight: '800' }}>
              {venue.venue_name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
              {venue.location && <span>{venue.location}</span>}
              {venue.location && group?.schedule_days && <span>•</span>}
              {group?.schedule_days && <span>{group.schedule_days}</span>}
              {group?.schedule_time && <span>• {group.schedule_time}</span>}
            </div>
          </div>

          {/* Center - Statistics */}
          <div style={{ display: 'flex', gap: '45px', alignItems: 'center', flex: '1', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{statistics.active_students}</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>Students</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{venue.capacity}</div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>Capacity</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: statistics.avg_attendance >= 80 ? '#10b981' : statistics.avg_attendance >= 60 ? '#f59e0b' : '#dc2626', lineHeight: '1' }}>
                {statistics.avg_attendance}%
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>Avg Attendance</div>
            </div>
          </div>

          {/* Right Side - Status and Faculty */}
          <div style={{ flex: '0 0 auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <span style={venue.status === 'Active' ? s.badge : s.badgeInactive}>
              <Verified style={{ fontSize: '14px' }} /> {venue.status}
            </span>
            {faculty && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>{faculty.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{faculty.designation || 'Faculty'}, {faculty.department}</p>
                </div>
                <div style={s.avatarLarge}>
                  {faculty.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            {!faculty && (
              <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No faculty assigned</p>
            )}
          </div>
        </div>
      </div>

      <div style={s.quickActions}>
        <div style={s.actionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FolderOpen color="primary" />
            <h4 style={{ margin: 0, color: '#1e293b' }}>Course Materials</h4>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            {statistics.total_roadmap_days} roadmap days available
          </p>
          <div onClick={() => navigate("/tasks")} style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Open Materials <ChevronRight style={{ fontSize: '18px' }} />
          </div>
        </div>

        <div style={s.actionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Assignment style={{ color: '#f59e0b' }} />
            <h4 style={{ margin: 0, color: '#1e293b' }}>Assessments</h4>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            {statistics.total_tasks} tasks assigned to students
          </p>
          <div onClick={() => navigate("/tasks")} style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Assessments <ChevronRight style={{ fontSize: '18px' }} />
          </div>
        </div>

        <div style={s.actionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FactCheck style={{ color: '#10b981' }} />
            <h4 style={{ margin: 0, color: '#1e293b' }}>Attendance Tracker</h4>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Average attendance: {statistics.avg_attendance}%
          </p>
          <div onClick={() => navigate("/attendance")} style={{ color: '#3b82f6', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Track Attendance <ChevronRight style={{ fontSize: '18px' }} />
          </div>
        </div>
      </div>

      {/* Skill Status Section */}
      {skillStats.length > 0 && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '20px', 
            marginBottom: '24px', 
            marginTop: '40px',
            flexWrap: 'wrap'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: '#1e293b' }}>
              <TrendingUp style={{ color: '#3b82f6' }} /> Skill Completion Status ({filteredSkills.length})
            </h3>

            {/* Skill Search Bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '300px', flex: '0 1 400px' }}>
              <Search style={{ position: 'absolute', left: '12px', color: '#94a3b8', fontSize: '20px' }} />
              <input 
                style={{ 
                  width: '100%', 
                  padding: '12px 16px 12px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  outline: 'none', 
                  fontSize: '14px' 
                }} 
                placeholder="Search skills by name or venue..." 
                value={skillSearchTerm}
                onChange={(e) => setSkillSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {skillsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading skill reports...
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', 
                gap: '24px',
                marginBottom: '24px'
              }}>
                {currentSkills.map((skill, index) => (
                  <SkillStatusCard key={skill.id || index} skill={skill} />
                ))}
              </div>

              {filteredSkills.length > skillsPerPage && (
                <div style={s.pagination}>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Showing <b>{indexOfFirstSkill + 1}-{Math.min(indexOfLastSkill, filteredSkills.length)}</b> of <b>{filteredSkills.length}</b> skills
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      disabled={skillCurrentPage === 1}
                      onClick={() => setSkillCurrentPage(p => p - 1)}
                      style={{ 
                        ...s.pageBtn, 
                        color: skillCurrentPage === 1 ? '#cbd5e1' : '#3b82f6',
                        backgroundColor: skillCurrentPage === 1 ? '#f8fafc' : '#eff6ff',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: skillCurrentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Prev
                    </button>

                    <button 
                      disabled={skillCurrentPage === totalSkillPages}
                      onClick={() => setSkillCurrentPage(p => p + 1)}
                      style={{ 
                        ...s.pageBtn, 
                        color: skillCurrentPage === totalSkillPages ? '#cbd5e1' : '#3b82f6',
                        backgroundColor: skillCurrentPage === totalSkillPages ? '#f8fafc' : '#eff6ff',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        cursor: skillCurrentPage === totalSkillPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: '#1e293b' }}>
        <Groups color="primary" /> Total Students Assigned ({filteredStudents.length})
      </h3>

      <div style={s.filterBar}>
        <div style={s.inputWrapper}>
          <Search style={s.searchIcon} />
          <input 
            style={s.input} 
            placeholder="Search by name, ID or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select style={s.select} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option>All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select style={s.select} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option>All Years</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {currentStudents.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          backgroundColor: 'white', 
          borderRadius: '12px',
          border: '1px solid #f1f5f9'
        }}>
          <Groups style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }} />
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>
            {venueData.students.length === 0 
              ? 'No students allocated to this venue yet' 
              : 'No students match your search criteria'}
          </p>
        </div>
      ) : (
        <div style={s.studentGrid}>
          {currentStudents.map(student => (
            <StudentCard key={student.student_id} student={student} navigate={navigate} />
          ))}
        </div>
      )}

      {filteredStudents.length > studentsPerPage && (
        <div style={s.pagination}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Showing <b>{indexOfFirstStudent + 1}-{Math.min(indexOfLastStudent, filteredStudents.length)}</b> of <b>{filteredStudents.length}</b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ 
                ...s.pageBtn, 
                color: currentPage === 1 ? '#cbd5e1' : '#3b82f6',
                backgroundColor: currentPage === 1 ? '#f8fafc' : '#eff6ff',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Prev
            </button>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ 
                ...s.pageBtn, 
                color: currentPage === totalPages ? '#cbd5e1' : '#3b82f6',
                backgroundColor: currentPage === totalPages ? '#f8fafc' : '#eff6ff',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StudentCard = ({ student, navigate }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: isHovered ? '2px solid #3b82f6' : '1px solid #f1f5f9',
    boxShadow: isHovered ? '0 12px 24px -8px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    opacity: student.status === 'Dropped' ? 0.7 : 1
  };

  const labelStyle = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '4px' };
  const valueStyle = { fontSize: '14px', color: '#1e293b', fontWeight: '600' };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#dc2626';
  };

  const getStatusBadge = (status) => {
    const styles = {
      Active: { bg: '#dcfce7', color: '#166534' },
      Dropped: { bg: '#fef2f2', color: '#dc2626' },
      Completed: { bg: '#dbeafe', color: '#1d4ed8' }
    };
    return styles[status] || styles.Active;
  };

  const statusStyle = getStatusBadge(student.status);

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '700',
            fontSize: '18px'
          }}>
            {student.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>{student.name}</div>
              <span style={{ 
                fontSize: '10px', 
                backgroundColor: statusStyle.bg, 
                color: statusStyle.color, 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontWeight: '600' 
              }}>
                {student.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>ID: {student.rollNumber}</div>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>Department</div>
          <div style={valueStyle}>{student.department || 'N/A'}</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={labelStyle}>Year</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={valueStyle}>Year {student.year}</span>
            <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              Sem {student.semester}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Attendance</div>
            <div style={{ 
              ...valueStyle, 
              color: getAttendanceColor(student.attendance_percentage), 
              fontSize: '18px', 
              fontWeight: '800' 
            }}>
              {student.attendance_percentage || 0}%
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {student.present_count || 0}/{student.total_sessions || 0} sessions
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Tasks</div>
            <div style={{ ...valueStyle, fontSize: '18px', fontWeight: '800' }}>
              {student.submitted_tasks || 0}/{student.total_tasks || 0}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              {student.graded_tasks || 0} graded
            </div>
          </div>
        </div>
      </div>

      <div 
        onClick={() => navigate(`/students/${encodeIdSimple(student.student_id)}`)} 
        style={{ 
          backgroundColor: '#eff6ff', 
          padding: '14px', 
          textAlign: 'center', 
          fontSize: '13px', 
          fontWeight: '700', 
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        View Profile <ArrowForwardIos style={{ fontSize: '12px' }} />
      </div>
    </div>
  );
};

export default ClassDetails;