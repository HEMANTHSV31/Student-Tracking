import React, { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../../../../store/useAuthStore';
import { Link } from 'react-router-dom';
import { debounce } from 'lodash';
import { encodeIdSimple } from '../../../../utils/idEncoder';
import { apiGet, apiPost } from '../../../../utils/api';

const StudentsPage = () => {
  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;
  const fileInputRef = useRef(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [limit] = useState(21);

  const [departments, setDepartments] = useState(['All Departments']);
  const [years, setYears] = useState(['All Years']);

  // Bulk upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Handle screen resize for responsiveness
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await apiGet('/students/filters');

      const data = await response.json();
      if (data.success) {
        setDepartments(['All Departments', ...data.data.departments]);
        setYears(['All Years', ...data.data.years]);
      }
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  const fetchStudents = async (page = 1, searchTerm = search, dept = departmentFilter, yr = yearFilter) => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm,
        department: dept,
        year: yr
      });

      const response = await apiGet(`/students?${params}`);

      const data = await response.json();

      if (data.success) {
        setStudents(data.data);
        setCurrentPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
        setTotalStudents(data.pagination.totalStudents);
      } else {
        setError(data.message || 'Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setCurrentPage(1);
      fetchStudents(1, searchTerm, departmentFilter, yearFilter);
    }, 500),
    [departmentFilter, yearFilter]
  );

  useEffect(() => {
    if (user) {
      fetchFilters();
      fetchStudents();
    }
  }, [user]);

  useEffect(() => {
    if (search) {
      debouncedSearch(search);
    } else {
      fetchStudents(1, '', departmentFilter, yearFilter);
    }
  }, [search]);

  const handleDepartmentChange = (dept) => {
    setDepartmentFilter(dept);
    setCurrentPage(1);
    fetchStudents(1, search, dept, yearFilter);
  };

  const handleYearChange = (yr) => {
    setYearFilter(yr);
    setCurrentPage(1);
    fetchStudents(1, search, departmentFilter, yr);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchStudents(page, search, departmentFilter, yearFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bulk upload handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!validTypes.includes(file.type)) {
        setError('Only Excel files (.xlsx, .xls) are allowed');
        return;
      }
      setUploadFile(file);
      setUploadResult(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await apiPost('/students/bulk-upload', formData);

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.summary);
        setSuccessMessage(data.message);
        // Refresh students list
        fetchStudents(1, '', 'All Departments', 'All Years');
        fetchFilters();
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'email', 'rollNumber', 'department', 'year', 'semester'];
    const sampleData = [
      ['John Doe', 'john.doe@example.com', 'CSE2021001', 'CSE', '2', '3'],
      ['Jane Smith', 'jane.smith@example.com', 'CSE2021002', 'IT', '1', '2']
    ];
    
    let csvContent = headers.join(',') + '\n';
    sampleData.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getInitials = (name) => {
    return name.charAt(0).toUpperCase();
  };

  const getAttendanceColor = (attendance) => {
    const value = parseFloat(attendance);
    if (value >= 95) return '#10B981';
    if (value >= 85) return '#3B82F6';
    if (value >= 75) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#991b1b', cursor: 'pointer', padding: '0 8px' }}>×</button>
        </div>
      )}

      {successMessage && (
        <div style={{
          backgroundColor: '#d1fae5',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#065f46', cursor: 'pointer', padding: '0 8px' }}>×</button>
        </div>
      )}

      {/* Header with search, filters, and bulk upload button */}
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          flex: 1,
          width: '100%',
          maxWidth: isMobile ? '100%' : '800px'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <input
              id="student-search"
              name="search"
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 40px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            {/* Department Filter */}
            <select
              id="department-filter"
              name="departmentFilter"
              value={departmentFilter}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                backgroundColor: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              id="year-filter"
              name="yearFilter"
              value={yearFilter}
              onChange={(e) => handleYearChange(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                backgroundColor: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count and Bulk Upload Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>
            {totalStudents} students found
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>Bulk Upload Students</h2>
              <button onClick={handleCloseUploadModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6B7280' }}>×</button>
            </div>

            {/* Instructions */}
            <div style={{ backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1E40AF' }}>Excel Format Required:</h4>
              <div style={{ fontSize: '13px', color: '#1E40AF' }}>
                <p style={{ margin: '4px 0' }}><strong>Required columns:</strong> name, email, rollNumber</p>
                <p style={{ margin: '4px 0' }}><strong>Optional columns:</strong> department, year, semester</p>
              </div>
              <button
                onClick={downloadTemplate}
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                📥 Download Template
              </button>
            </div>

            {/* File Upload */}
            <div style={{
              border: '2px dashed #E5E7EB',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              marginBottom: '20px',
              backgroundColor: uploadFile ? '#F0FDF4' : '#F9FAFB'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="bulk-upload-file"
              />
              <label htmlFor="bulk-upload-file" style={{ cursor: 'pointer' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={uploadFile ? '#10B981' : '#9CA3AF'} strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {uploadFile ? (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#10B981' }}>✓ {uploadFile.name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500', color: '#374151' }}>Click to select Excel file</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>or drag and drop (.xlsx, .xls)</p>
                  </div>
                )}
              </label>
            </div>

            {/* Upload Result */}
            {uploadResult && (
              <div style={{
                backgroundColor: uploadResult.errors > 0 ? '#FEF3C7' : '#D1FAE5',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: uploadResult.errors > 0 ? '#92400E' : '#065F46' }}>Upload Summary:</h4>
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  <p style={{ margin: '4px 0' }}>Total Records: {uploadResult.totalRecords}</p>
                  <p style={{ margin: '4px 0', color: '#10B981' }}>✓ Added: {uploadResult.added}</p>
                  <p style={{ margin: '4px 0', color: '#F59E0B' }}>⚠ Skipped: {uploadResult.skipped}</p>
                </div>
                {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                  <div style={{ marginTop: '12px', maxHeight: '150px', overflow: 'auto' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '600', color: '#991B1B' }}>Errors:</p>
                    {uploadResult.errorDetails.slice(0, 10).map((err, idx) => (
                      <p key={idx} style={{ margin: '2px 0', fontSize: '11px', color: '#991B1B' }}>Row {err.row}: {err.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseUploadModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {uploadResult ? 'Close' : 'Cancel'}
              </button>
              {!uploadResult && (
                <button
                  onClick={handleBulkUpload}
                  disabled={!uploadFile || uploading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: uploadFile && !uploading ? '#10B981' : '#D1D5DB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed'
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload Students'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#3B82F6', fontSize: '16px', fontWeight: '600' }}>
          Loading students...
        </div>
      )}

      {!loading && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            {students.map(student => (
              <div key={student.id} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  {student.image ? (
                    <img src={student.image} alt={student.name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', marginRight: '12px' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#3B82F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '600', marginRight: '12px' }}>
                      {getInitials(student.name)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>{student.name}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>ID: {student.id}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#6B7280' }}>Dept</span>
                    <span style={{ color: '#111827', fontWeight: '500' }}>{student.department}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6B7280' }}>Year</span>
                    <span style={{ color: '#111827', fontWeight: '500', backgroundColor: '#F3F4F6', padding: '1px 6px', borderRadius: '4px' }}>
                      {student.year} · {student.section}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>ATTENDANCE</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: getAttendanceColor(student.attendance) }}>{student.attendance}%</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>TASKS</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#3B82F6' }}>{student.tasks}</div>
                  </div>
                </div>

                <Link to={`/students/${encodeIdSimple(student.student_id)}`} style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '0 0 12px 12px',
                  margin: '16px -20px -20px -20px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  color: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  View Profile →
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              marginTop: '32px',
              paddingBottom: '24px'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: currentPage === 1 ? '#F3F4F6' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
              >
                Prev
              </button>

              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '4px' }}>
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        style={{
                          padding: '8px',
                          minWidth: '32px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          backgroundColor: page === currentPage ? '#3B82F6' : 'white',
                          color: page === currentPage ? 'white' : '#374151',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} style={{ alignSelf: 'center', color: '#9CA3AF' }}>...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: currentPage === totalPages ? '#F3F4F6' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!loading && students.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '16px', fontWeight: '500' }}>No students found</div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;