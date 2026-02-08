import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PlayArrow,
  Timer,
  CheckCircle,
  Cancel,
  Star,
  StarBorder,
  ArrowBack,
} from "@mui/icons-material";
import { getSubmissionDetails, gradeSubmission } from "../../../../services/questionBankApi";
import Editor from '@monaco-editor/react';
import "./CodeEvaluation.css";

const CodeEvaluation = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("html");
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
      const response = await getSubmissionDetails(submissionId);
      
      if (response.success) {
        const data = response.data;
        
        // Parse code - check if it's combined or separate
        let html = '', css = '', js = '';
        
        if (data.html_code || data.css_code || data.js_code) {
          // Separate code files
          html = data.html_code || '';
          css = data.css_code || '';
          js = data.js_code || '';
        } else if (data.combined_code || data.code_solution) {
          // Combined code - extract HTML, CSS, JS
          const combined = data.combined_code || data.code_solution || '';
          
          // Extract CSS from <style> tags
          const cssMatch = combined.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          css = cssMatch ? cssMatch[1].trim() : '';
          
          // Extract JS from <script> tags
          const jsMatch = combined.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          js = jsMatch ? jsMatch[1].trim() : '';
          
          // Get HTML (remove style and script tags)
          html = combined
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .trim();
        }
        
        // Transform API data to match component structure
        const transformedSubmission = {
          id: data.submission_id,
          studentName: data.student_name,
          studentId: data.roll_number || 'N/A',
          title: data.skill_name || data.question_text?.substring(0, 50) || 'Code Practice',
          submittedAt: new Date(data.submitted_at).toLocaleString(),
          status: data.score >= 50 ? 'PASSED' : 'PENDING',
          autoTestOutcome: 'N/A',
          code: {
            html: html || '<!-- No HTML code submitted -->',
            css: css || '/* No CSS code submitted */',
            js: js || '// No JavaScript code submitted',
          },
          rubric: {
            codeQuality: { max: 40, current: data.score ? Math.round(data.score * 0.4) : 0 },
            requirements: { max: 25, current: data.score ? Math.round(data.score * 0.25) : 0 },
            expectedOutput: { max: 35, current: data.score ? Math.round(data.score * 0.35) : 0 },
          },
          totalScore: data.score || 0,
          maxScore: 100,
          language: data.language || 'html',
          questionText: data.question_text,
          sampleImage: data.sample_image, // Sample image from question_bank
        };
        
        setSubmission(transformedSubmission);
        setScores({
          codeQuality: transformedSubmission.rubric.codeQuality.current,
          requirements: transformedSubmission.rubric.requirements.current,
          expectedOutput: transformedSubmission.rubric.expectedOutput.current,
        });
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

  const handleRunTests = () => {
    showResult("info", "Info", "Running automated tests...");
  };

  const handleFinalizeEvaluation = async () => {
    try {
      setSubmittingGrade(true);
      const totalScore = calculateTotalScore();
      const feedbackText = `Code Quality: ${scores.codeQuality}/${submission.rubric.codeQuality.max}, Requirements: ${scores.requirements}/${submission.rubric.requirements.max}, Output: ${scores.expectedOutput}/${submission.rubric.expectedOutput.max}`;
      
      const response = await gradeSubmission(submissionId, totalScore, feedbackText);
      
      if (response.success) {
        showResult("success", "Success", "Evaluation finalized successfully!");
        setTimeout(() => navigate("/faculty/question-bank/pending"), 1500);
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
        <button onClick={() => navigate("/faculty/question-bank/pending")}>
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
        <button
          className="back-button"
          onClick={() => navigate("/faculty/question-bank/pending")}
        >
          <ArrowBack /> Back to Submissions
        </button>
        <div className="submission-info">
          <h1>{submission.title}</h1>
          <div className="student-details">
            <span className="student-name">{submission.studentName}</span>
            <span className="student-id">ID: {submission.studentId}</span>
            <span className="submission-time">{submission.submittedAt}</span>
          </div>
        </div>
      </div>

      <div className="code-eval-content">
        {/* Left Panel - Code Editor */}
        <div className="code-panel">
          <div className="code-panel-header">
            <div className="code-tabs">
              <button
                className={`tab ${activeTab === "html" ? "active" : ""}`}
                onClick={() => setActiveTab("html")}
              >
                <span className="tab-icon">📄</span> HTML
              </button>
              <button
                className={`tab ${activeTab === "css" ? "active" : ""}`}
                onClick={() => setActiveTab("css")}
              >
                <span className="tab-icon">🎨</span> CSS
              </button>
              <button
                className={`tab ${activeTab === "js" ? "active" : ""}`}
                onClick={() => setActiveTab("js")}
              >
                <span className="tab-icon">⚡</span> JS
              </button>
              <button className="tab">
                <span className="tab-icon">🔥</span> LIVE
              </button>
              <button className="tab">
                <span className="tab-icon">📊</span> REF
              </button>
              <button className="tab">
                <span className="tab-icon">🔍</span> MATCH
              </button>
            </div>
            <button className="run-tests-btn" onClick={handleRunTests}>
              <PlayArrow /> RUN TESTS
            </button>
          </div>

          <div className="code-editor">
            <Editor
              height="500px"
              language={activeTab === 'html' ? 'html' : activeTab === 'css' ? 'css' : 'javascript'}
              value={submission.code[activeTab]}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {/* Sample Image Reference */}
          {submission.sampleImage && (
            <div className="sample-image-section">
              <h3>EXPECTED OUTPUT / REFERENCE</h3>
              <div className="sample-image-container">
                <img 
                  src={submission.sampleImage} 
                  alt="Expected output" 
                  className="sample-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* Question Text */}
          {submission.questionText && (
            <div className="question-text-section">
              <h3>QUESTION</h3>
              <p className="question-text">{submission.questionText}</p>
            </div>
          )}

          {/* Telemetry */}
          <div className="telemetry-section">
            <h3>TELEMETRY</h3>
            <div className="telemetry-item">
              <span className="telemetry-label">AUTO-TEST OUTCOME</span>
              <span className={`telemetry-value ${submission.status.toLowerCase()}`}>
                <CheckCircle /> {submission.autoTestOutcome}
              </span>
            </div>
            <div className="telemetry-item">
              <span className="telemetry-label">SUBMISSION TIME</span>
              <span className="telemetry-value">
                <Timer /> {submission.submittedAt}
              </span>
            </div>
          </div>

          {/* Student Feedback */}
          <div className="student-feedback-section">
            <h3>STUDENT FEEDBACK</h3>
            <div className="feedback-ratings">
              <div className="rating-item">
                <span className="rating-label">DIFFICULTY RATING</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${feedback.difficulty >= star ? "filled" : ""}`}
                      onClick={() =>
                        setFeedback((prev) => ({ ...prev, difficulty: star }))
                      }
                    >
                      {feedback.difficulty >= star ? "●" : "○"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rating-item">
                <span className="rating-label">CLARITY RATING</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${feedback.clarity >= star ? "filled" : ""}`}
                      onClick={() =>
                        setFeedback((prev) => ({ ...prev, clarity: star }))
                      }
                    >
                      {feedback.clarity >= star ? "●" : "○"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Rubric Grading */}
        <div className="grading-panel">
          <div className="rubric-section">
            <h2>RUBRIC GRADING</h2>

            {/* Code Quality */}
            <div className="rubric-item">
              <div className="rubric-header">
                <span className="rubric-title">CODE QUALITY</span>
                <span className="rubric-max">MAX {submission.rubric.codeQuality.max}</span>
              </div>
              <div className="score-input-container">
                <input
                  type="number"
                  value={scores.codeQuality}
                  onChange={(e) =>
                    handleScoreChange("codeQuality", parseInt(e.target.value) || 0)
                  }
                  max={submission.rubric.codeQuality.max}
                  min="0"
                  className="score-input"
                />
                <span className="pts-label">PTS</span>
              </div>
            </div>

            {/* Requirements */}
            <div className="rubric-item">
              <div className="rubric-header">
                <span className="rubric-title">REQUIREMENTS</span>
                <span className="rubric-max">MAX {submission.rubric.requirements.max}</span>
              </div>
              <div className="score-input-container">
                <input
                  type="number"
                  value={scores.requirements}
                  onChange={(e) =>
                    handleScoreChange("requirements", parseInt(e.target.value) || 0)
                  }
                  max={submission.rubric.requirements.max}
                  min="0"
                  className="score-input"
                />
                <span className="pts-label">PTS</span>
              </div>
            </div>

            {/* Expected Output */}
            <div className="rubric-item">
              <div className="rubric-header">
                <span className="rubric-title">EXPECTED OUTPUT</span>
                <span className="rubric-max">MAX {submission.rubric.expectedOutput.max}</span>
              </div>
              <div className="score-input-container">
                <input
                  type="number"
                  value={scores.expectedOutput}
                  onChange={(e) =>
                    handleScoreChange(
                      "expectedOutput",
                      parseInt(e.target.value) || 0
                    )
                  }
                  max={submission.rubric.expectedOutput.max}
                  min="0"
                  className="score-input"
                />
                <span className="pts-label">PTS</span>
              </div>
            </div>
          </div>

          {/* Total Score */}
          <div className="total-score-section">
            <div className="score-card">
              <span className="score-label">TOTAL SCORE</span>
              <div className="score-display">
                <span className="score-value">{totalScore}</span>
                <span className={`score-status ${isPassing ? "pass" : "fail"}`}>
                  {isPassing ? "PASS" : "FAIL"}
                </span>
              </div>
            </div>
            <p className="score-feedback">
              Good use of semantic tags. Code indentation is consistent.
            </p>
          </div>

          {/* Finalize Button */}
          <button
            className="finalize-btn"
            onClick={() => setShowFinalizeModal(true)}
          >
            FINALIZE EVAL
          </button>
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="modal-content result-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`result-icon ${resultModal.type}`}>
              {resultModal.type === 'success' ? '✓' : resultModal.type === 'error' ? '✗' : 'ℹ'}
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
                <strong>{totalScore}/{submission.maxScore}</strong>
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
    </div>
  );
};

export default CodeEvaluation;
