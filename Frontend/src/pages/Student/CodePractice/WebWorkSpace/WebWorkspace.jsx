import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Eye, EyeOff, Maximize2, Minimize2,
  Code2, FileCode, FileType, Palette, Braces,
  Monitor, Smartphone, Tablet,
  Download, Copy, Check,
  Plus, X, File, FileText, Trash2,
  BookOpen, CheckCircle, Image, ClipboardList,
  Send, Loader2, FolderPlus
} from 'lucide-react';
import './WebWorkspace.css';

/**
 * WebWorkspace - Monaco Editor workspace for P Skills
 * Supports two modes:
 * 1. HTML + CSS (html-css)
 * 2. HTML + CSS + JS (html-css-js)
 */
export default function WebWorkspace({ 
  mode = 'html-css-js', // 'html-css' or 'html-css-js'
  initialCode = null,
  onChange,
  readOnly = false,
  taskTitle = 'Untitled Task',
  onRun,
  question = null,  // Question data with instructions, checklist, sample image
  apiUrl = '',       // API URL for image paths
  onSubmit = null,   // Submit callback - receives { files, code, customFiles }
  isSubmitting = false // Loading state for submit button
}) {
  // Question panel state - show by default if question exists
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
  const [showSampleImage, setShowSampleImage] = useState(false);
  // Empty code templates for assessment - students start with blank code
  const getDefaultCode = () => {
    if (mode === 'html-css') {
      return {
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${taskTitle}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Write your HTML code here -->
  
</body>
</html>`,
        css: `/* Write your CSS styles here */

`,
        js: ''
      };
    }
    // HTML + CSS + JS mode
    return {
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${taskTitle}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Write your HTML code here -->
  
  <script src="script.js"></script>
</body>
</html>`,
      css: `/* Write your CSS styles here */

`,
      js: `// Write your JavaScript code here

`
    };
  };

  const [code, setCode] = useState(initialCode || getDefaultCode());
  const [activeFile, setActiveFile] = useState('html');
  const [showPreview, setShowPreview] = useState(true);
  const [previewSize, setPreviewSize] = useState('desktop'); // desktop, tablet, mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [copied, setCopied] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('html');
  
  // Custom files created by user (in addition to default files)
  const [customFiles, setCustomFiles] = useState([]);
  
  // Preview content for srcdoc (avoids cross-origin issues)
  const [previewContent, setPreviewContent] = useState('');
  
  // Assessment security - track violations
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const isSubmittingRef = useRef(false); // Track submit state for fullscreen handler
  
  const iframeRef = useRef(null);
  const editorRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const newFileInputRef = useRef(null);
  const workspaceContainerRef = useRef(null);

  // Auto fullscreen on mount and prevent exit until submit
  useEffect(() => {
    const enterFullscreen = async () => {
      const elem = workspaceContainerRef.current;
      if (!elem) return;
      
      // Small delay to ensure component is mounted
      setTimeout(async () => {
        if (document.fullscreenElement === null && !isSubmittingRef.current) {
          try {
            await elem.requestFullscreen();
            setIsFullscreen(true);
            
            // Try to lock keyboard to prevent Escape key from exiting fullscreen
            // This is an experimental API that requires HTTPS and user gesture
            if (navigator.keyboard && navigator.keyboard.lock) {
              try {
                await navigator.keyboard.lock(['Escape']);
                console.log('Keyboard Escape key locked');
              } catch (err) {
                console.log('Keyboard lock not available:', err.message);
              }
            }
          } catch (err) {
            // Fullscreen might be blocked, try again on user interaction
            console.log('Fullscreen auto-enter blocked, will retry on interaction');
          }
        }
      }, 500);
    };

    enterFullscreen();

    // Prevent Escape key from exiting fullscreen by capturing it
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        // Note: Violation counting is handled by blockExitKeys useEffect to avoid double counting
        return false;
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

    // Listen for fullscreen changes - re-enter if exited without submitting
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If exited fullscreen but not submitted, count as violation and re-enter IMMEDIATELY
      if (!isCurrentlyFullscreen && !isSubmittingRef.current) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          // Auto-submit after 5 violations
          if (newCount >= 5 && onSubmit) {
            triggerAutoSubmit();
          }
          return newCount;
        });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
        
        // Re-enter fullscreen immediately (reduced delay from 200ms to 100ms)
        setTimeout(() => {
          const elem = workspaceContainerRef.current;
          if (elem && document.fullscreenElement === null && !isSubmittingRef.current) {
            elem.requestFullscreen().catch((err) => {
              console.log('Re-entering fullscreen, attempt 1 failed, retrying...');
              // Retry after 200ms if first attempt fails
              setTimeout(() => {
                if (document.fullscreenElement === null && !isSubmittingRef.current) {
                  elem.requestFullscreen().catch(() => console.log('Fullscreen re-entry failed'));
                }
              }, 200);
            });
          }
        }, 100);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      // Unlock keyboard on cleanup
      if (navigator.keyboard && navigator.keyboard.unlock) {
        navigator.keyboard.unlock();
      }
    };
  }, [onSubmit]);

  // Detect tab switches / visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current) {
        // User switched away from this tab
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

    // Detect window blur (alt+tab, clicking other windows)
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
  }, [onSubmit]);

  // Block keyboard shortcuts that might exit fullscreen or switch tabs
  useEffect(() => {
    const blockExitKeys = (e) => {
      // Block Escape key to prevent fullscreen exit - CRITICAL for assessment security
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Count as violation attempt
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 5 && onSubmit) {
            triggerAutoSubmit();
          }
          return newCount;
        });
        setShowViolationWarning(true);
        setTimeout(() => setShowViolationWarning(false), 3000);
        
        return false;
      }
      // Block Alt+Tab, Alt+F4, Cmd+Tab
      if ((e.altKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Block F11 (fullscreen toggle)
      if (e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Use capture phase and non-passive to ensure we can preventDefault
    document.addEventListener('keydown', blockExitKeys, { capture: true, passive: false });
    document.addEventListener('keyup', blockExitKeys, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('keydown', blockExitKeys, { capture: true });
      document.removeEventListener('keyup', blockExitKeys, { capture: true });
    };
  }, [onSubmit]);

  // Disable copy/paste/cut/drag globally for this workspace
  useEffect(() => {
    const preventCopyPaste = (e) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const preventDragDrop = (e) => {
      e.preventDefault();
      return false;
    };

    const container = workspaceContainerRef.current;
    if (container) {
      container.addEventListener('keydown', preventCopyPaste, true);
      container.addEventListener('contextmenu', preventContextMenu, true);
      container.addEventListener('dragstart', preventDragDrop, true);
      container.addEventListener('drop', preventDragDrop, true);
      container.addEventListener('dragover', preventDragDrop, true);
      container.addEventListener('paste', (e) => { e.preventDefault(); }, true);
      container.addEventListener('copy', (e) => { e.preventDefault(); }, true);
      container.addEventListener('cut', (e) => { e.preventDefault(); }, true);
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', preventCopyPaste, true);
        container.removeEventListener('contextmenu', preventContextMenu, true);
        container.removeEventListener('dragstart', preventDragDrop, true);
        container.removeEventListener('drop', preventDragDrop, true);
        container.removeEventListener('dragover', preventDragDrop, true);
      }
    };
  }, []);

  // Default files configuration based on mode
  const defaultFiles = mode === 'html-css' 
    ? [
        { id: 'html', name: 'index.html', language: 'html', icon: FileCode, isDefault: true },
        { id: 'css', name: 'style.css', language: 'css', icon: Palette, isDefault: true }
      ]
    : [
        { id: 'html', name: 'index.html', language: 'html', icon: FileCode, isDefault: true },
        { id: 'css', name: 'style.css', language: 'css', icon: Palette, isDefault: true },
        { id: 'js', name: 'script.js', language: 'javascript', icon: Braces, isDefault: true }
      ];

  // Combine default and custom files
  const allFiles = [...defaultFiles, ...customFiles];

  // Get file icon based on type
  const getFileIcon = (type) => {
    switch (type) {
      case 'html': return FileCode;
      case 'css': return Palette;
      case 'javascript': 
      case 'js': return Braces;
      default: return FileText;
    }
  };

  // Get language from file extension
  const getLanguageFromExtension = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'html': case 'htm': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      default: return 'plaintext';
    }
  };

  // Auto-submit function triggered after 5 violations
  const triggerAutoSubmit = useCallback(() => {
    if (isSubmittingRef.current || !onSubmit) return;
    
    isSubmittingRef.current = true;
    setIsSubmitted(true);
    
    // Collect all files
    const allFilesData = [
      { name: 'index.html', content: code.html || '' },
      { name: 'style.css', content: code.css || '' },
      ...(mode === 'html-css-js' ? [{ name: 'script.js', content: code.js || '' }] : []),
      ...customFiles.map(file => ({
        name: file.name,
        content: code[file.id] || ''
      }))
    ];
    
    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    // Submit with auto-submit flag
    onSubmit({
      files: allFilesData,
      code,
      customFiles,
      violations: 5,
      autoSubmitted: true
    });
  }, [code, customFiles, mode, onSubmit]);

  // Create a new file
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    let fileName = newFileName.trim();
    
    // Add extension if not provided
    if (!fileName.includes('.')) {
      switch (newFileType) {
        case 'html': fileName += '.html'; break;
        case 'css': fileName += '.css'; break;
        case 'js': fileName += '.js'; break;
        default: fileName += '.txt';
      }
    }
    
    // Check if file already exists
    if (allFiles.some(f => f.name.toLowerCase() === fileName.toLowerCase())) {
      alert('A file with this name already exists!');
      return;
    }
    
    const language = getLanguageFromExtension(fileName);
    const fileId = `custom_${Date.now()}`;
    
    // Default content for new files
    let defaultContent = '';
    switch (language) {
      case 'html':
        defaultContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName.replace('.html', '')}</title>
</head>
<body>
  <!-- Your HTML content here -->
  
</body>
</html>`;
        break;
      case 'css':
        defaultContent = `/* ${fileName} */

`;
        break;
      case 'javascript':
        defaultContent = `// ${fileName}

`;
        break;
    }
    
    // Add the new file
    setCustomFiles(prev => [...prev, {
      id: fileId,
      name: fileName,
      language,
      icon: getFileIcon(language),
      isDefault: false
    }]);
    
    // Add content for the new file
    setCode(prev => ({ ...prev, [fileId]: defaultContent }));
    
    // Switch to the new file
    setActiveFile(fileId);
    
    // Reset modal
    setNewFileName('');
    setShowNewFileModal(false);
  };

  // Delete a custom file
  const handleDeleteFile = (fileId, e) => {
    e.stopPropagation();
    
    const file = customFiles.find(f => f.id === fileId);
    if (!file) return;
    
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      setCustomFiles(prev => prev.filter(f => f.id !== fileId));
      setCode(prev => {
        const newCode = { ...prev };
        delete newCode[fileId];
        return newCode;
      });
      
      // Switch to default file if deleted file was active
      if (activeFile === fileId) {
        setActiveFile('html');
      }
    }
  };

  // Update preview when code changes - INSTANT live preview
  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    // Instant update with minimal debounce for performance
    refreshTimeoutRef.current = setTimeout(() => {
      updatePreview();
    }, 100); // Reduced to 100ms for near-instant updates
    
    // Notify parent of changes
    if (onChange) {
      onChange(code);
    }
  }, [code]);

  const updatePreview = useCallback(() => {
    // Build the complete HTML document
    let htmlContent = code.html || '';
    
    // Collect all CSS from default and custom files
    let allCSS = code.css || '';
    customFiles.forEach(file => {
      if (file.language === 'css' && code[file.id]) {
        allCSS += '\n\n/* ' + file.name + ' */\n' + code[file.id];
      }
    });
    
    // Collect all JS from default and custom files
    let allJS = code.js || '';
    customFiles.forEach(file => {
      if (file.language === 'javascript' && code[file.id]) {
        allJS += '\n\n// ' + file.name + '\n' + code[file.id];
      }
    });
    
    // Inject CSS
    if (allCSS) {
      // Remove existing style.css link and inject inline
      htmlContent = htmlContent.replace(
        /<link\s+rel=["']stylesheet["']\s+href=["']style\.css["']\s*\/?>/gi,
        ''
      );
      htmlContent = htmlContent.replace(
        '</head>',
        `<style>\n${allCSS}\n</style>\n</head>`
      );
    }
    
    // Inject JS for html-css-js mode
    if (mode === 'html-css-js' && allJS) {
      // Remove script src and replace with inline
      htmlContent = htmlContent.replace(
        /<script\s+src=["']script\.js["']\s*><\/script>/gi,
        ''
      );
      htmlContent = htmlContent.replace(
        '</body>',
        `<script>\n${allJS}\n</script>\n</body>`
      );
    }
    
    // Handle custom HTML files - create navigation or include links if needed
    const customHTMLFiles = customFiles.filter(f => f.language === 'html');
    if (customHTMLFiles.length > 0) {
      // Add a console message about other HTML files
      htmlContent = htmlContent.replace(
        '</body>',
        `<script>console.log('Additional HTML pages available: ${customHTMLFiles.map(f => f.name).join(', ')}');</script>\n</body>`
      );
    }
    
    // Use state to set srcdoc (avoids cross-origin security issues)
    setPreviewContent(htmlContent);
  }, [code, mode, customFiles]);

  const handleEditorChange = (value) => {
    if (readOnly) return;
    setCode(prev => ({ ...prev, [activeFile]: value || '' }));
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Define custom theme
    monaco.editor.defineTheme('workspace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'tag', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '9CDCFE' },
        { token: 'attribute.value', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E6EDF3',
        'editor.lineHighlightBackground': '#161B22',
        'editorLineNumber.foreground': '#484F58',
        'editorLineNumber.activeForeground': '#E6EDF3',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#58A6FF',
        'editorIndentGuide.background': '#21262D',
        'editorIndentGuide.activeBackground': '#30363D',
      }
    });
    
    monaco.editor.setTheme('workspace-dark');
    
    // Disable copy/paste/cut keyboard shortcuts in the editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
      console.log('Copy disabled');
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      console.log('Paste disabled');
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
      console.log('Cut disabled');
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV, () => {
      console.log('Paste disabled');
    });
    
    // Disable context menu in editor
    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
    });
    
    // Disable drag and drop in editor
    editor.updateOptions({
      dragAndDrop: false,
      dropIntoEditor: { enabled: false }
    });
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Trigger save
      console.log('Save triggered');
    });
  };

  const getPreviewWidth = () => {
    switch (previewSize) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  const copyCode = async () => {
    const fullCode = `<!-- HTML -->
${code.html}

/* CSS */
${code.css}
${mode === 'html-css-js' ? `
// JavaScript
${code.js}` : ''}`;
    
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadCode = () => {
    // Create a zip file simulation by downloading HTML with embedded CSS/JS
    let htmlContent = code.html;
    htmlContent = htmlContent.replace('</head>', `<style>\n${code.css}\n</style>\n</head>`);
    if (mode === 'html-css-js' && code.js) {
      htmlContent = htmlContent.replace('</body>', `<script>\n${code.js}\n</script>\n</body>`);
    }
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskTitle.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      ref={workspaceContainerRef}
      className={`web-workspace ${isFullscreen ? 'fullscreen' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      {/* Violation Warning Overlay */}
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
      
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-title">
          <Code2 size={20} />
          <span>{mode === 'html-css' ? 'HTML + CSS Workspace' : 'HTML + CSS + JS Workspace'}</span>
          <span className="workspace-badge">{mode === 'html-css' ? 'P1' : 'P2'}</span>
        </div>
        
        <div className="workspace-actions">
          {/* Toggle Question Panel Visibility */}
          {question && (
            <button 
              className={`ws-action-btn question-btn ${showQuestionPanel ? 'active' : ''}`}
              onClick={() => setShowQuestionPanel(!showQuestionPanel)}
              title={showQuestionPanel ? 'Hide Question Panel' : 'Show Question Panel'}
            >
              <BookOpen size={16} />
              <span className="btn-label">{showQuestionPanel ? 'Hide Question' : 'Show Question'}</span>
            </button>
          )}
          
          <div className="action-divider" />
          
          {/* Copy Code */}
          <button 
            className="ws-action-btn"
            onClick={copyCode}
            title="Copy All Code"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          
          {/* Download */}
          <button 
            className="ws-action-btn"
            onClick={downloadCode}
            title="Download Code"
          >
            <Download size={16} />
          </button>
          
          <div className="action-divider" />
          
          {/* Preview Toggle */}
          <button 
            className={`ws-action-btn ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide Preview' : 'Show Preview'}
          >
            {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          {/* Device Size Buttons */}
          {showPreview && (
            <div className="device-buttons">
              <button 
                className={`device-btn ${previewSize === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewSize('mobile')}
                title="Mobile View"
              >
                <Smartphone size={14} />
              </button>
              <button 
                className={`device-btn ${previewSize === 'tablet' ? 'active' : ''}`}
                onClick={() => setPreviewSize('tablet')}
                title="Tablet View"
              >
                <Tablet size={14} />
              </button>
              <button 
                className={`device-btn ${previewSize === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewSize('desktop')}
                title="Desktop View"
              >
                <Monitor size={14} />
              </button>
            </div>
          )}
          
          {/* Tab Switch Violation Counter */}
          {tabSwitchCount > 0 && (
            <div className="violation-counter" title="Tab switch/exit attempts detected">
              <span className="violation-icon">⚠️</span>
              <span className="violation-count">{tabSwitchCount}</span>
            </div>
          )}
          
          {/* Submit Button */}
          {onSubmit && (
            <>
              <div className="action-divider" />
              <button 
                className="ws-submit-btn"
                onClick={() => {
                  // Mark as submitting to allow fullscreen exit
                  isSubmittingRef.current = true;
                  setIsSubmitted(true);
                  
                  // Collect all files
                  const allFilesData = [
                    { name: 'index.html', content: code.html || '' },
                    { name: 'style.css', content: code.css || '' },
                    ...(mode === 'html-css-js' ? [{ name: 'script.js', content: code.js || '' }] : []),
                    ...customFiles.map(file => ({
                      name: file.name,
                      content: code[file.id] || ''
                    }))
                  ];
                  
                  // Exit fullscreen first
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(console.error);
                  }
                  
                  // Call submit with all data including violation count
                  onSubmit({
                    files: allFilesData,
                    code,
                    customFiles,
                    violations: tabSwitchCount
                  });
                }}
                disabled={isSubmitting}
                title="Submit Code"
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

      {/* Main Workspace Area */}
      <div className="workspace-body">
        {/* Question Panel - Left Side */}
        {showQuestionPanel && question && (
          <div className="question-side-panel">
            <div className="question-panel-header">
              <div className="panel-title-row">
                <BookOpen size={18} />
                <h3>Task Instructions</h3>
              </div>
              <button 
                className="panel-close-btn"
                onClick={() => setShowQuestionPanel(false)}
                title="Hide Question Panel"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="question-panel-content">
              {/* Question Title */}
              <div className="question-section">
                <h4 className="section-label">
                  <ClipboardList size={16} />
                  Question
                </h4>
                <p className="question-title">{question.question_text || 'No title'}</p>
              </div>
              
              {/* Task Instructions */}
              {question.description && (
                <div className="question-section">
                  <h4 className="section-label">
                    <FileText size={16} />
                    Instructions
                  </h4>
                  <div className="instructions-content">
                    {question.description}
                  </div>
                </div>
              )}
              
              {/* Checklist / Evaluation Points */}
              {question.coding_test_cases && question.coding_test_cases.length > 0 && (
                <div className="question-section">
                  <h4 className="section-label">
                    <CheckCircle size={16} />
                    Evaluation Checklist
                  </h4>
                  <ul className="checklist">
                    {question.coding_test_cases.map((item, idx) => (
                      <li key={idx} className="checklist-item">
                        <span className="check-number">{idx + 1}</span>
                        <span className="check-text">{typeof item === 'string' ? item : item.description || item.name || JSON.stringify(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Sample Output Image */}
              {question.sample_image_url && (
                <div className="question-section">
                  <h4 className="section-label">
                    <Image size={16} />
                    Expected Output
                  </h4>
                  <div className="sample-image-container">
                    <img 
                      src={`${apiUrl}${question.sample_image_url}`}
                      alt="Expected Output"
                      className="sample-image"
                      onClick={() => setShowSampleImage(true)}
                    />
                    <span 
                      className="image-hint" 
                      onClick={() => setShowSampleImage(true)}
                    >
                      Click to enlarge
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Editor + Preview Area */}
        <div className="editor-preview-area">
            {/* Editor Panel */}
            <div 
              className="editor-panel"
              style={{ width: showPreview ? `${splitRatio}%` : '100%' }}
            >
          {/* File Tabs */}
          <div className="file-tabs">
            <div className="file-tabs-scroll">
              {allFiles.map(file => {
                const IconComponent = file.icon;
                return (
                  <button
                    key={file.id}
                    className={`file-tab ${activeFile === file.id ? 'active' : ''}`}
                    onClick={() => setActiveFile(file.id)}
                    disabled={readOnly}
                  >
                    <IconComponent size={14} />
                    <span>{file.name}</span>
                    {!file.isDefault && (
                      <span 
                        className="file-tab-close" 
                        onClick={(e) => handleDeleteFile(file.id, e)}
                        title="Delete file"
                      >
                        <X size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Add File Button */}
            {!readOnly && (
              <button 
                className="add-file-btn"
                onClick={() => setShowNewFileModal(true)}
                title="Create new file"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {/* Monaco Editor */}
          <div className="editor-container">
            <Editor
              height="100%"
              width="100%"
              language={allFiles.find(f => f.id === activeFile)?.language || 'html'}
              value={code[activeFile] || ''}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="workspace-dark"
              loading={
                <div className="editor-loading">
                  <div className="loading-spinner" />
                  <span>Loading Editor...</span>
                </div>
              }
              options={{
                minimap: { enabled: true, scale: 1, size: 'fit' },
                fontSize: 14,
                fontWeight: '400',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                readOnly: readOnly,
                domReadOnly: readOnly,
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
                fontLigatures: true,
                lineHeight: 24,
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                mouseWheelZoom: true,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                suggest: { enabled: true, showWords: true, showSnippets: true },
                quickSuggestions: { other: true, comments: false, strings: true },
                acceptSuggestionOnEnter: 'on',
                snippetSuggestions: 'top',
                renderLineHighlight: 'all',
                roundedSelection: true,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                },
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          </div>
        </div>

        {/* Resize Handle */}
        {showPreview && (
          <div 
            className="resize-handle"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startRatio = splitRatio;
              
              const handleMouseMove = (moveEvent) => {
                const delta = moveEvent.clientX - startX;
                const containerWidth = e.target.parentElement.offsetWidth;
                const newRatio = startRatio + (delta / containerWidth) * 100;
                setSplitRatio(Math.max(30, Math.min(70, newRatio)));
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="resize-indicator" />
          </div>
        )}

        {/* Preview Panel */}
        {showPreview && (
          <div 
            className="preview-panel"
            style={{ width: `${100 - splitRatio}%` }}
          >
            <div className="preview-header">
              <div className="preview-title">
                <Eye size={14} />
                <span>Live Preview</span>
              </div>
              <div className="preview-url">
                <span className="url-protocol">https://</span>
                <span className="url-domain">localhost:preview</span>
              </div>
            </div>
            
            <div className="preview-container">
              <div 
                className="preview-frame-wrapper"
                style={{ maxWidth: getPreviewWidth() }}
              >
                <iframe
                  ref={iframeRef}
                  className="preview-frame"
                  title="Live Preview"
                  sandbox="allow-scripts allow-modals allow-forms allow-popups"
                  srcDoc={previewContent}
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Sample Image Modal - Fullscreen View */}
      {showSampleImage && question?.sample_image_url && (
        <div className="sample-image-modal" onClick={() => setShowSampleImage(false)}>
          <button className="modal-close-btn" onClick={() => setShowSampleImage(false)}>
            <X size={24} />
          </button>
          <img 
            src={`${apiUrl}${question.sample_image_url}`}
            alt="Expected Output - Full Size"
            className="sample-image-full"
          />
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="new-file-modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="new-file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FolderPlus size={20} /> Create New File</h3>
              <button className="modal-close" onClick={() => setShowNewFileModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>File Type</label>
                <div className="file-type-selector">
                  <button 
                    className={`type-btn ${newFileType === 'html' ? 'active' : ''}`}
                    onClick={() => setNewFileType('html')}
                  >
                    <FileCode size={20} />
                    <span>HTML</span>
                  </button>
                  <button 
                    className={`type-btn ${newFileType === 'css' ? 'active' : ''}`}
                    onClick={() => setNewFileType('css')}
                  >
                    <Palette size={20} />
                    <span>CSS</span>
                  </button>
                  {mode === 'html-css-js' && (
                    <button 
                      className={`type-btn ${newFileType === 'js' ? 'active' : ''}`}
                      onClick={() => setNewFileType('js')}
                    >
                      <Braces size={20} />
                      <span>JavaScript</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="form-group">
                <label>File Name</label>
                <input
                  ref={newFileInputRef}
                  type="text"
                  className="file-name-input"
                  placeholder={`Enter file name (e.g., page.${newFileType === 'js' ? 'js' : newFileType})`}
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') setShowNewFileModal(false);
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowNewFileModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-create" 
                onClick={handleCreateFile}
                disabled={!newFileName.trim()}
              >
                <Plus size={16} />
                Create File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}