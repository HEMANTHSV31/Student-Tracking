import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Users, Calendar, 
  CheckCircle, AlertTriangle, X, RefreshCw, MapPin, Zap, 
  RotateCcw, Info, ChevronRight
} from 'lucide-react';
import { apiGet, apiPost } from '../../../../utils/api';
import './VenueAllocation.css';

const VenueAllocation = () => {
  const navigate = useNavigate();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP STATE - Simple 4-step wizard
  // ═══════════════════════════════════════════════════════════════════════════
  const [currentStep, setCurrentStep] = useState(1);
  // Step 1: Select Year
  // Step 2: Select Departments to Merge
  // Step 3: Select Venues
  // Step 4: Preview & Execute

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Years
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  // Step 2: Departments
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);

  // Step 3: Venues
  const [venues, setVenues] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);

  // Step 4: Preview & Results
  const [previewData, setPreviewData] = useState(null);
  const [allocationResult, setAllocationResult] = useState(null);
  const [reservedSlots, setReservedSlots] = useState(2);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet('/venue-allocation/years');
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      const data = await response.json();
      if (data.success) setYears(data.data || []);
      else setError(data.message || 'Failed to load years');
    } catch (err) {
      console.error('Load years error:', err);
      setError('Failed to load years');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      const response = await apiGet(`/venue-allocation/departments?year=${selectedYear}`);
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      const data = await response.json();
      if (data.success) setDepartments(data.data || []);
      else setError(data.message || 'Failed to load departments');
    } catch (err) {
      console.error('Load departments error:', err);
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet('/venue-allocation/venues');
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      const data = await response.json();
      if (data.success) setVenues(data.data || []);
      else setError(data.message || 'Failed to load venues');
    } catch (err) {
      console.error('Load venues error:', err);
      setError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  useEffect(() => {
    if (selectedYear && currentStep === 2) {
      loadDepartments();
    }
  }, [selectedYear, currentStep, loadDepartments]);

  useEffect(() => {
    if (currentStep === 3) {
      loadVenues();
    }
  }, [currentStep, loadVenues]);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  const getStudentCount = () => {
    if (selectedDepartments.length === 0) {
      return departments.reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
    }
    return departments
      .filter(d => selectedDepartments.includes(d.department))
      .reduce((sum, d) => sum + parseInt(d.unallocated_students || 0), 0);
  };

  const getTotalCapacity = () => {
    return venues
      .filter(v => selectedVenueIds.includes(v.venue_id))
      .reduce((sum, v) => sum + Math.max(0, (v.available_seats || v.capacity) - reservedSlots), 0);
  };

  const getSelectedVenueCount = () => selectedVenueIds.length;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const selectYear = (year) => {
    setSelectedYear(year);
    setSelectedDepartments([]);
    setSelectedVenueIds([]);
    setPreviewData(null);
  };

  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const toggleVenue = (venueId) => {
    setSelectedVenueIds(prev =>
      prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]
    );
  };

  const selectAllVenues = () => {
    const availableVenueIds = venues
      .filter(v => v.available_seats > reservedSlots)
      .map(v => v.venue_id);
    setSelectedVenueIds(availableVenueIds);
  };

  const clearVenues = () => {
    setSelectedVenueIds([]);
  };

  const goToStep = (step) => {
    if (step < currentStep || canProceedToStep(step)) {
      setCurrentStep(step);
    }
  };

  const canProceedToStep = (step) => {
    if (step === 2) return !!selectedYear;
    if (step === 3) return !!selectedYear;
    if (step === 4) return !!selectedYear && selectedVenueIds.length > 0;
    return true;
  };

  const nextStep = () => {
    if (currentStep < 4 && canProceedToStep(currentStep + 1)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePreview = async () => {
    // Validate before making request
    if (!selectedYear) {
      setError('Please select a year first');
      return;
    }
    if (!selectedVenueIds || selectedVenueIds.length === 0) {
      setError('Please select at least one venue');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        year: parseInt(selectedYear),
        venueIds: selectedVenueIds.map(id => parseInt(id)),
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        reservedSlots: parseInt(reservedSlots) || 2,
        allocationMode: 'department_wise',
      };
      console.log('Preview payload:', payload);
      const response = await apiPost('/venue-allocation/preview', payload);
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      const data = await response.json();
      console.log('Preview response:', data);
      if (data.success) {
        setPreviewData(data.data);
      } else {
        setError(data.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to generate preview: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    // Validate before making request
    if (!selectedYear) {
      setError('Please select a year first');
      return;
    }
    if (!selectedVenueIds || selectedVenueIds.length === 0) {
      setError('Please select at least one venue');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        year: parseInt(selectedYear),
        venueIds: selectedVenueIds.map(id => parseInt(id)),
        departments: selectedDepartments.length > 0 ? selectedDepartments : null,
        reservedSlots: parseInt(reservedSlots) || 2,
        allocationMode: 'department_wise',
      };
      console.log('Execute payload:', payload);
      const response = await apiPost('/venue-allocation/execute', payload);
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        return;
      }
      const data = await response.json();
      console.log('Execute response:', data);
      if (data.success) {
        setAllocationResult(data.data);
      } else {
        setError(data.message || 'Failed to execute allocation');
      }
    } catch (err) {
      console.error('Execute error:', err);
      setError('Failed to execute allocation: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setCurrentStep(1);
    setSelectedYear(null);
    setSelectedDepartments([]);
    setSelectedVenueIds([]);
    setPreviewData(null);
    setAllocationResult(null);
    setError('');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP PROGRESS COMPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  const steps = [
    { num: 1, title: 'Select Year', desc: 'Choose student year' },
    { num: 2, title: 'Select Departments', desc: 'Choose departments to merge' },
    { num: 3, title: 'Select Venues', desc: 'Choose venues for allocation' },
    { num: 4, title: 'Preview & Execute', desc: 'Review and confirm' },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="va-root">
      {/* ═══ STICKY HEADER ═══════════════════════════════════════════════════ */}
      <div className="va-sticky-header">
        <div className="va-header-container">
          <div className="va-header-left-section">
            <button className="va-back-btn" onClick={() => navigate('/admin-tools')}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <h1 className="va-page-title">Venue Allocation</h1>
          </div>
          {selectedYear && (
            <div className="va-header-right-section">
              <div className="va-header-stat">
                <Calendar size={14} />
                <span>Year {selectedYear}</span>
              </div>
              <div className="va-header-stat">
                <Users size={14} />
                <span>{getStudentCount()} students</span>
              </div>
              <div className="va-header-stat va-header-stat-green">
                <Building2 size={14} />
                <span>{getTotalCapacity()} capacity</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STEP PROGRESS BAR ═══════════════════════════════════════════════ */}
      <div className="va-progress-bar">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div 
              className={`va-progress-step ${currentStep === step.num ? 'va-step-active' : ''} ${currentStep > step.num ? 'va-step-completed' : ''}`}
              onClick={() => goToStep(step.num)}
            >
              <div className="va-step-circle">
                {currentStep > step.num ? <CheckCircle size={18} /> : step.num}
              </div>
              <div className="va-step-text">
                <span className="va-step-title">{step.title}</span>
                <span className="va-step-desc">{step.desc}</span>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`va-step-line ${currentStep > step.num ? 'va-line-completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ═══ ERROR BANNER ════════════════════════════════════════════════════ */}
      {error && (
        <div className="va-error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {/* ═══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <div className="va-content-area">
        
        {/* ─────────────────────────────────────────────────────────────────────
            STEP 1: SELECT YEAR
        ────────────────────────────────────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="va-step-content">
            <div className="va-step-header">
              <Calendar size={24} className="va-step-icon" />
              <div>
                <h2>Select Academic Year</h2>
                <p>Choose which year's students you want to allocate to venues</p>
              </div>
            </div>

            {loading ? (
              <div className="va-loading">
                <RefreshCw size={20} className="va-spin" />
                <span>Loading years...</span>
              </div>
            ) : (
              <div className="va-year-grid">
                {years.map((year) => (
                  <div
                    key={year.year}
                    className={`va-year-card ${selectedYear === year.year ? 'va-selected' : ''}`}
                    onClick={() => selectYear(year.year)}
                  >
                    <div className="va-year-header">
                      <span className="va-year-badge">Year {year.year}</span>
                      {selectedYear === year.year && <CheckCircle size={20} className="va-check" />}
                    </div>
                    <div className="va-year-body">
                      <div className="va-year-stat">
                        <span className="va-stat-value">{year.totalStudents}</span>
                        <span className="va-stat-label">Total Students</span>
                      </div>
                      <div className="va-year-stat va-stat-highlight">
                        <span className="va-stat-value">{year.unallocatedStudents}</span>
                        <span className="va-stat-label">Unallocated</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="va-step-actions">
              <div></div>
              <button 
                className="va-btn va-btn-primary" 
                onClick={nextStep}
                disabled={!selectedYear}
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            STEP 2: SELECT DEPARTMENTS
        ────────────────────────────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="va-step-content">
            <div className="va-step-header">
              <Users size={24} className="va-step-icon" />
              <div>
                <h2>Select Departments to Merge</h2>
                <p>Choose departments to combine in the same venues for collaboration. Leave empty to include all.</p>
              </div>
            </div>

            {loading ? (
              <div className="va-loading">
                <RefreshCw size={20} className="va-spin" />
                <span>Loading departments...</span>
              </div>
            ) : (
              <>
                <div className="va-dept-info">
                  <Info size={16} />
                  <span>
                    {selectedDepartments.length === 0 
                      ? `All ${departments.length} departments will be included (${getStudentCount()} students)` 
                      : `${selectedDepartments.length} department(s) selected (${getStudentCount()} students)`}
                  </span>
                </div>

                <div className="va-dept-grid">
                  {departments.map((dept) => (
                    <div
                      key={dept.department}
                      className={`va-dept-card ${selectedDepartments.includes(dept.department) ? 'va-selected' : ''}`}
                      onClick={() => toggleDepartment(dept.department)}
                    >
                      <div className="va-dept-check">
                        {selectedDepartments.includes(dept.department) && <CheckCircle size={18} />}
                      </div>
                      <div className="va-dept-info-text">
                        <span className="va-dept-name">{dept.department}</span>
                        <span className="va-dept-count">{dept.unallocated_students} students</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedDepartments.length > 0 && (
                  <div className="va-merge-preview">
                    <h4>Merge Preview</h4>
                    <p>These departments will be placed together in venues:</p>
                    <div className="va-merge-chips">
                      {selectedDepartments.map(dept => (
                        <span key={dept} className="va-merge-chip">{dept}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="va-step-actions">
              <button className="va-btn va-btn-ghost" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="va-btn va-btn-primary" onClick={nextStep}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            STEP 3: SELECT VENUES
        ────────────────────────────────────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="va-step-content">
            <div className="va-step-header">
              <Building2 size={24} className="va-step-icon" />
              <div>
                <h2>Select Venues</h2>
                <p>Choose venues where students will be allocated. Real-time capacity shown.</p>
              </div>
            </div>

            {loading ? (
              <div className="va-loading">
                <RefreshCw size={20} className="va-spin" />
                <span>Loading venues...</span>
              </div>
            ) : (
              <>
                {/* Capacity Summary */}
                <div className={`va-capacity-summary ${getTotalCapacity() >= getStudentCount() ? 'va-sufficient' : 'va-insufficient'}`}>
                  <div className="va-capacity-items">
                    <div className="va-capacity-item">
                      <span className="va-cap-label">Selected Venues</span>
                      <span className="va-cap-value">{getSelectedVenueCount()}</span>
                    </div>
                    <div className="va-capacity-item">
                      <span className="va-cap-label">Total Capacity</span>
                      <span className="va-cap-value">{getTotalCapacity()}</span>
                    </div>
                    <div className="va-capacity-item">
                      <span className="va-cap-label">Students to Allocate</span>
                      <span className="va-cap-value va-highlight">{getStudentCount()}</span>
                    </div>
                  </div>
                  <div className="va-capacity-status">
                    {getTotalCapacity() >= getStudentCount() ? (
                      <><CheckCircle size={16} /> Capacity is sufficient</>
                    ) : (
                      <><AlertTriangle size={16} /> Need {getStudentCount() - getTotalCapacity()} more seats</>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="va-venue-actions">
                  <button className="va-btn va-btn-sm va-btn-ghost" onClick={selectAllVenues}>
                    Select All
                  </button>
                  <button className="va-btn va-btn-sm va-btn-ghost" onClick={clearVenues}>
                    Clear All
                  </button>
                  <div className="va-reserved-input">
                    <label>Reserved slots per venue:</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={reservedSlots}
                      onChange={(e) => setReservedSlots(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Venue Grid */}
                <div className="va-venue-grid">
                  {venues.map((venue) => {
                    const effectiveCapacity = Math.max(0, (venue.available_seats || venue.capacity) - reservedSlots);
                    const isSelected = selectedVenueIds.includes(venue.venue_id);
                    const isFull = effectiveCapacity <= 0;
                    
                    return (
                      <div
                        key={venue.venue_id}
                        className={`va-venue-card ${isSelected ? 'va-selected' : ''} ${isFull ? 'va-disabled' : ''}`}
                        onClick={() => !isFull && toggleVenue(venue.venue_id)}
                      >
                        <div className="va-venue-header">
                          <span className="va-venue-name">{venue.venue_name}</span>
                          {isSelected && <CheckCircle size={18} className="va-check" />}
                        </div>
                        {venue.location && (
                          <div className="va-venue-location">
                            <MapPin size={12} /> {venue.location}
                          </div>
                        )}
                        <div className="va-venue-stats">
                          <div className="va-venue-stat">
                            <span className="va-venue-stat-value">{venue.capacity}</span>
                            <span className="va-venue-stat-label">Total</span>
                          </div>
                          <div className="va-venue-stat">
                            <span className="va-venue-stat-value">{venue.current_students || 0}</span>
                            <span className="va-venue-stat-label">Current</span>
                          </div>
                          <div className="va-venue-stat va-stat-available">
                            <span className="va-venue-stat-value">{effectiveCapacity}</span>
                            <span className="va-venue-stat-label">Available</span>
                          </div>
                        </div>
                        {isFull && <div className="va-venue-full-tag">Full</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="va-step-actions">
              <button className="va-btn va-btn-ghost" onClick={prevStep}>
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                className="va-btn va-btn-primary" 
                onClick={() => { handlePreview(); nextStep(); }}
                disabled={selectedVenueIds.length === 0}
              >
                Preview Allocation <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            STEP 4: PREVIEW & EXECUTE
        ────────────────────────────────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="va-step-content">
            {allocationResult ? (
              /* SUCCESS STATE */
              <>
                <div className="va-success-banner">
                  <CheckCircle size={32} />
                  <div>
                    <h2>Allocation Complete!</h2>
                    <p>
                      Successfully allocated <strong>{allocationResult.totalAllocated}</strong> students 
                      to <strong>{allocationResult.venuesUsed}</strong> venues.
                    </p>
                  </div>
                </div>

                <div className="va-result-grid">
                  {allocationResult.allocation?.map((venue, idx) => (
                    <div key={idx} className="va-result-card">
                      <div className="va-result-header">
                        <span className="va-result-name">{venue.venue_name}</span>
                        <span className="va-result-badge">+{venue.newly_allocated}</span>
                      </div>
                      <div className="va-result-body">
                        <span>{venue.existing_students} existing + {venue.newly_allocated} new = {venue.total_students}/{venue.capacity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="va-step-actions va-actions-center">
                  <button className="va-btn va-btn-primary" onClick={resetAll}>
                    <RotateCcw size={16} /> New Allocation
                  </button>
                </div>
              </>
            ) : (
              /* PREVIEW STATE */
              <>
                <div className="va-step-header">
                  <Zap size={24} className="va-step-icon" />
                  <div>
                    <h2>Preview Allocation</h2>
                    <p>Review the allocation before confirming</p>
                  </div>
                </div>

                {loading ? (
                  <div className="va-loading">
                    <RefreshCw size={20} className="va-spin" />
                    <span>Generating preview...</span>
                  </div>
                ) : previewData ? (
                  <>
                    {/* Summary Cards */}
                    <div className="va-preview-summary">
                      <div className="va-summary-card va-card-blue">
                        <span className="va-summary-value">{previewData.summary?.totalStudents || 0}</span>
                        <span className="va-summary-label">Students</span>
                      </div>
                      <div className="va-summary-card va-card-green">
                        <span className="va-summary-value">{previewData.summary?.totalVenuesUsed || 0}</span>
                        <span className="va-summary-label">Venues</span>
                      </div>
                      <div className="va-summary-card va-card-amber">
                        <span className="va-summary-value">{reservedSlots}</span>
                        <span className="va-summary-label">Reserved/Venue</span>
                      </div>
                    </div>

                    {/* Venue Allocation Details */}
                    <div className="va-preview-details">
                      <h4>Allocation Details</h4>
                      {previewData.allocation?.map((venueAlloc, idx) => (
                        <div key={idx} className="va-preview-item">
                          <div className="va-preview-item-header">
                            <span className="va-preview-venue">{venueAlloc.venue?.venue_name}</span>
                            <span className="va-preview-count">{venueAlloc.students?.length || 0} students</span>
                          </div>
                          <div className="va-preview-depts">
                            {venueAlloc.departmentBreakdown && Object.entries(venueAlloc.departmentBreakdown).map(([dept, count]) => (
                              <span key={dept} className="va-preview-dept">{dept}: {count}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="va-no-preview">
                    <AlertTriangle size={24} />
                    <p>Failed to generate preview. Please go back and try again.</p>
                  </div>
                )}

                <div className="va-step-actions">
                  <button className="va-btn va-btn-ghost" onClick={prevStep}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button 
                    className="va-btn va-btn-success" 
                    onClick={handleExecute}
                    disabled={loading || !previewData}
                  >
                    {loading ? (
                      <><RefreshCw size={16} className="va-spin" /> Executing...</>
                    ) : (
                      <><Zap size={16} /> Execute Allocation</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueAllocation;
