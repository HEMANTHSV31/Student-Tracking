import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './AAssesment.css';

// Academic Assessment Seat Allocation - Multi-Venue Support
// Version 2.0 - Updated for 150 seats per venue across 3 venues

const AAssesment = () => {
  const [students, setStudents] = useState([]);
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

    // Distribute departments evenly across columns
    const distributeAcrossColumns = (groupedStudents, clusterDepts) => {
      const result = [];
      const deptArrays = {};
      const deptIndices = {};

      // Initialize department arrays and indices
      clusterDepts.forEach(dept => {
        deptArrays[dept] = groupedStudents[dept] || [];
        deptIndices[dept] = 0;
      });

      // Calculate total students in this cluster
      const totalInCluster = Object.values(deptArrays).reduce((sum, arr) => sum + arr.length, 0);
      
      if (totalInCluster === 0) return result;

      // Distribute students column by column
      let activeDepts = clusterDepts.filter(dept => deptArrays[dept].length > 0);
      
      while (result.length < totalInCluster) {
        // Round-robin through departments with students remaining
        activeDepts.forEach(dept => {
          if (deptIndices[dept] < deptArrays[dept].length) {
            result.push(deptArrays[dept][deptIndices[dept]]);
            deptIndices[dept]++;
          }
        });
        
        // Update active departments
        activeDepts = activeDepts.filter(dept => deptIndices[dept] < deptArrays[dept].length);
      }

      return result;
    };

    // Distribute CS cluster and Core cluster students
    const distributedCS = distributeAcrossColumns(csGrouped, CS_CLUSTER);
    const distributedCore = distributeAcrossColumns(coreGrouped, CORE_CLUSTER);

    // Combine: CS cluster first, then Core cluster, then unknown
    const finalOrder = [...distributedCS, ...distributedCore, ...shuffle(unknownStudents)];

    // Split students across venues
    const venueAllocations = {};
    const venuesNeeded = Math.ceil(finalOrder.length / SEATS_PER_VENUE);
    
    for (let v = 0; v < venuesNeeded && v < VENUES.length; v++) {
      const venueName = VENUES[v];
      const startIdx = v * SEATS_PER_VENUE;
      const endIdx = Math.min(startIdx + SEATS_PER_VENUE, finalOrder.length);
      const venueStudents = finalOrder.slice(startIdx, endIdx);

      // Create 2D seat map for this venue (fill column-wise)
      const map = Array(ROWS).fill(null).map(() => Array(COLUMNS).fill(null));
      
      let studentIndex = 0;
      // Fill column by column, top to bottom
      for (let col = 0; col < COLUMNS; col++) {
        for (let row = 0; row < ROWS; row++) {
          if (studentIndex < venueStudents.length) {
            map[row][col] = {
              ...venueStudents[studentIndex],
              seatNumber: `${String.fromCharCode(65 + row)}${col + 1}`, // A1, A2, B1, etc.
              row: row + 1,
              col: col + 1,
              venue: venueName
            };
            studentIndex++;
          }
        }
      }

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
    finalOrder.forEach(student => {
      const dept = student.normalizedDept;
      overallDeptCounts[dept] = (overallDeptCounts[dept] || 0) + 1;
    });

    const overallStats = {
      totalStudents: finalOrder.length,
      venuesUsed: venuesNeeded,
      venues: Object.keys(venueAllocations),
      csClusterCount: distributedCS.length,
      coreClusterCount: distributedCore.length,
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

        // Map to expected format with new fields
        const mappedStudents = jsonData.map((row, index) => ({
          id: index + 1,
          rollNumber: row['Roll Number'] || row['roll number'] || row['ROLL NUMBER'] || row['Roll No'] || row['RegNo'] || row['Reg No'] || '',
          name: row['Name'] || row['name'] || row['NAME'] || row['Student Name'] || '',
          email: row['Email'] || row['email'] || row['EMAIL'] || row['Email ID'] || row['email id'] || '',
          year: row['Year'] || row['year'] || row['YEAR'] || '',
          department: row['Department'] || row['department'] || row['DEPARTMENT'] || row['Dept'] || '',
          gender: row['Gender'] || row['gender'] || row['GENDER'] || '',
          resident: row['Resident'] || row['resident'] || row['RESIDENT'] || row['Residency'] || '',
          timing: row['Timing'] || row['timing'] || row['TIMING'] || row['Slot'] || ''
        }));

        setStudents(mappedStudents);
        
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
    if (!slotTime) {
      alert('Please enter a slot time!');
      return;
    }

    if (students.length === 0) {
      alert('Please upload student data first!');
      return;
    }

    const result = allocateSeats(students);
    if (result) {
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
              'Timing': seat.timing,
              'Slot Time': slotTime
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
      'Slot Time': slotTime
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    XLSX.writeFile(wb, `Assessment_All_Venues_${slotTime.replace(/[:\s]/g, '_')}.xlsx`);
  };

  // Print seat map
  const handlePrint = () => {
    window.print();
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset? This will clear all data.')) {
      setStudents([]);
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

  return (
    <div className="aassesment-container">
      <div className="aassesment-header">
        <h1>Academic Assessment Seat Allocation</h1>
        <p>Smart shuffling algorithm for optimal seat distribution</p>
        <p style={{ fontSize: '0.95em', marginTop: '5px', opacity: 0.9 }}>
          Total Capacity: {TOTAL_CAPACITY} seats across {VENUES.length} venues ({SEATS_PER_VENUE} seats per venue)
        </p>
      </div>

      {!showMap ? (
        <div className="aassesment-input-section">
          {/* Slot Time Input */}
          <div className="input-group">
            <label>Slot Time:</label>
            <input
              type="text"
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
              placeholder="e.g., 9:00 AM - 11:00 AM"
              className="slot-time-input"
            />
          </div>

          {/* File Upload */}
          <div className="input-group">
            <label>Upload Student Data (Excel/CSV):</label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="file-input"
            />
            <small>Required columns: Roll Number, Name, Email, Year, Department, Gender, Resident, Timing</small>
          </div>

          {/* Student Count Display */}
          {students.length > 0 && (
            <div className="student-count">
              <p>✓ {students.length} students loaded</p>
              <p className="capacity-info">
                Total Capacity: {TOTAL_CAPACITY} seats ({VENUES.length} venues) | 
                {students.length <= TOTAL_CAPACITY ? (
                  <>
                    <span className="capacity-ok"> {TOTAL_CAPACITY - students.length} seats remaining</span>
                    <br />
                    <span style={{ fontSize: '0.9em' }}>
                      Venues needed: {Math.ceil(students.length / SEATS_PER_VENUE)} ({VENUES.slice(0, Math.ceil(students.length / SEATS_PER_VENUE)).join(', ')})
                    </span>
                  </>
                ) : (
                  <span className="capacity-exceeded"> Exceeded by {students.length - TOTAL_CAPACITY}!</span>
                )}
              </p>
            </div>
          )}

          {/* Student Preview */}
          {students.length > 0 && (
            <div className="student-preview">
              <h3>Student Data Preview (First 5)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Year</th>
                    <th>Department</th>
                    <th>Gender</th>
                    <th>Resident</th>
                    <th>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 5).map((student, idx) => (
                    <tr key={idx}>
                      <td>{student.rollNumber}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.year}</td>
                      <td>{student.department}</td>
                      <td>{student.gender}</td>
                      <td>{student.resident}</td>
                      <td>{student.timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length > 5 && <p>... and {students.length - 5} more</p>}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn-primary" 
              onClick={handleGenerateAllocation}
              disabled={!slotTime || students.length === 0}
            >
              Generate Seat Allocation
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>

          {/* Department Info */}
          <div className="department-info">
            <h3>Department Clusters</h3>
            <div className="cluster-info">
              <div className="cluster">
                <h4>CS Cluster (5)</h4>
                <ul>
                  {CS_CLUSTER.map(dept => (
                    <li key={dept}>
                      <span className="dept-badge" style={{ backgroundColor: getDepartmentColor(dept) }}>
                        {dept}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cluster">
                <h4>Core Cluster (7)</h4>
                <ul>
                  {CORE_CLUSTER.map(dept => (
                    <li key={dept}>
                      <span className="dept-badge" style={{ backgroundColor: getDepartmentColor(dept) }}>
                        {dept}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="aassesment-map-section">
          {/* Overall Statistics */}
          {overallStats && (
            <div className="statistics">
              <h2>Overall Allocation Statistics - {slotTime}</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>{overallStats.totalStudents}</h3>
                  <p>Total Students</p>
                </div>
                <div className="stat-card">
                  <h3>{overallStats.venuesUsed}</h3>
                  <p>Venues Used</p>
                </div>
                <div className="stat-card">
                  <h3>{overallStats.csClusterCount}</h3>
                  <p>CS Cluster</p>
                </div>
                <div className="stat-card">
                  <h3>{overallStats.coreClusterCount}</h3>
                  <p>Core Cluster</p>
                </div>
              </div>

              <div className="dept-breakdown">
                <h3>Department Breakdown (All Venues):</h3>
                <div className="dept-breakdown-grid">
                  {Object.entries(overallStats.departmentBreakdown).map(([dept, count]) => (
                    <div key={dept} className="dept-count">
                      <span className="dept-badge" style={{ backgroundColor: getDepartmentColor(dept) }}>
                        {dept}
                      </span>
                      <span className="count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Venue Summary */}
              <div className="venue-summary">
                <h3>Venue-wise Summary:</h3>
                <div className="venue-summary-grid">
                  {Object.entries(venueAllocations).map(([venueName, allocation]) => (
                    <div key={venueName} className="venue-summary-card">
                      <h4>{venueName}</h4>
                      <div className="venue-stats">
                        <div><strong>Students:</strong> {allocation.stats.totalStudents}</div>
                        <div><strong>CS Cluster:</strong> {allocation.stats.csClusterCount}</div>
                        <div><strong>Core Cluster:</strong> {allocation.stats.coreClusterCount}</div>
                        <div><strong>Empty Seats:</strong> {allocation.stats.seatsEmpty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn-primary" onClick={exportToExcel}>
              Export All Venues to Excel
            </button>
            <button className="btn-secondary" onClick={handlePrint}>
              Print Current Venue
            </button>
            <button className="btn-secondary" onClick={() => setShowMap(false)}>
              Back to Input
            </button>
            <button className="btn-danger" onClick={handleReset}>
              Reset All
            </button>
          </div>

          {/* Venue Tabs */}
          <div className="venue-tabs">
            <h3>Select Venue to View Seat Map:</h3>
            <div className="tabs">
              {Object.keys(venueAllocations).map((venueName) => (
                <button
                  key={venueName}
                  className={`tab ${activeVenue === venueName ? 'active' : ''}`}
                  onClick={() => setActiveVenue(venueName)}
                >
                  {venueName}
                  <span className="tab-count">
                    ({venueAllocations[venueName].stats.totalStudents} students)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Venue Seat Map */}
          {venueAllocations[activeVenue] && (
            <div className="seat-map-container">
              <h2>Seat Map - {activeVenue}</h2>
              <div className="hall-info">
                <p><strong>Venue:</strong> {activeVenue} | <strong>Students:</strong> {venueAllocations[activeVenue].stats.totalStudents}/{SEATS_PER_VENUE}</p>
                <p className="legend-title">Legend: Color indicates department | Hover for details</p>
              </div>
              
              <div className="seat-map">
                <div className="column-headers">
                  <div className="row-header-space"></div>
                  {Array.from({ length: COLUMNS }, (_, i) => (
                    <div key={i} className="column-header">{i + 1}</div>
                  ))}
                </div>
                
                {venueAllocations[activeVenue].seatMap.map((row, rowIdx) => (
                  <div key={rowIdx} className="seat-row">
                    <div className="row-header">{String.fromCharCode(65 + rowIdx)}</div>
                    {row.map((seat, colIdx) => (
                      <div
                        key={colIdx}
                        className={`seat ${seat ? 'occupied' : 'empty'}`}
                        style={{
                          backgroundColor: seat ? getDepartmentColor(seat.normalizedDept) : '#f9fafb',
                          border: seat ? '2px solid #1f2937' : '1px solid #e5e7eb'
                        }}
                        title={seat ? `${seat.name}\n${seat.rollNumber}\n${seat.normalizedDept}\nYear: ${seat.year}\nSeat: ${seat.seatNumber}` : 'Empty'}
                      >
                        {seat && (
                          <div className="seat-content">
                            <div className="seat-number">{seat.seatNumber}</div>
                            <div className="seat-dept">{seat.normalizedDept}</div>
                            <div className="seat-name">{seat.name.split(' ')[0]}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AAssesment;