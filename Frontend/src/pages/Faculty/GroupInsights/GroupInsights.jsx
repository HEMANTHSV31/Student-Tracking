import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../../../utils/api';
import AttendanceView from './AttendanceView/AttendanceView';
import SkillProficiencyView from './SkillProficiencyView/SkillProficiencyView';
import useAuthStore from '../../../store/useAuthStore';
import axios from 'axios';
import { MapPin, BarChart3, Calendar } from 'lucide-react';
import YearSelector from '../../../components/YearSelector/YearSelector';

const API_URL = import.meta.env.VITE_API_URL;

const GroupInsights = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get URL parameters
  const urlVenue = searchParams.get('venue');
  const urlSkill = searchParams.get('skill');
  const urlTab = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(urlTab === 'skills' ? 'skills' : 'attendance');
  const [selectedVenue, setSelectedVenue] = useState(urlVenue || '');
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState(urlSkill || '');
  
  // Date picker state for attendance
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('');
  
  // Year filter state
  const [selectedYear, setSelectedYear] = useState('');

  // Fetch venues based on role (admin sees all, faculty sees only assigned)
  useEffect(() => {
    const fetchVenues = async () => {
      if (!user) return;
      
      setVenuesLoading(true);
      try {
        // Use different endpoint based on user role
        const endpoint = user?.role === 'admin' 
          ? '/groups/venues'
          : '/skill-reports/faculty/venues';
        
        const response = await apiGet(endpoint);
        const responseData = await response.json();
        
        // Handle different response structures
        const venueList = user?.role === 'admin'
          ? responseData.data || []
          : responseData.venues || [];
        
        setVenues(venueList);
        
        // Auto-select first venue for faculty if they have only one
        if (user?.role === 'faculty' && venueList.length === 1) {
          setSelectedVenue(venueList[0].venue_id.toString());
        }
      } catch (err) {
        console.error('Error fetching venues:', err);
      } finally {
        setVenuesLoading(false);
      }
    };
    
    fetchVenues();
  }, [user?.role]);

  // Clear URL parameters after initial load
  useEffect(() => {
    if (urlVenue || urlSkill || urlTab) {
      // Clear the search params after they've been used
      const timer = setTimeout(() => {
        setSearchParams({});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [urlVenue, urlSkill, urlTab, setSearchParams]);

  // Get venue name for display
  const selectedVenueName = selectedVenue === 'all'
    ? 'All Venues'
    : selectedVenue 
      ? venues.find(v => v.venue_id.toString() === selectedVenue)?.venue_name || 'Unknown Venue'
      : '';

  // Get faculty name for the selected venue
  const selectedFacultyName = selectedVenue === 'all'
    ? null
    : selectedVenue
      ? venues.find(v => v.venue_id.toString() === selectedVenue)?.faculty_name || null
      : null;

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          {/* Venue Selector */}
          <div style={styles.headerFilterGroup}>
            <label style={styles.headerLabel}>
              {user?.role === 'admin' ? 'Select Venue' : 'Your Venue'}
            </label>
            <select 
              style={styles.headerSelect} 
              value={selectedVenue} 
              onChange={(e) => setSelectedVenue(e.target.value)}
              disabled={venuesLoading}
            >
              <option value="">
                {venuesLoading ? 'Loading venues...' : '-- Select a Venue --'}
              </option>
              {user?.role === 'admin' && (
                <option value="all">All Venues</option>
              )}
              {venues.map((venue) => (
                <option key={venue.venue_id} value={venue.venue_id}>
                  {venue.venue_name}
                </option>
              ))}
            </select>
          </div>

          {/* Show selected venue name badge
          {selectedVenueName && (
            <div style={styles.venueBadge}>
              <MapPin size={16} style={{ marginRight: '6px' }} />
              {selectedVenueName}
            </div>
          )} */}
        </div>

        <div style={styles.topBarTabs}>
          <button 
            style={activeTab === 'attendance' ? styles.topTabActive : styles.topTab}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
          <button 
            style={activeTab === 'skills' ? styles.topTabActive : styles.topTab}
            onClick={() => setActiveTab('skills')}
          >
            Skill Proficiency
          </button>
        </div>
        
        {/* Year Selector */}
        <div style={styles.yearSelectWrapper}>
          <YearSelector
            value={selectedYear}
            onChange={setSelectedYear}
            showLabel={false}
            compact={true}
          />
          {selectedYear && (
            <span style={styles.yearBadge}>
              <Calendar size={14} style={{ marginRight: '4px' }} />
              Year {selectedYear}
            </span>
          )}
        </div>
      </div>

      <div style={styles.contentContainer}>
        {!selectedVenue ? (
          <div style={styles.noVenueMessage}>
            <div style={styles.noVenueIcon}>
              <BarChart3 size={64} />
            </div>
            <h3 style={styles.noVenueTitle}>Select a Venue to View Insights</h3>
            <p style={styles.noVenueText}>
              {user?.role === 'admin' 
                ? 'Choose a venue from the dropdown above to view attendance and skill proficiency data.'
                : 'Select your assigned venue from the dropdown to view insights.'}
            </p>
          </div>
        ) : activeTab === 'attendance' ? (
          <AttendanceView 
            selectedVenue={selectedVenue}
            selectedVenueName={selectedVenueName}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedSession={selectedSession}
            setSelectedSession={setSelectedSession}
            userRole={user?.role}
            selectedYear={selectedYear}
          />
        ) : (
          <SkillProficiencyView 
            selectedVenue={selectedVenue}
            selectedVenueName={selectedVenueName}
            facultyName={selectedFacultyName}
            initialSkill={selectedSkill}
            userRole={user?.role}
            selectedYear={selectedYear}
          />
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 0,
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: '12px',
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerFilterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  headerSelect: {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    backgroundColor: '#fff',
    minWidth: '250px',
    cursor: 'pointer',
  },
  venueBadge: {
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid #bfdbfe',
    display: 'flex',
    alignItems: 'center',
  },
  topBarTabs: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  topTab: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  topTabActive: {
    padding: '8px 16px',
    border: 'none',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
  },
  contentContainer: {
    padding: '12px 16px 24px 16px',
    flex: 1,
    overflowY: 'auto',
  },
  noVenueMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    marginTop: '20px',
  },
  noVenueIcon: {
    color: '#9ca3af',
    marginBottom: '16px',
  },
  noVenueTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  noVenueText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    maxWidth: '400px',
  },
  yearSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  yearBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid #bbf7d0',
  },
};

export default GroupInsights;