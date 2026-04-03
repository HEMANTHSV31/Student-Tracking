import React, { useState, useEffect } from 'react';
import './ManageCourses.css';
import { 
  Users, Layers, Plus, Trash2, Edit3, Save, X,
  CheckCircle, AlertTriangle, ArrowRight,
  Link, Unlink, BookOpen, Hash, Tag, 
  ChevronRight, Package, Grid3X3, Zap, Eye
} from 'lucide-react';
import { 
  fetchYearCourses, addYearCourse, updateYearCourse, deleteYearCourse, fetchClusters
} from '../../../../../services/assessmentVenueApi.js';

const ManageCourses = () => {
  const [activeYear, setActiveYear] = useState(1);
  const [activeCourseType, setActiveCourseType] = useState('CORE');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  // Form state for adding/editing
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    course_type: 'CORE',
    departments: [],
    sub_courses: [],
    // Non-core specific
    elective_number: null,
    elective_courses: [] // Array of { code, name }
  });
  const [selectedDepts, setSelectedDepts] = useState([]);

  // Course type options
  const COURSE_TYPES = [
    { id: 'CORE', label: 'Core', color: '#6366f1', icon: '📚' },
    { id: 'PROFESSIONAL_ELECTIVE', label: 'Professional Elective', color: '#8b5cf6', icon: '🎯' },
    { id: 'ADD_ON', label: 'Add-on', color: '#06b6d4', icon: '➕' },
    { id: 'HONORS_MINOR', label: 'Honors & Minor', color: '#f59e0b', icon: '🏅' }
  ];

  // Elective number configs per type
  const ELECTIVE_CONFIGS = {
    'PROFESSIONAL_ELECTIVE': {
      prefix: 'PE',
      label: 'Professional Elective',
      numbers: [1, 2, 3, 4, 5, 6],
      color: '#8b5cf6'
    },
    'ADD_ON': {
      prefix: 'AO',
      label: 'Add-on Course',
      numbers: [1, 2, 3, 4],
      color: '#06b6d4'
    },
    'HONORS_MINOR': {
      prefix: 'HM',
      label: 'Honor / Minor',
      numbers: [1, 2, 3, 4],
      color: '#f59e0b',
      // Sub-types for Honor vs Minor
      subTypes: [
        { id: 'HONOR', prefix: 'H', label: 'Honor', numbers: [1, 2, 3, 4] },
        { id: 'MINOR', prefix: 'M', label: 'Minor', numbers: [1, 2, 3, 4] }
      ]
    }
  };

  const [activeHMSubType, setActiveHMSubType] = useState('HONOR'); // For Honor & Minor tab

  // Dynamic Cluster Data
  const [clusterData, setClusterData] = useState([]);

  useEffect(() => {
    const loadClusters = async () => {
      try {
        const res = await fetchClusters();
        if (res.success) setClusterData(res.data);
      } catch (err) {
        console.error('Failed to load clusters:', err);
      }
    };
    loadClusters();
  }, []);

  const getClusterDepts = (type) => {
    const cluster = clusterData.find(c => c.year === activeYear && c.cluster_type === type);
    return cluster ? cluster.departments : [];
  };

  const CS_CLUSTER = getClusterDepts('CS');
  const CORE_CLUSTER = getClusterDepts('Core');
  const ALL_DEPARTMENTS = Array.from(new Set([...CS_CLUSTER, ...CORE_CLUSTER]));

  const DEPT_CODE_MAP = {
    'CSE': 'CS', 'IT': 'IT', 'AIDS': 'AI', 'AIML': 'AM', 'CSBS': 'CB',
    'ECE': 'EC', 'EEE': 'EE', 'E&I': 'EI', 'MECH': 'ME', 'MECTRONIC': 'MC',
    'AGRI': 'AG', 'BIOTECH': 'BT', 'CIVIL': 'CE', 'BME': 'BM', 'FT': 'FT'
  };

  const generateSubCode = (genericCode, dept) => {
    const code = DEPT_CODE_MAP[dept] || 'XX';
    return genericCode.replace(/XX/i, code);
  };
  
  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetchYearCourses(activeYear, activeCourseType);
      if (res.success) {
        const formatted = res.data.map(c => ({
          ...c,
          departments: Array.isArray(c.departments) 
            ? c.departments.map(d => (typeof d === 'string' ? { dept: d, name: c.course_name } : d))
            : []
        }));
        setCourses(formatted);
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to load courses' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [activeYear, activeCourseType]);

  useEffect(() => {
    if(msg.text) {
      const t = setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  // ── Get the display label for an elective number ──
  const getElectiveLabel = (courseType, electiveNumber, subType) => {
    if (courseType === 'HONORS_MINOR') {
      const pre = subType === 'MINOR' ? 'M' : 'H';
      const lab = subType === 'MINOR' ? 'Minor' : 'Honor';
      return `${lab} ${electiveNumber} (${pre}-${electiveNumber})`;
    }
    const config = ELECTIVE_CONFIGS[courseType];
    if (!config) return `#${electiveNumber}`;
    return `${config.label} ${electiveNumber} (${config.prefix}-${electiveNumber})`;
  };

  const getElectiveShortLabel = (courseType, electiveNumber, subType) => {
    if (courseType === 'HONORS_MINOR') {
      const pre = subType === 'MINOR' ? 'M' : 'H';
      return `${pre}-${electiveNumber}`;
    }
    const config = ELECTIVE_CONFIGS[courseType];
    if (!config) return `#${electiveNumber}`;
    return `${config.prefix}-${electiveNumber}`;
  };

  // ── Check if an elective number already has courses ──
  const getExistingElective = (electiveNumber) => {
    return courses.find(c => {
      // Parse the course_name to check if it matches the elective number
      const parsed = parseElectiveFromCourse(c);
      return parsed && parsed.electiveNumber === electiveNumber;
    });
  };

  // Parse elective info from a saved course
  const parseElectiveFromCourse = (course) => {
    if (!course || !course.course_name) return null;
    // Format: "PE-1", "AO-2", "H-1", "M-3" etc stored in course_name
    const match = course.course_name.match(/^(PE|AO|H|M)-(\d+)$/);
    if (match) {
      return {
        prefix: match[1],
        electiveNumber: parseInt(match[2]),
        subType: match[1] === 'H' ? 'HONOR' : match[1] === 'M' ? 'MINOR' : null
      };
    }
    return null;
  };

  // ── Handle Edit Action ──
  const handleEdit = (course) => {
    setEditId(course.id);
    
    const isCore = !course.course_type || course.course_type === 'CORE';
    
    if (isCore) {
      setFormData({
        course_name: '',
        course_code: course.course_code || '',
        course_type: 'CORE',
        departments: [...(course.departments || [])],
        sub_courses: [],
        elective_number: null,
        elective_courses: []
      });
    } else {
      // Parse the elective info from the course
      const parsed = parseElectiveFromCourse(course);
      const electiveNumber = parsed ? parsed.electiveNumber : 1;
      const subType = parsed ? parsed.subType : null;
      
      if (subType) {
        setActiveHMSubType(subType);
      }

      // Parse elective_courses from departments array
      const electiveCourses = (course.departments || []).map(sc => ({
        code: sc.course_code || '',
        name: sc.course_name || ''
      }));

      setFormData({
        course_name: course.course_name || '',
        course_code: '',
        course_type: course.course_type,
        departments: [],
        sub_courses: [],
        elective_number: electiveNumber,
        elective_courses: electiveCourses.length > 0 ? electiveCourses : [{ code: '', name: '' }]
      });
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setFormData({
      course_name: '',
      course_code: '',
      course_type: activeCourseType,
      departments: [],
      sub_courses: [],
      elective_number: null,
      elective_courses: []
    });
    setSelectedDepts([]);
  };

  // ── Handle Save (Create/Update) ──
  const handleSave = async () => {
    const isCore = formData.course_type === 'CORE';
    let payload;

    if (isCore) {
      if (!formData.course_code || formData.departments.length === 0) {
        setMsg({ type: 'error', text: 'Course code and at least one department are required for Core courses.' });
        return;
      }
      const missingName = formData.departments.some(d => !d.name || !d.name.trim());
      if (missingName) {
        setMsg({ type: 'error', text: 'Please provide course names for all selected departments.' });
        return;
      }
      const mainName = formData.departments.length === 1 
        ? formData.departments[0].name 
        : `${formData.departments[0].name} & Others`;
      
      payload = {
        year: activeYear,
        course_code: formData.course_code,
        course_type: 'CORE',
        course_name: mainName,
        departments: formData.departments
      };

    } else {
      // Non-Core (PE, Add-on, Honor/Minor)
      if (!formData.elective_number) {
        setMsg({ type: 'error', text: 'Please select an elective/group number first.' });
        return;
      }
      if (formData.elective_courses.length === 0) {
        setMsg({ type: 'error', text: 'Please add at least one course code.' });
        return;
      }
      const hasEmptyCode = formData.elective_courses.some(ec => !ec.code.trim());
      if (hasEmptyCode) {
        setMsg({ type: 'error', text: 'All courses must have a course code.' });
        return;
      }

      // Build the course_name as the elective identifier (e.g., "PE-1", "AO-2", "H-1", "M-3")
      let electiveId;
      if (formData.course_type === 'HONORS_MINOR') {
        const pre = activeHMSubType === 'MINOR' ? 'M' : 'H';
        electiveId = `${pre}-${formData.elective_number}`;
      } else {
        const config = ELECTIVE_CONFIGS[formData.course_type];
        if (config) {
          electiveId = `${config.prefix}-${formData.elective_number}`;
        } else {
          electiveId = `PE-${formData.elective_number}`;
        }
      }

      payload = {
        year: activeYear,
        course_name: electiveId,
        course_type: formData.course_type,
        course_code: `NC-${electiveId}-${Date.now()}`,
        departments: formData.elective_courses.map(ec => ({
          course_code: ec.code,
          course_name: ec.name || '',
          departments: [] // No per-course dept assignment needed
        }))
      };
    }

    try {
      setLoading(true);
      if (editId) {
        const res = await updateYearCourse(editId, payload);
        if (res.success) {
          setMsg({ type: 'success', text: 'Course updated successfully' });
          handleCancel();
          loadCourses();
        } else {
           setMsg({ type: 'error', text: res.message || 'Failed to update' });
        }
      } else {
        const res = await addYearCourse(payload);
        if (res.success) {
          setMsg({ type: 'success', text: 'Course added successfully' });
          handleCancel();
          loadCourses();
        } else {
           setMsg({ type: 'error', text: res.message || 'Failed to add' });
        }
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Delete ──
  const handleDelete = async (courseId) => {
    if(!window.confirm('Are you sure you want to delete this course?')) return false;
    try {
      setLoading(true);
      const res = await deleteYearCourse(courseId);
      if (res.success) {
        setMsg({ type: 'success', text: 'Course deleted successfully' });
        loadCourses();
        if (editId === courseId) handleCancel();
        return true;
      } else {
        setMsg({ type: 'error', text: 'Failed to delete course' });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Operation failed' });
    } finally {
      setLoading(false);
    }
  };

  // ── Core: Department Management ──
  const toggleDept = (dept) => {
    setFormData(prev => {
      const exists = prev.departments.some(d => d.dept === dept);
      if (exists) {
        return { ...prev, departments: prev.departments.filter(d => d.dept !== dept) };
      } else {
        return { ...prev, departments: [...prev.departments, { dept, name: '' }] };
      }
    });
  };

  const selectCluster = (clusterType) => {
    const list = clusterType === 'CS' ? CS_CLUSTER : CORE_CLUSTER;
    setFormData(prev => {
      const currentDepts = prev.departments.map(d => d.dept);
      const newItems = list
        .filter(d => !currentDepts.includes(d))
        .map(d => ({ dept: d, name: '' }));
      return {
        ...prev,
        departments: [...prev.departments, ...newItems]
      };
    });
  };

  const clearDepartments = () => {
    setFormData(prev => ({ ...prev, departments: [] }));
  };

  const toggleSelection = (dept) => {
    setSelectedDepts(prev => prev.includes(dept) ? prev.filter(p => p !== dept) : [...prev, dept]);
  };

  const createGroup = () => {
    if (selectedDepts.length < 2) return;
    const newGId = `g-${Date.now()}`;
    const firstSelected = formData.departments.find(d => d.dept === selectedDepts[0]);
    const commonName = firstSelected ? firstSelected.name : '';

    setFormData(prev => ({
      ...prev,
      departments: prev.departments.map(d => 
        selectedDepts.includes(d.dept) ? { ...d, gId: newGId, name: commonName } : d
      )
    }));
    setSelectedDepts([]);
  };

  const ungroup = (gId) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.map(d => 
        d.gId === gId ? { ...d, gId: null } : d
      )
    }));
  };

  const updateSubCourseName = (identifier, newName, isGId = false) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.map(d => {
        if (isGId && d.gId === identifier) return { ...d, name: newName };
        if (!isGId && d.dept === identifier) return { ...d, name: newName };
        return d;
      })
    }));
  };

  const getRenderGroups = () => {
    const groups = [];
    const seenGIds = new Set();
    const sortedDepts = [...formData.departments].sort((a,b) => a.dept.localeCompare(b.dept));
    
    sortedDepts.forEach(d => {
       if (d.gId) {
         if (!seenGIds.has(d.gId)) {
           const members = formData.departments.filter(m => m.gId === d.gId);
           groups.push({ type: 'group', id: d.gId, members, name: d.name });
           seenGIds.add(d.gId);
         }
       } else {
         groups.push({ type: 'single', id: d.dept, members: [d], name: d.name });
       }
    });
    return groups;
  };

  const renderGroups = getRenderGroups();

  // ── Non-Core: Elective Course Management ──
  const selectElectiveNumber = (num) => {
    const registered = getRegisteredElectives();
    if (registered[num]) {
      const courseToEdit = courses.find(c => c.id === registered[num].courseId);
      if (courseToEdit) {
        handleEdit(courseToEdit);
        return;
      }
    }

    setEditId(null);
    setFormData(prev => ({
      ...prev,
      course_name: '',
      course_code: '',
      elective_number: num,
      elective_courses: prev.elective_courses.length > 0 ? prev.elective_courses : [{ code: '', name: '' }]
    }));
  };

  const addElectiveCourse = () => {
    setFormData(prev => ({
      ...prev,
      elective_courses: [...prev.elective_courses, { code: '', name: '' }]
    }));
  };

  const removeElectiveCourse = (index) => {
    setFormData(prev => ({
      ...prev,
      elective_courses: prev.elective_courses.filter((_, i) => i !== index)
    }));
  };

  const updateElectiveCourseCode = (index, code) => {
    setFormData(prev => ({
      ...prev,
      elective_courses: prev.elective_courses.map((ec, i) => 
        i === index ? { ...ec, code } : ec
      )
    }));
  };

  const updateElectiveCourseName = (index, name) => {
    setFormData(prev => ({
      ...prev,
      elective_courses: prev.elective_courses.map((ec, i) => 
        i === index ? { ...ec, name } : ec
      )
    }));
  };

  // ── Get numbers for current non-core type dynamically ──
  const [dynamicExtraSlots, setDynamicExtraSlots] = useState(0);

  const getElectiveNumbers = () => {
    const registered = [];
    courses.forEach(c => {
      const parsed = parseElectiveFromCourse(c);
      if (parsed) {
        if (activeCourseType === 'HONORS_MINOR' && parsed.subType !== activeHMSubType) {
           return; 
        }
        registered.push(parsed.electiveNumber);
      }
    });
    
    const maxRegistered = registered.length > 0 ? Math.max(...registered) : 0;
    // Always show at least 4 slots, or up to the next available slot after the max registered
    let maxToShow = Math.max(4, maxRegistered + 1);
    
    maxToShow += dynamicExtraSlots;

    // Ensure the currently selected number from formData is always visible
    if (formData.elective_number && formData.elective_number > maxToShow) {
      maxToShow = formData.elective_number;
    }

    return Array.from({ length: maxToShow }, (_, i) => i + 1);
  };

  const getElectivePrefix = () => {
    if (activeCourseType === 'HONORS_MINOR') {
      const sub = ELECTIVE_CONFIGS['HONORS_MINOR'].subTypes.find(s => s.id === activeHMSubType);
      return sub ? sub.prefix : 'HM';
    }
    const config = ELECTIVE_CONFIGS[activeCourseType];
    return config ? config.prefix : '';
  };

  // Check which elective numbers are already registered
  const getRegisteredElectives = () => {
    const registered = {};
    courses.forEach(c => {
      const parsed = parseElectiveFromCourse(c);
      if (parsed) {
        registered[parsed.electiveNumber] = {
          courseId: c.id,
          courseCodes: (c.departments || []).map(d => d.course_code).filter(Boolean),
          courseCount: (c.departments || []).length
        };
      }
    });
    return registered;
  };

  // ── Common Course Detection Summary ──
  const getCommonCourseSummary = () => {
    if (activeCourseType === 'CORE') return [];
    
    return courses.map(course => {
      const parsed = parseElectiveFromCourse(course);
      if (!parsed) return null;
      
      const codes = (course.departments || []).map(d => ({
        code: d.course_code,
        name: d.course_name || ''
      })).filter(d => d.code);

      return {
        id: course.id,
        electiveId: course.course_name,
        label: getElectiveLabel(
          course.course_type, 
          parsed.electiveNumber, 
          parsed.subType
        ),
        shortLabel: course.course_name,
        courses: codes,
        courseCount: codes.length
      };
    }).filter(Boolean);
  };

  const isNonCore = activeCourseType !== 'CORE';

  return (
    <div className="aa-courses-container">
      <div className="aa-courses-hero">
        <div className="aa-courses-hero-left">
          <h2 className="aa-courses-title">
            <Layers size={22} /> Course Allocation Studio
          </h2>
        </div>
        <div className="aa-courses-controls-group">
          <div className="aa-courses-switch-group">
            <span className="aa-courses-switch-label">Year:</span>
            <div className="aa-courses-year-switch">
              {[1, 2, 3, 4].map(y => (
                <button
                  key={y}
                  className={`aa-courses-year-btn ${activeYear === y ? 'active' : ''}`}
                  onClick={() => { setActiveYear(y); handleCancel(); }}
                >
                  Year {y}
                </button>
              ))}
            </div>
          </div>
          <div className="aa-courses-switch-group">
            <span className="aa-courses-switch-label">Type:</span>
            <div className="aa-courses-type-switch">
              {COURSE_TYPES.map(ct => (
                <button
                  key={ct.id}
                  className={`aa-courses-type-btn ${activeCourseType === ct.id ? 'active' : ''}`}
                  onClick={() => { setActiveCourseType(ct.id); handleCancel(); }}
                  title={ct.label}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`aa-courses-alert ${msg.type === 'error' ? 'aa-courses-alert-error' : 'aa-courses-alert-ok'}`}>
          {msg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="aa-courses-card">
        <div className="aa-courses-card-head">
          <div className="aa-courses-card-title">
            {editId ? <Edit3 size={18} /> : <Plus size={18} />}
            <span>{editId ? 'Edit Course Configuration' : 'Create New Course'}</span>
          </div>
          {editId && (
            <button className="aa-courses-ghost" onClick={handleCancel}>
              <X size={14} /> Cancel
            </button>
          )}
        </div>

        {/* ═══ CORE COURSE FORM ═══ */}
        {activeCourseType === 'CORE' && (
          <div className="aa-courses-grid">
            <div className="aa-courses-left">
              <div className="aa-courses-field">
                <label className="aa-courses-label">
                  Course Code Pattern <span className="aa-courses-required">*</span>
                </label>
                <div className="aa-courses-input-wrap">
                  <input
                    type="text"
                    placeholder="e.g. 21XX402"
                    value={formData.course_code}
                    onChange={e => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
                    className="aa-courses-input aa-courses-mono"
                  />
                  <span className={`aa-courses-chip ${formData.course_code.includes('XX') ? 'aa-courses-chip-dynamic' : 'aa-courses-chip-static'}`}>
                    {formData.course_code.includes('XX') ? 'Dynamic' : 'Static'}
                  </span>
                </div>
                <p className="aa-courses-help">
                  Use <strong>XX</strong> as a placeholder (e.g., 22XX402) to auto-generate department-specific codes.
                </p>
              </div>
            </div>

            <div className="aa-courses-right">
              <div className="aa-courses-dept-selector">
                <div className="aa-courses-dept-head">
                  <label className="aa-courses-label">
                    Department Mapping & Naming <span className="aa-courses-required">*</span>
                  </label>
                  <div className="aa-courses-dept-actions">
                    <button onClick={() => selectCluster('CS')} className="aa-courses-chip-btn">CS Cluster</button>
                    <button onClick={() => selectCluster('Core')} className="aa-courses-chip-btn">Core Cluster</button>
                    <button onClick={clearDepartments} className="aa-courses-chip-btn aa-courses-chip-danger">Clear</button>
                  </div>
                </div>
                <div className="aa-courses-dept-grid">
                  {ALL_DEPARTMENTS.map(dept => (
                    <div
                      key={dept}
                      className={`aa-courses-dept-item ${formData.departments.some(d => d.dept === dept) ? 'selected' : ''}`}
                      onClick={() => toggleDept(dept)}
                    >
                      {dept}
                    </div>
                  ))}
                </div>
              </div>

              <div className="aa-courses-grouping-area">
                <div className="aa-courses-grouping-head">
                  <label className="aa-courses-label">Course Name Configuration</label>
                  <div className="aa-courses-grouping-actions">
                    <button
                      onClick={createGroup}
                      disabled={selectedDepts.length < 2}
                      className="aa-courses-ghost"
                    >
                      <Link size={14} /> Group Selected ({selectedDepts.length})
                    </button>
                  </div>
                </div>
                <p className="aa-courses-help">
                  Select departments from the list below to group them. Grouped departments will share the same course name.
                </p>
                <div className="aa-courses-render-groups">
                  {renderGroups.length === 0 && (
                    <div className="aa-courses-empty-state">No departments selected.</div>
                  )}
                  {renderGroups.map(g => (
                    <div key={g.id} className={`aa-courses-render-item ${g.type}`}>
                      {g.type === 'group' && (
                        <button onClick={() => ungroup(g.id)} className="aa-courses-ungroup-btn" title="Ungroup">
                          <Unlink size={14} />
                        </button>
                      )}
                      <div className="aa-courses-render-depts">
                        {g.members.map(m => (
                          <span
                            key={m.dept}
                            className={`aa-courses-dept-tag ${selectedDepts.includes(m.dept) ? 'highlighted' : ''}`}
                            onClick={() => toggleSelection(m.dept)}
                          >
                            {m.dept}
                          </span>
                        ))}
                      </div>
                      <div className="aa-courses-render-input">
                        <ArrowRight size={14} />
                        <input
                          type="text"
                          placeholder="Enter Course Name"
                          value={g.name}
                          onChange={e => updateSubCourseName(g.id, e.target.value, g.type === 'group')}
                          className="aa-courses-input"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ NON-CORE COURSE FORM (PE / Add-on / Honor & Minor) ═══ */}
        {isNonCore && (
          <div className="aa-nc-form">
            {/* ── Honor & Minor Sub-Type Toggle ── */}
            {activeCourseType === 'HONORS_MINOR' && (
              <div className="aa-nc-hm-toggle">
                {ELECTIVE_CONFIGS['HONORS_MINOR'].subTypes.map(st => (
                  <button
                    key={st.id}
                    className={`aa-nc-hm-btn ${activeHMSubType === st.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveHMSubType(st.id);
                      setFormData(prev => ({ ...prev, elective_number: null, elective_courses: [] }));
                      setEditId(null);
                    }}
                    style={{
                      '--hm-color': st.id === 'HONOR' ? '#f59e0b' : '#ec4899'
                    }}
                  >
                    <span className="aa-nc-hm-icon">{st.id === 'HONOR' ? '🏅' : '📜'}</span>
                    {st.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Step 1: Select Elective Number ── */}
            <div className="aa-nc-step">
              <div className="aa-nc-step-header">
                <div className="aa-nc-step-badge">1</div>
                <div className="aa-nc-step-info">
                  <h4 className="aa-nc-step-title">
                    Select {activeCourseType === 'HONORS_MINOR' 
                      ? (activeHMSubType === 'HONOR' ? 'Honor' : 'Minor') 
                      : ELECTIVE_CONFIGS[activeCourseType]?.label} Number
                  </h4>
                  <p className="aa-nc-step-desc">
                    Choose which elective slot this course group belongs to. All courses added under the same number will be treated as <strong>common courses</strong> for seating arrangement.
                  </p>
                </div>
              </div>

              <div className="aa-nc-number-grid">
                {getElectiveNumbers().map(num => {
                  const prefix = getElectivePrefix();
                  const label = `${prefix}-${num}`;
                  const registered = getRegisteredElectives();
                  const isRegistered = registered[num];
                  const isActive = formData.elective_number === num;
                  const isEditing = editId && isActive;

                  return (
                    <button
                      key={num}
                      className={`aa-nc-number-card ${isActive ? 'active' : ''} ${isRegistered && !isEditing ? 'registered' : ''}`}
                      onClick={() => selectElectiveNumber(num)}
                      style={{
                        '--card-color': ELECTIVE_CONFIGS[activeCourseType]?.color || '#8b5cf6'
                      }}
                    >
                      <div className="aa-nc-number-value">{label}</div>
                      <div className="aa-nc-number-status">
                        {isRegistered && !isEditing ? (
                          <>
                            <CheckCircle size={12} />
                            <span>{isRegistered.courseCount} course{isRegistered.courseCount !== 1 ? 's' : ''}</span>
                          </>
                        ) : isActive ? (
                          <>
                            <Zap size={12} />
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Available</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                
                {/* Dynamically Add More Slots Button */}
                <button
                  className="aa-nc-add-slot-btn"
                  onClick={() => setDynamicExtraSlots(prev => prev + 1)}
                  title="Add new elective slot"
                >
                  <Plus size={20} />
                  <span>New Slot</span>
                </button>

                {/* Dynamically Remove Slots Button */}
                {dynamicExtraSlots > 0 && (
                  <button
                    className="aa-nc-add-slot-btn aa-nc-remove-slot-btn"
                    onClick={() => {
                      const numbers = getElectiveNumbers();
                      const maxNumToRemove = numbers[numbers.length - 1];
                      setDynamicExtraSlots(prev => Math.max(0, prev - 1));
                      if (formData.elective_number === maxNumToRemove) {
                        setFormData(prev => ({ ...prev, elective_number: null, elective_courses: [] }));
                        setEditId(null);
                      }
                    }}
                    title="Remove last dynamic elective slot"
                  >
                    <Trash2 size={20} />
                    <span>Delete Slot</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Step 2: Add Course Codes ── */}
            {formData.elective_number && (
              <div className="aa-nc-step">
                <div className="aa-nc-step-header">
                  <div className="aa-nc-step-badge">2</div>
                  <div className="aa-nc-step-info">
                    <h4 className="aa-nc-step-title">
                      Add Course Codes for {getElectiveShortLabel(activeCourseType, formData.elective_number, activeHMSubType)}
                    </h4>
                    <p className="aa-nc-step-desc">
                      Add all course codes that belong to this elective group. Students with <strong>any</strong> of these codes will be treated as sitting the <strong>same exam</strong>.
                    </p>
                  </div>
                </div>

                <div className="aa-nc-courses-list">
                  {formData.elective_courses.map((ec, index) => (
                    <div key={index} className="aa-nc-course-row">
                      <div className="aa-nc-course-number">
                        <Hash size={14} />
                        <span>{index + 1}</span>
                      </div>
                      <div className="aa-nc-course-fields">
                        <div className="aa-nc-course-field">
                          <label className="aa-nc-field-label">Course Code <span className="aa-courses-required">*</span></label>
                          <input
                            type="text"
                            placeholder="e.g., 21CS601"
                            value={ec.code}
                            onChange={e => updateElectiveCourseCode(index, e.target.value.toUpperCase())}
                            className="aa-courses-input aa-courses-mono"
                          />
                        </div>
                        <div className="aa-nc-course-field">
                          <label className="aa-nc-field-label">Course Name <span className="aa-nc-optional">(optional)</span></label>
                          <input
                            type="text"
                            placeholder="e.g., Machine Learning"
                            value={ec.name}
                            onChange={e => updateElectiveCourseName(index, e.target.value)}
                            className="aa-courses-input"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => removeElectiveCourse(index)} 
                        className="aa-nc-course-delete"
                        disabled={formData.elective_courses.length <= 1}
                        title="Remove course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button onClick={addElectiveCourse} className="aa-nc-add-course-btn">
                    <Plus size={16} />
                    <span>Add Another Course Code</span>
                  </button>
                </div>

                {/* ── Common Course Preview ── */}
                {formData.elective_courses.some(ec => ec.code.trim()) && (
                  <div className="aa-nc-preview">
                    <div className="aa-nc-preview-header">
                      <Eye size={16} />
                      <span>Common Course Preview</span>
                    </div>
                    <div className="aa-nc-preview-body">
                      <div className="aa-nc-preview-badge">
                        {getElectiveShortLabel(activeCourseType, formData.elective_number, activeHMSubType)}
                      </div>
                      <div className="aa-nc-preview-arrow">
                        <ChevronRight size={16} />
                      </div>
                      <div className="aa-nc-preview-codes">
                        {formData.elective_courses.filter(ec => ec.code.trim()).map((ec, i) => (
                          <div key={i} className="aa-nc-preview-code-item">
                            <span className="aa-nc-preview-code">{ec.code}</span>
                            {ec.name && <span className="aa-nc-preview-name">{ec.name}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="aa-nc-preview-note">
                      <Zap size={12} />
                      These courses will be identified as the <strong>same exam</strong> during seating allocation. 
                      Students with any of these codes will be placed in the same venue/slot.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="aa-courses-card-foot">
          {editId && (
            <button 
              className="aa-courses-primary-btn aa-courses-danger-btn"
              onClick={() => handleDelete(editId)}
              disabled={loading}
              style={{ background: '#ef4444', marginRight: 'auto' }}
            >
              <Trash2 size={16} /> Delete Course
            </button>
          )}
          <button 
            className="aa-courses-primary-btn"
            onClick={handleSave}
            disabled={loading}
          >
            <Save size={16} /> {editId ? 'Save Changes' : 'Create Course'}
          </button>
        </div>
      </div>

      {/* ═══ EXISTING COURSES LIST ═══ */}
      <div className="aa-courses-list-head">
        <h4>Existing Courses (Year {activeYear} - {COURSE_TYPES.find(ct => ct.id === activeCourseType)?.label})</h4>
        <span className="aa-courses-count">{activeCourseType === 'CORE' ? courses.length : getCommonCourseSummary().length} total</span>
      </div>

      {isNonCore && courses.length > 0 && (
        <div className="aa-nc-detection-header" style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Grid3X3 size={18} style={{ color: '#3b82f6' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>Common Course Detection Active</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Courses mapped under the same group are treated as the <strong>same exam</strong> for seating allocation.</p>
          </div>
        </div>
      )}

      <div className="aa-courses-table-wrap">
        <table className="aa-courses-table aa-courses-table-main">
          <thead>
            <tr>
              <th>Generic Code</th>
              <th>Main Course Name</th>
              <th>Sub-Codes / Depts</th>
              <th className="aa-courses-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && courses.length === 0 ? (
              <tr><td colSpan="4" className="aa-courses-td-empty" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan="4" className="aa-courses-td-empty" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No courses found for this year and type. Add one to get started.</td></tr>
            ) : activeCourseType === 'CORE' ? (
              courses.map(course => (
                <tr key={course.id} className="aa-courses-table-row">
                  <td>
                    <div className="aa-courses-code-cell">
                      <span className="aa-courses-code-text" style={{ fontWeight: 700, color: '#0f172a' }}>{course.course_code}</span>
                      {course.course_code.includes('XX') && <span className="aa-courses-mini">Dynamic</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{course.course_name}</td>
                  <td>
                    {course.course_code.includes('XX') ? (
                      <div className="aa-courses-code-list">
                        {(() => {
                          const depts = course.departments || [];
                          const groups = [];
                          const seen = new Set();
                          
                          depts.forEach(d => {
                            if (typeof d === 'object' && d.gId) {
                              if (!seen.has(d.gId)) {
                                groups.push({
                                  isGroup: true,
                                  members: depts.filter(m => typeof m === 'object' && m.gId === d.gId)
                                });
                                seen.add(d.gId);
                              }
                            } else if (typeof d === 'object' && !d.gId) {
                              groups.push({ isGroup: false, data: d });
                            } else if (typeof d === 'string') {
                              groups.push({ isGroup: false, data: d });
                            }
                          });

                          return groups.map((g, idx) => {
                            if (g.isGroup) {
                              const deptStr = g.members.map(m => m.dept).join(' / ');
                              const codeStr = g.members.map(m => generateSubCode(course.course_code, m.dept)).join(' / ');
                              const name = g.members[0].name || course.course_name;
                              return (
                                <div key={idx} className="aa-courses-code-line">
                                  <span className="aa-courses-strong">{deptStr}</span>
                                  <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                                  <span className="aa-courses-code">{codeStr}</span>
                                  <span className="aa-courses-mini">({name})</span>
                                </div>
                              );
                            }

                            const d = g.data;
                            const deptName = typeof d === 'string' ? d : d.dept;
                            const cName = typeof d === 'string' ? course.course_name : d.name;
                            return (
                              <div key={idx} className="aa-courses-code-line">
                                <span className="aa-courses-strong">{deptName}</span>
                                <ArrowRight size={12} style={{ color: '#94a3b8' }} />
                                <span className="aa-courses-code">{generateSubCode(course.course_code, deptName)}</span>
                                <span className="aa-courses-mini">({cName})</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="aa-courses-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(course.departments || []).map((d, i) => {
                          const val = typeof d === 'string' ? d : d.dept;
                          return <span key={i} className="aa-courses-chip-outline">{val}</span>;
                        })}
                      </div>
                    )}
                  </td>
                  <td className="aa-courses-actions-col">
                    <div className="aa-courses-actions">
                      <button className="aa-courses-icon" onClick={() => handleEdit(course)} title="Edit Course">
                        <Edit3 size={18} />
                      </button>
                      <button className="aa-courses-icon aa-courses-icon-danger" onClick={() => handleDelete(course.id)} title="Delete Course">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              getCommonCourseSummary().map(group => (
                <tr key={group.id} className="aa-courses-table-row">
                  <td>
                    <div className="aa-courses-code-cell">
                      <span className="aa-courses-code-text" style={{ fontWeight: 700, color: '#0f172a' }}>{group.label}</span>
                      <span className="aa-courses-mini">Common</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{group.courseCount} Courses Grouped</td>
                  <td>
                    <div className="aa-courses-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {group.courses.map((c, i) => (
                        <span key={i} className="aa-courses-chip-outline" title={c.name}>{c.code}</span>
                      ))}
                    </div>
                  </td>
                  <td className="aa-courses-actions-col">
                    <div className="aa-courses-actions">
                      <button className="aa-courses-icon" onClick={() => handleEdit(courses.find(c => c.id === group.id))} title="Edit Group">
                        <Edit3 size={18} />
                      </button>
                      <button className="aa-courses-icon aa-courses-icon-danger" onClick={() => handleDelete(group.id)} title="Delete Group">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCourses;