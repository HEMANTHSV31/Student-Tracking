import React, { useState, useEffect } from 'react';
import { 
  Users, Layers, Plus, Trash2, Edit3, Save, X, 
  ChevronUp, ChevronDown, CheckCircle, AlertTriangle, ArrowRight,
  Link, Unlink
} from 'lucide-react';
import { 
  fetchYearCourses, addYearCourse, updateYearCourse, deleteYearCourse 
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
      {/* Header & Year Selector */}
      <div className="aa-header-row" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} /> Course Allocation Setup
        </h3>
        <div className="aa-year-tabs" style={{ display: 'flex', gap: '5px' }}>
          {[1, 2, 3, 4].map(y => (
            <button
              key={y}
              className={`aa-tab-btn ${activeYear === y ? 'active' : ''}`}
              onClick={() => { setActiveYear(y); handleCancel(); }}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                background: activeYear === y ? '#2563eb' : '#fff',
                color: activeYear === y ? '#fff' : '#444',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Year {y}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Message */}
      {msg.text && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '20px',
          borderRadius: '6px',
          backgroundColor: msg.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: msg.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          {msg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Add/Edit Form */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '24px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        marginBottom: '25px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 600 }}>
            {editId ? <Edit3 size={18} color="#2563eb"/> : <Plus size={18} color="#2563eb"/>}
            {editId ? 'Edit Course Configuration' : 'Create New Course'}
          </h4>
          {editId && (
            <button 
              onClick={handleCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 12px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500
              }}
            >
              <X size={14} /> Cancel
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', gap: '30px' }}>
          

          {/* Left Column: Course Details */}
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Course Code Pattern <span style={{color:'#ef4444'}}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="e.g. 21XX402"
                  value={formData.course_code}
                  onChange={e => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
                  style={{ 
                    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', 
                    fontFamily: 'monospace', letterSpacing: '0.5px', outline: 'none', transition: 'border 0.2s', fontWeight: 600
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                   {formData.course_code.includes('XX') ? 
                     <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #bbf7d0' }}>Dynamic</span> : 
                     <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, border: '1px solid #e2e8f0' }}>Static</span>
                   }
                </div>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                Use <strong>XX</strong> as a placeholder (e.g., 22XX402) to automatically generate department-specific codes (22CS402, 22IT402).
              </p>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '8px', background: '#eef2ff', border: '1px solid #c7d2fe' }}>
               <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#3730a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> Total Targeted Depts: {formData.departments.length}
               </h5>
               {formData.departments.length > 0 ? (
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {formData.departments.map(d => (
                       <span key={d.dept} style={{ background: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#4338ca', border: '1px solid #e0e7ff', fontWeight: 500 }}>
                          {d.dept}
                       </span>
                    ))}
                 </div>
               ) : (
                 <span style={{ fontSize: '0.8rem', color: '#818cf8', fontStyle: 'italic' }}>No departments selected yet.</span>
               )}
            </div>
          </div>

          {/* Right Column: Departments & Preview */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px' }}>
             <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Select Departments & Assign Subjects</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                     <button type="button" onClick={() => selectCluster('CS')} 
                        style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:'6px', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', cursor:'pointer', fontWeight: 600 }}>
                        + CS Cluster
                     </button>
                     <button type="button" onClick={() => selectCluster('Core')} 
                        style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:'6px', background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', cursor:'pointer', fontWeight: 600 }}>
                        + Core Cluster
                     </button>
                     <button type="button" onClick={clearDepartments} 
                        style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:'6px', background:'#fff', color:'#ef4444', border:'1px solid #ef4444', cursor:'pointer', fontWeight: 600 }}>
                        Clear
                     </button>
                </div>
             </div>

             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                {ALL_DEPARTMENTS.map(dept => {
                  const isSelected = formData.departments.some(d => d.dept === dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDept(dept)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#2563eb' : '#fff',
                        color: isSelected ? '#fff' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      {dept}
                    </button>
                  );
                })}
             </div>

             {/* Preview & Name Input Table */}
             {formData.course_code.includes('XX') && formData.departments.length > 0 ? (
                 <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '8px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>CONFIGURE SUB-COURSES ({formData.departments.length})</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {selectedDepts.length > 1 && (
                                <button type="button" onClick={createGroup} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <Link size={14} /> Merge Selected
                                </button>
                            )}
                        </div>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                <tr>
                                    <th style={{ textAlign:'center', padding:'8px', width:'40px' }}>
                                       {/* Checkbox Col */}
                                    </th>
                                    <th style={{ textAlign:'left', padding:'8px 12px', color:'#64748b', fontWeight:500, width:'80px' }}>Dept</th>
                                    <th style={{ textAlign:'left', padding:'8px 12px', color:'#64748b', fontWeight:500, width:'140px' }}>Code</th>
                                    <th style={{ textAlign:'left', padding:'8px 12px', color:'#64748b', fontWeight:500 }}>Course Name / Subject</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderGroups.map((group, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', background: group.type === 'group' ? '#f0f9ff' : 'transparent' }}>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            {group.type === 'single' ? (
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedDepts.includes(group.id)}
                                                    onChange={() => toggleSelection(group.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            ) : (
                                                <button type="button" onClick={() => ungroup(group.id)} title="Ungroup" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>
                                                    <Unlink size={14} />
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 600 }}>
                                            {group.members.map(m => m.dept).join(' / ')}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                                            {group.members.map(m => generateSubCode(formData.course_code, m.dept)).join(' / ')}
                                        </td>
                                        <td style={{ padding: '6px 12px' }}>
                                            <input 
                                              type="text" 
                                              placeholder="Subject Name"
                                              value={group.members[0].name} 
                                              onChange={(e) => updateSubCourseName(group.id, e.target.value, group.type === 'group')}
                                              style={{ 
                                                width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem',
                                                background: group.members[0].name ? '#fff' : '#fff7ed',  borderColor: group.members[0].name ? '#cbd5e1' : '#fdba74'
                                              }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
             ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                    {formData.departments.length === 0 ? 'Select departments to enable configuration' : 'Use "XX" in course code for dynamic generation'}
                </div>
             )}
          </div>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
             <button 
                onClick={handleSave}
                disabled={loading}
                style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'wait' : 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3), 0 2px 4px -1px rgba(37, 99, 235, 0.1)',
                transition: 'all 0.2s'
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
                {loading ? <div className="spinner-border spinner-border-sm"></div> : <Save size={18} />}
                {editId ? 'Update & Save Changes' : 'Create Course'}
            </button>
        </div>
      </div>

      {/* Data Table */}
      <h4 style={{ fontSize: '1rem', color: '#334155', marginBottom: '15px' }}>
        Existing Courses (Year {activeYear})
      </h4>
      
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Generic Code</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Main Course Name</th>
              <th style={{ padding: '12px 15px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Sub-Codes / Depts</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && courses.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No courses found for Year {activeYear}. Add one to get started.</td></tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '12px 15px', fontWeight: 500, color: '#334155' }}>
                     {course.course_code}
                     {course.course_code.includes('XX') && <span style={{display:'block', fontSize:'0.7rem', color:'#64748b'}}>Dynamic</span>}
                  </td>
                  <td style={{ padding: '12px 15px', color: '#334155' }}>{course.course_name}</td>
                  <td style={{ padding: '12px 15px' }}>
                    
                    {course.course_code.includes('XX') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {(() => {
                           const depts = course.departments || [];
                           const groups = [];
                           const seen = new Set();
                           
                           // Grouping Logic for Display
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
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                     <span style={{ fontWeight: 600, color: '#475569' }}>{deptStr}</span>
                                     <ArrowRight size={12} color="#94a3b8" />
                                     <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{codeStr}</span>
                                     <span style={{ color: '#64748b', fontSize:'0.75rem' }}>({name})</span>
                                  </div>
                               );
                             } else {
                               const d = g.data;
                               const deptName = typeof d === 'string' ? d : d.dept;
                               const cName = typeof d === 'string' ? course.course_name : d.name;
                               return (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                     <span style={{ fontWeight: 600, minWidth: '30px', color: '#475569' }}>{deptName}</span>
                                     <ArrowRight size={12} color="#94a3b8" />
                                     <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>{generateSubCode(course.course_code, deptName)}</span>
                                     <span style={{ color: '#64748b', fontSize:'0.75rem' }}>({cName})</span>
                                  </div>
                               );
                             }
                           });
                        })()}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(course.departments || []).map((d, i) => {
                          const val = typeof d === 'string' ? d : d.dept;
                          return <span key={i} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#475569', border: '1px solid #e2e8f0' }}>{val}</span>
                        })}
                      </div>
                    )}

                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => handleEdit(course)}
                        title="Edit Course"
                        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb' }}
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(course.id)}
                        title="Delete Course"
                        style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
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

