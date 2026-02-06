import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Send, Play, FileCode, Clock, 
  CheckCircle, AlertCircle, Loader, Home, RefreshCw
} from 'lucide-react';
import WebWorkspace from './WebWorkSpace/WebWorkspace';
import WorkspaceSelector from './WorkspaceSelector';
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
  
  // State
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState(null); // 'html-css' or 'html-css-js'
  const [code, setCode] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

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
          
          // Set workspace mode from task or URL
          const mode = urlMode || demoTask.workspaceMode;
          setWorkspaceMode(mode);
          
          // Load saved code from localStorage
          const savedCode = localStorage.getItem(`code-practice-${taskId}`);
          if (savedCode) {
            setCode(JSON.parse(savedCode));
          }
        } 
        // If no taskId, check for mode in URL or show selector
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
          const response = await apiGet(`/tasks/student/${taskId}`);
          if (response.success) {
            setTask(response.data);
            
            // Determine workspace mode based on task type
            const mode = urlMode || 
              (response.data.courseType === 'p1' ? 'html-css' : 'html-css-js');
            setWorkspaceMode(mode);
            
            // Load saved code
            if (response.data.savedCode) {
              setCode(response.data.savedCode);
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
  const handleModeSelect = (mode) => {
    setWorkspaceMode(mode);
    setShowSelector(false);
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

  // Submit assignment
  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit? You won\'t be able to edit after submission.')) {
      return;
    }
    
    setSubmitting(true);
    try {
      if (taskId && !taskId.startsWith('demo-') && !taskId.startsWith('p')) {
        await apiPost(`/tasks/student/${taskId}/save`, { code });
        const response = await apiPost(`/tasks/student/${taskId}/submit`, { code });
        
        if (response.success) {
          alert('✓ Assignment submitted successfully!');
          navigate('/student/tasks');
          return;
        }
      }
      
      // Demo submission
      alert('✓ This is a demo task. In a real scenario, your code would be submitted to the instructor.');
      localStorage.setItem(`code-practice-${taskId}`, JSON.stringify(code));
    } catch (error) {
      alert('❌ Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Go back to selector
  const handleChangeWorkspace = () => {
    setShowSelector(true);
    setWorkspaceMode(null);
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

  // Show workspace selector
  if (showSelector || !workspaceMode) {
    return (
      <div className="code-practice-page">
        <div className="page-header selector-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="page-title">P Skills Practice</h1>
        </div>
        <WorkspaceSelector 
          onSelect={handleModeSelect}
          selectedMode={workspaceMode}
        />
      </div>
    );
  }

  const isSubmitted = task?.status === 'completed';
  const isOverdue = task?.status === 'overdue';

  return (
    <div className="code-practice-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          
          <div className="task-info">
            <div className="task-title-row">
              <FileCode size={20} className="task-icon" />
              <h1 className="task-title">{task?.title || 'Practice Workspace'}</h1>
              <span className={`mode-badge ${workspaceMode}`}>
                {workspaceMode === 'html-css' ? 'P1' : 'P2'}
              </span>
            </div>
            {task && (
              <div className="task-meta">
                <span className="meta-item">
                  <Clock size={14} />
                  Due: {task.dueDate}
                </span>
                {task.points && (
                  <span className="meta-item points">
                    {task.points} points
                  </span>
                )}
                {lastSaved && (
                  <span className="meta-item saved">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="header-right">
          {/* Status Badges */}
          {isSubmitted && (
            <div className="status-badge submitted">
              <CheckCircle size={16} />
              <span>Submitted</span>
            </div>
          )}
          {isOverdue && !isSubmitted && (
            <div className="status-badge overdue">
              <AlertCircle size={16} />
              <span>Overdue</span>
            </div>
          )}

          {/* Change Workspace Button */}
          <button 
            className="action-btn secondary"
            onClick={handleChangeWorkspace}
          >
            <RefreshCw size={16} />
            <span>Change Workspace</span>
          </button>

          {/* Save Button */}
          <button 
            className="action-btn secondary"
            onClick={handleSave}
            disabled={saving || isSubmitted}
          >
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save</span>
          </button>

          {/* Submit Button */}
          {task && (
            <button 
              className="action-btn primary"
              onClick={handleSubmit}
              disabled={submitting || isSubmitted}
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        {/* Task Description Panel (collapsible) */}
        {task && task.description && (
          <div className="task-panel">
            <div className="panel-header">
              <h3>Task Description</h3>
            </div>
            <div className="panel-body">
              <p className="task-description">{task.description}</p>
              {task.requirements && (
                <div className="requirements">
                  <h4>Requirements:</h4>
                  <ul>
                    {task.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workspace */}
        <div className="workspace-container">
          <WebWorkspace
            mode={workspaceMode}
            initialCode={code}
            onChange={handleCodeChange}
            readOnly={isSubmitted}
            taskTitle={task?.title || 'Practice'}
          />
        </div>
      </div>
    </div>
  );
}
