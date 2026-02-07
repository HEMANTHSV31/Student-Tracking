import express from 'express';
import {
  getPendingSubmissions,
  getSubmissionDetails,
  gradeSubmission,
  getStudentProgress,
  reassignQuestion,
  getGradedSubmissions
} from '../controllers/facultyQuestionBank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { facultyOrAdmin } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

/**
 * Faculty Question Bank Routes
 * All routes are protected - require authentication + faculty or admin role
 */

// Get all pending coding submissions from faculty's assigned venues
router.get('/pending-submissions', authenticate, facultyOrAdmin, getPendingSubmissions);

// Get detailed information about a specific submission (for grading)
router.get('/submission/:submissionId', authenticate, facultyOrAdmin, getSubmissionDetails);

// Grade a coding submission (auto-reassigns if grade < 50%)
router.post('/grade-submission', authenticate, facultyOrAdmin, gradeSubmission);

// Get progress summary for all students in faculty's venues
router.get('/student-progress', authenticate, facultyOrAdmin, getStudentProgress);

// Manually reassign a different question to a student
router.post('/reassign-question', authenticate, facultyOrAdmin, reassignQuestion);

// Get all graded submissions (MCQ auto-graded + manually graded coding)
router.get('/graded-submissions', authenticate, facultyOrAdmin, getGradedSubmissions);

export default router;
