import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { apiGet } from '../../../utils/api';

// Helper function to get initials from name
const getInitials = (name) => {
  return name.charAt(0).toUpperCase();
};

// Helper function to get avatar background color
const getAvatarColor = (name) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Pagination helper function
const paginate = (items, page, itemsPerPage) => {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return {
    items: items.slice(startIndex, endIndex),
    totalPages: Math.ceil(items.length / itemsPerPage),
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, items.length),
    total: items.length
  };
};

const Performance = () => {
  const [selectedWorkshop, setSelectedWorkshop] = useState('overall');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [workshopsData, setWorkshopsData] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const itemsPerPage = 4;

  // Fetch leaderboard and standings on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data when workshop selection changes
  useEffect(() => {
    if (selectedWorkshop !== 'overall') {
      fetchCourseLeaderboard(selectedWorkshop);
    } else {
      fetchOverallLeaderboard();
    }
  }, [selectedWorkshop]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverallLeaderboard(),
        fetchStandings()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverallLeaderboard = async () => {
    try {
      const response = await apiGet('/leaderboard/overall');
      if (response.success) {
        setLeaderboardData(response.data.leaderboard);
        setCurrentUserData(response.data.current_user);
      }
    } catch (error) {
      console.error('Error fetching overall leaderboard:', error);
      setLeaderboardData([]);
    }
  };

  const fetchCourseLeaderboard = async (courseId) => {
    try {
      setLoading(true);
      const response = await apiGet(`/leaderboard/course/${courseId}`);
      if (response.success) {
        setLeaderboardData(response.data.leaderboard);
        setCurrentUserData(response.data.current_user);
      }
    } catch (error) {
      console.error('Error fetching course leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    try {
      const response = await apiGet('/leaderboard/my-standings');
      if (response.success) {
        // Add overall standing
        const overallStanding = {
          course_id: 'overall',
          course_name: 'Overall Leaderboard',
          status: 'All Courses Combined',
          my_rank: currentUserData?.rank || 0,
          my_points: currentUserData?.total_points || 0,
          isOverall: true
        };
        
        setWorkshopsData([overallStanding, ...response.data]);
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
      setWorkshopsData([]);
    }
  };

  const handleWorkshopClick = (workshopId) => {
    setSelectedWorkshop(workshopId);
  };

  const handlePageChange = (direction) => {
    if (direction === 'next' && currentPage < paginatedWorkshops.totalPages) {
      setCurrentPage(currentPage + 1);
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate paginated workshops
  const paginatedWorkshops = paginate(workshopsData, currentPage, itemsPerPage);

  // Get leaderboard title
  const leaderboardTitle = selectedWorkshop === 'overall' 
    ? 'Overall Leaderboard' 
    : workshopsData.find(w => w.course_id === selectedWorkshop)?.course_name || 'Leaderboard';

  if (loading && leaderboardData.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Leaderboard */}
      <div style={styles.leaderboardSection}>
        <div style={styles.header}>
          <h2 style={styles.title}>{leaderboardTitle}</h2>
          <p style={styles.subtitle}>Based on accumulated points across all submissions</p>
        </div>

        <div style={styles.tableHeader}>
          <span style={styles.headerRank}>RANK</span>
          <span style={styles.headerName}>STUDENT NAME</span>
          <span style={styles.headerPoints}>TOTAL POINTS</span>
        </div>

        <div style={styles.leaderboardList}>
          {leaderboardData.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No leaderboard data available</p>
            </div>
          ) : (
            leaderboardData.map((student) => (
              <div 
                key={student.student_id} 
                style={{
                  ...styles.leaderboardRow,
                  ...(student.is_current_user ? styles.currentUserRow : {})
                }}
              >
                <div style={styles.rankCell}>
                  <span style={{
                    ...styles.rankNumber,
                    ...(student.rank <= 3 ? styles.topRank : {}),
                    ...(student.is_current_user ? styles.currentUserText : {})
                  }}>
                    {student.rank}
                  </span>
                </div>
                
                <div style={styles.nameCell}>
                  <div 
                    style={{
                      ...styles.avatar,
                      backgroundColor: getAvatarColor(student.student_name)
                    }}
                  >
                    {getInitials(student.student_name)}
                  </div>
                  <span style={{
                    ...styles.studentName,
                    ...(student.is_current_user ? styles.currentUserText : {})
                  }}>
                    {student.student_name} {student.is_current_user ? '(You)' : ''}
                  </span>
                </div>
                
                <div style={styles.pointsCell}>
                  <span style={{
                    ...styles.points,
                    ...(student.is_current_user ? styles.currentUserText : {})
                  }}>
                    {Math.round(student.total_points)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Workshop Standings */}
      <div style={styles.workshopSection}>
        <h2 style={styles.workshopTitle}>Course Standings</h2>
        
        <div style={styles.workshopList}>
          {paginatedWorkshops.items.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No course standings available</p>
            </div>
          ) : (
            paginatedWorkshops.items.map((workshop) => (
              <div 
                key={workshop.course_id} 
                style={{
                  ...styles.workshopCard,
                  backgroundColor: selectedWorkshop === workshop.course_id ? '#EBF4FF' : 'white',
                  cursor: 'pointer',
                  border: selectedWorkshop === workshop.course_id ? '2px solid #2B6EF6' : '2px solid #E5E7EB',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleWorkshopClick(workshop.course_id)}
              >
                <div style={styles.workshopHeader}>
                  <div>
                    <h3 style={styles.workshopName}>{workshop.course_name}</h3>
                    <p style={styles.workshopStatus}>
                      {workshop.status || (workshop.start_date ? `${new Date(workshop.start_date).toLocaleDateString()} - ${new Date(workshop.end_date).toLocaleDateString()}` : 'N/A')}
                    </p>
                  </div>
                </div>
                
                <div style={styles.workshopFooter}>
                  {workshop.my_rank !== undefined && !workshop.isOverall && (
                    <span style={styles.rankBadge}>Rank #{workshop.my_rank}</span>
                  )}
                  {workshop.isOverall && (
                    <span style={styles.rankBadge}>All Courses</span>
                  )}
                  <span style={styles.workshopPoints}>
                    <Star size={14} fill="#2B6EF6" stroke="#2B6EF6" style={{marginRight: '4px', verticalAlign: 'middle'}} />
                    {Math.round(workshop.my_points || 0)} Pts
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.paginationInfo}>
            Showing {paginatedWorkshops.startIndex}-{paginatedWorkshops.endIndex} workshops
          </span>
          <div style={styles.paginationControls}>
            <button 
              style={{
                ...styles.paginationButton,
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: paginatedWorkshops.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <span 
                key={pageNum}
                style={{
                  ...styles.pageNumberBox,
                  backgroundColor: currentPage === pageNum ? '#2B6EF6' : 'white',
                  color: currentPage === pageNum ? 'white' : '#6B7280',
                  cursor: 'pointer'
                }}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </span>
            ))}
            
            <button 
              style={{
                ...styles.paginationButton,
                opacity: currentPage === paginatedWorkshops.totalPages ? 0.5 : 1,
                cursor: currentPage === paginatedWorkshops.totalPages ? 'not-allowed' : 'pointer'
              }}
              onClick={() => handlePageChange('next')}
              disabled={currentPage === paginatedWorkshops.totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '24px',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    flexWrap: 'wrap'
  },
  leaderboardSection: {
    flex: '2 1 600px',
    minWidth: '300px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '1px solid #E5E7EB',
    fontSize: '11px',
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: '0.5px'
  },
  headerRank: {
    width: '60px'
  },
  headerName: {
    flex: 1
  },
  headerPoints: {
    width: '120px',
    textAlign: 'right'
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column'
  },
  leaderboardRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #F3F4F6',
    transition: 'background-color 0.2s'
  },
  currentUserRow: {
    backgroundColor: '#2B6EF6',
    borderRadius: '8px',
    margin: '4px 0',
    border: 'none'
  },
  currentUserText: {
    color: 'white'
  },
  rankCell: {
    width: '60px'
  },
  rankNumber: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#6B7280'
  },
  topRank: {
    color: '#D97706',
    fontWeight: '600'
  },
  nameCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '13px'
  },
  studentName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a'
  },
  pointsCell: {
    width: '120px',
    textAlign: 'right'
  },
  points: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2563EB'
  },
  workshopSection: {
    flex: '1 1 350px',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  workshopTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: '#1a1a1a'
  },
  workshopList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  workshopCard: {
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  workshopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  workshopName: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#1a1a1a'
  },
  workshopStatus: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0
  },
  progressIcon: {
    width: '24px',
    height: '24px'
  },
  barIcon: {
    display: 'flex',
    gap: '3px',
    alignItems: 'flex-end',
    height: '16px'
  },
  bar: {
    width: '4px',
    backgroundColor: '#1a1a1a',
    borderRadius: '2px'
  },
  workshopFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rankBadge: {
    backgroundColor: '#EBF4FF',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#2563EB'
  },
  workshopPoints: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    padding: '12px 0'
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6B7280'
  },
  paginationControls: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  paginationButton: {
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    padding: '6px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  pageNumberBox: {
    backgroundColor: '#2B6EF6',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    minWidth: '36px',
    textAlign: 'center',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s'
  }
};

export default Performance;