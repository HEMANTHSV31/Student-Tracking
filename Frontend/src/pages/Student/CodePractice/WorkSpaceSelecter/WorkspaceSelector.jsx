import { useState } from 'react';
import { 
  Code2, Palette, Braces, ArrowRight, Check,
  FileCode, Eye, Smartphone, ClipboardList
} from 'lucide-react';
import './WorkspaceSelector.css';

/**
 * WorkspaceSelector - Component to select workspace type for P Skills
 * P1: HTML + CSS
 * P2: HTML + CSS + JS
 */
export default function WorkspaceSelector({ onSelect, selectedMode = null }) {
  const [hoveredMode, setHoveredMode] = useState(null);

  const workspaceTypes = [
    {
      id: 'html-css',
      title: 'HTML + CSS',
      badge: 'P1',
      subtitle: 'Static Web Pages',
      description: 'Learn the fundamentals of web development by building static pages with HTML structure and CSS styling.',
      features: [
        'Semantic HTML5',
        'CSS Flexbox & Grid',
        'Responsive layouts',
        'Animations'
      ],
      icon: Palette,
      color: '#ec4899',
      bgColor: '#fdf2f8'
    },
    {
      id: 'html-css-js',
      title: 'HTML + CSS + JS',
      badge: 'P2',
      subtitle: 'Interactive Apps',
      description: 'Build dynamic web applications with JavaScript. Handle events, manipulate DOM, and create interactive features.',
      features: [
        'Everything in P1',
        'DOM manipulation',
        'Event handling',
        'ES6+ features'
      ],
      icon: Braces,
      color: '#6366f1',
      bgColor: '#eef2ff'
    },
    {
      id: 'mcq',
      title: 'MCQ Practice',
      badge: 'MCQ',
      subtitle: 'Multiple Choice Questions',
      description: 'Practice with multiple choice questions to test your web development knowledge and concepts.',
      features: [
        'Timed assessments',
        'Instant feedback',
        'Question navigation',
        'Flag for review'
      ],
      icon: ClipboardList,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    }
  ];

  const handleSelect = (modeId) => {
    if (onSelect) {
      onSelect(modeId);
    }
  };

  return (
    <div className="ws-selector">
      {/* Header */}
      <div className="ws-header">
        <h1>Select Workspace</h1>
        <p>Choose the environment for your practice session</p>
      </div>

      {/* Cards */}
      <div className="ws-cards">
        {workspaceTypes.map((workspace) => {
          const IconComponent = workspace.icon;
          const isSelected = selectedMode === workspace.id;
          
          return (
            <div
              key={workspace.id}
              className={`ws-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(workspace.id)}
              onMouseEnter={() => setHoveredMode(workspace.id)}
              onMouseLeave={() => setHoveredMode(null)}
              style={{ '--card-color': workspace.color }}
            >
              {/* Badge */}
              <span className="ws-badge" style={{ backgroundColor: workspace.bgColor, color: workspace.color }}>
                {workspace.badge}
              </span>

              {/* Icon */}
              <div className="ws-icon" style={{ backgroundColor: workspace.bgColor }}>
                <IconComponent size={24} color={workspace.color} />
              </div>

              {/* Content */}
              <h3 className="ws-title">{workspace.title}</h3>
              <span className="ws-subtitle">{workspace.subtitle}</span>
              <p className="ws-description">{workspace.description}</p>

              {/* Features */}
              <ul className="ws-features">
                {workspace.features.map((feature, idx) => (
                  <li key={idx}>
                    <Check size={14} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button className="ws-btn" style={{ backgroundColor: workspace.color }}>
                Open Workspace
                <ArrowRight size={16} />
              </button>

              {/* Selected indicator */}
              {isSelected && <div className="ws-selected-mark"><Check size={16} /></div>}
            </div>
          );
        })}
      </div>

      {/* Info bar */}
      <div className="ws-info">
        <div className="ws-info-item">
          <FileCode size={16} />
          <span>Monaco Editor</span>
        </div>
        <div className="ws-info-item">
          <Eye size={16} />
          <span>Live Preview</span>
        </div>
        <div className="ws-info-item">
          <Smartphone size={16} />
          <span>Device Testing</span>
        </div>
      </div>
    </div>
  );
}