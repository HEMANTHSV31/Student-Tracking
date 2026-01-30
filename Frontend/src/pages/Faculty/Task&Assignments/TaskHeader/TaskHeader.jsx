import React, { useState, useEffect } from 'react';
import AssignmentDashboard from './Task-Assignment-page/Task&assignments';
import StudyRoadmap from './Study-Road-Map/RoadMap';
import SkillOrderManager from './Study-Road-Map/SkillOrderManager';
import useAuthStore from '../../../../store/useAuthStore'; // FIXED PATH - 3 levels up
import { apiGet } from '../../../../utils/api';

const TaskHeader = () => {
  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;


  const [activeTab, setActiveTab] = useState('assignments');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('frontend');
  const [venues, setVenues] = useState([]);
  const [addDayTrigger, setAddDayTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TaskHeader.jsx

useEffect(() => {
  const fetchVenues = async () => {
    
    
    if (!user) {
      setError('Please log in to view venues');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Backend will use JWT to determine user and get their venues
      const response = await apiGet('/tasks/venues');
      
      const data = await response.json();
      
      if (data.success && data.data. length > 0) {
        
        setVenues(data. data);
        setSelectedVenueId(data.data[0].venue_id. toString());
      } else if (data.success && data.data.length === 0) {
        setError('No venues available.  Please contact admin.');
       
      } else {
        setError(data.message || 'Failed to load venues');
        
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  fetchVenues();
}, [user, API_URL]);

  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const handleAddModule = () => {
    setActiveTab('roadmap');
    setTimeout(() => {
      setAddDayTrigger(prev => prev + 1);
    }, 100);
  };

  const handleVenueChange = (e) => {
   
    setSelectedVenueId(e.target.value);
  };

  const getCurrentVenueName = () => {
    const venue = venues.find(v => v.venue_id. toString() === selectedVenueId);
    return venue ? venue. venue_name : '';
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.stickyHeader}>
        <div style={styles.headerContainer}>
          <div style={styles.leftSection}>
            <div style={styles.toggleContainer}>
              <button 
                onClick={() => setActiveTab('assignments')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'assignments' ?  styles.activeTab : styles.inactiveTab)
                }}
              >
                Assignments
              </button>
              <button 
                onClick={() => setActiveTab('roadmap')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'roadmap' ? styles.activeTab : styles.inactiveTab)
                }}
              >
                Study Roadmap
              </button>
              <button 
                onClick={() => setActiveTab('skill-order')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'skill-order' ? styles.activeTab : styles.inactiveTab)
                }}
              >
                Skill Order
              </button>
            </div>

            <div style={styles.dropdownContainer}>
              {loading ? (
                <>
                  <select style={styles.dropdownSelect} disabled>
                    <option>Loading venues...</option>
                  </select>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              ) : error ? (
                <>
                  <select style={{... styles.dropdownSelect, color: '#ef4444', borderColor: '#fecaca'}} disabled>
                    <option>{error}</option>
                  </select>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              ) : venues.length > 0 ? (
                <>
                  <select
                    value={selectedVenueId}
                    onChange={handleVenueChange}
                    style={styles.dropdownSelect}
                  >
                    <option value="" disabled>Select a venue</option>
                    {venues.map(venue => (
                      <option key={venue. venue_id} value={venue. venue_id}>
                        {venue.venue_name} ({venue.student_count} students)
                      </option>
                    ))}
                  </select>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right:  '12px', pointerEvents:  'none' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              ) : (
                <>
                  <select style={styles. dropdownSelect} disabled>
                    <option>No venues available</option>
                  </select>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              )}
            </div>

            <div style={styles.dropdownContainer}>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={styles.dropdownSelect}
              >
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="react-native">React Native</option>
                <option value="devops">DevOps</option>
              </select>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <div style={styles.rightSection}>
            <button style={styles.outlineBtn} onClick={() => alert('Student view coming soon')}>
              <EyeIcon />
              Student View
            </button>
          </div>
        </div>
      </div>

      <div style={styles.contentArea}>
        <div style={styles.contentPlaceholder}>
          {! loading && selectedVenueId && (
            activeTab === 'assignments' ? (
              <AssignmentDashboard 
                selectedVenueId={selectedVenueId}
                venueName={getCurrentVenueName()}
                venues={venues}
                selectedCourseType={selectedCourse}
              />
            ) : activeTab === 'roadmap' ? (
              <StudyRoadmap 
                selectedVenueId={selectedVenueId}
                venueName={getCurrentVenueName()}
                venues={venues}
                isActiveTab={activeTab === 'roadmap'}
                addDayTrigger={addDayTrigger}
                selectedCourseType={selectedCourse}
                key={`${selectedVenueId}-${addDayTrigger}`}
              />
            ) : (
              <SkillOrderManager 
                selectedCourseType={selectedCourse}
              />
            )
          )}
          
          {! loading && ! selectedVenueId && ! error && (
            <div style={styles.emptyState}>
              <h3>Select a venue to get started</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  stickyHeader:  {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '10px 16px',
  },
  headerContainer: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection:  {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  toggleContainer: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  tab: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    backgroundColor: '#ffffff',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  inactiveTab: {
    backgroundColor: 'transparent',
    color: '#64748b',
  },
  dropdownContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: '280px',
  },
  dropdownSelect: {
    width: '100%',
    padding: '10px 40px 10px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    appearance: 'none',
    outline: 'none',
  },
  rightSection: {
    display: 'flex',
    alignItems:  'center',
    gap:  '12px',
  },
  outlineBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    cursor: 'pointer',
  },
  contentArea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '16px',
  },
  contentPlaceholder: {
    marginTop: '10px',
  },
  emptyState: {
    padding: '60px',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  }
};

export default TaskHeader;