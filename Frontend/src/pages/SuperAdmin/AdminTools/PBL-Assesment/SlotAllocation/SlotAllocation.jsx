import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Calendar, Clock, BookOpen, Hash, AlertTriangle, ArrowLeft, FileSpreadsheet, Upload, CheckCircle, Zap, RotateCcw, Info
} from 'lucide-react';
import { saveAllocation as saveAllocationApi } from '../../../../../services/assessmentVenueApi';
import './SlotAllocation.css';

const PREVIEW_PAGE_SIZE = 10;

const SlotAllocation = ({ 
  selectedSlot, 
  onBackToSlots, 
  venues, 
  clusterData,
  onAllocationComplete,
  utils
}) => {
  const [students, setStudents] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [selectedSlotDate, setSelectedSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const [allocYear, setAllocYear] = useState(selectedSlot?.year || 1);

  const selectedVenues = venues.filter((v) => selectedVenueIds.includes(v.id));
  const TOTAL_CAPACITY = selectedVenues.length ? selectedVenues.reduce((s, v) => s + v.total_capacity, 0) : venues.reduce((s, v) => s + v.total_capacity, 0);

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
          const lookup = Object.fromEntries(Object.entries(row).map(([k, v]) => [utils.normalizeHeaderKey(k), v]));
          return {
            id: index + 1,
            rollNumber: utils.getFirstAvailableValue(lookup, ['Roll Number', 'Roll No', 'Register Number', 'Reg No', 'RegNo', 'roll_number', 'register_number']),
            name: utils.getFirstAvailableValue(lookup, ['Name', 'Student Name', 'student_name']),
            email: utils.getFirstAvailableValue(lookup, ['Email', 'Email ID', 'email_id', 'mail']),
            year: utils.getFirstAvailableValue(lookup, ['Year', 'Academic Year', 'academic_year']),
            department: utils.getFirstAvailableValue(lookup, ['Department', 'Dept', 'department_name']),
            gender: utils.getFirstAvailableValue(lookup, ['Gender', 'gender']),
            resident: utils.getFirstAvailableValue(lookup, ['Resident', 'Residency', 'Hosteller', 'resident']),
            slotDate: utils.getSlotDateFromRow(lookup),
            timing: utils.getSlotTimeFromRow(lookup),
          };
        }).filter(utils.isMeaningfulStudent);

        if (!mapped.length) {
          alert('No valid student rows found. Check column names.');
          return;
        }

        setStudents(mapped);
        setPreviewPage(1);
        const dates = utils.getAvailableSlotDates(mapped);
        const defDate = dates.length === 1 ? dates[0] : '';
        const times = utils.getAvailableSlotTimes(mapped, defDate);
        setSelectedSlotDate(defDate);
        setSlotTime(times.length === 1 ? times[0] : '');

        alert(`Loaded ${mapped.length} students successfully!`);
      } catch (err) {
        console.error(err);
        alert('Error reading file. Please ensure it is a valid Excel / CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReset = () => {
    if (window.confirm('Reset all data? This will clear students.')) {
      setStudents([]);
      setPreviewPage(1);
      setSelectedSlotDate('');
      setSlotTime('');
      setSelectedVenueIds([]);
    }
  };

  const handleGenerateAllocation = async () => {
    if (!students.length) {
      alert('Please upload student data first!');
      return;
    }
    // Use all venues if none specifically selected
    const venuesToUse = selectedVenues.length ? selectedVenues : venues;
    if (!venuesToUse.length) {
      alert('No venues available! Please add venues in the Venues tab first.');
      return;
    }
    // Auto-select all venues for allocation if none selected
    if (!selectedVenues.length && venues.length) {
      setSelectedVenueIds(venues.map(v => v.id));
    }

    const trimmedTime = slotTime.trim();
    const availDates = utils.getAvailableSlotDates(students);
    const availTimes = utils.getAvailableSlotTimes(students, selectedSlotDate);
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
      const okDate = effDate ? utils.valuesMatch(s.slotDate, effDate) : true;
      const okTime = effTime && availTimes.length > 0 ? utils.valuesMatch(s.timing, effTime) : true;
      return okDate && okTime;
    });

    if (!filtered.length) {
      alert('No students found for the selected date/time.');
      return;
    }

    // Determine Cluster Config based on allocYear
    const csCluster = clusterData.find(c => c.year === allocYear && c.cluster_type === 'CS');
    const coreCluster = clusterData.find(c => c.year === allocYear && c.cluster_type === 'Core');
    
    const csOrder = csCluster?.departments || ['CSE', 'IT', 'AIDS', 'AIML', 'CSBS'];
    const coreOrder = coreCluster?.departments || ['ECE', 'EEE', 'E&I', 'MECH', 'MECTRONIC', 'AGRI', 'BIOTECH'];
    const pattern = csCluster?.column_pattern || 'CS_FIRST';

    // Call allocateSeates from utils
    const result = utils.allocateSeats(filtered, venuesToUse, csOrder, coreOrder, pattern);
    
    if (result) {
      if (selectedSlot?.id) {
        try {
          await saveAllocationApi(selectedSlot.id, result.venueAllocations, result.overallStats);
        } catch (err) {
          console.error('Failed to save allocation:', err);
        }
      }

      onAllocationComplete({
        venueAllocations: result.venueAllocations,
        overallStats: result.overallStats,
        slotDate: effDate,
        slotTime: effTime
      });
    }
  };

  return (
    <div className="aa-allocate-tab">
      {/* Slot Info Header */}
      {selectedSlot ? (
        <div className="aa-slot-info-header">
          <div className="aa-slot-info-main">
            <div className="aa-slot-info-item">
              <Calendar size={16} />
              <span className="aa-slot-info-label">Date:</span>
              <span className="aa-slot-info-value">{utils.formatDateLabel(selectedSlot.slot_date)}</span>
            </div>
            <div className="aa-slot-info-item">
              <Clock size={16} />
              <span className="aa-slot-info-label">Time:</span>
              <span className="aa-slot-info-value">{utils.formatTime12(selectedSlot.start_time)} – {utils.formatTime12(selectedSlot.end_time)}</span>
            </div>
            <div className="aa-slot-info-item">
              <BookOpen size={16} />
              <span className="aa-slot-info-label">Year:</span>
              <span className="aa-slot-info-value">{selectedSlot.year === 1 ? '1st' : selectedSlot.year === 2 ? '2nd' : selectedSlot.year === 3 ? '3rd' : '4th'} Year</span>
            </div>
            {selectedSlot.subject_code && (
              <div className="aa-slot-info-item">
                <Hash size={16} />
                <span className="aa-slot-info-label">Subject:</span>
                <span className="aa-slot-info-value">{selectedSlot.subject_code}</span>
              </div>
            )}
          </div>
          <button className="aa-btn aa-btn-ghost aa-btn-sm" onClick={onBackToSlots}>
            <ArrowLeft size={14} /> Change Slot
          </button>
        </div>
      ) : (
        <div className="aa-no-slot-selected">
          <AlertTriangle size={20} />
          <span>No slot selected. Please <button className="aa-link-btn" onClick={onBackToSlots}>select a slot</button> from Manage Slots tab.</span>
        </div>
      )}

      <div className={`aa-alloc-content ${students.length > 0 ? 'aa-alloc-has-data' : ''}`}>
        <div className="aa-upload-section">
          <div className="aa-card aa-upload-card">
            <div className="aa-card-title"><FileSpreadsheet size={15} /> Upload Student Data</div>
            <label className="aa-upload-zone">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="aa-file-hidden" />
              <div className="aa-upload-inner">
                <div className="aa-upload-icon-wrap"><Upload size={24} /></div>
                <p className="aa-upload-secondary">Click to upload or drag &amp; drop</p>
                <p className="aa-upload-secondary">Excel (.xlsx, .xls) or CSV</p>
              </div>
            </label>
            <p className="aa-hint"><Info size={12} /> Required: Roll Number, Name, Department. Optional: Email, Year, Gender.</p>

            {students.length > 0 && TOTAL_CAPACITY > 0 && (
              <div className="aa-capacity-inline">
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
          </div>

          <div className="aa-action-row-centered">
            <button
              className="aa-btn aa-btn-primary aa-btn-lg"
              onClick={handleGenerateAllocation}
              disabled={!students.length || !venues.length}
            >
              <Zap size={18} /> Generate Allocation
            </button>
            <button className="aa-btn aa-btn-ghost" onClick={handleReset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        {students.length > 0 && (
          <div className="aa-preview-section">
            <div className="aa-card">
              <div className="aa-card-title"><BookOpen size={15} /> Student Preview <span className="aa-title-muted">({students.length} total)</span></div>
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
                    {students.slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE).map((s, i) => (
                      <tr key={i}>
                        <td>{s.rollNumber}</td>
                        <td>{s.name}</td>
                        <td>
                          <span
                            className="aa-inline-badge"
                            style={{
                              background: utils.getDepartmentColor(utils.normalizeDepartment(s.department)) + '33',
                              border: `1px solid ${utils.getDepartmentColor(utils.normalizeDepartment(s.department))}66`
                            }}
                          >
                            {utils.normalizeDepartment(s.department)}
                          </span>
                        </td>
                        <td>{s.year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {students.length > PREVIEW_PAGE_SIZE && (
                <div className="aa-pagination">
                  <button
                    className="aa-pagination-btn"
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                  >
                    Previous
                  </button>
                  <div className="aa-pagination-info">
                    Page {previewPage} of {Math.ceil(students.length / PREVIEW_PAGE_SIZE)}
                  </div>
                  <button
                    className="aa-pagination-btn"
                    onClick={() => setPreviewPage(p => Math.min(Math.ceil(students.length / PREVIEW_PAGE_SIZE), p + 1))}
                    disabled={previewPage >= Math.ceil(students.length / PREVIEW_PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotAllocation;