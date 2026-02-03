import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader,
  Edit2
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../utils/api';

const SkillOrderManager = ({ selectedCourseType = 'frontend', venues = [] }) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCourseTypeModal, setShowCourseTypeModal] = useState(false);
  const [showAssociationsModal, setShowAssociationsModal] = useState(false);
  const [newCourseType, setNewCourseType] = useState('');
  const [newCourseTypeVenues, setNewCourseTypeVenues] = useState([]);
  const [applyToAllVenuesForCourseType, setApplyToAllVenuesForCourseType] = useState(true);
  const [editingSkill, setEditingSkill] = useState(null);
  const [currentSkillForAssociations, setCurrentSkillForAssociations] = useState(null);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    is_prerequisite: true,
    description: '',
    apply_to_all_venues: true,
    apply_to_all_years: true,
    venue_ids: [],
    years: []
  });
  const [venueSearchTerm, setVenueSearchTerm] = useState('');
  const [courseTypeVenueSearch, setCourseTypeVenueSearch] = useState('');
  const [manageVenueSearch, setManageVenueSearch] = useState('');
  const [message, setMessage] = useState({ show: false, type: '', text: '' });
  const [draggedItem, setDraggedItem] = useState(null);
  const [courseTypes, setCourseTypes] = useState([]);
  const [localSelectedCourse, setLocalSelectedCourse] = useState(selectedCourseType);

  // Fetch course types
  useEffect(() => {
    const fetchCourseTypes = async () => {
      try {
        const response = await apiGet('/skill-order/course-types');
        const data = await response.json();
        if (data.success) {
          setCourseTypes(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching course types:', err);
      }
    };
    fetchCourseTypes();
  }, []);

  // Sync local course selection with parent prop
  useEffect(() => {
    setLocalSelectedCourse(selectedCourseType);
  }, [selectedCourseType]);

  // Fetch skill order
  useEffect(() => {
    fetchSkillOrder();
    fetchAvailableSkills();
  }, [localSelectedCourse]);

  const fetchSkillOrder = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/skill-order?course_type=${localSelectedCourse}`;

      const response = await apiGet(`/skill-order?course_type=${localSelectedCourse}`);
      const data = await response.json();
      if (data.success) {
        const filteredSkills = data.data
          .filter(s => s.course_type === localSelectedCourse)
          .sort((a, b) => a.display_order - b.display_order);
        setSkills(filteredSkills);
      }
    } catch (error) {
      console.error('Error fetching skill order:', error);
      showMessage('error', 'Failed to fetch skill order');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSkills = async () => {
    try {
      const response = await apiGet('/skill-order/available-skills');

      const data = await response.json();
      if (data.success) {
        setAvailableSkills(data.data);
      }
    } catch (error) {
      console.error('Error fetching available skills:', error);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 3000);
  };

  const handleCreateCourseType = async () => {
    if (!newCourseType.trim()) {
      showMessage('error', 'Please enter a course type name');
      return;
    }

    if (!applyToAllVenuesForCourseType && newCourseTypeVenues.length === 0) {
      showMessage('error', 'Please select at least one venue or enable "Apply to All Venues"');
      return;
    }

    setSaving(true);
    try {
      const courseTypeSlug = newCourseType.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Create a placeholder skill entry to establish the course type
      const response = await apiPost('/skill-order', {
        course_type: courseTypeSlug,
        skill_name: 'Getting Started',
        is_prerequisite: false,
        description: 'First skill in ' + newCourseType.trim(),
        apply_to_all_venues: applyToAllVenuesForCourseType,
        venue_ids: applyToAllVenuesForCourseType ? [] : newCourseTypeVenues,
        apply_to_all_years: true,
        years: []
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Course type created successfully! Now add skills to it.');
        setShowCourseTypeModal(false);
        setNewCourseType('');
        setNewCourseTypeVenues([]);
        setApplyToAllVenuesForCourseType(true);
        // Refresh the page or notify parent to refresh course types
        window.location.reload();
      } else {
        showMessage('error', data.message || 'Failed to create course type');
      }
    } catch (error) {
      console.error('Error creating course type:', error);
      showMessage('error', 'Failed to create course type');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.skill_name.trim()) {
      showMessage('error', 'Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course_type: localSelectedCourse,
        skill_name: newSkill.skill_name.trim(),
        is_prerequisite: newSkill.is_prerequisite,
        description: newSkill.description.trim() || null,
        apply_to_all_venues: newSkill.apply_to_all_venues,
        apply_to_all_years: newSkill.apply_to_all_years
      };

      // Add venue and year selections if not applying to all
      if (!newSkill.apply_to_all_venues && newSkill.venue_ids.length > 0) {
        payload.venue_ids = newSkill.venue_ids;
      }
      if (!newSkill.apply_to_all_years && newSkill.years.length > 0) {
        payload.years = newSkill.years;
      }

      const response = await apiPost('/skill-order', payload);

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Skill added successfully');
        setShowAddModal(false);
        setNewSkill({ 
          skill_name: '', 
          is_prerequisite: true, 
          description: '',
          apply_to_all_venues: true,
          apply_to_all_years: true,
          venue_ids: [],
          years: []
        });
        fetchSkillOrder();
      } else {
        showMessage('error', data.message || 'Failed to add skill');
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      showMessage('error', 'Failed to add skill');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!confirm('Are you sure you want to delete this skill from the order?')) {
      return;
    }

    try {
      const response = await apiDelete(`/skill-order/${skillId}`);

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Skill removed from order');
        fetchSkillOrder();
      } else {
        showMessage('error', data.message || 'Failed to delete skill');
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      showMessage('error', 'Failed to delete skill');
    }
  };

  const handleTogglePrerequisite = async (skillId, currentValue) => {
    try {
      const response = await apiPut(`/skill-order/${skillId}`, {
        is_prerequisite: !currentValue
      });

      const data = await response.json();
      if (data.success) {
        setSkills(prev => prev.map(s => 
          s.id === skillId ? { ...s, is_prerequisite: !currentValue } : s
        ));
      }
    } catch (error) {
      console.error('Error updating skill:', error);
    }
  };

  const handleEditSkill = async () => {
    if (!editingSkill.skill_name.trim()) {
      showMessage('error', 'Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      const response = await apiPut(`/skill-order/${editingSkill.id}`, {
        skill_name: editingSkill.skill_name.trim(),
        is_prerequisite: editingSkill.is_prerequisite,
        description: editingSkill.description.trim() || null
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Skill updated successfully');
        setShowEditModal(false);
        setEditingSkill(null);
        fetchSkillOrder();
      } else {
        showMessage('error', data.message || 'Failed to update skill');
      }
    } catch (error) {
      console.error('Error updating skill:', error);
      showMessage('error', 'Failed to update skill');
    } finally {
      setSaving(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) return;
    
    if (draggedItem !== index) {
      const newSkills = [...skills];
      const draggedSkill = newSkills[draggedItem];
      newSkills.splice(draggedItem, 1);
      newSkills.splice(index, 0, draggedSkill);
      
      newSkills.forEach((skill, idx) => {
        skill.display_order = idx + 1;
      });
      
      setSkills(newSkills);
      setDraggedItem(index);
    }
  };

  const handleDragEnd = async () => {
    if (draggedItem === null) return;
    
    setDraggedItem(null);
    
    setSaving(true);
    try {
      const response = await apiPut('/skill-order/reorder/bulk', {
        skills: skills.map((s, idx) => ({
          id: s.id,
          display_order: idx + 1
        }))
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Order saved successfully');
      } else {
        showMessage('error', 'Failed to save order');
        fetchSkillOrder();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      showMessage('error', 'Failed to save order');
      fetchSkillOrder();
    } finally {
      setSaving(false);
    }
  };

  const handleManageAssociations = (skill) => {
    setCurrentSkillForAssociations({
      ...skill,
      selectedVenues: skill.venues?.map(v => v.venue_id) || [],
      selectedYears: skill.years || [],
      apply_to_all_venues: skill.apply_to_all_venues !== false,
      apply_to_all_years: skill.apply_to_all_years !== false
    });
    setShowAssociationsModal(true);
  };

  const handleUpdateAssociations = async () => {
    if (!currentSkillForAssociations) return;

    setSaving(true);
    try {
      const response = await apiPut(`/skill-order/${currentSkillForAssociations.id}/associations`, {
        venue_ids: currentSkillForAssociations.selectedVenues,
        years: currentSkillForAssociations.selectedYears,
        apply_to_all_venues: currentSkillForAssociations.apply_to_all_venues,
        apply_to_all_years: currentSkillForAssociations.apply_to_all_years
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Associations updated successfully');
        setShowAssociationsModal(false);
        setCurrentSkillForAssociations(null);
        fetchSkillOrder();
      } else {
        showMessage('error', data.message || 'Failed to update associations');
      }
    } catch (error) {
      console.error('Error updating associations:', error);
      showMessage('error', 'Failed to update associations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Course Type Filters */}
      {courseTypes.length > 0 && (
        <div style={styles.courseFilterBar}>
          <div style={styles.courseFilterLabel}>Course Type:</div>
          <div style={styles.courseFilterButtons}>
            {courseTypes.map(type => (
              <button
                key={type}
                onClick={() => setLocalSelectedCourse(type)}
                style={{
                  ...styles.courseFilterBtn,
                  ...(localSelectedCourse === type ? styles.courseFilterBtnActive : {})
                }}
              >
                {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            Skill Order - {localSelectedCourse.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </h2>
          <p style={styles.subtitle}>
            Define the order in which students must complete skills. Drag to reorder.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setShowCourseTypeModal(true)}
            style={styles.secondaryButton}
            title="Create new course type (main skill category)"
          >
            <Plus size={16} />
            Create Course Type
          </button>
          <button
            onClick={fetchSkillOrder}
            style={styles.iconButton}
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={styles.primaryButton}
          >
            <Plus size={16} />
            Add Skill
          </button>
        </div>
      </div>

      {/* Message Toast */}
      {message.show && (
        <div style={{
          ...styles.message,
          ...(message.type === 'success' ? styles.messageSuccess : styles.messageError)
        }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Skills List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: '8px', color: '#64748b' }}>Loading skills...</span>
        </div>
      ) : skills.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No skills configured for this course type.</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>Click "Add Skill" to create your first skill in the order.</p>
        </div>
      ) : (
        <div style={styles.skillsList}>
          {skills.map((skill, index) => (
            <div
              key={skill.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                ...styles.skillItem,
                ...(draggedItem === index ? styles.skillItemDragging : {})
              }}
            >
              <GripVertical size={20} color="#9ca3af" style={{ flexShrink: 0, cursor: 'grab' }} />
              
              <div style={styles.orderBadge}>
                {index + 1}
              </div>
              
              <div style={styles.skillInfo}>
                <div style={styles.skillName}>{skill.skill_name}</div>
                {skill.description && (
                  <div style={styles.skillDescription}>{skill.description}</div>
                )}
                <div style={styles.skillMeta}>
                  {skill.apply_to_all_venues !== false ? (
                    <span>📍 All Venues</span>
                  ) : skill.venues?.length > 0 ? (
                    <span>📍 {skill.venues.length} venue(s)</span>
                  ) : (
                    <span>📍 No venues</span>
                  )}
                  {' • '}
                  {skill.apply_to_all_years !== false ? (
                    <span>📅 All Years</span>
                  ) : skill.years?.length > 0 ? (
                    <span>📅 Year {skill.years.join(', ')}</span>
                  ) : (
                    <span>📅 No years</span>
                  )}
                </div>
              </div>
              
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={skill.is_prerequisite}
                  onChange={() => handleTogglePrerequisite(skill.id, skill.is_prerequisite)}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>Prerequisite</span>
              </label>
              
              <button
                onClick={() => handleManageAssociations(skill)}
                style={styles.manageButton}
                title="Manage venues and years"
              >
                Manage
              </button>
              
              <button
                onClick={() => {
                  setEditingSkill({ ...skill });
                  setShowEditModal(true);
                }}
                style={styles.editButton}
                title="Edit skill"
              >
                <Edit2 size={16} />
              </button>
              
              <button
                onClick={() => handleDeleteSkill(skill.id)}
                style={styles.deleteButton}
                title="Remove skill"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Skill Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Add Skill to Order</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={newSkill.skill_name}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, skill_name: e.target.value }))}
                  style={styles.input}
                  placeholder="e.g., JavaScript, React, Node.js"
                  list="available-skills"
                />
                <datalist id="available-skills">
                  {availableSkills.map((skill, idx) => (
                    <option key={idx} value={skill} />
                  ))}
                </datalist>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Description (optional)
                </label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                  style={styles.textarea}
                  placeholder="Brief description of this skill"
                  rows={2}
                />
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newSkill.is_prerequisite}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, is_prerequisite: e.target.checked }))}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>
                  Requires previous skill to be cleared (prerequisite)
                </span>
              </label>

              {/* Venue and Year Selection */}
              <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151', fontSize: '14px' }}>
                  🎯 Targeting Options
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                  Control which venues and years can access this skill
                </div>
                
                {/* VENUES SECTION */}
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151', fontSize: '13px' }}>
                    📍 Venues
                  </div>
                  
                  {/* Option 1: All Venues */}
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: newSkill.apply_to_all_venues ? '#EFF6FF' : '#fff',
                    border: newSkill.apply_to_all_venues ? '2px solid #3B82F6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setNewSkill(prev => ({ ...prev, apply_to_all_venues: true, venue_ids: [] }))}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
                      <input
                        type="radio"
                        checked={newSkill.apply_to_all_venues}
                        onChange={() => setNewSkill(prev => ({ ...prev, apply_to_all_venues: true, venue_ids: [] }))}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>All Venues</span>
                    </label>
                  </div>

                  {/* Option 2: Specific Venues */}
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: !newSkill.apply_to_all_venues ? '#EFF6FF' : '#fff',
                    border: !newSkill.apply_to_all_venues ? '2px solid #3B82F6' : '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}
                      onClick={() => setNewSkill(prev => ({ ...prev, apply_to_all_venues: false }))}>
                      <input
                        type="radio"
                        checked={!newSkill.apply_to_all_venues}
                        onChange={() => setNewSkill(prev => ({ ...prev, apply_to_all_venues: false }))}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>Select Specific Venues</span>
                    </label>

                    {!newSkill.apply_to_all_venues && venues && venues.length > 0 && (
                      <div style={{ marginTop: '10px', marginLeft: '24px' }}>
                        <input
                          type="text"
                          placeholder="🔍 Search venues..."
                          value={venueSearchTerm}
                          onChange={(e) => setVenueSearchTerm(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginBottom: '8px'
                          }}
                        />
                        <div style={{ 
                          maxHeight: '120px', 
                          overflowY: 'auto',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          padding: '6px',
                          backgroundColor: '#ffffff'
                        }}>
                        {venues
                          .filter(v => v.venue_id !== 'all')
                          .filter(v => v.venue_name.toLowerCase().includes(venueSearchTerm.toLowerCase()))
                          .sort((a, b) => a.venue_name.localeCompare(b.venue_name))
                          .map(venue => (
                          <label key={venue.venue_id} style={{ 
                            display: 'block', 
                            padding: '4px 6px',
                            cursor: 'pointer',
                            borderRadius: '3px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <input
                              type="checkbox"
                              checked={newSkill.venue_ids.includes(venue.venue_id)}
                              onChange={(e) => {
                                const updatedVenues = e.target.checked
                                  ? [...newSkill.venue_ids, venue.venue_id]
                                  : newSkill.venue_ids.filter(id => id !== venue.venue_id);
                                setNewSkill(prev => ({ ...prev, venue_ids: updatedVenues }));
                              }}
                              style={{ marginRight: '8px', accentColor: '#3B82F6' }}
                            />
                            <span style={{ fontSize: '13px' }}>{venue.venue_name}</span>
                          </label>
                        ))}
                        </div>
                      </div>
                    )}
                    {!newSkill.apply_to_all_venues && newSkill.venue_ids.length > 0 && (
                      <div style={{ 
                        marginTop: '8px', 
                        marginLeft: '24px',
                        padding: '6px 10px', 
                        backgroundColor: '#FEF3C7', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        color: '#92400E' 
                      }}>
                        ✓ {newSkill.venue_ids.length} venue(s) selected
                      </div>
                    )}
                  </div>
                </div>

                {/* YEARS SECTION */}
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#374151', fontSize: '13px' }}>
                    📅 Year Levels
                  </div>

                  {/* Option 1: All Years */}
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: newSkill.apply_to_all_years ? '#EFF6FF' : '#fff',
                    border: newSkill.apply_to_all_years ? '2px solid #3B82F6' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setNewSkill(prev => ({ ...prev, apply_to_all_years: true, years: [] }))}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
                      <input
                        type="radio"
                        checked={newSkill.apply_to_all_years}
                        onChange={() => setNewSkill(prev => ({ ...prev, apply_to_all_years: true, years: [] }))}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>All Years (1, 2, 3, 4)</span>
                    </label>
                  </div>

                  {/* Option 2: Specific Years */}
                  <div style={{ 
                    padding: '10px 12px', 
                    backgroundColor: !newSkill.apply_to_all_years ? '#EFF6FF' : '#fff',
                    border: !newSkill.apply_to_all_years ? '2px solid #3B82F6' : '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}
                      onClick={() => setNewSkill(prev => ({ ...prev, apply_to_all_years: false }))}>
                      <input
                        type="radio"
                        checked={!newSkill.apply_to_all_years}
                        onChange={() => setNewSkill(prev => ({ ...prev, apply_to_all_years: false }))}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>Select Specific Years</span>
                    </label>

                    {!newSkill.apply_to_all_years && (
                      <div style={{ marginLeft: '24px', marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4].map(year => (
                          <label key={year} style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            padding: '6px 12px',
                            backgroundColor: newSkill.years.includes(year) ? '#DBEAFE' : '#ffffff',
                            border: newSkill.years.includes(year) ? '2px solid #3B82F6' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}>
                            <input
                              type="checkbox"
                              checked={newSkill.years.includes(year)}
                              onChange={(e) => {
                                const updatedYears = e.target.checked
                                  ? [...newSkill.years, year]
                                  : newSkill.years.filter(y => y !== year);
                                setNewSkill(prev => ({ ...prev, years: updatedYears }));
                              }}
                              style={{ marginRight: '6px', accentColor: '#3B82F6' }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>Year {year}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {!newSkill.apply_to_all_years && newSkill.years.length > 0 && (
                      <div style={{ 
                        marginTop: '8px', 
                        marginLeft: '24px',
                        padding: '6px 10px', 
                        backgroundColor: '#FEF3C7', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        color: '#92400E' 
                      }}>
                        ✓ Year {newSkill.years.sort().join(', ')} selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowAddModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSkill}
                disabled={saving || !newSkill.skill_name.trim()}
                style={{
                  ...styles.primaryButton,
                  ...(saving || !newSkill.skill_name.trim() ? styles.disabledButton : {})
                }}
              >
                {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Add Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {showEditModal && editingSkill && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Skill</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSkill(null);
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Skill Name *
                </label>
                <input
                  type="text"
                  value={editingSkill.skill_name}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, skill_name: e.target.value }))}
                  style={styles.input}
                  placeholder="e.g., JavaScript, React, Node.js"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Description (optional)
                </label>
                <textarea
                  value={editingSkill.description || ''}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, description: e.target.value }))}
                  style={styles.textarea}
                  placeholder="Brief description of this skill"
                  rows={2}
                />
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={editingSkill.is_prerequisite}
                  onChange={(e) => setEditingSkill(prev => ({ ...prev, is_prerequisite: e.target.checked }))}
                  style={styles.checkbox}
                />
                <span style={styles.checkboxText}>
                  Requires previous skill to be cleared (prerequisite)
                </span>
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSkill(null);
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSkill}
                disabled={saving || !editingSkill.skill_name.trim()}
                style={{
                  ...styles.primaryButton,
                  ...(saving || !editingSkill.skill_name.trim() ? styles.disabledButton : {})
                }}
              >
                {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Update Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Associations Modal */}
      {showAssociationsModal && currentSkillForAssociations && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '450px' }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Venue & Year Settings</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                  {currentSkillForAssociations.skill_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssociationsModal(false);
                  setCurrentSkillForAssociations(null);
                  setManageVenueSearch('');
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Venues Section */}
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Venues</label>
                <select
                  value={currentSkillForAssociations.apply_to_all_venues ? 'all' : 'specific'}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setCurrentSkillForAssociations(prev => ({ ...prev, apply_to_all_venues: true, selectedVenues: [] }));
                    } else {
                      setCurrentSkillForAssociations(prev => ({ ...prev, apply_to_all_venues: false }));
                    }
                  }}
                  style={styles.input}
                >
                  <option value="all">All Venues</option>
                  <option value="specific">Select Specific Venues</option>
                </select>

                {!currentSkillForAssociations.apply_to_all_venues && venues && venues.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Search venues..."
                      value={manageVenueSearch}
                      onChange={(e) => setManageVenueSearch(e.target.value)}
                      style={styles.input}
                    />
                    <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', padding: '4px' }}>
                      {(() => {
                        const filteredVenues = venues
                          .filter(v => v.venue_id !== 'all')
                          .filter(v => v.venue_name?.toLowerCase().includes((manageVenueSearch || '').toLowerCase()))
                          .sort((a, b) => (a.venue_name || '').localeCompare(b.venue_name || ''));
                        
                        if (filteredVenues.length === 0) {
                          return <div style={{ padding: '12px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>No venues found</div>;
                        }
                        
                        return filteredVenues.map(venue => (
                          <label key={venue.venue_id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '8px 10px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: currentSkillForAssociations.selectedVenues.includes(venue.venue_id) ? '#e0f2fe' : 'transparent',
                            marginBottom: '2px'
                          }}>
                            <input
                              type="checkbox"
                              checked={currentSkillForAssociations.selectedVenues.includes(venue.venue_id)}
                              onChange={(e) => {
                                const updatedVenues = e.target.checked
                                  ? [...currentSkillForAssociations.selectedVenues, venue.venue_id]
                                  : currentSkillForAssociations.selectedVenues.filter(id => id !== venue.venue_id);
                                setCurrentSkillForAssociations(prev => ({ ...prev, selectedVenues: updatedVenues }));
                              }}
                              style={{ marginRight: '10px', accentColor: '#3b82f6' }}
                            />
                            <span style={{ fontSize: '14px', color: '#374151' }}>{venue.venue_name}</span>
                          </label>
                        ));
                      })()}
                    </div>
                    {currentSkillForAssociations.selectedVenues.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>
                        {currentSkillForAssociations.selectedVenues.length} venue(s) selected
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Years Section */}
              <div>
                <label style={styles.label}>Years</label>
                <select
                  value={currentSkillForAssociations.apply_to_all_years ? 'all' : 'specific'}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setCurrentSkillForAssociations(prev => ({ ...prev, apply_to_all_years: true, selectedYears: [] }));
                    } else {
                      setCurrentSkillForAssociations(prev => ({ ...prev, apply_to_all_years: false }));
                    }
                  }}
                  style={styles.input}
                >
                  <option value="all">All Years</option>
                  <option value="specific">Select Specific Years</option>
                </select>

                {!currentSkillForAssociations.apply_to_all_years && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                    {[1, 2, 3, 4].map(year => (
                      <label key={year} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={currentSkillForAssociations.selectedYears.includes(year)}
                          onChange={(e) => {
                            const updatedYears = e.target.checked
                              ? [...currentSkillForAssociations.selectedYears, year]
                              : currentSkillForAssociations.selectedYears.filter(y => y !== year);
                            setCurrentSkillForAssociations(prev => ({ ...prev, selectedYears: updatedYears }));
                          }}
                          style={{ marginRight: '6px' }}
                        />
                        <span style={{ fontSize: '14px' }}>Year {year}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowAssociationsModal(false);
                  setCurrentSkillForAssociations(null);
                  setManageVenueSearch('');
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAssociations}
                disabled={saving}
                style={{
                  ...styles.primaryButton,
                  ...(saving ? styles.disabledButton : {})
                }}
              >
                {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Type Modal */}
      {showCourseTypeModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '420px' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Course Type</h3>
              <button
                onClick={() => {
                  setShowCourseTypeModal(false);
                  setCourseTypeVenueSearch('');
                  setNewCourseType('');
                  setNewCourseTypeVenues([]);
                  setApplyToAllVenuesForCourseType(true);
                }}
                style={styles.modalCloseButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={newCourseType}
                  onChange={(e) => setNewCourseType(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., Frontend, Backend"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateCourseType()}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Saved as: {newCourseType ? newCourseType.toLowerCase().replace(/\s+/g, '-') : 'course-name'}
                </p>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={styles.label}>Venues</label>
                <select
                  value={applyToAllVenuesForCourseType ? 'all' : 'specific'}
                  onChange={(e) => {
                    if (e.target.value === 'all') {
                      setApplyToAllVenuesForCourseType(true);
                      setNewCourseTypeVenues([]);
                    } else {
                      setApplyToAllVenuesForCourseType(false);
                    }
                  }}
                  style={styles.input}
                >
                  <option value="all">All Venues</option>
                  <option value="specific">Select Specific Venues</option>
                </select>

                {!applyToAllVenuesForCourseType && venues && venues.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Search venues..."
                      value={courseTypeVenueSearch}
                      onChange={(e) => setCourseTypeVenueSearch(e.target.value)}
                      style={styles.input}
                    />
                    <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px', backgroundColor: '#f9fafb', borderRadius: '6px', padding: '4px' }}>
                      {(() => {
                        const filteredVenues = venues
                          .filter(v => v.venue_id !== 'all')
                          .filter(v => v.venue_name?.toLowerCase().includes((courseTypeVenueSearch || '').toLowerCase()))
                          .sort((a, b) => (a.venue_name || '').localeCompare(b.venue_name || ''));
                        
                        if (filteredVenues.length === 0) {
                          return <div style={{ padding: '12px', color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>No venues found</div>;
                        }
                        
                        return filteredVenues.map(venue => (
                          <label key={venue.venue_id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '8px 10px', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: newCourseTypeVenues.includes(venue.venue_id) ? '#e0f2fe' : 'transparent',
                            marginBottom: '2px'
                          }}>
                            <input
                              type="checkbox"
                              checked={newCourseTypeVenues.includes(venue.venue_id)}
                              onChange={(e) => {
                                const updatedVenues = e.target.checked
                                  ? [...newCourseTypeVenues, venue.venue_id]
                                  : newCourseTypeVenues.filter(id => id !== venue.venue_id);
                                setNewCourseTypeVenues(updatedVenues);
                              }}
                              style={{ marginRight: '10px', accentColor: '#3b82f6' }}
                            />
                            <span style={{ fontSize: '14px', color: '#374151' }}>{venue.venue_name}</span>
                          </label>
                        ));
                      })()}
                    </div>
                    {newCourseTypeVenues.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#3b82f6', fontWeight: '500' }}>
                        {newCourseTypeVenues.length} venue(s) selected
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => {
                  setShowCourseTypeModal(false);
                  setCourseTypeVenueSearch('');
                  setNewCourseType('');
                  setNewCourseTypeVenues([]);
                  setApplyToAllVenuesForCourseType(true);
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCourseType}
                disabled={saving || !newCourseType.trim()}
                style={{
                  ...styles.primaryButton,
                  ...((saving || !newCourseType.trim()) ? styles.disabledButton : {})
                }}
              >
                {saving && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                Create Course Type
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div style={styles.savingIndicator}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Saving changes...
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  courseFilterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
    padding: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '10px',
    border: 'none',
  },
  courseFilterLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    paddingLeft: '12px',
    minWidth: '90px',
  },
  courseFilterButtons: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
    flex: 1,
  },
  courseFilterBtn: {
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  courseFilterBtnActive: {
    backgroundColor: '#ffffff',
    color: '#2563eb',
    fontWeight: '700',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  message: {
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  messageSuccess: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
  },
  messageError: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 0',
    color: '#6b7280',
  },
  skillsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  skillItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'move',
    transition: 'all 0.2s ease',
  },
  skillItemDragging: {
    backgroundColor: '#eff6ff',
    opacity: 0.5,
  },
  orderBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '50%',
    fontWeight: '600',
    fontSize: '14px',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: '15px',
  },
  skillDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  skillMeta: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#3b82f6',
  },
  checkboxText: {
    fontSize: '14px',
    color: '#4b5563',
  },
  editButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  manageButton: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    marginRight: '8px',
  },
  deleteButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
    width: '100%',
    maxWidth: '400px',
    margin: '16px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: '1px solid #f3f4f6',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  modalCloseButton: {
    padding: '6px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  },
  modalBody: {
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 22px',
    borderTop: '1px solid #f3f4f6',
    backgroundColor: '#fafafa',
    borderRadius: '0 0 10px 10px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
  },
  cancelButton: {
    padding: '9px 16px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  savingIndicator: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

export default SkillOrderManager;
