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
import { apiGet, apiPut } from "../../../../utils/api";
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

  // Dummy data for demonstration
  const dummySubmission = {
    id: "sub-001",
    studentName: "Alex Johnson",
    studentId: "S12345",
    title: "Portfolio Project",
    submittedAt: "Oct 24, 2023 14:22 PM (ZH Time)",
    status: "PASSED",
    autoTestOutcome: "PASSED (5/5)",
    code: {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Portfolio Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Main Container -->
  <main class="container">
    <header class="profile-header">
      <h1>Alex Johnson</h1>
      <p class="tagline">Frontend Developer in Training</p>
    </header>
    
    <section class="about">
      <h2>About Me</h2>
      <p>I love building clean, accessible user interfaces.</p>
    </section>
  </main>
</body>
</html>`,
      css: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  max-width: 800px;
}

.profile-header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 10px;
}

.tagline {
  font-size: 1.2rem;
  color: #666;
}

.about {
  padding: 20px 0;
}

h2 {
  color: #667eea;
  margin-bottom: 15px;
}`,
      js: `// Portfolio Interactive Features
console.log('Portfolio loaded successfully!');

// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});`,
    },
    rubric: {
      codeQuality: { max: 40, current: 35 },
      requirements: { max: 25, current: 20 },
      expectedOutput: { max: 35, current: 30 },
    },
    totalScore: 85,
    maxScore: 100,
  };

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      // In real app: const response = await apiGet(`/faculty/submissions/${submissionId}`);
      // For now, use dummy data
      setSubmission(dummySubmission);
      setScores({
        codeQuality: dummySubmission.rubric.codeQuality.current,
        requirements: dummySubmission.rubric.requirements.current,
        expectedOutput: dummySubmission.rubric.expectedOutput.current,
      });
    } catch (error) {
      console.error("Error loading submission:", error);
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
    alert("Running automated tests...");
  };

  const handleFinalizeEvaluation = async () => {
    try {
      const evaluationData = {
        submissionId: submission.id,
        scores,
        feedback,
        totalScore: calculateTotalScore(),
        status: calculateTotalScore() >= 60 ? "PASSED" : "FAILED",
      };

      // In real app: await apiPut(`/faculty/submissions/${submissionId}/evaluate`, evaluationData);
      console.log("Evaluation finalized:", evaluationData);
      alert("Evaluation finalized successfully!");
      navigate("/submissions");
    } catch (error) {
      console.error("Error finalizing evaluation:", error);
      alert("Failed to finalize evaluation");
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
        <p>Submission not found</p>
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
        <button
          className="back-button"
          onClick={() => navigate("/submissions")}
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
            <pre className="code-content">
              <code>{submission.code[activeTab]}</code>
            </pre>
          </div>

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
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleFinalizeEvaluation}>
                Confirm & Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEvaluation;
