import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Search, Upload, Filter, AlertTriangle, CheckCircle2, HelpCircle, File, Loader2, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import {
  fetchCourseSpecs,
  uploadCourseSpecs,
  downloadCourseSpecsTemplate,
  fetchCourseSpecsDepartments,
  deleteCourseSpec,
  deleteAllCourseSpecs,
  updateCourseSpec,
} from '../../../../../services/assessmentVenueApi';
import Modal from '../../../../../components/Modal';
import './CourseWiseSpecs.css';

const DEFAULT_LIMIT = 100;

const CourseWiseSpecs = () => {
  const [activeYear, setActiveYear] = useState(2);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [summary, setSummary] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [columnMetadata, setColumnMetadata] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedCourseData, setEditedCourseData] = useState({});

  const [querySearch, setQuerySearch] = useState('');
  const [queryDept, setQueryDept] = useState('');
  const [queryYear, setQueryYear] = useState(2);
  const [currentPage, setCurrentPage] = useState(1);

  const toReadableAuthMessage = (message) => {
    const text = String(message || '').toLowerCase();
    if (
      text.includes('unauthorized') ||
      text.includes('invalid or expired token') ||
      text.includes('no token provided') ||
      text.includes('token cannot be used')
    ) {
      return 'Your session has expired or is invalid. Please login again, then retry upload.';
    }
    return message;
  };

  const availableDepartments = useMemo(() => {
    return allDepartments;
  }, [allDepartments]);

  const loadDepartments = async () => {
    try {
      const res = await fetchCourseSpecsDepartments(queryYear);
      if (res.success) {
        setAllDepartments(res.data?.departments || []);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryYear]);

  const onDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await deleteCourseSpec(id);
      if (res.success) {
        setSuccessMessage('Record deleted successfully');
        await loadSpecs();
      } else {
        setError(res.message || 'Failed to delete record');
      }
    } catch (err) {
      setError('Error deleting record');
    }
  };

  const onEditRecord = (record) => {
    console.log('Edit button clicked with record:', record);
    console.log('Detected Columns:', detectedColumns);
    console.log('Record Subject Data:', record.subjectData);
    
    setEditingRecord(record);
    
    // Initialize course data from the record
    const courseData = {};
    if (detectedColumns && detectedColumns.length > 0) {
      detectedColumns.forEach((col) => {
        courseData[col.name] = record.subjectData?.[col.name] || record[col.name] || '';
      });
    } else {
      // Fallback: if no detected columns, use all keys from subjectData
      if (record.subjectData) {
        Object.keys(record.subjectData).forEach((key) => {
          if (key !== 'original_row') {
            courseData[key] = record.subjectData[key] || '';
          }
        });
      }
    }
    console.log('Edited Course Data:', courseData);
    setEditedCourseData(courseData);
    setIsEditModalOpen(true);
  };

  const onSaveEditRecord = async () => {
    if (!editingRecord) return;
    
    try {
      const res = await updateCourseSpec(editingRecord.id, {
        subjectData: editedCourseData,
      });
      
      if (res.success) {
        setSuccessMessage('Record updated successfully');
        setIsEditModalOpen(false);
        setEditingRecord(null);
        setEditedCourseData({});
        await loadSpecs();
      } else {
        setError(res.message || 'Failed to update record');
      }
    } catch (err) {
      console.error('Error updating record:', err);
      setError('Error updating record');
    }
  };

  const onDeleteAllForYear = async () => {
    if (!window.confirm(`Are you sure you want to DELETE ALL records for Year ${activeYear}? This cannot be undone.`)) return;
    setIsDeleteAllModalOpen(false);
    try {
      const res = await deleteAllCourseSpecs(activeYear);
      if (res.success) {
        setSuccessMessage(`All records for Year ${activeYear} deleted successfully`);
        setAllDepartments([]);
        setRows([]);
        setTotal(0);
        setCurrentPage(1);
        await loadSpecs();
      } else {
        setError(res.message || 'Failed to delete all records');
      }
    } catch (err) {
      setError('Error deleting records');
    }
  };

  const loadSpecs = async () => {
    setLoading(true);
    setError('');
    try {
      const offset = (currentPage - 1) * DEFAULT_LIMIT;
      const res = await fetchCourseSpecs({
        year: queryYear,
        search: querySearch,
        dept: queryDept,
        limit: DEFAULT_LIMIT,
        offset: offset,
      });

      if (res.success) {
        setRows(res.data?.rows || []);
        setTotal(res.data?.total || 0);
        setDetectedColumns(res.data?.detectedColumns || []);
        setColumnMetadata(res.data?.detectedColumns || []);
      } else {
        setError(toReadableAuthMessage(res.message) || 'Failed to load course specifications');
      }
    } catch (err) {
      setError('Failed to load course specifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySearch, queryDept, queryYear, currentPage]);

  const onFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    const validByMime = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ].includes(selected.type);

    const validByName = /\.(xlsx|xls|csv)$/i.test(selected.name || '');

    if (!validByMime && !validByName) {
      setError('Please upload a valid Excel or CSV file (.xlsx, .xls, .csv)');
      return;
    }

    setFile(selected);
    setError('');
    setSuccessMessage('');
    setSummary(null);
  };

  const onUpload = async () => {
    if (!file) {
      setError('Please select a file before upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append('year', String(activeYear));
      formData.append('file', file);

      const res = await uploadCourseSpecs(formData);

      if (res.success) {
        setSuccessMessage(res.message || 'Upload completed successfully');
        setSummary(res.data || null);
        setFile(null);
        const input = document.getElementById('course-wise-spec-file');
        if (input) input.value = '';
        await loadSpecs();
      } else {
        setError(toReadableAuthMessage(res.message) || 'Failed to upload file');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDownloadTemplate = async () => {
    setError('');
    try {
      const response = await downloadCourseSpecsTemplate();
      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'course_wise_student_spec_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  return (
    <div className="cws-root">
      <div className="cws-card">
        <div className="cws-card-head cws-card-head-stacked">
          <div className="cws-card-title-block">
            <div className="cws-kicker">PBL Assessment</div>
            <div className="cws-card-title">
              <FileSpreadsheet size={16} /> Course-wise Student Specifications
            </div>
          </div>
          <div className="cws-card-actions">
            <button className="cws-btn-text" onClick={() => setIsModalOpen(true)} title="View Excel formatting requirements">
              <HelpCircle size={14} /> Guide
            </button>
            <div className="cws-card-actions-top">
              <div className="cws-year-switch" role="tablist" aria-label="Select academic year">
                {[1, 2, 3, 4].map((yearOption) => (
                  <button
                    key={yearOption}
                    className={`cws-year-btn ${activeYear === yearOption ? 'active' : ''}`}
                    onClick={() => {
                      setActiveYear(yearOption);
                      setQueryYear(yearOption);
                      setCurrentPage(1);
                      setFile(null);
                      setSummary(null);
                      setError('');
                      setSuccessMessage('');
                    }}
                  >
                    Year {yearOption}
                  </button>
                ))}
              </div>
              <div className="cws-year-badge">Uploading for Year {activeYear}</div>
            </div>
          </div>
        </div>
        <div className="cws-upload-row">
          <label className="cws-file-picker" htmlFor="course-wise-spec-file">
            <input id="course-wise-spec-file" type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
            {file ? <FileSpreadsheet size={16} /> : <File size={16} />}
            <span>{file ? file.name : 'Choose Excel / CSV file'}</span>
          </label>

          <button className="cws-btn cws-btn-outline" onClick={onDownloadTemplate}>
            <Download size={15} /> Download Template
          </button>

          <button className="cws-btn cws-btn-primary" onClick={onUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 size={15} className="cws-spin" /> : <Upload size={15} />} {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {error && (
          <div className="cws-alert cws-alert-error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {successMessage && (
          <div className="cws-alert cws-alert-success">
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        {summary && (
          <div className="cws-summary-grid">
            <div><strong>Total Rows:</strong> {summary.totalRows ?? 0}</div>
            <div><strong>Valid Rows:</strong> {summary.validRows ?? 0}</div>
            <div><strong>Skipped Rows:</strong> {summary.skippedRows ?? 0}</div>
            <div><strong>Matched Students:</strong> {summary.matchedStudents ?? 0}</div>
            <div><strong>Unmatched Students:</strong> {summary.unmatchedStudents ?? 0}</div>
          </div>
        )}
      </div>

      <div className="cws-card">
        <div className="cws-card-head cws-card-head-compact">
          <div className="cws-card-title">Filter & Search</div>
        </div>
        <div className="cws-filter-row">
          <div className="cws-input-wrap">
            <Search size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reg No / Name / Email"
            />
          </div>

          <div className="cws-input-wrap cws-select-wrap">
            <Filter size={15} />
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All Departments</option>
              {availableDepartments.map((d) => (
                <option value={d} key={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            className="cws-btn cws-btn-primary"
            onClick={() => {
              setQuerySearch(search.trim());
              setQueryDept(dept);
              setCurrentPage(1);
            }}
            title="Apply filters"
          >
            <Search size={14} /> Apply Filters
          </button>

          {total > 0 && (
            <button
              className="cws-btn cws-btn-outline"
              onClick={() => setIsDeleteAllModalOpen(true)}
              title="Delete all records for this year"
            >
              <Trash2 size={13} /> Delete All Year {activeYear}
            </button>
          )}
        </div>

        <div className="cws-table-meta">
          <div className="cws-meta-info">
            <span>Showing {rows.length} of {total} records</span>
            {detectedColumns.length > 0 && <span className="cws-meta-badge">{detectedColumns.length} dynamic columns detected</span>}
          </div>
        </div>

        <div className="cws-table-wrap">
          <table className="cws-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Reg. No.</th>
                <th>Enroll No.</th>
                <th>Student Name</th>
                <th>Dept</th>
                {detectedColumns.length > 0 ? (
                  detectedColumns.map((col) => (
                    <th key={col.name} title={col.label}>{col.label}</th>
                  ))
                ) : (
                  <>
                    <th>22XX601</th>
                    <th>22XX602</th>
                    <th>22XX603</th>
                    <th>22XX604</th>
                    <th>PE III</th>
                    <th>PE IV</th>
                    <th>PE V / OE</th>
                    <th>ADD ON</th>
                    <th>Honours or Minors Status</th>
                    <th>HONOURS / MINORS 3</th>
                    <th>HONORS / MINORS 4</th>
                  </>
                )}
                <th style={{ minWidth: '60px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={detectedColumns.length > 0 ? detectedColumns.length + 6 : 17} className="cws-empty">
                    <Loader2 size={20} className="cws-spin" style={{ margin: '0 auto', display: 'block' }} /> Loading course specifications...
                  </td>
                </tr>
              ) : !loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={detectedColumns.length > 0 ? detectedColumns.length + 6 : 17} className="cws-empty">No course-wise specification records found for Year {queryYear}.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.year || '-'}</td>
                    <td>{row.reg_no || '-'}</td>
                    <td>{row.enroll_no || '-'}</td>
                    <td>{row.student_name || '-'}</td>
                    <td>{row.dept || '-'}</td>
                    {detectedColumns.length > 0 ? (
                      detectedColumns.map((col) => (
                        <td key={col.name}>
                          {row.subjectData?.[col.name] || row[col.name] || '-'}
                        </td>
                      ))
                    ) : (
                      <>
                        <td>{row.course_22xx601 || '-'}</td>
                        <td>{row.course_22xx602 || '-'}</td>
                        <td>{row.course_22xx603 || '-'}</td>
                        <td>{row.course_22xx604 || '-'}</td>
                        <td>{row.professional_elective_iii || '-'}</td>
                        <td>{row.professional_elective_iv || '-'}</td>
                        <td>{row.professional_elective_v_open || '-'}</td>
                        <td>{row.add_on || '-'}</td>
                        <td>{row.honours_or_minors_status || '-'}</td>
                        <td>{row.honours_minors_3 || '-'}</td>
                        <td>{row.honours_minors_4 || '-'}</td>
                      </>
                    )}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: '80px' }}>
                      <div className="cws-action-group">
                        <button
                          className="cws-btn-icon cws-btn-icon-edit"
                          onClick={() => onEditRecord(row)}
                          title="View/Edit this record"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="cws-btn-icon cws-btn-icon-delete"
                          onClick={() => onDeleteRecord(row.id)}
                          title="Delete this record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="cws-pagination">
          <button
            className="cws-pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            title="Previous page"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="cws-pagination-info">
            Page <strong>{currentPage}</strong> of <strong>{Math.ceil(total / DEFAULT_LIMIT)}</strong>
          </div>
          <button
            className="cws-pagination-btn"
            onClick={() => setCurrentPage(Math.min(Math.ceil(total / DEFAULT_LIMIT), currentPage + 1))}
            disabled={currentPage >= Math.ceil(total / DEFAULT_LIMIT) || loading}
            title="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Modal title="Excel Formatting Guide" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p>Your Excel/CSV file can contain ANY course or subject columns specific to your year/program. The system will automatically detect and store them.</p>
        <p><strong>Required Columns:</strong></p>
        <ul>
          <li><strong>Reg. No.</strong> (Required - used to match students)</li>
        </ul>
        <p><strong>Optional Metadata Columns:</strong></p>
        <ul>
          <li><strong>Year</strong> (defaults to the active year tab)</li>
          <li><strong>Enroll No.</strong></li>
          <li><strong>Student Name</strong></li>
          <li><strong>Dept</strong> / <strong>Department</strong></li>
          <li><strong>Email ID</strong></li>
        </ul>
        <p><strong>Dynamic Course/Subject Columns:</strong></p>
        <p>Any other columns in your Excel file will be automatically detected and stored as course/subject specifications. Examples:</p>
        <ul>
          <li>22XX601, 22XX602, 22XX603, 22XX604</li>
          <li>PE I, PE II, PE III, PE IV, PE V / OE</li>
          <li>ADD ON, Honours, Minors, etc.</li>
          <li>Any course codes or subject names specific to your curriculum</li>
        </ul>
        <p>
          The system will automatically adapt to your Excel structure. All detected columns will be displayed in the table below.
        </p>
      </Modal>

      <Modal title="Delete All Records?" isOpen={isDeleteAllModalOpen} onClose={() => setIsDeleteAllModalOpen(false)}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px 0', color: '#1f2937', fontSize: '14px', fontWeight: '500' }}>
            This action cannot be undone. All {total} student specifications for Year {activeYear} will be permanently deleted.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="cws-btn cws-btn-outline" onClick={() => setIsDeleteAllModalOpen(false)}>
            Cancel
          </button>
          <button className="cws-btn cws-btn-danger" onClick={onDeleteAllForYear}>
            <Trash2 size={14} /> Delete All
          </button>
        </div>
      </Modal>

      <Modal title="Edit Course Assignments" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {editingRecord && (
          <div className="cws-edit-modal-wrapper">
            <div className="cws-edit-modal-content">
              <div className="cws-record-section">
                <div className="cws-record-section-title">Student Information (Read-Only)</div>
                <div className="cws-record-fields-grid">
                  <div className="cws-record-item">
                    <span className="cws-record-item-label">Registration Number</span>
                    <p className="cws-record-item-value">{editingRecord.reg_no || '-'}</p>
                  </div>
                  <div className="cws-record-item">
                    <span className="cws-record-item-label">Student Name</span>
                    <p className="cws-record-item-value">{editingRecord.student_name || '-'}</p>
                  </div>
                  <div className="cws-record-item">
                    <span className="cws-record-item-label">Enrollment Number</span>
                    <p className="cws-record-item-value">{editingRecord.enroll_no || '-'}</p>
                  </div>
                  <div className="cws-record-item">
                    <span className="cws-record-item-label">Department</span>
                    <p className="cws-record-item-value">{editingRecord.dept || '-'}</p>
                  </div>
                </div>
              </div>

              {detectedColumns && detectedColumns.length > 0 ? (
                <div className="cws-record-section">
                  <div className="cws-record-section-title">Edit Course Assignments</div>
                  <div className="cws-edit-fields-grid">
                    {detectedColumns.map((col) => (
                      <div key={col.name} className="cws-edit-field">
                        <label className="cws-edit-field-label">{col.label}</label>
                        <input
                          type="text"
                          className="cws-edit-field-input"
                          value={editedCourseData[col.name] !== undefined ? editedCourseData[col.name] : ''}
                          onChange={(e) =>
                            setEditedCourseData({
                              ...editedCourseData,
                              [col.name]: e.target.value,
                            })
                          }
                          placeholder="Enter course / subject"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : editingRecord?.subjectData && Object.keys(editingRecord.subjectData).length > 0 ? (
                <div className="cws-record-section">
                  <div className="cws-record-section-title">Edit Course Assignments</div>
                  <div className="cws-edit-fields-grid">
                    {Object.entries(editingRecord.subjectData)
                      .filter(([key]) => key !== 'original_row') // Filter out metadata
                      .map(([key, value]) => (
                        <div key={key} className="cws-edit-field">
                          <label className="cws-edit-field-label">{key}</label>
                          <input
                            type="text"
                            className="cws-edit-field-input"
                            value={editedCourseData[key] !== undefined ? editedCourseData[key] : ''}
                            onChange={(e) =>
                              setEditedCourseData({
                                ...editedCourseData,
                                [key]: e.target.value,
                              })
                            }
                            placeholder="Enter course / subject"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="cws-record-section">
                  <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                    No course assignments found. Please check your data.
                  </p>
                </div>
              )}
            </div>

            <div className="cws-record-view-footer">
              <button className="cws-btn cws-btn-outline" onClick={() => {
                setIsEditModalOpen(false);
                setEditingRecord(null);
                setEditedCourseData({});
              }}>
                Cancel
              </button>
              <button className="cws-btn cws-btn-primary" onClick={onSaveEditRecord} disabled={Object.keys(editedCourseData).length === 0}>
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CourseWiseSpecs;