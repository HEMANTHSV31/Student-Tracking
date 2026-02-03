import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Loader
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../utils/api';

const SkillOrderManager = ({ selectedCourseType = 'frontend' }) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    is_prerequisite: true,
    description: ''
  });
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

  const handleAddSkill = async () => {
    if (!newSkill.skill_name.trim()) {
      showMessage('error', 'Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      const response = await apiPost('/skill-order', {
        course_type: localSelectedCourse,
        skill_name: newSkill.skill_name.trim(),
        is_prerequisite: newSkill.is_prerequisite,
        description: newSkill.description.trim() || null
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', 'Skill added successfully');
        setShowAddModal(false);
        setNewSkill({ skill_name: '', is_prerequisite: true, description: '' });
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
                <span style={styles.skillMeta}>Applied to all venues</span>
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
    border: '1px solid #e5e7eb',
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
    border: '1px solid #e5e7eb',
    cursor: 'move',
    transition: 'all 0.2s ease',
  },
  skillItemDragging: {
    borderColor: '#3b82f6',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '400px',
    margin: '16px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  modalCloseButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
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
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
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
