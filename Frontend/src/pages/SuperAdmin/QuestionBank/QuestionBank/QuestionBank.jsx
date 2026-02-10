import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  ArrowBack,
  Add,
  Edit,
  Delete,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Quiz,
  Code,
  Image as ImageIcon,
  ExpandMore,
  CloudUpload,
  Save,
  ContentCopy,
} from "@mui/icons-material";
import useAuthStore from "../../../../store/useAuthStore";
import { 
  getAllQuestions, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion 
} from "../../../../services/questionBankApi";

// Question Type Tabs
const QUESTION_TABS = [
  { id: "mcq", label: "MCQ", icon: Quiz },
  { id: "code", label: "Code & Output", icon: Code },
];

const QuestionBank = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const user = useAuthStore((s) => s.user);

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [activeTab, setActiveTab] = useState("mcq");

  // Code tab state for each card
  const [cardCodeTabs, setCardCodeTabs] = useState({});

  // Expanded cards state (collapsed by default)
  const [expandedCards, setExpandedCards] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Question Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formTab, setFormTab] = useState("basic");
  const [saving, setSaving] = useState(false);

  // MCQ Form Data
  const [mcqFormData, setMcqFormData] = useState({
    type: "mcq",
    level: "beginner",
    title: "",
    question: "",
    options: [
      { label: "A", text: "", isCorrect: false },
      { label: "B", text: "", isCorrect: false },
      { label: "C", text: "", isCorrect: false },
      { label: "D", text: "", isCorrect: false },
    ],
  });

  // Code Form Data
  const [codeFormData, setCodeFormData] = useState({
    type: "code",
    level: "beginner",
    topic: "",
    title: "",
    description: "",
    taskInstructions: "",
    sampleHtmlCode: "",
    sampleCssCode: "",
    sampleOutputImage: "",
    sampleImageFile: null, // Store actual file object
    checklist: [],
    maxMarks: 10,
    mappedSkill: "",
  });

  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Result Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModal, setResultModal] = useState({ type: "success", title: "", message: "" });

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showResult = (type, title, message) => {
    setResultModal({ type, title, message });
    setShowResultModal(true);
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      // Pass courseId as a filter parameter
      const filters = courseId ? { course_id: courseId } : {};
      const response = await getAllQuestions(filters);
      if (response.success && response.data) {
        // Transform backend data to match component structure
        const transformedQuestions = response.data.map(q => {
          // Parse MCQ options if they exist
          let mcqOptions = [];
          if (q.question_type === 'mcq' && q.mcq_options) {
            try {
              const parsedOptions = JSON.parse(q.mcq_options);
              mcqOptions = parsedOptions.map(opt => ({
                label: opt.id,
                text: opt.text,
                isCorrect: opt.id === q.mcq_correct_answer
              }));
            } catch (e) {
              console.error('Error parsing MCQ options:', e);
            }
          }

          return {
            id: `QS-${q.question_id}`,
            type: q.question_type.toLowerCase() === 'mcq' ? 'mcq' : 'code',
            level: q.difficulty_level?.toLowerCase() || 'beginner',
            topic: q.course_name || 'General',
            // MCQ specific
            title: q.title || '',
            question: q.description || '',
            options: mcqOptions,
            // Coding specific
            description: q.description || '',
            taskInstructions: q.description || '',
            sampleHtmlCode: q.coding_starter_code || '',
            sampleCssCode: q.coding_expected_output || '',
            sampleOutputImage: q.sample_image ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/pbl/api'}/uploads/${q.sample_image.replace(/\\/g, '/').replace('uploads/', '')}` : '',
            checklist: q.coding_test_cases ? (typeof q.coding_test_cases === 'string' ? JSON.parse(q.coding_test_cases) : q.coding_test_cases) : [],
            maxMarks: q.max_score || 10,
            mappedSkill: q.course_name || '',
            addedBy: q.creator_name || "Admin",
          };
        });
        setQuestions(transformedQuestions);
      } else {
        // No questions found, set empty array (not an error)
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      // Just set empty array - don't show error modal to user
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [courseId]);

  // Filter questions by tab type
  const filteredQuestions = questions.filter((q) => {
    const matchesType = q.type === activeTab;
    const matchesSearch =
      q.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = !selectedLevel || q.level === selectedLevel;
    return matchesType && matchesSearch && matchesLevel;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLevel, activeTab]);

  const handleDelete = async (questionId) => {
    try {
      // Extract numeric ID from QS-12345 format
      const numericId = questionId.replace('QS-', '');
      const response = await deleteQuestion(numericId);
      
      if (response.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        showResult("success", "Question Deleted", "Question has been deleted successfully.");
      } else {
        showResult("error", "Delete Failed", response.message || "Could not delete question");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      showResult("error", "Delete Failed", error.message || "Could not delete question");
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = (question) => {
    const duplicated = {
      ...question,
      id: `QS-${Date.now()}`,
      title: question.title ? `${question.title} (Copy)` : undefined,
      question: question.question ? `${question.question} (Copy)` : undefined,
    };
    setQuestions((prev) => [duplicated, ...prev]);
    showResult("success", "Question Duplicated", "Question has been duplicated successfully.");
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingQuestion(null);
    setFormTab("basic");
    if (activeTab === "mcq") {
      setMcqFormData({
        type: "mcq",
        level: "beginner",
        title: "",
        question: "",
        options: [
          { label: "A", text: "", isCorrect: false },
          { label: "B", text: "", isCorrect: false },
          { label: "C", text: "", isCorrect: false },
          { label: "D", text: "", isCorrect: false },
        ],
      });
    } else {
      setCodeFormData({
        type: "code",
        level: "beginner",
        topic: "",
        title: "",
        description: "",
        taskInstructions: "",
        sampleHtmlCode: "",
        sampleCssCode: "",
        sampleOutputImage: "",
        checklist: [],
        maxMarks: 10,
        mappedSkill: "",
      });
    }
    setShowFormModal(true);
  };

  // Open Edit Modal
  const openEditModal = (question) => {
    setEditingQuestion(question);
    setFormTab("basic");
    if (question.type === "mcq") {
      setMcqFormData({
        type: "mcq",
        level: question.level || "beginner",
        title: question.title || "",
        question: question.question || "",
        options: question.options || [
          { label: "A", text: "", isCorrect: false },
          { label: "B", text: "", isCorrect: false },
          { label: "C", text: "", isCorrect: false },
          { label: "D", text: "", isCorrect: false },
        ],
      });
    } else {
      setCodeFormData({
        type: "code",
        level: question.level || "beginner",
        topic: question.topic || "",
        title: question.title || "",
        description: question.description || "",
        taskInstructions: question.taskInstructions || "",
        sampleHtmlCode: question.sampleHtmlCode || question.sampleCode || "",
        sampleCssCode: question.sampleCssCode || "",
        sampleOutputImage: question.sampleOutputImage || "",
        checklist: question.checklist || [],
        maxMarks: question.maxMarks || 10,
        mappedSkill: question.mappedSkill || "",
      });
    }
    setShowFormModal(true);
  };

  // Handle MCQ Form Submit
  const handleMCQSubmit = async () => {
    if (!mcqFormData.question.trim()) {
      showResult("error", "Missing Information", "Please enter a question.");
      return;
    }
    if (!mcqFormData.title.trim()) {
      showResult("error", "Missing Information", "Please enter a title.");
      return;
    }
    if (!mcqFormData.options.some((opt) => opt.isCorrect)) {
      showResult("error", "Missing Information", "Please select a correct answer.");
      return;
    }

    setSaving(true);

    try {
      // Map frontend level to database difficulty_level
      const mapLevelToDifficulty = (level) => {
        const mapping = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        return mapping[level] || 'Medium';
      };

      // Prepare data for backend
      const questionData = {
        course_id: parseInt(courseId),
        title: mcqFormData.title,
        description: mcqFormData.question,
        question_type: 'mcq',
        difficulty_level: mapLevelToDifficulty(mcqFormData.level),
        mcq_options: JSON.stringify([
          { id: 'A', text: mcqFormData.options[0].text },
          { id: 'B', text: mcqFormData.options[1].text },
          { id: 'C', text: mcqFormData.options[2].text },
          { id: 'D', text: mcqFormData.options[3].text }
        ]),
        mcq_correct_answer: ['A', 'B', 'C', 'D'][mcqFormData.options.findIndex(opt => opt.isCorrect)],
        mcq_explanation: 'See correct answer',
        // Explicitly set coding fields to null for MCQ
        coding_starter_code: null,
        coding_language_support: null,
        coding_test_cases: null,
        coding_expected_output: null,
        max_score: 100,
        time_limit_minutes: 30,
        hints: null,
        status: 'Active'
      };

      if (editingQuestion) {
        // Extract question ID from QS-12345 format
        const questionId = editingQuestion.id.replace('QS-', '');
        const response = await updateQuestion(questionId, questionData);
        if (response.success) {
          showResult("success", "Question Updated", "MCQ has been updated successfully.");
          fetchQuestions(); // Reload questions
        }
      } else {
        const response = await createQuestion(questionData);
        if (response.success) {
          showResult("success", "Question Created", "MCQ has been created successfully.");
          fetchQuestions(); // Reload questions
        }
      }

      setShowFormModal(false);
    } catch (error) {
      console.error("Error saving MCQ:", error);
      showResult("error", "Save Failed", error.message || "Could not save question");
    } finally {
      setSaving(false);
    }
  };

  // Handle Code Form Submit
  const handleCodeSubmit = async () => {
    if (!codeFormData.title.trim()) {
      showResult("error", "Missing Information", "Please enter a title.");
      return;
    }
    if (!codeFormData.topic.trim()) {
      showResult("error", "Missing Information", "Please enter a topic.");
      return;
    }

    setSaving(true);

    try {
      // Map frontend level to database difficulty_level
      const mapLevelToDifficulty = (level) => {
        const mapping = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        return mapping[level] || 'Medium';
      };

      // Use FormData to send file
      const formData = new FormData();
      formData.append('course_id', parseInt(courseId));
      formData.append('title', codeFormData.title);
      formData.append('description', codeFormData.taskInstructions || codeFormData.description || codeFormData.title);
      formData.append('question_type', 'coding');
      formData.append('difficulty_level', mapLevelToDifficulty(codeFormData.level));
      formData.append('mcq_options', 'null');
      formData.append('mcq_correct_answer', 'null');
      formData.append('mcq_explanation', 'null');
      formData.append('coding_starter_code', codeFormData.sampleHtmlCode || '');
      formData.append('coding_language_support', 'html,css,javascript');
      formData.append('coding_test_cases', JSON.stringify(codeFormData.checklist || []));
      formData.append('coding_expected_output', codeFormData.sampleCssCode || '');
      formData.append('max_score', '100');
      formData.append('time_limit_minutes', '60');
      formData.append('hints', codeFormData.topic || '');
      formData.append('status', 'Active');

      // Append image file if exists
      if (codeFormData.sampleImageFile) {
        formData.append('sampleImage', codeFormData.sampleImageFile);
      }

      if (editingQuestion) {
        const questionId = editingQuestion.id.replace('QS-', '');
        const response = await updateQuestion(questionId, formData, true); // Pass true for FormData
        if (response.success) {
          showResult("success", "Question Updated", "Question has been updated successfully.");
          fetchQuestions();
        }
      } else {
        const response = await createQuestion(formData, true); // Pass true for FormData
        if (response.success) {
          showResult("success", "Question Created", "Question has been created successfully.");
          fetchQuestions();
        }
      }

      setShowFormModal(false);
    } catch (error) {
      console.error("Error saving coding question:", error);
      showResult("error", "Save Failed", error.message || "Could not save question");
    } finally {
      setSaving(false);
    }
  };

  // Handle Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCodeFormData((prev) => ({ 
          ...prev, 
          sampleOutputImage: reader.result,
          sampleImageFile: file // Store the actual file
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Add checklist item
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setCodeFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newChecklistItem.trim()],
    }));
    setNewChecklistItem("");
  };

  // Set correct answer for MCQ
  const setCorrectAnswer = (index) => {
    setMcqFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => ({ ...opt, isCorrect: i === index })),
    }));
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "beginner": return { bg: "#dcfce7", color: "#16a34a" };
      case "intermediate": return { bg: "#fef3c7", color: "#d97706" };
      case "advanced": return { bg: "#fee2e2", color: "#dc2626" };
      default: return { bg: "#f1f5f9", color: "#64748b" };
    }
  };

  // Get/Set code tab for specific card
  const getCardCodeTab = (questionId) => cardCodeTabs[questionId] || "html";
  const setCardCodeTab = (questionId, tab) => {
    setCardCodeTabs((prev) => ({ ...prev, [questionId]: tab }));
  };

  // Toggle card expansion
  const toggleCardExpand = (questionId) => {
    setExpandedCards((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };
  const isCardExpanded = (questionId) => expandedCards[questionId] || false;

  // Render MCQ Card
  const renderMCQCard = (question, index) => {
    const levelColor = getLevelColor(question.level);
    const isExpanded = isCardExpanded(question.id);
    
    return (
      <div style={s.collapsibleCard} key={question.id}>
        {/* Collapsed Header - Always Visible */}
        <div 
          style={s.collapsibleHeader}
          onClick={() => toggleCardExpand(question.id)}
        >
          <div style={s.collapsibleLeft}>
            <span style={s.questionNumber}>Q{index + 1}</span>
            <div style={s.collapsibleTags}>
              <span style={s.mcqTag}>MCQ</span>
              <span style={{ ...s.levelTag, color: levelColor.color }}>
                {question.level?.toUpperCase()}
              </span>
              <span style={s.topicTag}>{question.topic?.toUpperCase()}</span>
            </div>
            <span style={s.collapsibleQuestion}>
              {question.title?.length > 80 ? question.title.substring(0, 80) + "..." : question.title}
            </span>
          </div>
          <div style={s.collapsibleRight}>
            <div style={s.cardActions}>
              <button style={s.iconBtn} onClick={(e) => { e.stopPropagation(); openEditModal(question); }}>
                <Edit sx={{ fontSize: 18, color: "#94a3b8" }} />
              </button>
              <button style={s.iconBtn} onClick={(e) => { e.stopPropagation(); setDeleteTarget(question); setShowDeleteModal(true); }}>
                <Delete sx={{ fontSize: 18, color: "#94a3b8" }} />
              </button>
            </div>
            <ExpandMore sx={{ 
              fontSize: 24, 
              color: "#64748b",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }} />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div style={s.collapsibleContent}>
            <div style={s.questionText}>{question.question}</div>

            <div style={s.optionsGrid}>
              {question.options?.map((opt) => (
                <div
                  key={opt.label}
                  style={{ ...s.optionBox, ...(opt.isCorrect ? s.correctOption : {}) }}
                >
                  <span style={{ ...s.optionLabel, ...(opt.isCorrect ? s.correctLabel : {}) }}>
                    {opt.isCorrect ? <CheckCircle sx={{ fontSize: 20, color: "#fff" }} /> : opt.label}
                  </span>
                  <span style={s.optionText}>
                    {opt.text}
                  </span>
                </div>
              ))}
            </div>

            <div style={s.cardFooter}>
              <span style={s.questionId}>ID: #{question.id}</span>
              <span style={s.addedBy}>Added by: {question.addedBy}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Code Card - Layout matching screenshot
  const renderCodeCard = (question, index) => {
    const levelColor = getLevelColor(question.level);
    const hasHtmlCss = question.topic?.toLowerCase().includes("html") || question.topic?.toLowerCase().includes("css");
    const currentCodeTab = getCardCodeTab(question.id);
    const isExpanded = isCardExpanded(question.id);
    
    return (
      <div style={s.collapsibleCard} key={question.id}>
        {/* Collapsed Header - Always Visible */}
        <div 
          style={s.collapsibleHeader}
          onClick={() => toggleCardExpand(question.id)}
        >
          <div style={s.collapsibleLeft}>
            <span style={s.questionNumber}>Q{index + 1}</span>
            <div style={s.collapsibleTags}>
              <span style={{ ...s.practicalTag, backgroundColor: "#eff6ff", color: "#3b82f6" }}>Practical Task</span>
              <span style={{ ...s.practicalTag, backgroundColor: "#fff7ed", color: "#ea580c" }}>{question.topic}</span>
              <span style={{ ...s.practicalTag, backgroundColor: levelColor.bg, color: levelColor.color }}>
                {question.level?.charAt(0).toUpperCase() + question.level?.slice(1)}
              </span>
            </div>
            <span style={s.collapsibleQuestion}>
              {question.title?.length > 60 ? question.title.substring(0, 60) + "..." : question.title}
            </span>
          </div>
          <div style={s.collapsibleRight}>
            <div style={s.cardActions}>
              <button style={s.iconBtn} onClick={(e) => { e.stopPropagation(); openEditModal(question); }}>
                <Edit sx={{ fontSize: 18, color: "#94a3b8" }} />
              </button>
              <button style={s.iconBtn} onClick={(e) => { e.stopPropagation(); setDeleteTarget(question); setShowDeleteModal(true); }}>
                <Delete sx={{ fontSize: 18, color: "#94a3b8" }} />
              </button>
            </div>
            <ExpandMore sx={{ 
              fontSize: 24, 
              color: "#64748b",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease"
            }} />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div style={s.collapsibleCodeContent}>
            {/* Two Column Layout */}
            <div style={s.twoColumnLayout}>
          {/* Left Column - Instructions & Image */}
          <div style={s.leftColumn}>
            {/* Task Instructions */}
            <div style={s.sectionBox}>
              <div style={s.sectionHeader}>
                <h4 style={s.sectionTitle}>Task Instructions</h4>
                <span style={s.sectionSubtitle}>What should the student build in this assessment?</span>
              </div>
              <div style={s.instructionContent}>
                {question.taskInstructions?.split('\n').map((line, i) => (
                  <p key={i} style={s.instructionLine}>{line}</p>
                ))}
              </div>
            </div>

            {/* Checklist */}
            {question.checklist?.length > 0 && (
              <div style={s.sectionBox}>
                <div style={s.sectionHeader}>
                  <h4 style={s.sectionTitle}>Checklist / Evaluation Points</h4>
                  <span style={s.sectionSubtitle}>What will you check when you review this task?</span>
                </div>
                <div style={s.checklistContent}>
                  {question.checklist.map((item, i) => (
                    <p key={i} style={s.checklistItem}>• {item}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Output Image - fills remaining space */}
            <div style={s.sectionBoxFill}>
              <div style={s.sectionHeader}>
                <h4 style={s.sectionTitle}>Sample Output (Image)</h4>
                <span style={s.sectionSubtitle}>Upload screenshot to show how final result should look.</span>
              </div>
              <div style={s.imageContainerFill}>
                {question.sampleOutputImage ? (
                  <div style={s.previewBox}>
                    <div style={s.previewHeader}>
                      <span style={s.previewTitle}>Preview – Desktop layout</span>
                      <span style={s.previewLabel}>Reference Output</span>
                    </div>
                    <div style={s.previewImageWrapper}>
                      <img src={question.sampleOutputImage} alt="Sample Output" style={s.previewImage} />
                    </div>
                    <p style={s.previewNote}>Students do not need to copy design exactly, but structure and content should match the instructions.</p>
                  </div>
                ) : (
                  <div style={s.noImagePlaceholder}>
                    <ImageIcon sx={{ fontSize: 48, color: "#cbd5e1" }} />
                    <p style={s.placeholderText}>No preview image uploaded</p>
                    <p style={s.placeholderHint}>Add an image to show students the expected output</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sample Code */}
          <div style={s.rightColumn}>
            <div style={s.codeSection}>
              <div style={s.codeSectionHeader}>
                <h4 style={s.sectionTitle}>Sample Code</h4>
                <span style={s.sectionSubtitle}>Optional starter template for students.</span>
              </div>
              
              {/* Code Tabs for HTML/CSS */}
              {hasHtmlCss && (question.sampleHtmlCode || question.sampleCssCode) ? (
                <>
                  <div style={s.codeTabs}>
                    <button
                      style={{ ...s.codeTabBtn, ...(currentCodeTab === "html" ? s.codeTabActive : {}) }}
                      onClick={() => setCardCodeTab(question.id, "html")}
                    >
                      HTML
                    </button>
                    {question.sampleCssCode && (
                      <button
                        style={{ ...s.codeTabBtn, ...(currentCodeTab === "css" ? s.codeTabActive : {}) }}
                        onClick={() => setCardCodeTab(question.id, "css")}
                      >
                        CSS
                      </button>
                    )}
                  </div>
                  <div style={s.codeBlockWrapper}>
                    <pre style={s.codeBlock}>
                      {currentCodeTab === "html" 
                        ? (question.sampleHtmlCode || "<!-- No HTML code provided -->") 
                        : (question.sampleCssCode || "/* No CSS code provided */")}
                    </pre>
                  </div>
                </>
              ) : (
                <div style={s.codeBlockWrapper}>
                  <pre style={s.codeBlock}>
                    {question.sampleHtmlCode || question.sampleCode || "// No code provided"}
                  </pre>
                  {question.sampleCssCode && (
                    <>
                      <div style={s.outputLabel}>Expected Output:</div>
                      <pre style={s.codeBlockSmall}>{question.sampleCssCode}</pre>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Footer */}
            <div style={s.practicalFooter}>
              <div style={s.footerLeft}>
                <span style={s.footerItem}>Max Marks: {question.maxMarks || 10}</span>
                <span style={s.footerDivider}>|</span>
                <span style={s.footerItem}>Mapped Skill: <strong>{question.mappedSkill || question.topic}</strong></span>
              </div>
              <button style={s.duplicateBtn} onClick={(e) => { e.stopPropagation(); handleDuplicate(question); }}>
                <ContentCopy sx={{ fontSize: 16 }} />
                Duplicate as variation
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={s.container}>
      {loading && <div style={s.loadingOverlay}>Loading...</div>}

      {/* Top Bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate("/courses")}>
          <ArrowBack sx={{ fontSize: 18 }} />
          <span>Back to Courses</span>
        </button>
        
        <div style={s.searchWrapper}>
          <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
          <input
            type="text"
            placeholder="Search questions..."
            style={s.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={s.selectWrapper}>
          <select
            style={s.filterSelect}
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <ExpandMore sx={{ fontSize: 20, color: "#64748b", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>

        <button style={s.addBtn} onClick={openAddModal}>
          <Add sx={{ fontSize: 20 }} />
          <span>Add New Question</span>
        </button>
      </div>

      {/* Question Type Tabs */}
      <div style={s.tabsContainer}>
        {QUESTION_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = questions.filter((q) => q.type === tab.id).length;
          return (
            <button
              key={tab.id}
              style={{ ...s.tabBtn, ...(activeTab === tab.id ? s.tabBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon sx={{ fontSize: 20 }} />
              <span>{tab.label}</span>
              <span style={s.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Questions List */}
      <div style={s.questionsList}>
        {paginatedQuestions.length > 0 ? (
          paginatedQuestions.map((question, index) =>
            question.type === "mcq" 
              ? renderMCQCard(question, startIndex + index) 
              : renderCodeCard(question, startIndex + index)
          )
        ) : (
          <div style={s.emptyState}>
            <Quiz sx={{ fontSize: 64, color: "#cbd5e1" }} />
            <h3 style={s.emptyTitle}>No Questions Found</h3>
            <p style={s.emptyText}>
              {searchTerm || selectedLevel
                ? "Try adjusting your filters."
                : `Start by adding your first ${activeTab === "mcq" ? "MCQ" : "Code & Output"} question.`}
            </p>
            <button style={s.emptyBtn} onClick={openAddModal}>
              <Add sx={{ fontSize: 18 }} />
              Add New Question
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredQuestions.length > itemsPerPage && (
        <div style={s.pagination}>
          <div style={s.paginationInfo}>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
          </div>
          <div style={s.paginationControls}>
            <button
              style={{ ...s.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              style={{ ...s.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                style={{ ...s.pageBtn, ...(currentPage === page ? s.pageBtnActive : {}) }}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              style={{ ...s.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button
              style={{ ...s.pageBtn, opacity: currentPage === totalPages ? 0.5 : 1 }}
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Question Form Modal */}
      {showFormModal && (
        <div style={s.modalOverlay} onClick={() => setShowFormModal(false)}>
          <div style={s.formModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.formModalHeader}>
              <h2 style={s.formModalTitle}>
                {editingQuestion ? "Edit Question" : `Add New ${activeTab === "mcq" ? "MCQ" : "Practical Task"}`}
              </h2>
              <button style={s.closeBtn} onClick={() => setShowFormModal(false)}>
                <Close sx={{ fontSize: 24 }} />
              </button>
            </div>

            {activeTab === "mcq" ? (
              /* MCQ Form */
              <div style={s.formModalBody}>
                <div style={s.formRow}>
                  <div style={s.formGroup}>
                    <label style={s.label}>Level *</label>
                    <select
                      style={s.select}
                      value={mcqFormData.level}
                      onChange={(e) => setMcqFormData({ ...mcqFormData, level: e.target.value })}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.label}>Title *</label>
                    <input
                      type="text"
                      style={s.input}
                      value={mcqFormData.title}
                      onChange={(e) => setMcqFormData({ ...mcqFormData, title: e.target.value })}
                      placeholder="e.g., Understanding React Hooks, CSS Flexbox Basics"
                    />
                  </div>
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Question *</label>
                  <textarea
                    style={{ ...s.input, minHeight: "100px" }}
                    value={mcqFormData.question}
                    onChange={(e) => setMcqFormData({ ...mcqFormData, question: e.target.value })}
                    placeholder="Enter your question here..."
                  />
                </div>

                <div style={s.formGroup}>
                  <label style={s.label}>Options (Click to mark correct answer)</label>
                  <div style={s.optionsForm}>
                    {mcqFormData.options.map((opt, index) => (
                      <div
                        key={opt.label}
                        style={{
                          ...s.optionFormRow,
                          backgroundColor: opt.isCorrect ? "#dcfce7" : "#f8fafc",
                          borderColor: opt.isCorrect ? "#86efac" : "#e2e8f0",
                        }}
                        onClick={() => setCorrectAnswer(index)}
                      >
                        <span style={{ ...s.optionFormLabel, backgroundColor: opt.isCorrect ? "#16a34a" : "#e2e8f0", color: opt.isCorrect ? "#fff" : "#64748b" }}>
                          {opt.label}
                        </span>
                        <input
                          type="text"
                          style={s.optionInput}
                          value={opt.text}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newOptions = [...mcqFormData.options];
                            newOptions[index].text = e.target.value;
                            setMcqFormData({ ...mcqFormData, options: newOptions });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`Option ${opt.label}`}
                        />
                        {opt.isCorrect && <CheckCircle sx={{ fontSize: 20, color: "#16a34a" }} />}
                      </div>
                    ))}
                  </div>
                  <p style={s.hint}>Click on an option to mark it as the correct answer</p>
                </div>

                <div style={s.formModalFooter}>
                  <button style={s.cancelBtn} onClick={() => setShowFormModal(false)}>Cancel</button>
                  <button style={s.saveBtn} onClick={handleMCQSubmit} disabled={saving}>
                    <Save sx={{ fontSize: 18 }} />
                    {saving ? "Saving..." : editingQuestion ? "Update Question" : "Save Question"}
                  </button>
                </div>
              </div>
            ) : (
              /* Code & Output Form */
              <div style={s.formModalBody}>
                {/* Form Tabs */}
                <div style={s.formTabs}>
                  <button
                    style={{ ...s.formTabBtn, ...(formTab === "basic" ? s.formTabBtnActive : {}) }}
                    onClick={() => setFormTab("basic")}
                  >
                    Basic Info
                  </button>
                  <button
                    style={{ ...s.formTabBtn, ...(formTab === "code" ? s.formTabBtnActive : {}) }}
                    onClick={() => setFormTab("code")}
                  >
                    Sample Code
                  </button>
                  <button
                    style={{ ...s.formTabBtn, ...(formTab === "image" ? s.formTabBtnActive : {}) }}
                    onClick={() => setFormTab("image")}
                  >
                    Sample Output Image
                  </button>
                </div>

                {formTab === "basic" && (
                  <div style={s.formTabContent}>
                    <div style={s.formRow}>
                      <div style={s.formGroup}>
                        <label style={s.label}>Level *</label>
                        <select
                          style={s.select}
                          value={codeFormData.level}
                          onChange={(e) => setCodeFormData({ ...codeFormData, level: e.target.value })}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.label}>Topic *</label>
                        <input
                          type="text"
                          style={s.input}
                          value={codeFormData.topic}
                          onChange={(e) => setCodeFormData({ ...codeFormData, topic: e.target.value })}
                          placeholder="e.g., HTML, CSS, JavaScript"
                        />
                      </div>
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>Title *</label>
                      <input
                        type="text"
                        style={s.input}
                        value={codeFormData.title}
                        onChange={(e) => setCodeFormData({ ...codeFormData, title: e.target.value })}
                        placeholder="e.g., Build a Simple HTML Portfolio Section"
                      />
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>Description</label>
                      <textarea
                        style={{ ...s.input, minHeight: "60px" }}
                        value={codeFormData.description}
                        onChange={(e) => setCodeFormData({ ...codeFormData, description: e.target.value })}
                        placeholder="Brief description of the task..."
                      />
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>Task Instructions</label>
                      <textarea
                        style={{ ...s.input, minHeight: "120px" }}
                        value={codeFormData.taskInstructions}
                        onChange={(e) => setCodeFormData({ ...codeFormData, taskInstructions: e.target.value })}
                        placeholder="Detailed instructions for the student..."
                      />
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>Checklist / Evaluation Points</label>
                      <div style={s.listItems}>
                        {codeFormData.checklist.map((item, i) => (
                          <div key={i} style={s.listItem}>
                            <span>• {item}</span>
                            <button
                              style={s.removeItemBtn}
                              onClick={() => setCodeFormData((prev) => ({
                                ...prev,
                                checklist: prev.checklist.filter((_, idx) => idx !== i),
                              }))}
                            >
                              <Close sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={s.addItemRow}>
                        <input
                          type="text"
                          style={{ ...s.input, flex: 1 }}
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder="Add checklist item..."
                          onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
                        />
                        <button style={s.addItemBtn} onClick={addChecklistItem}>
                          <Add sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </div>

                    <div style={s.formRow}>
                      <div style={s.formGroup}>
                        <label style={s.label}>Max Marks</label>
                        <input
                          type="number"
                          style={s.input}
                          value={codeFormData.maxMarks}
                          onChange={(e) => setCodeFormData({ ...codeFormData, maxMarks: parseInt(e.target.value) || 10 })}
                          placeholder="10"
                        />
                      </div>
                      <div style={s.formGroup}>
                        <label style={s.label}>Mapped Skill</label>
                        <input
                          type="text"
                          style={s.input}
                          value={codeFormData.mappedSkill}
                          onChange={(e) => setCodeFormData({ ...codeFormData, mappedSkill: e.target.value })}
                          placeholder="e.g., HTML Semantic Structure"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formTab === "code" && (
                  <div style={s.formTabContent}>
                    <div style={s.formGroup}>
                      <label style={s.label}>
                        <Code sx={{ fontSize: 18, marginRight: "8px", verticalAlign: "middle" }} />
                        Sample HTML Code
                      </label>
                      <textarea
                        style={s.codeInput}
                        value={codeFormData.sampleHtmlCode}
                        onChange={(e) => setCodeFormData({ ...codeFormData, sampleHtmlCode: e.target.value })}
                        placeholder="<!-- Enter HTML code here -->"
                        rows={10}
                      />
                    </div>

                    <div style={s.formGroup}>
                      <label style={s.label}>
                        <Code sx={{ fontSize: 18, marginRight: "8px", verticalAlign: "middle" }} />
                        Sample CSS Code
                      </label>
                      <textarea
                        style={s.codeInput}
                        value={codeFormData.sampleCssCode}
                        onChange={(e) => setCodeFormData({ ...codeFormData, sampleCssCode: e.target.value })}
                        placeholder="/* Enter CSS code here */"
                        rows={10}
                      />
                    </div>
                  </div>
                )}

                {formTab === "image" && (
                  <div style={s.formTabContent}>
                    <div style={s.formGroup}>
                      <label style={s.label}>
                        <ImageIcon sx={{ fontSize: 18, marginRight: "8px", verticalAlign: "middle" }} />
                        Sample Output Screenshot
                      </label>
                      <p style={s.hint}>
                        Upload a screenshot showing what the final output should look like. This helps students understand the expected result they need to replicate.
                      </p>
                      <div style={s.uploadArea}>
                        {codeFormData.sampleOutputImage ? (
                          <div style={s.uploadedImageWrapper}>
                            <img src={codeFormData.sampleOutputImage} alt="Sample Output" style={s.uploadedImage} />
                            <button
                              style={s.removeImageBtn}
                              onClick={() => setCodeFormData({ ...codeFormData, sampleOutputImage: "" })}
                            >
                              <Delete sx={{ fontSize: 20 }} />
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <label style={s.uploadLabel}>
                            <CloudUpload sx={{ fontSize: 48, color: "#94a3b8" }} />
                            <span style={s.uploadText}>Click to upload screenshot</span>
                            <span style={s.uploadHint}>PNG, JPG up to 5MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={handleImageUpload}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div style={s.formModalFooter}>
                  <button style={s.cancelBtn} onClick={() => setShowFormModal(false)}>Cancel</button>
                  <button style={s.saveBtn} onClick={handleCodeSubmit} disabled={saving}>
                    <Save sx={{ fontSize: 18 }} />
                    {saving ? "Saving..." : editingQuestion ? "Update Question" : "Save Question"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div style={s.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={s.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.deleteIconWrapper}>
              <Delete sx={{ fontSize: 32, color: "#ef4444" }} />
            </div>
            <h3 style={s.deleteTitle}>Delete Question?</h3>
            <p style={s.deleteText}>Are you sure you want to delete this question? This action cannot be undone.</p>
            <div style={s.deleteActions}>
              <button style={s.cancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button style={s.confirmDeleteBtn} onClick={() => handleDelete(deleteTarget.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div style={s.modalOverlay} onClick={() => setShowResultModal(false)}>
          <div style={s.resultModal} onClick={(e) => e.stopPropagation()}>
            {resultModal.type === "success" ? (
              <CheckCircle sx={{ fontSize: 64, color: "#10b981" }} />
            ) : (
              <ErrorIcon sx={{ fontSize: 64, color: "#ef4444" }} />
            )}
            <h3 style={s.resultTitle}>{resultModal.title}</h3>
            <p style={s.resultText}>{resultModal.message}</p>
            <button
              style={resultModal.type === "success" ? s.successBtn : s.errorBtn}
              onClick={() => setShowResultModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: {
    padding: "0",
    width: "100%",
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    fontSize: "18px",
    color: "#6366f1",
  },
  header: {
    marginBottom: "24px",
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    color: "#6366f1",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "10px 16px",
    transition: "all 0.2s ease",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
    backgroundColor: "#ffffff",
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 14px",
    flex: 1,
    minWidth: "200px",
    maxWidth: "320px",
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: "14px",
    width: "100%",
    backgroundColor: "transparent",
    color: "#1e293b",
  },
  selectWrapper: {
    position: "relative",
    minWidth: "140px",
  },
  filterSelect: {
    appearance: "none",
    padding: "10px 36px 10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#334155",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    width: "100%",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "auto",
  },
  tabsContainer: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  tabBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "30px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabBtnActive: {
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.3)",
  },
  tabCount: {
    padding: "2px 10px",
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  questionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  // Collapsible Card Styles
  collapsibleCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    transition: "all 0.2s",
  },
  collapsibleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    backgroundColor: "#ffffff",
  },
  collapsibleLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flex: 1,
    minWidth: 0,
  },
  questionNumber: {
    padding: "6px 12px",
    background: "#4f46e5",
    color: "#ffffff",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.3)",
  },
  collapsibleTags: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  collapsibleQuestion: {
    fontSize: "14px",
    color: "#475569",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  collapsibleRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  collapsibleContent: {
    borderTop: "1px solid #e2e8f0",
    padding: "24px",
    backgroundColor: "#fafbfc",
  },
  collapsibleCodeContent: {
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#fafbfc",
  },
  // MCQ Card Styles
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    padding: "24px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  cardTags: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  mcqTag: {
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  levelTag: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
  },
  topicTag: {
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    backgroundColor: "#dbeafe",
    color: "#2563eb",
  },
  cardActions: {
    display: "flex",
    gap: "8px",
  },
  iconBtn: {
    padding: "10px",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  questionText: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#1e293b",
    lineHeight: "1.7",
    marginBottom: "24px",
  },
  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "14px",
    marginBottom: "24px",
  },
  optionBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 20px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  correctOption: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  optionLabel: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "#64748b",
    flexShrink: 0,
  },
  correctLabel: {
    backgroundColor: "#22c55e",
    color: "#fff",
  },
  optionText: {
    fontSize: "14px",
    color: "#334155",
    fontWeight: "400",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "20px",
    borderTop: "1px solid #f1f5f9",
  },
  questionId: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  addedBy: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  // Practical Card Styles - New Layout
  practicalCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  practicalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px",
    borderBottom: "1px solid #f1f5f9",
  },
  headerLeft: {
    flex: 1,
  },
  practicalTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  practicalDesc: {
    fontSize: "14px",
    color: "#64748b",
    margin: "0 0 16px 0",
  },
  practicalTags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  practicalTag: {
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
  },
  editBtnOutline: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "#fff",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  removeBtnOutline: {
    padding: "8px 16px",
    backgroundColor: "#fff",
    color: "#ef4444",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  // Two Column Layout
  twoColumnLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    height: "550px",
  },
  leftColumn: {
    padding: "24px",
    borderRight: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflowY: "auto",
  },
  rightColumn: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  sectionBox: {
    backgroundColor: "#fff",
    flexShrink: 0,
  },
  sectionBoxFill: {
    backgroundColor: "#fff",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  sectionHeader: {
    marginBottom: "12px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  sectionSubtitle: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  instructionContent: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #e2e8f0",
  },
  instructionLine: {
    fontSize: "14px",
    color: "#334155",
    lineHeight: "1.7",
    margin: "4px 0",
  },
  checklistContent: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #e2e8f0",
  },
  checklistItem: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.8",
    margin: "2px 0",
  },
  imageContainerFill: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "200px",
  },
  previewBox: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e2e8f0",
  },
  previewTitle: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#334155",
  },
  previewLabel: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  previewImageWrapper: {
    padding: "16px",
    backgroundColor: "#f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    overflow: "auto",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    objectFit: "contain",
  },
  previewNote: {
    padding: "12px 16px",
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
    backgroundColor: "#fff",
    borderTop: "1px solid #e2e8f0",
  },
  noImagePlaceholder: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "2px dashed #e2e8f0",
    padding: "40px",
    textAlign: "center",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    margin: "12px 0 4px 0",
  },
  placeholderHint: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
  },
  codeSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  codeSectionHeader: {
    marginBottom: "12px",
    flexShrink: 0,
  },
  codeTabs: {
    display: "flex",
    gap: "4px",
    marginBottom: "12px",
    flexShrink: 0,
  },
  codeTabBtn: {
    padding: "8px 20px",
    backgroundColor: "#f1f5f9",
    border: "none",
    borderRadius: "6px 6px 0 0",
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  codeTabActive: {
    backgroundColor: "#1e293b",
    color: "#fff",
  },
  codeBlockWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  codeBlock: {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    padding: "16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "'Fira Code', 'Consolas', monospace",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    flex: 1,
    margin: 0,
  },
  codeBlockSmall: {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontFamily: "'Fira Code', 'Consolas', monospace",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  outputLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    margin: "16px 0 8px 0",
    flexShrink: 0,
  },
  // Footer
  practicalFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
  },
  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#64748b",
  },
  footerItem: {
    fontSize: "13px",
    color: "#64748b",
  },
  footerDivider: {
    color: "#cbd5e1",
  },
  duplicateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#6366f1",
    border: "none",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  // Empty State
  emptyState: {
    textAlign: "center",
    padding: "64px 24px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#0f172a",
    marginTop: "16px",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  // Pagination
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "24px",
    padding: "16px 24px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    flexWrap: "wrap",
    gap: "12px",
  },
  paginationInfo: {
    fontSize: "14px",
    color: "#64748b",
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  pageBtn: {
    padding: "8px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  pageBtnActive: {
    backgroundColor: "#6366f1",
    color: "#ffffff",
    borderColor: "#6366f1",
  },
  // Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  formModal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  formModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px",
    borderBottom: "1px solid #e2e8f0",
  },
  formModalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    padding: "8px",
    backgroundColor: "#f8fafc",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#64748b",
  },
  formModalBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
  },
  formTabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    backgroundColor: "#f8fafc",
    padding: "6px",
    borderRadius: "8px",
  },
  formTabBtn: {
    flex: 1,
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
  },
  formTabBtnActive: {
    backgroundColor: "#fff",
    color: "#0f172a",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  formTabContent: {
    minHeight: "300px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#1e293b",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#1e293b",
    backgroundColor: "#fff",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  codeInput: {
    width: "100%",
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "'Fira Code', 'Consolas', monospace",
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
    resize: "vertical",
    boxSizing: "border-box",
  },
  optionsForm: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  optionFormRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "2px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  optionFormLabel: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "700",
    flexShrink: 0,
  },
  optionInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    backgroundColor: "#fff",
  },
  hint: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "8px",
  },
  listItems: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "12px",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#334155",
  },
  removeItemBtn: {
    padding: "4px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#ef4444",
  },
  addItemRow: {
    display: "flex",
    gap: "8px",
  },
  addItemBtn: {
    padding: "10px 14px",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  uploadArea: {
    border: "2px dashed #e2e8f0",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
    backgroundColor: "#f8fafc",
  },
  uploadLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
  },
  uploadText: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#334155",
  },
  uploadHint: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  uploadedImageWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  uploadedImage: {
    maxWidth: "100%",
    maxHeight: "300px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  removeImageBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  formModalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    paddingTop: "24px",
    borderTop: "1px solid #e2e8f0",
    marginTop: "24px",
  },
  cancelBtn: {
    padding: "12px 24px",
    backgroundColor: "#f8fafc",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(99, 102, 241, 0.2)",
  },
  deleteModal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
  },
  deleteIconWrapper: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  deleteTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "8px",
  },
  deleteText: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
  },
  deleteActions: {
    display: "flex",
    gap: "12px",
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  resultModal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
  },
  resultTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    marginTop: "16px",
    marginBottom: "8px",
  },
  resultText: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "24px",
  },
  successBtn: {
    padding: "12px 32px",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  errorBtn: {
    padding: "12px 32px",
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default QuestionBank;
