import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, MapPin, Users, Building2, Download,
  Printer, RotateCcw, Clock, Hash, CheckCircle,
  BarChart3, Layers, Grid3X3, ArrowLeft,
  BookOpen, Info, Plus, Trash2,
  ChevronUp, ChevronDown, X, AlertTriangle, Edit3,
  Save, Calendar, Eye, Zap, Shield,
  Monitor, RefreshCw, CircleDot, Search, MoreVertical
} from 'lucide-react';
import {
  fetchVenues, createVenue, updateVenue, deleteVenue as deleteVenueApi,
  fetchSlots, createSlot, deleteSlot as deleteSlotApi,
  fetchClusters, updateCluster as updateClusterApi, deleteClusterYear as deleteClusterYearApi
} from '../../../../services/assessmentVenueApi';
import './AAssesment.css';

const AAssesment = () => {
  // ── Navigation State ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('allocate'); // 'venues' | 'allocate' | 'results'

  // ── Venue State (from backend) ───────────────────────────────────────────
  const [venues, setVenues] = useState([]);
  const [venueLoading, setVenueLoading] = useState(true);
  const [venueError, setVenueError] = useState('');
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({ venue_name: '', rows_count: 6, columns_count: 6 });
  const [venueSearch, setVenueSearch] = useState('');
  const [venueActionMenu, setVenueActionMenu] = useState(null);

  // ── Slot State (from backend) ────────────────────────────────────────────
  const [slots, setSlots] = useState([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ slot_date: '', start_time: '', end_time: '', slot_label: '', subject_code: '', year: 1 });
  const [slotWarning, setSlotWarning] = useState('');
  const [slotSearch, setSlotSearch] = useState('');

  // ── Allocation State ─────────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [selectedSlotDate, setSelectedSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [venueAllocations, setVenueAllocations] = useState({});
  const [activeVenue, setActiveVenue] = useState('');
  const [overallStats, setOverallStats] = useState(null);

  // ── Cluster Config ───────────────────────────────────────────────────────
  const [columnPattern, setColumnPattern] = useState('CS_FIRST');
  const [csOrder, setCsOrder] = useState(['CSE', 'IT', 'AIDS', 'AIML', 'CSBS']);
  const [coreOrder, setCoreOrder] = useState(['ECE', 'EEE', 'E&I', 'MECH', 'MECTRONIC', 'AGRI', 'BIOTECH']);
  const [newCsDept, setNewCsDept] = useState('');
  const [newCoreDept, setNewCoreDept] = useState('');

  const CS_CLUSTER = csOrder;
  const CORE_CLUSTER = coreOrder;

  // ── Cluster Management (year-wise) ───────────────────────────────────────
  const [clusterData, setClusterData] = useState([]);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterActiveYear, setClusterActiveYear] = useState(1);
  const [clusterEditCS, setClusterEditCS] = useState([]);
  const [clusterEditCore, setClusterEditCore] = useState([]);
  const [clusterEditPattern, setClusterEditPattern] = useState('CS_FIRST');
  const [clusterNewCsDept, setClusterNewCsDept] = useState('');
  const [clusterNewCoreDept, setClusterNewCoreDept] = useState('');
  const [clusterSaving, setClusterSaving] = useState(false);
  const [clusterSaveMsg, setClusterSaveMsg] = useState('');
  const [allocYear, setAllocYear] = useState(2);

  // ── Load venues + slots from backend ─────────────────────────────────────
  const loadVenues = useCallback(async () => {
    setVenueLoading(true);
    try {
      const res = await fetchVenues();
      if (res.success) setVenues(res.data || []);
      else setVenueError(res.message || 'Failed to load venues');
    } catch {
      setVenueError('Failed to connect to server');
    } finally {
      setVenueLoading(false);
    }
  }, []);

  const loadSlots = useCallback(async () => {
    setSlotLoading(true);
    try {
      const res = await fetchSlots();
      if (res.success) setSlots(res.data || []);
    } catch (error) {
      console.error('Failed to load slots:', error);
    } finally {
      setSlotLoading(false);
    }
  }, []);

  const loadClusters = useCallback(async () => {
    setClusterLoading(true);
    try {
      const res = await fetchClusters();
      if (res.success) setClusterData(res.data || []);
    } catch (error) {
      console.error('Failed to load clusters:', error);
    } finally {
      setClusterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
    loadSlots();
    loadClusters();
  }, [loadVenues, loadSlots, loadClusters]);

  // ── Derived from selected venues ─────────────────────────────────────────
  const selectedVenues = venues.filter((v) => selectedVenueIds.includes(v.id));
  const TOTAL_CAPACITY = selectedVenues.reduce((s, v) => s + v.total_capacity, 0);

  // ── Utility Helpers ──────────────────────────────────────────────────────
  const normalizeCellValue = (v) => (v === null || v === undefined ? '' : String(v).trim());

  const normalizeHeaderKey = (h) => normalizeCellValue(h).toLowerCase().replace(/[^a-z0-9]/g, '');

  const padNumber = (n) => String(n).padStart(2, '0');

  const formatExcelDateValue = (value) => {
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

  const formatExcelTimeValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return XLSX.SSF.format('h:mm AM/PM', value).replace(/\s+/g, ' ').trim();
    return normalizeCellValue(value).replace(/\s+/g, ' ');
  };

  const getFirstAvailableRawValue = (rowLookup, aliases) => {
    for (const alias of aliases) {
      const v = rowLookup[normalizeHeaderKey(alias)];
      if (v !== undefined && v !== null && normalizeCellValue(v) !== '') return v;
    }
    return '';
  };

  const getFirstAvailableValue = (rowLookup, aliases) => normalizeCellValue(getFirstAvailableRawValue(rowLookup, aliases));

  const isMeaningfulStudent = (s) => Boolean(s.rollNumber || s.name || s.department || s.email);

  const getSlotTimeFromRow = (rowLookup) => {
    const direct = formatExcelTimeValue(
      getFirstAvailableRawValue(rowLookup, ['Timing', 'Slot', 'Time Slot', 'Slot Time', 'Exam Slot', 'Exam Time'])
    );
    if (direct) return direct;
    const start = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['Start Time', 'start_time', 'From Time', 'from_time']));
    const end = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['End Time', 'end_time', 'To Time', 'to_time']));
    if (start && end) return `${start} - ${end}`;
    return start || end || '';
  };

  const getSlotDateFromRow = (rowLookup) => formatExcelDateValue(getFirstAvailableRawValue(rowLookup, [
    'Date', 'Exam Date', 'Assessment Date', 'Slot Date', 'Exam Day', 'date', 'slot_date', 'exam_date'
  ]));

  const getAvailableSlotDates = (list) => [...new Set(list.map((s) => normalizeCellValue(s.slotDate)).filter(Boolean))];

  const getAvailableSlotTimes = (list, date = '') => [...new Set(
    list
      .filter((s) => !date || normalizeCellValue(s.slotDate) === date)
      .map((s) => normalizeCellValue(s.timing))
      .filter(Boolean)
  )];

  const valuesMatch = (a, b) => normalizeCellValue(a).toLowerCase() === normalizeCellValue(b).toLowerCase();

  const formatDateLabel = (dateValue) => {
    if (!dateValue) return '—';
    const str = String(dateValue);
    let dateOnly = str;
    if (str.includes('T')) dateOnly = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const d = new Date(`${dateOnly}T00:00:00`);
      if (!Number.isNaN(d.getTime()))
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateValue;
  };

  const formatTime12 = (timeStr) => {
    if (!timeStr) return '—';
    const parts = String(timeStr).split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (Number.isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const buildSlotLabel = (date, time) => [date ? formatDateLabel(date) : '', normalizeCellValue(time)].filter(Boolean).join(' · ');

  const normalizeDepartment = (dept) => {
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
      'MECHANICAL': 'MECH', 'MECHANICAL ENGINEERING': 'MECH', 'MECH': 'MECH',
      'MECHATRONICS': 'MECTRONIC', 'MECHATRONICS ENGINEERING': 'MECTRONIC', 'MECTRONIC': 'MECTRONIC',
      'AGRICULTURE': 'AGRI', 'AGRICULTURAL ENGINEERING': 'AGRI', 'AGRI': 'AGRI',
      'BIOTECHNOLOGY': 'BIOTECH', 'BIO TECHNOLOGY': 'BIOTECH', 'BIOTECH': 'BIOTECH',
    };
    if (mapping[n]) return mapping[n];
    if (/ARTIFI.*INTELLIGENCE.*DATA\s*SCIENCE/i.test(n)) return 'AIDS';
    if (/ARTIFI.*INTELLIGENCE.*MACHINE\s*LEARN/i.test(n)) return 'AIML';
    if (/ARTIFI.*INTELLIGENCE/i.test(n) && /DATA/i.test(n)) return 'AIDS';
    if (/ARTIFI.*INTELLIGENCE/i.test(n) && /MACHINE/i.test(n)) return 'AIML';
    if (/ARTIFI.*INTELLIGENCE/i.test(n)) return 'AIDS';
    return n;
  };

  const getDepartmentColor = (dept) => {
    const colors = {
      'CSE': '#3B82F6', 'IT': '#60A5FA', 'AIDS': '#93C5FD', 'AIML': '#BFDBFE', 'CSBS': '#818CF8',
      'ECE': '#FCD34D', 'EEE': '#FDE68A', 'E&I': '#FEF3C7', 'MECH': '#34D399',
      'MECTRONIC': '#6EE7B7', 'AGRI': '#A7F3D0', 'BIOTECH': '#D1FAE5', 'UNKNOWN': '#E5E7EB',
    };
    return colors[dept] || '#C4B5FD';
  };

  const byDeptCount = (dept) => students.filter((s) => normalizeDepartment(s.department) === dept).length;

  // ── Venue CRUD Handlers ──────────────────────────────────────────────────
  const handleSaveVenue = async () => {
    const { venue_name, rows_count, columns_count } = venueForm;
    if (!venue_name.trim() || !rows_count || !columns_count) {
      alert('All fields are required!');
      return;
    }
    try {
      let res;
      if (editingVenue) {
        res = await updateVenue(editingVenue.id, venueForm);
      } else {
        res = await createVenue(venueForm);
      }
      if (res.success) {
        setShowVenueForm(false);
        setEditingVenue(null);
        setVenueForm({ venue_name: '', rows_count: 6, columns_count: 6 });
        loadVenues();
      } else {
        alert(res.message || 'Failed to save venue');
      }
    } catch {
      alert('Server error saving venue');
    }
  };

  const handleDeleteVenue = async (id) => {
    if (!window.confirm('Delete this venue? This cannot be undone.')) return;
    try {
      const res = await deleteVenueApi(id);
      if (res.success) loadVenues();
      else alert(res.message || 'Failed to delete venue');
    } catch {
      alert('Server error deleting venue');
    }
  };

  const openEditVenue = (v) => {
    setEditingVenue(v);
    setVenueForm({ venue_name: v.venue_name, rows_count: v.rows_count, columns_count: v.columns_count });
    setShowVenueForm(true);
  };

  // ── Slot CRUD Handlers ───────────────────────────────────────────────────
  const handleSaveSlot = async () => {
    const { slot_date, start_time, end_time } = slotForm;
    if (!slot_date || !start_time || !end_time) {
      alert('Date, start time and end time are required!');
      return;
    }
    try {
      const res = await createSlot(slotForm);
      if (res.success) {
        setShowSlotForm(false);
        setSlotForm({ slot_date: '', start_time: '', end_time: '', slot_label: '', subject_code: '', year: 1 });
        setSlotWarning('');
        loadSlots();
      } else {
        if (res.message?.includes('already exists')) {
          setSlotWarning(res.message);
        } else {
          alert(res.message || 'Failed to create slot');
        }
      }
    } catch {
      alert('Server error creating slot');
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      const res = await deleteSlotApi(id);
      if (res.success) loadSlots();
      else alert(res.message || 'Failed to delete slot');
    } catch {
      alert('Server error deleting slot');
    }
  };

  // ── Config Helpers ───────────────────────────────────────────────────────
  const moveDeptInOrder = (order, setOrder, idx, dir) => {
    const arr = [...order];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setOrder(arr);
  };

  const addDeptToCluster = (order, setOrder, newDept, clearFn) => {
    const d = newDept.trim().toUpperCase();
    if (!d) return;
    if (csOrder.includes(d) || coreOrder.includes(d)) {
      alert(`"${d}" already belongs to a cluster!`);
      return;
    }
    setOrder([...order, d]);
    clearFn('');
  };

  const removeDeptFromCluster = (order, setOrder, idx) => setOrder(order.filter((_, i) => i !== idx));

  const getColumnCluster = (colIdx) => columnPattern === 'CS_FIRST'
    ? (colIdx % 2 === 0 ? 'CS' : 'CORE')
    : (colIdx % 2 === 0 ? 'CORE' : 'CS');

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const allocateSeats = (studentList) => {
    if (!studentList?.length) {
      alert('No students to allocate!');
      return null;
    }
    if (!selectedVenues.length) {
      alert('Please select at least one venue!');
      return null;
    }
    if (studentList.length > TOTAL_CAPACITY) {
      alert(`Capacity exceeded!\nMax: ${TOTAL_CAPACITY}  |  Students: ${studentList.length}`);
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
    CS_CLUSTER.forEach((d) => {
      if (byDept[d]) csQueue.push(...byDept[d]);
    });

    const coreQueue = [];
    CORE_CLUSTER.forEach((d) => {
      if (byDept[d]) coreQueue.push(...byDept[d]);
    });

    Object.keys(byDept).forEach((d) => {
      if (!CS_CLUSTER.includes(d) && !CORE_CLUSTER.includes(d)) {
        (csQueue.length <= coreQueue.length ? csQueue : coreQueue).push(...byDept[d]);
      }
    });

    let csIdx = 0, coreIdx = 0;
    const newAllocations = {};

    for (const venue of selectedVenues) {
      const ROWS = venue.rows_count;
      const COLS = venue.columns_count;
      const map = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

      for (let col = 0; col < COLS; col++) {
        const cluster = getColumnCluster(col);
        for (let row = 0; row < ROWS; row++) {
          let student = null;
          if (cluster === 'CS' && csIdx < csQueue.length) student = csQueue[csIdx++];
          if (cluster === 'CORE' && coreIdx < coreQueue.length) student = coreQueue[coreIdx++];
          if (student) {
            map[row][col] = {
              ...student,
              seatNumber: `${String.fromCharCode(65 + row)}${col + 1}`,
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
          csClusterCount: vs.filter((s) => CS_CLUSTER.includes(s.normalizedDept)).length,
          coreClusterCount: vs.filter((s) => CORE_CLUSTER.includes(s.normalizedDept)).length,
          unknownCount: vs.filter((s) => !CS_CLUSTER.includes(s.normalizedDept) && !CORE_CLUSTER.includes(s.normalizedDept)).length,
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
        venuesUsed: selectedVenues.length,
        venues: selectedVenues.map((v) => v.venue_name),
        csClusterCount: allStudents.filter((s) => CS_CLUSTER.includes(s.normalizedDept)).length,
        coreClusterCount: allStudents.filter((s) => CORE_CLUSTER.includes(s.normalizedDept)).length,
        unknownCount: allStudents.filter((s) => !CS_CLUSTER.includes(s.normalizedDept) && !CORE_CLUSTER.includes(s.normalizedDept)).length,
        departmentBreakdown: overallDeptCounts,
      },
    };
  };

  // ── File Upload ──────────────────────────────────────────────────────────
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (!jsonData.length) {
          alert('Empty file or invalid headers.');
          return;
        }

        const mapped = jsonData.map((row, index) => {
          const lookup = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeHeaderKey(k), v]));
          return {
            id: index + 1,
            rollNumber: getFirstAvailableValue(lookup, ['Roll Number', 'Roll No', 'Register Number', 'Reg No', 'RegNo', 'roll_number', 'register_number']),
            name: getFirstAvailableValue(lookup, ['Name', 'Student Name', 'student_name']),
            email: getFirstAvailableValue(lookup, ['Email', 'Email ID', 'email_id', 'mail']),
            year: getFirstAvailableValue(lookup, ['Year', 'Academic Year', 'academic_year']),
            department: getFirstAvailableValue(lookup, ['Department', 'Dept', 'department_name']),
            gender: getFirstAvailableValue(lookup, ['Gender', 'gender']),
            resident: getFirstAvailableValue(lookup, ['Resident', 'Residency', 'Hosteller', 'resident']),
            slotDate: getSlotDateFromRow(lookup),
            timing: getSlotTimeFromRow(lookup),
          };
        }).filter(isMeaningfulStudent);

        if (!mapped.length) {
          alert('No valid student rows found. Check column names.');
          return;
        }

        setStudents(mapped);
        const dates = getAvailableSlotDates(mapped);
        const defDate = dates.length === 1 ? dates[0] : '';
        const times = getAvailableSlotTimes(mapped, defDate);
        setSelectedSlotDate(defDate);
        setSlotTime(times.length === 1 ? times[0] : '');
        setVenueAllocations({});
        setOverallStats(null);

        alert(`Loaded ${mapped.length} students successfully!`);
      } catch (err) {
        console.error(err);
        alert('Error reading file. Please ensure it is a valid Excel / CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerateAllocation = () => {
    if (!students.length) {
      alert('Please upload student data first!');
      return;
    }
    if (!selectedVenues.length) {
      alert('Please select at least one venue from the Venues tab!');
      return;
    }

    const trimmedTime = slotTime.trim();
    const availDates = getAvailableSlotDates(students);
    const availTimes = getAvailableSlotTimes(students, selectedSlotDate);
    const effDate = selectedSlotDate || (availDates.length === 1 ? availDates[0] : '');
    const effTime = trimmedTime || (availTimes.length === 1 ? availTimes[0] : '');

    if (availDates.length > 1 && !selectedSlotDate) {
      alert('Please select an exam date!');
      return;
    }
    if (availTimes.length > 1 && !trimmedTime) {
      alert('Please select an exam time!');
      return;
    }

    const filtered = students.filter((s) => {
      const okDate = effDate ? valuesMatch(s.slotDate, effDate) : true;
      const okTime = effTime && availTimes.length > 0 ? valuesMatch(s.timing, effTime) : true;
      return okDate && okTime;
    });

    if (!filtered.length) {
      alert('No students found for the selected date/time.');
      return;
    }

    const result = allocateSeats(filtered);
    if (result) {
      setSelectedSlotDate(effDate);
      setSlotTime(effTime);
      setVenueAllocations(result.venueAllocations);
      setOverallStats(result.overallStats);
      setActiveVenue(Object.keys(result.venueAllocations)[0]);
      setActiveTab('results');
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (!Object.keys(venueAllocations).length) {
      alert('No allocation to export!');
      return;
    }
    const label = buildSlotLabel(selectedSlotDate, slotTime.trim()) || 'slot';
    const wb = XLSX.utils.book_new();

    Object.entries(venueAllocations).forEach(([venueName, alloc]) => {
      const rows = [];
      alloc.seatMap.forEach((row) => row.forEach((seat) => {
        if (seat) rows.push({
          Venue: venueName,
          'Seat Number': seat.seatNumber,
          Row: seat.row,
          Column: seat.col,
          'Column Cluster': seat.columnCluster,
          'Roll Number': seat.rollNumber,
          Name: seat.name,
          Email: seat.email,
          Year: seat.year,
          Department: seat.normalizedDept,
          Gender: seat.gender,
          Resident: seat.resident,
          'Exam Date': seat.slotDate || selectedSlotDate,
          Timing: seat.timing,
          'Slot Time': slotTime.trim() || seat.timing,
        });
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), venueName);
    });

    const summary = Object.entries(venueAllocations).map(([n, a]) => ({
      Venue: n,
      'Total Students': a.stats.totalStudents,
      Rows: a.rows,
      Columns: a.columns,
      'CS Cluster': a.stats.csClusterCount,
      'Core Cluster': a.stats.coreClusterCount,
      'Empty Seats': a.stats.seatsEmpty,
      'Exam Date': selectedSlotDate,
      'Slot Time': slotTime.trim(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
    XLSX.writeFile(wb, `Assessment_${label.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`);
  };

  const handlePrint = () => window.print();

  const handleReset = () => {
    if (window.confirm('Reset all data? This will clear students and allocations.')) {
      setStudents([]);
      setSelectedSlotDate('');
      setSlotTime('');
      setVenueAllocations({});
      setActiveTab('allocate');
      setActiveVenue('');
      setOverallStats(null);
    }
  };

  const slotDateOptions = getAvailableSlotDates(students);
  const slotTimeOptions = getAvailableSlotTimes(students, selectedSlotDate);
  const selectedSlotLabel = buildSlotLabel(selectedSlotDate, slotTime);

  const handleSlotDateChange = (e) => {
    const next = e.target.value;
    const nextTimes = getAvailableSlotTimes(students, next);
    setSelectedSlotDate(next);
    if (!nextTimes.includes(slotTime)) setSlotTime(nextTimes.length === 1 ? nextTimes[0] : '');
  };

  const toggleVenueSelection = (id) => {
    setSelectedVenueIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const slotsForVenue = (venueId) => slots.filter((s) => s.venue_id === venueId);
  const venueById = (id) => venues.find((v) => v.id === id);

  const clusterYears = [1, 2, 3, 4];
  const getClusterForYear = (yr, type) => clusterData.find(c => c.year === yr && c.cluster_type === type);

  useEffect(() => {
    const csRow = getClusterForYear(clusterActiveYear, 'CS');
    const coreRow = getClusterForYear(clusterActiveYear, 'Core');
    setClusterEditCS(csRow ? csRow.departments : []);
    setClusterEditCore(coreRow ? coreRow.departments : []);
    setClusterEditPattern(csRow?.column_pattern || 'CS_FIRST');
    setClusterSaveMsg('');
  }, [clusterActiveYear, clusterData]);

  const loadClustersForAllocation = useCallback((yr) => {
    const csRow = clusterData.find(c => c.year === yr && c.cluster_type === 'CS');
    const coreRow = clusterData.find(c => c.year === yr && c.cluster_type === 'Core');
    if (csRow) setCsOrder(csRow.departments);
    if (coreRow) setCoreOrder(coreRow.departments);
    if (csRow?.column_pattern) setColumnPattern(csRow.column_pattern);
  }, [clusterData]);

  useEffect(() => {
    if (clusterData.length) loadClustersForAllocation(allocYear);
  }, [allocYear, clusterData, loadClustersForAllocation]);

  const handleClusterSave = async () => {
    setClusterSaving(true);
    setClusterSaveMsg('');
    try {
      const res = await updateClusterApi(clusterActiveYear, {
        cs_departments: clusterEditCS,
        core_departments: clusterEditCore,
        column_pattern: clusterEditPattern,
      });
      if (res.success) {
        setClusterSaveMsg('Saved successfully!');
        await loadClusters();
      } else {
        setClusterSaveMsg(res.message || 'Save failed');
      }
    } catch {
      setClusterSaveMsg('Failed to save');
    } finally {
      setClusterSaving(false);
    }
  };

  const handleDeleteClusterYear = async (yr) => {
    if (!window.confirm(`Delete cluster config for Year ${yr}?`)) return;
    try {
      await deleteClusterYearApi(yr);
      await loadClusters();
    } catch {
      /* silent */
    }
  };

  const moveClusterDept = (list, setList, idx, dir) => {
    const arr = [...list];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setList(arr);
  };

  const addClusterDept = (list, setList, value, clearFn) => {
    const d = value.trim().toUpperCase();
    if (!d) return;
    if (clusterEditCS.includes(d) || clusterEditCore.includes(d)) {
      alert(`"${d}" already in a cluster!`);
      return;
    }
    setList([...list, d]);
    clearFn('');
  };

  const removeClusterDept = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));

  const tabItems = [
    { key: 'allocate', icon: Zap, label: 'Slot Allocation' },
    { key: 'slots', icon: Clock, label: 'Manage Slots' },
    { key: 'clusters', icon: Layers, label: 'Dept Clusters' },
    { key: 'venues', icon: Building2, label: 'Manage Venues' },
    { key: 'results', icon: Eye, label: 'Results', disabled: !Object.keys(venueAllocations).length },
  ];

  // Render filtered venues for table
  const filteredVenues = venues.filter(v => 
    v.venue_name?.toLowerCase().includes(venueSearch.toLowerCase())
  );

  return (
    <div className="aa-root">
      {/* ══ STICKY HEADER ═════════════════════════════════════════════════ */}
      <div className="aa-sticky-header">
        <div className="aa-header-container">
          <div className="aa-header-left-section">
            <div className="aa-toggle-container">
              {tabItems.map((t) => (
                <button
                  key={t.key}
                  className={`aa-toggle-tab ${activeTab === t.key ? 'aa-toggle-active' : ''} ${t.disabled ? 'aa-toggle-disabled' : ''}`}
                  onClick={() => !t.disabled && setActiveTab(t.key)}
                  disabled={t.disabled}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="aa-header-right-section">
            {overallStats && (
              <>
                <span className="aa-header-stat"><Users size={14} /> {overallStats.totalStudents} Students</span>
                <span className="aa-header-stat"><Building2 size={14} /> {overallStats.venuesUsed} Venues</span>
                <span className="aa-header-stat aa-header-stat-green"><CheckCircle size={14} /> Allocated</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="aa-content-area">
        {/* ══════════════════════════════════════════════════════════════════
            TAB: MANAGE VENUES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'venues' && (
          <div className="aa-venues-tab">
            <div className="aa-topbar">
              <div className="aa-search-wrap">
                <Search size={18} className="aa-search-icon" />
                <input
                  type="text"
                  placeholder="Search venues..."
                  className="aa-search-input"
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                />
              </div>
              <div className="aa-topbar-actions">
                <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => { loadVenues(); }}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button
                  className="aa-btn aa-btn-primary"
                  onClick={() => {
                    setEditingVenue(null);
                    setVenueForm({ venue_name: '', rows_count: 6, columns_count: 6 });
                    setShowVenueForm(true);
                  }}
                >
                  <Plus size={16} /> Create Venue
                </button>
              </div>
            </div>

            <div className="aa-table-card">
              {venueLoading && (
                <div className="aa-loading-overlay">
                  <RefreshCw size={20} className="aa-spin" /> Loading...
                </div>
              )}

              {venueError ? (
                <div className="aa-empty-state aa-empty-error">
                  <AlertTriangle size={32} />
                  <p>{venueError}</p>
                  <button className="aa-btn aa-btn-sm aa-btn-outline" onClick={loadVenues}>Retry</button>
                </div>
              ) : venues.length === 0 && !venueLoading ? (
                <div className="aa-empty-state">
                  <Building2 size={40} strokeWidth={1.5} />
                  <p>No venues created yet</p>
                  <p className="aa-empty-sub">Create venues that can be used during slot allocation</p>
                  <button
                    className="aa-btn aa-btn-primary"
                    onClick={() => {
                      setEditingVenue(null);
                      setVenueForm({ venue_name: '', rows_count: 6, columns_count: 6 });
                      setShowVenueForm(true);
                    }}
                  >
                    <Plus size={16} /> Create Venue
                  </button>
                </div>
              ) : (
                <div className="aa-table-wrap">
                  <table className="aa-table">
                    <thead>
                      <tr>
                        <th>Venue Name</th>
                        <th>Rows</th>
                        <th>Columns</th>
                        <th>Capacity</th>
                        <th style={{ width: 80 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVenues.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <div className="aa-venue-cell">
                              <div className="aa-venue-cell-name">{v.venue_name}</div>
                            </div>
                          </td>
                          <td>{v.rows_count}</td>
                          <td>{v.columns_count}</td>
                          <td><span className="aa-badge aa-badge-blue">{v.total_capacity}</span></td>
                          <td>
                            <div className="aa-action-cell">
                              <button
                                className="aa-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setVenueActionMenu(venueActionMenu?.id === v.id ? null : {
                                    id: v.id,
                                    x: rect.right - 180,
                                    y: rect.bottom + 4
                                  });
                                }}
                              >
                                <MoreVertical size={18} />
                              </button>
                              {venueActionMenu?.id === v.id && (
                                <>
                                  <div className="aa-menu-overlay" onClick={() => setVenueActionMenu(null)} />
                                  <div className="aa-action-menu" style={{ top: venueActionMenu.y, left: venueActionMenu.x }}>
                                    <button className="aa-menu-item" onClick={() => { openEditVenue(v); setVenueActionMenu(null); }}>
                                      <Edit3 size={14} /> Edit Venue
                                    </button>
                                    <button className="aa-menu-item aa-menu-danger" onClick={() => { handleDeleteVenue(v.id); setVenueActionMenu(null); }}>
                                      <Trash2 size={14} /> Delete Venue
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {showVenueForm && (
              <div className="aa-modal-overlay" onClick={() => setShowVenueForm(false)}>
                <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="aa-modal-header">
                    <h3>{editingVenue ? 'Edit Venue' : 'Create New Venue'}</h3>
                    <button className="aa-icon-btn" onClick={() => setShowVenueForm(false)}><X size={18} /></button>
                  </div>
                  <div className="aa-modal-body">
                    <div className="aa-form-group">
                      <label>Venue Name</label>
                      <input
                        type="text"
                        value={venueForm.venue_name}
                        onChange={(e) => setVenueForm((p) => ({ ...p, venue_name: e.target.value }))}
                        placeholder="e.g. Seminar Hall 1"
                        className="aa-form-input"
                      />
                    </div>
                    <div className="aa-form-row">
                      <div className="aa-form-group">
                        <label>Rows</label>
                        <input
                          type="number"
                          min={1}
                          max={26}
                          value={venueForm.rows_count}
                          onChange={(e) => setVenueForm((p) => ({
                            ...p,
                            rows_count: Math.max(1, Math.min(26, parseInt(e.target.value) || 1))
                          }))}
                          className="aa-form-input"
                        />
                        <span className="aa-form-hint">A–Z (max 26)</span>
                      </div>
                      <div className="aa-form-group">
                        <label>Columns</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={venueForm.columns_count}
                          onChange={(e) => setVenueForm((p) => ({
                            ...p,
                            columns_count: Math.max(1, parseInt(e.target.value) || 1)
                          }))}
                          className="aa-form-input"
                        />
                      </div>
                      <div className="aa-form-group">
                        <label>Total</label>
                        <div className="aa-form-total">{venueForm.rows_count * venueForm.columns_count}</div>
                      </div>
                    </div>
                    <div className="aa-form-preview">
                      <span className="aa-form-preview-label">Column Pattern Preview</span>
                      <div className="aa-form-preview-cols">
                        {Array.from({ length: Math.min(venueForm.columns_count, 12) }, (_, i) => {
                          const cl = getColumnCluster(i);
                          return (
                            <div key={i} className={`aa-fp-col ${cl === 'CS' ? 'aa-fp-cs' : 'aa-fp-core'}`}>
                              {i + 1}
                            </div>
                          );
                        })}
                        {venueForm.columns_count > 12 && <span className="aa-fp-more">+{venueForm.columns_count - 12}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="aa-modal-footer">
                    <button className="aa-btn aa-btn-ghost" onClick={() => setShowVenueForm(false)}>Cancel</button>
                    <button className="aa-btn aa-btn-primary" onClick={handleSaveVenue}>
                      <Save size={15} /> {editingVenue ? 'Update Venue' : 'Create Venue'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: MANAGE SLOTS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'slots' && (
          <div className="aa-slots-tab">
            <div className="aa-topbar">
              <div className="aa-search-wrap">
                <Search size={18} className="aa-search-icon" />
                <input
                  type="text"
                  placeholder="Search slots..."
                  className="aa-search-input"
                  value={slotSearch}
                  onChange={(e) => setSlotSearch(e.target.value)}
                />
              </div>
              <div className="aa-topbar-actions">
                <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={loadSlots}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button
                  className="aa-btn aa-btn-primary"
                  onClick={() => {
                    setShowSlotForm(true);
                    setSlotWarning('');
                  }}
                >
                  <Plus size={16} /> Schedule Slot
                </button>
              </div>
            </div>

            {slotLoading && (
              <div className="aa-table-card">
                <div className="aa-loading-overlay"><RefreshCw size={20} className="aa-spin" /> Loading...</div>
                <div style={{ height: 160 }} />
              </div>
            )}

            {slots.length === 0 && !slotLoading ? (
              <div className="aa-table-card">
                <div className="aa-empty-state">
                  <Clock size={40} strokeWidth={1.5} />
                  <p>No exam slots scheduled</p>
                  <p className="aa-empty-sub">Create slots to assign dates, times and subject codes for assessments</p>
                  <button
                    className="aa-btn aa-btn-primary"
                    onClick={() => {
                      setShowSlotForm(true);
                      setSlotWarning('');
                    }}
                  >
                    <Plus size={16} /> Schedule Slot
                  </button>
                </div>
              </div>
            ) : !slotLoading && (
              <div className="aa-sl-card-grid">
                {slots
                  .filter(sl => !slotSearch ||
                    sl.slot_label?.toLowerCase().includes(slotSearch.toLowerCase()) ||
                    sl.subject_code?.toLowerCase().includes(slotSearch.toLowerCase()) ||
                    formatDateLabel(sl.slot_date).toLowerCase().includes(slotSearch.toLowerCase()))
                  .map((sl) => (
                    <div key={sl.id} className="aa-sl-card">
                      <div className="aa-sl-card-header">
                        <div className="aa-sl-card-date">
                          <Calendar size={15} />
                          <span>{formatDateLabel(sl.slot_date)}</span>
                        </div>
                        <div className="aa-sl-card-actions">
                          <span className={`aa-status-badge ${(sl.status || 'Active') === 'Active' ? 'aa-status-active' : 'aa-status-inactive'}`}>
                            {sl.status || 'Active'}
                          </span>
                          <button className="aa-icon-btn aa-icon-danger" onClick={() => handleDeleteSlot(sl.id)} title="Delete slot">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="aa-sl-card-body">
                        <div className="aa-sl-card-time">
                          <Clock size={14} className="aa-sl-card-time-icon" />
                          <span className="aa-sl-card-time-text">
                            {formatTime12(sl.start_time)} – {formatTime12(sl.end_time)}
                          </span>
                        </div>

                        {sl.subject_code && (
                          <div className="aa-sl-card-subject">
                            <BookOpen size={14} />
                            <span>{sl.subject_code}</span>
                          </div>
                        )}

                        {sl.slot_label && (
                          <div className="aa-sl-card-label">
                            <Hash size={13} />
                            <span>{sl.slot_label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {showSlotForm && (
              <div className="aa-modal-overlay" onClick={() => { setShowSlotForm(false); setSlotWarning(''); }}>
                <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="aa-modal-header">
                    <h3>Schedule New Slot</h3>
                    <button className="aa-icon-btn" onClick={() => { setShowSlotForm(false); setSlotWarning(''); }}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="aa-modal-body">
                    {slotWarning && (
                      <div className="aa-warning-box">
                        <AlertTriangle size={16} />
                        <span>{slotWarning}</span>
                      </div>
                    )}
                    <div className="aa-form-group">
                      <label>Year</label>
                      <select
                        value={slotForm.year}
                        onChange={e => setSlotForm(p => ({ ...p, year: Number(e.target.value) }))}
                        className="aa-form-input"
                      >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>
                    </div>
                    <div className="aa-form-group">
                      <label>Exam Date</label>
                      <input
                        type="date"
                        value={slotForm.slot_date}
                        onChange={(e) => setSlotForm((p) => ({ ...p, slot_date: e.target.value }))}
                        className="aa-form-input"
                      />
                    </div>
                    <div className="aa-form-row">
                      <div className="aa-form-group">
                        <label>Start Time</label>
                        <input
                          type="time"
                          value={slotForm.start_time}
                          onChange={(e) => setSlotForm((p) => ({ ...p, start_time: e.target.value }))}
                          className="aa-form-input"
                        />
                      </div>
                      <div className="aa-form-group">
                        <label>End Time</label>
                        <input
                          type="time"
                          value={slotForm.end_time}
                          onChange={(e) => setSlotForm((p) => ({ ...p, end_time: e.target.value }))}
                          className="aa-form-input"
                        />
                      </div>
                    </div>
                    <div className="aa-form-group">
                      <label>Subject Code</label>
                      <input
                        type="text"
                        value={slotForm.subject_code}
                        onChange={(e) => setSlotForm((p) => ({ ...p, subject_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. CS3301"
                        className="aa-form-input"
                      />
                    </div>
                    <div className="aa-form-group">
                      <label>Label (optional)</label>
                      <input
                        type="text"
                        value={slotForm.slot_label}
                        onChange={(e) => setSlotForm((p) => ({ ...p, slot_label: e.target.value }))}
                        placeholder="e.g. Morning Batch"
                        className="aa-form-input"
                      />
                    </div>
                    {slotForm.slot_date && (() => {
                      const existing = slots.filter((s) =>
                        s.slot_date === slotForm.slot_date ||
                        formatDateLabel(s.slot_date) === formatDateLabel(slotForm.slot_date)
                      );
                      if (!existing.length) return null;
                      return (
                        <div className="aa-existing-slots">
                          <div className="aa-existing-header">
                            <Info size={13} />
                            <span>{existing.length} slot{existing.length > 1 ? 's' : ''} already on {formatDateLabel(slotForm.slot_date)}</span>
                          </div>
                          {existing.map((s) => (
                            <div key={s.id} className="aa-existing-item">
                              {formatTime12(s.start_time)} – {formatTime12(s.end_time)} {s.subject_code ? `[${s.subject_code}]` : ''} {s.slot_label ? `(${s.slot_label})` : ''}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="aa-modal-footer">
                    <button className="aa-btn aa-btn-ghost" onClick={() => { setShowSlotForm(false); setSlotWarning(''); }}>
                      Cancel
                    </button>
                    <button className="aa-btn aa-btn-primary" onClick={handleSaveSlot}>
                      <Save size={15} /> Schedule Slot
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: DEPARTMENT CLUSTERS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'clusters' && (
          <div className="aa-clusters-tab">
            <div className="aa-topbar">
              <div className="aa-cl-year-pills">
                {clusterYears.map(yr => {
                  const configured = !!getClusterForYear(yr, 'CS');
                  return (
                    <button
                      key={yr}
                      className={`aa-cl-year-pill ${clusterActiveYear === yr ? 'aa-cl-year-pill-active' : ''}`}
                      onClick={() => setClusterActiveYear(yr)}
                    >
                      <span className="aa-cl-yr-text">Year {yr}</span>
                      {configured && <span className="aa-cl-yr-dot" />}
                    </button>
                  );
                })}
              </div>
              <div className="aa-topbar-actions">
                <div className="aa-cl-pattern-toggle">
                  <button
                    className={`aa-cl-pat-btn ${clusterEditPattern === 'CS_FIRST' ? 'aa-cl-pat-active' : ''}`}
                    onClick={() => setClusterEditPattern('CS_FIRST')}
                  >
                    CS First
                  </button>
                  <button
                    className={`aa-cl-pat-btn ${clusterEditPattern === 'CORE_FIRST' ? 'aa-cl-pat-active' : ''}`}
                    onClick={() => setClusterEditPattern('CORE_FIRST')}
                  >
                    Core First
                  </button>
                </div>
                <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={loadClusters}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button
                  className="aa-btn aa-btn-primary aa-btn-sm"
                  onClick={handleClusterSave}
                  disabled={clusterSaving}
                >
                  <Save size={14} /> {clusterSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="aa-btn aa-btn-danger aa-btn-sm"
                  onClick={() => handleDeleteClusterYear(clusterActiveYear)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            {clusterSaveMsg && (
              <div className={`aa-cl-toast ${clusterSaveMsg.includes('success') ? 'aa-cl-toast-ok' : 'aa-cl-toast-err'}`}>
                {clusterSaveMsg.includes('success') ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {clusterSaveMsg}
              </div>
            )}

            {clusterLoading ? (
              <div className="aa-table-card">
                <div className="aa-loading-overlay"><RefreshCw size={20} className="aa-spin" /> Loading...</div>
                <div style={{ height: 200 }} />
              </div>
            ) : (
              <div className="aa-cl-two-col">
                <div className="aa-table-card">
                  <div className="aa-cl-table-header">
                    <div className="aa-cl-table-title">
                      <span className="aa-cl-title-dot aa-cl-dot-cs" />
                      <span>CS Cluster</span>
                      <span className="aa-cl-title-count">{clusterEditCS.length}</span>
                    </div>
                    <div className="aa-cl-add-wrap">
                      <input
                        type="text"
                        className="aa-cl-add-input"
                        placeholder="Add department..."
                        value={clusterNewCsDept}
                        onChange={e => setClusterNewCsDept(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && addClusterDept(clusterEditCS, setClusterEditCS, clusterNewCsDept, setClusterNewCsDept)}
                      />
                      <button
                        className="aa-icon-btn aa-icon-primary"
                        onClick={() => addClusterDept(clusterEditCS, setClusterEditCS, clusterNewCsDept, setClusterNewCsDept)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  {clusterEditCS.length === 0 ? (
                    <div className="aa-empty-state aa-empty-sm">
                      <Layers size={28} strokeWidth={1.5} />
                      <p>No CS departments configured</p>
                    </div>
                  ) : (
                    <div className="aa-table-wrap">
                      <table className="aa-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>#</th>
                            <th>Department</th>
                            <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clusterEditCS.map((dept, i) => (
                            <tr key={dept}>
                              <td><span className="aa-cl-row-num">{i + 1}</span></td>
                              <td><span className="aa-cl-dept-badge aa-cl-badge-cs">{dept}</span></td>
                              <td>
                                <div className="aa-cl-row-actions" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    className="aa-icon-btn"
                                    onClick={() => moveClusterDept(clusterEditCS, setClusterEditCS, i, 'up')}
                                    disabled={i === 0}
                                    title="Move up"
                                  >
                                    <ChevronUp size={13} />
                                  </button>
                                  <button
                                    className="aa-icon-btn"
                                    onClick={() => moveClusterDept(clusterEditCS, setClusterEditCS, i, 'down')}
                                    disabled={i === clusterEditCS.length - 1}
                                    title="Move down"
                                  >
                                    <ChevronDown size={13} />
                                  </button>
                                  <button
                                    className="aa-icon-btn aa-icon-danger"
                                    onClick={() => removeClusterDept(clusterEditCS, setClusterEditCS, i)}
                                    title="Remove"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="aa-table-card">
                  <div className="aa-cl-table-header">
                    <div className="aa-cl-table-title">
                      <span className="aa-cl-title-dot aa-cl-dot-core" />
                      <span>Core Cluster</span>
                      <span className="aa-cl-title-count">{clusterEditCore.length}</span>
                    </div>
                    <div className="aa-cl-add-wrap">
                      <input
                        type="text"
                        className="aa-cl-add-input"
                        placeholder="Add department..."
                        value={clusterNewCoreDept}
                        onChange={e => setClusterNewCoreDept(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && addClusterDept(clusterEditCore, setClusterEditCore, clusterNewCoreDept, setClusterNewCoreDept)}
                      />
                      <button
                        className="aa-icon-btn aa-icon-primary"
                        onClick={() => addClusterDept(clusterEditCore, setClusterEditCore, clusterNewCoreDept, setClusterNewCoreDept)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  {clusterEditCore.length === 0 ? (
                    <div className="aa-empty-state aa-empty-sm">
                      <Layers size={28} strokeWidth={1.5} />
                      <p>No Core departments configured</p>
                    </div>
                  ) : (
                    <div className="aa-table-wrap">
                      <table className="aa-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>#</th>
                            <th>Department</th>
                            <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clusterEditCore.map((dept, i) => (
                            <tr key={dept}>
                              <td><span className="aa-cl-row-num">{i + 1}</span></td>
                              <td><span className="aa-cl-dept-badge aa-cl-badge-core">{dept}</span></td>
                              <td>
                                <div className="aa-cl-row-actions" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    className="aa-icon-btn"
                                    onClick={() => moveClusterDept(clusterEditCore, setClusterEditCore, i, 'up')}
                                    disabled={i === 0}
                                    title="Move up"
                                  >
                                    <ChevronUp size={13} />
                                  </button>
                                  <button
                                    className="aa-icon-btn"
                                    onClick={() => moveClusterDept(clusterEditCore, setClusterEditCore, i, 'down')}
                                    disabled={i === clusterEditCore.length - 1}
                                    title="Move down"
                                  >
                                    <ChevronDown size={13} />
                                  </button>
                                  <button
                                    className="aa-icon-btn aa-icon-danger"
                                    onClick={() => removeClusterDept(clusterEditCore, setClusterEditCore, i)}
                                    title="Remove"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="aa-table-card" style={{ marginTop: 20 }}>
              <div className="aa-cl-table-header aa-cl-overview-header">
                <div className="aa-cl-table-title">
                  <BarChart3 size={16} />
                  <span>All Years Overview</span>
                </div>
              </div>
              <div className="aa-table-wrap">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>Year</th>
                      <th>CS Departments</th>
                      <th>Core Departments</th>
                      <th style={{ width: 120 }}>Pattern</th>
                      <th style={{ width: 80 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterYears.map(yr => {
                      const csRow = getClusterForYear(yr, 'CS');
                      const coreRow = getClusterForYear(yr, 'Core');
                      const configured = !!csRow;
                      return (
                        <tr
                          key={yr}
                          className={clusterActiveYear === yr ? 'aa-row-highlight' : ''}
                          onClick={() => setClusterActiveYear(yr)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="aa-venue-cell">
                              <div className="aa-venue-cell-name">Year {yr}</div>
                              <div className="aa-venue-cell-sub">
                                <Calendar size={11} /> {yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year
                              </div>
                            </div>
                          </td>
                          <td>
                            {csRow ? (
                              <div className="aa-cl-dept-chips">
                                {csRow.departments.map(d => <span key={d} className="aa-cl-chip aa-cl-chip-cs">{d}</span>)}
                              </div>
                            ) : <span className="aa-muted">Not configured</span>}
                          </td>
                          <td>
                            {coreRow ? (
                              <div className="aa-cl-dept-chips">
                                {coreRow.departments.map(d => <span key={d} className="aa-cl-chip aa-cl-chip-core">{d}</span>)}
                              </div>
                            ) : <span className="aa-muted">Not configured</span>}
                          </td>
                          <td>
                            <span className="aa-badge aa-badge-blue">
                              {csRow?.column_pattern === 'CORE_FIRST' ? 'Core First' : csRow ? 'CS First' : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`aa-status-badge ${configured ? 'aa-status-active' : 'aa-status-inactive'}`}>
                              {configured ? 'Active' : 'Empty'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: ALLOCATE
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'allocate' && (
          <div className="aa-allocate-tab">
            <div className="aa-year-selector">
              <span className="aa-year-label"><BookOpen size={14} /> Year:</span>
              {[1, 2, 3, 4].map(yr => (
                <button
                  key={yr}
                  className={`aa-year-btn ${allocYear === yr ? 'aa-year-active' : ''}`}
                  onClick={() => setAllocYear(yr)}
                >
                  {yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year
                </button>
              ))}
            </div>

            <div className="aa-alloc-grid">
              <div className="aa-alloc-main">
                <div className="aa-card">
                  <div className="aa-card-title"><Building2 size={15} /> Select Venues for this Slot</div>
                  {venues.length === 0 ? (
                    <div className="aa-empty-inline">
                      <AlertTriangle size={15} />
                      <span>No venues available. <button className="aa-link-btn" onClick={() => setActiveTab('venues')}>Create venues</button> first.</span>
                    </div>
                  ) : (
                    <div>
                      <div className="aa-venue-select-grid">
                        {venues.map((v) => {
                          const isSelected = selectedVenueIds.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              className={`aa-venue-select-item ${isSelected ? 'aa-venue-sel-active' : ''}`}
                              onClick={() => toggleVenueSelection(v.id)}
                            >
                              <div className={`aa-checkbox ${isSelected ? 'aa-checked' : ''}`}>
                                {isSelected && <CheckCircle size={14} />}
                              </div>
                              <div className="aa-vsi-info">
                                <span className="aa-vsi-name">{v.venue_name}</span>
                                <span className="aa-vsi-detail">{v.rows_count}R × {v.columns_count}C · {v.total_capacity} seats</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedVenues.length > 0 && (
                        <div className="aa-sv-total" style={{ marginTop: 10 }}>
                          <Shield size={14} />
                          Total Capacity: <strong>{TOTAL_CAPACITY}</strong> seats across {selectedVenues.length} venue{selectedVenues.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="aa-card">
                  <div className="aa-card-title"><FileSpreadsheet size={15} /> Upload Student Data</div>
                  <label className="aa-upload-zone">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="aa-file-hidden" />
                    <div className="aa-upload-inner">
                      <div className="aa-upload-icon-wrap"><Upload size={24} /></div>
                      <p className="aa-upload-primary">Click to upload or drag &amp; drop</p>
                      <p className="aa-upload-secondary">Excel (.xlsx, .xls) or CSV</p>
                    </div>
                  </label>
                  <p className="aa-hint"><Info size={12} /> Required: Roll Number, Name, Department. Optional: Email, Year, Gender, Date, Timing.</p>
                </div>

                {students.length > 0 && (
                  <div className="aa-card">
                    <div className="aa-card-title"><Calendar size={15} /> Filter by Date &amp; Time</div>
                    <div className="aa-filter-grid">
                      <div className="aa-filter-field">
                        <label className="aa-filter-label">Exam Date</label>
                        <select
                          value={selectedSlotDate}
                          onChange={handleSlotDateChange}
                          className="aa-select-input"
                          disabled={slotDateOptions.length === 0}
                        >
                          <option value="">{slotDateOptions.length === 0 ? 'No date found' : 'Select date'}</option>
                          {slotDateOptions.map((d) => <option key={d} value={d}>{formatDateLabel(d)}</option>)}
                        </select>
                      </div>
                      <div className="aa-filter-field">
                        <label className="aa-filter-label">Exam Time</label>
                        <select
                          value={slotTime}
                          onChange={(e) => setSlotTime(e.target.value)}
                          className="aa-select-input"
                          disabled={slotTimeOptions.length === 0}
                        >
                          <option value="">{slotTimeOptions.length === 0 ? 'No time found' : 'Select time'}</option>
                          {slotTimeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {slotTimeOptions.length === 0 && (
                        <div className="aa-filter-field aa-filter-field-full">
                          <label className="aa-filter-label">Manual Slot Time</label>
                          <input
                            type="text"
                            value={slotTime}
                            onChange={(e) => setSlotTime(e.target.value)}
                            placeholder="e.g. 9:00 AM - 11:00 AM"
                            className="aa-text-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {students.length > 0 && TOTAL_CAPACITY > 0 && (
                  <div className="aa-capacity-card">
                    <div className="aa-capacity-top">
                      <div className="aa-capacity-label">
                        <CheckCircle size={15} className="aa-icon-green" />
                        <strong>{students.length}</strong> students loaded
                      </div>
                      <span className={students.length > TOTAL_CAPACITY ? 'aa-cap-over' : 'aa-cap-ok'}>
                        {students.length <= TOTAL_CAPACITY
                          ? `${TOTAL_CAPACITY - students.length} seats remaining`
                          : `Exceeded by ${students.length - TOTAL_CAPACITY}!`}
                      </span>
                    </div>
                    <div className="aa-progress-track">
                      <div
                        className="aa-progress-fill"
                        style={{
                          width: `${Math.min((students.length / TOTAL_CAPACITY) * 100, 100)}%`,
                          background: students.length > TOTAL_CAPACITY ? '#ef4444' : 'var(--aa-primary)'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="aa-action-row">
                  <button
                    className="aa-btn aa-btn-primary"
                    onClick={handleGenerateAllocation}
                    disabled={!students.length || !selectedVenues.length}
                  >
                    <Zap size={16} /> Generate Allocation
                  </button>
                  <button className="aa-btn aa-btn-ghost" onClick={handleReset}>
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
              </div>

              <div className="aa-alloc-aside">
                <div className="aa-card">
                  <div className="aa-card-title"><Grid3X3 size={15} /> Column Pattern</div>
                  <div className="aa-pattern-btns">
                    <button
                      className={`aa-pat-btn ${columnPattern === 'CS_FIRST' ? 'aa-pat-active' : ''}`}
                      onClick={() => setColumnPattern('CS_FIRST')}
                    >
                      <CircleDot size={14} /> CS First
                    </button>
                    <button
                      className={`aa-pat-btn ${columnPattern === 'CORE_FIRST' ? 'aa-pat-active' : ''}`}
                      onClick={() => setColumnPattern('CORE_FIRST')}
                    >
                      <CircleDot size={14} /> Core First
                    </button>
                  </div>
                </div>

                <div className="aa-card">
                  <div className="aa-card-title"><Layers size={15} /> Department Clusters</div>

                  <div className="aa-cluster-section">
                    <div className="aa-cluster-label aa-cs-label">CS Cluster</div>
                    <div className="aa-dept-order-list">
                      {csOrder.map((dept, i) => {
                        const cnt = byDeptCount(dept);
                        return (
                          <div key={dept} className="aa-dept-order-item">
                            <span className="aa-doi-num">{i + 1}</span>
                            <span className="aa-doi-chip" style={{ background: getDepartmentColor(dept) + '30', borderColor: getDepartmentColor(dept) }}>
                              {dept} {cnt > 0 && <span className="aa-doi-cnt">({cnt})</span>}
                            </span>
                            <div className="aa-doi-btns">
                              <button className="aa-icon-btn" onClick={() => moveDeptInOrder(csOrder, setCsOrder, i, 'up')} disabled={i === 0}>
                                <ChevronUp size={11} />
                              </button>
                              <button className="aa-icon-btn" onClick={() => moveDeptInOrder(csOrder, setCsOrder, i, 'down')} disabled={i === csOrder.length - 1}>
                                <ChevronDown size={11} />
                              </button>
                              <button className="aa-icon-btn aa-icon-danger" onClick={() => removeDeptFromCluster(csOrder, setCsOrder, i)}>
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="aa-dept-add-row">
                        <input
                          type="text"
                          value={newCsDept}
                          onChange={(e) => setNewCsDept(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && addDeptToCluster(csOrder, setCsOrder, newCsDept, setNewCsDept)}
                          className="aa-dept-add-input"
                          placeholder="Add dept"
                        />
                        <button
                          className="aa-icon-btn aa-icon-primary"
                          onClick={() => addDeptToCluster(csOrder, setCsOrder, newCsDept, setNewCsDept)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="aa-cluster-section" style={{ marginTop: 16 }}>
                    <div className="aa-cluster-label aa-core-label">Core Cluster</div>
                    <div className="aa-dept-order-list">
                      {coreOrder.map((dept, i) => {
                        const cnt = byDeptCount(dept);
                        return (
                          <div key={dept} className="aa-dept-order-item">
                            <span className="aa-doi-num">{i + 1}</span>
                            <span className="aa-doi-chip" style={{ background: getDepartmentColor(dept) + '30', borderColor: getDepartmentColor(dept) }}>
                              {dept} {cnt > 0 && <span className="aa-doi-cnt">({cnt})</span>}
                            </span>
                            <div className="aa-doi-btns">
                              <button className="aa-icon-btn" onClick={() => moveDeptInOrder(coreOrder, setCoreOrder, i, 'up')} disabled={i === 0}>
                                <ChevronUp size={11} />
                              </button>
                              <button className="aa-icon-btn" onClick={() => moveDeptInOrder(coreOrder, setCoreOrder, i, 'down')} disabled={i === coreOrder.length - 1}>
                                <ChevronDown size={11} />
                              </button>
                              <button className="aa-icon-btn aa-icon-danger" onClick={() => removeDeptFromCluster(coreOrder, setCoreOrder, i)}>
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="aa-dept-add-row">
                        <input
                          type="text"
                          value={newCoreDept}
                          onChange={(e) => setNewCoreDept(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && addDeptToCluster(coreOrder, setCoreOrder, newCoreDept, setNewCoreDept)}
                          className="aa-dept-add-input"
                          placeholder="Add dept"
                        />
                        <button
                          className="aa-icon-btn aa-icon-primary"
                          onClick={() => addDeptToCluster(coreOrder, setCoreOrder, newCoreDept, setNewCoreDept)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {students.length > 0 && (
                  <div className="aa-card">
                    <div className="aa-card-title"><BookOpen size={15} /> Preview <span className="aa-title-muted">(first 5)</span></div>
                    <div className="aa-preview-scroll">
                      <table className="aa-preview-table">
                        <thead>
                          <tr>
                            <th>Roll No.</th>
                            <th>Name</th>
                            <th>Dept</th>
                            <th>Year</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.slice(0, 5).map((s, i) => (
                            <tr key={i}>
                              <td>{s.rollNumber}</td>
                              <td>{s.name}</td>
                              <td>
                                <span
                                  className="aa-inline-badge"
                                  style={{
                                    background: getDepartmentColor(normalizeDepartment(s.department)) + '33',
                                    border: `1px solid ${getDepartmentColor(normalizeDepartment(s.department))}66`
                                  }}
                                >
                                  {normalizeDepartment(s.department)}
                                </span>
                              </td>
                              <td>{s.year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB: RESULTS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'results' && Object.keys(venueAllocations).length > 0 && (
          <div className="aa-results-root">
            <div className="aa-results-topbar">
              <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => setActiveTab('allocate')}>
                <ArrowLeft size={15} /> Back to Config
              </button>
              <div className="aa-results-topbar-right">
                <button className="aa-btn aa-btn-outline aa-btn-sm" onClick={handlePrint}>
                  <Printer size={15} /> Print
                </button>
                <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={exportToExcel}>
                  <Download size={15} /> Export
                </button>
                <button className="aa-btn aa-btn-danger aa-btn-sm" onClick={handleReset}>
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            </div>

            {overallStats && (
              <div className="aa-stats-section">
                <div className="aa-stat-card aa-stat-blue">
                  <div className="aa-stat-icon"><Users size={22} /></div>
                  <div>
                    <div className="aa-stat-num">{overallStats.totalStudents}</div>
                    <div className="aa-stat-label">Total Students</div>
                  </div>
                </div>
                <div className="aa-stat-card aa-stat-purple">
                  <div className="aa-stat-icon"><Building2 size={22} /></div>
                  <div>
                    <div className="aa-stat-num">{overallStats.venuesUsed}</div>
                    <div className="aa-stat-label">Venues Used</div>
                  </div>
                </div>
                <div className="aa-stat-card aa-stat-indigo">
                  <div className="aa-stat-icon"><Layers size={22} /></div>
                  <div>
                    <div className="aa-stat-num">{overallStats.csClusterCount}</div>
                    <div className="aa-stat-label">CS Cluster</div>
                  </div>
                </div>
                <div className="aa-stat-card aa-stat-amber">
                  <div className="aa-stat-icon"><BarChart3 size={22} /></div>
                  <div>
                    <div className="aa-stat-num">{overallStats.coreClusterCount}</div>
                    <div className="aa-stat-label">Core Cluster</div>
                  </div>
                </div>
              </div>
            )}

            <div className="aa-info-row">
              <div className="aa-card aa-venue-summary-card">
                <div className="aa-card-title"><Building2 size={15} /> Venue Summary</div>
                {Object.entries(venueAllocations).map(([venueName, alloc], i) => {
                  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
                  const cap = alloc.rows * alloc.columns;
                  const pct = Math.round((alloc.stats.totalStudents / cap) * 100);
                  return (
                    <div key={venueName} className="aa-venue-summary-row">
                      <div className="aa-vsrow-header">
                        <span className="aa-vsrow-name" style={{ color: colors[i % colors.length] }}>
                          <MapPin size={13} /> {venueName}
                        </span>
                        <span className="aa-vsrow-count">
                          {alloc.stats.totalStudents}/{cap} <span className="aa-vsrow-dim">({alloc.rows}R×{alloc.columns}C)</span>
                        </span>
                      </div>
                      <div className="aa-progress-track">
                        <div className="aa-progress-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                      </div>
                      <div className="aa-vsrow-stats">
                        <span>CS: {alloc.stats.csClusterCount}</span>
                        <span>Core: {alloc.stats.coreClusterCount}</span>
                        <span className="aa-vsrow-empty">Empty: {alloc.stats.seatsEmpty}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="aa-card aa-dept-breakdown-card">
                <div className="aa-card-title"><Hash size={15} /> Department Breakdown</div>
                <div className="aa-dept-grid">
                  {overallStats && Object.entries(overallStats.departmentBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([dept, count]) => (
                      <div key={dept} className="aa-dept-row">
                        <span className="aa-dept-pill" style={{ background: getDepartmentColor(dept) + '28', borderColor: getDepartmentColor(dept) }}>
                          {dept}
                        </span>
                        <div className="aa-dept-bar-wrap">
                          <div
                            className="aa-dept-bar-fill"
                            style={{
                              width: `${Math.max(8, (count / overallStats.totalStudents) * 100)}%`,
                              background: getDepartmentColor(dept)
                            }}
                          />
                        </div>
                        <span className="aa-dept-count-num">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="aa-card aa-seat-section">
              <div className="aa-seat-section-header">
                <div className="aa-seat-section-title">
                  <Grid3X3 size={16} /> Seat Map
                  <span className="aa-seat-subtitle">— {selectedSlotLabel || slotTime}</span>
                </div>
                <div className="aa-venue-tabs">
                  {Object.keys(venueAllocations).map((venueName, i) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
                    return (
                      <button
                        key={venueName}
                        className={`aa-venue-tab ${activeVenue === venueName ? 'aa-tab-active' : ''}`}
                        style={activeVenue === venueName ? { background: colors[i % colors.length], borderColor: colors[i % colors.length] } : {}}
                        onClick={() => setActiveVenue(venueName)}
                      >
                        <MapPin size={12} /> {venueName}
                        <span className="aa-tab-badge">{venueAllocations[venueName].stats.totalStudents}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {venueAllocations[activeVenue] && (() => {
                const alloc = venueAllocations[activeVenue];
                const COLS = alloc.columns;
                const ROWS = alloc.rows;

                return (
                  <>
                    <div className="aa-seatmap-legend">
                      <span className="aa-legend-item" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 11 }}>CS →</span>
                      {CS_CLUSTER.map((dept) => (
                        <span key={dept} className="aa-legend-item">
                          <span className="aa-legend-dot" style={{ background: getDepartmentColor(dept) }} />
                          {dept}
                        </span>
                      ))}
                      <span style={{ width: 1, background: '#e2e8f0', height: 14, display: 'inline-block', margin: '0 6px' }} />
                      <span className="aa-legend-item" style={{ fontWeight: 700, color: '#b45309', fontSize: 11 }}>Core →</span>
                      {CORE_CLUSTER.map((dept) => (
                        <span key={dept} className="aa-legend-item">
                          <span className="aa-legend-dot" style={{ background: getDepartmentColor(dept) }} />
                          {dept}
                        </span>
                      ))}
                      <span className="aa-legend-item">
                        <span className="aa-legend-dot aa-legend-empty" />Empty
                      </span>
                    </div>

                    <div style={{ display: 'flex', marginLeft: 32, gap: 2, marginBottom: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>
                      {Array.from({ length: COLS }, (_, i) => {
                        const cl = getColumnCluster(i);
                        return (
                          <div
                            key={i}
                            style={{
                              flex: '0 0 54px',
                              width: 54,
                              padding: '2px 0',
                              borderRadius: '4px 4px 0 0',
                              textAlign: 'center',
                              fontSize: 9,
                              fontWeight: 700,
                              background: cl === 'CS' ? '#dbeafe' : '#fef3c7',
                              color: cl === 'CS' ? '#1d4ed8' : '#92400e',
                              border: `1px solid ${cl === 'CS' ? '#93c5fd' : '#fcd34d'}`
                            }}
                          >
                            {cl}
                          </div>
                        );
                      })}
                    </div>

                    <div className="aa-seatmap-scroll">
                      <div className="aa-seatmap">
                        <div className="aa-col-headers">
                          <div className="aa-rh-spacer" />
                          {Array.from({ length: COLS }, (_, i) => <div key={i} className="aa-col-header">{i + 1}</div>)}
                        </div>
                        {alloc.seatMap.map((row, rowIdx) => (
                          <div key={rowIdx} className="aa-seat-row">
                            <div className="aa-row-header">{String.fromCharCode(65 + rowIdx)}</div>
                            {row.map((seat, colIdx) => (
                              <div
                                key={colIdx}
                                className={`aa-seat ${seat ? 'aa-seat-occ' : 'aa-seat-empty'}`}
                                style={{
                                  background: seat ? getDepartmentColor(seat.normalizedDept) : '',
                                }}
                                title={seat
                                  ? `${seat.seatNumber}  •  ${seat.name}\n${seat.rollNumber}  •  ${seat.normalizedDept}  •  Year ${seat.year}`
                                  : 'Empty Seat'}
                              >
                                {seat ? (
                                  <div className="aa-seat-inner">
                                    <span className="aa-seat-no">{seat.seatNumber}</span>
                                    <span className="aa-seat-dept">{seat.normalizedDept}</span>
                                    <span className="aa-seat-name">{seat.name.split(' ')[0]}</span>
                                  </div>
                                ) : (
                                  <span className="aa-seat-dash">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AAssesment;