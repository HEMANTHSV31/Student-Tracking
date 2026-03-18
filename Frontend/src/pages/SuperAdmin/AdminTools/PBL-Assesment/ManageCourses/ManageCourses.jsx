import React, { useState, useEffect } from 'react';
import { 
  Users, Layers, Plus, Trash2, Edit3, Save, X, 
  CheckCircle, AlertTriangle, Link, Unlink
} from 'lucide-react';
import { 
  fetchYearCourses, addYearCourse, updateYearCourse, deleteYearCourse 
} from '../../../../../services/assessmentVenueApi.js';
import './ManageCourses.css';

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

  const ALL_DEPARTMENTS = [
    'CSE', 'IT', 'AIDS', 'AIML', 'CSBS', 
    'ECE', 'EEE', 'E&I', 'MECH', 'MECTRONIC', 
    'AGRI', 'BIOTECH', 'CIVIL', 'BME', 'FT'
  ];

  const CS_CLUSTER = ['CSE', 'IT', 'AIDS', 'AIML', 'CSBS'];
  const CORE_CLUSTER = ['ECE', 'EEE', 'E&I', 'MECH', 'MECTRONIC', 'AGRI', 'BIOTECH', 'CIVIL', 'BME', 'FT'];

  // Map for 2-letter codes based on standard/image
  const DEPT_CODE_MAP = {
    'CSE': 'CS', 'IT': 'IT', 'AIDS': 'AI', 'AIML': 'AM', 'CSBS': 'CB',
    'ECE': 'EC', 'EEE': 'EE', 'E&I': 'EI', 'MECH': 'ME', 'MECTRONIC': 'MC',
    'AGRI': 'AG', 'BIOTECH': 'BT', 'CIVIL': 'CE', 'BME': 'BM', 'FT': 'FT'
  };

  const generateSubCode = (genericCode, dept) => {
    if (!genericCode) return '';
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
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditId(null);
    setFormData({ course_code: '', departments: [] });
    setSelectedDepts([]);
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
    setSelectedDepts([]);
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

  return (
    <div className="aa-courses-container">
      {/* Header & Year Selector */}
      <div className="aa-header-row">
        <h3>
            <Layers size={20} /> Course Allocation Setup
        </h3>
        <div className="aa-year-tabs">
          {[1, 2, 3, 4].map(y => (
            <button
              key={y}
              className={`aa-tab-btn ${activeYear === y ? 'active' : ''}`}
              onClick={() => { setActiveYear(y); handleCancel(); }}
            >
              Year {y}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Message */}
      {msg.text && (
        <div className={`aa-msg-box ${msg.type === 'error' ? 'aa-msg-error' : 'aa-msg-success'}`}>
          {msg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="aa-course-form-card">
        <div className="aa-form-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {editId ? <Edit3 size={18} /> : <Plus size={18} />}
             {editId ? `Edit Course (Year ${activeYear})` : `Add New Course (Year ${activeYear})`}
          </span>
          {editId && (
            <button className="aa-icon-btn aa-icon-danger" onClick={handleCancel} title="Cancel Edit">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="aa-code-input-row">
          <div className="aa-form-group-inline" style={{ flex: 1 }}>
            <label>Course Code (Generic)</label>
            <input
              type="text"
              className="aa-course-input"
              value={formData.course_code}
              onChange={e => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
              placeholder="e.g. 22XX402"
            />
          </div>
          <button className="aa-btn aa-btn-secondary" onClick={handleCancel}>
            Reset
          </button>
        </div>

        {/* Dept Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label className="aa-dept-s-label">Map Departments:</label>
          <div className="aa-group-toolbar">
            <button className="aa-btn aa-btn-secondary aa-btn-sm" onClick={() => selectCluster('CS')}>Select CS Cluster</button>
            <button className="aa-btn aa-btn-secondary aa-btn-sm" onClick={() => selectCluster('CORE')}>Select Core Cluster</button>
            <button className="aa-btn aa-btn-secondary aa-btn-sm" onClick={clearDepartments}>Clear All</button>
          </div>
          
          <div className="aa-dept-grid-selector">
            {ALL_DEPARTMENTS.map(dept => {
              const isMapped = formData.departments.some(d => d.dept === dept);
              return (
                <div
                  key={dept}
                  className={`aa-dept-s-chip ${isMapped ? 'selected' : ''}`}
                  onClick={() => toggleDept(dept)}
                >
                  {dept}
                  {isMapped && <CheckCircle size={12} style={{marginLeft:4}} />}
                </div>
              );
            })}
          </div>
        </div>

        {formData.departments.length > 0 && (
          <div className="aa-sub-courses-list">
            <div className="aa-group-toolbar" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                Course Names & Grouping
              </span>
              <div style={{ display:'flex', gap: '8px' }}>
                <button 
                  className="aa-btn aa-btn-secondary aa-btn-sm"
                  disabled={selectedDepts.length < 2}
                  onClick={createGroup}
                  title="Group selected departments under a common course name"
                >
                  <Link size={14} /> Group
                </button>
              </div>
            </div>

            {renderGroups.map((group, idx) => {
               if (group.type === 'group') {
                 // Render Group Card
                 return (
                   <div key={group.id} className="aa-group-card">
                     <div className="aa-group-header">
                       <div className="aa-form-group-inline" style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <label>Common Name:</label>
                         <input 
                           type="text" 
                           className="aa-sub-name-input"
                           value={group.name} 
                           onChange={(e) => updateSubCourseName(group.id, e.target.value, true)}
                           placeholder="Course Name for this group"
                         />
                         <button className="aa-icon-btn aa-icon-danger" onClick={() => ungroup(group.id)} title="Ungroup">
                           <Unlink size={14} />
                         </button>
                       </div>
                     </div>
                     <div className="aa-group-body">
                       <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                         Departments ({group.members.length}):
                       </span>
                       <div className="aa-group-members">
                         {group.members.map(m => (
                           <span key={m.dept} className="aa-grp-badge">
                             {m.dept} ({generateSubCode(formData.course_code, m.dept)})
                           </span>
                         ))}
                       </div>
                     </div>
                   </div>
                 );
               } else {
                 // Render Single Row
                 const item = group.members[0];
                 const isSelected = selectedDepts.includes(item.dept);
                 return (
                   <div key={item.dept} className="aa-sub-row" style={{ background: isSelected ? '#eff6ff' : 'transparent' }}>
                     <input 
                       type="checkbox" 
                       checked={isSelected}
                       onChange={() => toggleSelection(item.dept)}
                       style={{ marginRight: '8px' }}
                     />
                     <div className="aa-sub-dept-badge">{item.dept}</div>
                     <span className="aa-sub-info">
                       {generateSubCode(formData.course_code, item.dept)}
                     </span>
                     <input
                       type="text"
                       className="aa-sub-name-input"
                       placeholder="Course Name"
                       value={item.name}
                       onChange={(e) => updateSubCourseName(item.dept, e.target.value)}
                     />
                   </div>
                 );
               }
            })}
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {editId && (
            <button className="aa-btn aa-btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          )}
          <button className="aa-btn aa-btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : <><Save size={16} /> Save Course Configuration</>}
          </button>
        </div>
      </div>
      
      {/* List */}
      <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '15px' }}>
        Existing Courses (Year {activeYear})
      </h4>
      
      <div className="aa-table-card">
        {loading && !courses.length ? (
           <div className="aa-loading-overlay">Loading courses...</div>
        ) : courses.length === 0 ? (
           <div className="aa-empty-state">
             <p>No courses configured for Year {activeYear}</p>
           </div>
        ) : (
          <table className="aa-course-table">
            <thead>
              <tr>
                <th style={{width:'15%'}}>Code Pattern</th>
                <th style={{width:'30%'}}>Course Name (Primary)</th>
                <th>Departments & Mappings</th>
                <th style={{width:'100px', textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>
                    <span className="aa-course-code-cell">{course.course_code}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{course.course_name}</td>
                  <td>
                    {course.departments && course.departments.map((d, i) => (
                      <span key={i} className="aa-dept-mini-badge" title={d.name}>
                        {d.dept}
                        <span style={{ opacity: 0.6, fontSize:'0.7em', marginLeft: '4px' }}>
                          {d.subCode || generateSubCode(course.course_code, d.dept)}
                        </span>
                      </span>
                    ))}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button className="aa-icon-btn" onClick={() => handleEdit(course)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="aa-icon-btn aa-icon-danger" onClick={() => handleDelete(course.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManageCourses;
