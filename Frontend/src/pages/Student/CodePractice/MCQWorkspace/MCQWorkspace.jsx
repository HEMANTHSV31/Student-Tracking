import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ClipboardList, CheckCircle, Circle, Send, Loader2,
  ChevronLeft, ChevronRight, Clock, AlertTriangle,
  X, BookOpen, Flag
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
  timeLimit = 30       // Time limit in minutes
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
  const getOptions = (question) => {
    if (!question?.mcq_options) return [];
    try {
      let options = question.mcq_options;
      // Handle double-encoded JSON
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }
      if (typeof options === 'string') {
        options = JSON.parse(options);
      }
      return Array.isArray(options) ? options : [];
    } catch (e) {
      console.error('Error parsing MCQ options:', e);
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

  // Auto fullscreen on mount
  useEffect(() => {
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
  }, [onSubmit, triggerAutoSubmit]);

  // Detect tab switches
  useEffect(() => {
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
  }, [onSubmit, triggerAutoSubmit]);

  // Block keyboard shortcuts
  useEffect(() => {
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
  }, []);

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
    >
      {/* Violation Warning Overlay */}
      {showViolationWarning && (
        <div className="mcq-violation-overlay">
          <div className="mcq-violation-box">
            <h3>⚠️ Warning!</h3>
            <p>Tab switching or exiting fullscreen is not allowed during assessment.</p>
            <p className="violation-count-text">
              Violation #{tabSwitchCount} of 5 - {5 - tabSwitchCount > 0 ? `${5 - tabSwitchCount} remaining before auto-submit` : 'Auto-submitting...'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mcq-header">
        <div className="mcq-title">
          <ClipboardList size={20} />
          <span>{taskTitle}</span>
          <span className="mcq-badge">MCQ</span>
        </div>

        <div className="mcq-header-right">
          {/* Timer */}
          <div className={`mcq-timer ${timeRemaining < 300 ? 'warning' : ''} ${timeRemaining < 60 ? 'critical' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Progress */}
          <div className="mcq-progress">
            <span>{answeredCount} / {totalQuestions} answered</span>
          </div>

          {/* Violations Counter */}
          {tabSwitchCount > 0 && (
            <div className="mcq-violations">
              <AlertTriangle size={16} />
              <span>{tabSwitchCount}</span>
            </div>
          )}

          {/* Submit Button */}
          <button 
            className="mcq-submit-btn"
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
        </div>
      </div>

      {/* Main Content */}
      <div className="mcq-content">
        {/* Question Navigator - Left Sidebar */}
        <div className="mcq-navigator">
          <h4>Questions</h4>
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
                <h3 className="question-title">{currentQuestion.title}</h3>
                <p className="question-text">{currentQuestion.description}</p>
              </div>

              <div className="mcq-options">
                {getOptions(currentQuestion).map((option) => (
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
                ))}
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
            <div className="no-questions">
              <BookOpen size={48} />
              <p>No questions available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
