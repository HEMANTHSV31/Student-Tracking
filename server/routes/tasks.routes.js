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
  submitTask,
  downloadSubmission,
  syncTaskSubmissions,
  extendTaskDueDate,
  upload,
  studentUpload
} from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { studentOnly, facultyOrAdmin, adminOnly } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// ============ STUDENT ROUTES ============
// Get all tasks for authenticated student (uses JWT)
router.get('/student', authenticate, studentOnly, getStudentTasks);

// Submit task assignment (file or link) - STRICT: PDF/DOCX only
router.post('/:task_id/submit', authenticate, studentOnly, studentUpload.single('file'), submitTask);

// Download own submission file
router.get('/submissions/:submission_id/download', authenticate, downloadSubmission);

// Student routes - submit assignment (old route, kept for compatibility) - STRICT: PDF/DOCX only
router.put('/submit/:submission_id', authenticate, studentOnly, studentUpload.single('file'), submitAssignmentFile);

// ============ FACULTY/ADMIN ROUTES ============
// Faculty/Admin routes - get venues (uses JWT to identify user)
router.get('/venues', authenticate, facultyOrAdmin, getVenuesForFaculty);

// Faculty/Admin routes - manage tasks
router.post('/create', authenticate, facultyOrAdmin, upload.array('files', 10), createTask);
router.get('/all-venues', authenticate, facultyOrAdmin, getTasksAllVenues);
router.get('/venue/:venue_id', authenticate, facultyOrAdmin, getTasksByVenue);
router.get('/details/:task_id', authenticate, facultyOrAdmin, getTaskDetails);
router.put('/status/:task_id', authenticate, facultyOrAdmin, toggleTaskStatus);
router.delete('/delete/:task_id', authenticate, facultyOrAdmin, deleteTask);

// Sync task submissions for newly added students
router.post('/sync/:venue_id', authenticate, facultyOrAdmin, syncTaskSubmissions);

// Submissions/Reports routes - for faculty grading
router.get('/submissions/:task_id', authenticate, facultyOrAdmin, getTaskSubmissions);
router.put('/grade/:submission_id', authenticate, facultyOrAdmin, gradeSubmission);

// Extend task due date for specific student
router.put('/extend/:task_id/student/:student_id', authenticate, facultyOrAdmin, extendTaskDueDate);

// Error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err) {
    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the limit of 5MB'
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