import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, MapPin, Users, Building2, Download,
  Printer, RotateCcw, ChevronRight, Clock, Hash, CheckCircle,
  AlertCircle, BarChart3, Layers, Grid3X3, ArrowLeft, Sparkles,
  BookOpen, GraduationCap, Info
} from 'lucide-react';
import './AAssesment.css';

// Academic Assessment Seat Allocation - Multi-Venue Support
// Version 2.0 - Updated for 150 seats per venue across 3 venues

const AAssesment = () => {
  const [students, setStudents] = useState([]);
  const [selectedSlotDate, setSelectedSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [venueAllocations, setVenueAllocations] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [activeVenue, setActiveVenue] = useState('SF 1');
  const [overallStats, setOverallStats] = useState(null);

  // Hall configuration - 150 seats per venue
  const ROWS = 10;
  const COLUMNS = 15;
  const SEATS_PER_VENUE = ROWS * COLUMNS; // 150 seats
  const VENUES = ['SF 1', 'SF 2', 'SF 3'];
  const TOTAL_CAPACITY = SEATS_PER_VENUE * VENUES.length; // 450 total

  // Department clusters
  const CS_CLUSTER = ['CSE', 'IT', 'AD', 'AL', 'CSBS'];
  const CORE_CLUSTER = ['EEE', 'ECE', 'ENDI', 'MECH', 'MECTRONIC', 'BIOTECH', 'AGRI'];

  const normalizeCellValue = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const normalizeHeaderKey = (header) => normalizeCellValue(header)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const padNumber = (value) => String(value).padStart(2, '0');

  const formatExcelDateValue = (value) => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'number') {
      const parsedDate = XLSX.SSF.parse_date_code(value);
      if (parsedDate?.y && parsedDate?.m && parsedDate?.d) {
        return `${parsedDate.y}-${padNumber(parsedDate.m)}-${padNumber(parsedDate.d)}`;
      }
    }

    const normalized = normalizeCellValue(value).replace(/\./g, '/');
    if (!normalized) return '';

    const isoMatch = normalized.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${padNumber(month)}-${padNumber(day)}`;
    }

    const dmyMatch = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${padNumber(month)}-${padNumber(day)}`;
    }

    return normalized;
  };

  const formatExcelTimeValue = (value) => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'number') {
      return XLSX.SSF.format('h:mm AM/PM', value).replace(/\s+/g, ' ').trim();
    }

    return normalizeCellValue(value).replace(/\s+/g, ' ');
  };

  const getFirstAvailableRawValue = (rowLookup, aliases) => {
    for (const alias of aliases) {
      const value = rowLookup[normalizeHeaderKey(alias)];
      if (value !== undefined && value !== null && normalizeCellValue(value) !== '') {
        return value;
      }
    }
    return '';
  };

  const getFirstAvailableValue = (rowLookup, aliases) => {
    return normalizeCellValue(getFirstAvailableRawValue(rowLookup, aliases));
  };

  const isMeaningfulStudent = (student) => (
    Boolean(student.rollNumber || student.name || student.department || student.email)
  );

  const getSlotTimeFromRow = (rowLookup) => {
    const directSlotTime = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, [
      'Timing',
      'Slot',
      'Time Slot',
      'Slot Time',
      'Exam Slot',
      'Exam Time'
    ]));

    if (directSlotTime) {
      return directSlotTime;
    }

    const startTime = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['Start Time', 'start_time', 'From Time', 'from_time']));
    const endTime = formatExcelTimeValue(getFirstAvailableRawValue(rowLookup, ['End Time', 'end_time', 'To Time', 'to_time']));

    if (startTime && endTime) {
      return `${startTime} - ${endTime}`;
    }

    return startTime || endTime || '';
  };

  const getSlotDateFromRow = (rowLookup) => formatExcelDateValue(getFirstAvailableRawValue(rowLookup, [
    'Date',
    'Exam Date',
    'Assessment Date',
    'Slot Date',
    'Exam Day',
    'date',
    'slot_date',
    'exam_date'
  ]));

  const getAvailableSlotDates = (studentList) => [
    ...new Set(studentList.map((student) => normalizeCellValue(student.slotDate)).filter(Boolean))
  ];

  const getAvailableSlotTimes = (studentList, slotDateValue = '') => [
    ...new Set(
      studentList
        .filter((student) => !slotDateValue || normalizeCellValue(student.slotDate) === slotDateValue)
        .map((student) => normalizeCellValue(student.timing))
        .filter(Boolean)
    )
  ];

  const valuesMatch = (leftValue, rightValue) => (
    normalizeCellValue(leftValue).toLowerCase() === normalizeCellValue(rightValue).toLowerCase()
  );

  const formatDateLabel = (dateValue) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const date = new Date(`${dateValue}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    return dateValue;
  };

  const buildSlotLabel = (dateValue, timeValue) => [
    dateValue ? formatDateLabel(dateValue) : '',
    normalizeCellValue(timeValue)
  ].filter(Boolean).join(' · ');

  // Normalize department names
  const normalizeDepartment = (dept) => {
    if (!dept) return 'UNKNOWN';
    const normalized = dept.toUpperCase().trim();
    
    // Map variations to standard names
    const mapping = {
      'COMPUTER SCIENCE': 'CSE',
      'CS': 'CSE',
      'INFORMATION TECHNOLOGY': 'IT',
      'ARTIFICIAL INTELLIGENCE': 'AD',
      'AI': 'AD',
      'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AD',
      'AIDS': 'AD',
      'AIML': 'AL',
      'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING': 'AL',
      'COMPUTER SCIENCE AND BUSINESS SYSTEMS': 'CSBS',
      'ELECTRICAL': 'EEE',
      'ELECTRONICS AND COMMUNICATION': 'ECE',
      'EC': 'ECE',
      'INDUSTRIAL': 'ENDI',
      'MECHANICAL': 'MECH',
      'MECHATRONICS': 'MECTRONIC',
      'BIOTECHNOLOGY': 'BIOTECH',
      'AGRICULTURE': 'AGRI',
    };

    return mapping[normalized] || normalized;
  };

  // Smart seat allocation algorithm - now handles multiple venues
  const allocateSeats = (studentList) => {
    if (!studentList || studentList.length === 0) {
      alert('No students to allocate!');
      return null;
    }

    if (studentList.length > TOTAL_CAPACITY) {
      alert(`Too many students! Total capacity is ${TOTAL_CAPACITY}, but ${studentList.length} students provided.`);
      return null;
    }

    // Categorize students by cluster
    const csClusterStudents = [];
    const coreClusterStudents = [];
    const unknownStudents = [];

    studentList.forEach(student => {
      const dept = normalizeDepartment(student.department);
      student.normalizedDept = dept;

      if (CS_CLUSTER.includes(dept)) {
        csClusterStudents.push(student);
      } else if (CORE_CLUSTER.includes(dept)) {
        coreClusterStudents.push(student);
      } else {
        unknownStudents.push(student);
      }
    });

    // Shuffle function to randomize within each department
    const shuffle = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Group by department and shuffle within each department
    const groupByDepartment = (students) => {
      const grouped = {};
      students.forEach(student => {
        if (!grouped[student.normalizedDept]) {
          grouped[student.normalizedDept] = [];
        }
        grouped[student.normalizedDept].push(student);
      });
      
      // Shuffle each department's students
      Object.keys(grouped).forEach(dept => {
        grouped[dept] = shuffle(grouped[dept]);
      });
      
      return grouped;
    };

    const csGrouped = groupByDepartment(csClusterStudents);
    const coreGrouped = groupByDepartment(coreClusterStudents);

    const buildClusterColumns = (groupedStudents, clusterDepts, clusterType) => {
      const deptQueues = clusterDepts
        .map((dept, index) => ({
          dept,
          order: index,
          students: [...(groupedStudents[dept] || [])]
        }))
        .filter((queue) => queue.students.length > 0);

      const columns = [];

      while (deptQueues.length > 0) {
        deptQueues.sort((left, right) => {
          if (right.students.length !== left.students.length) {
            return right.students.length - left.students.length;
          }

          return left.order - right.order;
        });

        const columnStudents = [];

        while (columnStudents.length < ROWS && deptQueues.length > 0) {
          const currentQueue = deptQueues[0];
          const takeCount = Math.min(ROWS - columnStudents.length, currentQueue.students.length);
          const nextChunk = currentQueue.students.splice(0, takeCount).map((student) => ({
            ...student,
            clusterType
          }));

          columnStudents.push(...nextChunk);

          if (currentQueue.students.length === 0) {
            deptQueues.shift();
          }
        }

        columns.push({
          clusterType,
          students: columnStudents
        });
      }

      return columns;
    };

    const buildUnknownColumns = (students) => {
      const shuffledUnknown = shuffle(students);
      const columns = [];

      for (let index = 0; index < shuffledUnknown.length; index += ROWS) {
        columns.push({
          clusterType: 'UNKNOWN',
          students: shuffledUnknown.slice(index, index + ROWS).map((student) => ({
            ...student,
            clusterType: 'UNKNOWN'
          }))
        });
      }

      return columns;
    };

    const csColumns = buildClusterColumns(csGrouped, CS_CLUSTER, 'CS');
    const coreColumns = buildClusterColumns(coreGrouped, CORE_CLUSTER, 'CORE');
    const unknownColumns = buildUnknownColumns(unknownStudents);
    const orderedColumns = [];
    let nextClusterType = csColumns.length >= coreColumns.length ? 'CS' : 'CORE';

    while (csColumns.length > 0 || coreColumns.length > 0) {
      if (nextClusterType === 'CS') {
        if (csColumns.length > 0) {
          orderedColumns.push(csColumns.shift());
          nextClusterType = 'CORE';
        } else {
          orderedColumns.push(coreColumns.shift());
        }
      } else if (coreColumns.length > 0) {
        orderedColumns.push(coreColumns.shift());
        nextClusterType = 'CS';
      } else {
        orderedColumns.push(csColumns.shift());
      }
    }

    orderedColumns.push(...unknownColumns);

    const allocatedStudents = orderedColumns.flatMap((column) => column.students);

    // Split students across venues using prepared columns
    const venueAllocations = {};
    const venuesNeeded = Math.ceil(orderedColumns.length / COLUMNS);
    
    for (let v = 0; v < venuesNeeded && v < VENUES.length; v++) {
      const venueName = VENUES[v];
      const startColumnIdx = v * COLUMNS;
      const endColumnIdx = Math.min(startColumnIdx + COLUMNS, orderedColumns.length);
      const venueColumns = orderedColumns.slice(startColumnIdx, endColumnIdx);
      const venueStudents = venueColumns.flatMap((column) => column.students);

      // Create 2D seat map for this venue (fill column-wise)
      const map = Array(ROWS).fill(null).map(() => Array(COLUMNS).fill(null));

      venueColumns.forEach((column, columnIndex) => {
        column.students.forEach((student, rowIndex) => {
          map[rowIndex][columnIndex] = {
            ...student,
            seatNumber: `${String.fromCharCode(65 + rowIndex)}${columnIndex + 1}`,
            row: rowIndex + 1,
            col: columnIndex + 1,
            venue: venueName
          };
        });
      });

      // Calculate statistics for this venue
      const deptCounts = {};
      venueStudents.forEach(student => {
        const dept = student.normalizedDept;
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const csCount = venueStudents.filter(s => CS_CLUSTER.includes(s.normalizedDept)).length;
      const coreCount = venueStudents.filter(s => CORE_CLUSTER.includes(s.normalizedDept)).length;
      const unknownCount = venueStudents.filter(s => !CS_CLUSTER.includes(s.normalizedDept) && !CORE_CLUSTER.includes(s.normalizedDept)).length;

      venueAllocations[venueName] = {
        seatMap: map,
        students: venueStudents,
        stats: {
          totalStudents: venueStudents.length,
          csClusterCount: csCount,
          coreClusterCount: coreCount,
          unknownCount: unknownCount,
          departmentBreakdown: deptCounts,
          seatsOccupied: venueStudents.length,
          seatsEmpty: SEATS_PER_VENUE - venueStudents.length
        }
      };
    }

    // Calculate overall statistics
    const overallDeptCounts = {};
    allocatedStudents.forEach(student => {
      const dept = student.normalizedDept;
      overallDeptCounts[dept] = (overallDeptCounts[dept] || 0) + 1;
    });

    const overallStats = {
      totalStudents: allocatedStudents.length,
      venuesUsed: venuesNeeded,
      venues: Object.keys(venueAllocations),
      csClusterCount: csClusterStudents.length,
      coreClusterCount: coreClusterStudents.length,
      unknownCount: unknownStudents.length,
      departmentBreakdown: overallDeptCounts
    };

    return {
      venueAllocations,
      overallStats
    };
  };

  // Handle file upload (Excel/CSV)
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (!jsonData.length) {
          setStudents([]);
          setVenueAllocations({});
          setOverallStats(null);
          setShowMap(false);
          alert('The uploaded file is empty or the first row is not a valid header row.');
          return;
        }

        const mappedStudents = jsonData
          .map((row, index) => {
            const rowLookup = Object.fromEntries(
              Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value])
            );

            return {
              id: index + 1,
              rollNumber: getFirstAvailableValue(rowLookup, ['Roll Number', 'Roll No', 'Register Number', 'Reg No', 'RegNo', 'roll_number', 'register_number']),
              name: getFirstAvailableValue(rowLookup, ['Name', 'Student Name', 'student_name']),
              email: getFirstAvailableValue(rowLookup, ['Email', 'Email ID', 'email_id', 'mail']),
              year: getFirstAvailableValue(rowLookup, ['Year', 'Academic Year', 'academic_year']),
              department: getFirstAvailableValue(rowLookup, ['Department', 'Dept', 'department_name']),
              gender: getFirstAvailableValue(rowLookup, ['Gender', 'gender']),
              resident: getFirstAvailableValue(rowLookup, ['Resident', 'Residency', 'Hosteller', 'resident']),
              slotDate: getSlotDateFromRow(rowLookup),
              timing: getSlotTimeFromRow(rowLookup)
            };
          })
          .filter(isMeaningfulStudent);

        if (!mappedStudents.length) {
          setStudents([]);
          setVenueAllocations({});
          setOverallStats(null);
          setShowMap(false);
          alert('No usable student rows were found. Check that the file has columns like Roll Number, Name, Department, or Email.');
          return;
        }

        setStudents(mappedStudents);
          const uploadedDates = getAvailableSlotDates(mappedStudents);
        const defaultDate = uploadedDates.length === 1 ? uploadedDates[0] : '';
          const uploadedTimes = getAvailableSlotTimes(mappedStudents, defaultDate);

          setSelectedSlotDate(defaultDate);
        setSlotTime(uploadedTimes.length === 1 ? uploadedTimes[0] : '');
        setVenueAllocations({});
        setOverallStats(null);
        setShowMap(false);
        
        const venuesNeeded = Math.ceil(mappedStudents.length / SEATS_PER_VENUE);
        if (venuesNeeded > VENUES.length) {
          alert(`Warning: ${mappedStudents.length} students require ${venuesNeeded} venues, but only ${VENUES.length} are available. Maximum capacity is ${TOTAL_CAPACITY} students.`);
        } else {
          alert(`Successfully loaded ${mappedStudents.length} students!\nVenues needed: ${venuesNeeded} (${VENUES.slice(0, venuesNeeded).join(', ')})`);
        }
      } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. Please ensure it\'s a valid Excel/CSV file.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Generate seat allocation
  const handleGenerateAllocation = () => {
    if (students.length === 0) {
      alert('Please upload student data first!');
      return;
    }

    const trimmedSlotTime = slotTime.trim();
    const availableDates = getAvailableSlotDates(students);
    const availableTimes = getAvailableSlotTimes(students, selectedSlotDate);
    const effectiveSlotDate = selectedSlotDate || (availableDates.length === 1 ? availableDates[0] : '');
    const effectiveSlotTime = trimmedSlotTime || (availableTimes.length === 1 ? availableTimes[0] : '');

    if (availableDates.length > 1 && !selectedSlotDate) {
      alert('Please select an exam date!');
      return;
    }

    if (availableTimes.length > 1 && !trimmedSlotTime) {
      alert('Please select an exam time!');
      return;
    }

    if (!availableDates.length && availableTimes.length === 0 && !trimmedSlotTime) {
      alert('Please enter a slot time or upload Excel data with slot time columns.');
      return;
    }

    const filteredStudents = students.filter((student) => {
      const matchesDate = effectiveSlotDate ? valuesMatch(student.slotDate, effectiveSlotDate) : true;
      const matchesTime = effectiveSlotTime && availableTimes.length > 0
        ? valuesMatch(student.timing, effectiveSlotTime)
        : true;
      return matchesDate && matchesTime;
    });

    if (!filteredStudents.length) {
      alert('No students found for the selected exam date and time.');
      return;
    }

    const result = allocateSeats(filteredStudents);
    if (result) {
      setSelectedSlotDate(effectiveSlotDate);
      setSlotTime(effectiveSlotTime);
      setVenueAllocations(result.venueAllocations);
      setOverallStats(result.overallStats);
      setActiveVenue(Object.keys(result.venueAllocations)[0]); // Set to first venue
      setShowMap(true);
    }
  };

  // Export to Excel - exports all venues
  const exportToExcel = () => {
    if (!venueAllocations || Object.keys(venueAllocations).length === 0) {
      alert('No seat allocation to export!');
      return;
    }

    const exportSlotTime = slotTime.trim();
    const exportSlotLabel = buildSlotLabel(selectedSlotDate, exportSlotTime) || 'slot';

    const wb = XLSX.utils.book_new();

    // Export each venue as a separate sheet
    Object.entries(venueAllocations).forEach(([venueName, allocation]) => {
      const exportData = [];
      allocation.seatMap.forEach(row => {
        row.forEach(seat => {
          if (seat) {
            exportData.push({
              'Venue': venueName,
              'Seat Number': seat.seatNumber,
              'Row': seat.row,
              'Column': seat.col,
              'Roll Number': seat.rollNumber,
              'Name': seat.name,
              'Email': seat.email,
              'Year': seat.year,
              'Department': seat.normalizedDept,
              'Gender': seat.gender,
              'Resident': seat.resident,
              'Exam Date': seat.slotDate || selectedSlotDate,
              'Timing': seat.timing,
              'Slot Time': exportSlotTime || seat.timing
            });
          }
        });
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, venueName);
    });

    // Add summary sheet
    const summaryData = Object.entries(venueAllocations).map(([venueName, allocation]) => ({
      'Venue': venueName,
      'Total Students': allocation.stats.totalStudents,
      'CS Cluster': allocation.stats.csClusterCount,
      'Core Cluster': allocation.stats.coreClusterCount,
      'Empty Seats': allocation.stats.seatsEmpty,
      'Exam Date': selectedSlotDate,
      'Slot Time': exportSlotTime
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    XLSX.writeFile(wb, `Assessment_All_Venues_${exportSlotLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`);
  };

  // Print seat map
  const handlePrint = () => {
    window.print();
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset? This will clear all data.')) {
      setStudents([]);
      setSelectedSlotDate('');
      setSlotTime('');
      setVenueAllocations({});
      setShowMap(false);
      setActiveVenue('SF 1');
      setOverallStats(null);
    }
  };

  // Get color for department
  const getDepartmentColor = (dept) => {
    if (!dept) return '#f0f0f0';
    
    const colors = {
      // CS Cluster - Blue shades
      'CSE': '#3B82F6',
      'IT': '#60A5FA',
      'AD': '#93C5FD',
      'AL': '#BFDBFE',
      'CSBS': '#DBEAFE',
      // Core Cluster - Green/Orange shades
      'EEE': '#FCD34D',
      'ECE': '#FDE68A',
      'ENDI': '#FEF3C7',
      'MECH': '#34D399',
      'MECTRONIC': '#6EE7B7',
      'BIOTECH': '#A7F3D0',
      'AGRI': '#D1FAE5',
      // Unknown
      'UNKNOWN': '#E5E7EB'
    };

    return colors[dept] || '#E5E7EB';
  };

  const slotDateOptions = getAvailableSlotDates(students);
  const slotTimeOptions = getAvailableSlotTimes(students, selectedSlotDate);
  const selectedSlotLabel = buildSlotLabel(selectedSlotDate, slotTime);

  const handleSlotDateChange = (event) => {
    const nextDate = event.target.value;
    const nextSlotTimeOptions = getAvailableSlotTimes(students, nextDate);

    setSelectedSlotDate(nextDate);

    if (nextSlotTimeOptions.includes(slotTime)) {
      return;
    }

    setSlotTime(nextSlotTimeOptions.length === 1 ? nextSlotTimeOptions[0] : '');
  };

  return (
    <div className="aa-root">
      {/* ── PAGE HEADER ─────────────────────────────────────────── */}
      <div className="aa-page-header">
        <div className="aa-header-left">
          <div className="aa-header-icon-wrap">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="aa-page-title">PBL Assessment Seat Allocation</h1>
            <p className="aa-page-subtitle">Smart shuffling algorithm · {VENUES.length} venues · {TOTAL_CAPACITY} total seats</p>
          </div>
        </div>
        {showMap && (
          <div className="aa-header-badges">
            <span className="aa-badge aa-badge-blue">
              <Users size={13} /> {overallStats?.totalStudents} Students
            </span>
            <span className="aa-badge aa-badge-purple">
              <Building2 size={13} /> {overallStats?.venuesUsed} Venues
            </span>
            <span className="aa-badge aa-badge-green">
              <Clock size={13} /> {selectedSlotLabel || 'Selected Slot'}
            </span>
          </div>
        )}
      </div>

      {!showMap ? (
        /* ══════════════════════ SETUP PANEL ══════════════════════ */
        <div className="aa-setup-grid">

          {/* LEFT: Upload + Config ─────────────────────── */}
          <div className="aa-card aa-setup-main">

            {/* Section: Slot time */}
            <div className="aa-section">
              <div className="aa-section-header">
                <Clock size={16} className="aa-section-icon" />
                <span>Exam Slot Filters</span>
              </div>
              <div className="aa-filter-grid">
                <div className="aa-filter-field">
                  <label className="aa-filter-label">Exam Date</label>
                  <select
                    value={selectedSlotDate}
                    onChange={handleSlotDateChange}
                    className="aa-select-input"
                    disabled={!students.length || slotDateOptions.length === 0}
                  >
                    <option value="">
                      {!students.length
                        ? 'Upload Excel first'
                        : slotDateOptions.length === 0
                          ? 'No exam date found'
                          : 'Select exam date'}
                    </option>
                    {slotDateOptions.map((dateValue) => (
                      <option key={dateValue} value={dateValue}>
                        {formatDateLabel(dateValue)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="aa-filter-field">
                  <label className="aa-filter-label">Exam Time</label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className="aa-select-input"
                    disabled={!students.length || slotTimeOptions.length === 0}
                  >
                    <option value="">
                      {!students.length
                        ? 'Upload Excel first'
                        : slotTimeOptions.length === 0
                          ? 'No time found for this date'
                          : 'Select exam time'}
                    </option>
                    {slotTimeOptions.map((timeValue) => (
                      <option key={timeValue} value={timeValue}>
                        {timeValue}
                      </option>
                    ))}
                  </select>
                </div>
                {students.length > 0 && slotTimeOptions.length === 0 && (
                  <div className="aa-filter-field aa-filter-field-full">
                    <label className="aa-filter-label">Manual Slot Time</label>
                    <input
                      type="text"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      placeholder="Enter slot time if Excel has no time column"
                      className="aa-text-input"
                    />
                  </div>
                )}
              </div>
              <p className="aa-hint">
                <Info size={12} />
                Pick exam date and time from Excel columns like Date, Slot Date, Timing, Slot, Start Time, and End Time.
              </p>
            </div>

            {/* Section: File upload */}
            <div className="aa-section">
              <div className="aa-section-header">
                <FileSpreadsheet size={16} className="aa-section-icon" />
                <span>Upload Student Data</span>
              </div>
              <label className="aa-upload-zone">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="aa-file-hidden"
                />
                <div className="aa-upload-inner">
                  <div className="aa-upload-icon-wrap">
                    <Upload size={24} />
                  </div>
                  <p className="aa-upload-primary">Click to upload or drag & drop</p>
                  <p className="aa-upload-secondary">Excel (.xlsx, .xls) or CSV</p>
                </div>
              </label>
              <p className="aa-hint">
                <Info size={12} />
                Required columns: Roll Number, Name, Email, Year, Department. Optional slot filters: Date, Slot Date, Timing, Slot, Start Time, End Time.
              </p>
            </div>

            {/* Capacity bar */}
            {students.length > 0 && (
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
                    style={{ width: `${Math.min((students.length / TOTAL_CAPACITY) * 100, 100)}%`, background: students.length > TOTAL_CAPACITY ? '#ef4444' : 'var(--aa-primary)' }}
                  />
                </div>
                <div className="aa-capacity-info">
                  <span><Building2 size={12} /> Venues needed: {Math.ceil(students.length / SEATS_PER_VENUE)}</span>
                    <span>{selectedSlotLabel ? `Selected: ${selectedSlotLabel}` : `${Math.round((students.length / TOTAL_CAPACITY) * 100)}% capacity`}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="aa-action-row">
              <button
                type="button"
                className="aa-btn aa-btn-primary"
                onClick={handleGenerateAllocation}
              >
                <Sparkles size={16} />
                Generate Seat Allocation
              </button>
              <button className="aa-btn aa-btn-ghost" onClick={handleReset}>
                <RotateCcw size={15} />
                Reset
              </button>
            </div>
          </div>

          {/* RIGHT: Info panels ────────────────────────── */}
          <div className="aa-setup-aside">

            {/* Department clusters */}
            <div className="aa-card aa-cluster-card">
              <div className="aa-card-title">
                <Layers size={15} />
                Department Clusters
              </div>
              <div className="aa-cluster-group">
                <div className="aa-cluster-label aa-cs-label">CS Cluster</div>
                <div className="aa-dept-chips">
                  {CS_CLUSTER.map(d => (
                    <span key={d} className="aa-chip aa-chip-cs" style={{ borderColor: getDepartmentColor(d) }}>{d}</span>
                  ))}
                </div>
              </div>
              <div className="aa-cluster-group">
                <div className="aa-cluster-label aa-core-label">Core Cluster</div>
                <div className="aa-dept-chips">
                  {CORE_CLUSTER.map(d => (
                    <span key={d} className="aa-chip aa-chip-core" style={{ borderColor: getDepartmentColor(d) }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Venue capacity summary */}
            <div className="aa-card aa-venue-info-card">
              <div className="aa-card-title">
                <Building2 size={15} />
                Venue Capacity
              </div>
              {VENUES.map((v, i) => (
                <div key={v} className="aa-venue-row">
                  <span className="aa-venue-dot" style={{ background: ['#6366f1','#8b5cf6','#ec4899'][i] }} />
                  <span className="aa-venue-name">{v}</span>
                  <span className="aa-venue-seats">{ROWS} × {COLUMNS} = <strong>{SEATS_PER_VENUE}</strong> seats</span>
                </div>
              ))}
            </div>

            {/* Student preview (if loaded) */}
            {students.length > 0 && (
              <div className="aa-card aa-preview-card">
                <div className="aa-card-title">
                  <BookOpen size={15} />
                  Preview <span className="aa-title-muted">(first 5 of {students.length})</span>
                </div>
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
                            <span className="aa-inline-badge" style={{ background: getDepartmentColor(s.department) + '33', color: '#1f2937', border: `1px solid ${getDepartmentColor(normalizeDepartment(s.department))}66` }}>
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

      ) : (
        /* ══════════════════════ RESULTS PANEL ════════════════════ */
        <div className="aa-results-root">

          {/* Top action bar */}
          <div className="aa-results-topbar">
            <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={() => setShowMap(false)}>
              <ArrowLeft size={15} /> Back
            </button>
            <div className="aa-results-topbar-right">
              <button className="aa-btn aa-btn-outline aa-btn-sm" onClick={handlePrint}>
                <Printer size={15} /> Print
              </button>
              <button className="aa-btn aa-btn-primary aa-btn-sm" onClick={exportToExcel}>
                <Download size={15} /> Export All Venues
              </button>
              <button className="aa-btn aa-btn-danger aa-btn-sm" onClick={handleReset}>
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </div>

          {/* ── Overall Stats ─────────────────────────────────────── */}
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

          {/* ── Two-column: Venue Summary + Dept Breakdown ─────── */}
          <div className="aa-info-row">
            {/* Venue-wise summary */}
            <div className="aa-card aa-venue-summary-card">
              <div className="aa-card-title"><Building2 size={15} /> Venue Summary</div>
              {Object.entries(venueAllocations).map(([venueName, allocation], i) => {
                const colors = ['#6366f1','#8b5cf6','#ec4899'];
                const pct = Math.round((allocation.stats.totalStudents / SEATS_PER_VENUE) * 100);
                return (
                  <div key={venueName} className="aa-venue-summary-row">
                    <div className="aa-vsrow-header">
                      <span className="aa-vsrow-name" style={{ color: colors[i] }}>
                        <MapPin size={13} /> {venueName}
                      </span>
                      <span className="aa-vsrow-count">{allocation.stats.totalStudents}/{SEATS_PER_VENUE}</span>
                    </div>
                    <div className="aa-progress-track">
                      <div className="aa-progress-fill" style={{ width: `${pct}%`, background: colors[i] }} />
                    </div>
                    <div className="aa-vsrow-stats">
                      <span>CS: {allocation.stats.csClusterCount}</span>
                      <span>Core: {allocation.stats.coreClusterCount}</span>
                      <span className="aa-vsrow-empty">Empty: {allocation.stats.seatsEmpty}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Department breakdown */}
            <div className="aa-card aa-dept-breakdown-card">
              <div className="aa-card-title"><Hash size={15} /> Department Breakdown</div>
              <div className="aa-dept-grid">
                {overallStats && Object.entries(overallStats.departmentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dept, count]) => (
                    <div key={dept} className="aa-dept-row">
                      <span
                        className="aa-dept-pill"
                        style={{
                          background: getDepartmentColor(dept) + '28',
                          borderColor: getDepartmentColor(dept),
                          color: '#1e293b'
                        }}
                      >{dept}</span>
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

          {/* ── Venue Tabs + Seat Map ─────────────────────────────── */}
          <div className="aa-card aa-seat-section">
            <div className="aa-seat-section-header">
              <div className="aa-seat-section-title">
                <Grid3X3 size={16} />
                Seat Map
                <span className="aa-seat-subtitle">— {selectedSlotLabel || slotTime}</span>
              </div>
              <div className="aa-venue-tabs">
                {Object.keys(venueAllocations).map((venueName, i) => {
                  const colors = ['#6366f1','#8b5cf6','#ec4899'];
                  return (
                    <button
                      key={venueName}
                      className={`aa-venue-tab ${activeVenue === venueName ? 'aa-tab-active' : ''}`}
                      style={activeVenue === venueName ? { background: colors[i], borderColor: colors[i] } : {}}
                      onClick={() => setActiveVenue(venueName)}
                    >
                      <MapPin size={12} />
                      {venueName}
                      <span className="aa-tab-badge">{venueAllocations[venueName].stats.totalStudents}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {venueAllocations[activeVenue] && (
              <>
                <div className="aa-seatmap-legend">
                  {[...CS_CLUSTER, ...CORE_CLUSTER].map(dept => (
                    <span key={dept} className="aa-legend-item">
                      <span className="aa-legend-dot" style={{ background: getDepartmentColor(dept) }} />
                      {dept}
                    </span>
                  ))}
                  <span className="aa-legend-item">
                    <span className="aa-legend-dot aa-legend-empty" />
                    Empty
                  </span>
                </div>

                <div className="aa-seatmap-scroll">
                  <div className="aa-seatmap">
                    {/* Column headers */}
                    <div className="aa-col-headers">
                      <div className="aa-rh-spacer" />
                      {Array.from({ length: COLUMNS }, (_, i) => (
                        <div key={i} className="aa-col-header">{i + 1}</div>
                      ))}
                    </div>

                    {venueAllocations[activeVenue].seatMap.map((row, rowIdx) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AAssesment;