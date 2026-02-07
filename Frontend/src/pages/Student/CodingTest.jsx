/**
 * Coding Question Interface
 * Component for students to solve coding questions with code editor
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskQuestion, submitCodingSolution } from '../../services/questionBankApi';
import Editor from '@monaco-editor/react';
import '../../styles/CodingTest.css';

const CodingTest = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('# Write your solution here\n\n');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showTestCases, setShowTestCases] = useState(true);

  useEffect(() => {
    fetchQuestion();
  }, [taskId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await getTaskQuestion(taskId);
      
      if (response.success) {
        setQuestion(response.data);
        // Set default template if provided
        if (response.data.starter_code) {
          setCode(response.data.starter_code);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting.');
      return;
    }

    if (!confirm('Are you sure you want to submit your solution? Your code will be sent for grading.')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitCodingSolution(taskId, code, language);
      
      if (response.success) {
        alert('Solution submitted successfully! Your code will be reviewed by your instructor.');
        navigate('/tasks');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit solution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditorChange = (value) => {
    setCode(value || '');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your code? This cannot be undone.')) {
      setCode(question.starter_code || '# Write your solution here\n\n');
    }
  };

  if (loading) {
    return (
      <div className="coding-test">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coding-test">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const testCases = question.test_cases ? JSON.parse(question.test_cases) : [];

  return (
    <div className="coding-test">
      <div className="coding-header">
        <div className="coding-info">
          <h2>{question.skill_name}</h2>
          <div className="coding-meta">
            <span className={`badge badge-${question.difficulty?.toLowerCase() || 'medium'}`}>
              {question.difficulty || 'Medium'}
            </span>
            <span className="badge badge-info">Coding</span>
          </div>
        </div>
        <div className="coding-actions-header">
          <select
            className="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={submitting}
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
      </div>

      <div className="coding-layout">
        <div className="problem-panel">
          <div className="problem-tabs">
            <button
              className={`tab ${!showTestCases ? 'active' : ''}`}
              onClick={() => setShowTestCases(false)}
            >
              Problem
            </button>
            <button
              className={`tab ${showTestCases ? 'active' : ''}`}
              onClick={() => setShowTestCases(true)}
            >
              Test Cases ({testCases.length})
            </button>
          </div>

          <div className="problem-content">
            {!showTestCases ? (
              <div className="problem-description">
                <h3>Problem Description</h3>
                <div className="question-text">
                  {question.question_text}
                </div>

                {question.code_snippet && (
                  <div className="example-section">
                    <h4>Example:</h4>
                    <pre>
                      <code>{question.code_snippet}</code>
                    </pre>
                  </div>
                )}

                {question.constraints && (
                  <div className="constraints-section">
                    <h4>Constraints:</h4>
                    <pre>{question.constraints}</pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="test-cases-section">
                <h3>Test Cases</h3>
                {testCases.length === 0 ? (
                  <p className="empty-state">No test cases provided</p>
                ) : (
                  <div className="test-cases-list">
                    {testCases.map((testCase, index) => (
                      <div key={index} className="test-case-card">
                        <div className="test-case-header">
                          <strong>Test Case {index + 1}</strong>
                        </div>
                        <div className="test-case-content">
                          <div className="test-case-input">
                            <strong>Input:</strong>
                            <pre>{JSON.stringify(testCase.input, null, 2)}</pre>
                          </div>
                          <div className="test-case-output">
                            <strong>Expected Output:</strong>
                            <pre>{JSON.stringify(testCase.expected_output, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="editor-panel">
          <div className="editor-toolbar">
            <h3>Your Solution</h3>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset Code
            </button>
          </div>
          
          <div className="editor-container">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>

          <div className="editor-footer">
            <div className="info-text">
              <small>
                ℹ️ Your code will be manually reviewed and graded by your instructor.
                Make sure to test your solution before submitting.
              </small>
            </div>
            <div className="editor-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/tasks')}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingTest;
