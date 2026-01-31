
import React, { useState, useMemo, useEffect } from 'react';
import {
    PlusCircle,
    Search,
    RotateCw,
    MoreHorizontal,
    CloudUpload,
    Send,
    Calendar,
    ChevronDown,
    Link as LinkIcon,
    Filter // Assuming Filter icon exists or removing if not used
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../../../store/useAuthStore';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../utils/api';

const AssignmentDashboard = ({ selectedVenueId, venueName, venues, selectedCourseType }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;

  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  /* -------- FORM STATE -------- */
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState(''); // This will store venue_id for creation
  const [dueDate, setDueDate] = useState('');
  const [score, setScore] = useState(100);
  const [day, setDay] = useState(1);
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('link');
  const [externalUrl, setExternalUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [skillFilter, setSkillFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [skillOptions, setSkillOptions] = useState([]);

  // Auto-populate venue from header selection
  useEffect(() => {
    if (selectedVenueId && selectedVenueId !== 'all') {
      setGroup(selectedVenueId);
    }
  }, [selectedVenueId]);

  // Fetch skill options from skill_order table
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const url = selectedCourseType 
          ? `/skill-order?course_type=${selectedCourseType}`
          : `/skill-order`;
        
        const response = await apiGet(url);
        
        const data = await response.json();
        if (data.success) {
          setSkillOptions(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching skills:', err);
      }
    };
    
    fetchSkills();
  }, [selectedCourseType, API_URL]);

  // Fetch assignments for selected venue
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!selectedVenueId) return;

      setLoading(true);

      try {
        // Handle 'all' venues - fetch from all venues
        const url = selectedVenueId === 'all'
          ? `/tasks/all-venues?status=${statusFilter}`
          : `/tasks/venue/${selectedVenueId}?status=${statusFilter}`;
        
        const response = await apiGet(url);

        const data = await response.json();

        if (data.success) {
          const transformed = data.data.map(task => ({
            id: task.task_id,
            title: task.title,
            score: task.max_score,
            group: task.venue_name, // Displaying venue_name here
            venueId: task.venue_id, // Store actual venue_id for navigation
            day: task.day,
            dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
            status: task.status,
            skillFilter: task.skill_filter || '',
            totalSubmissions: task.total_submissions || 0,
            pendingSubmissions: task.pending_submissions || 0
          }));
          setAssignments(transformed);
        } 
      } catch (err) {
        console.error(' Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [selectedVenueId, statusFilter, API_URL]);

  /* -------- FILTER LOGIC -------- */
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = statusFilter === 'All' || item.status === statusFilter;
      const matchesCourseType = !selectedCourseType || !item.skillFilter || item.skillFilter === '' || 
        skillOptions.find(s => s.skill_name === item.skillFilter && s.course_type === selectedCourseType);
      return matchesSearch && matchesFilter && matchesCourseType;
    });
  }, [assignments, search, statusFilter, selectedCourseType, skillOptions]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssignments, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* -------- FORM ACTIONS -------- */
  const resetForm = () => {
    setTitle('');
    setGroup(''); // Reset group to empty
    setDueDate('');
    setScore(100);
    setDay(1);
    setDescription('');
    setMaterialType('link');
    setExternalUrl('');
    setFiles([]);
    setSkillFilter('');
  };

  const publishAssignment = async () => {
    if (!title || !group || !score) { // 'group' now holds venue_id for creation
      alert('Please fill required fields: Title, Venue, and Max Score');
      return;
    }

    if (materialType === 'link' && !externalUrl) {
      alert('Please provide an external URL or switch to file upload');
      return;
    }

    if (materialType === 'file' && files.length === 0) {
      alert('Please upload at least one file or switch to external link');
      return;
    }

    const isAllVenues = group === 'all';
    const confirmMessage = isAllVenues 
      ? `Are you sure you want to create this assignment for ALL ${venues.length} venues?`
      : 'Publish this assignment?';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('venue_id', isAllVenues ? venues[0]?.venue_id : group);
    formData.append('day', day);
    formData.append('due_date', dueDate);
    formData.append('max_score', score);
    formData.append('material_type', materialType);
    formData.append('skill_filter', skillFilter.trim());
    formData.append('course_type', selectedCourseType || 'frontend');
    formData.append('apply_to_all_venues', isAllVenues);

    if (materialType === 'link') {
      formData.append('external_url', externalUrl);
    } else {
      files.forEach(file => formData.append('files', file));
    }

    try {
      const response = await fetch(`${API_URL}/tasks/create`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.data.venues_count > 1) {
          alert(`✅ Assignment created for ${data.data.venues_count} venues successfully!\n\nTotal students: ${data.data.students_count}`);
        } else {
          alert(`✅ Assignment Published! ${data.data.students_count} students added.`);
        }
        resetForm();

        // Refresh assignments list only if not "all venues"
        if (!isAllVenues && selectedVenueId) {
          const refreshResponse = await apiGet(
            `/tasks/venue/${selectedVenueId}?status=${statusFilter}`
          );

          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            const transformed = refreshData.data.map(task => ({
              id: task.task_id,
              title: task.title,
              score: task.max_score,
              group: task.venue_name,
              venueId: task.venue_id,
              day: task.day,
              dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
              status: task.status,
              skillFilter: task.skill_filter || '',
              totalSubmissions: task.total_submissions || 0,
              pendingSubmissions: task.pending_submissions || 0
            }));
            setAssignments(transformed);
          }
        }
      } else {
        alert('❌ ' + (data.message || 'Failed to publish assignment'));
      }
    } catch (err) {
      console.error('❌ Error publishing:', err);
      alert('Failed to publish assignment. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  /* -------- STATUS ACTION -------- */
  const toggleTaskStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      const response = await apiPut(`/tasks/status/${id}`, { status: newStatus });

      const data = await response.json();

      if (data.success) {
        setAssignments(prev =>
          prev.map(a => a.id === id ? { ...a, status: newStatus } : a)
        );
        alert(data.message);
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update status');
    }

    setOpenMenuId(null);
  };

  /* -------- DELETE ACTION -------- */
  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone and will remove all submissions.')) {
      return;
    }

    try {
      console.log('Deleting task:', taskId);
      const response = await apiDelete(`/tasks/delete/${taskId}`);
      const data = await response.json();
      console.log('Delete response:', { status: response.status, data });

      if (data.success) {
        // Remove the task from the assignments list
        setAssignments(prevAssignments => 
          prevAssignments.filter(assignment => assignment.id !== taskId)
        );
        setOpenMenuId(null);
        alert('Task deleted successfully');
      } else {
        alert(data.message || 'Failed to delete task');
      }
    } catch (error) {
      alert('Error deleting task: ' + error.message);
    }
  };

  const handleRowClick = (assignment) => {
    navigate('/reports', {
      state: {
        taskId: assignment.id,
        taskTitle: assignment.title,
        venueId: assignment.venueId, // Use task's actual venue_id
        autoSelectTask: true
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.layoutGrid}>
        {/* LEFT PANEL - CREATE FORM */}
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <PlusCircle size={18} style={styles.headerIcon} />
            <h3 style={styles.title}>Create New Assignment</h3>
          </div>

          <div style={styles.formBody}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Assignment Title *</label>
              <input
                style={styles.textInput}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter assignment title"
                disabled={loading}
              />
            </div>

            <div style={styles.splitRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Target Venue / Class *</label>
                <div style={styles.relativeWrapper}>
                  <select
                    style={styles.selectInput}
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    disabled={loading}
                  >
                    <option value="" hidden>Select a venue... </option>
                    <option value="all" style={{ fontWeight: 'bold', color: '#3b82f6' }}> All Venues</option>
                    {venues.map(venue => (
                      <option key={venue.venue_id} value={venue.venue_id}>
                        {venue.venue_name} ({venue.student_count} students)
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={styles.dropdownIcon} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Select Day *</label>
                <input
                  type="number"
                  style={styles.textInput}
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  min="1"
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.splitRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Due Date</label>
                <div style={styles.relativeWrapper}>
                  <input
                    type="date"
                    style={styles.textInput}
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    disabled={loading}
                  />
                  <Calendar size={16} style={styles.dateIcon} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Max Score *</label>
                <input
                  type="number"
                  style={styles.textInput}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  min="1"
                  max="100"
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Description</label>
              <textarea
                style={styles.textareaInput}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the assignment requirements..."
                disabled={loading}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Skill Filter</label>
              <div style={styles.relativeWrapper}>
                <select
                  style={styles.selectInput}
                  value={skillFilter}
                  onChange={e => setSkillFilter(e.target.value)}
                  disabled={loading}
                >
                  <option value="">No skill filter (optional)</option>
                  {skillOptions
                    .filter(skill => !selectedCourseType || skill.course_type === selectedCourseType)
                    .map(skill => (
                      <option key={skill.id} value={skill.skill_name}>
                        {skill.skill_name} ({skill.course_type})
                      </option>
                    ))}
                </select>
                <ChevronDown size={16} style={styles.dropdownIcon} />
              </div>
            </div>

            {/* STUDY MATERIAL */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Study Material</label>
              <div style={styles.tabToggleGroup}>
                <button
                  style={materialType === 'link' ? styles.toggleBtnActive : styles.toggleBtn}
                  onClick={() => {
                    setMaterialType('link');
                    setFiles([]);
                  }}
                  disabled={loading}
                  type="button"
                >
                  External Link
                </button>
                <button
                  style={materialType === 'file' ? styles.toggleBtnActive : styles.toggleBtn}
                  onClick={() => {
                    setMaterialType('file');
                    setExternalUrl('');
                  }}
                  disabled={loading}
                  type="button"
                >
                  Upload File
                </button>
              </div>

              {materialType === 'link' ? (
                <div style={styles.relativeWrapper}>
                  <input
                    style={styles.textInput}
                    placeholder="e.g. https://resource.link"
                    value={externalUrl}
                    onChange={e => setExternalUrl(e.target.value)}
                    disabled={loading}
                  />
                  <LinkIcon size={16} style={styles.dateIcon} />
                </div>
              ) : (
                <div
                  style={{ ...styles.uploadBox, cursor: loading ? 'not-allowed' : 'pointer' }}
                  onClick={() => !loading && document.getElementById('fileUpload').click()}
                >
                  <CloudUpload size={28} style={styles.cloudIcon} />
                  <input
                    id="fileUpload"
                    type="file"
                    multiple
                    accept=".pdf,.svg,.png,.jpg,.jpeg,.mp4,.webm,.zip,.cpp,.c,.py,.js,.java"
                    hidden
                    onChange={(e) => setFiles([...e.target.files])}
                    disabled={loading}
                  />
                  <div style={styles.uploadText}>
                    <span style={styles.blueLink}>Click to upload</span> images, PDFs, or code files
                  </div>
                  {files.length > 0 && (
                    <div style={{ marginTop: '10px', width: '100%' }}>
                      {files.map((f, i) => (
                        <div key={i} style={styles.uploadSubtext}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={styles.formFooter}>
            <button
              style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}
              onClick={publishAssignment}
              disabled={loading}
            >
              <Send size={16} style={{ marginRight: 8 }} />
              {loading ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - ASSIGNMENTS LIST */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.title}>Recent Assignments ({venueName})</h3>
            <div style={styles.utilActions}>
              {/* Assuming Filter is a component or icon. If not defined, remove it. */}
              <Filter size={18} style={styles.grayAction} />
              <RotateCw
                size={18}
                style={{ ...styles.grayAction, cursor: 'pointer' }}
                onClick={() => { setSearch(''); setStatusFilter('Active'); }}
              />
            </div>
          </div>

          <div style={styles.filterBar}>
            <div style={{ ...styles.relativeWrapper, flex: 1 }}>
              <Search size={16} style={styles.searchInsideIcon} />
              <input
                style={styles.searchField}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search assignments..."
              />
            </div>

            <div style={{ ...styles.relativeWrapper, width: '130px' }}>
              <select
                style={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option>Active</option>
                <option>Inactive</option>
                <option>All</option>
              </select>
              <ChevronDown size={16} style={styles.dropdownIcon} />
            </div>
          </div>

          <div style={styles.table}>
            <div style={styles.tableHeaderRow}>
              <div style={{ flex: 2.5 }}>Task Name</div>
              <div style={{ flex: 1 }}>Group</div>
              <div style={{ flex: 1 }}>Due Date</div>
              <div style={{ flex: 1 }}>Status</div>
              <div style={{ width: '40px' }}></div>
            </div>

            {loading && assignments.length === 0 ? (
              <div style={styles.emptyState}>Loading assignments...</div>
            ) : paginatedAssignments.length > 0 ? (
              paginatedAssignments.map(row => (
                <div
                  key={row.id}
                  style={{ ...styles.tableRow, cursor: 'pointer' }}
                  onClick={() => handleRowClick(row)}
                >
                  <div style={{ flex: 2.5 }}>
                    <div style={styles.boldText}>{row.title}</div>
                    <div style={styles.subtitleText}>
                      Day {row.day} | Max Score: {row.score}
                      {row.totalSubmissions > 0 && (
                        <span style={{ marginLeft: '10px', color: '#3b82f6' }}>
                          • {row.totalSubmissions} submissions
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>{row.group}</div>
                  <div style={{ flex: 1 }}>{row.dueDate || '--'}</div>
                  <div style={{ flex: 1 }}>
                    <span style={getStatusBadge(row.status)}>{row.status}</span>
                  </div>
                  <div style={{ width: '40px', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal
                      size={18}
                      color="#94A3B8"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevents row click from triggering
                        setOpenMenuId(openMenuId === row.id ? null : row.id);
                      }}
                    />
                    {openMenuId === row.id && (
                      <div style={{ position: 'absolute', right: 0, top: '22px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px', zIndex: 10, minWidth: '140px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <div
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#1F2937', borderBottom: '1px solid #E5E7EB' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskStatus(row.id, row.status);
                          }}
                        >
                          {row.status === 'Active' ? 'Set as Inactive' : 'Set as Active'}
                        </div>
                        <div
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#DC2626' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#FEF2F2'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(row.id);
                          }}
                        >
                          Delete Task
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                {search ? 'No matching assignments found.' : `No assignments yet for ${venueName}. Create your first assignment!`}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredAssignments.length > 0 && (
            <div style={styles.paginationContainer}>
              <div style={styles.paginationInfo}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} tasks
              </div>
              <div style={styles.paginationButtons}>
                <button
                  style={{
                    ...styles.paginationBtn,
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span style={styles.pageNumber}>Page {currentPage} of {totalPages}</span>
                <button
                  style={{
                    ...styles.paginationBtn,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div> {/* Close layoutGrid div */}
    </div> // Close container div
  );
};

const getStatusBadge = (status) => {
  const base = { padding: '4px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' };
  if (status === 'Active') return { ...base, backgroundColor: '#E1F5FE', color: '#0288D1' };
  return { ...base, backgroundColor: '#FFEBEE', color: '#D32F2F' };
};

const styles = {
  container: {
    width: '100%',
    fontFamily: '"Inter", sans-serif',
  },
  layoutGrid: {
    width: '100%',
    maxWidth: '100%',
    display: 'flex',
    gap: '24px',
    maxHeight: '850px',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E9EDF2',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
  },
  listCard: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E9EDF2',
    display: 'flex',
    flexDirection: 'column',    maxHeight: 'calc(100vh - 180px)',
    overflow: 'hidden'  },
  formHeader: {
    padding: '24px',
    borderBottom: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
  },
  headerIcon: { color: '#2563EB', marginRight: '10px' },
  title: { fontSize: '15px', fontWeight: '800', margin: 0, color: '#1F2937' },
  formBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  fieldLabel: { fontSize: '12px', fontWeight: '700', color: '#4B5563' },
  tabToggleGroup: {
    display: 'flex',
    backgroundColor: '#F3F4F6',
    padding: '4px',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  toggleBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6B7280',
    cursor: 'pointer',
    borderRadius: '6px'
  },
  toggleBtnActive: {
    flex: 1,
    padding: '8px',
    border: 'none',
    backgroundColor: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '700',
    color: '#2563EB',
    cursor: 'pointer',
    borderRadius: '6px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  textInput: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '13px',
    outline: 'none',
    color: '#1F2937',
    width: '100%',
    boxSizing: 'border-box'
  },
  textareaInput: {
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '13px',
    minHeight: '100px',
    outline: 'none',
    resize: 'none',
  },
  selectInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '13px',
    appearance: 'none',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    color: '#6B7280'
  },
  splitRow: { display: 'flex', gap: '16px' },
  relativeWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  dropdownIcon: { position: 'absolute', right: '12px', color: '#94A3B8', pointerEvents: 'none' },
  dateIcon: { position: 'absolute', right: '12px', color: '#4B5563', pointerEvents: 'none' },
  uploadBox: {
    padding: '28px',
    borderRadius: '8px',
    border: '2px dashed #D1D5DB',
    backgroundColor: '#EBF5FF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  cloudIcon: { color: '#94A3B8' },
  uploadText: { fontSize: '13px', color: '#4B5563', fontWeight: '500' },
  blueLink: { color: '#2563EB', fontWeight: '700' },
  uploadSubtext: { fontSize: '11px', color: '#94A3B8' },
  formFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    gap: '12px',
    backgroundColor: '#FAFBFC'
  },
  primaryBtn: {
    flex: 1.5,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563EB',
    color: 'white',
    fontWeight: '700',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  listHeader: { padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  utilActions: { display: 'flex', gap: '15px' },
  grayAction: { color: '#94A3B8' },
  filterBar: { padding: '0 30px 20px 30px', display: 'flex', gap: '12px' },
  searchInsideIcon: { position: 'absolute', left: '12px', color: '#94A3B8' },
  searchField: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
    backgroundColor: '#F8FAFC',
    fontSize: '13px',
    outline: 'none'
  },
  filterSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
    backgroundColor: 'white',
    fontSize: '13px',
    appearance: 'none',
    outline: 'none',
    color: '#374151'
  },
  table: { 
    display: 'flex', 
    flexDirection: 'column', 
    flex: 1,
    overflowY: 'auto',
    minHeight: 0
  },
  tableHeaderRow: {
    display: 'flex',
    padding: '14px 30px',
    backgroundColor: '#F8F9FB',
    borderBottom: '1px solid #E9EDF2',
    color: '#94A3B8',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.2px'
  },
  tableRow: {
    display: 'flex',
    padding: '18px 30px',
    borderBottom: '1px solid #F8FAFC',
    alignItems: 'center',
    fontSize: '13px'
  },
  boldText: { fontWeight: '800', color: '#1F2937', marginBottom: '2px' },
  subtitleText: { color: '#94A3B8', fontSize: '11px', fontWeight: '500' },
  emptyState: {
    padding: '40px 30px',
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid #F3F4F6',
    backgroundColor: '#FAFBFC'
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: '500'
  },
  paginationButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  paginationBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#4B5563',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  pageNumber: {
    fontSize: '13px',
    color: '#1F2937',
    fontWeight: '600',
    padding: '0 12px'
  }
};

export default AssignmentDashboard;