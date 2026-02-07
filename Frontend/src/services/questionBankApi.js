/**
 * Question Bank API Service
 * Handles all API calls for Student and Faculty Question Bank features
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/pbl/api';

/**
 * Generic fetch wrapper with error handling
 */
const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response. Please check if the backend server is running correctly.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    // Only log to console, don't throw error that breaks UI
    console.warn('API request failed:', url, error.message);
    // Return empty success response so UI shows empty state instead of error
    return { success: false, data: [] };
  }
};

// ==================== STUDENT API FUNCTIONS ====================

/**
 * Get all assigned tasks for the logged-in student
 * @returns {Promise<Object>} Tasks grouped by status
 */
export const getMyAssignedTasks = async () => {
  return apiFetch('/student/question-bank/my-tasks');
};

/**
 * Get question details for a specific task
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} Question details (MCQ answers hidden)
 */
export const getTaskQuestion = async (taskId) => {
  return apiFetch(`/student/question-bank/task/${taskId}/question`);
};

/**
 * Submit MCQ answer
 * @param {number} taskId - Task ID
 * @param {number} selectedOption - Selected option (1-4)
 * @returns {Promise<Object>} Auto-graded result
 */
export const submitMCQAnswer = async (taskId, selectedOption) => {
  return apiFetch('/student/question-bank/submit-mcq', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, selected_option: selectedOption }),
  });
};

/**
 * Submit coding solution
 * @param {number} taskId - Task ID
 * @param {string} code - Student's code solution
 * @param {string} language - Programming language (default: 'python')
 * @returns {Promise<Object>} Submission confirmation
 */
export const submitCodingSolution = async (taskId, code, language = 'python') => {
  return apiFetch('/student/question-bank/submit-code', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, code_solution: code, language }),
  });
};

/**
 * Get submission history for a task
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} All attempts with scores and feedback
 */
export const getMySubmissionHistory = async (taskId) => {
  return apiFetch(`/student/question-bank/my-submissions/${taskId}`);
};

/**
 * Execute code in sandbox (placeholder - requires sandbox integration)
 * @param {string} code - Code to execute
 * @param {string} language - Programming language
 * @param {Array} testCases - Test cases to run
 * @returns {Promise<Object>} Execution results
 */
export const executeCode = async (code, language, testCases) => {
  return apiFetch('/student/question-bank/execute-code', {
    method: 'POST',
    body: JSON.stringify({ code, language, test_cases: testCases }),
  });
};

// ==================== FACULTY API FUNCTIONS ====================

/**
 * Get all pending coding submissions for faculty's venues
 * @param {number} venueId - Optional venue filter
 * @returns {Promise<Object>} Pending submissions list
 */
export const getPendingSubmissions = async (venueId = null) => {
  const url = venueId
    ? `/faculty/question-bank/pending-submissions?venue_id=${venueId}`
    : '/faculty/question-bank/pending-submissions';
  return apiFetch(url);
};

/**
 * Get detailed submission for grading
 * @param {number} submissionId - Submission ID
 * @returns {Promise<Object>} Full submission details with code, question, test cases
 */
export const getSubmissionDetails = async (submissionId) => {
  return apiFetch(`/faculty/question-bank/submission/${submissionId}`);
};

/**
 * Grade a coding submission
 * @param {number} submissionId - Submission ID
 * @param {number} score - Score (0-100)
 * @param {string} feedback - Grading feedback
 * @returns {Promise<Object>} Grading result with reassignment info
 */
export const gradeSubmission = async (submissionId, score, feedback) => {
  return apiFetch('/faculty/question-bank/grade-submission', {
    method: 'POST',
    body: JSON.stringify({ submission_id: submissionId, score, feedback }),
  });
};

/**
 * Get student progress analytics
 * @param {number} venueId - Venue ID
 * @param {number} studentId - Optional student filter
 * @returns {Promise<Object>} Student progress data
 */
export const getStudentProgress = async (venueId, studentId = null) => {
  const url = studentId
    ? `/faculty/question-bank/student-progress?venue_id=${venueId}&student_id=${studentId}`
    : `/faculty/question-bank/student-progress?venue_id=${venueId}`;
  return apiFetch(url);
};

/**
 * Reassign a different question to a student
 * @param {number} taskId - Task ID
 * @param {number} newQuestionId - New question ID
 * @returns {Promise<Object>} Reassignment confirmation
 */
export const reassignQuestion = async (taskId, newQuestionId) => {
  return apiFetch('/faculty/question-bank/reassign-question', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId, new_question_id: newQuestionId }),
  });
};

/**
 * Get graded submissions (both MCQ and Coding)
 * @param {number} venueId - Optional venue filter
 * @param {string} questionType - Optional filter: 'MCQ' or 'Coding'
 * @returns {Promise<Object>} Graded submissions list
 */
export const getGradedSubmissions = async (venueId = null, questionType = null) => {
  let url = '/faculty/question-bank/graded-submissions?';
  if (venueId) url += `venue_id=${venueId}&`;
  if (questionType) url += `question_type=${questionType}`;
  return apiFetch(url);
};

// ==================== ADMIN API FUNCTIONS (Existing) ====================

/**
 * Get all courses for question bank
 * @returns {Promise<Object>} List of courses
 */
export const getAllCourses = async () => {
  return apiFetch('/question-bank/courses');
};

/**
 * Create a new course
 * @param {Object} courseData - Course details
 * @returns {Promise<Object>} Created course
 */
export const createCourse = async (courseData) => {
  return apiFetch('/question-bank/courses', {
    method: 'POST',
    body: JSON.stringify(courseData),
  });
};

/**
 * Update existing course
 * @param {number} courseId - Course ID
 * @param {Object} courseData - Updated course data
 * @returns {Promise<Object>} Updated course
 */
export const updateCourse = async (courseId, courseData) => {
  return apiFetch(`/question-bank/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(courseData),
  });
};

/**
 * Delete course
 * @param {number} courseId - Course ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteCourse = async (courseId) => {
  return apiFetch(`/question-bank/courses/${courseId}`, {
    method: 'DELETE',
  });
};

/**
 * Create a new question
 * @param {Object} questionData - Question details
 * @returns {Promise<Object>} Created question
 */
export const createQuestion = async (questionData) => {
  return apiFetch('/question-bank/questions', {
    method: 'POST',
    body: JSON.stringify(questionData),
  });
};

/**
 * Update existing question
 * @param {number} questionId - Question ID
 * @param {Object} questionData - Updated question data
 * @returns {Promise<Object>} Updated question
 */
export const updateQuestion = async (questionId, questionData) => {
  return apiFetch(`/question-bank/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(questionData),
  });
};

/**
 * Delete question
 * @param {number} questionId - Question ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteQuestion = async (questionId) => {
  return apiFetch(`/question-bank/questions/${questionId}`, {
    method: 'DELETE',
  });
};

/**
 * Get question by ID
 * @param {number} questionId - Question ID
 * @returns {Promise<Object>} Question details
 */
export const getQuestionById = async (questionId) => {
  return apiFetch(`/question-bank/questions/${questionId}`);
};

/**
 * Get all questions with filters
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Questions list
 */
export const getAllQuestions = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  return apiFetch(`/question-bank/questions?${queryParams}`);
};

export default {
  // Student
  getMyAssignedTasks,
  getTaskQuestion,
  submitMCQAnswer,
  submitCodingSolution,
  getMySubmissionHistory,
  executeCode,
  // Faculty
  getPendingSubmissions,
  getSubmissionDetails,
  gradeSubmission,
  getStudentProgress,
  reassignQuestion,
  getGradedSubmissions,
  // Admin
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionById,
  getAllQuestions,
};
