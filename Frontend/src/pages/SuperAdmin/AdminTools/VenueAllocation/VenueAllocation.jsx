import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, Calendar, 
  CheckCircle, AlertTriangle, X, RefreshCw, MapPin, Zap, 
  Clock, LayoutDashboard, ChevronRight, Check
} from 'lucide-react';
import { apiGet, apiPost } from '../../../../utils/api';
import './VenueAllocation.css';

const DEFAULT_RESERVED_SLOTS = 2;

const TIME_SLOT_OPTIONS = [
  {
    value: 'forenoon',
    title: 'Forenoon',
    description: '09:00 AM - 12:00 PM',
  },
  {
    value: 'afternoon',
    title: 'Afternoon',
    description: '01:00 PM - 04:00 PM',
  },
  {
    value: 'full_day',
    title: 'Full Day',
    description: '09:00 AM - 04:00 PM',
  },
];

const getTimeSlotDetails = (slotValue) => {
  return TIME_SLOT_OPTIONS.find((slot) => slot.value === slotValue) || null;
};

const getApiMessage = async (response, fallbackMessage) => {
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    return { success: false, data: null, message: fallbackMessage };
  }

  if (!response.ok || !data.success) {
    return {
      success: false,
      data: data?.data ?? null,
      message: data?.message || fallbackMessage,
    };
  }

  return {
    success: true,
    data: data.data,
    message: data.message || '',
  };
};

const VenueAllocation = () => {
  const navigate = useNavigate();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Schedule
  const [allocationDate, setAllocationDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // Step 2: Students
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [mergeDepartments, setMergeDepartments] = useState(true);

  // Step 3: Venues
  const [venues, setVenues] = useState([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState([]);
  const [reservedSlots, setReservedSlots] = useState(DEFAULT_RESERVED_SLOTS);

  // Step 4: Preview & Results
  const [previewData, setPreviewData] = useState(null);
  const [allocationResult, setAllocationResult] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING (Unchanged logic, driving the new UI)
  // ═══════════════════════════════════════════════════════════════════════════
  const loadYears = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet('/venue-allocation/years');
      const result = await getApiMessage(response, 'Failed to load years');

      if (!result.success) {
        setError(result.message);
        return;
      }

      setYears(result.data || []);
    } catch (err) {
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
      const result = await getApiMessage(response, 'Failed to load departments');

      if (!result.success) {
        setError(result.message);
        return;
      }

      setDepartments(result.data || []);
    } catch (err) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  const loadVenues = useCallback(async () => {
    if (!allocationDate || !timeSlot) return;
    setLoading(true);
    try {
      const response = await apiGet(`/venue-allocation/venues?date=${allocationDate}&slot=${timeSlot}`);
      const result = await getApiMessage(response, 'Failed to load venues');

      if (!result.success) {
        setError(result.message);
        return;
      }

      setVenues(result.data || []);
    } catch (err) {
      setError('Failed to load venues');
    } finally {
      setLoading(false);
    }
  }, [allocationDate, timeSlot]);

  useEffect(() => {
    if (currentStep === 2 && years.length === 0) loadYears();
    if (currentStep === 2 && selectedYear) loadDepartments();
    if (currentStep === 3) loadVenues();
  }, [currentStep, selectedYear, loadYears, loadDepartments, loadVenues]);

  useEffect(() => {
    setSelectedYear(null);
    setDepartments([]);
    setSelectedDepartments([]);
    setVenues([]);
    setSelectedVenueIds([]);
    setPreviewData(null);
    setAllocationResult(null);
  }, [allocationDate, timeSlot]);

  useEffect(() => {
    setSelectedDepartments([]);
    setVenues([]);
    setSelectedVenueIds([]);
    setPreviewData(null);
    setAllocationResult(null);
  }, [selectedYear]);

  useEffect(() => {
    setSelectedVenueIds([]);
    setPreviewData(null);
    setAllocationResult(null);
  }, [selectedDepartments]);

  useEffect(() => {
    setPreviewData(null);
    setAllocationResult(null);
  }, [mergeDepartments, reservedSlots, selectedVenueIds]);

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
      .reduce((sum, v) => {
        const availableSeats = Number.isFinite(Number(v.available_seats))
          ? Number(v.available_seats)
          : (Number(v.capacity) || 0) - (Number(v.current_students) || 0);

        return sum + Math.max(0, availableSeats - reservedSlots);
      }, 0);
  };

  const isCapacitySufficient = getTotalCapacity() >= getStudentCount() && getStudentCount() > 0;
  const selectedVenues = venues.filter((venue) => selectedVenueIds.includes(venue.venue_id));
  const targetDepartments = selectedDepartments.length > 0
    ? selectedDepartments
    : departments.map((department) => department.department);
  const shouldGroupDepartments = mergeDepartments && targetDepartments.length > 1;
  const canExecute = Boolean(previewData) && !loading && !allocationResult;
  const selectedTimeSlot = getTimeSlotDetails(timeSlot);

  const buildPayload = () => ({
    date: allocationDate,
    timeSlot,
    year: parseInt(selectedYear, 10),
    departments: selectedDepartments.length > 0 ? selectedDepartments : null,
    venueIds: selectedVenueIds.map((id) => parseInt(id, 10)),
    reservedSlots: parseInt(reservedSlots, 10) || 0,
    allocationMode: 'department_wise',
    groupDepartments: shouldGroupDepartments ? targetDepartments : [],
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setError('');
    setAllocationDate('');
    setTimeSlot('');
    setYears([]);
    setSelectedYear(null);
    setDepartments([]);
    setSelectedDepartments([]);
    setMergeDepartments(true);
    setVenues([]);
    setSelectedVenueIds([]);
    setReservedSlots(DEFAULT_RESERVED_SLOTS);
    setPreviewData(null);
    setAllocationResult(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const canProceedToStep = (step) => {
    if (step === 2) return !!allocationDate && !!timeSlot;
    if (step === 3) return !!selectedYear;
    if (step === 4) return !!previewData;
    return true;
  };

  const goToStep = (step) => {
    if (step < currentStep || canProceedToStep(step)) {
      setCurrentStep(step);
      setError('');
    }
  };

  const toggleVenue = (venueId) => {
    setSelectedVenueIds(prev => prev.includes(venueId) ? prev.filter(id => id !== venueId) : [...prev, venueId]);
  };

  const handlePreview = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = buildPayload();
      const response = await apiPost('/venue-allocation/preview', payload);
      const result = await getApiMessage(response, 'Failed to generate preview.');

      if (!result.success) {
        setPreviewData(null);
        setError(result.message);
        return;
      }

      setAllocationResult(null);
      setPreviewData(result.data);
      setCurrentStep(4);
    } catch (err) {
      setError('Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setError('');
    setLoading(true);

    try {
      const payload = buildPayload();
      const response = await apiPost('/venue-allocation/execute', payload);
      const result = await getApiMessage(response, 'Failed to execute allocation.');

      if (!result.success) {
        setError(result.message);
        return;
      }

      setAllocationResult(result.data);
      await loadVenues();
    } catch (err) {
      setError('Failed to execute allocation.');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  const steps = [
    { num: 1, title: 'Schedule', icon: <Clock size={18} /> },
    { num: 2, title: 'Students', icon: <Users size={18} /> },
    { num: 3, title: 'Venues', icon: <Building2 size={18} /> },
    { num: 4, title: 'Review', icon: <LayoutDashboard size={18} /> },
  ];

  return (
    <div className="admin-layout-root">
      {/* HEADER */}
      <header className="admin-header">
        <button className="btn-back" onClick={() => navigate('/admin-tools')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1>Smart Venue Allocation</h1>
      </header>

      {error && (
        <div className="alert-banner error">
          <AlertTriangle size={18} /> <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      <div className="admin-workspace">
        {/* LEFT SIDEBAR: Vertical Navigation */}
        <aside className="step-navigation">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            const isLocked = !canProceedToStep(step.num) && currentStep < step.num;

            return (
              <div 
                key={step.num} 
                className={`nav-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => !isLocked && goToStep(step.num)}
              >
                <div className="nav-icon-box">
                  {isCompleted ? <Check size={16} /> : step.icon}
                </div>
                <span className="nav-label">{step.title}</span>
              </div>
            );
          })}
        </aside>

        {/* CENTER: Main Configuration Area */}
        <main className="main-config-area">
          <div className="config-card">
            
            {/* STEP 1: SCHEDULE */}
            {currentStep === 1 && (
              <div className="fade-in">
                <div className="section-title">
                  <h2>When is the event?</h2>
                  <p>Select the date and time to accurately check venue availability.</p>
                </div>
                
                <div className="form-grid">
                  <div className="input-group">
                    <label>Allocation Date</label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" size={18} />
                      <input 
                        type="date" 
                        value={allocationDate} 
                        onChange={(e) => setAllocationDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Time Slot</label>
                    <div className="radio-card-group">
                      {TIME_SLOT_OPTIONS.map((slot) => (
                        <label key={slot.value} className={`radio-card ${timeSlot === slot.value ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="slot"
                            value={slot.value}
                            checked={timeSlot === slot.value}
                            onChange={(e) => setTimeSlot(e.target.value)}
                          />
                          <div className="rc-content">
                            <span className="rc-title">{slot.title}</span>
                            <span className="rc-desc">{slot.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="step-footer">
                  <button className="btn-primary" onClick={() => goToStep(2)} disabled={!allocationDate || !timeSlot}>
                    Next: Select Students <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: STUDENTS */}
            {currentStep === 2 && (
              <div className="fade-in">
                <div className="section-title">
                  <h2>Who is attending?</h2>
                  <p>Select the academic year and filter by departments if necessary.</p>
                </div>

                {loading ? <div className="loader"><RefreshCw className="spin" /> Loading data...</div> : (
                  <>
                    <h3 className="sub-heading">Academic Year</h3>
                    {years.length === 0 ? (
                      <div className="empty-state compact">
                        <p>No student years are available for allocation.</p>
                      </div>
                    ) : (
                      <div className="pill-group">
                        {years.map(y => (
                          <button key={y.year} className={`pill ${selectedYear === y.year ? 'active' : ''}`} onClick={() => setSelectedYear(y.year)}>
                            Year {y.year}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedYear && (
                      <div className="mt-6 fade-in">
                        <div className="flex-between mb-4">
                          <h3 className="sub-heading m-0">Departments</h3>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={mergeDepartments} onChange={(e) => setMergeDepartments(e.target.checked)} />
                            <span className="slider"></span>
                            <span className="toggle-label">Interleave Seating</span>
                          </label>
                        </div>
                        
                        {departments.length === 0 ? (
                          <div className="empty-state compact">
                            <p>No departments with unallocated students were found for Year {selectedYear}.</p>
                          </div>
                        ) : (
                          <div className="grid-cards">
                            {departments.map(dept => (
                              <div key={dept.department} className={`selection-card ${selectedDepartments.includes(dept.department) ? 'selected' : ''}`} 
                                   onClick={() => setSelectedDepartments(prev => prev.includes(dept.department) ? prev.filter(d => d !== dept.department) : [...prev, dept.department])}>
                                <div className="sc-header">
                                  <strong>{dept.department}</strong>
                                  <div className="checkbox">{selectedDepartments.includes(dept.department) && <Check size={14} />}</div>
                                </div>
                                <span className="sc-meta">{dept.unallocated_students} Students</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="step-footer">
                  <button className="btn-secondary" onClick={() => goToStep(1)}>Back</button>
                  <button className="btn-primary" onClick={() => goToStep(3)} disabled={!selectedYear}>
                    Next: Choose Venues <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: VENUES */}
            {currentStep === 3 && (
              <div className="fade-in">
                <div className="section-title flex-between">
                  <div>
                    <h2>Available Venues</h2>
                    <p>Select rooms to accommodate {getStudentCount()} students.</p>
                  </div>
                  <div className="input-group small-input">
                    <label>Buffer Seats/Room</label>
                    <input type="number" min="0" value={reservedSlots} onChange={(e) => setReservedSlots(parseInt(e.target.value)||0)} />
                  </div>
                </div>

                {loading ? <div className="loader"><RefreshCw className="spin" /> Checking availability...</div> : (
                  venues.length === 0 ? (
                    <div className="empty-state">
                      <p>No active venues are available for the selected schedule.</p>
                    </div>
                  ) : (
                    <div className="venue-list">
                      {venues.map(venue => {
                        const effectiveCap = Math.max(
                          0,
                          (Number.isFinite(Number(venue.available_seats)) ? Number(venue.available_seats) : Number(venue.capacity) || 0) - reservedSlots,
                        );
                        const isUnavailable = effectiveCap <= 0;
                        const isSelected = selectedVenueIds.includes(venue.venue_id);

                        return (
                          <div key={venue.venue_id} className={`venue-row ${isSelected ? 'selected' : ''} ${isUnavailable ? 'disabled' : ''}`}
                               onClick={() => !isUnavailable && toggleVenue(venue.venue_id)}>
                            <div className="vr-info">
                              <div className="vr-checkbox">{isSelected && <Check size={14} />}</div>
                              <div>
                                <h4 className="m-0">{venue.venue_name}</h4>
                                <span className="text-muted text-sm venue-location"><MapPin size={12}/> {venue.location || 'Campus Main'}</span>
                              </div>
                            </div>
                            
                            {isUnavailable ? (
                              <span className="badge danger">No usable seats</span>
                            ) : (
                              <div className="vr-stats">
                                <div className="stat-block">
                                  <span>Total</span>
                                  <strong>{venue.capacity}</strong>
                                </div>
                                <div className="stat-block">
                                  <span>Occupied</span>
                                  <strong>{venue.current_students || 0}</strong>
                                </div>
                                <div className="stat-block success-text">
                                  <span>Usable</span>
                                  <strong>{effectiveCap}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                <div className="step-footer">
                  <button className="btn-secondary" onClick={() => goToStep(2)}>Back</button>
                  <button className="btn-primary" onClick={handlePreview} disabled={!isCapacitySufficient}>
                    Generate Preview <Zap size={18} />
                  </button>
                </div>
              </div>
            )}

             {/* STEP 4: PREVIEW */}
             {currentStep === 4 && previewData && (
              <div className="fade-in">
                <div className="section-title">
                  <h2>{allocationResult ? 'Allocation Complete' : 'Review Allocation'}</h2>
                  <p>
                    {allocationResult
                      ? 'The selected students have been assigned to venues successfully.'
                      : 'Please review the matrix before finalizing.'}
                  </p>
                </div>

                <div className="summary-strip">
                  <div className="summary-tile">
                    <span className="summary-tile-label">Students</span>
                    <strong>{previewData.summary?.totalStudents || getStudentCount()}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="summary-tile-label">Venues used</span>
                    <strong>{allocationResult?.venuesUsed || previewData.summary?.totalVenuesUsed || 0}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="summary-tile-label">Buffer seats</span>
                    <strong>{reservedSlots}</strong>
                  </div>
                  <div className="summary-tile">
                    <span className="summary-tile-label">Seating mode</span>
                    <strong>{shouldGroupDepartments ? 'Interleaved' : 'Department wise'}</strong>
                  </div>
                </div>

                {allocationResult ? (
                  <div className="result-panel">
                    <div className="result-banner success-text">
                      <CheckCircle size={20} />
                      <span>{allocationResult.totalAllocated} students were allocated across {allocationResult.venuesUsed} venues.</span>
                    </div>

                    <div className="matrix-grid">
                      {allocationResult.allocation?.map((item) => (
                        <div key={item.group_id} className="matrix-card result-card">
                          <div className="mc-header">
                            <strong>{item.venue_name}</strong>
                            <span className="badge primary">+{item.newly_allocated}</span>
                          </div>
                          <div className="result-stats">
                            <div className="flex-between text-sm mb-2">
                              <span>Group</span>
                              <strong>{item.group_name}</strong>
                            </div>
                            <div className="flex-between text-sm mb-2">
                              <span>Existing students</span>
                              <strong>{item.existing_students}</strong>
                            </div>
                            <div className="flex-between text-sm mb-2">
                              <span>Newly allocated</span>
                              <strong>{item.newly_allocated}</strong>
                            </div>
                            <div className="flex-between text-sm">
                              <span>Final occupancy</span>
                              <strong>{item.total_students} / {item.capacity}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="matrix-grid">
                     {previewData.allocation?.map((item, idx) => (
                       <div key={idx} className="matrix-card">
                          <div className="mc-header">
                            <strong>{item.venue?.venue_name}</strong>
                            <span className="badge primary">{item.students?.length} Assigned</span>
                          </div>
                          <div className="mc-body">
                            {item.departmentBreakdown && Object.entries(item.departmentBreakdown).map(([dept, count]) => (
                              <div key={dept} className="flex-between text-sm mb-2">
                                <span>{dept}</span>
                                <strong>{count}</strong>
                              </div>
                            ))}
                          </div>
                       </div>
                     ))}
                  </div>
                )}

                <div className="review-details">
                  <div className="review-block">
                    <span className="summary-label">Selected venues</span>
                    <div className="selected-chip-list">
                      {selectedVenues.map((venue) => (
                        <span key={venue.venue_id} className="selected-chip">{venue.venue_name}</span>
                      ))}
                    </div>
                  </div>

                  <div className="review-block">
                    <span className="summary-label">Departments</span>
                    <p className="review-copy">
                      {targetDepartments.length > 0 ? targetDepartments.join(', ') : 'All departments in the selected year'}
                    </p>
                  </div>
                </div>

                <div className="step-footer">
                  {allocationResult ? (
                    <>
                      <button className="btn-secondary" onClick={() => goToStep(3)}>Back to Edit</button>
                      <button className="btn-primary" onClick={resetWizard}>Start New Allocation</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => goToStep(3)}>Back to Edit</button>
                      <button className="btn-success" onClick={handleExecute} disabled={!canExecute}>
                        {loading ? <><RefreshCw className="spin" size={18} /> Allocating...</> : <><CheckCircle size={18} /> Confirm & Allocate</>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Live Summary Panel */}
        <aside className="summary-panel">
          <div className="summary-card sticky-top">
            <h3>Live Overview</h3>
            
            <div className="summary-section">
              <span className="summary-label">Schedule</span>
              <div className="summary-value">
                {allocationDate ? new Date(allocationDate).toLocaleDateString('en-GB') : 'Not selected'}
                {selectedTimeSlot && (
                  <span className="text-muted block text-sm">
                    {selectedTimeSlot.title} · {selectedTimeSlot.description}
                  </span>
                )}
              </div>
            </div>

            <div className="summary-section">
              <span className="summary-label">Target Audience</span>
              <div className="summary-value">
                {selectedYear ? `Year ${selectedYear}` : 'Not selected'}
                {selectedDepartments.length > 0 && <span className="text-muted block text-sm">{selectedDepartments.length} Depts selected</span>}
              </div>
            </div>

            <div className="capacity-widget">
              <div className="flex-between mb-2">
                <span className="text-sm font-medium">Capacity vs Required</span>
                <span className="text-sm font-bold">{getTotalCapacity()} / {getStudentCount()}</span>
              </div>
              <div className="progress-bg">
                <div 
                  className={`progress-fill ${isCapacitySufficient ? 'bg-success' : 'bg-warning'}`} 
                  style={{ width: `${Math.min((getTotalCapacity() / (getStudentCount() || 1)) * 100, 100)}%` }}
                ></div>
              </div>
              {getStudentCount() > 0 && (
                <p className={`text-xs mt-2 ${isCapacitySufficient ? 'success-text' : 'danger-text'}`}>
                  {isCapacitySufficient 
                    ? <><CheckCircle size={12} className="inline mr-1"/> Sufficient seats allocated</>
                    : <><AlertTriangle size={12} className="inline mr-1"/> Need {getStudentCount() - getTotalCapacity()} more seats</>
                  }
                </p>
              )}
            </div>

            {currentStep === 4 && !allocationResult && (
              <button className="btn-success w-full mt-6" onClick={handleExecute} disabled={!canExecute}>
                {loading ? <><RefreshCw className="spin" size={18} /> Allocating...</> : <><CheckCircle size={18} /> Confirm & Allocate</>}
              </button>
            )}

            {allocationResult && (
              <div className="result-sidebar-note mt-6">
                <span className="summary-label">Last execution</span>
                <p className="review-copy m-0">
                  {allocationResult.totalAllocated} students allocated successfully.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default VenueAllocation;