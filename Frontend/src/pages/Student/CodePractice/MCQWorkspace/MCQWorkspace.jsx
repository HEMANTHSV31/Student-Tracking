import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ClipboardList, CheckCircle, Circle, Send, Loader2,
  ChevronLeft, ChevronRight, Clock, AlertTriangle,
  BookOpen, Flag, Maximize2, Minimize2, ArrowLeft
} from 'lucide-react';
import './MCQWorkspace.css';

/**
 * MCQWorkspace - MCQ Assessment workspace for P Skills
 * Displays questions and allows students to select answers
 */
export default function MCQWorkspace({ 
  questions = [],      // Array of MCQ questions
  taskTitle = 'MCQ Assessment',
  onSubmit = null,     // Submit callback - receives { answers, violations }
  isSubmitting = false,
  timeLimit = 30,      // Time limit in minutes
  demoMode = false,    // Demo mode - no fullscreen enforcement, no submit, just practice
  onBack = null        // Back button callback for demo mode
}) {
  // Current question index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Student answers - { question_id: selected_option_id }
  const [answers, setAnswers] = useState({});
  
  // Flagged questions for review
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60); // seconds
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  // Security - track violations
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSubmittingRef = useRef(false);
  
  const workspaceContainerRef = useRef(null);
  const timerRef = useRef(null);
  const lastFullscreenExitRef = useRef(0);
  const fullscreenEnforcementIntervalRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Current question
  const currentQuestion = questions[currentIndex] || null;
  
  // Parse MCQ options from JSON string if needed
  // Backend returns options in 'sample_answer' or 'mcq_options' field
  const getOptions = (question) => {
    // Check both possible field names from backend
    const rawOptions = question?.sample_answer || question?.mcq_options;
    if (!rawOptions) {
      console.log('No options found in question:', question);
      return [];
    }
    try {
      let options = rawOptions;
      // Handle double-encoded JSON (sometimes backend returns double-stringified)
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }
      console.log('Parsed options:', options);
      return Array.isArray(options) ? options : [];
    } catch (e) {
      console.error('Error parsing MCQ options:', e, 'Raw options:', rawOptions);
      return [];
    }
  };

  // Auto-submit function
  const triggerAutoSubmit = useCallback(() => {
    if (isSubmittingRef.current || !onSubmit) return;
    
    isSubmittingRef.current = true;
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    // Calculate time taken in minutes
    const totalSeconds = timeLimit * 60;
    const timeTakenSeconds = totalSeconds - timeRemaining;
    const timeTakenMinutes = Math.ceil(timeTakenSeconds / 60);
    
    // Submit with current answers
    onSubmit({
      answers,
      violations: tabSwitchCount,
      autoSubmitted: true,
      timeTaken: timeTakenMinutes
    });
  }, [answers, tabSwitchCount, timeRemaining, timeLimit, onSubmit]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsTimeUp(true);
      triggerAutoSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-submit when time is up
  useEffect(() => {
    if (isTimeUp && !isSubmittingRef.current) {
      triggerAutoSubmit();
    }
  }, [isTimeUp, triggerAutoSubmit]);

  // Auto fullscreen on mount (skip in demo mode)
  useEffect(() => {
    // In demo mode, just track fullscreen state without enforcement
    if (demoMode) {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }

    const enterFullscreen = async () => {
      const elem = workspaceContainerRef.current;
      if (!elem) return;
      
      setTimeout(async () => {
        if (document.fullscreenElement === null && !isSubmittingRef.current) {
          try {
            await elem.requestFullscreen();
            setIsFullscreen(true);
            
            // Try to lock keyboard to prevent Escape key from exiting fullscreen
            if (navigator.keyboard && navigator.keyboard.lock) {
              try {
                await navigator.keyboard.lock(['Escape']);
              } catch (err) {
                console.log('Keyboard lock not available:', err.message);
              }
            }
          } catch (err) {
            console.log('Fullscreen auto-enter blocked');
          }
        }
      }, 500);
    };

    enterFullscreen();

    // Prevent Escape key from exiting fullscreen
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

    // Aggressive fullscreen re-entry function with multiple retries
    const forceReenterFullscreen = (retryCount = 0) => {
      const maxRetries = 5;
      const elem = workspaceContainerRef.current;
      
      if (!elem || isSubmittingRef.current || document.fullscreenElement !== null) {
        return;
      }
      
      elem.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.log(`MCQ Fullscreen re-entry attempt ${retryCount + 1} failed:`, err.message);
        if (retryCount < maxRetries) {
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
          setTimeout(() => forceReenterFullscreen(retryCount + 1), 50 * Math.pow(2, retryCount));
        }
      });
    };

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen && !isSubmittingRef.current) {
        // Prevent double counting if exit happened within 500ms
        const now = Date.now();
        if (now - lastFullscreenExitRef.current < 500) {
          forceReenterFullscreen();
          return;
        }
        lastFullscreenExitRef.current = now;
        
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5 && onSubmit) {
            triggerAutoSubmit();
          }
          return newCount;
        });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
        
        // Re-enter fullscreen aggressively
        forceReenterFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Continuous enforcement interval - checks every 200ms and forces fullscreen if not active
    fullscreenEnforcementIntervalRef.current = setInterval(() => {
      if (!isSubmittingRef.current && document.fullscreenElement === null) {
        const elem = workspaceContainerRef.current;
        if (elem) {
          elem.requestFullscreen().catch(() => {
            // Silent catch - we'll try again on next interval
          });
        }
      }
    }, 200);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
      // Clear enforcement interval
      if (fullscreenEnforcementIntervalRef.current) {
        clearInterval(fullscreenEnforcementIntervalRef.current);
      }
    };
  }, [onSubmit, triggerAutoSubmit, demoMode]);

  // Detect tab switches (skip in demo mode)
  useEffect(() => {
    // Skip tab switch detection in demo mode
    if (demoMode) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5 && onSubmit) {
            triggerAutoSubmit();
          }
          return newCount;
        });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
      }
    };

    const handleWindowBlur = () => {
      if (!isSubmittingRef.current) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5 && onSubmit) {
            triggerAutoSubmit();
          }
          return newCount;
        });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onSubmit, triggerAutoSubmit, demoMode]);

  // Block keyboard shortcuts (skip in demo mode)
  useEffect(() => {
    // Skip keyboard blocking in demo mode
    if (demoMode) {
      return;
    }

    const blockExitKeys = (e) => {
      if (e.key === 'Escape' || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (e.altKey || (e.metaKey && e.key === 'Tab')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block copy/paste
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('keydown', blockExitKeys, true);
    
    return () => {
      document.removeEventListener('keydown', blockExitKeys, true);
    };
  }, [demoMode]);

  // Select an answer
  const selectAnswer = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Toggle flag on question
  const toggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Navigate questions
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    isSubmittingRef.current = true;
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    // Calculate time taken in minutes
    const totalSeconds = timeLimit * 60;
    const timeTakenSeconds = totalSeconds - timeRemaining;
    const timeTakenMinutes = Math.ceil(timeTakenSeconds / 60);
    
    onSubmit({
      answers,
      violations: tabSwitchCount,
      autoSubmitted: false,
      timeTaken: timeTakenMinutes
    });
  };

  // Count answered questions
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <div 
      ref={workspaceContainerRef}
      className={`mcq-workspace ${isFullscreen ? 'fullscreen' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Violation Warning Overlay - Same as WebWorkspace */}
      {showViolationWarning && (
        <div className="violation-warning-overlay">
          <div className="violation-warning-box">
            <h3>⚠️ Warning!</h3>
            <p>Tab switching or exiting fullscreen is not allowed during assessment.</p>
            <p style={{ marginTop: '8px', color: '#F85149' }}>
              Violation #{tabSwitchCount} of 5 - {5 - tabSwitchCount > 0 ? `${5 - tabSwitchCount} remaining before auto-submit` : 'Auto-submitting...'}
            </p>
          </div>
        </div>
      )}

      {/* Workspace Header - Same style as WebWorkspace */}
      <div className="workspace-header">
        <div className="workspace-title">
          {/* Back Button - Only in demo mode */}
          {demoMode && onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                marginRight: '12px',
                background: '#21262D',
                border: '1px solid #30363D',
                borderRadius: '8px',
                color: '#E6EDF3',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#30363D';
                e.target.style.borderColor = '#484F58';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#21262D';
                e.target.style.borderColor = '#30363D';
              }}
              title="Back to Workspace Selector"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <ClipboardList size={20} />
          <span>{taskTitle}</span>
          <span className="workspace-badge mcq">MCQ</span>
        </div>

        <div className="workspace-actions">
          {/* Timer */}
          <div className={`mcq-timer ${timeRemaining < 300 ? 'warning' : ''} ${timeRemaining < 60 ? 'critical' : ''}`}>
            <Clock size={18} />
            <span>{demoMode ? '--:--' : formatTime(timeRemaining)}</span>
          </div>

          <div className="action-divider" />

          {/* Progress */}
          <div className="mcq-progress">
            <CheckCircle size={16} />
            <span>{answeredCount} / {totalQuestions || '--'}</span>
          </div>

          {/* Violations Counter */}
          {!demoMode && tabSwitchCount > 0 && (
            <div className="violation-counter" title="Tab switch/exit attempts detected">
              <span className="violation-icon">⚠️</span>
              <span className="violation-count">{tabSwitchCount}</span>
            </div>
          )}

          {/* Demo Mode Badge */}
          {demoMode && (
            <div className="demo-mode-badge">
              <span>Demo Mode</span>
            </div>
          )}

          {/* Fullscreen Toggle - Only in demo mode */}
          {demoMode && (
            <>
              <div className="action-divider" />
              <button 
                className="fullscreen-toggle-btn"
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                    setIsFullscreen(false);
                  } else {
                    workspaceContainerRef.current?.requestFullscreen();
                    setIsFullscreen(true);
                  }
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span style={{ whiteSpace: 'nowrap' }}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </>
          )}

          {/* Submit Button - Only show when not in demo mode */}
          {!demoMode && (
            <>
              <div className="action-divider" />
              <button 
                className="ws-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Send size={16} />
                )}
                <span>Submit</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Workspace Body */}
      <div className="workspace-body">
        {/* Question Navigator - Left Sidebar */}
        <div className="mcq-navigator">
          <div className="nav-header">
            <h4>Questions</h4>
          </div>
          <div className="mcq-nav-grid">
            {questions.map((q, idx) => (
              <button
                key={q.question_id}
                className={`mcq-nav-btn 
                  ${idx === currentIndex ? 'active' : ''} 
                  ${answers[q.question_id] ? 'answered' : ''} 
                  ${flaggedQuestions.has(q.question_id) ? 'flagged' : ''}`}
                onClick={() => goToQuestion(idx)}
              >
                {idx + 1}
                {flaggedQuestions.has(q.question_id) && <Flag size={10} className="flag-icon" />}
              </button>
            ))}
          </div>
          
          <div className="mcq-nav-legend">
            <div className="legend-item">
              <span className="legend-dot answered"></span>
              <span>Answered</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot flagged"></span>
              <span>Flagged</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot current"></span>
              <span>Current</span>
            </div>
          </div>
        </div>

        {/* Question Display - Main Area */}
        <div className="mcq-question-area">
          {currentQuestion ? (
            <>
              <div className="mcq-question-header">
                <span className="question-number">Question {currentIndex + 1} of {totalQuestions}</span>
                <button 
                  className={`flag-btn ${flaggedQuestions.has(currentQuestion.question_id) ? 'flagged' : ''}`}
                  onClick={() => toggleFlag(currentQuestion.question_id)}
                  title="Flag for review"
                >
                  <Flag size={16} />
                  <span>{flaggedQuestions.has(currentQuestion.question_id) ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              <div className="mcq-question-content">
                <h3 className="question-title">{currentQuestion.question_text || currentQuestion.title}</h3>
                {currentQuestion.description && (
                  <p className="question-text">{currentQuestion.description}</p>
                )}
              </div>

              <div className="mcq-options">
                {getOptions(currentQuestion).length > 0 ? (
                  getOptions(currentQuestion).map((option) => (
                    <button
                      key={option.id}
                      className={`mcq-option ${answers[currentQuestion.question_id] === option.id ? 'selected' : ''}`}
                      onClick={() => selectAnswer(currentQuestion.question_id, option.id)}
                    >
                      <span className="option-letter">{option.id}</span>
                      <span className="option-text">{option.text}</span>
                      {answers[currentQuestion.question_id] === option.id ? (
                        <CheckCircle size={20} className="option-check" />
                      ) : (
                        <Circle size={20} className="option-circle" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="no-options">
                    <AlertTriangle size={24} />
                    <p>No options available for this question</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="mcq-navigation">
                <button 
                  className="nav-btn prev"
                  onClick={() => goToQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft size={20} />
                  <span>Previous</span>
                </button>
                
                <button 
                  className="nav-btn next"
                  onClick={() => goToQuestion(currentIndex + 1)}
                  disabled={currentIndex === totalQuestions - 1}
                >
                  <span>Next</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="no-questions demo-mode">
              <BookOpen size={48} />
              {demoMode ? (
                <>
                  <h3>MCQ Practice Workspace</h3>
                  <p>This is a demo workspace for MCQ-style assessments.</p>
                  <ul className="demo-features">
                    <li>Timed assessments with countdown</li>
                    <li>Multiple choice questions with instant selection</li>
                    <li>Question navigation and flagging for review</li>
                    <li>Fullscreen mode during actual assessments</li>
                  </ul>
                  <p className="demo-note">Start a real MCQ task from your assignments to begin an assessment.</p>
                </>
              ) : (
                <p>No questions available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
