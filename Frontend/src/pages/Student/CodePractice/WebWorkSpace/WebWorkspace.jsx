import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Smartphone, Tablet, Maximize2, Minimize2, 
  Code, Eye, Columns, RotateCcw, Download, Upload 
} from 'lucide-react';
import './WebWorkspace.css';

/**
 * WebWorkspace - Interactive code editor with live preview
 * Supports HTML+CSS and HTML+CSS+JS modes
 */
export default function WebWorkspace({ 
  mode = 'html-css', 
  initialCode = null, 
  onChange, 
  readOnly = false,
  taskTitle = 'Practice'
}) {
  // State
  const [html, setHtml] = useState(initialCode?.html || '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Workspace</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>');
  const [css, setCss] = useState(initialCode?.css || 'body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}\n\nh1 {\n  color: #333;\n}');
  const [js, setJs] = useState(initialCode?.js || '// Your JavaScript code here\nconsole.log("Ready!");');
  
  const [activeTab, setActiveTab] = useState('html');
  const [viewMode, setViewMode] = useState('split'); // 'code', 'preview', 'split'
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop', 'tablet', 'mobile'
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const iframeRef = useRef(null);

  // Sync with initialCode changes
  useEffect(() => {
    if (initialCode) {
      if (initialCode.html !== undefined) setHtml(initialCode.html);
      if (initialCode.css !== undefined) setCss(initialCode.css);
      if (initialCode.js !== undefined) setJs(initialCode.js);
    }
  }, [initialCode]);

  // Notify parent of code changes
  useEffect(() => {
    if (onChange) {
      onChange({ html, css, js });
    }
  }, [html, css, js]);

  // Update preview
  useEffect(() => {
    updatePreview();
  }, [html, css, js, mode]);

  const updatePreview = () => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const document = iframe.contentDocument || iframe.contentWindow.document;
    
    let content = html;
    
    // Inject CSS
    if (css) {
      const styleTag = `<style>${css}</style>`;
      if (content.includes('</head>')) {
        content = content.replace('</head>', `${styleTag}\n</head>`);
      } else if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>\n${styleTag}`);
      } else {
        content = styleTag + content;
      }
    }
    
    // Inject JS (only if mode includes JS)
    if (mode === 'html-css-js' && js) {
      const scriptTag = `<script>${js}</script>`;
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        content = content + scriptTag;
      }
    }

    document.open();
    document.write(content);
    document.close();
  };

  const handleReset = () => {
    if (confirm('Reset all code to default? This cannot be undone.')) {
      setHtml('<!DOCTYPE html>\n<html>\n<head>\n  <title>My Workspace</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>');
      setCss('body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n}');
      setJs('// Your JavaScript code here\nconsole.log("Ready!");');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([
      `<!-- HTML -->\n${html}\n\n`,
      `<!-- CSS -->\n<style>\n${css}\n</style>\n\n`,
      mode === 'html-css-js' ? `<!-- JavaScript -->\n<script>\n${js}\n</script>` : ''
    ], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${taskTitle.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDeviceClass = () => {
    switch (deviceMode) {
      case 'mobile': return 'device-mobile';
      case 'tablet': return 'device-tablet';
      default: return 'device-desktop';
    }
  };

  const getCurrentCode = () => {
    switch (activeTab) {
      case 'html': return html;
      case 'css': return css;
      case 'js': return js;
      default: return '';
    }
  };

  const setCurrentCode = (value) => {
    if (readOnly) return;
    
    switch (activeTab) {
      case 'html':
        setHtml(value);
        break;
      case 'css':
        setCss(value);
        break;
      case 'js':
        setJs(value);
        break;
    }
  };

  return (
    <div className={`web-workspace ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Header */}
      <div className="workspace-header">
        <div className="workspace-title">
          <Code size={16} />
          <span>{taskTitle}</span>
          <span className="workspace-badge">{mode}</span>
        </div>
        
        <div className="workspace-actions">
          {/* View Mode */}
          <button
            className={`ws-action-btn ${viewMode === 'code' ? 'active' : ''}`}
            onClick={() => setViewMode('code')}
            title="Code Only"
          >
            <Code size={16} />
          </button>
          <button
            className={`ws-action-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Split View"
          >
            <Columns size={16} />
          </button>
          <button
            className={`ws-action-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => setViewMode('preview')}
            title="Preview Only"
          >
            <Eye size={16} />
          </button>

          <div className="action-divider" />

          {/* Device Mode */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="device-buttons">
              <button
                className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
                onClick={() => setDeviceMode('desktop')}
                title="Desktop View"
              >
                <Monitor size={14} />
              </button>
              <button
                className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
                onClick={() => setDeviceMode('tablet')}
                title="Tablet View"
              >
                <Tablet size={14} />
              </button>
              <button
                className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
                onClick={() => setDeviceMode('mobile')}
                title="Mobile View"
              >
                <Smartphone size={14} />
              </button>
            </div>
          )}

          <div className="action-divider" />

          {/* Actions */}
          {!readOnly && (
            <button
              className="ws-action-btn"
              onClick={handleReset}
              title="Reset Code"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            className="ws-action-btn"
            onClick={handleDownload}
            title="Download Code"
          >
            <Download size={16} />
          </button>
          <button
            className="ws-action-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="workspace-content">
        {/* Code Editor */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="code-panel">
            {/* Tabs */}
            <div className="code-tabs">
              <button
                className={`code-tab ${activeTab === 'html' ? 'active' : ''}`}
                onClick={() => setActiveTab('html')}
              >
                <span className="tab-icon" style={{ background: '#E44D26' }}>H</span>
                HTML
              </button>
              <button
                className={`code-tab ${activeTab === 'css' ? 'active' : ''}`}
                onClick={() => setActiveTab('css')}
              >
                <span className="tab-icon" style={{ background: '#1572B6' }}>C</span>
                CSS
              </button>
              {mode === 'html-css-js' && (
                <button
                  className={`code-tab ${activeTab === 'js' ? 'active' : ''}`}
                  onClick={() => setActiveTab('js')}
                >
                  <span className="tab-icon" style={{ background: '#F7DF1E' }}>J</span>
                  JavaScript
                </button>
              )}
            </div>

            {/* Editor */}
            <div className="code-editor">
              <textarea
                className="code-textarea"
                value={getCurrentCode()}
                onChange={(e) => setCurrentCode(e.target.value)}
                readOnly={readOnly}
                spellCheck={false}
                placeholder={`Enter your ${activeTab.toUpperCase()} code here...`}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="preview-panel">
            <div className="preview-header">
              <Eye size={14} />
              <span>Live Preview</span>
              <span className="preview-device-label">{deviceMode}</span>
            </div>
            <div className={`preview-container ${getDeviceClass()}`}>
              <iframe
                ref={iframeRef}
                className="preview-iframe"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
