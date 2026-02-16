import express from 'express';
import {
  getVenuesForFaculty,
  createTask,
  getTasksByVenue,
  getTasksAllVenues,
  getTaskDetails,
  toggleTaskStatus,
  deleteTask,
  getTaskSubmissions,
  gradeSubmission,
  submitAssignmentFile,
  getVenuesByEmail,
  getStudentTasks,
  getStudentTaskById,
  submitTask,
  downloadSubmission,
  syncTaskSubmissions,
  extendTaskDueDate,
  getStudentTaskQuestions,
  submitMCQTest,
  submitCodingTask,
  submitWebCode,
  getCodingSubmissions,
  getWebCodeSubmissions,
  getWebCodeSubmissionDetail,
  gradeWebCodeSubmission,
  getCodingSubmissionDetail,
  gradeCodingSubmission,
  requestWebCodeResubmit,
  requestCodingResubmit,
  upload,
  studentUpload
} from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { studentOnly, facultyOrAdmin, adminOnly, facultyOrPermission } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// ============ STUDENT ROUTES ============
// Get all tasks for authenticated student (uses JWT)
router.get('/student', authenticate, studentOnly, getStudentTasks);

// Get single task details for student
router.get('/student/:task_id', authenticate, studentOnly, getStudentTaskById);

// Get student's assigned questions for a task (for validation)
router.get('/:task_id/questions', authenticate, studentOnly, getStudentTaskQuestions);

// Submit MCQ test answers
router.post('/:task_id/submit-mcq', authenticate, studentOnly, submitMCQTest);

// Submit coding task (HTML/CSS/JS)
router.post('/:task_id/submit-code', authenticate, studentOnly, submitCodingTask);

// Submit web workspace code (multiple files - P Skills)
router.post('/:task_id/submit-web-code', authenticate, studentOnly, submitWebCode);

// Submit task assignment (file or link) - STRICT: PDF/DOCX only
router.post('/:task_id/submit', authenticate, studentOnly, studentUpload.single('file'), submitTask);

// Download own submission file
router.get('/submissions/:submission_id/download', authenticate, downloadSubmission);

// Student routes - submit assignment (old route, kept for compatibility) - STRICT: PDF/DOCX only
router.put('/submit/:submission_id', authenticate, studentOnly, studentUpload.single('file'), submitAssignmentFile);

// ============ FACULTY/ADMIN ROUTES ============
// Faculty/Admin routes - get venues (uses JWT to identify user)
router.get('/venues', authenticate, facultyOrPermission('tasks'), getVenuesForFaculty);

// Faculty/Admin routes - manage tasks
router.post('/create', authenticate, facultyOrPermission('tasks'), upload.array('files', 10), createTask);
router.get('/all-venues', authenticate, facultyOrPermission('tasks'), getTasksAllVenues);
router.get('/venue/:venue_id', authenticate, facultyOrPermission('tasks'), getTasksByVenue);
router.get('/details/:task_id', authenticate, facultyOrPermission('tasks'), getTaskDetails);
router.put('/status/:task_id', authenticate, facultyOrPermission('tasks'), toggleTaskStatus);
router.delete('/delete/:task_id', authenticate, facultyOrPermission('tasks'), deleteTask);

// Sync task submissions for newly added students
router.post('/sync/:venue_id', authenticate, facultyOrPermission('tasks'), syncTaskSubmissions);

// Submissions/Reports routes - for faculty grading
router.get('/submissions/:task_id', authenticate, facultyOrPermission('tasks'), getTaskSubmissions);
router.put('/grade/:submission_id', authenticate, facultyOrPermission('tasks'), gradeSubmission);

// Extend task due date for specific student
router.put('/extend/:task_id/student/:student_id', authenticate, facultyOrPermission('tasks'), extendTaskDueDate);

// ============ WEB CODE SUBMISSIONS (P Skills) ============
// Get all web code submissions for a venue
router.get('/web-submissions/venue/:venue_id', authenticate, facultyOrPermission('tasks'), getWebCodeSubmissions);

// Get single web code submission with all files
router.get('/web-submissions/:submission_id', authenticate, facultyOrPermission('tasks'), getWebCodeSubmissionDetail);

// Grade a web code submission
router.put('/web-submissions/:submission_id/grade', authenticate, facultyOrPermission('tasks'), gradeWebCodeSubmission);

// Request resubmit for web code submission (when student fails)
router.put('/web-submissions/:submission_id/request-resubmit', authenticate, facultyOrAdmin, requestWebCodeResubmit);

// ============ CODING TASK SUBMISSIONS ============
// Get all coding submissions for a venue (from student_submissions table)
router.get('/coding-submissions/venue/:venue_id', authenticate, facultyOrAdmin, getCodingSubmissions);

// ============ CODE PRACTICE SUBMISSIONS (MCQ/CODING) ============
// Get single code practice submission (coding task or MCQ)
router.get('/code-submission/:submission_id', authenticate, facultyOrPermission('tasks'), getCodingSubmissionDetail);

// Grade a code practice submission (coding task)
router.put('/code-submission/:submission_id/grade', authenticate, facultyOrPermission('tasks'), gradeCodingSubmission);

// Request resubmit for coding submission (when student fails)
router.put('/code-submission/:submission_id/request-resubmit', authenticate, facultyOrAdmin, requestCodingResubmit);

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err) {
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the limit (100MB for faculty/admin, 10MB for students)'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
    
    // Custom multer/file filter errors
    if (err.message) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Generic error
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request'
    });
  }
  next();
});

export default router;