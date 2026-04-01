import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, Calendar, CheckCircle, XCircle, Download, Printer, Save, MapPin, Grid, List, PieChart, RefreshCw
} from 'lucide-react';
import { 
  fetchAttendance as fetchAttendanceApi, 
  saveAttendance as saveAttendanceApi,
  fetchAllocation 
} from '../../../../../services/assessmentVenueApi';
import './Results.css';

const Results = ({ 
  venueAllocations: initialAllocations, 
  overallStats: initialStats, 
  selectedSlot, 
  venues,
  selectedSlotDate,
  slotTime,
  utils
}) => {
  const [venueAllocations, setVenueAllocations] = useState(initialAllocations || {});
  const [overallStats, setOverallStats] = useState(initialStats || {});
  const [activeVenue, setActiveVenue] = useState(Object.keys(initialAllocations || {})[0] || '');
  const [viewMode, setViewMode] = useState('map'); // 'map', 'list', 'stats'
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceModified, setAttendanceModified] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state if props change and not empty
  useEffect(() => {
    if (initialAllocations && Object.keys(initialAllocations).length > 0) {
      setVenueAllocations(initialAllocations);
      if (!activeVenue) {
        setActiveVenue(Object.keys(initialAllocations)[0]);
      }
    }
    if (initialStats && Object.keys(initialStats).length > 0) {
      setOverallStats(initialStats);
    }
  }, [initialAllocations, initialStats]);

  // Load attendance AND allocations when slot changes
  useEffect(() => {
    if (selectedSlot?.id) {
      // If allocations are empty or missing, try to fetch them
      if (!initialAllocations || Object.keys(initialAllocations).length === 0) {
        loadAllocationData(selectedSlot.id);
      }
      loadAttendanceData(selectedSlot.id);
    } else {
      setAttendanceData({});
      setAttendanceModified(false);
    }
  }, [selectedSlot]);

  // If active venue becomes invalid, reset it
  useEffect(() => {
    if (activeVenue && !venueAllocations[activeVenue]) {
      setActiveVenue(Object.keys(venueAllocations)[0] || '');
    } else if (!activeVenue && Object.keys(venueAllocations).length > 0) {
      setActiveVenue(Object.keys(venueAllocations)[0]);
    }
  }, [venueAllocations]);

  const loadAllocationData = async (slotId) => {
    setLoading(true);
    try {
      const res = await fetchAllocation(slotId);
      if (res.success && res.data) {
        const vAlloc = res.data.allocation_data || res.data.venueAllocations || {};
        const oStats = res.data.overall_stats || res.data.overallStats || {};
        
        setVenueAllocations(vAlloc);
        setOverallStats(oStats);
        
        if (Object.keys(vAlloc).length > 0 && !activeVenue) {
            setActiveVenue(Object.keys(vAlloc)[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load allocation:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async (slotId) => {
    try {
      const res = await fetchAttendanceApi(slotId);
      if (res.success && res.data) {
        const rawData = res.data.attendance_data;
        let finalData = {};
        if (rawData) {
          finalData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        }
        setAttendanceData(finalData);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const toggleSeatAttendance = (venueId, rowIdx, colIdx) => {
    if (!attendanceMode) return;
    
    const key = `${rowIdx}-${colIdx}`;
    setAttendanceData(prev => {
      const venueAttendance = { ...(prev[venueId] || {}) };
      
      const current = venueAttendance[key];
      if (current === false) {
        delete venueAttendance[key]; // Reset to default
      } else if (current === undefined) {
        venueAttendance[key] = false; // Mark Absent
      } else {
        if (current === true) venueAttendance[key] = false;
        else if (current === false) delete venueAttendance[key];
        else venueAttendance[key] = true;
      }
      
      return { ...prev, [venueId]: venueAttendance };
    });
    setAttendanceModified(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSlot?.id || !attendanceModified) return;
    
    setAttendanceSaving(true);
    try {
      const res = await saveAttendanceApi(selectedSlot.id, attendanceData);
      if (res.success) {
        setAttendanceModified(false);
        alert('Attendance saved successfully!');
      } else {
        alert(res.message || 'Failed to save attendance');
      }
    } catch (err) {
      console.error('Save attendance error:', err);
    } finally {
      setAttendanceSaving(false);
    }
  };

  const getAttendanceStats = (venueId) => {
    const alloc = venueAllocations[venueId];
    if (!alloc) return { present: 0, absent: 0, unmarked: 0, total: 0 };
    
    const venueAttendance = attendanceData[venueId] || {};
    let present = 0, absent = 0, unmarked = 0;
    
    if (alloc.seatMap && Array.isArray(alloc.seatMap)) {
      alloc.seatMap.forEach((row, rowIdx) => {
        if (Array.isArray(row)) {
          row.forEach((seat, colIdx) => {
            if (seat) {
              const key = `${rowIdx}-${colIdx}`;
              if (venueAttendance[key] === true) present++;
              else if (venueAttendance[key] === false) absent++;
              else unmarked++;
            }
          });
        }
      });
    }
    
    return { 
      present: present + unmarked, 
      absent: absent, 
      markedPresent: present,
      unmarked: unmarked,
      total: present + absent + unmarked 
    };
  };

  const exportToExcel = () => {
    if (!Object.keys(venueAllocations).length) {
      alert('No allocation to export!');
      return;
    }
    const label = utils.buildSlotLabel(selectedSlotDate, slotTime) || 'slot';
    const wb = XLSX.utils.book_new();

    // All Students Sheet
    const allStudentRows = [];
    Object.entries(venueAllocations)
      .filter(([, alloc]) => alloc && alloc.stats && alloc.stats.totalStudents > 0)
      .forEach(([venueName, alloc]) => {
        if (alloc.seatMap && Array.isArray(alloc.seatMap)) {
          alloc.seatMap.forEach((row, rowIdx) => {
             if (Array.isArray(row)) {
                row.forEach((seat, colIdx) => {
                  if (seat) allStudentRows.push({
                    'S.No': allStudentRows.length + 1,
                    Venue: venueName,
                    'Seat Number': utils.getSeatLabel(rowIdx, colIdx),
                    'Roll Number': seat.rollNumber,
                    Name: seat.name,
                    Department: utils.normalizeDepartment(seat.normalizedDept || seat.department),
                    Year: seat.year,
                    'Row': rowIdx + 1,
                    'Column': colIdx + 1,
                    'Exam Date': seat.slotDate || selectedSlotDate,
                    'Slot Time': slotTime || seat.timing,
                  });
                });
             }
          });
        }
      });
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allStudentRows), 'All Students');

    // Venue Summary Sheet
    const summary = Object.entries(venueAllocations)
      .filter(([, a]) => a && a.stats && a.stats.totalStudents > 0)
      .map(([n, a]) => ({
        Venue: n,
        'Total Students': a.stats.totalStudents,
        Capacity: a.rows * a.columns,
        'Empty Seats': a.stats.seatsEmpty,
        'Utilization': `${Math.round((a.stats.totalStudents / (a.rows * a.columns)) * 100)}%`
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    XLSX.writeFile(wb, `Allocation_${label.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`);
  };

  const handlePrint = () => {
    const alloc = venueAllocations[activeVenue];
    if (!alloc) return;

    // Correct Venue Name Lookup
    // Try to find venue object based on activeVenue (which could be ID or Name)
    const vInfo = venues.find(v => v.id.toString() === activeVenue || v.venue_name === activeVenue) || {};
    const vName = vInfo.venue_name || activeVenue || 'Venue';
    const COLS = alloc.columns;

    let html = `<html><head><title>Seat Map - ${vName}</title>`;
    html += `<style>
      body { font-family: sans-serif; padding: 20px; }
      .seat-grid { display: grid; grid-template-columns: 30px repeat(${COLS}, 1fr); gap: 4px; }
      .seat { border: 1px solid #ddd; padding: 4px; text-align: center; border-radius: 4px; min-height: 50px; display: flex; flex-direction: column; justify-content: center; }
      .seat.occupied { border-color: #999; }
      .seat-no { font-size: 10px; font-weight: bold; color: #555; }
      .seat-id { font-size: 11px; font-weight: bold; }
      .seat-dept { font-size: 9px; }
      .row-head { display: flex; align-items: center; justify-content: center; font-weight: bold; }
      .col-head { text-align: center; font-weight: bold; font-size: 12px; margin-bottom: 4px; }
      @media print { .no-print { display: none; } }
    </style></head><body>`;
    
    html += `<h2>${vName}</h2><p>Date: ${selectedSlotDate} | Time: ${slotTime}</p>`;
    html += `<div class="seat-grid">`;
    
    html += `<div></div>`; 
    for(let i=0; i<COLS; i++) html += `<div class="col-head">C${i+1}</div>`;

    if (alloc.seatMap && Array.isArray(alloc.seatMap)) {
      alloc.seatMap.forEach((row, rIdx) => {
        html += `<div class="row-head">R${rIdx+1}</div>`;
        if (Array.isArray(row)) {
          row.forEach((seat, cIdx) => {
            if(seat) {
               html += `<div class="seat occupied" style="background:${utils.getDepartmentColor(seat.normalizedDept)}33">
                 <span class="seat-no">${utils.getSeatLabel(rIdx, cIdx)}</span>
                 <span class="seat-id">${seat.rollNumber}</span>
                 <span class="seat-dept">${seat.normalizedDept}</span>
               </div>`;
            } else {
               html += `<div class="seat"><span class="seat-no">-</span></div>`;
            }
          });
        }
      });
    }
    html += `</div></body></html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(html);
    win.document.close();
  };

  // Safe checks for rendering
  const activeAlloc = venueAllocations[activeVenue];
  
  if (loading) {
     return (
       <div className="aa-loading-overlay">
         <RefreshCw size={24} className="aa-spin" />
         <span style={{ marginLeft: 10 }}>Loading allocation data...</span>
       </div>
     );
  }

  // If we have no active allocation, but we have data, we must set activeVenue
  if (!activeAlloc) {
     if (Object.keys(venueAllocations).length === 0) {
        return (
          <div className="aa-empty-state">
            <Users size={48} className="aa-text-muted" />
            <h3>No Allocation Data</h3>
            <p>Please go to "Manage Slots" and generate an allocation first.</p>
          </div>
        );
     }
     return <div className="aa-empty-state">Select a venue to view details</div>;
  }

  const currentStats = getAttendanceStats(activeVenue);

  return (
    <div className="aa-results-container">
      {/* Sidebar / Venue List */}
      <div className="aa-results-sidebar">
        <div className="aa-sidebar-header">
          <h3>Venues</h3>
          <span className="aa-badge">{Object.keys(venueAllocations).length}</span>
        </div>
        <div className="aa-venue-list">
          {Object.keys(venueAllocations).map(vid => {
            const alloc = venueAllocations[vid];
            if (!alloc) return null;

            // Robust name lookup
            const vInfo = venues.find(v => v.id.toString() === vid || v.venue_name === vid) || {};
            const vName = vInfo.venue_name || vid || 'Venue';
            
            // Safe stats access
            const studentCount = alloc.stats?.totalStudents || 0;
            const cap = (alloc.rows || 0) * (alloc.columns || 0);

            // Fetch live stats for attendance
            const safeStats = getAttendanceStats(vid);

            return (
              <button
                key={vid}
                className={`aa-venue-item ${activeVenue === vid ? 'active' : ''}`}
                onClick={() => setActiveVenue(vid)}
              >
                <div className="aa-venue-item-top">
                  <span className="aa-venue-name">{vName}</span>
                  {attendanceMode && (
                    <span className="aa-att-ratio" title="Present / Total">
                      {safeStats.present}/{safeStats.total}
                    </span>
                  )}
                </div>
                <div className="aa-venue-details">
                  <span>{studentCount} students</span>
                  <div className="aa-cap-bar" style={{
                    width: `${Math.min((studentCount / (cap || 1)) * 100, 100)}%`
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="aa-results-main">
        {/* Toolbar */}
        <div className="aa-results-toolbar">
          <div className="aa-toolbar-group">
            <button 
              className={`aa-tool-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Grid size={16} /> Seat Map
            </button>
            <button 
              className={`aa-tool-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              <PieChart size={16} /> Stats
            </button>
            <button 
              className={`aa-tool-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} /> List
            </button>
          </div>

          <div className="aa-toolbar-group">
            <button 
              className={`aa-tool-btn ${attendanceMode ? 'aa-btn-attendance-active' : ''}`}
              onClick={() => {
                if(attendanceMode && attendanceModified) {
                  if(!window.confirm("Discard unsaved attendance changes?")) return;
                  setAttendanceModified(false);
                  loadAttendanceData(selectedSlot?.id); // reload
                }
                setAttendanceMode(!attendanceMode);
              }}
            >
              <CheckCircle size={16} /> 
              {attendanceMode ? 'Exit Attendance' : 'Mark Attendance'}
            </button>

            {attendanceMode && (
               <button 
                 className="aa-tool-btn aa-btn-primary"
                 disabled={!attendanceModified || attendanceSaving}
                 onClick={handleSaveAttendance}
               >
                 <Save size={16} />
                 {attendanceSaving ? 'Saving...' : 'Save'}
               </button>
            )}

            <button className="aa-tool-btn" onClick={exportToExcel} title="Export to Excel">
              <Download size={16} />
            </button>
            <button className="aa-tool-btn" onClick={handlePrint} title="Print Seat Map">
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* View Content */}
        <div className="aa-results-content">
          {viewMode === 'map' && (
            <div className="aa-seatmap-wrapper">
              {activeAlloc.seatMap && Array.isArray(activeAlloc.seatMap) ? (
                  <div 
                    className={`aa-seatmap ${attendanceMode ? 'aa-seatmap-attendance-mode' : ''}`}
                    style={{ '--cols': activeAlloc.columns }}
                  >
                     {activeAlloc.seatMap.map((row, rowIdx) => (
                       (row || []).map((seat, colIdx) => {
                         const key = `${rowIdx}-${colIdx}`;
                         const attStatus = attendanceData[activeVenue]?.[key];
                         let attClass = '';
                         if (attStatus === true) attClass = 'aa-seat-present';
                         else if (attStatus === false) attClass = 'aa-seat-absent';

                         return (
                           <div 
                             key={key} 
                             className={`aa-seat ${seat ? 'aa-seat-occupied' : 'aa-seat-empty'} ${attendanceMode ? 'aa-seat-interactive' : ''} ${attClass}`}
                             onClick={() => seat && toggleSeatAttendance(activeVenue, rowIdx, colIdx)}
                             style={seat ? {
                               '--dept-color': utils.getDepartmentColor(seat.normalizedDept)
                             } : {}}
                             title={seat ? `${seat.rollNumber} - ${seat.name} (${seat.department})` : 'Empty'}
                           >
                             {seat ? (
                               <div className="aa-seat-inner">
                                 <span className="aa-seat-no">{utils.getSeatLabel(rowIdx, colIdx)}</span>
                                 <span className="aa-seat-roll">{seat.rollNumber}</span>
                                 <span className="aa-seat-dept" style={{ color: utils.getDepartmentTextColor(seat.normalizedDept) }}>
                                   {seat.normalizedDept}
                                 </span>
                                 {attendanceMode && (
                                   <div className="aa-att-indicator">
                                     {attStatus === true && <CheckCircle size={12} />}
                                     {attStatus === false && <XCircle size={12} />}
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <span className="aa-seat-no-empty">{utils.getSeatLabel(rowIdx, colIdx)}</span>
                             )}
                           </div>
                         );
                       })
                     ))}
                  </div>
              ) : (
                  <div className="aa-empty-state">Invalid seat map data</div>
              )}
              
              <div className="aa-legend">
                 <div className="aa-legend-item">
                   <div className="aa-legend-box occupied"></div>
                   <span>Occupied</span>
                 </div>
                 <div className="aa-legend-item">
                   <div className="aa-legend-box empty"></div>
                   <span>Empty</span>
                 </div>
                 {attendanceMode && (
                   <>
                    <div className="aa-legend-item">
                      <div className="aa-legend-box present"><CheckCircle size={12} /></div>
                      <span>Present</span>
                    </div>
                    <div className="aa-legend-item">
                      <div className="aa-legend-box absent"><XCircle size={12} /></div>
                      <span>Absent</span>
                    </div>
                   </>
                 )}
              </div>
            </div>
          )}

          {viewMode === 'stats' && activeAlloc.stats && (
             <div className="aa-stats-view">
               <div className="aa-stats-card">
                 <h4>Venue Statistics</h4>
                 <div className="aa-stat-row">
                   <span>Allocated Students:</span>
                   <strong>{activeAlloc.stats.totalStudents}</strong>
                 </div>
                 <div className="aa-stat-row">
                   <span>Capacity:</span>
                   <strong>{(activeAlloc.rows || 0) * (activeAlloc.columns || 0)}</strong>
                 </div>
                 <div className="aa-stat-row">
                   <span>Utilization:</span>
                   <strong>{Math.round((activeAlloc.stats.totalStudents / ((activeAlloc.rows || 1) * (activeAlloc.columns || 1))) * 100)}%</strong>
                 </div>
                 <div className="aa-stat-divider" />
                 <h5>Department Breakdown</h5>
                 {activeAlloc.seatMap ? utils.getDeptSummary(activeAlloc.seatMap).map(d => (
                   <div key={d.dept} className="aa-stat-row icon-row">
                     <span className="aa-dept-dot" style={{ background: utils.getDepartmentColor(d.dept) }} />
                     <span>{d.dept}</span>
                     <strong>{d.count}</strong>
                   </div>
                 )) : <span>No department data</span>}
               </div>
               {overallStats && (
                 <div className="aa-stats-card">
                   <h4>Overall Allocation Stats</h4>
                    <div className="aa-stat-row">
                      <span>Total Allocated:</span>
                      <strong>{overallStats.totalStudents}</strong>
                    </div>
                    <div className="aa-stat-row">
                      <span>Venues Used:</span>
                      <strong>{overallStats.venuesUsed}</strong>
                    </div>
                 </div>
               )}
             </div>
          )}
          
          {viewMode === 'list' && activeAlloc.seatMap && (
             <div className="aa-list-view">
               <table className="aa-preview-table">
                 <thead>
                   <tr>
                     <th>Seat</th>
                     <th>Roll Number</th>
                     <th>Name</th>
                     <th>Department</th>
                     <th>Year</th>
                   </tr>
                 </thead>
                 <tbody>
                   {Array.isArray(activeAlloc.seatMap) ? activeAlloc.seatMap.flat().map((seat, i) => {
                     if (!seat) return null;
                     return (
                       <tr key={i}>
                         <td>{seat.seatNumber}</td>
                         <td>{seat.rollNumber}</td>
                         <td>{seat.name}</td>
                         <td>{seat.normalizedDept}</td>
                         <td>{seat.year}</td>
                       </tr>
                     );
                   }) : null}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Results;