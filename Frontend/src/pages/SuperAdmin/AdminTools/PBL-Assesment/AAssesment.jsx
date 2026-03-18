import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  BarChart3, Layers, BookOpen, MapPin, Grid3X3, Zap, CheckCircle 
} from 'lucide-react';
import { 
  fetchVenues, 
  fetchSlots, 
  fetchClusters 
} from '../../../../services/assessmentVenueApi';

import ManageSlots from './ManageSlots/ManageSlots';
import ManageVenues from './ManageVenues/ManageVenues';
import DeptClusters from './DeptClusters/DeptClusters';
import ManageCourses from './ManageCourses/ManageCourses';
import SlotAllocation from './SlotAllocation/SlotAllocation';
import Results from './Results/Results';

import './AAssesment.css';

// ══════════════════════════════════════════════════════════════════════════
//  UTILITIES (Moved from assessmentUtils.js)
// ══════════════════════════════════════════════════════════════════════════

export const normalizeCellValue = (v) => (v === null || v === undefined ? '' : String(v).trim());

export const normalizeHeaderKey = (h) => normalizeCellValue(h).toLowerCase().replace(/[^a-z0-9]/g, '');

export const padNumber = (n) => String(n).padStart(2, '0');

export const formatExcelDateValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    const p = XLSX.SSF.parse_date_code(value);
    if (p?.y && p?.m && p?.d) return `${p.y}-${padNumber(p.m)}-${padNumber(p.d)}`;
  }
  const normalized = normalizeCellValue(value).replace(/\./g, '/');
  if (!normalized) return '';
  const iso = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) return `${iso[1]}-${padNumber(iso[2])}-${padNumber(iso[3])}`;
  const dmy = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) return `${dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]}-${padNumber(dmy[2])}-${padNumber(dmy[1])}`;
  return normalized;
};

export const formatExcelTimeValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return XLSX.SSF.format('h:mm AM/PM', value).replace(/\s+/g, ' ').trim();
  return normalizeCellValue(value).replace(/\s+/g, ' ');
};

export const getFirstAvailableRawValue = (rowLookup, aliases) => {
  for (const alias of aliases) {
    const v = rowLookup[normalizeHeaderKey(alias)];
    if (v !== undefined && v !== null && normalizeCellValue(v) !== '') return v;
  }
  return '';
};

export const getFirstAvailableValue = (rowLookup, aliases) => normalizeCellValue(getFirstAvailableRawValue(rowLookup, aliases));

export const isMeaningfulStudent = (s) => Boolean(s.rollNumber || s.name || s.department || s.email);

export const getSlotTimeFromRow = (rowLookup) => {
  const direct = formatExcelTimeValue(
    getFirstAvailableRawValue(rowLookup, ['Timing', 'Slot', 'Time Slot', 'Slot Time', 'Exam Slot', 'Exam Time'])
  );
  if (direct) return direct;
  const start = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['Start Time', 'start_time', 'From Time', 'from_time']));
  const end = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['End Time', 'end_time', 'To Time', 'to_time']));
  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

export const getSlotDateFromRow = (rowLookup) => formatExcelDateValue(getFirstAvailableRawValue(rowLookup, [
  'Date', 'Exam Date', 'Assessment Date', 'Slot Date', 'Exam Day', 'date', 'slot_date', 'exam_date'
]));

export const getAvailableSlotDates = (list) => [...new Set(list.map((s) => normalizeCellValue(s.slotDate)).filter(Boolean))];

export const getAvailableSlotTimes = (list, date = '') => [...new Set(
  list
    .filter((s) => !date || normalizeCellValue(s.slotDate) === date)
    .map((s) => normalizeCellValue(s.timing))
    .filter(Boolean)
)];

export const valuesMatch = (a, b) => normalizeCellValue(a).toLowerCase() === normalizeCellValue(b).toLowerCase();

export const getColumnLabel = (index) => {
  let value = index + 1;
  let label = '';

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
};

export const getSeatLabel = (rowIndex, columnIndex) => `${getColumnLabel(columnIndex)}${rowIndex + 1}`;

export const formatDateLabel = (dateValue) => {
  if (!dateValue) return '—';
  const str = String(dateValue);
  let dateOnly = str;
  if (str.includes('T')) dateOnly = str.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
  }
  return dateValue;
};

export const normalizeDateForFilter = (dateValue) => {
  if (!dateValue) return '';
  const str = String(dateValue);
  if (str.includes('T')) return str.split('T')[0];
  return str;
};

export const formatTime12 = (timeStr) => {
  if (!timeStr) return '—';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (Number.isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
  };

export const buildSlotLabel = (date, time) => [date ? formatDateLabel(date) : '', normalizeCellValue(time)].filter(Boolean).join(' · ');

export const normalizeDepartment = (dept) => {
  if (!dept) return 'UNKNOWN';
  const n = dept.toUpperCase().trim();
  const mapping = {
    'COMPUTER SCIENCE': 'CSE', 'CS': 'CSE', 'CSE': 'CSE',
    'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
    'INFORMATION TECHNOLOGY': 'IT', 'IT': 'IT',
    'COMPUTER SCIENCE AND BUSINESS SYSTEMS': 'CSBS', 'CSBS': 'CSBS',
    'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AIDS', 'AIDS': 'AIDS', 'AD': 'AIDS',
    'AIML': 'AIML', 'AL': 'AIML',
    'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING': 'AIML',
    'ELECTRICAL': 'EEE', 'EEE': 'EEE',
    'ELECTRICAL AND ELECTRONICS': 'EEE', 'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
    'ELECTRONICS AND COMMUNICATION': 'ECE', 'EC': 'ECE', 'ECE': 'ECE',
    'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
    'ELECTRONICS AND INSTRUMENTATION': 'E&I', 'E&I': 'E&I', 'ENDI': 'E&I', 'INDUSTRIAL': 'E&I', 'EI': 'E&I',
    'ELECTRONICS AND INSTRUMENTATION ENGINEERING': 'E&I', 'EIE': 'E&I',
    'MECHANICAL': 'MECH', 'MECHANICAL ENGINEERING': 'MECH', 'MECH': 'MECH',
    'MECHATRONICS': 'MECTRONIC', 'MECHATRONICS ENGINEERING': 'MECTRONIC', 'MECTRONIC': 'MECTRONIC',
    'AGRICULTURE': 'AGRI', 'AGRICULTURAL ENGINEERING': 'AGRI', 'AGRI': 'AGRI',
    'BIOTECHNOLOGY': 'BIOTECH', 'BIO TECHNOLOGY': 'BIOTECH', 'BIOTECH': 'BIOTECH',
    'CIVIL': 'CIVIL', 'BME': 'BME', 'FT': 'FT'
  };
  if (mapping[n]) return mapping[n];
  if (/ARTIFI.*INTELLIGENCE.*DATA\s*SCIENCE/i.test(n)) return 'AIDS';
  if (/ARTIFI.*INTELLIGENCE.*MACHINE\s*LEARN/i.test(n)) return 'AIML';
  if (/ARTIFI.*INTELLIGENCE/i.test(n) && /DATA/i.test(n)) return 'AIDS';
  if (/ARTIFI.*INTELLIGENCE/i.test(n) && /MACHINE/i.test(n)) return 'AIML';
  if (/ARTIFI.*INTELLIGENCE/i.test(n)) return 'AIDS';
  return n;
};

export const getDepartmentColor = (dept) => {
  const colors = {
    'CSE': '#3B82F6', 'IT': '#60A5FA', 'AIDS': '#93C5FD', 'AIML': '#BFDBFE', 'CSBS': '#818CF8',
    'ECE': '#FCD34D', 'EEE': '#FDE68A', 'E&I': '#FEF3C7', 'MECH': '#34D399',
    'MECTRONIC': '#6EE7B7', 
    'AGRI': '#A7F3D0', 'BIOTECH': '#D1FAE5', 'CIVIL': '#F472B6', 'BME': '#FBCFE8', 'FT': '#FDA4AF',
    'UNKNOWN': '#E5E7EB',
  };
  return colors[dept] || '#C4B5FD';
};

export const getDepartmentTextColor = (dept) => {
  const darkTextDepts = [
    'AIDS', 'AIML', 'ECE', 'EEE', 'E&I', 'AGRI', 'BIOTECH', 
    'UNKNOWN', 'MECTRONIC', 'BME', 'FT'
  ];
  return darkTextDepts.includes(dept) ? '#1e293b' : '#ffffff';
};

export const getDeptSummary = (seatMap) => {
  const counts = {};
  if (!seatMap) return [];
  seatMap.forEach(row => {
    row.forEach(seat => {
      if (seat && (seat.normalizedDept || seat.department)) {
        const dept = normalizeDepartment(seat.normalizedDept || seat.department);
        counts[dept] = (counts[dept] || 0) + 1;
      }
    });
  });
  return Object.entries(counts)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count);
};

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const getColumnCluster = (colIdx, pattern) => pattern === 'CS_FIRST'
  ? (colIdx % 2 === 0 ? 'CS' : 'CORE')
  : (colIdx % 2 === 0 ? 'CORE' : 'CS');

export const allocateSeats = (studentList, venuesToUse, csCluster, coreCluster, columnPattern) => {
  if (!studentList?.length) {
    alert('No students to allocate!');
    return null;
  }
  if (!venuesToUse.length) {
    alert('No venues available! Please add venues in the Venues tab first.');
    return null;
  }
  const totalCapacity = venuesToUse.reduce((sum, v) => sum + v.total_capacity, 0);
  if (studentList.length > totalCapacity) {
    alert(`Capacity exceeded!\nMax: ${totalCapacity}  |  Students: ${studentList.length}`);
    return null;
  }

  const tagged = studentList.map((s) => ({
    ...s,
    normalizedDept: normalizeDepartment(s.department),
  }));

  const byDept = {};
  tagged.forEach((s) => {
    if (!byDept[s.normalizedDept]) byDept[s.normalizedDept] = [];
    byDept[s.normalizedDept].push(s);
  });
  Object.keys(byDept).forEach((d) => {
    byDept[d] = shuffle(byDept[d]);
  });

  const csQueue = [];
  csCluster.forEach((d) => {
    if (byDept[d]) csQueue.push(...byDept[d]);
  });

  const coreQueue = [];
  coreCluster.forEach((d) => {
    if (byDept[d]) coreQueue.push(...byDept[d]);
  });

  Object.keys(byDept).forEach((d) => {
    if (!csCluster.includes(d) && !coreCluster.includes(d)) {
      (csQueue.length <= coreQueue.length ? csQueue : coreQueue).push(...byDept[d]);
    }
  });

  let csIdx = 0, coreIdx = 0;
  const newAllocations = {};

  for (const venue of venuesToUse) {
    const ROWS = venue.rows_count;
    const COLS = venue.columns_count;
    const map = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    for (let col = 0; col < COLS; col++) {
      const cluster = getColumnCluster(col, columnPattern);
      for (let row = 0; row < ROWS; row++) {
        let student = null;
        if (cluster === 'CS' && csIdx < csQueue.length) student = csQueue[csIdx++];
        if (cluster === 'CORE' && coreIdx < coreQueue.length) student = coreQueue[coreIdx++];
        if (student) {
          map[row][col] = {
            ...student,
            seatNumber: getSeatLabel(row, col),
            row: row + 1,
            col: col + 1,
            venue: venue.venue_name,
            columnCluster: cluster,
          };
        }
      }
    }

    const vs = map.flat().filter(Boolean);
    const deptCounts = {};
    vs.forEach((s) => {
      deptCounts[s.normalizedDept] = (deptCounts[s.normalizedDept] || 0) + 1;
    });

    newAllocations[venue.venue_name] = {
      seatMap: map,
      rows: ROWS,
      columns: COLS,
      students: vs,
      stats: {
        totalStudents: vs.length,
        csClusterCount: vs.filter((s) => csCluster.includes(s.normalizedDept)).length,
        coreClusterCount: vs.filter((s) => coreCluster.includes(s.normalizedDept)).length,
        otherCount: vs.filter((s) => !csCluster.includes(s.normalizedDept) && !coreCluster.includes(s.normalizedDept)).length,
        departmentBreakdown: deptCounts,
        seatsOccupied: vs.length,
        seatsEmpty: venue.total_capacity - vs.length,
      },
    };
  }

  const allStudents = Object.values(newAllocations).flatMap((a) => a.students);
  const overallDeptCounts = {};
  allStudents.forEach((s) => {
    overallDeptCounts[s.normalizedDept] = (overallDeptCounts[s.normalizedDept] || 0) + 1;
  });

  return {
    venueAllocations: newAllocations,
    overallStats: {
      totalStudents: allStudents.length,
      venuesUsed: venuesToUse.length,
      venues: venuesToUse.map((v) => v.venue_name),
      csClusterCount: allStudents.filter((s) => csCluster.includes(s.normalizedDept)).length,
      coreClusterCount: allStudents.filter((s) => coreCluster.includes(s.normalizedDept)).length,
      otherCount: allStudents.filter((s) => !csCluster.includes(s.normalizedDept) && !coreCluster.includes(s.normalizedDept)).length,
      departmentBreakdown: overallDeptCounts,
    },
  };
};

// ══════════════════════════════════════════════════════════════════════════
//  END UTILITIES
// ══════════════════════════════════════════════════════════════════════════

const utils = {
  normalizeCellValue, normalizeHeaderKey, padNumber, formatExcelDateValue,
  formatExcelTimeValue, getFirstAvailableRawValue, getFirstAvailableValue,
  isMeaningfulStudent, getSlotTimeFromRow, getSlotDateFromRow, getAvailableSlotDates,
  getAvailableSlotTimes, valuesMatch, getColumnLabel, getSeatLabel, formatDateLabel,
  normalizeDateForFilter, formatTime12, buildSlotLabel, normalizeDepartment,
  getDepartmentColor, getDepartmentTextColor, getDeptSummary, shuffle,
  getColumnCluster, allocateSeats
};

const AAssesment = () => {
  const navigate = useNavigate();

  // ── Tab State ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('slots');

  // ── Shared Data State ────────────────────────────────────────────────────
  const [venues, setVenues] = useState([]);
  const [slots, setSlots] = useState([]);
  const [clusterData, setClusterData] = useState([]);
  
  // Loading states
  const [slotLoading, setSlotLoading] = useState(false);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [venueLoading, setVenueLoading] = useState(false);

  // ── Allocation Process State ─────────────────────────────────────────────
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [venueAllocations, setVenueAllocations] = useState({});
  const [overallStats, setOverallStats] = useState(null);
  const [resultSlotDate, setResultSlotDate] = useState('');
  const [resultSlotTime, setResultSlotTime] = useState('');

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadVenues = useCallback(async () => {
    setVenueLoading(true);
    try {
      const res = await fetchVenues();
      if (res.success) setVenues(res.data || []);
    } catch (err) { console.error(err); }
    finally { setVenueLoading(false); }
  }, []);

  const loadSlots = useCallback(async () => {
    setSlotLoading(true);
    try {
      const res = await fetchSlots();
      if (res.success) setSlots(res.data || []);
    } catch (err) { console.error(err); }
    finally { setSlotLoading(false); }
  }, []);

  const loadClusters = useCallback(async () => {
    setClusterLoading(true);
    try {
      const res = await fetchClusters();
      if (res.success) setClusterData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setClusterLoading(false); }
  }, []);

  // Initial Load
  useEffect(() => {
    loadSlots();
    loadVenues();
    loadClusters();
  }, [loadSlots, loadVenues, loadClusters]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNavigateToAllocate = (slot) => {
    setSelectedSlot(slot);
    setActiveTab('allocate');
  };

  const handleNavigateToResults = (slot, allocationData) => {
    setSelectedSlot(slot);
    if (allocationData) {
      // Backend returns snake_case keys (allocation_data, overall_stats)
      // Frontend internal state uses camelCase (venueAllocations, overallStats)
      // We must handle both possibilities depending on where allocationData comes from.
      
      const vAlloc = allocationData.allocation_data || allocationData.venueAllocations || {};
      const oStats = allocationData.overall_stats || allocationData.overallStats || {};
      
      setVenueAllocations(vAlloc);
      setOverallStats(oStats);

      // Use the slot details for display if we have them
      setResultSlotDate(slot.slot_date); 
      setResultSlotTime(`${slot.start_time} - ${slot.end_time}`);
    }
    setActiveTab('results');
  };

  const handleAllocationComplete = (result) => {
    setVenueAllocations(result.venueAllocations);
    setOverallStats(result.overallStats);
    setResultSlotDate(result.slotDate);
    setResultSlotTime(result.slotTime);
    setActiveTab('results');
    // Refresh slots to start showing 'Allocated' status if backend updated it
    loadSlots();
  };

  const handleMenuClick = (tabId) => {
    setActiveTab(tabId);
    // If navigating away from process tabs, we might want to reset selectedSlot?
    // For now, keep state to allow switching back unless explicit reset.
  };

  // ── Render Helpers ───────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'slots':
        return (
          <ManageSlots 
            slots={slots} 
            loading={slotLoading} 
            onRefresh={loadSlots}
            onNavigateToAllocate={handleNavigateToAllocate}
            onNavigateToResults={handleNavigateToResults}
            venues={venues}
            utils={utils}
          />
        );
      case 'courses':
        return <ManageCourses />;
      case 'clusters':
        return (
          <DeptClusters 
            clusterData={clusterData} 
            loading={clusterLoading} 
            onRefresh={loadClusters} 
            utils={utils}
          />
        );
      case 'venues':
        return (
          <ManageVenues 
            onVenuesLoaded={setVenues} // Keep parent venue state in sync if managed internally
            utils={utils}
          />
        );
      case 'allocate':
        return (
          <SlotAllocation 
            selectedSlot={selectedSlot} 
            venues={venues} 
            clusterData={clusterData}
            onBackToSlots={() => setActiveTab('slots')}
            onAllocationComplete={handleAllocationComplete}
            utils={utils}
          />
        );
      case 'results':
        return (
          <Results 
            venueAllocations={venueAllocations}
            overallStats={overallStats}
            selectedSlot={selectedSlot}
            venues={venues}
            selectedSlotDate={resultSlotDate}
            slotTime={resultSlotTime}
            utils={utils}
          />
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  const menuItems = [
    { id: 'slots', label: 'Manage Slots', icon: <Grid3X3 size={18} /> },
    { id: 'courses', label: 'Manage Courses', icon: <BookOpen size={18} /> },
    { id: 'clusters', label: 'Dept Clusters', icon: <Layers size={18} /> },
    { id: 'venues', label: 'Manage Venues', icon: <MapPin size={18} /> },
  ];

  return (
    <div className="aa-layout">
      {/* Sidebar */}
      <aside className="aa-sidebar">
        <div className="aa-sidebar-header">
          <BarChart3 className="aa-brand-icon" />
          <h2>Assessment</h2>
        </div>
        <nav className="aa-nav-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`aa-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          
          {/* Dynamic Process Tabs */}
          {activeTab === 'allocate' && (
            <button className="aa-nav-item active process-tab">
              <Zap size={18} />
              <span>Allocate Seats</span>
            </button>
          )}
          {activeTab === 'results' && (
            <button className="aa-nav-item active process-tab">
              <CheckCircle size={18} />
              <span>Results</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="aa-main-content">
        <header className="aa-content-header">
          <h1>
            {menuItems.find(i => i.id === activeTab)?.label || 
             (activeTab === 'allocate' ? 'Seat Allocation' : 
              activeTab === 'results' ? 'Allocation Results' : 'Dashboard')}
          </h1>
        </header>
        <div className="aa-content-body">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AAssesment;