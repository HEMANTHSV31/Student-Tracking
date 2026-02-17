import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PlayArrow,
  CheckCircle,
  Cancel,
  ArrowBack,
  Code,
  Assignment,
  Person,
  CalendarToday,
  Description,
  Palette,
  Bolt,
  FiberManualRecord,
  Info,
  Visibility,
  ZoomIn,
  Close,
} from "@mui/icons-material";
import { apiGet, apiPut } from "../../../../utils/api";
import Editor from '@monaco-editor/react';
import "./CodeEvaluation.css";

const API_URL = import.meta.env.VITE_API_URL;

const CodeEvaluation = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("html");
  const [evaluationCriteria, setEvaluationCriteria] = useState([]);
  const [scores, setScores] = useState({
    codeQuality: 0,
    requirements: 0,
    expectedOutput: 0,
  });
  const [feedback, setFeedback] = useState({
    difficulty: 0,
    clarity: 0,
    comment: "",
  });
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModal, setResultModal] = useState({ type: '', title: '', message: '' });
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [previewContent, setPreviewContent] = useState('');
  const [expandedImage, setExpandedImage] = useState(false);
  const iframeRef = useRef(null);

  const showResult = (type, title, message) => {
    setResultModal({ type, title, message });
    setShowResultModal(true);
    setTimeout(() => setShowResultModal(false), 3000);
  };

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      // Use web submissions endpoint
      const response = await apiGet(`/tasks/web-submissions/${submissionId}`);
      const jsonData = await response.json();
      
      if (jsonData.success) {
        const data = jsonData.data;
        
        console.log('Raw API data:', data);
        console.log('Expected output image:', data.expected_output_image);
        console.log('Question description:', data.question_description);
        console.log('Files:', data.files);
        
        // Parse files from web_submission_files
        let html = '', css = '', js = '';
        const availableFiles = [];
        
        if (data.files && data.files.length > 0) {
          data.files.forEach(file => {
            if (file.file_type === 'html' && file.file_content && file.file_content.trim()) {
              html = file.file_content;
              availableFiles.push('html');
            } else if (file.file_type === 'css' && file.file_content && file.file_content.trim()) {
              css = file.file_content;
              availableFiles.push('css');
            } else if ((file.file_type === 'javascript' || file.file_type === 'js') && file.file_content && file.file_content.trim()) {
              js = file.file_content;
              availableFiles.push('js');
            }
          });
        }
        
        setSubmittedFiles(availableFiles);
        // Set initial active tab to first available file
        if (availableFiles.length > 0 && !availableFiles.includes(activeTab)) {
          setActiveTab(availableFiles[0]);
        }
        
        // Transform API data to match component structure
        const transformedSubmission = {
          id: data.submission_id,
          studentName: data.student_name,
          studentId: data.student_roll || data.student_id || 'N/A',
          studentEmail: data.student_email || '',
          title: data.task_title || 'Web Code Practice',
          submittedAt: new Date(data.submitted_at).toLocaleString(),
          status: data.status === 'Graded' ? (data.grade >= 50 ? 'PASSED' : 'FAILED') : 'PENDING',
          code: {
            html: html || '<!-- No HTML code submitted -->',
            css: css || '/* No CSS code submitted */',
            js: js || '// No JavaScript code submitted',
          },
          rubric: {
            codeQuality: { max: 40, current: data.grade ? Math.round(data.grade * 0.4) : 0 },
            requirements: { max: 25, current: data.grade ? Math.round(data.grade * 0.25) : 0 },
            expectedOutput: { max: 35, current: data.grade ? Math.round(data.grade * 0.35) : 0 },
          },
          totalScore: data.grade || 0,
          maxScore: data.max_score || 100,
          language: data.workspace_mode || 'html-css-js',
          questionTitle: data.question_title || data.task_title || '',
          questionText: data.question_description || data.task_description || '',
          expectedOutputImage: data.expected_output_image ? 
            (() => {
              let imgPath = data.expected_output_image.replace(/\\/g, '/');
              if (imgPath.startsWith('http')) return imgPath;
              // Strip leading 'uploads/' if present since API_URL/uploads/ already includes it
              imgPath = imgPath.replace(/^uploads\//, '');
              return `${API_URL}/uploads/${imgPath}`;
            })() : '',
          difficultyLevel: data.difficulty_level || '',
          hints: data.hints || '',
          feedback: data.feedback || '',
          questionData: {
            taskInstructions: data.question_description || data.task_description || '',
            sampleOutputImage: data.expected_output_image || ''
          }
        };
        
        console.log('Raw coding_test_cases from backend:', data.coding_test_cases);
        
        // Parse evaluation criteria from coding_test_cases
        let parsedCriteria = [];
        if (data.coding_test_cases) {
          try {
            // If it's a JSON string, parse it
            const testCases = typeof data.coding_test_cases === 'string' ? 
              JSON.parse(data.coding_test_cases) : data.coding_test_cases;
            
            if (Array.isArray(testCases)) {
              parsedCriteria = testCases.map((item, index) => ({
                id: index + 1,
                text: typeof item === 'string' ? item : (item.description || item.name || item.criteria || JSON.stringify(item)),
                checked: false
              }));
            }
          } catch (e) {
            console.error('Error parsing test cases:', e);
            // If parsing fails, treat as simple array
            if (Array.isArray(data.coding_test_cases)) {
              parsedCriteria = data.coding_test_cases.map((item, index) => ({
                id: index + 1,
                text: typeof item === 'string' ? item : String(item),
                checked: false
              }));
            }
          }
        }
        
        // If no evaluation criteria from backend, provide default evaluation criteria
        if (parsedCriteria.length === 0) {
          parsedCriteria = [
            { id: 1, text: "HTML structure & semantics", checked: false },
            { id: 2, text: "Responsiveness", checked: false },
            { id: 3, text: "CSS styling & layout", checked: false }, 
            { id: 4, text: "Code organization", checked: false },
            { id: 5, text: "Functionality requirements", checked: false }
          ];
        }
        
        console.log('Parsed evaluation criteria:', parsedCriteria);
        setEvaluationCriteria(parsedCriteria);
        
        console.log('Transformed submission:', transformedSubmission);
        console.log('Expected output image in transformed:', transformedSubmission.expectedOutputImage);
        
        setSubmission(transformedSubmission);
        setScores({
          codeQuality: transformedSubmission.rubric.codeQuality.current,
          requirements: transformedSubmission.rubric.requirements.current,
          expectedOutput: transformedSubmission.rubric.expectedOutput.current,
        });
        if (transformedSubmission.feedback) {
          setFeedback(prev => ({ ...prev, comment: transformedSubmission.feedback }));
        }
      }
    } catch (error) {
      console.error("Error loading submission:", error);
      setError(error.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (category, value) => {
    setScores((prev) => ({
      ...prev,
      [category]: Math.max(0, Math.min(value, submission.rubric[category].max)),
    }));
  };

  const calculateTotalScore = () => {
    return scores.codeQuality + scores.requirements + scores.expectedOutput;
  };

  const [showPreview, setShowPreview] = useState(false);

  const handleBackToCode = () => {
    setShowPreview(false);
  };

  const buildPreviewHtml = () => {
    if (!submission || !submission.code) return '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
${submission.code.css || ''}
  </style>
</head>
<body>
${submission.code.html || ''}
  <script>
${submission.code.js || ''}
  </script>
</body>
</html>`;
  };

  const handleRunTests = () => {
    if (!submission || !submission.code) {
      showResult("error", "Error", "No code available to preview");
      return;
    }
    const htmlContent = buildPreviewHtml();
    setPreviewContent(htmlContent);
    setShowPreview(true);
  };

  // Write to iframe after it renders
  useEffect(() => {
    if (showPreview && previewContent && iframeRef.current) {
      iframeRef.current.srcdoc = previewContent;
    }
  }, [showPreview, previewContent]);

  const handleFinalizeEvaluation = async () => {
    try {
      setSubmittingGrade(true);
      const totalScore = calculateTotalScore();
      const feedbackText = feedback.comment || `Code Quality: ${scores.codeQuality}/${submission.rubric.codeQuality.max}, Requirements: ${scores.requirements}/${submission.rubric.requirements.max}, Output: ${scores.expectedOutput}/${submission.rubric.expectedOutput.max}`;
      
      // Determine status based on score
      const status = totalScore >= 50 ? 'Graded' : 'Needs Revision';
      
      // Use web submission grading endpoint
      const response = await apiPut(`/tasks/web-submissions/${submissionId}/grade`, {
        grade: totalScore,
        feedback: feedbackText,
        status: status
      });
      
      const data = await response.json();
      
      if (data.success) {
        showResult("success", "Success", "Evaluation finalized successfully!");
        setTimeout(() => navigate("/submissions"), 1500);
      } else {
        throw new Error(data.message || 'Failed to grade submission');
      }
    } catch (error) {
      console.error("Error finalizing evaluation:", error);
      const errorMsg = error.message.includes('<!DOCTYPE') 
        ? 'Backend server is not running. Please start the server.'
        : error.message || 'Failed to finalize evaluation';
      showResult("error", "Failed", errorMsg);
    } finally {
      setSubmittingGrade(false);
      setShowFinalizeModal(false);
    }
  };

  if (loading) {
    return (
      <div className="code-eval-loading">
        <div className="spinner"></div>
        <p>Loading submission...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="code-eval-error">
        <p>{error || 'Submission not found'}</p>
        <button onClick={() => navigate("/submissions")}>
          Go Back
        </button>
      </div>
    );
  }

  const totalScore = calculateTotalScore();
  const isPassing = totalScore >= 60;

  return (
    <div className="code-evaluation-container">
      {/* Header */}
      <div className="code-eval-header">
        <div className="header-main">
          <div className="header-left">
            <button
              className="back-button"
              onClick={() => navigate("/submissions")}
            >
              <ArrowBack />
            </button>
            <div className="header-title-group">
              <h1>{submission.title}</h1>
              <span className="header-subtitle">
                <Person className="subtitle-icon" /> {submission.studentName}
                <span className="separator">|</span>
                ID: {submission.studentId}
                <span className="separator">|</span>
                <CalendarToday className="subtitle-icon" /> {new Date(submission.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="header-right">
            <span className={`status-chip ${submission.status.toLowerCase()}`}>
              {submission.status}
            </span>
          </div>
        </div>
      </div>

      <div className="code-eval-content">
        {/* Left Panel - Code Editor/Preview */}
        <div className="left-panel">
          <div className="editor-container">
            <div className="editor-header">
              <div className="code-tabs">
                {submittedFiles.includes('html') && (
                  <button
                    className={`tab ${activeTab === "html" ? "active" : ""}`}
                    onClick={() => { setActiveTab("html"); setShowPreview(false); }}
                  >
                    <Description /> HTML
                  </button>
                )}
                {submittedFiles.includes('css') && (
                  <button
                    className={`tab ${activeTab === "css" ? "active" : ""}`}
                    onClick={() => { setActiveTab("css"); setShowPreview(false); }}
                  >
                    <Palette /> CSS
                  </button>
                )}
                {submittedFiles.includes('js') && (
                  <button
                    className={`tab ${activeTab === "js" ? "active" : ""}`}
                    onClick={() => { setActiveTab("js"); setShowPreview(false); }}
                  >
                    <Bolt /> JS
                  </button>
                )}
                <button 
                  className={`tab preview-tab ${showPreview ? "active" : ""}`}
                  onClick={handleRunTests}
                >
                  <Visibility /> PREVIEW
                </button>
              </div>
              <button className="run-tests-btn" onClick={handleRunTests}>
                <PlayArrow /> RUN TESTS
              </button>
            </div>

            <div className="editor-content">
              {!showPreview ? (
                <div className="code-editor">
                  <Editor
                    height="100%"
                    language={activeTab === 'js' ? 'javascript' : activeTab}
                    value={submission?.code?.[activeTab] || ""}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              ) : (
                <div className="live-preview">
                  <div className="preview-header">
                    <button className="back-to-code-btn" onClick={handleBackToCode}>
                      <ArrowBack /> Back to Code
                    </button>
                  </div>
                  <iframe
                    ref={iframeRef}
                    title="Live Preview"
                    className="preview-frame"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Grading & Info */}
        <div className="right-panel">
          {/* Question Section */}
          {submission.questionText && (
            <div className="question-card">
              <div className="question-header">
                <Assignment className="question-icon" />
                <h3>Question</h3>
              </div>
              {submission.questionTitle && <h4 className="question-title">{submission.questionTitle}</h4>}
              <div className="question-content">
                <p className="question-text">{submission.questionText}</p>
                {submission.difficultyLevel && (
                  <span className={`difficulty-badge difficulty-${submission.difficultyLevel.toLowerCase()}`}>
                    {submission.difficultyLevel}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Checklist */}
          <div className="checklist-card">
            <div className="checklist-header">
              <div className="checklist-header-title">
                <Assignment />
                <h3>Evaluation Points</h3>
              </div>
              <p className="checklist-subtitle">What will you check when you review this task?</p>
            </div>
            
            <div className="checklist-simple">
              {evaluationCriteria.length > 0 ? (
                evaluationCriteria.map((item, index) => (
                  <div key={item.id || index} className="checklist-item-simple">
                    <FiberManualRecord className="bullet-icon" />
                    <span>{item.text}</span>
                  </div>
                ))
              ) : (
                <div className="no-criteria">
                  <p>No evaluation criteria available for this question.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sample Output */}
          <div className="sample-output-card">
            <h3>Sample Output</h3>
            <div className="sample-image-container">
              {submission.expectedOutputImage ? (
                <div className="image-preview-wrapper" onClick={() => setExpandedImage(true)}>
                  <img 
                    src={submission.expectedOutputImage} 
                    alt="Expected output" 
                    className="sample-image"
                  />
                  <div className="image-expand-overlay">
                    <ZoomIn />
                    <span>Click to expand</span>
                  </div>
                </div>
              ) : (
                <p className="no-image-text">No reference image provided</p>
              )}
            </div>
          </div>

          {/* Rubric Grading */}
          <div className="rubric-card">
            <h3>RUBRIC GRADING</h3>
            
            <div className="rubric-item">
              <div className="rubric-header">
                <span>CODE QUALITY</span>
                <span className="max-score">MAX 40</span>
              </div>
              <div className="score-input">
                <input
                  type="number"
                  value={scores.codeQuality}
                  onChange={(e) => setScores(prev => ({ ...prev, codeQuality: parseInt(e.target.value) || 0 }))}
                  max={40}
                  min={0}
                  className="score-field"
                />
                <span className="pts">PTS</span>
              </div>
            </div>

            <div className="rubric-item">
              <div className="rubric-header">
                <span>REQUIREMENTS</span>
                <span className="max-score">MAX 25</span>
              </div>
              <div className="score-input">
                <input
                  type="number"
                  value={scores.requirements}
                  onChange={(e) => setScores(prev => ({ ...prev, requirements: parseInt(e.target.value) || 0 }))}
                  max={25}
                  min={0}
                  className="score-field"
                />
                <span className="pts">PTS</span>
              </div>
            </div>

            <div className="rubric-item">
              <div className="rubric-header">
                <span>EXPECTED OUTPUT</span>
                <span className="max-score">MAX 35</span>
              </div>
              <div className="score-input">
                <input
                  type="number"
                  value={scores.expectedOutput}
                  onChange={(e) => setScores(prev => ({ ...prev, expectedOutput: parseInt(e.target.value) || 0 }))}
                  max={35}
                  min={0}
                  className="score-field"
                />
                <span className="pts">PTS</span>
              </div>
            </div>

            <div className="total-score-card">
              <div className="total-score-label">TOTAL SCORE</div>
              <div className="total-score-value">{calculateTotalScore()}</div>
              <button 
                className={`pass-status-btn ${isPassing ? 'pass' : 'fail'}`}
              >
                {isPassing ? 'PASS' : 'FAIL'}
              </button>
            </div>

            <div className="feedback-note">
              <p>Good use of semantic tags. Code indentation is consistent.</p>
            </div>

            <button 
              className="finalize-btn"
              onClick={() => setShowFinalizeModal(true)}
              disabled={submittingGrade}
            >
              FINALIZE EVAL
            </button>
          </div>

        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content result-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`result-icon ${resultModal.type}`}>
              {resultModal.type === 'success' ? <CheckCircle /> : resultModal.type === 'error' ? <Cancel /> : <Info />}
            </div>
            <h3>{resultModal.title}</h3>
            <p>{resultModal.message}</p>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="modal-overlay" onClick={() => setShowFinalizeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Finalize Evaluation</h2>
            <p>
              Are you sure you want to finalize this evaluation? This action
              cannot be undone.
            </p>
            <div className="modal-summary">
              <div className="summary-item">
                <span>Total Score:</span>
                <strong>{calculateTotalScore()}/{100}</strong>
              </div>
              <div className="summary-item">
                <span>Status:</span>
                <strong className={isPassing ? "pass" : "fail"}>
                  {isPassing ? "PASSED" : "FAILED"}
                </strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowFinalizeModal(false)}
                disabled={submittingGrade}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleFinalizeEvaluation}
                disabled={submittingGrade}
              >
                {submittingGrade ? 'Submitting...' : 'Confirm & Finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && submission?.expectedOutputImage && (
        <div className="image-modal-overlay" onClick={() => setExpandedImage(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setExpandedImage(false)}>
              <Close />
            </button>
            <img 
              src={submission.expectedOutputImage} 
              alt="Expected output - Full size" 
              className="image-modal-img"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEvaluation;