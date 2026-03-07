import { useState, useEffect, useMemo } from "react";
import {
  School,
  LocationOn,
  Person,
  PlayArrow,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Refresh,
  Error as ErrorIcon,
  Search,
  Close,
  Add,
  CalendarMonth,
  Warning,
  AutoFixHigh,
  TouchApp,
  Speed,
  Groups,
  Business,
  Tune,
  ViewList,
  Analytics,
} from "@mui/icons-material";
import { apiGet, apiPost } from "../../../../utils/api";
import "./VenueAllocation.css";

const VenueAllocation = () => {
  // Step state: 1 = Year, 2 = Schedule & Filters, 3 = Venues, 4 = Preview, 5 = Result
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
  const [reservedSlots, setReservedSlots] = useState(2);

  // Schedule dates
  const [scheduleStartDate, setScheduleStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scheduleEndDate, setScheduleEndDate] = useState("");
  const [batchName, setBatchName] = useState("");
  const [scheduleConflict, setScheduleConflict] = useState(null);
  const [isCheckingSchedule, setIsCheckingSchedule] = useState(false);

  // NEW: Venue Selection Mode - Auto or Manual
  const [venueSelectionMode, setVenueSelectionMode] = useState("auto");

  // Step 3: Venue selection
  const [venues, setVenues] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueLocations, setVenueLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Step 4: Preview
  const [previewData, setPreviewData] = useState(null);
  const [groupSpecification, setGroupSpecification] = useState("");

  // Step 5: Result
  const [allocationResult, setAllocationResult] = useState(null);

  // Modal for adding new venue
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [newVenue, setNewVenue] = useState({
    venue_name: "",
    capacity: 60,
    location: "",
  });

  // Alerts
  const [expiringAllocations, setExpiringAllocations] = useState({ expiring: [], expired: [] });

  // Helper function for student count
  const getStudentCount = () => {
    if (selectedDepartments.length === 0) {
      return departments.reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
    }
    return departments
      .filter(d => selectedDepartments.includes(d.department))
      .reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
  };

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

  const fetchAlerts = async () => {
    try {
      const expiringRes = await apiGet("/venue-allocation/expiring?days=7");
      const expiringData = await expiringRes.json();
      if (expiringData.success) {
        setExpiringAllocations(expiringData.data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

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

  const checkScheduleConflict = async () => {
    if (!scheduleStartDate || !scheduleEndDate) {
      setError("Please select both start and end dates");
      return false;
    }

    try {
      setIsCheckingSchedule(true);
      const response = await apiPost("/venue-allocation/check-schedule", {
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
        year: selectedYear
      });
      const data = await response.json();
      
      if (data.success) {
        setScheduleConflict(data);
        return !data.hasConflict;
      }
      return false;
    } catch (err) {
      setError("Failed to check schedule availability");
      return false;
    } finally {
      setIsCheckingSchedule(false);
    }
  };

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await apiGet("/venue-allocation/venues");
      const data = await response.json();
      if (data.success) {
        setVenues(data.data);
      }
    } catch (err) {
      setError("Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  const fetchVenueLocations = async () => {
    try {
      const response = await apiGet("/venue-allocation/locations");
      const data = await response.json();
      if (data.success) {
        setVenueLocations(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch venue locations:", err);
    }
  };

  // AUTO VENUE SELECTION LOGIC
  const getAutoSelectedVenues = useMemo(() => {
    const studentCount = getStudentCount();
    if (!venues.length || studentCount === 0) return [];

    // Sort venues by available seats (descending) and group by location
    const sortedVenues = [...venues]
      .filter(v => v.available_seats > reservedSlots)
      .sort((a, b) => {
        const locCompare = (a.location || '').localeCompare(b.location || '');
        if (locCompare !== 0) return locCompare;
        return b.available_seats - a.available_seats;
      });

    const selectedVenues = [];
    let remainingStudents = studentCount;

    for (const venue of sortedVenues) {
      if (remainingStudents <= 0) break;
      
      const effectiveCapacity = Math.max(0, venue.available_seats - reservedSlots);
      if (effectiveCapacity > 0) {
        selectedVenues.push(venue.venue_id);
        remainingStudents -= effectiveCapacity;
      }
    }

    return selectedVenues;
  }, [venues, selectedDepartments, departments, reservedSlots]);

  // Apply auto selection when mode changes or data updates
  useEffect(() => {
    if (venueSelectionMode === 'auto' && venues.length > 0) {
      setSelectedVenueIds(getAutoSelectedVenues);
    }
  }, [venueSelectionMode, getAutoSelectedVenues, venues]);

  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const venueIdsToUse = venueSelectionMode === 'auto' ? getAutoSelectedVenues : selectedVenueIds;

      const payload = {
        year: selectedYear,
        venueIds: venueIdsToUse,
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        reservedSlots,
        allocationMode,
      };

      const response = await apiPost("/venue-allocation/preview", payload);
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
        setCurrentStep(4);
      } else {
        setError(data.message || "Failed to generate preview");
      }
    } catch (err) {
      setError(err.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      setLoading(true);
      setError(null);

      const venueIdsToUse = venueSelectionMode === 'auto' ? getAutoSelectedVenues : selectedVenueIds;

      const payload = {
        year: selectedYear,
        venueIds: venueIdsToUse,
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        reservedSlots,
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
        setCurrentStep(5);
      } else {
        setError(data.message || "Failed to execute allocation");
      }
    } catch (err) {
      setError(err.message || "Failed to execute allocation");
    } finally {
      setLoading(false);
    }
  };

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

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleVenue = (venueId) => {
    if (venueSelectionMode === 'auto') return;
    setSelectedVenueIds(prev =>
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  const calculateTotalCapacity = () => {
    const venueIdsToUse = venueSelectionMode === 'auto' ? getAutoSelectedVenues : selectedVenueIds;
    return venues
      .filter(v => venueIdsToUse.includes(v.venue_id))
      .reduce((sum, v) => sum + Math.max(0, v.available_seats - reservedSlots), 0);
  };

  const filteredVenues = venues.filter(v => {
    const matchesSearch = v.venue_name.toLowerCase().includes(venueSearch.toLowerCase()) ||
      v.location?.toLowerCase().includes(venueSearch.toLowerCase());
    const matchesLocation = !selectedLocation || v.location === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  const venuesByLocation = filteredVenues.reduce((acc, venue) => {
    const loc = venue.location || 'Unspecified';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(venue);
    return acc;
  }, {});

  const resetWizard = () => {
    setCurrentStep(1);
    setSelectedYear(null);
    setSelectedDepartments([]);
    setSelectedVenueIds([]);
    setPreviewData(null);
    setAllocationResult(null);
    setError(null);
    setScheduleConflict(null);
    setScheduleStartDate(new Date().toISOString().split("T")[0]);
    setScheduleEndDate("");
    setBatchName("");
    setVenueSelectionMode("auto");
  };

  const handleNextStep = async () => {
    if (currentStep === 2) {
      await Promise.all([fetchVenues(), fetchVenueLocations()]);
      setCurrentStep(3);
    }
  };

  const steps = [
    { num: 1, label: "Year", icon: <School /> },
    { num: 2, label: "Schedule", icon: <CalendarMonth /> },
    { num: 3, label: "Venues", icon: <LocationOn /> },
    { num: 4, label: "Preview", icon: <ViewList /> },
    { num: 5, label: "Result", icon: <CheckCircle /> },
  ];

  const activeVenueIds = venueSelectionMode === 'auto' ? getAutoSelectedVenues : selectedVenueIds;

  return (
    <div className="va-container">
      {/* Header */}
      <header className="va-header">
        <div className="va-header-content">
          <div className="va-header-icon">
            <Business />
          </div>
          <div className="va-header-text">
            <h1>Venue Allocation</h1>
            <p>Dynamically allocate students to venues based on year, department, and custom filters</p>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <nav className="va-progress">
        {steps.map((step, idx) => (
          <div key={step.num} className="va-progress-item">
            <div
              className={`va-step ${currentStep === step.num ? "active" : ""} ${
                currentStep > step.num ? "completed" : ""
              }`}
            >
              <div className="va-step-circle">
                {currentStep > step.num ? <CheckCircle /> : step.icon}
              </div>
              <span className="va-step-label">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`va-step-connector ${currentStep > step.num ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </nav>

      {/* Alerts Banner */}
      {(expiringAllocations.expiring?.length > 0 || expiringAllocations.expired?.length > 0) && (
        <div className={`va-alert ${expiringAllocations.expired?.length > 0 ? 'critical' : 'warning'}`}>
          <Warning />
          <div className="va-alert-content">
            <strong>
              {expiringAllocations.expired?.length > 0 
                ? `${expiringAllocations.expired.length} Allocation(s) Expired!` 
                : `${expiringAllocations.expiring.length} Allocation(s) Expiring Soon`}
            </strong>
            <span>
              {expiringAllocations.expired?.length > 0 
                ? "Immediate attention required." 
                : "Consider extending or creating new schedules."}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="va-error">
          <ErrorIcon />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <Close />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="va-main">
        {/* Step 1: Select Year */}
        {currentStep === 1 && (
          <section className="va-section">
            <div className="va-section-header">
              <School className="va-section-icon" />
              <div>
                <h2>Select Academic Year</h2>
                <p>Choose the year for which you want to allocate students</p>
              </div>
            </div>

            {loading ? (
              <div className="va-loading">
                <div className="va-spinner" />
                <span>Loading years...</span>
              </div>
            ) : (
              <div className="va-year-grid">
                {years.map((year) => (
                  <div
                    key={year.year}
                    className={`va-year-card ${selectedYear === year.year ? "selected" : ""}`}
                    onClick={() => setSelectedYear(year.year)}
                  >
                    <div className="va-year-badge">Year {year.year}</div>
                    <div className="va-year-stats">
                      <div className="va-stat">
                        <span className="va-stat-value">{year.totalStudents}</span>
                        <span className="va-stat-label">Total</span>
                      </div>
                      <div className="va-stat highlight">
                        <span className="va-stat-value">{year.unallocatedStudents}</span>
                        <span className="va-stat-label">Unallocated</span>
                      </div>
                    </div>
                    {selectedYear === year.year && (
                      <div className="va-selected-indicator">
                        <CheckCircle />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="va-actions end">
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!selectedYear}
                className="va-btn primary"
              >
                Continue <ArrowForward />
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Schedule & Filters */}
        {currentStep === 2 && (
          <section className="va-section">
            <div className="va-section-header">
              <CalendarMonth className="va-section-icon" />
              <div>
                <h2>Schedule & Filters</h2>
                <p>Set the allocation schedule and filter options</p>
              </div>
            </div>

            {/* Schedule Card */}
            <div className="va-card">
              <div className="va-card-header">
                <CalendarMonth />
                <h3>Schedule Period</h3>
                <span className="va-badge required">Required</span>
              </div>
              <div className="va-card-body">
                <div className="va-form-group">
                  <label>Batch Name (Optional)</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g., Spring 2026 Batch"
                    className="va-input"
                  />
                </div>
                
                <div className="va-form-row">
                  <div className="va-form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={scheduleStartDate}
                      onChange={(e) => {
                        setScheduleStartDate(e.target.value);
                        setScheduleConflict(null);
                      }}
                      className="va-input"
                    />
                  </div>
                  
                  <div className="va-form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={scheduleEndDate}
                      onChange={(e) => {
                        setScheduleEndDate(e.target.value);
                        setScheduleConflict(null);
                      }}
                      min={scheduleStartDate}
                      className="va-input"
                    />
                  </div>
                </div>
                
                {scheduleEndDate && (
                  <div className="va-schedule-duration">
                    <span>Duration:</span>
                    <strong>
                      {Math.ceil((new Date(scheduleEndDate) - new Date(scheduleStartDate)) / (1000 * 60 * 60 * 24))} days
                    </strong>
                  </div>
                )}

                <button 
                  onClick={checkScheduleConflict}
                  disabled={!scheduleStartDate || !scheduleEndDate || isCheckingSchedule}
                  className="va-btn secondary"
                >
                  {isCheckingSchedule ? (
                    <><div className="va-btn-spinner" /> Checking...</>
                  ) : (
                    <>Check Availability</>
                  )}
                </button>

                {scheduleConflict && (
                  <div className={`va-schedule-result ${scheduleConflict.hasConflict ? 'conflict' : 'available'}`}>
                    {scheduleConflict.hasConflict ? (
                      <>
                        <Warning />
                        <div>
                          <strong>Schedule Already Exists!</strong>
                          <p>Please select different dates.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle />
                        <div>
                          <strong>Dates Available!</strong>
                          <p>You can proceed with the allocation.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Show rest only if schedule is valid */}
            {scheduleConflict && !scheduleConflict.hasConflict && (
              <>
                {/* Department Selection */}
                <div className="va-card">
                  <div className="va-card-header">
                    <Groups />
                    <h3>Select Departments</h3>
                    <span className="va-badge optional">Leave empty for all</span>
                  </div>
                  <div className="va-card-body">
                    <div className="va-dept-grid">
                      {departments.map((dept) => (
                        <div
                          key={dept.department}
                          className={`va-dept-card ${
                            selectedDepartments.includes(dept.department) ? "selected" : ""
                          }`}
                          onClick={() => toggleDepartment(dept.department)}
                        >
                          <div className="va-dept-checkbox">
                            {selectedDepartments.includes(dept.department) && <CheckCircle />}
                          </div>
                          <span className="va-dept-name">{dept.department}</span>
                          <span className="va-dept-count">{dept.unallocated_students}</span>
                        </div>
                      ))}
                    </div>
                    {selectedDepartments.length > 0 && (
                      <div className="va-selection-summary">
                        <strong>{selectedDepartments.length}</strong> department(s) with{" "}
                        <strong>{getStudentCount()}</strong> students
                      </div>
                    )}
                  </div>
                </div>

                {/* Allocation Mode */}
                <div className="va-card">
                  <div className="va-card-header">
                    <Tune />
                    <h3>Allocation Settings</h3>
                  </div>
                  <div className="va-card-body">
                    <div className="va-mode-grid">
                      <div
                        className={`va-mode-option ${allocationMode === "department_wise" ? "selected" : ""}`}
                        onClick={() => setAllocationMode("department_wise")}
                      >
                        <div className="va-mode-radio">
                          {allocationMode === "department_wise" && <div className="va-radio-dot" />}
                        </div>
                        <div className="va-mode-content">
                          <strong>Department Wise</strong>
                          <span>Group students by department, then by roll number</span>
                        </div>
                      </div>
                      <div
                        className={`va-mode-option ${allocationMode === "roll_number_wise" ? "selected" : ""}`}
                        onClick={() => setAllocationMode("roll_number_wise")}
                      >
                        <div className="va-mode-radio">
                          {allocationMode === "roll_number_wise" && <div className="va-radio-dot" />}
                        </div>
                        <div className="va-mode-content">
                          <strong>Roll Number Wise</strong>
                          <span>Sort purely by roll number across all departments</span>
                        </div>
                      </div>
                    </div>

                    <div className="va-form-group inline">
                      <label>Reserved Slots per Venue</label>
                      <input
                        type="number"
                        value={reservedSlots}
                        onChange={(e) => setReservedSlots(Math.max(0, parseInt(e.target.value) || 0))}
                        min="0"
                        max="20"
                        className="va-input small"
                      />
                      <span className="va-hint">seats reserved for late additions</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="va-actions between">
              <button onClick={() => setCurrentStep(1)} className="va-btn secondary">
                <ArrowBack /> Back
              </button>
              <button 
                onClick={handleNextStep} 
                disabled={loading || !scheduleConflict || scheduleConflict.hasConflict} 
                className="va-btn primary"
              >
                Continue <ArrowForward />
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Venue Selection */}
        {currentStep === 3 && (
          <section className="va-section">
            <div className="va-section-header">
              <LocationOn className="va-section-icon" />
              <div>
                <h2>Select Venues</h2>
                <p>Choose how venues should be selected for allocation</p>
              </div>
            </div>

            {/* Venue Selection Mode Toggle */}
            <div className="va-mode-toggle">
              <button
                className={`va-mode-btn ${venueSelectionMode === 'auto' ? 'active' : ''}`}
                onClick={() => setVenueSelectionMode('auto')}
              >
                <AutoFixHigh />
                <div>
                  <strong>Auto Select</strong>
                  <span>AI-optimized venue selection</span>
                </div>
              </button>
              <button
                className={`va-mode-btn ${venueSelectionMode === 'manual' ? 'active' : ''}`}
                onClick={() => setVenueSelectionMode('manual')}
              >
                <TouchApp />
                <div>
                  <strong>Manual Select</strong>
                  <span>Choose venues yourself</span>
                </div>
              </button>
            </div>

            {/* Auto Selection Info */}
            {venueSelectionMode === 'auto' && (
              <div className="va-auto-info">
                <Speed />
                <div>
                  <strong>Smart Venue Selection Active</strong>
                  <p>
                    System has automatically selected <strong>{getAutoSelectedVenues.length}</strong> optimal venues 
                    based on {getStudentCount()} students to allocate. Venues are selected to maximize space 
                    efficiency and minimize fragmentation.
                  </p>
                </div>
              </div>
            )}

            {/* Manual Mode Tools */}
            {venueSelectionMode === 'manual' && (
              <div className="va-toolbar">
                <div className="va-search">
                  <Search />
                  <input
                    type="text"
                    placeholder="Search venues..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                  />
                </div>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="va-select"
                >
                  <option value="">All Locations</option>
                  {venueLocations.map((loc) => (
                    <option key={loc.location} value={loc.location}>
                      {loc.location} ({loc.venue_count} venues)
                    </option>
                  ))}
                </select>
                <div className="va-toolbar-actions">
                  <button
                    onClick={() => setSelectedVenueIds(venues.map(v => v.venue_id))}
                    className="va-btn-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedVenueIds([])}
                    className="va-btn-sm"
                  >
                    Clear
                  </button>
                  <button onClick={() => setShowAddVenue(true)} className="va-btn-sm primary">
                    <Add /> Add Venue
                  </button>
                </div>
              </div>
            )}

            {/* Venue Grid */}
            {loading ? (
              <div className="va-loading">
                <div className="va-spinner" />
                <span>Loading venues...</span>
              </div>
            ) : (
              <div className="va-venue-grid">
                {Object.entries(venuesByLocation).map(([location, locationVenues]) => (
                  <div key={location} className="va-venue-group">
                    <div className="va-venue-group-header">
                      <LocationOn />
                      <span>{location}</span>
                      <span className="va-count-badge">{locationVenues.length}</span>
                    </div>
                    <div className="va-venue-cards">
                      {locationVenues.map((venue) => {
                        const isSelected = activeVenueIds.includes(venue.venue_id);
                        return (
                          <div
                            key={venue.venue_id}
                            className={`va-venue-card ${isSelected ? "selected" : ""} ${
                              venueSelectionMode === 'auto' ? "auto-mode" : ""
                            }`}
                            onClick={() => toggleVenue(venue.venue_id)}
                          >
                            <div className="va-venue-header">
                              <span className="va-venue-name">{venue.venue_name}</span>
                              {isSelected && <CheckCircle className="va-check" />}
                            </div>
                            <div className="va-venue-stats">
                              <div className="va-venue-stat">
                                <span className="va-venue-stat-value">{venue.capacity}</span>
                                <span className="va-venue-stat-label">Capacity</span>
                              </div>
                              <div className="va-venue-stat">
                                <span className="va-venue-stat-value">{venue.current_students}</span>
                                <span className="va-venue-stat-label">Current</span>
                              </div>
                              <div className="va-venue-stat highlight">
                                <span className="va-venue-stat-value">
                                  {Math.max(0, venue.available_seats - reservedSlots)}
                                </span>
                                <span className="va-venue-stat-label">Available</span>
                              </div>
                            </div>
                            {venue.faculty_name && (
                              <div className="va-venue-faculty">
                                <Person /> {venue.faculty_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Capacity Summary */}
            <div className={`va-capacity-summary ${
              calculateTotalCapacity() >= getStudentCount() ? "sufficient" : "insufficient"
            }`}>
              <div className="va-capacity-items">
                <div className="va-capacity-item">
                  <span className="va-capacity-label">Selected Venues</span>
                  <span className="va-capacity-value">{activeVenueIds.length}</span>
                </div>
                <div className="va-capacity-item">
                  <span className="va-capacity-label">Total Capacity</span>
                  <span className="va-capacity-value">{calculateTotalCapacity()}</span>
                </div>
                <div className="va-capacity-item">
                  <span className="va-capacity-label">Students</span>
                  <span className="va-capacity-value primary">{getStudentCount()}</span>
                </div>
              </div>
              <div className="va-capacity-status">
                {calculateTotalCapacity() >= getStudentCount() ? (
                  <><CheckCircle /> Sufficient Capacity</>
                ) : (
                  <><ErrorIcon /> Need {getStudentCount() - calculateTotalCapacity()} more seats</>
                )}
              </div>
            </div>

            <div className="va-actions between">
              <button onClick={() => setCurrentStep(2)} className="va-btn secondary">
                <ArrowBack /> Back
              </button>
              <button
                onClick={handlePreview}
                disabled={activeVenueIds.length === 0 || loading}
                className="va-btn primary"
              >
                Preview Allocation <ArrowForward />
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Preview */}
        {currentStep === 4 && previewData && (
          <section className="va-section">
            <div className="va-section-header">
              <Analytics className="va-section-icon" />
              <div>
                <h2>Preview Allocation</h2>
                <p>Review the allocation before executing</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="va-summary-grid">
              <div className="va-summary-card blue">
                <span className="va-summary-value">{previewData.summary.totalStudents}</span>
                <span className="va-summary-label">Total Students</span>
              </div>
              <div className="va-summary-card green">
                <span className="va-summary-value">{previewData.summary.totalVenuesUsed}</span>
                <span className="va-summary-label">Venues Used</span>
              </div>
              <div className="va-summary-card yellow">
                <span className="va-summary-value">{previewData.summary.reservedSlotsPerVenue}</span>
                <span className="va-summary-label">Reserved/Venue</span>
              </div>
              <div className="va-summary-card purple">
                <span className="va-summary-value">{activeVenueIds.length}</span>
                <span className="va-summary-label">Venues Selected</span>
              </div>
            </div>

            {/* Group Specification */}
            <div className="va-card">
              <div className="va-card-body">
                <div className="va-form-group">
                  <label>Group Specification (Optional)</label>
                  <input
                    type="text"
                    value={groupSpecification}
                    onChange={(e) => setGroupSpecification(e.target.value)}
                    placeholder="e.g., PBL Session, Regular Lab"
                    className="va-input"
                  />
                </div>
              </div>
            </div>

            {/* Venue Utilization */}
            <div className="va-card">
              <div className="va-card-header">
                <Analytics />
                <h3>Venue Utilization</h3>
              </div>
              <div className="va-card-body">
                <div className="va-utilization-list">
                  {previewData.summary.venueUtilization.map((venue, idx) => (
                    <div key={idx} className="va-utilization-item">
                      <div className="va-utilization-header">
                        <span className="va-venue-label">{venue.name}</span>
                        <span className="va-venue-info">
                          {venue.existing > 0 && `${venue.existing} existing + `}
                          {venue.newlyAllocated} new = {venue.totalAfter} / {venue.capacity}
                        </span>
                      </div>
                      <div className="va-progress-bar">
                        {venue.existing > 0 && (
                          <div 
                            className="va-progress-fill existing"
                            style={{ width: `${(venue.existing / venue.capacity) * 100}%` }}
                          />
                        )}
                        <div 
                          className="va-progress-fill new"
                          style={{ 
                            width: `${(venue.newlyAllocated / venue.capacity) * 100}%`,
                            left: venue.existing > 0 ? `${(venue.existing / venue.capacity) * 100}%` : 0
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Allocation */}
            <div className="va-card">
              <div className="va-card-header">
                <ViewList />
                <h3>Detailed Allocation</h3>
              </div>
              <div className="va-card-body">
                {previewData.allocation.map((venueAlloc, idx) => (
                  <div key={idx} className="va-allocation-item">
                    <div className="va-allocation-header">
                      <span className="va-venue-label">{venueAlloc.venue.venue_name}</span>
                      <span className="va-badge info">{venueAlloc.students.length} students</span>
                    </div>
                    <div className="va-dept-badges">
                      {Object.entries(venueAlloc.departmentBreakdown).map(([dept, count]) => (
                        <span key={dept} className="va-dept-badge">{dept}: {count}</span>
                      ))}
                    </div>
                    <details className="va-details">
                      <summary>View student list</summary>
                      <table className="va-table">
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
                    </details>
                  </div>
                ))}
              </div>
            </div>

            <div className="va-actions between">
              <button onClick={() => setCurrentStep(3)} className="va-btn secondary">
                <ArrowBack /> Back
              </button>
              <button onClick={handleExecute} disabled={loading} className="va-btn success">
                {loading ? (
                  <><div className="va-btn-spinner" /> Executing...</>
                ) : (
                  <><PlayArrow /> Execute Allocation</>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Result */}
        {currentStep === 5 && allocationResult && (
          <section className="va-section">
            <div className="va-success-box">
              <CheckCircle className="va-success-icon" />
              <h2>Allocation Complete!</h2>
              <p>
                Successfully allocated <strong>{allocationResult.totalAllocated}</strong> students 
                to <strong>{allocationResult.venuesUsed}</strong> venues.
              </p>
            </div>

            <div className="va-result-list">
              {allocationResult.allocation.map((venue, idx) => (
                <div key={idx} className="va-result-item">
                  <div className="va-result-info">
                    <h4>{venue.venue_name}</h4>
                    <span>{venue.group_name}</span>
                  </div>
                  <div className="va-result-stats">
                    <div className="va-result-stat">
                      <span className="va-result-value">{venue.existing_students}</span>
                      <span>Existing</span>
                    </div>
                    <span className="va-result-op">+</span>
                    <div className="va-result-stat highlight">
                      <span className="va-result-value">{venue.newly_allocated}</span>
                      <span>New</span>
                    </div>
                    <span className="va-result-op">=</span>
                    <div className="va-result-stat">
                      <span className="va-result-value">{venue.total_students}/{venue.capacity}</span>
                      <span>Total</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="va-actions center">
              <button onClick={resetWizard} className="va-btn primary">
                <Refresh /> New Allocation
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Add Venue Modal */}
      {showAddVenue && (
        <div className="va-modal-overlay" onClick={() => setShowAddVenue(false)}>
          <div className="va-modal" onClick={(e) => e.stopPropagation()}>
            <div className="va-modal-header">
              <h3><Add /> Add New Venue</h3>
              <button onClick={() => setShowAddVenue(false)}>
                <Close />
              </button>
            </div>
            <div className="va-modal-body">
              <div className="va-form-group">
                <label>Venue Name *</label>
                <input
                  type="text"
                  value={newVenue.venue_name}
                  onChange={(e) => setNewVenue({ ...newVenue, venue_name: e.target.value })}
                  placeholder="e.g., Lab 101"
                  className="va-input"
                />
              </div>
              <div className="va-form-group">
                <label>Capacity *</label>
                <input
                  type="number"
                  value={newVenue.capacity}
                  onChange={(e) => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  className="va-input"
                />
              </div>
              <div className="va-form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newVenue.location}
                  onChange={(e) => setNewVenue({ ...newVenue, location: e.target.value })}
                  placeholder="e.g., Block A"
                  className="va-input"
                />
              </div>
            </div>
            <div className="va-modal-actions">
              <button onClick={() => setShowAddVenue(false)} className="va-btn secondary">
                Cancel
              </button>
              <button
                onClick={handleAddVenue}
                disabled={!newVenue.venue_name || !newVenue.capacity || loading}
                className="va-btn primary"
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
