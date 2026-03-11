import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, RefreshCw, AlertTriangle, Building2, MapPin,
  Users, MoreVertical, Edit3, Trash2, X, Save,
  ChevronLeft, ChevronRight, LayoutGrid
} from 'lucide-react';
import {
  fetchVenues, createVenue, updateVenue,
  deleteVenue as deleteVenueApi, toggleVenueStatus
} from '../../../../../services/assessmentVenueApi';
import VenueLayoutDesigner from './VenueLayoutDesigner';
import './ManageVenues.css';

const PAGE_SIZE = 5;

const ManageVenues = ({ columnPattern = 'CS_FIRST', onVenuesLoaded }) => {
  const [venues, setVenues] = useState([]);
  const [venueLoading, setVenueLoading] = useState(true);
  const [venueError, setVenueError] = useState('');
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venueForm, setVenueForm] = useState({ venue_name: '', location: '', rows_count: 6, columns_count: 6 });
  const [venueSearch, setVenueSearch] = useState('');
  const [venueActionMenu, setVenueActionMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [layoutVenue, setLayoutVenue] = useState(null);

  // Use a ref for the callback so loadVenues doesn't re-create on parent re-renders
  const onVenuesLoadedRef = useRef(onVenuesLoaded);
  useEffect(() => { onVenuesLoadedRef.current = onVenuesLoaded; }, [onVenuesLoaded]);

  const loadVenues = useCallback(async () => {
    setVenueLoading(true);
    try {
      const res = await fetchVenues();
      if (res.success) {
        setVenues(res.data || []);
        onVenuesLoadedRef.current?.(res.data || []);
      } else {
        setVenueError(res.message || 'Failed to load venues');
      }
    } catch {
      setVenueError('Failed to connect to server');
    } finally {
      setVenueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const filteredVenues = venues
    .filter(v => v.venue_name?.toLowerCase().includes(venueSearch.toLowerCase()))
    .sort((a, b) => (a.venue_name || '').localeCompare(b.venue_name || ''));

  const totalPages = Math.max(1, Math.ceil(filteredVenues.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedVenues = filteredVenues.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
        setVenueForm({ venue_name: '', location: '', rows_count: 6, columns_count: 6 });
        const freshRes = await fetchVenues();
        if (freshRes.success) {
          setVenues(freshRes.data || []);
          onVenuesLoadedRef.current?.(freshRes.data || []);
        }
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
      if (res.success) {
        const freshRes = await fetchVenues();
        if (freshRes.success) {
          setVenues(freshRes.data || []);
          onVenuesLoadedRef.current?.(freshRes.data || []);
        }
      } else alert(res.message || 'Failed to delete venue');
    } catch {
      alert('Server error deleting venue');
    }
  };

  const openEditVenue = (v) => {
    setEditingVenue(v);
    setVenueForm({ venue_name: v.venue_name, location: v.location || '', rows_count: v.rows_count, columns_count: v.columns_count });
    setShowVenueForm(true);
  };

  const handleToggleVenueStatus = async (venue) => {
    const newStatus = venue.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await toggleVenueStatus(venue.id, newStatus);
      if (res.success) {
        const updated = venues.map(v => v.id === venue.id ? { ...v, status: newStatus } : v);
        setVenues(updated);
        onVenuesLoaded?.(updated);
      } else {
        alert(res.message || 'Failed to update status');
      }
    } catch {
      alert('Server error updating venue status');
    }
  };

  const getColumnCluster = (colIdx) => columnPattern === 'CS_FIRST'
    ? (colIdx % 2 === 0 ? 'CS' : 'CORE')
    : (colIdx % 2 === 0 ? 'CORE' : 'CS');

  return (
    <div className="mv-root">
      {/* Topbar */}
      <div className="mv-topbar">
        <div className="mv-search-wrap">
          <Search size={18} className="mv-search-icon" />
          <input
            type="text"
            placeholder="Search venues..."
            className="mv-search-input"
            value={venueSearch}
            onChange={(e) => { setVenueSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button
          className="mv-btn mv-btn-primary"
          onClick={() => {
            setEditingVenue(null);
            setVenueForm({ venue_name: '', location: '', rows_count: 6, columns_count: 6 });
            setShowVenueForm(true);
          }}
        >
          <Plus size={16} /> Create Venue
        </button>
      </div>

      {/* Table Card */}
      <div className="mv-table-card">
        {venueLoading && (
          <div className="mv-loading">
            <RefreshCw size={20} className="mv-spin" /> Loading...
          </div>
        )}

        {venueError ? (
          <div className="mv-empty">
            <AlertTriangle size={32} />
            <p>{venueError}</p>
            <button className="mv-btn mv-btn-outline mv-btn-sm" onClick={loadVenues}>Retry</button>
          </div>
        ) : venues.length === 0 && !venueLoading ? (
          <div className="mv-empty">
            <Building2 size={40} strokeWidth={1.5} />
            <p>No venues created yet</p>
            <p className="mv-empty-sub">Create venues that can be used during slot allocation</p>
            <button
              className="mv-btn mv-btn-primary"
              onClick={() => {
                setEditingVenue(null);
                setVenueForm({ venue_name: '', location: '', rows_count: 6, columns_count: 6 });
                setShowVenueForm(true);
              }}
            >
              <Plus size={16} /> Create Venue
            </button>
          </div>
        ) : (
          <div className="mv-table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Venue Details</th>
                  <th>Rows</th>
                  <th>Columns</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVenues.map((v) => (
                  <tr key={v.id} className={v.status === 'Inactive' ? 'mv-row-inactive' : ''}>
                    <td>
                      <div className="mv-venue-cell">
                        <div className="mv-venue-name">{v.venue_name}</div>
                        <div className="mv-venue-location">
                          <MapPin size={14} />
                          <span>{v.location || 'No location'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{v.rows_count}</td>
                    <td>{v.columns_count}</td>
                    <td>
                      <div className="mv-capacity">
                        <Users size={16} />
                        <span>{v.total_capacity}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        className={`mv-status ${v.status === 'Active' ? 'mv-status-active' : 'mv-status-inactive'}`}
                        onClick={() => handleToggleVenueStatus(v)}
                        title={v.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {v.status || 'Active'}
                      </button>
                    </td>
                    <td>
                      <div className="mv-action-cell">
                        <button
                          className="mv-action-btn"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredVenues.length > PAGE_SIZE && (
          <div className="mv-pagination">
            <span className="mv-page-info">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredVenues.length)} of {filteredVenues.length}
            </span>
            <div className="mv-page-controls">
              <button
                className="mv-page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`mv-page-num ${safePage === i + 1 ? 'mv-page-active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="mv-page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showVenueForm && (
        <div className="mv-modal-overlay" onClick={() => setShowVenueForm(false)}>
          <div className="mv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-header">
              <h3>{editingVenue ? 'Edit Venue' : 'Create New Venue'}</h3>
              <button className="mv-close-btn" onClick={() => setShowVenueForm(false)}><X size={18} /></button>
            </div>
            <div className="mv-modal-body">
              <div className="mv-field">
                <label>Venue Name</label>
                <input
                  type="text"
                  value={venueForm.venue_name}
                  onChange={(e) => setVenueForm((p) => ({ ...p, venue_name: e.target.value }))}
                  placeholder="e.g. Seminar Hall 1"
                  className="mv-input"
                />
              </div>
              <div className="mv-field">
                <label>Location</label>
                <div className="mv-input-icon-wrap">
                  <MapPin size={16} className="mv-input-icon" />
                  <input
                    type="text"
                    value={venueForm.location}
                    onChange={(e) => setVenueForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Building A, Floor 2"
                    className="mv-input mv-input-with-icon"
                  />
                </div>
              </div>
              <div className="mv-field-row">
                <div className="mv-field">
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
                    className="mv-input"
                  />
                  <span className="mv-hint">A–Z (max 26)</span>
                </div>
                <div className="mv-field">
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
                    className="mv-input"
                  />
                </div>
                <div className="mv-field">
                  <label>Total</label>
                  <div className="mv-total">{venueForm.rows_count * venueForm.columns_count}</div>
                </div>
              </div>
              <div className="mv-preview">
                <span className="mv-preview-label">Column Pattern Preview</span>
                <div className="mv-preview-cols">
                  {Array.from({ length: Math.min(venueForm.columns_count, 12) }, (_, i) => {
                    const cl = getColumnCluster(i);
                    return (
                      <div key={i} className={`mv-col ${cl === 'CS' ? 'mv-col-cs' : 'mv-col-core'}`}>
                        {i + 1}
                      </div>
                    );
                  })}
                  {venueForm.columns_count > 12 && <span className="mv-col-more">+{venueForm.columns_count - 12}</span>}
                </div>
              </div>
            </div>
            <div className="mv-modal-footer">
              <button className="mv-btn mv-btn-ghost" onClick={() => setShowVenueForm(false)}>Cancel</button>
              <button className="mv-btn mv-btn-primary" onClick={handleSaveVenue}>
                <Save size={15} /> {editingVenue ? 'Update Venue' : 'Create Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Action Menu (rendered outside table to avoid opacity inheritance) */}
      {venueActionMenu && (() => {
        const v = venues.find(ve => ve.id === venueActionMenu.id);
        if (!v) return null;
        return (
          <>
            <div className="mv-menu-overlay" onClick={() => setVenueActionMenu(null)} />
            <div className="mv-action-menu" style={{ top: venueActionMenu.y, left: venueActionMenu.x }}>
              <button className="mv-menu-item" onClick={() => { openEditVenue(v); setVenueActionMenu(null); }}>
                <Edit3 size={14} /> Edit Venue
              </button>
              <button className="mv-menu-item" onClick={() => { setLayoutVenue(v); setVenueActionMenu(null); }}>
                <LayoutGrid size={14} /> Design Layout
              </button>
              <button className="mv-menu-item mv-menu-danger" onClick={() => { handleDeleteVenue(v.id); setVenueActionMenu(null); }}>
                <Trash2 size={14} /> Delete Venue
              </button>
            </div>
          </>
        );
      })()}

      {/* Layout Designer Modal */}
      {layoutVenue && (
        <VenueLayoutDesigner
          venue={layoutVenue}
          onClose={() => setLayoutVenue(null)}
          onSaved={() => setLayoutVenue(null)}
        />
      )}
    </div>
  );
};

export default ManageVenues;