import React, { useState } from 'react';
import {
  Calendar, Search, Plus, RefreshCw, Clock, BookOpen, Hash, Building2,
  Trash2, AlertTriangle, Info, Save, X
} from 'lucide-react';
import { createSlot, deleteSlot as deleteSlotApi, fetchAllocation } from '../../../../../services/assessmentVenueApi';
import './ManageSlots.css';


const ManageSlots = ({ 
  slots, 
  loading, 
  onRefresh, 
  onNavigateToAllocate, 
  onNavigateToResults,
  venues,
  utils 
}) => {
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({ slot_date: '', start_time: '', end_time: '', slot_label: '', subject_code: '', year: 1 });
  const [slotWarning, setSlotWarning] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  
  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [slotDayFilter, setSlotDayFilter] = useState(getTodayDateStr());

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
        onRefresh();
      } else {
        if (res.message?.includes('already exists') || res.message?.includes('conflict')) {
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
      if (res.success) onRefresh();
      else alert(res.message || 'Failed to delete slot');
    } catch {
      alert('Server error deleting slot');
    }
  };

  const handleSlotClick = async (sl) => {
    // Check if allocation already exists
    const isAllocated = sl.status === 'Allocated';
    
    try {
      const res = await fetchAllocation(sl.id);
      console.log('Fetch allocation result:', res);
      
      if (res.success && res.hasAllocation && res.data) {
        // Load stored allocation and go to results
        onNavigateToResults(sl, res.data);
        return;
      } else if (isAllocated) {
        console.warn('Slot marked as Allocated but no allocation data found');
      }
    } catch (err) {
      console.error('Error fetching allocation:', err);
      if (isAllocated) {
        console.warn('Slot marked as Allocated but failed to fetch data');
      }
    }
    
    // No allocation found - go to allocate tab
    onNavigateToAllocate(sl);
  };

  return (
    <div className="aa-slots-tab">
      {/* Unified Topbar: Date Filter + Search + Schedule Slot */}
      <div className="aa-topbar aa-topbar-slots">
        <div className="aa-topbar-left">
          <div className="aa-date-filter-wrap">
            <Calendar size={16} className="aa-date-icon" />
            <input
              type="date"
              className="aa-date-input"
              value={slotDayFilter}
              onChange={(e) => setSlotDayFilter(e.target.value)}
            />
            {slotDayFilter && (
              <button
                className="aa-date-clear-btn"
                onClick={() => setSlotDayFilter('')}
                title="Clear date filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
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
        </div>
        <div className="aa-topbar-actions">
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

      {loading && (
        <div className="aa-table-card">
          <div className="aa-loading-overlay"><RefreshCw size={20} className="aa-spin" /> Loading...</div>
          <div style={{ height: 160 }} />
        </div>
      )}

      {slots.length === 0 && !loading ? (
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
      ) : !loading && (
        (() => {
          const filteredSlots = slots.filter(sl =>
            (!slotDayFilter || utils.normalizeDateForFilter(sl.slot_date) === slotDayFilter) &&
            (!slotSearch ||
              sl.slot_label?.toLowerCase().includes(slotSearch.toLowerCase()) ||
              sl.subject_code?.toLowerCase().includes(slotSearch.toLowerCase()) ||
              utils.formatDateLabel(sl.slot_date).toLowerCase().includes(slotSearch.toLowerCase()))
          );
          
          if (filteredSlots.length === 0) {
            return (
              <div className="aa-empty-state aa-empty-filtered">
                <Calendar size={40} strokeWidth={1.5} />
                <p>No slots found for {slotDayFilter ? utils.formatDateLabel(slotDayFilter) : 'this filter'}</p>
                <p className="aa-empty-sub">Try selecting a different date or clear the filter</p>
                <button className="aa-btn aa-btn-ghost" onClick={() => setSlotDayFilter('')}>
                  Clear Date Filter
                </button>
              </div>
            );
          }
          
          return (
            <div className="aa-sl-card-grid">
              {filteredSlots.map((sl) => (
                <div
                  key={sl.id}
                  className="aa-sl-card aa-sl-card-clickable"
                  onClick={() => handleSlotClick(sl)}
                >
                  <div className="aa-sl-card-header">
                    <div className="aa-sl-card-date">
                      <Calendar size={15} />
                      <span>{utils.formatDateLabel(sl.slot_date)}</span>
                    </div>
                    <div className="aa-sl-card-actions">
                      {(() => {
                        const now = new Date();
                        // Parse date string directly to avoid timezone issues
                        const dateStr = String(sl.slot_date).includes('T') ? String(sl.slot_date).split('T')[0] : String(sl.slot_date);
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const [endH, endM] = (sl.end_time || '23:59').split(':').map(Number);
                        const slotEndDate = new Date(year, month - 1, day, endH, endM, 0, 0);
                        const isCompleted = now > slotEndDate;
                        const isAllocated = sl.status === 'Allocated';
                        return (
                          <span className={`aa-status-badge ${isAllocated ? 'aa-status-allocated' : isCompleted ? 'aa-status-completed' : 'aa-status-active'}`}>
                            {isAllocated ? 'Allocated' : isCompleted ? 'Completed' : 'Pending'}
                          </span>
                        );
                      })()}
                      <button
                        className="aa-icon-btn aa-icon-danger"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleDeleteSlot(sl.id);
                        }}
                        title="Delete slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="aa-sl-card-body">
                    <div className="aa-sl-card-time">
                      <Clock size={14} className="aa-sl-card-time-icon" />
                      <span className="aa-sl-card-time-text">
                        {utils.formatTime12(sl.start_time)} – {utils.formatTime12(sl.end_time)}
                      </span>
                    </div>

                    <div className="aa-sl-card-year">
                      <BookOpen size={14} />
                      <span>{sl.year === 1 ? '1st' : sl.year === 2 ? '2nd' : sl.year === 3 ? '3rd' : '4th'} Year</span>
                    </div>

                    {sl.subject_code && (
                      <div className="aa-sl-card-subject">
                        <Hash size={14} />
                        <span>{sl.subject_code}</span>
                      </div>
                    )}

                    {sl.slot_label && (
                      <div className="aa-sl-card-label">
                        <span className="aa-sl-card-label-text">{sl.slot_label}</span>
                      </div>
                    )}

                    {sl.venues && sl.venues.length > 0 && (
                      <div className="aa-sl-card-venues">
                        <Building2 size={14} />
                        <span>{sl.venues.map(v => v.venue_name).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
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
                  utils.formatDateLabel(s.slot_date) === utils.formatDateLabel(slotForm.slot_date)
                );
                if (!existing.length) return null;
                return (
                  <div className="aa-existing-slots">
                    <div className="aa-existing-header">
                      <Info size={13} />
                      <span>{existing.length} slot{existing.length > 1 ? 's' : ''} already on {utils.formatDateLabel(slotForm.slot_date)}</span>
                    </div>
                    {existing.map((s) => (
                      <div key={s.id} className="aa-existing-item">
                        {utils.formatTime12(s.start_time)} – {utils.formatTime12(s.end_time)} {s.subject_code ? `[${s.subject_code}]` : ''} {s.slot_label ? `(${s.slot_label})` : ''}
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
  );
};

export default ManageSlots;