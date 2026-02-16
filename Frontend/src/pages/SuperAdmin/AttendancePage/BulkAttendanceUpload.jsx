import React, { useState, useEffect } from 'react';
import {
    Upload,
    Download,
    CheckCircle,
    XCircle,
    AlertCircle,
    CloudUpload,
    Close,
    Refresh,
    Info,
    FileSpreadsheet
} from '@mui/icons-material';
import { apiGet, apiPost } from '../../../utils/api';

const BulkAttendanceUpload = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState('');
    const [loadingVenues, setLoadingVenues] = useState(true);
    const [overwriteMode, setOverwriteMode] = useState(false);

    useEffect(() => {
        fetchVenues();
    }, []);

    const fetchVenues = async () => {
        try {
            setLoadingVenues(true);
            const response = await apiGet('/attendance/venues');
            const data = await response.json();

            if (data.success) {
                setVenues(data.data || []);
            } else {
                setError('Failed to load venues');
            }
        } catch (err) {
            console.error('Failed to fetch venues:', err);
            setError('Failed to load venues');
        } finally {
            setLoadingVenues(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
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

        if (!selectedVenue) {
            setError('Please select a venue');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('venueId', selectedVenue);

        try {
            setUploading(true);
            setError(null);

            const response = await apiPost(`/attendance/bulk-upload?overwrite=${overwriteMode}`, formData);
            const data = await response.json();

            if (data.success) {
                setUploadResult(data.data);
                setFile(null);
                // Reset file input
                const fileInput = document.getElementById('file-input');
                if (fileInput) fileInput.value = '';
            } else {
                setError(data.message || 'Failed to upload attendance');
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
                `${import.meta.env.VITE_API_URL || ''}/api/attendance/bulk-upload-template`,
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
            a.download = 'bulk_attendance_template.xlsx';
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
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <CloudUpload style={styles.headerIcon} />
                    <div>
                        <h1 style={styles.title}>Bulk Upload Attendance</h1>
                        <p style={styles.subtitle}>Upload attendance records for a single venue via Excel</p>
                    </div>
                </div>
            </div>

            <div style={styles.content}>
                {/* Instructions Card */}
                <div style={styles.infoCard}>
                    <div style={styles.infoHeader}>
                        <Info style={styles.infoIcon} />
                        <h3 style={styles.infoTitle}>Instructions</h3>
                    </div>
                    <div style={styles.infoContent}>
                        <ol style={styles.orderedList}>
                            <li>Download the Excel template below</li>
                            <li>Fill in the attendance data with required columns:
                                <ul style={styles.unorderedList}>
                                    <li><strong>Registration Number</strong> (student ID)</li>
                                    <li><strong>Date</strong> (YYYY-MM-DD format)</li>
                                    <li><strong>Session</strong> (Morning/Afternoon/Evening)</li>
                                    <li><strong>Status</strong> (Present/Absent/Late/PS)</li>
                                    <li><strong>Remarks</strong> (optional)</li>
                                </ul>
                            </li>
                            <li>Select the venue for this attendance batch</li>
                            <li>Choose mode: Add Only or Overwrite existing</li>
                            <li>Upload the completed Excel file</li>
                        </ol>
                        <div style={styles.infoNotes}>
                            <strong>Important Notes:</strong>
                            <ul style={styles.unorderedList}>
                                <li><strong>Add Only:</strong> Skips existing attendance records (safe mode)</li>
                                <li><strong>Overwrite:</strong> Updates existing records with new data</li>
                                <li>Student registration numbers must exist in the system</li>
                                <li>Sessions are automatically created if they don't exist</li>
                                <li>Date formats supported: YYYY-MM-DD or DD/MM/YYYY</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Venue Selection */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Select Venue</h3>
                    <select
                        style={styles.select}
                        value={selectedVenue}
                        onChange={(e) => setSelectedVenue(e.target.value)}
                        disabled={loadingVenues}
                    >
                        <option value="">-- Select Venue --</option>
                        {venues.map(venue => (
                            <option key={venue.venue_id} value={venue.venue_id}>
                                {venue.venue_name}
                                {venue.assigned_faculty_name && ` (${venue.assigned_faculty_name})`}
                                {venue.student_count > 0 && ` - ${venue.student_count} students`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Upload Mode Selection */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Upload Mode</h3>
                    <div style={styles.modeOptions}>
                        <label style={styles.radioLabel}>
                            <input
                                type="radio"
                                name="uploadMode"
                                checked={!overwriteMode}
                                onChange={() => setOverwriteMode(false)}
                                style={styles.radio}
                            />
                            <div>
                                <strong>Add Only (Safe)</strong>
                                <p style={styles.modeDescription}>
                                    Skip records that already exist. Recommended for initial uploads.
                                </p>
                            </div>
                        </label>
                        <label style={styles.radioLabel}>
                            <input
                                type="radio"
                                name="uploadMode"
                                checked={overwriteMode}
                                onChange={() => setOverwriteMode(true)}
                                style={styles.radio}
                            />
                            <div>
                                <strong>Overwrite Existing</strong>
                                <p style={styles.modeDescription}>
                                    Update existing records with new data. Use for corrections.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Template Download */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Step 1: Download Template</h3>
                    <button onClick={handleDownloadTemplate} style={styles.downloadBtn}>
                        <Download />
                        Download Excel Template
                    </button>
                </div>

                {/* File Upload Section */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Step 2: Upload Excel File</h3>

                    <div
                        style={{
                            ...styles.dropZone,
                            ...(file ? styles.dropZoneHasFile : {})
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        {file ? (
                            <div style={styles.fileInfo}>
                                <Upload style={styles.fileIcon} />
                                <div style={styles.fileDetails}>
                                    <p style={styles.fileName}>{file.name}</p>
                                    <p style={styles.fileSize}>
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                <button style={styles.clearFileBtn} onClick={clearFile}>
                                    <Close />
                                </button>
                            </div>
                        ) : (
                            <>
                                <CloudUpload style={styles.uploadIcon} />
                                <p style={styles.dropText}>Drag and drop your Excel file here, or</p>
                                <label htmlFor="file-input" style={styles.fileInputLabel}>
                                    Choose File
                                </label>
                                <input
                                    id="file-input"
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    style={styles.fileInput}
                                />
                            </>
                        )}
                    </div>

                    {error && (
                        <div style={styles.errorMessage}>
                            <XCircle />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        style={{
                            ...styles.uploadBtn,
                            ...(uploading ? styles.uploadBtnDisabled : {})
                        }}
                        onClick={handleUpload}
                        disabled={!file || !selectedVenue || uploading}
                    >
                        {uploading ? (
                            <>
                                <Refresh style={styles.spin} />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload />
                                Upload Attendance
                            </>
                        )}
                    </button>
                </div>

                {/* Upload Result */}
                {uploadResult && (
                    <div style={styles.resultModal}>
                        <div style={styles.resultContent}>
                            <div style={styles.resultHeader}>
                                <CheckCircle style={styles.successIcon} />
                                <h2 style={styles.resultTitle}>Upload Successful!</h2>
                                <button style={styles.closeBtn} onClick={closeResult}>
                                    <Close />
                                </button>
                            </div>

                            <div style={styles.resultBody}>
                                <div style={styles.resultSection}>
                                    <h3 style={styles.resultSectionTitle}>Venue</h3>
                                    <p style={styles.resultText}>{uploadResult.venue?.venue_name}</p>
                                </div>

                                <div style={styles.resultSection}>
                                    <h3 style={styles.resultSectionTitle}>Upload Summary</h3>
                                    <div style={styles.statsGrid}>
                                        <div style={styles.statCard}>
                                            <div style={styles.statValue}>{uploadResult.totalRows}</div>
                                            <div style={styles.statLabel}>Total Rows</div>
                                        </div>
                                        <div style={{ ...styles.statCard, ...styles.statSuccess }}>
                                            <div style={styles.statValue}>{uploadResult.inserted}</div>
                                            <div style={styles.statLabel}>Inserted</div>
                                        </div>
                                        <div style={{ ...styles.statCard, ...styles.statWarning }}>
                                            <div style={styles.statValue}>{uploadResult.updated}</div>
                                            <div style={styles.statLabel}>Updated</div>
                                        </div>
                                        <div style={{ ...styles.statCard, ...styles.statInfo }}>
                                            <div style={styles.statValue}>{uploadResult.skipped}</div>
                                            <div style={styles.statLabel}>Skipped</div>
                                        </div>
                                    </div>
                                </div>

                                {uploadResult.errors && uploadResult.errors.length > 0 && (
                                    <div style={styles.resultSection}>
                                        <h3 style={styles.resultSectionTitle}>
                                            <AlertCircle style={{ fontSize: 18 }} />
                                            Errors ({uploadResult.errors.length})
                                        </h3>
                                        <div style={styles.errorList}>
                                            {uploadResult.errors.slice(0, 10).map((error, idx) => (
                                                <div key={idx} style={styles.errorItem}>
                                                    {error}
                                                </div>
                                            ))}
                                            {uploadResult.errors.length > 10 && (
                                                <div style={styles.errorItem}>
                                                    ...and {uploadResult.errors.length - 10} more errors
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={styles.resultFooter}>
                                <button style={styles.closeResultBtn} onClick={closeResult}>
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

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '24px'
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    headerIcon: {
        fontSize: 48,
        color: '#6366F1'
    },
    title: {
        fontSize: '28px',
        fontWeight: '600',
        color: '#1E293B',
        margin: 0
    },
    subtitle: {
        fontSize: '14px',
        color: '#64748B',
        margin: '4px 0 0 0'
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto'
    },
    infoCard: {
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
    },
    infoHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
    },
    infoIcon: {
        fontSize: 24,
        color: '#3B82F6'
    },
    infoTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1E40AF',
        margin: 0
    },
    infoContent: {
        fontSize: '14px',
        color: '#1E40AF',
        lineHeight: '1.6'
    },
    orderedList: {
        marginLeft: '20px',
        marginBottom: '12px'
    },
    unorderedList: {
        marginLeft: '20px',
        marginTop: '8px'
    },
    infoNotes: {
        backgroundColor: '#DBEAFE',
        padding: '12px',
        borderRadius: '8px',
        marginTop: '12px'
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: '16px'
    },
    select: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer'
    },
    modeOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    radio: {
        marginTop: '4px',
        cursor: 'pointer'
    },
    modeDescription: {
        fontSize: '13px',
        color: '#64748B',
        margin: '4px 0 0 0'
    },
    downloadBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        backgroundColor: '#10B981',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    dropZone: {
        border: '2px dashed #CBD5E1',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#F8FAFC',
        transition: 'all 0.2s',
        marginBottom: '16px'
    },
    dropZoneHasFile: {
        backgroundColor: '#F0FDF4',
        borderColor: '#10B981'
    },
    uploadIcon: {
        fontSize: 48,
        color: '#94A3B8',
        marginBottom: '16px'
    },
    dropText: {
        fontSize: '14px',
        color: '#64748B',
        marginBottom: '12px'
    },
    fileInputLabel: {
        display: 'inline-block',
        padding: '10px 20px',
        backgroundColor: '#6366F1',
        color: '#FFFFFF',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    fileInput: {
        display: 'none'
    },
    fileInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px'
    },
    fileIcon: {
        fontSize: 40,
        color: '#10B981'
    },
    fileDetails: {
        flex: 1,
        textAlign: 'left'
    },
    fileName: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#1E293B',
        margin: 0
    },
    fileSize: {
        fontSize: '12px',
        color: '#64748B',
        margin: '4px 0 0 0'
    },
    clearFileBtn: {
        padding: '8px',
        backgroundColor: '#FEE2E2',
        color: '#EF4444',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorMessage: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#FEE2E2',
        color: '#DC2626',
        borderRadius: '8px',
        fontSize: '14px',
        marginBottom: '16px'
    },
    uploadBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px',
        backgroundColor: '#6366F1',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    uploadBtnDisabled: {
        backgroundColor: '#CBD5E1',
        cursor: 'not-allowed'
    },
    spin: {
        animation: 'spin 1s linear infinite'
    },
    resultModal: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    resultContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
    },
    resultHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '24px',
        borderBottom: '1px solid #E2E8F0',
        position: 'relative'
    },
    successIcon: {
        fontSize: 32,
        color: '#10B981'
    },
    resultTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#1E293B',
        flex: 1
    },
    closeBtn: {
        padding: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    resultBody: {
        padding: '24px'
    },
    resultSection: {
        marginBottom: '24px'
    },
    resultSectionTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    resultText: {
        fontSize: '14px',
        color: '#475569'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px'
    },
    statCard: {
        padding: '16px',
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        textAlign: 'center'
    },
    statSuccess: {
        backgroundColor: '#ECFDF5',
        color: '#059669'
    },
    statWarning: {
        backgroundColor: '#FFFBEB',
        color: '#D97706'
    },
    statInfo: {
        backgroundColor: '#EFF6FF',
        color: '#3B82F6'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '4px'
    },
    statLabel: {
        fontSize: '12px',
        fontWeight: '500',
        textTransform: 'uppercase',
        opacity: 0.8
    },
    errorList: {
        maxHeight: '200px',
        overflow: 'auto',
        backgroundColor: '#FEF2F2',
        borderRadius: '8px',
        padding: '12px'
    },
    errorItem: {
        fontSize: '13px',
        color: '#DC2626',
        padding: '8px',
        borderBottom: '1px solid #FEE2E2'
    },
    resultFooter: {
        padding: '16px 24px',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    closeResultBtn: {
        padding: '10px 24px',
        backgroundColor: '#6366F1',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
    }
};

export default BulkAttendanceUpload;
