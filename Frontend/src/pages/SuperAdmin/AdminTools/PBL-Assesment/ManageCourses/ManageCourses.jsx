import React, { useState, useEffect } from 'react';
import './ManageCourses.css';
import { 
  Users, Layers, Plus, Trash2, Edit3, Save, X,
  CheckCircle, AlertTriangle, ArrowRight,
  Link, Unlink
} from 'lucide-react';
import { 
  fetchYearCourses, addYearCourse, updateYearCourse, deleteYearCourse, fetchClusters
} from '../../../../../services/assessmentVenueApi.js';

const ManageCourses = () => {
  const [activeYear, setActiveYear] = useState(1);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  // Form state for adding/editing
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    course_code: '',
    departments: [] // Array of Objects: { name: 'Dept Name', dept: 'CS', subCode: '22CS402', gId: 'optional-group-id' }
  });
  const [selectedDepts, setSelectedDepts] = useState([]);

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

  // Map for 2-letter codes based on standard/image
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
      const res = await fetchYearCourses(activeYear);
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
  }, [activeYear]);

  // Clear msg after 3s
  useEffect(() => {
    if(msg.text) {
      const t = setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  // Handle Edit Action
  const handleEdit = (course) => {
    setEditId(course.id);
    setFormData({
      course_code: course.course_code,
      departments: [...(course.departments || [])]
    });
  };

  const handleCancel = () => {
    setEditId(null);
    setFormData({ course_code: '', departments: [] });
  };

  // Handle Save (Create/Update)
  const handleSave = async () => {
    if (!formData.course_code || formData.departments.length === 0) {
      setMsg({ type: 'error', text: 'Course code and at least one department are required' });
      return;
    }
    
    // Check if sub-course names are filled
    const missingName = formData.departments.some(d => !d.name || !d.name.trim());
    if (missingName) {
      setMsg({ type: 'error', text: 'Please provide course names for all selected departments' });
      return;
    }

    const mainName = formData.departments.length === 1 
      ? formData.departments[0].name 
      : `${formData.departments[0].name} & Others`;

    const payload = {
      year: activeYear,
      course_code: formData.course_code,
      course_name: mainName,
      departments: formData.departments
    };

    try {
      setLoading(true);
      if (editId) {
        // Update
        const res = await updateYearCourse(editId, payload);
        if (res.success) {
          setMsg({ type: 'success', text: 'Course updated successfully' });
          handleCancel();
          loadCourses();
        } else {
           setMsg({ type: 'error', text: res.message || 'Failed to update' });
        }
      } else {
        // Create
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


  // Handle Delete
  const handleDelete = async (courseId) => {
    if(!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      setLoading(true);
      const res = await deleteYearCourse(courseId);
      if (res.success) {
        setMsg({ type: 'success', text: 'Course deleted successfully' });
        loadCourses();
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

  // Toggle Department Selection
  const toggleDept = (dept) => {
    setFormData(prev => {
      // Departments is now array of objects { dept, name }
      const exists = prev.departments.some(d => d.dept === dept);
      if (exists) {
        return { ...prev, departments: prev.departments.filter(d => d.dept !== dept) };
      } else {
        // Init name as empty or potentially a shared name if feasible
        return { ...prev, departments: [...prev.departments, { dept, name: '' }] };
      }
    });
  };

  const selectCluster = (clusterType) => {
    const list = clusterType === 'CS' ? CS_CLUSTER : CORE_CLUSTER;
    setFormData(prev => {
      // Add only missing depts
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
    // Use the name of the first selected department as the common name
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
    
    // Sort logic needs careful application or we lose user order?
    // User order isn't guaranteed anyway.
    
    sortedDepts.forEach(d => {
       if (d.gId) {
         if (!seenGIds.has(d.gId)) {
           // Find all members in the SORTED list to keep them together if needed
           // But actually filter from original list is safer
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

  return (
    <div className="aa-courses-container">
      <div className="aa-courses-hero">
        <div className="aa-courses-hero-left">
          <div className="aa-courses-kicker">PBL Assessment</div>
          <h2 className="aa-courses-title">
            <Layers size={22} /> Course Allocation Studio
          </h2>
          <p className="aa-courses-subtitle">Design course groups, auto-generate sub codes, and keep department mapping clean.</p>
        </div>
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

            <div className="aa-courses-summary">
              <div className="aa-courses-summary-title">
                <Users size={14} /> Targeted Departments
              </div>
              <div className="aa-courses-summary-count">{formData.departments.length}</div>
              {formData.departments.length > 0 ? (
                <div className="aa-courses-pill-row">
                  {formData.departments.map(d => (
                    <span key={d.dept} className="aa-courses-pill">{d.dept}</span>
                  ))}
                </div>
              ) : (
                <div className="aa-courses-empty-pill">No departments selected yet.</div>
              )}
            </div>
          </div>

          <div className="aa-courses-right">
            <div className="aa-courses-right-head">
              <label className="aa-courses-label">Select Departments & Assign Subjects</label>
              <div className="aa-courses-actions">
                <button type="button" className="aa-courses-action aa-cs" onClick={() => selectCluster('CS')}>
                  + CS Cluster
                </button>
                <button type="button" className="aa-courses-action aa-core" onClick={() => selectCluster('Core')}>
                  + Core Cluster
                </button>
                <button type="button" className="aa-courses-action aa-clear" onClick={clearDepartments}>
                  Clear
                </button>
              </div>
            </div>

            <div className="aa-courses-dept-grid">
              {ALL_DEPARTMENTS.map(dept => {
                const isSelected = formData.departments.some(d => d.dept === dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={`aa-courses-dept ${isSelected ? 'selected' : ''}`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>

            {formData.course_code.includes('XX') && formData.departments.length > 0 ? (
              <div className="aa-courses-config">
                <div className="aa-courses-config-head">
                  <span>Configure Sub-Courses ({formData.departments.length})</span>
                  {selectedDepts.length > 1 && (
                    <button type="button" className="aa-courses-link" onClick={createGroup}>
                      <Link size={14} /> Merge Selected
                    </button>
                  )}
                </div>
                <div className="aa-courses-config-body">
                  <table className="aa-courses-table">
                    <thead>
                      <tr>
                        <th className="aa-courses-col-check" />
                        <th>Dept</th>
                        <th>Code</th>
                        <th>Course Name / Subject</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderGroups.map((group, idx) => (
                        <tr key={idx} className={group.type === 'group' ? 'aa-courses-row-group' : ''}>
                          <td className="aa-courses-col-check">
                            {group.type === 'single' ? (
                              <input
                                type="checkbox"
                                checked={selectedDepts.includes(group.id)}
                                onChange={() => toggleSelection(group.id)}
                              />
                            ) : (
                              <button type="button" className="aa-courses-icon" onClick={() => ungroup(group.id)} title="Ungroup">
                                <Unlink size={14} />
                              </button>
                            )}
                          </td>
                          <td className="aa-courses-strong">
                            {group.members.map(m => m.dept).join(' / ')}
                          </td>
                          <td className="aa-courses-code">
                            {group.members.map(m => generateSubCode(formData.course_code, m.dept)).join(' / ')}
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Subject Name"
                              value={group.members[0].name}
                              onChange={(e) => updateSubCourseName(group.id, e.target.value, group.type === 'group')}
                              className={`aa-courses-input aa-courses-input-sm ${group.members[0].name ? '' : 'aa-courses-input-warn'}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="aa-courses-placeholder">
                {formData.departments.length === 0 ? 'Select departments to enable configuration' : 'Use "XX" in course code for dynamic generation'}
              </div>
            )}
          </div>
        </div>

        <div className="aa-courses-footer">
          <button className="aa-courses-primary" onClick={handleSave} disabled={loading}>
            {loading ? <div className="aa-courses-spinner" /> : <Save size={18} />}
            {editId ? 'Update & Save Changes' : 'Create Course'}
          </button>
        </div>
      </div>

      <div className="aa-courses-list-head">
        <h4>Existing Courses (Year {activeYear})</h4>
        <span className="aa-courses-count">{courses.length} total</span>
      </div>

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
              <tr><td colSpan="4" className="aa-courses-td-empty">Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan="4" className="aa-courses-td-empty">No courses found for Year {activeYear}. Add one to get started.</td></tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} className="aa-courses-table-row">
                  <td>
                    <div className="aa-courses-code-cell">
                      <span className="aa-courses-code-text">{course.course_code}</span>
                      {course.course_code.includes('XX') && <span className="aa-courses-mini">Dynamic</span>}
                    </div>
                  </td>
                  <td>{course.course_name}</td>
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
                                  <ArrowRight size={12} />
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
                                <ArrowRight size={12} />
                                <span className="aa-courses-code">{generateSubCode(course.course_code, deptName)}</span>
                                <span className="aa-courses-mini">({cName})</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="aa-courses-chip-row">
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCourses;

