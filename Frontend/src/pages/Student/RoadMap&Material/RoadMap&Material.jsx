import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  Code,
  ExternalLink,
  MessageCircle,
  CheckSquare,
  ChevronRight,
  BookOpen,
  Video,
  Download
} from "lucide-react";
import useAuthStore from "../../../store/useAuthStore";
import { apiGet } from '../../../utils/api';

const StudentRoadmap = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuthStore();
  const [roadmapData, setRoadmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('frontend');
  const [venueName, setVenueName] = useState('');
  const [unlockSummary, setUnlockSummary] = useState(null);
  const [availableCourseTypes, setAvailableCourseTypes] = useState(['frontend']); // Dynamic course types

  const FRONTEND_SEQUENCE = [
    {
      key: 'html_css',
      label: 'HTML/CSS',
      combined: [['html', 'css']],
      groups: [['html'], ['css']],
    },
    {
      key: 'git_github',
      label: 'Git/GitHub',
      combined: [['git', 'github']],
      groups: [['git'], ['github']],
    },
    {
      key: 'javascript',
      label: 'JavaScript',
      combined: [['javascript']],
      groups: [['javascript', 'js']],
    },
    {
      key: 'react',
      label: 'React',
      combined: [['react']],
      groups: [['react']],
    },
    {
      key: 'node',
      label: 'Node.js',
      combined: [['node', 'nodejs'], ['node.js']],
      groups: [['node', 'nodejs', 'node.js', 'node js']],
    },
  ];

  const normalizeText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[\s/_-]+/g, ' ')
      .trim();

  const textIncludesAll = (text, tokens) => tokens.every((t) => text.includes(t));

  const isRoadmapSkill = (courseName) => {
    const name = normalizeText(courseName);
    if (!name) return false;

    // Only consider the technical roadmap track; ignore aptitude/mechanical/etc.
    // Use token-ish matching to avoid accidental substring matches.
    return (
      name.includes('html') ||
      name.includes('css') ||
      name.includes('git') ||
      name.includes('github') ||
      name.includes('javascript') ||
      name.includes(' js') ||
      name.includes('react') ||
      name.includes('node')
    );
  };

  const isStepCleared = (step, clearedSkills) => {
    if (!clearedSkills || clearedSkills.length === 0) return false;

    // If any course name contains all tokens of a combined set
    if (step.combined && step.combined.length > 0) {
      const combinedHit = clearedSkills.some((s) => {
        const courseName = normalizeText(s.course_name);
        return step.combined.some((tokenSet) => textIncludesAll(courseName, tokenSet));
      });
      if (combinedHit) return true;
    }

    // Otherwise require each group to be satisfied by at least one cleared skill
    return (step.groups || []).every((groupVariants) =>
      clearedSkills.some((s) => {
        const courseName = normalizeText(s.course_name);
        return groupVariants.some((variant) => courseName.includes(variant));
      })
    );
  };

  const getFrontendStepIndexForModule = (moduleTitle) => {
    const title = normalizeText(moduleTitle);
    if (!title) return -1;

    if (title.includes('html') || title.includes('css')) return 0;
    if (title.includes('git') || title.includes('github')) return 1;
    if (title.includes('javascript') || title.includes(' js ')) return 2;
    if (title.includes('react')) return 3;
    if (title.includes('node')) return 4;
    return -1;
  };

  const applyFrontendUnlocking = (modules, skills) => {
    const clearedSkills = (skills || [])
      .filter((s) => s.status === 'Cleared')
      .filter((s) => isRoadmapSkill(s.course_name));
    const stepCleared = FRONTEND_SEQUENCE.map((step) => isStepCleared(step, clearedSkills));

    // maxUnlockedStepIndex: 0 = only HTML/CSS is unlocked, 1 = Git/GitHub unlocked, etc.
    let maxUnlockedStepIndex = 0;
    for (let i = 0; i < stepCleared.length; i += 1) {
      if (stepCleared[i]) maxUnlockedStepIndex = i + 1;
      else break;
    }
    if (maxUnlockedStepIndex > FRONTEND_SEQUENCE.length - 1) {
      maxUnlockedStepIndex = FRONTEND_SEQUENCE.length - 1;
    }

    const updated = modules.map((m) => {
      const stepIndex = getFrontendStepIndexForModule(m.title);
      const isUnknown = stepIndex === -1;
      const isLocked = !isUnknown && stepIndex > maxUnlockedStepIndex;
      const isCompleted = !isUnknown && Boolean(stepCleared[stepIndex]);
      const lockedReason =
        isLocked && stepIndex > 0
          ? `Complete ${FRONTEND_SEQUENCE[stepIndex - 1].label} to unlock`
          : '';

      return {
        ...m,
        is_completed: isCompleted,
        is_locked: isLocked,
        locked_reason: lockedReason,
        progress: isCompleted ? 100 : isLocked ? 0 : 0,
      };
    });

    // Choose first unlocked and not completed as "current"
    const firstActive = updated.find((m) => !m.is_locked && !m.is_completed) || updated.find((m) => !m.is_locked) || updated[0];
    const selectedId = firstActive?.roadmap_id ?? null;

    setUnlockSummary({
      course: 'frontend',
      maxUnlockedStepIndex,
      stepCleared,
    });

    return { updated, selectedId };
  };

  useEffect(() => {
    fetchAvailableCourseTypes();
    fetchRoadmapData();
  }, [selectedCourse]);

  const fetchAvailableCourseTypes = async () => {
    try {
      const response = await apiGet('/skill-order/student/course-types');
      if (!response.ok) throw new Error('Failed to fetch course types');
      
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        setAvailableCourseTypes(result.data);
        // If current selection is not in available types, switch to first available
        if (!result.data.includes(selectedCourse)) {
          setSelectedCourse(result.data[0]);
        }
      } else {
        // Fallback to default if no course types returned
        setAvailableCourseTypes(['frontend']);
      }
    } catch (error) {
      console.error('Error fetching course types:', error);
      // Fallback to default
      setAvailableCourseTypes(['frontend']);
    }
  };

  const fetchRoadmapData = async () => {
    setLoading(true);
    // console.log('[ROADMAP] ========== FETCH START ==========');
    try {
      // console.log('[ROADMAP] Fetching roadmap data for course:', selectedCourse);
      // console.log('[ROADMAP] API URL:', `${import.meta.env.VITE_API_URL}/roadmap/student?course_type=${selectedCourse}`);
      
      const response = await apiGet(`/roadmap/student?course_type=${selectedCourse}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      // console.log('[ROADMAP] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('[ROADMAP] API error:', errorData);
        throw new Error(errorData.message || 'Failed to fetch roadmap data');
      }

      const result = await response.json();
      // console.log('[ROADMAP] ========== API RESPONSE ==========');
      // console.log('[ROADMAP] Full response:', JSON.stringify(result, null, 2));
      // console.log('[ROADMAP] Success:', result.success);
      // console.log('[ROADMAP] Data array length:', result.data?.length);
      // console.log('[ROADMAP] Venue:', result.venue);
      // console.log('[ROADMAP] ========================================');
      
      // Handle venue display first - whether data exists or not
      if (result.venue && result.venue.venue_name) {
        // console.log('[ROADMAP] Setting venue name:', result.venue.venue_name);
        setVenueName(result.venue.venue_name);
      } else {
        // console.log('[ROADMAP] No venue assigned, venue object:', result.venue);
        setVenueName('No Venue Assigned');
      }
      
      if (result.success && result.data && result.data.length > 0) {
        // console.log('[ROADMAP] Processing', result.data.length, 'modules');
        const venueId = result.venue?.venue_id;
        const studentId = result.venue?.student_id;
        const backendSkillProgression = result.skill_progression || [];
        // console.log('[ROADMAP] Skill progression:', backendSkillProgression);

        // Transform backend data to match UI expectations
        // Use is_locked, is_completed, is_current from backend response
        const transformedData = result.data.map((module, index) => ({
          roadmap_id: module.roadmap_id,
          title: module.title,
          description: module.description || 'No description available',
          learning_objectives: module.learning_objectives,
          day: module.day,
          course_type: module.course_type || 'frontend',
          status: module.status,
          is_completed: module.is_completed || false,
          is_current: module.is_current || false,
          is_locked: module.is_locked || false,
          locked_reason: module.locked_reason || '',
          skill_status: module.skill_status || 'Available',
          progress: module.is_completed ? 100 : 0,
          resources: module.resources || [],
          tasks: [] // TODO: Integrate tasks if available
        }));

        // Check if backend provided progression info (skill_progression exists or has lock data)
        const hasBackendProgression = backendSkillProgression.length > 0 || 
          transformedData.some(m => m.is_locked || m.is_completed || m.is_current);
        
        let finalData = transformedData;
        let recommendedSelectedId = transformedData[0]?.roadmap_id ?? null;

        if (!hasBackendProgression && transformedData.length > 1) {
          // Fallback: fetch skills and apply frontend unlocking only if needed
          let skills = [];
          if (studentId) {
            try {
              const skillsRes = await apiGet(
                `/skill-completion/students/${studentId}${venueId ? `?venueId=${venueId}` : ''}`
              );
              if (skillsRes.ok) {
                const skillsJson = await skillsRes.json();
                skills = skillsJson?.data?.skills || [];
              }
            } catch (e) {
              console.warn('Failed to fetch skill progress; roadmap will remain unlocked:', e);
            }
          }

          const frontendModules = transformedData.filter((m) => m.course_type === 'frontend');
          if (frontendModules.length > 0) {
            const { updated, selectedId } = applyFrontendUnlocking(frontendModules, skills);
            finalData = transformedData.map((m) => {
              if (m.course_type !== 'frontend') return m;
              const patched = updated.find((u) => u.roadmap_id === m.roadmap_id);
              return patched || m;
            });
            recommendedSelectedId = selectedId;
          }
        } else {
          // Use backend-provided progression - modules should already have correct lock status
          // Find the first active module (current, or first unlocked and not completed)
          const firstActive = transformedData.find((m) => m.is_current) || 
                             transformedData.find((m) => !m.is_locked && !m.is_completed) || 
                             transformedData.find((m) => !m.is_locked) ||
                             transformedData[0];
          recommendedSelectedId = firstActive?.roadmap_id ?? null;
        }

        // Store skill progression summary for UI
        if (backendSkillProgression.length > 0) {
          const courseSkills = backendSkillProgression.filter(s => s.course_type === selectedCourse);
          const clearedCount = courseSkills.filter(s => s.is_cleared).length;
          const currentSkill = courseSkills.find(s => s.is_current);
          setUnlockSummary({
            course: selectedCourse,
            maxUnlockedStepIndex: clearedCount,
            stepCleared: courseSkills.map(s => s.is_cleared),
            currentSkill: currentSkill?.skill_name || null
          });
        }
        
        // CRITICAL: Actually update the state with the final data
        setRoadmapData(finalData);
        // console.log('[ROADMAP] Final roadmap data set:', finalData.length, 'modules');

        if (recommendedSelectedId) {
          setSelectedNodeId(recommendedSelectedId);
          // console.log('[ROADMAP] Selected node ID:', recommendedSelectedId);
        }
      } else {
        // console.log('[ROADMAP] No modules found or empty data');
        setRoadmapData([]);
      }
    } catch (err) {
      console.error("[ROADMAP] Error fetching roadmap:", err);
      setRoadmapData([]);
      setVenueName('Error loading venue');
    } finally {
      setLoading(false);
    }
  };

  // Filter roadmap data by selected course type
  const filteredRoadmapData = roadmapData.filter(n => n.course_type === selectedCourse);
  // console.log('[ROADMAP] ========== FILTERING ==========');
  // console.log('[ROADMAP] Total roadmapData:', roadmapData.length);
  // console.log('[ROADMAP] Selected course:', selectedCourse);
  // console.log('[ROADMAP] Filtered count:', filteredRoadmapData.length);
  // console.log('[ROADMAP] Filtered modules:', filteredRoadmapData.map(m => m.title));
  // console.log('[ROADMAP] ====================================');
  
  const selectedNode = filteredRoadmapData.find(n => n.roadmap_id === selectedNodeId) || filteredRoadmapData[0];
  const completedCount = filteredRoadmapData.filter(n => n.is_completed).length;
  const progressPercentage = filteredRoadmapData.length ? Math.round((completedCount / filteredRoadmapData.length) * 100) : 0;

  const getResourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={20} className="text-blue-500" />;
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'url': return <ExternalLink size={20} className="text-green-500" />;
      default: return <FileText size={20} />;
    }
  };

  const downloadResource = async (resource) => {
    try {
      const response = await apiGet(`/roadmap/resources/download/${resource.resource_id}`);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.resource_name.toLowerCase().endsWith('.pdf') 
        ? resource.resource_name 
        : `${resource.resource_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert('Failed to download resource');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="page-container">
      <style>{`
        .page-container {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Inter', sans-serif;
          color: #1a202c;
          width: 100%;
          margin: 0;
        }

        /* Header Section - Matched to TaskHeader.jsx */
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 10px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        .left-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .dropdown-container {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 280px;
        }

        .dropdown-select {
          width: 100%;
          padding: 8px 36px 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
          background-color: #ffffff;
          cursor: pointer;
          appearance: none;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 36px;
        }

        .right-section {
           display: flex;
           align-items: center;
           gap: 12px;
        }

        .overall-progress {
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 250px;
        }

        .progress-text {
          text-align: right;
        }

        .progress-percent {
          font-size: 18px;
          font-weight: 700;
          color: #2d3748;
          display: block;
        }

        .progress-detail {
          font-size: 13px;
          color: #718096;
        }

        .progress-bar-bg {
          flex: 1;
          height: 8px;
          background: #edf2f7;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #10b981;
          border-radius: 4px;
        }

        /* Main Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          height: calc(100vh - 60px);
          padding: 24px;
          max-width: 100%;
          margin: 0;
          box-sizing: border-box; /* Ensure padding is contained */
        }

        /* Timeline Column */
        .timeline-column {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .timeline-column::-webkit-scrollbar {
          width: 6px;
        }

        .timeline-column::-webkit-scrollbar-track {
          background: transparent;
        }

        .timeline-column::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .timeline-column::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }

        .timeline-header {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .timeline-title {
          font-size: 14px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .timeline-track {
          position: relative;
          padding-left: 12px;
          min-height: 200px;
        }
        
        /* Vertical line */
        .timeline-track::before {
          content: '';
          position: absolute;
          left: 27px; /* Center of the 32px node (12px padding + 16px center - 1px width) */
          top: 0;
          bottom: 0; /* Full height */
          width: 2px;
          background: #e2e8f0;
          z-index: 0;
        }

        .timeline-node {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 40px;
          cursor: pointer;
          z-index: 1;
        }

        .timeline-node:last-child {
          padding-bottom: 0;
        }

        .node-marker {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: #94a3b8;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 2; /* Sit above line */
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .timeline-node:hover .node-marker {
          border-color: #cbd5e1;
          transform: scale(1.05);
        }

        .timeline-node.completed .node-marker {
          background: #10b981;
          border: none;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        }

        .timeline-node.current .node-marker {
          background: #3b82f6;
          border: none;
          color: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
        }

        .timeline-node.locked .node-marker {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #cbd5e1;
          box-shadow: none;
        }

        .node-content {
          flex: 1;
          transition: all 0.2s;
        }

        /* Restored box style for current node */
        .node-content.current {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin-top: -8px; /* Align slightly better with marker */
        }

        .node-status-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 6px;
          display: inline-block;
        }

        .status-completed { color: #10b981; }
        .status-current { color: #3b82f6; }
        .status-locked { color: #94a3b8; }

        .node-title {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
          line-height: 1.4;
          transition: color 0.2s;
        }
        
        .timeline-node.current .node-title {
          color: #1e3a8a;
          font-weight: 700;
        }

        .timeline-node.locked .node-title {
          color: #94a3b8;
        }

        .node-meta {
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }


        /* Detail Column */
        .detail-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .detail-column::-webkit-scrollbar {
          width: 6px;
        }

        .detail-column::-webkit-scrollbar-track {
          background: transparent;
        }

        .detail-column::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .detail-column::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }

        .detail-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .node-header-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .header-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #718096;
          font-weight: 500;
        }

        .node-progress-wrapper {
          text-align: right;
        }

        .node-progress-label {
          font-size: 12px;
          color: #718096;
          font-weight: 600;
          text-transform: uppercase;
        }

        .node-progress-bar {
          width: 150px;
          height: 6px;
          background: #edf2f7;
          border-radius: 3px;
          margin-top: 6px;
          overflow: hidden;
        }
        
        .node-progress-fill {
          height: 100%;
          background: #10b981;
          border-radius: 3px;
        }

        .main-title {
          font-size: 28px;
          font-weight: 800;
          color: #1a202c;
          margin-bottom: 8px;
        }

        .main-description {
          font-size: 16px;
          color: #4a5568;
          line-height: 1.6;
        }

        .grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .subsection {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #edf2f7;
        }

        .subsection-title {
          font-size: 16px;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Resources List */
        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .resource-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .resource-item:hover {
          border-color: #3b82f6;
        }

        .resource-icon-box {
          width: 40px;
          height: 40px;
          background: #f7fafc;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        }

        .resource-details {
          flex: 1;
        }

        .resource-name {
          font-size: 14px;
          font-weight: 600;
          color: #2d3748;
          display: block;
        }

        .resource-meta {
          font-size: 12px;
          color: #718096;
        }

        /* Tasks List */
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-item {
          display: flex;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .task-checkbox-wrapper {
          margin-right: 12px;
        }

        .task-content {
          flex: 1;
        }

        .task-title {
          font-size: 14px;
          font-weight: 500;
          color: #2d3748;
          display: block;
        }

        .task-meta {
          font-size: 12px;
          color: #718096;
          margin-top: 2px;
        }

        .est-time {
          font-size: 12px;
          color: #3b82f6;
          font-weight: 600;
          background: #eff6ff;
          padding: 2px 8px;
          border-radius: 12px;
        }

        /* Action Buttons */
        .action-bar {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .btn {
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          border: none;
        }

        .btn-outline {
          background: white;
          border: 1px solid #e2e8f0;
          color: #4a5568;
        }

        .btn-outline:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .path-summary-card {
           background: #eff6ff;
           border-radius: 12px;
           padding: 20px;
           margin-bottom: 24px;
        }

        .path-summary-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 12px;
        }
        
        .path-summary-list {
           display: flex;
           flex-direction: column;
           gap: 8px;
        }

        .path-step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #1e3a8a;
        }

        /* Responsive (added as overrides only; base styles unchanged) */
        /* 14-inch / small-desktop: keep same UI, just prevent header crowding */
        @media (max-width: 1400px) {
          .left-section {
            flex-wrap: wrap;
            gap: 14px;
          }

          .dropdown-container {
            min-width: 220px;
          }

          .overall-progress {
            min-width: 0;
          }
        }

        /* Shrink content gradually on smaller desktops */
        @media (max-width: 1280px) {
          .content-grid {
            grid-template-columns: 340px 1fr;
            gap: 18px;
            padding: 18px;
          }

          .timeline-column {
            padding: 20px;
          }

          .detail-card {
            padding: 24px;
          }

          .main-title {
            font-size: 26px;
          }

          .main-description {
            font-size: 15px;
          }

          .subsection {
            padding: 18px;
          }

          .subsection-title {
            font-size: 15px;
          }

          .node-title {
            font-size: 14px;
          }

          .node-meta {
            font-size: 12px;
          }

          .resource-icon-box {
            width: 36px;
            height: 36px;
            margin-right: 10px;
          }

          .resource-name {
            font-size: 13px;
          }

          .resource-item,
          .task-item {
            padding: 10px;
          }
        }

        @media (max-width: 1150px) {
          .content-grid {
            grid-template-columns: 320px 1fr;
            gap: 16px;
            padding: 16px;
          }

          .node-marker {
            width: 30px;
            height: 30px;
            font-size: 13px;
          }

          .timeline-track::before {
            left: 26px;
          }
        }

        /* Tablet / small windows */
        @media (max-width: 1024px) {
          .dropdown-container {
            min-width: 200px;
          }

          .content-grid {
            grid-template-columns: 320px 1fr;
            gap: 16px;
            padding: 16px;
          }

          .timeline-column {
            padding: 20px;
          }

          .detail-card {
            padding: 24px;
          }

          .grid-layout {
            gap: 16px;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .sticky-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .left-section {
            width: 100%;
            gap: 12px;
          }

          .right-section {
            width: 100%;
            justify-content: space-between;
          }

          .dropdown-container {
            min-width: 0;
            flex: 1 1 180px;
          }

          .content-grid {
            grid-template-columns: 1fr;
            height: auto;
            padding: 12px;
            gap: 12px;
          }

          .timeline-column,
          .detail-column {
            overflow-y: visible;
          }

          .detail-card {
            padding: 16px;
          }

          .node-header-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .node-progress-wrapper {
            text-align: left;
            width: 100%;
          }

          .node-progress-bar {
            width: 100%;
          }

          .grid-layout {
            grid-template-columns: 1fr;
          }

          .main-title {
            font-size: 22px;
          }

          .main-description {
            font-size: 14px;
          }

          .action-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .sticky-header {
            padding: 10px 12px;
          }

          .timeline-column {
            padding: 16px;
          }

          .timeline-node {
            gap: 14px;
            padding-bottom: 28px;
          }

          .node-marker {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }

          .timeline-track::before {
            left: 25px;
          }

          .subsection {
            padding: 14px;
          }

          .resource-item,
          .task-item {
            padding: 10px;
          }
        }

        /* Tailwind utilities helpers since native tailwind might not be available */
        .text-blue-500 { color: #3b82f6; }
        .text-blue-600 { color: #2563eb; }
        .text-red-500 { color: #ef4444; }
        .text-purple-500 { color: #a855f7; }
        .text-gray-500 { color: #6b7280; }
        .text-gray-400 { color: #9ca3af; }
        .text-gray-600 { color: #4b5563; }
        .text-gray-800 { color: #1f2937; }
        .text-green-500 { color: #10b981; }
        .text-green-600 { color: #059669; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .mb-3 { margin-bottom: 12px; }
        .mb-6 { margin-bottom: 24px; }
        .mb-8 { margin-bottom: 32px; }
        .p-6 { padding: 24px; }
        .rounded-xl { border-radius: 12px; }
        .border { border-width: 1px; }
        .border-gray-100 { border-color: #f3f4f6; }
        .leading-relaxed { line-height: 1.625; }
        .w-5 { width: 1.25rem; }
        .h-5 { height: 1.25rem; }
        .text-sm { font-size: 0.875rem; }
        .text-xl { font-size: 1.25rem; }
        .opacity-70 { opacity: 0.7; }
        .bg-gray-50 { background-color: #f9fafb; }
        .space-y-6 > * + * { margin-top: 1.5rem; }

      `}</style>
      
      {/* Header - Matched to TaskHeader.jsx layout */}
      <div className="sticky-header">
         <div className="left-section">
             <div style={{ fontSize: '14px', color: '#64748b', marginRight: '8px' }}>Venue:</div>
             <div className="dropdown-container" style={{ minWidth: '200px', marginRight: '20px' }}>
                <div style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                   {venueName}
                </div>
             </div>
             
             <div style={{ fontSize: '14px', color: '#64748b', marginRight: '8px' }}>Course Type:</div>
             <div className="dropdown-container" style={{ minWidth: '200px' }}>
                <select 
                  className="dropdown-select"
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    // Reset to first module of new course type
                    const firstModule = roadmapData.find(m => m.course_type === e.target.value && !m.is_locked) || roadmapData.find(m => m.course_type === e.target.value);
                    if (firstModule) setSelectedNodeId(firstModule.roadmap_id);
                  }}
                  style={{ paddingRight: '36px' }}
                >
                   {availableCourseTypes.map(type => (
                     <option key={type} value={type}>
                       {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                     </option>
                   ))}
                </select>
                <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', display: 'flex' }}>
                  <ChevronRight size={14} color="#64748b" style={{ transform: 'rotate(90deg)' }} />
                </div>
             </div>
          </div>

          <div className="right-section">
            <div className="overall-progress">
              <div className="progress-text">
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{progressPercentage}% completed</span>
              </div>
              <div className="progress-bar-bg" style={{ width: '150px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '10px' }}>
                <div className="progress-bar-fill" style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '10px' }}></div>
              </div>
            </div>
          </div>
      </div>

      <div className="content-grid">
        {/* Left Column: Timeline */}
        <div className="timeline-column">
          <div className="timeline-header">
            <span className="timeline-title">Journey Timeline</span>
          </div>

          <div className="timeline-track">
            {filteredRoadmapData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px', fontWeight: '500' }}>No {selectedCourse} modules available yet</p>
                <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>Check back later or contact your instructor</p>
              </div>
            ) : (
              filteredRoadmapData.map((node, index) => (
              <div 
                key={node.roadmap_id} 
                className={`timeline-node ${node.is_completed ? 'completed' : ''} ${node.roadmap_id === selectedNodeId ? 'current' : ''} ${node.is_locked ? 'locked' : ''}`}
                onClick={() => !node.is_locked && setSelectedNodeId(node.roadmap_id)}
              >
                <div className="node-marker">
                  {node.is_completed ? (
                    <Check size={18} strokeWidth={3} />
                  ) : node.is_locked ? (
                    <Lock size={14} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className={`node-content ${node.roadmap_id === selectedNodeId ? 'current' : ''}`}>
                  {/* Status Label Logic */}
                  {node.is_completed && <div className="node-status-label status-completed">COMPLETED</div>}
                  {node.roadmap_id === selectedNodeId && !node.is_completed && <div className="node-status-label status-current">IN PROGRESS</div>}
                  {node.is_locked && <div className="node-status-label status-locked">LOCKED</div>}

                  <div className="node-title">{node.title}</div>
                  
                  {/* Meta Info */}
                  {node.is_completed && (
                     <div className="node-meta">
                        All resources viewed
                     </div>
                  )}

                  {node.roadmap_id === selectedNodeId && (
                    <div className="node-meta" style={{ color: '#3b82f6' }}>
                      2 / 3 resources done
                    </div>
                  )}
                  
                  {node.is_locked && (
                     <div className="node-meta">
                      Complete previous step to unlock
                     </div>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="detail-column">
          {selectedNode && selectedNode.is_locked ? (
            <div className="detail-card" style={{ textAlign: 'center', padding: '60px 32px' }}>
              <Lock size={64} style={{ color: '#cbd5e1', margin: '0 auto 24px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>
                This module is locked
              </h2>
              <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto 24px' }}>
                {selectedNode.locked_reason || 'Complete the previous skill to unlock this module and access its learning materials.'}
              </p>
              <div style={{
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '16px 24px',
                display: 'inline-block'
              }}>
                <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                  📚 {selectedNode.title}
                </p>
              </div>
            </div>
          ) : selectedNode && (
            <div className="detail-card">
              <div className="node-header-info">
                <div className="header-breadcrumbs">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-blue-500" />
                    <span className="font-semibold text-blue-600">Current Skill</span>
                  </div>
                  <span>•</span>
                  <span>Level {selectedNode.roadmap_id} / {roadmapData.length}</span>
                </div>
                <div className="node-progress-wrapper">
                    <div className="node-progress-label">Node Progress</div>
                    <div className="flex items-center gap-3">
                         <span className="text-xl font-bold text-gray-800">{selectedNode.progress || 0}%</span>
                         <div className="node-progress-bar">
                            <div className="node-progress-fill" style={{ width: `${selectedNode.progress || 0}%` }}></div>
                         </div>
                    </div>
                </div>
              </div>

              <h1 className="main-title">{selectedNode.title}</h1>
              <p className="main-description mb-8">{selectedNode.description}</p>

              <div className="grid-layout">
                {/* Left Sub-column */}
                <div className="space-y-6">
                   {/* Study Materials */}
                   <div className="subsection">
                     <h3 className="subsection-title">
                       <BookOpen size={18} />
                       Study materials
                     </h3>
                     <div className="resources-list">
                        {selectedNode.is_locked && (
                          <div style={{
                            marginBottom: '12px',
                            padding: '10px 12px',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            color: '#64748b',
                            fontSize: '13px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}>
                            <Lock size={16} />
                            {selectedNode.locked_reason || 'Complete the previous skill to unlock this material.'}
                          </div>
                        )}
                        {selectedNode.resources && selectedNode.resources.length > 0 ? (
                          selectedNode.resources.map((res) => (
                          <div key={res.resource_id} className="resource-item">
                            <div className="resource-icon-box">
                               {getResourceIcon(res.resource_type)}
                            </div>
                            <div className="resource-details" style={{ flex: 1 }}>
                                <span className="resource-name">{res.resource_name}</span>
                                <span className="resource-meta">
                                  {res.resource_type === 'pdf' && res.file_size ? 
                                    `${(res.file_size / (1024 * 1024)).toFixed(2)} MB` : 
                                    res.resource_type}
                                </span>
                            </div>
                            {res.resource_type === 'pdf' && res.file_path ? (
                              <button
                                onClick={() => !selectedNode.is_locked && downloadResource(res)}
                                disabled={selectedNode.is_locked}
                                style={{
                                  padding: '6px 12px',
                                  background: selectedNode.is_locked ? '#cbd5e1' : '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: selectedNode.is_locked ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: '500'
                                }}
                              >
                                <Download size={14} />
                                {selectedNode.is_locked ? 'Locked' : 'Download'}
                              </button>
                            ) : res.resource_url ? (
                              selectedNode.is_locked ? (
                                <button
                                  disabled
                                  style={{
                                    padding: '6px 12px',
                                    background: '#cbd5e1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'not-allowed',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: '500'
                                  }}
                                >
                                  <Lock size={14} />
                                  Locked
                                </button>
                              ) : (
                                <a
                                  href={res.resource_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    padding: '6px 12px',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    textDecoration: 'none',
                                    fontWeight: '500'
                                  }}
                                >
                                  <ExternalLink size={14} />
                                  Open
                                </a>
                              )
                            ) : null}
                          </div>
                        ))
                        ) : (
                          <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                            <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p>No resources available yet</p>
                          </div>
                        )}
                     </div>
                   </div>
                </div>

                {/* Right Sub-column */}
                <div className="space-y-6">
                  {/* Learning Objectives */}
                  {selectedNode.learning_objectives && (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-3">What you will learn in this skill</h3>
                      <p className="text-gray-600 leading-relaxed" style={{ whiteSpace: 'pre-line', fontSize: '14px' }}>
                        {selectedNode.learning_objectives}
                      </p>
                    </div>
                  )}

                  {/* Micro Tasks */}
                  {selectedNode.tasks && selectedNode.tasks.length > 0 && (
                  <div className="subsection">
                    <h3 className="subsection-title">
                      <CheckSquare size={18} />
                      Today's micro-tasks
                    </h3>
                    <div className="tasks-list">
                       {selectedNode.tasks.map((task, idx) => (
                         <div key={idx} className="task-item">
                           <div className="task-checkbox-wrapper">
                              <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                           </div>
                           <div className="task-content">
                              <span className="task-title">{task.title}</span>
                           </div>
                           <span className="est-time">{task.time}</span>
                         </div>
                       ))}
                    </div>
                  </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentRoadmap;