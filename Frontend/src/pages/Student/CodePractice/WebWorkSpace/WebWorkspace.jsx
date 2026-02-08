import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, Eye, EyeOff, Maximize2, Minimize2, RefreshCw,
  Layout, Code2, FileCode, FileType, Palette, Braces,
  SplitSquareHorizontal, Monitor, Smartphone, Tablet,
  ChevronLeft, ChevronRight, Settings, Download, Copy, Check,
  Plus, X, FolderPlus, File, FileText, Trash2
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
  onRun
}) {
  // Default code templates based on mode
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
  <!-- Write your HTML here -->
  <div class="container">
    <header class="header">
      <h1>Welcome to My Page</h1>
      <nav class="nav">
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
    
    <main class="main-content">
      <section class="hero">
        <h2>Build Amazing Websites</h2>
        <p>Learn HTML & CSS to create beautiful web pages.</p>
        <button class="btn">Get Started</button>
      </section>
    </main>
    
    <footer class="footer">
      <p>&copy; 2026 My Website. All rights reserved.</p>
    </footer>
  </div>
</body>
</html>`,
        css: `/* CSS Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 30px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header h1 {
  color: #667eea;
  font-size: 1.5rem;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a {
  text-decoration: none;
  color: #555;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav a:hover {
  color: #667eea;
}

.hero {
  background: white;
  padding: 60px 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.hero h2 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 20px;
}

.hero p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
}

.btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 1rem;
  border-radius: 30px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
}

.footer {
  text-align: center;
  padding: 30px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 30px;
}`,
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
  <!-- Interactive Web Application -->
  <div class="app-container">
    <header class="app-header">
      <h1>Interactive App</h1>
      <div class="theme-toggle">
        <button id="themeBtn" class="icon-btn" title="Toggle Theme">🌙</button>
      </div>
    </header>
    
    <main class="app-main">
      <!-- Counter Section -->
      <section class="card counter-section">
        <h2>Counter</h2>
        <div class="counter-display">
          <span id="counterValue">0</span>
        </div>
        <div class="counter-controls">
          <button id="decrementBtn" class="btn btn-danger">-</button>
          <button id="resetBtn" class="btn btn-secondary">Reset</button>
          <button id="incrementBtn" class="btn btn-success">+</button>
        </div>
      </section>
      
      <!-- Todo Section -->
      <section class="card todo-section">
        <h2>Quick Todo</h2>
        <div class="todo-input-group">
          <input type="text" id="todoInput" placeholder="Add a new task..." />
          <button id="addTodoBtn" class="btn btn-primary">Add</button>
        </div>
        <ul id="todoList" class="todo-list"></ul>
      </section>
    </main>
    
    <footer class="app-footer">
      <p>Built with HTML, CSS & JavaScript</p>
    </footer>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
      css: `/* Modern App Styles */
:root {
  --primary: #667eea;
  --primary-dark: #5a67d8;
  --success: #48bb78;
  --danger: #f56565;
  --secondary: #718096;
  --bg-light: #f7fafc;
  --bg-dark: #1a202c;
  --text-light: #2d3748;
  --text-dark: #e2e8f0;
  --card-light: #ffffff;
  --card-dark: #2d3748;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  background: var(--bg-light);
  color: var(--text-light);
  min-height: 100vh;
  transition: all 0.3s ease;
}

body.dark-theme {
  background: var(--bg-dark);
  color: var(--text-dark);
}

.app-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--card-light);
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

body.dark-theme .app-header {
  background: var(--card-dark);
}

.app-header h1 {
  font-size: 1.5rem;
  background: linear-gradient(135deg, var(--primary), #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.icon-btn {
  background: none;
  border: 2px solid var(--secondary);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-btn:hover {
  border-color: var(--primary);
  transform: scale(1.1);
}

.card {
  background: var(--card-light);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

body.dark-theme .card {
  background: var(--card-dark);
}

.card h2 {
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: var(--primary);
}

/* Counter Styles */
.counter-display {
  font-size: 4rem;
  font-weight: 700;
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, var(--primary), #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.counter-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

/* Buttons */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-secondary {
  background: var(--secondary);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Todo Styles */
.todo-input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.todo-input-group input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

body.dark-theme .todo-input-group input {
  background: var(--bg-dark);
  border-color: var(--secondary);
  color: var(--text-dark);
}

.todo-input-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.todo-list {
  list-style: none;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-light);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

body.dark-theme .todo-item {
  background: var(--bg-dark);
}

.todo-item.completed span {
  text-decoration: line-through;
  opacity: 0.6;
}

.todo-item button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.todo-item button:hover {
  opacity: 1;
}

.app-footer {
  text-align: center;
  padding: 20px;
  color: var(--secondary);
  font-size: 0.9rem;
}`,
      js: `// Interactive JavaScript Application

// DOM Elements
const themeBtn = document.getElementById('themeBtn');
const counterValue = document.getElementById('counterValue');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');
const resetBtn = document.getElementById('resetBtn');
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');

// State
let count = 0;
let todos = [];
let isDarkTheme = false;

// Theme Toggle
themeBtn.addEventListener('click', () => {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('dark-theme');
  themeBtn.textContent = isDarkTheme ? '☀️' : '🌙';
});

// Counter Functions
function updateCounter() {
  counterValue.textContent = count;
  counterValue.style.transform = 'scale(1.2)';
  setTimeout(() => {
    counterValue.style.transform = 'scale(1)';
  }, 150);
}

incrementBtn.addEventListener('click', () => {
  count++;
  updateCounter();
});

decrementBtn.addEventListener('click', () => {
  count--;
  updateCounter();
});

resetBtn.addEventListener('click', () => {
  count = 0;
  updateCounter();
});

// Todo Functions
function renderTodos() {
  todoList.innerHTML = '';
  todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.className = \`todo-item \${todo.completed ? 'completed' : ''}\`;
    li.innerHTML = \`
      <span onclick="toggleTodo(\${index})">\${todo.text}</span>
      <button onclick="deleteTodo(\${index})">🗑️</button>
    \`;
    todoList.appendChild(li);
  });
}

function addTodo() {
  const text = todoInput.value.trim();
  if (text) {
    todos.push({ text, completed: false });
    todoInput.value = '';
    renderTodos();
  }
}

window.toggleTodo = function(index) {
  todos[index].completed = !todos[index].completed;
  renderTodos();
};

window.deleteTodo = function(index) {
  todos.splice(index, 1);
  renderTodos();
};

addTodoBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTodo();
  }
});

// Initialize
console.log('🚀 Application initialized!');
console.log('Features: Theme Toggle, Counter, Todo List');`
    };
  };

  const [code, setCode] = useState(initialCode || getDefaultCode());
  const [activeFile, setActiveFile] = useState('html');
  const [showPreview, setShowPreview] = useState(true);
  const [previewSize, setPreviewSize] = useState('desktop'); // desktop, tablet, mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('html');
  
  // Custom files created by user (in addition to default files)
  const [customFiles, setCustomFiles] = useState([]);
  
  const iframeRef = useRef(null);
  const editorRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const newFileInputRef = useRef(null);

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
    if (autoRefresh) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // Instant update with minimal debounce for performance
      refreshTimeoutRef.current = setTimeout(() => {
        updatePreview();
      }, 100); // Reduced to 100ms for near-instant updates
    }
    
    // Notify parent of changes
    if (onChange) {
      onChange(code);
    }
  }, [code, autoRefresh]);

  const updatePreview = useCallback(() => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    
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
    
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }, [code, mode, customFiles]);

  const handleManualRefresh = () => {
    updatePreview();
  };

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
    <div className={`web-workspace ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-title">
          <Code2 size={20} />
          <span>{mode === 'html-css' ? 'HTML + CSS Workspace' : 'HTML + CSS + JS Workspace'}</span>
          <span className="workspace-badge">{mode === 'html-css' ? 'P1' : 'P2'}</span>
        </div>
        
        <div className="workspace-actions">
          {/* Auto Refresh Toggle */}
          <button 
            className={`ws-action-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <RefreshCw size={16} />
          </button>
          
          {/* Manual Refresh */}
          <button 
            className="ws-action-btn"
            onClick={handleManualRefresh}
            title="Refresh Preview"
          >
            <Play size={16} />
          </button>
          
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
          
          {/* Fullscreen Toggle */}
          <button 
            className="ws-action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="workspace-body">
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
                  sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
                />
              </div>
            </div>
          </div>
        )}
      </div>

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