import React from 'react';
import { CalendarMonth } from '@mui/icons-material';

// Utility function to calculate academic years
export const getAcademicYears = () => {
  // Returns years 1-4 for typical college structure
  // You can modify this based on your college structure
  return [
    { value: '', label: 'All Years' },
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' }
  ];
};

const YearSelector = ({ 
  selectedYear, 
  onYearChange, 
  label = 'Academic Year',
  disabled = false,
  showAllOption = true,
  compact = false,
  style = {}
}) => {
  const years = getAcademicYears();
  const displayYears = showAllOption ? years : years.filter(y => y.value !== '');

  const containerStyle = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    gap: compact ? '8px' : '4px',
    alignItems: compact ? 'center' : 'flex-start',
    ...style
  };

  const labelStyle = {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const selectStyle = {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1f2937',
    outline: 'none',
    backgroundColor: disabled ? '#f3f4f6' : '#fff',
    minWidth: compact ? '120px' : '150px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const iconContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  return (
    <div style={containerStyle}>
      {!compact && <label style={labelStyle}>{label}</label>}
      <div style={iconContainerStyle}>
        <CalendarMonth sx={{ fontSize: 18, color: '#6b7280' }} />
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          style={selectStyle}
          disabled={disabled}
        >
          {displayYears.map((year) => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// Badge component to display the selected year
export const YearBadge = ({ year, onClear }) => {
  if (!year) return null;

  const yearLabels = {
    '1': '1st Year',
    '2': '2nd Year',
    '3': '3rd Year',
    '4': '4th Year'
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      backgroundColor: '#dbeafe',
      color: '#1d4ed8',
      borderRadius: '16px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid #bfdbfe'
    }}>
      <CalendarMonth sx={{ fontSize: 14 }} />
      <span>{yearLabels[year] || year}</span>
      {onClear && (
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 2px',
            marginLeft: '4px',
            color: '#1d4ed8',
            fontSize: '14px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default YearSelector;
