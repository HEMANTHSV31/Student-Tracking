import { useState } from 'react';
import { 
  Code2, FileCode, Palette, Braces, 
  ArrowRight, Sparkles, Layers, Monitor,
  Zap, Layout, Globe, CheckCircle2, Play
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
      skillLevel: 'P1',
      skillName: 'Basic Web Design',
      description: 'Build beautiful static web pages with HTML structure and CSS styling. Master the fundamentals of web design.',
      features: [
        'Semantic HTML5 structure',
        'Modern CSS3 styling',
        'Flexbox & Grid layouts',
        'Responsive design'
      ],
      icon: Palette,
      iconBg: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      cardGradient: 'linear-gradient(135deg, rgba(255, 107, 107, 0.08) 0%, rgba(255, 142, 83, 0.08) 100%)',
      accentColor: '#FF6B6B',
      languages: [
        { name: 'HTML', color: '#E34C26', bg: '#FEE2E2' },
        { name: 'CSS', color: '#264DE4', bg: '#DBEAFE' }
      ],
      difficulty: 'Beginner',
      difficultyColor: '#10B981'
    },
    {
      id: 'html-css-js',
      title: 'HTML + CSS + JavaScript',
      skillLevel: 'P2',
      skillName: 'Interactive Development',
      description: 'Create dynamic, interactive web applications. Handle events, manipulate the DOM, and bring your pages to life.',
      features: [
        'Everything in P1',
        'DOM manipulation',
        'Event handling',
        'ES6+ JavaScript'
      ],
      icon: Braces,
      iconBg: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      cardGradient: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
      accentColor: '#667EEA',
      languages: [
        { name: 'HTML', color: '#E34C26', bg: '#FEE2E2' },
        { name: 'CSS', color: '#264DE4', bg: '#DBEAFE' },
        { name: 'JS', color: '#F7DF1E', bg: '#FEF3C7' }
      ],
      difficulty: 'Intermediate',
      difficultyColor: '#F59E0B'
    }
  ];

  const handleSelect = (modeId) => {
    if (onSelect) {
      onSelect(modeId);
    }
  };

  return (
    <div className="workspace-selector">
      {/* Animated Background */}
      <div className="selector-bg">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="selector-content">
        {/* Header Section */}
        <div className="selector-header">
          <div className="header-badge">
            <Zap size={14} />
            <span>P Skills Workspace</span>
          </div>
          <h1 className="selector-title">
            Choose Your <span className="title-highlight">Workspace</span>
          </h1>
          <p className="selector-subtitle">
            Select the environment that matches your learning goals
          </p>
        </div>

        {/* Workspace Cards */}
        <div className="workspace-grid">
          {workspaceTypes.map((workspace, index) => {
            const IconComponent = workspace.icon;
            const isSelected = selectedMode === workspace.id;
            const isHovered = hoveredMode === workspace.id;
            
            return (
              <div
                key={workspace.id}
                className={`workspace-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                onClick={() => handleSelect(workspace.id)}
                onMouseEnter={() => setHoveredMode(workspace.id)}
                onMouseLeave={() => setHoveredMode(null)}
                style={{ 
                  '--accent-color': workspace.accentColor,
                  '--card-gradient': workspace.cardGradient,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Glow Effect */}
                <div className="card-glow"></div>
                
                {/* Card Content */}
                <div className="card-inner">
                  {/* Top Section */}
                  <div className="card-top">
                    <div 
                      className="card-icon"
                      style={{ background: workspace.iconBg }}
                    >
                      <IconComponent size={26} color="white" strokeWidth={2.5} />
                    </div>
                    
                    <div className="card-meta">
                      <span className="skill-level">{workspace.skillLevel}</span>
                      <span className="skill-name">{workspace.skillName}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="card-title">{workspace.title}</h3>
                  
                  {/* Language Tags */}
                  <div className="language-tags">
                    {workspace.languages.map((lang, idx) => (
                      <span 
                        key={lang.name} 
                        className="lang-tag"
                        style={{ 
                          backgroundColor: lang.bg,
                          color: lang.color 
                        }}
                      >
                        {lang.name}
                      </span>
                    ))}
                    <span 
                      className="difficulty-tag"
                      style={{ color: workspace.difficultyColor }}
                    >
                      {workspace.difficulty}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="card-description">{workspace.description}</p>

                  {/* Features */}
                  <div className="features-grid">
                    {workspace.features.map((feature, idx) => (
                      <div key={idx} className="feature-item">
                        <CheckCircle2 size={14} className="feature-check" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button 
                    className="launch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(workspace.id);
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Launch Workspace</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </button>
                </div>

                {/* Selection Ring */}
                {isSelected && <div className="selection-ring"></div>}
              </div>
            );
          })}
        </div>

        {/* Features Bar */}
        <div className="features-bar">
          <div className="feature-pill">
            <Code2 size={16} />
            <span>Monaco Editor</span>
          </div>
          <div className="feature-pill">
            <Globe size={16} />
            <span>Live Preview</span>
          </div>
          <div className="feature-pill">
            <Layout size={16} />
            <span>Responsive Testing</span>
          </div>
          <div className="feature-pill">
            <Sparkles size={16} />
            <span>IntelliSense</span>
          </div>
        </div>
      </div>
    </div>
  );
}
