import React from 'react';
import DescriptionIcon from '@mui/icons-material/Description';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const ReportsHeader = ({
  venues,
  venuesLoading,
  selectedVenueId,
  handleVenueChange,
  tasks,
  tasksLoading,
  selectedTaskId,
  handleTaskChange,
  selectedTaskTitle,
  handleExport
}) => {
  return (
    <div style={styles.stickyHeader}>
      <div style={styles.headerContainer}>
        <div style={styles.leftSection}>
          <div style={styles.dropdownContainer}>
            {venuesLoading ? (
              <select disabled style={styles.dropdownSelect}>
                <option>Loading venues...</option>
              </select>
            ) : venues.length > 0 ? (
              <>
                <select 
                  value={selectedVenueId} 
                  onChange={handleVenueChange}
                  style={styles.dropdownSelect}
                >
                  {venues.map((venue) => (
                    <option key={venue.venue_id} value={venue.venue_id}>
                      {venue.venue_name} ({venue.student_count} students)
                    </option>
                  ))}
                </select>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.dropdownIcon}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </>
            ) : (
              <select disabled style={styles.dropdownSelect}>
                <option>No venues available</option>
              </select>
            )}
          </div>

          <div style={styles.dropdownContainer}>
            {tasksLoading ? (
              <select disabled style={styles.dropdownSelect}>
                <option>Loading tasks...</option>
              </select>
            ) : tasks.length > 0 ? (
              <>
                <select 
                  value={selectedTaskId} 
                  onChange={handleTaskChange}
                  style={styles.dropdownSelect}
                >
                  {tasks.map((task) => (
                    <option key={task.task_id} value={task.task_id}>
                      {task.title}
                    </option>
                  ))}
                </select>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.dropdownIcon}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </>
            ) : (
              <select disabled style={styles.dropdownSelect}>
                <option>No tasks available</option>
              </select>
            )}
          </div>
        </div>

        <div style={styles.rightSection}>
          {selectedTaskTitle && (
            <div style={styles.taskTitle}>
              <DescriptionIcon sx={{ fontSize: 20, color: '#64748b' }} />
              {selectedTaskTitle}
            </div>
          )}

          <button style={styles.outlineBtn} onClick={handleExport}>
            <FileDownloadIcon sx={{ fontSize: 20 }} />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  stickyHeader: {
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 20px',
    margin: 0,
    boxSizing: 'border-box',
  },
  headerContainer: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    margin: 0,
    padding: 0,
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  dropdownContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: '250px',
    flex: '1 0 auto',
  },
  dropdownSelect: {
    width: '100%',
    padding: '12px 40px 12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    appearance: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropdownIcon: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
  },
  taskTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    padding: '8px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '300px',
  },
  outlineBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
};

export default ReportsHeader;