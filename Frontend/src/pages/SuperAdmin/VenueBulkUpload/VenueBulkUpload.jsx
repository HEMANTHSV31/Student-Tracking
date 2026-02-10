import { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  CloudUpload,
  Close,
  People,
  School,
  Email,
  Refresh,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { apiGet, apiPost } from '../../../utils/api';
import './VenueBulkUpload.css';

const VenueBulkUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [venues, setVenues] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchVenuesAndFaculties();
  }, []);

  const fetchVenuesAndFaculties = async () => {
    try {
      setLoadingData(true);
      const [venuesRes, facultiesRes] = await Promise.all([
        apiGet('/venue-bulk-upload/venues'),
        apiGet('/venue-bulk-upload/faculties')
      ]);

      const venuesData = await venuesRes.json();
      const facultiesData = await facultiesRes.json();

      if (venuesData. success) {
        setVenues(venuesData.data);
      }
      if (facultiesData.success) {
        setFaculties(facultiesData.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load venues and faculties');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange({ target: { files: [droppedFile] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError(null);

      const response = await apiPost('/venue-bulk-upload/upload', formData);

      const data = await response.json();

      if (data.success) {
        setUploadResult(data.data);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
      } else {
        setError(data.message || 'Failed to upload students');
        if (data.missingRegistrationNumbers) {
          setError(
            `${data.message}\nMissing Registration Numbers: ${data.missingRegistrationNumbers.join(', ')}`
          );
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/venue-bulk-upload/template`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'venue_bulk_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download template');
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  const closeResult = () => {
    setUploadResult(null);
    fetchVenuesAndFaculties(); // Refresh data after upload
  };

  return (
    <div className="venue-bulk-upload-container">
      <div className="upload-header">
        <div className="header-content">
          <CloudUpload className="header-icon" />
          <div>
            <h1>Bulk Upload Students to Venue</h1>
            <p>Upload an Excel file to assign multiple students to a venue at once</p>
          </div>
        </div>
      </div>

      <div className="upload-content">
        {/* Instructions Card */}
        <div className="info-card">
          <div className="info-header">
            <Info className="info-icon" />
            <h3>Instructions</h3>
          </div>
          <div className="info-content">
            <ol>
              <li>Download the Excel template below</li>
              <li>Fill in the student registration numbers (must exist in the system)</li>
              <li>Enter the exact venue name from the available venues list</li>
              <li>Enter the faculty email address</li>
              <li>Upload the completed Excel file</li>
            </ol>
            <div className="info-notes">
              <strong>Important Notes:</strong>
              <ul>
                <li>✓ All students in the file will replace existing students in the target venue</li>
                <li>✓ If a student is already in another venue, they will be moved to the new venue</li>
                <li>✓ Use only one venue name and one faculty email per upload</li>
                <li>✓ Registration numbers must match exactly with the system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Template Button */}
        <button className="download-template-btn" onClick={handleDownloadTemplate}>
          <Download />
          Download Excel Template
        </button>

        {/* Reference Tables */}
        <div className="reference-tables">
          <div className="reference-table">
            <h3>
              <School /> Available Venues
            </h3>
            {loadingData ? (
              <p>Loading venues...</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Venue Name</th>
                      <th>Location</th>
                      <th>Capacity</th>
                      <th>Current Students</th>
                      <th>Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venues.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No venues available</td>
                      </tr>
                    ) : (
                      venues.map((venue) => (
                        <tr key={venue.venue_id}>
                          <td className="venue-name">{venue.venue_name}</td>
                          <td>{venue.location || '-'}</td>
                          <td>{venue.capacity}</td>
                          <td>
                            <span className="student-count">
                              {venue.current_students || 0}
                            </span>
                          </td>
                          <td>{venue.year ? `Year ${venue.year}` : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="reference-table">
            <h3>
              <People /> Available Faculties
            </h3>
            {loadingData ? (
              <p>Loading faculties...</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Assigned Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculties.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="no-data">No faculties available</td>
                      </tr>
                    ) : (
                      faculties.map((faculty) => (
                        <tr key={faculty.faculty_id}>
                          <td className="faculty-name">{faculty.name}</td>
                          <td className="faculty-email">
                            <Email fontSize="small" />
                            {faculty.email}
                          </td>
                          <td>{faculty.department || '-'}</td>
                          <td>{faculty.assigned_students || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <h3>Upload Excel File</h3>
          
          <div 
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {file ? (
              <div className="file-info">
                <Upload className="file-icon" />
                <div className="file-details">
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button className="clear-file-btn" onClick={clearFile}>
                  <Close />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload className="upload-icon" />
                <p>Drag and drop your Excel file here, or</p>
                <label htmlFor="file-input" className="file-input-label">
                  Choose File
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              <ErrorIcon />
              <span>{error}</span>
            </div>
          )}

          <button
            className={`upload-btn ${uploading ? 'uploading' : ''}`}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Refresh className="spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload />
                Upload and Assign Students
              </>
            )}
          </button>
        </div>

        {/* Upload Result */}
        {uploadResult && (
          <div className="result-modal">
            <div className="result-content">
              <div className="result-header">
                <CheckCircle className="success-icon" />
                <h2>Upload Successful!</h2>
                <button className="close-result-btn" onClick={closeResult}>
                  <Close />
                </button>
              </div>

              <div className="result-body">
                <div className="result-summary">
                  <div className="summary-item">
                    <School className="summary-icon" />
                    <div>
                      <p className="summary-label">Venue</p>
                      <p className="summary-value">{uploadResult.venue.name}</p>
                    </div>
                  </div>

                  <div className="summary-item">
                    <People className="summary-icon" />
                    <div>
                      <p className="summary-label">Faculty</p>
                      <p className="summary-value">{uploadResult.faculty.name}</p>
                      <p className="summary-sub">{uploadResult.faculty.email}</p>
                    </div>
                  </div>

                  <div className="summary-item">
                    <Info className="summary-icon" />
                    <div>
                      <p className="summary-label">Group</p>
                      <p className="summary-value">{uploadResult.group.name}</p>
                    </div>
                  </div>
                </div>

                <div className="result-stats">
                  <div className="stat-card">
                    <h4>Students Processed</h4>
                    <p className="stat-number">{uploadResult.studentsProcessed.total}</p>
                  </div>

                  <div className="stat-card">
                    <h4>Added to Venue</h4>
                    <p className="stat-number success">{uploadResult.studentsProcessed.addedToVenue}</p>
                  </div>

                  {uploadResult.studentsProcessed.replacedInTargetVenue > 0 && (
                    <div className="stat-card">
                      <h4>Replaced in Venue</h4>
                      <p className="stat-number warning">{uploadResult.studentsProcessed.replacedInTargetVenue}</p>
                    </div>
                  )}

                  {uploadResult.studentsProcessed.removedFromOtherVenues > 0 && (
                    <div className="stat-card">
                      <h4>Moved from Other Venues</h4>
                      <p className="stat-number info">{uploadResult.studentsProcessed.removedFromOtherVenues}</p>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                {(uploadResult.removedFromVenue?.length > 0 || uploadResult.movedFromOtherVenues?.length > 0) && (
                  <div className="result-details">
                    <button 
                      className="toggle-details-btn"
                      onClick={() => setShowDetails(!showDetails)}
                    >
                      {showDetails ? <ExpandLess /> : <ExpandMore />}
                      {showDetails ? 'Hide Details' : 'Show Details'}
                    </button>

                    {showDetails && (
                      <div className="details-content">
                        {uploadResult.removedFromVenue?.length > 0 && (
                          <div className="details-section">
                            <h4>Students Removed from This Venue:</h4>
                            <ul>
                              {uploadResult.removedFromVenue.map((student, idx) => (
                                <li key={idx}>
                                  {student.name} ({student.registrationNumber})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {uploadResult.movedFromOtherVenues?.length > 0 && (
                          <div className="details-section">
                            <h4>Students Moved from Other Venues:</h4>
                            <ul>
                              {uploadResult.movedFromOtherVenues.map((student, idx) => (
                                <li key={idx}>
                                  {student.name} ({student.registrationNumber}) - from {student.previousVenue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="result-footer">
                <button className="close-btn" onClick={closeResult}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueBulkUpload;
