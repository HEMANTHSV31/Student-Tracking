import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import WebWorkspace from './WebWorkSpace/WebWorkspace';
import MCQWorkspace from './MCQWorkspace/MCQWorkspace';
import WorkspaceSelector from './WorkSpaceSelecter/WorkspaceSelector';
import useAuthStore from '../../../store/useAuthStore';
import { apiGet, apiPost } from '../../../utils/api';
import './CodePracticePage.css';

/**
 * CodePracticePage - Main page for P Skills code practice
 * Supports HTML+CSS and HTML+CSS+JS workspaces
 */
export default function CodePracticePage() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const API_URL = import.meta.env.VITE_API_URL;
  
  // State
  const [task, setTask] = useState(null);
  const [question, setQuestion] = useState(null); // Question data with instructions, checklist, sample image
  const [mcqQuestions, setMcqQuestions] = useState([]); // Array of MCQ questions
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState(null); // 'html-css' or 'html-css-js'
  const [code, setCode] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const [openingWorkspace, setOpeningWorkspace] = useState(false); // For workspace opening animation

  // Demo tasks with workspace modes
  const demoTasks = {
    'p1-demo': {
      id: 'p1-demo',
      title: 'Personal Portfolio Page',
      subject: 'HTML + CSS',
      workspaceMode: 'html-css',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      points: 100,
      description: 'Create a personal portfolio page using only HTML and CSS. Include a header, about section, skills showcase, and contact form. Make it fully responsive.',
      requirements: [
        'Semantic HTML5 structure',
        'CSS Flexbox/Grid layout',
        'Responsive design (mobile-first)',
        'CSS animations for hover effects',
        'Custom color scheme and typography'
      ]
    },
    'p2-demo': {
      id: 'p2-demo',
      title: 'Interactive Quiz Application',
      subject: 'HTML + CSS + JavaScript',
      workspaceMode: 'html-css-js',
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      points: 150,
      description: 'Build an interactive quiz application with JavaScript. Users should be able to answer questions, see their score, and restart the quiz.',
      requirements: [
        'Multiple choice questions',
        'Score tracking',
        'Timer for each question',
        'Results summary page',
        'Local storage for high scores'
      ]
    },
    'demo-1': {
      id: 'demo-1',
      title: 'Build a Responsive Landing Page',
      subject: 'HTML + CSS',
      workspaceMode: 'html-css',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      points: 100,
      description: 'Create a modern, responsive landing page with HTML and CSS. Include a hero section, features section, and contact form.',
      requirements: [
        'Hero section with call-to-action',
        'Features grid section',
        'Responsive navigation',
        'Contact form',
        'Footer with links'
      ]
    },
    'demo-2': {
      id: 'demo-2',
      title: 'Interactive Todo Application',
      subject: 'HTML + CSS + JavaScript',
      workspaceMode: 'html-css-js',
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      points: 80,
      description: 'Build a fully functional todo app with add, delete, and mark complete features. Use JavaScript for DOM manipulation and local storage for persistence.',
      requirements: [
        'Add new tasks',
        'Mark tasks complete',
        'Delete tasks',
        'Filter by status',
        'Persist in localStorage'
      ]
    }
  };

  // Fetch task details
  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        // Check for mode in URL params
        const urlMode = searchParams.get('mode');
        
        // Handle demo tasks
        if (taskId && demoTasks[taskId]) {
          const demoTask = demoTasks[taskId];
          setTask(demoTask);
          
          // Set demo question data
          setQuestion({
            question_text: demoTask.title,
            description: demoTask.description,
            coding_test_cases: demoTask.requirements || [],
            sample_image_url: null
          });
          
          // Set workspace mode from task or URL
          const mode = urlMode || demoTask.workspaceMode;
          setWorkspaceMode(mode);
          setShowSelector(false);
          
          // Show opening animation
          setOpeningWorkspace(true);
          setTimeout(() => setOpeningWorkspace(false), 1500);
          
          // Load saved code from localStorage
          const savedCode = localStorage.getItem(`code-practice-${taskId}`);
          if (savedCode) {
            setCode(JSON.parse(savedCode));
          }
        } 
        // If no taskId, show selector but lock it
        else if (!taskId) {
          if (urlMode) {
            setWorkspaceMode(urlMode);
            setShowSelector(false);
          } else {
            setShowSelector(true);
          }
        }
        // Fetch from API for real tasks
        else {
          const responseRaw = await apiGet(`/tasks/student/${taskId}`);
          const response = await responseRaw.json();
          console.log('Task response:', response);
          if (response.success) {
            const taskData = response.data;
            setTask(taskData);
            
            // Check if this is an MCQ task (API returns questionType in camelCase)
            const isMCQTask = taskData.questionType === 'mcq';
            
            // Fetch question data for this task
            try {
              console.log('Fetching questions for task:', taskId);
              const questionsResponseRaw = await apiGet(`/tasks/${taskId}/questions`);
              const questionsResponse = await questionsResponseRaw.json();
              console.log('Questions response:', questionsResponse);
              
              if (questionsResponse.success && questionsResponse.data && questionsResponse.data.length > 0) {
                if (isMCQTask) {
                  // For MCQ tasks, set all questions
                  setMcqQuestions(questionsResponse.data);
                  console.log('MCQ questions loaded:', questionsResponse.data.length);
                } else {
                  // For coding tasks, use first question
                  const questionData = questionsResponse.data[0];
                  console.log('Question data to set:', questionData);
                  setQuestion({
                    question_id: questionData.question_id,
                    question_text: questionData.question_text,
                    description: questionData.description,
                    coding_test_cases: questionData.coding_test_cases || [],
                    sample_image_url: questionData.sample_image_url,
                    coding_starter_code: questionData.coding_starter_code,
                    resource_images: questionData.resource_images || []
                  });
                }
              } else {
                console.log('No questions found from API, using task data as fallback');
                // Fallback: Use task data as question if available
                if (taskData.description && !isMCQTask) {
                  setQuestion({
                    question_text: taskData.title,
                    description: taskData.description,
                    coding_test_cases: taskData.requirements || taskData.checklist || [],
                    sample_image_url: taskData.sample_image || null,
                    coding_starter_code: null,
                    resource_images: []
                  });
                }
              }
            } catch (qErr) {
              console.error('Error fetching question data:', qErr);
              // Fallback: Use task data as question if available
              if (taskData.description && !isMCQTask) {
                setQuestion({
                  question_text: taskData.title,
                  description: taskData.description,
                  coding_test_cases: taskData.requirements || taskData.checklist || [],
                  sample_image_url: taskData.sample_image || null,
                  coding_starter_code: null,
                  resource_images: []
                });
              }
            }
            
            // If URL has explicit mode, use it and skip selector
            if (urlMode) {
              setWorkspaceMode(urlMode);
              setShowSelector(false);
              
              // Show opening animation
              setOpeningWorkspace(true);
              setTimeout(() => setOpeningWorkspace(false), 1500);
              
              // Load saved code
              if (taskData.savedCode) {
                setCode(taskData.savedCode);
              }
            } else {
              // No mode in URL - determine from task skill filter
              const skillName = (taskData.skillFilter || taskData.title || '').toLowerCase();
              let autoMode = 'html-css-js'; // default
              
              if (skillName.includes('html') || skillName.includes('css')) {
                if (!skillName.includes('javascript') && !skillName.includes('js')) {
                  autoMode = 'html-css';
                }
              }
              
              setWorkspaceMode(autoMode);
              setShowSelector(false);
              
              // Show opening animation
              setOpeningWorkspace(true);
              setTimeout(() => setOpeningWorkspace(false), 1500);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, searchParams]);

  // Handle workspace mode selection
  const handleModeSelect = async (mode) => {
    // If no taskId, allow demo mode - just open the workspace without validation
    if (!taskId) {
      setWorkspaceMode(mode);
      setShowSelector(false);
      return;
    }
    
    // Verify task is code_practice and student has assigned questions
    try {
      const responseRaw = await apiGet(`/tasks/student/${taskId}`);
      const response = await responseRaw.json();
      if (!response.success) {
        setModal({
          show: true,
          title: 'Verification Failed',
          message: 'Unable to verify task assignment.',
          type: 'error'
        });
        return;
      }
      
      const taskData = response.data;
      
      // Check if this is a code_practice task
      if (taskData.taskType !== 'code_practice' || taskData.questionType !== 'coding') {
        setModal({
          show: true,
          title: 'Invalid Task Type',
          message: 'This task is not a coding practice assignment.',
          type: 'warning'
        });
        return;
      }
      
      // Verify student has assigned questions
      const questionsResponseRaw = await apiGet(`/tasks/${taskId}/questions`);
      const questionsResponse = await questionsResponseRaw.json();
      if (!questionsResponse.success || !questionsResponse.data || questionsResponse.data.length === 0) {
        setModal({
          show: true,
          title: 'No Questions Assigned',
          message: 'No coding question assigned to you for this task.',
          type: 'warning'
        });
        return;
      }
      
      // All validations passed, open the workspace
      setWorkspaceMode(mode);
      setShowSelector(false);
    } catch (error) {
      console.error('Error validating task:', error);
      setModal({
        show: true,
        title: 'Error',
        message: 'Unable to open workspace. Please try again.',
        type: 'error'
      });
    }
  };

  // Handle code changes
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    
    // Auto-save to localStorage
    if (taskId) {
      localStorage.setItem(`code-practice-${taskId}`, JSON.stringify(newCode));
    } else {
      localStorage.setItem(`code-practice-sandbox-${workspaceMode}`, JSON.stringify(newCode));
    }
  };

  // Save code to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      if (taskId && !taskId.startsWith('demo-') && !taskId.startsWith('p')) {
        await apiPost(`/tasks/student/${taskId}/save`, { code });
      }
      
      // Save to localStorage
      if (taskId) {
        localStorage.setItem(`code-practice-${taskId}`, JSON.stringify(code));
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Submit assignment - called from WebWorkspace submit button
  const handleSubmit = async (submittedData = null) => {
    // If called from WebWorkspace, we get the files data
    const performSubmit = async () => {
      setSubmitting(true);
      try {
        if (taskId && !taskId.startsWith('demo-') && !taskId.startsWith('p')) {
          // Use the new web code submission API with multiple files
          const files = submittedData?.files || [
            { name: 'index.html', content: code.html || '' },
            { name: 'style.css', content: code.css || '' },
            ...(workspaceMode === 'html-css-js' ? [{ name: 'script.js', content: code.js || '' }] : [])
          ];
          
          const responseRaw = await apiPost(`/tasks/${taskId}/submit-web-code`, { 
            files,
            question_id: question?.question_id || null,
            workspace_mode: workspaceMode,
            time_taken_minutes: null, // Could track time in future
            violations: submittedData?.violations || 0 // Tab switch/fullscreen exit count
          });
          
          // Check if response is ok before parsing JSON
          if (!responseRaw.ok) {
            const errorText = await responseRaw.text();
            console.error('Server error response:', errorText);

            let message = `Server error (${responseRaw.status})`;
            try {
              const parsed = JSON.parse(errorText);
              if (parsed?.message) message = parsed.message;
              if (parsed?.error) message = `${message}: ${parsed.error}`;
            } catch {
              if (errorText?.trim()) message = `${message}: ${errorText.trim()}`;
            }

            throw new Error(message);
          }
          
          const response = await responseRaw.json();
          
          if (response.success) {
            setModal({
              show: true,
              title: 'Success',
              message: 'Your code has been submitted successfully! Faculty will review and grade your submission.',
              type: 'success',
              onClose: () => navigate('/pbl/tasks')
            });
            return;
          } else {
            throw new Error(response.message || 'Submission failed');
          }
        }
        
        // Demo submission
        localStorage.setItem(`code-practice-${taskId}`, JSON.stringify(code));
        setModal({
          show: true,
          title: 'Demo Submission',
          message: 'This is a demo task. In a real scenario, your code would be submitted to the instructor.',
          type: 'info'
        });
      } catch (error) {
        console.error('Submit error:', error);
        setModal({
          show: true,
          title: 'Submission Failed',
          message: error.message || 'Failed to submit. Please try again.',
          type: 'error'
        });
      } finally {
        setSubmitting(false);
      }
    };

    // If called directly from header button, show confirmation
    // If called from WebWorkspace submit, data is already provided so submit directly
    if (submittedData) {
      await performSubmit();
    } else {
      setModal({
        show: true,
        title: 'Confirm Submission',
        message: 'Are you sure you want to submit? You won\'t be able to edit after submission.',
        type: 'confirm',
        onConfirm: performSubmit
      });
    }
  };

  // Submit MCQ answers - called from MCQWorkspace submit button
  const handleMCQSubmit = async (submittedData = null) => {
    setSubmitting(true);
    try {
      if (taskId && !taskId.startsWith('demo-') && !taskId.startsWith('p')) {
        const responseRaw = await apiPost(`/tasks/${taskId}/submit-mcq`, {
          answers: submittedData?.answers || {},
          violations: submittedData?.violations || 0,
          time_taken_minutes: submittedData?.timeTaken || null
        });
        
        // Check if response is ok before parsing JSON
        if (!responseRaw.ok) {
          const errorText = await responseRaw.text();
          console.error('Server error response:', errorText);

          let message = `Server error (${responseRaw.status})`;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed?.message) message = parsed.message;
            if (parsed?.error) message = `${message}: ${parsed.error}`;
          } catch {
            if (errorText?.trim()) message = `${message}: ${errorText.trim()}`;
          }

          throw new Error(message);
        }
        
        const response = await responseRaw.json();
        
        if (response.success) {
          const data = response.data || {};
          setModal({
            show: true,
            title: data.passed ? 'Test Passed!' : 'Test Completed',
            message: `Score: ${data.score}/${data.total} (${data.percentage}%)${data.passed ? ' - Congratulations!' : ' - Try again to pass.'}`,
            type: data.passed ? 'success' : 'warning',
            onClose: () => navigate('/pbl/tasks')
          });
          return;
        } else {
          throw new Error(response.message || 'Submission failed');
        }
      }
      
      // Demo submission
      setModal({
        show: true,
        title: 'Demo Submission',
        message: 'This is a demo task. In a real scenario, your MCQ answers would be submitted.',
        type: 'info'
      });
    } catch (error) {
      console.error('MCQ Submit error:', error);
      setModal({
        show: true,
        title: 'Submission Failed',
        message: error.message || 'Failed to submit. Please try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Combine HTML, CSS, and JS files into a single file
  const combineCodeFiles = (code) => {
    let combined = code.html || '';
    
    // Inject CSS
    if (code.css) {
      const styleTag = `\n<style>\n${code.css}\n</style>`;
      if (combined.includes('</head>')) {
        combined = combined.replace('</head>', `${styleTag}\n</head>`);
      } else if (combined.includes('<head>')) {
        combined = combined.replace('<head>', `<head>${styleTag}`);
      } else {
        combined = styleTag + '\n' + combined;
      }
    }
    
    // Inject JS (only if mode includes JavaScript)
    if (workspaceMode === 'html-css-js' && code.js) {
      const scriptTag = `\n<script>\n${code.js}\n</script>`;
      if (combined.includes('</body>')) {
        combined = combined.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        combined = combined + '\n' + scriptTag;
      }
    }
    
    return combined;
  };

  // Loading state
  if (loading) {
    return (
      <div className="code-practice-page loading">
        <div className="loading-content">
          <Loader className="loading-spinner" size={40} />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Opening workspace animation
  if (openingWorkspace && workspaceMode) {
    return (
      <div className="code-practice-page opening-workspace">
        <div className="opening-animation">
          <div className="workspace-icon-container">
            <div className={`workspace-icon ${workspaceMode}`}>
              {workspaceMode === 'html-css' ? (
                <>
                  <span className="icon-badge html">H</span>
                  <span className="icon-badge css">C</span>
                </>
              ) : (
                <>
                  <span className="icon-badge html">H</span>
                  <span className="icon-badge css">C</span>
                  <span className="icon-badge js">J</span>
                </>
              )}
            </div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          <h2 className="opening-title">
            Opening {workspaceMode === 'html-css' ? 'HTML + CSS' : 'HTML + CSS + JS'} Workspace
          </h2>
          <p className="opening-subtitle">
            {task?.title || 'P Skills Practice'}
          </p>
          <div className="opening-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show workspace selector
  if (showSelector || !workspaceMode) {
    return (
      <div className="code-practice-page no-header selector-mode">
        <WorkspaceSelector 
          onSelect={handleModeSelect}
          selectedMode={workspaceMode}
        />
      </div>
    );
  }

  const isSubmitted = task?.status === 'completed';
  
  // Demo mode: No taskId or using demo task - no questions, no submit, just practice
  const isDemoMode = !taskId || (taskId && demoTasks[taskId]) || !task;

  return (
    <div className="code-practice-page no-header">
      {/* Main Content */}
      <div className="page-content">
        {/* Workspace - Render MCQ or Web based on workspace mode or question type */}
        <div className="workspace-container">
          {workspaceMode === 'mcq' || task?.questionType === 'mcq' ? (
            <MCQWorkspace
              questions={isDemoMode ? [] : mcqQuestions}
              taskTitle={isDemoMode ? 'MCQ Practice' : (task?.title || 'MCQ Assessment')}
              onSubmit={isDemoMode ? null : handleMCQSubmit}
              isSubmitting={submitting}
              timeLimit={task?.time_limit || 30}
              demoMode={isDemoMode}
              onBack={isDemoMode ? () => { setShowSelector(true); setWorkspaceMode(null); } : null}
            />
          ) : (
            <WebWorkspace
              mode={workspaceMode}
              initialCode={code}
              onChange={handleCodeChange}
              readOnly={isSubmitted}
              taskTitle={isDemoMode ? 'Practice Workspace' : (task?.title || 'Practice')}
              question={isDemoMode ? null : question}
              apiUrl={API_URL}
              onSubmit={isDemoMode ? null : handleSubmit}
              isSubmitting={submitting}
              demoMode={isDemoMode}
              onBack={isDemoMode ? () => { setShowSelector(true); setWorkspaceMode(null); } : null}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {modal.show && (
        <div className="modal-overlay" onClick={() => modal.type !== 'confirm' && setModal({ show: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              {modal.type === 'success' && <CheckCircle size={24} />}
              {modal.type === 'warning' && <AlertCircle size={24} />}
              {modal.type === 'error' && <AlertCircle size={24} />}
              {modal.type === 'info' && <AlertCircle size={24} />}
              {modal.type === 'confirm' && <AlertCircle size={24} />}
              <h3>{modal.title}</h3>
            </div>
            <div className="modal-body">
              <p>{modal.message}</p>
            </div>
            <div className="modal-footer">
              {modal.type === 'confirm' ? (
                <>
                  <button 
                    className="modal-btn cancel"
                    onClick={() => setModal({ show: false })}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn confirm"
                    onClick={() => modal.onConfirm && modal.onConfirm()}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  className="modal-btn primary"
                  onClick={() => {
                    setModal({ show: false });
                    modal.onClose && modal.onClose();
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}