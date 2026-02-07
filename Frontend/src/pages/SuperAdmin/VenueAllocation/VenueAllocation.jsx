import { useState, useEffect } from "react";
import {
  School,
  LocationOn,
  Group,
  Person,
  Preview,
  PlayArrow,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Refresh,
  Error as ErrorIcon,
  Info,
  FilterList,
  Search,
  Close,
  Add,
  Settings,
  Business,
  CalendarMonth,
  Warning,
  Schedule,
  Notifications,
} from "@mui/icons-material";
import { apiGet, apiPost, apiDelete, apiPut } from "../../../utils/api";
import "./VenueAllocation.css";

const VenueAllocation = () => {
  // Step state: 1 = Year, 2 = Filters, 3 = Venues, 4 = Students, 5 = Preview, 6 = Result
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Year selection
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  // Step 2: Department and filter selection
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [allocationMode, setAllocationMode] = useState("department_wise");
  const [groupDepartments, setGroupDepartments] = useState([]);
  const [reservedSlots, setReservedSlots] = useState(2);

  // NEW: Schedule dates
  const [scheduleStartDate, setScheduleStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [batchName, setBatchName] = useState("");

  // Step 3: Venue selection
  const [venues, setVenues] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [venueSearch, setVenueSearch] = useState("");

  // Step 4: Student selection  
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectAllStudents, setSelectAllStudents] = useState(true);
  const [venueMapping, setVenueMapping] = useState([]);

  // Step 5: Preview
  const [previewData, setPreviewData] = useState(null);
  const [groupSpecification, setGroupSpecification] = useState("");

  // Step 6: Result
  const [allocationResult, setAllocationResult] = useState(null);

  // Modal for adding new venue
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenue, setNewVenue] = useState({
    venue_name: "",
    capacity: 60,
    location: "",
  });

  // NEW: Alerts and expiring allocations
  const [alerts, setAlerts] = useState([]);
  const [expiringAllocations, setExpiringAllocations] = useState({ expiring: [], expired: [] });
  const [showAlerts, setShowAlerts] = useState(false);

  // Load years and alerts on mount
  useEffect(() => {
    fetchYears();
    fetchAlerts();
  }, []);

  // Load departments when year changes
  useEffect(() => {
    if (selectedYear) {
      fetchDepartments();
    }
  }, [selectedYear]);

  // Fetch all available years
  const fetchYears = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/venue-allocation/years");
      const data = await response.json();
      if (data.success) {
        setYears(data.data);
      }
    } catch (err) {
      setError("Failed to fetch years");
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts and expiring allocations
  const fetchAlerts = async () => {
    try {
      const [alertsRes, expiringRes] = await Promise.all([
        apiGet("/venue-allocation/alerts"),
        apiGet("/venue-allocation/expiring?days=7")
      ]);
      
      const alertsData = await alertsRes.json();
      const expiringData = await expiringRes.json();
      
      if (alertsData.success) {
        setAlerts(alertsData.data.alerts);
        if (alertsData.data.hasHighPriority) {
          setShowAlerts(true);
        }
      }
      
      if (expiringData.success) {
        setExpiringAllocations(expiringData.data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  // Fetch departments for selected year
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/venue-allocation/departments?year=${selectedYear}`);
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (err) {
      setError("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all venues from database
  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/venue-allocation/venues");
      const data = await response.json();
      if (data.success) {
        setVenues(data.data);
        // Select all venues by default
        setSelectedVenueIds(data.data.map(v => v.venue_id));
      }
    } catch (err) {
      setError("Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  // Fetch students based on filters
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await apiPost("/venue-allocation/students", {
        year: selectedYear,
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        onlyUnallocated: true,
      });
      const data = await response.json();
      if (data.success) {
        setStudents(data.data.students);
        setVenueMapping(data.data.venueMapping || []);
        // Select all students by default
        setSelectedStudentIds(data.data.students.map(s => s.student_id));
        setSelectAllStudents(true);
      }
    } catch (err) {
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Generate preview
  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        year: selectedYear,
        venueIds: selectedVenueIds,
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        studentIds: selectAllStudents ? null : selectedStudentIds,
        reservedSlots,
        groupDepartments: groupDepartments.length > 0 ? groupDepartments : [],
        allocationMode,
      };

      const response = await apiPost("/venue-allocation/preview", payload);
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
        setCurrentStep(5);
      } else {
        setError(data.message || "Failed to generate preview");
      }
    } catch (err) {
      setError(err.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  // Execute allocation
  const handleExecute = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        year: selectedYear,
        venueIds: selectedVenueIds,
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        studentIds: selectAllStudents ? null : selectedStudentIds,
        reservedSlots,
        groupDepartments: groupDepartments.length > 0 ? groupDepartments : [],
        allocationMode,
        groupSpecification,
        scheduleStartDate: scheduleStartDate || null,
        scheduleEndDate: scheduleEndDate || null,
        batchName: batchName || null,
      };

      const response = await apiPost("/venue-allocation/execute", payload);
      const data = await response.json();
      
      if (data.success) {
        setAllocationResult(data.data);
        setCurrentStep(6);
      } else {
        setError(data.message || "Failed to execute allocation");
      }
    } catch (err) {
      setError(err.message || "Failed to execute allocation");
    } finally {
      setLoading(false);
    }
  };

  // Add new venue
  const handleAddVenue = async () => {
    try {
      setLoading(true);
      const response = await apiPost("/venue-allocation/create-venue", {
        ...newVenue,
        year: selectedYear,
      });
      const data = await response.json();
      
      if (data.success) {
        setShowAddVenue(false);
        setNewVenue({ venue_name: "", capacity: 60, location: "" });
        await fetchVenues();
      } else {
        setError(data.message || "Failed to create venue");
      }
    } catch (err) {
      setError(err.message || "Failed to create venue");
    } finally {
      setLoading(false);
    }
  };

  // Toggle department selection
  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Toggle group department
  const toggleGroupDepartment = (dept) => {
    setGroupDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  // Toggle venue selection
  const toggleVenue = (venueId) => {
    setSelectedVenueIds(prev =>
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  // Toggle student selection
  const toggleStudent = (studentId) => {
    setSelectAllStudents(false);
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Select all students
  const handleSelectAllStudents = () => {
    setSelectAllStudents(true);
    setSelectedStudentIds(students.map(s => s.student_id));
  };

  // Clear student selection
  const handleClearStudentSelection = () => {
    setSelectAllStudents(false);
    setSelectedStudentIds([]);
  };

  // Calculate capacity
  const calculateTotalCapacity = () => {
    return venues
      .filter(v => selectedVenueIds.includes(v.venue_id))
      .reduce((sum, v) => sum + Math.max(0, v.available_seats - reservedSlots), 0);
  };

  // Filter venues by search
  const filteredVenues = venues.filter(v =>
    v.venue_name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    v.location?.toLowerCase().includes(venueSearch.toLowerCase())
  );

  // Filter students by search
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.department.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get student count for selected departments
  const getStudentCount = () => {
    if (selectedDepartments.length === 0) {
      return departments.reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
    }
    return departments
      .filter(d => selectedDepartments.includes(d.department))
      .reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
  };

  // Reset wizard
  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedYear(null);
    setSelectedDepartments([]);
    setSelectedVenueIds([]);
    setSelectedStudentIds([]);
    setGroupDepartments([]);
    setPreviewData(null);
    setAllocationResult(null);
    setError(null);
  };

  // Navigate to next step
  const handleNextStep = async () => {
    if (currentStep === 2) {
      await fetchVenues();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      await fetchStudents();
      setCurrentStep(4);
    }
  };

  return (
    <div className="venue-allocation-container">
      {/* Header */}
      <div className="allocation-header">
        <div className="header-content">
          <h1 className="header-title">
            <Business className="header-icon" />
            Student Venue Allocation
          </h1>
          <p className="header-subtitle">
            Dynamically allocate students to venues based on year, department, and custom filters
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="progress-steps">
        {[
          { num: 1, label: "Year", icon: <School /> },
          { num: 2, label: "Filters", icon: <FilterList /> },
          { num: 3, label: "Venues", icon: <LocationOn /> },
          { num: 4, label: "Students", icon: <Person /> },
          { num: 5, label: "Preview", icon: <Preview /> },
          { num: 6, label: "Result", icon: <CheckCircle /> },
        ].map((step) => (
          <div
            key={step.num}
            className={`step-item ${currentStep === step.num ? "active" : ""} ${
              currentStep > step.num ? "completed" : ""
            }`}
          >
            <div className="step-circle">{step.icon}</div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Alerts Banner */}
      {(expiringAllocations.expiring?.length > 0 || expiringAllocations.expired?.length > 0) && (
        <div className={`alerts-banner ${expiringAllocations.expired?.length > 0 ? 'critical' : ''}`}>
          <div className="alerts-icon">
            {expiringAllocations.expired?.length > 0 ? <Warning style={{ fontSize: 28 }} /> : <Notifications style={{ fontSize: 28 }} />}
          </div>
          <div className="alerts-content">
            <h4 className="alerts-title">
              {expiringAllocations.expired?.length > 0 
                ? `${expiringAllocations.expired.length} Allocation(s) Expired!` 
                : `${expiringAllocations.expiring.length} Allocation(s) Expiring Soon`}
            </h4>
            <p className="alerts-message">
              {expiringAllocations.expired?.length > 0 
                ? `${expiringAllocations.expired.length} venue allocation(s) have expired and need immediate attention. ${expiringAllocations.expiring?.length > 0 ? `Additionally, ${expiringAllocations.expiring.length} more will expire within 7 days.` : ''}`
                : `${expiringAllocations.expiring.length} venue allocation(s) will expire within the next 7 days. Consider extending or creating new schedules.`}
            </p>
          </div>
          <button className="alerts-action" onClick={fetchAlerts}>
            View Details
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <ErrorIcon />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">
            <Close />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="allocation-content">
        {/* Step 1: Select Year */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2 className="step-title">
              <School className="step-title-icon" />
              Step 1: Select Academic Year
            </h2>

            <div className="info-box info-blue">
              <Info className="info-icon" />
              <p>Select the academic year for which you want to allocate students to venues.</p>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading years...</div>
            ) : (
              <div className="year-cards">
                {years.map((year) => (
                  <div
                    key={year.year}
                    className={`year-card ${selectedYear === year.year ? "selected" : ""}`}
                    onClick={() => setSelectedYear(year.year)}
                  >
                    <div className="year-value">Year {year.year}</div>
                    <div className="year-stats">
                      <div className="stat">
                        <span className="stat-value">{year.totalStudents}</span>
                        <span className="stat-label">Total</span>
                      </div>
                      <div className="stat highlight">
                        <span className="stat-value">{year.unallocatedStudents}</span>
                        <span className="stat-label">Unallocated</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="button-group end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedYear}
                className="btn btn-primary"
              >
                Next: Set Filters <ArrowForward />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Filters */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2 className="step-title">
              <FilterList className="step-title-icon" />
              Step 2: Configure Filters
            </h2>

            {/* Department Selection */}
            <div className="filter-section">
              <h3 className="section-title">
                Select Departments
                <span className="optional-badge">(Leave empty for all departments)</span>
              </h3>
              
              <div className="department-grid">
                {departments.map((dept) => (
                  <div
                    key={dept.department}
                    className={`department-card ${
                      selectedDepartments.includes(dept.department) ? "selected" : ""
                    }`}
                    onClick={() => toggleDepartment(dept.department)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(dept.department)}
                      onChange={() => {}}
                      className="dept-checkbox"
                    />
                    <span className="dept-name">{dept.department}</span>
                    <span className="dept-count">{dept.unallocated_students} students</span>
                  </div>
                ))}
              </div>

              {selectedDepartments.length > 0 && (
                <div className="selected-info">
                  <strong>{selectedDepartments.length}</strong> department(s) selected with{" "}
                  <strong>{getStudentCount()}</strong> unallocated students
                </div>
              )}
            </div>

            {/* Group Departments (Optional) */}
            <div className="filter-section">
              <h3 className="section-title">
                Group Departments Together
                <span className="optional-badge">(Optional - for core cluster allocation)</span>
              </h3>
              
              <div className="info-box info-yellow">
                <Info className="info-icon" />
                <p>
                  Select departments that should be grouped together. Students from grouped departments
                  will be placed adjacent to each other in venues.
                </p>
              </div>

              <div className="department-grid small">
                {departments.map((dept) => (
                  <button
                    key={dept.department}
                    className={`group-dept-btn ${
                      groupDepartments.includes(dept.department) ? "selected" : ""
                    }`}
                    onClick={() => toggleGroupDepartment(dept.department)}
                  >
                    {dept.department}
                    {groupDepartments.includes(dept.department) && <CheckCircle className="check-icon" />}
                  </button>
                ))}
              </div>

              {groupDepartments.length > 0 && (
                <div className="grouped-tags">
                  <span className="tag-label">Grouped:</span>
                  {groupDepartments.map((dept) => (
                    <span key={dept} className="grouped-tag">
                      {dept}
                      <button onClick={() => toggleGroupDepartment(dept)} className="tag-remove">
                        <Close />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Allocation Mode */}
            <div className="filter-section">
              <h3 className="section-title">Allocation Mode</h3>
              <div className="mode-options">
                <label className={`mode-option ${allocationMode === "department_wise" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="allocationMode"
                    value="department_wise"
                    checked={allocationMode === "department_wise"}
                    onChange={(e) => setAllocationMode(e.target.value)}
                  />
                  <div className="mode-content">
                    <span className="mode-title">Department Wise</span>
                    <span className="mode-desc">Students grouped by department, then sorted by roll number</span>
                  </div>
                </label>
                <label className={`mode-option ${allocationMode === "roll_number_wise" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="allocationMode"
                    value="roll_number_wise"
                    checked={allocationMode === "roll_number_wise"}
                    onChange={(e) => setAllocationMode(e.target.value)}
                  />
                  <div className="mode-content">
                    <span className="mode-title">Roll Number Wise</span>
                    <span className="mode-desc">Students sorted purely by roll number across all departments</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Reserved Slots */}
            <div className="filter-section">
              <h3 className="section-title">Reserved Slots Per Venue</h3>
              <div className="reserved-input-group">
                <input
                  type="number"
                  value={reservedSlots}
                  onChange={(e) => setReservedSlots(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  max="20"
                  className="reserved-input"
                />
                <span className="reserved-hint">seats reserved in each venue for late additions</span>
              </div>
            </div>

            {/* Schedule Dates - NEW */}
            <div className="filter-section">
              <h3 className="section-title">
                <CalendarMonth style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Allocation Schedule
                <span className="optional-badge">(Set validity period for this allocation)</span>
              </h3>
              
              <div className="info-box info-blue">
                <Schedule className="info-icon" />
                <p>
                  Set the start and end date for this venue allocation. You will be notified when the 
                  allocation is about to expire so you can create a new schedule.
                </p>
              </div>

              <div className="schedule-inputs">
                <div className="form-group">
                  <label className="form-label">Batch Name (Optional)</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Spring 2026 Batch, Semester 2 Allocation"
                    className="form-input medium"
                  />
                </div>
                
                <div className="date-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      value={scheduleStartDate}
                      onChange={(e) => setScheduleStartDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      value={scheduleEndDate}
                      onChange={(e) => setScheduleEndDate(e.target.value)}
                      min={scheduleStartDate}
                      className="form-input"
                    />
                  </div>
                </div>
                
                {scheduleEndDate && (
                  <div className="schedule-summary">
                    <span>Duration: </span>
                    <strong>
                      {Math.ceil((new Date(scheduleEndDate) - new Date(scheduleStartDate)) / (1000 * 60 * 60 * 24))} days
                    </strong>
                    <span> ({scheduleStartDate} to {scheduleEndDate})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="button-group between">
              <button onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                <ArrowBack /> Back
              </button>
              <button onClick={handleNextStep} disabled={loading} className="btn btn-primary">
                {loading ? "Loading..." : <>Next: Select Venues <ArrowForward /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Venues */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2 className="step-title">
              <LocationOn className="step-title-icon" />
              Step 3: Select Venues
            </h2>

            <div className="info-box info-green">
              <Info className="info-icon" />
              <div>
                <p><strong>Available Venues from Database</strong></p>
                <p>Uncheck venues that are NOT available for this allocation. Only selected venues will be used.</p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="venue-toolbar">
              <div className="search-box">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search venues..."
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="toolbar-actions">
                <button
                  onClick={() => setSelectedVenueIds(venues.map(v => v.venue_id))}
                  className="btn btn-sm btn-outline"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedVenueIds([])}
                  className="btn btn-sm btn-outline"
                >
                  Deselect All
                </button>
                <button onClick={() => setShowAddVenue(true)} className="btn btn-sm btn-primary">
                  <Add /> Add Venue
                </button>
              </div>
            </div>

            {/* Venue Cards Grid */}
            {loading ? (
              <div className="loading-spinner">Loading venues...</div>
            ) : (
              <div className="venues-grid">
                {filteredVenues.map((venue) => (
                  <div
                    key={venue.venue_id}
                    className={`venue-card ${selectedVenueIds.includes(venue.venue_id) ? "selected" : "excluded"}`}
                    onClick={() => toggleVenue(venue.venue_id)}
                  >
                    <div className="venue-card-header">
                      <input
                        type="checkbox"
                        checked={selectedVenueIds.includes(venue.venue_id)}
                        onChange={() => {}}
                        className="venue-checkbox"
                      />
                      <span className="venue-card-name">{venue.venue_name}</span>
                    </div>
                    <div className="venue-card-body">
                      {venue.location && (
                        <div className="venue-location">
                          <LocationOn className="loc-icon" /> {venue.location}
                        </div>
                      )}
                      <div className="venue-stats-row">
                        <div className="venue-stat">
                          <span className="stat-label">Capacity</span>
                          <span className="stat-value">{venue.capacity}</span>
                        </div>
                        <div className="venue-stat">
                          <span className="stat-label">Current</span>
                          <span className="stat-value">{venue.current_students}</span>
                        </div>
                        <div className="venue-stat highlight">
                          <span className="stat-label">Available</span>
                          <span className="stat-value">
                            {Math.max(0, venue.available_seats - reservedSlots)}
                          </span>
                        </div>
                      </div>
                      {venue.faculty_name && (
                        <div className="venue-faculty">
                          <Person className="fac-icon" /> {venue.faculty_name}
                        </div>
                      )}
                    </div>
                    {!selectedVenueIds.includes(venue.venue_id) && (
                      <div className="venue-excluded-overlay">
                        <span>EXCLUDED</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Capacity Summary */}
            <div className={`capacity-summary ${
              calculateTotalCapacity() >= getStudentCount() ? "sufficient" : "insufficient"
            }`}>
              <div className="capacity-row">
                <div className="capacity-item">
                  <span className="capacity-label">Selected Venues:</span>
                  <span className="capacity-value">{selectedVenueIds.length}</span>
                </div>
                <div className="capacity-item">
                  <span className="capacity-label">Total Available Capacity:</span>
                  <span className="capacity-value">{calculateTotalCapacity()}</span>
                </div>
                <div className="capacity-item">
                  <span className="capacity-label">Students to Allocate:</span>
                  <span className="capacity-value blue">{getStudentCount()}</span>
                </div>
              </div>
              <div className="capacity-status">
                {calculateTotalCapacity() >= getStudentCount() ? (
                  <span className="status-success"><CheckCircle /> Sufficient Capacity</span>
                ) : (
                  <span className="status-error">
                    <ErrorIcon /> Need {getStudentCount() - calculateTotalCapacity()} more seats
                  </span>
                )}
              </div>
            </div>

            <div className="button-group between">
              <button onClick={() => setCurrentStep(2)} className="btn btn-secondary">
                <ArrowBack /> Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={selectedVenueIds.length === 0 || loading}
                className="btn btn-primary"
              >
                {loading ? "Loading..." : <>Next: Review Students <ArrowForward /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Select Students */}
        {currentStep === 4 && (
          <div className="step-content">
            <h2 className="step-title">
              <Person className="step-title-icon" />
              Step 4: Review & Select Students
            </h2>

            <div className="info-box info-blue">
              <Info className="info-icon" />
              <div>
                <p><strong>Student Selection (Optional)</strong></p>
                <p>
                  By default, all unallocated students matching your filters will be allocated.
                  You can optionally deselect specific students to exclude them.
                </p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="student-toolbar">
              <div className="search-box">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name, roll number, or department..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="toolbar-actions">
                <button onClick={handleSelectAllStudents} className="btn btn-sm btn-outline">
                  Select All ({students.length})
                </button>
                <button onClick={handleClearStudentSelection} className="btn btn-sm btn-outline">
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Selection Summary */}
            <div className="selection-summary">
              <span className="summary-text">
                {selectAllStudents ? (
                  <>All <strong>{students.length}</strong> students selected</>
                ) : (
                  <><strong>{selectedStudentIds.length}</strong> of <strong>{students.length}</strong> students selected</>
                )}
              </span>
            </div>

            {/* Student Table */}
            {loading ? (
              <div className="loading-spinner">Loading students...</div>
            ) : (
              <div className="students-table-container">
                <table className="students-table venue-mapping-table">
                  <thead>
                    <tr>
                      <th className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectAllStudents || selectedStudentIds.length === students.length}
                          onChange={() => selectAllStudents ? handleClearStudentSelection() : handleSelectAllStudents()}
                        />
                      </th>
                      <th>#</th>
                      <th>Roll Number</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Current Venue</th>
                      <th>Allocation Status</th>
                      <th>Schedule End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => {
                      const isAllocated = !!student.current_venue_id;
                      const isExpiringSoon = student.schedule_end_date && 
                        new Date(student.schedule_end_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                      const isExpired = student.schedule_end_date && 
                        new Date(student.schedule_end_date) < new Date();
                      
                      return (
                        <tr
                          key={student.student_id}
                          className={`
                            ${selectedStudentIds.includes(student.student_id) || selectAllStudents ? "selected" : "excluded"}
                            ${isAllocated ? "allocated-row" : "unallocated-row"}
                            ${isExpiringSoon && !isExpired ? "expiring-soon-row" : ""}
                            ${isExpired ? "expired-row" : ""}
                          `}
                          onClick={() => toggleStudent(student.student_id)}
                        >
                          <td className="checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(student.student_id) || selectAllStudents}
                              onChange={() => {}}
                            />
                          </td>
                          <td>{idx + 1}</td>
                          <td className="roll-number">{student.roll_number}</td>
                          <td>{student.name}</td>
                          <td>
                            <span className="dept-badge">{student.department}</span>
                          </td>
                          <td>
                            {isAllocated ? (
                              <span className="venue-badge allocated">
                                <Business style={{ fontSize: 14 }} />
                                {student.current_venue_name}
                              </span>
                            ) : (
                              <span className="venue-badge not-allocated">
                                Not Allocated
                              </span>
                            )}
                          </td>
                          <td>
                            {isExpired ? (
                              <span className="status-badge expired">
                                <Warning style={{ fontSize: 14 }} />
                                Expired
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="status-badge expiring">
                                <Schedule style={{ fontSize: 14 }} />
                                Expiring Soon
                              </span>
                            ) : isAllocated ? (
                              <span className="status-badge active">
                                Active
                              </span>
                            ) : (
                              <span className="status-badge pending">
                                Pending
                              </span>
                            )}
                          </td>
                          <td>
                            {student.schedule_end_date ? (
                              <span className={`date-text ${isExpired ? 'expired' : isExpiringSoon ? 'expiring' : ''}`}>
                                {new Date(student.schedule_end_date).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="date-text no-date">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="button-group between">
              <button onClick={() => setCurrentStep(3)} className="btn btn-secondary">
                <ArrowBack /> Back
              </button>
              <button
                onClick={handlePreview}
                disabled={(!selectAllStudents && selectedStudentIds.length === 0) || loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <><div className="btn-spinner"></div> Generating Preview...</>
                ) : (
                  <>Generate Preview <Preview /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {currentStep === 5 && previewData && (
          <div className="step-content">
            <h2 className="step-title">
              <Preview className="step-title-icon" />
              Step 5: Preview Allocation
            </h2>

            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card blue">
                <p className="summary-value">{previewData.summary.totalStudents}</p>
                <p className="summary-label">Total Students</p>
              </div>
              <div className="summary-card green">
                <p className="summary-value">{previewData.summary.totalVenuesUsed}</p>
                <p className="summary-label">Venues Used</p>
              </div>
              <div className="summary-card yellow">
                <p className="summary-value">{previewData.summary.reservedSlotsPerVenue}</p>
                <p className="summary-label">Reserved/Venue</p>
              </div>
              <div className="summary-card purple">
                <p className="summary-value">{previewData.summary.totalVenuesSelected}</p>
                <p className="summary-label">Venues Selected</p>
              </div>
            </div>

            {/* Group Specification */}
            <div className="form-group">
              <label className="form-label">Group Specification (Optional)</label>
              <input
                type="text"
                value={groupSpecification}
                onChange={(e) => setGroupSpecification(e.target.value)}
                placeholder="e.g., PBL Session, Regular Lab, Oracle Training"
                className="form-input medium"
              />
            </div>

            {/* Venue Utilization */}
            <div className="utilization-section">
              <h3 className="section-title">Venue Utilization</h3>
              <div className="utilization-list">
                {previewData.summary.venueUtilization.map((venue, idx) => (
                  <div key={idx} className="utilization-item">
                    <div className="utilization-header">
                      <span className="venue-name">{venue.name}</span>
                      <span className="venue-info">
                        {venue.existing > 0 && `${venue.existing} existing + `}
                        {venue.newlyAllocated} new = {venue.totalAfter} / {venue.capacity}
                      </span>
                    </div>
                    <div className="progress-bar">
                      {venue.existing > 0 && (
                        <div 
                          className="progress-fill existing"
                          style={{ width: `${(venue.existing / venue.capacity) * 100}%` }}
                        />
                      )}
                      <div 
                        className="progress-fill new"
                        style={{ 
                          width: `${(venue.newlyAllocated / venue.capacity) * 100}%`,
                          marginLeft: venue.existing > 0 ? `${(venue.existing / venue.capacity) * 100}%` : 0
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Allocation */}
            <div className="allocation-section">
              <h3 className="section-title">Detailed Allocation</h3>
              <div className="allocation-list">
                {previewData.allocation.map((venueAlloc, idx) => (
                  <div key={idx} className="allocation-item">
                    <div className="allocation-header">
                      <span className="venue-name">{venueAlloc.venue.venue_name}</span>
                      <span className="badge badge-blue">{venueAlloc.students.length} new students</span>
                    </div>
                    <div className="allocation-body">
                      <div className="dept-badges">
                        {Object.entries(venueAlloc.departmentBreakdown).map(([dept, count]) => (
                          <span key={dept} className="badge badge-gray">{dept}: {count}</span>
                        ))}
                      </div>
                      <details className="student-details">
                        <summary>View student list ({venueAlloc.students.length})</summary>
                        <div className="student-table-container">
                          <table className="data-table small">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Roll</th>
                                <th>Name</th>
                                <th>Department</th>
                              </tr>
                            </thead>
                            <tbody>
                              {venueAlloc.students.map((student, sIdx) => (
                                <tr key={sIdx}>
                                  <td>{sIdx + 1}</td>
                                  <td>{student.roll_number}</td>
                                  <td>{student.name}</td>
                                  <td>{student.department}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="button-group between">
              <button onClick={() => setCurrentStep(4)} className="btn btn-secondary">
                <ArrowBack /> Back
              </button>
              <button onClick={handleExecute} disabled={loading} className="btn btn-success">
                {loading ? (
                  <><div className="btn-spinner"></div> Executing...</>
                ) : (
                  <><PlayArrow /> Execute Allocation</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Result */}
        {currentStep === 6 && allocationResult && (
          <div className="step-content">
            <h2 className="step-title">
              <CheckCircle className="step-title-icon success" />
              Allocation Complete!
            </h2>

            <div className="success-box">
              <CheckCircle className="success-icon" />
              <h3 className="success-title">Successfully Allocated!</h3>
              <p className="success-text">
                {allocationResult.totalAllocated} students have been allocated to {allocationResult.venuesUsed} venues.
              </p>
            </div>

            {/* Result List */}
            <div className="result-list">
              {allocationResult.allocation.map((venue, idx) => (
                <div key={idx} className="result-item">
                  <div className="result-info">
                    <h4 className="result-name">{venue.venue_name}</h4>
                    <p className="result-meta">
                      Group: {venue.group_name}
                    </p>
                  </div>
                  <div className="result-stats">
                    <div className="result-stat">
                      <span className="result-value">{venue.existing_students}</span>
                      <span className="result-label">Existing</span>
                    </div>
                    <span className="result-plus">+</span>
                    <div className="result-stat highlight">
                      <span className="result-value">{venue.newly_allocated}</span>
                      <span className="result-label">New</span>
                    </div>
                    <span className="result-equals">=</span>
                    <div className="result-stat">
                      <span className="result-value">{venue.total_students}</span>
                      <span className="result-label">/{venue.capacity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="button-group center">
              <button onClick={resetWizard} className="btn btn-primary">
                <Refresh /> New Allocation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Venue Modal */}
      {showAddVenue && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <Add className="modal-icon" />
              <h3 className="modal-title">Add New Venue</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Venue Name *</label>
                <input
                  type="text"
                  value={newVenue.venue_name}
                  onChange={(e) => setNewVenue({ ...newVenue, venue_name: e.target.value })}
                  placeholder="e.g., Lab 101, Hall A"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  value={newVenue.capacity}
                  onChange={(e) => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  value={newVenue.location}
                  onChange={(e) => setNewVenue({ ...newVenue, location: e.target.value })}
                  placeholder="e.g., Block A, Floor 2"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAddVenue(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAddVenue}
                disabled={!newVenue.venue_name || !newVenue.capacity || loading}
                className="btn btn-primary"
              >
                {loading ? "Creating..." : "Create Venue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueAllocation;
