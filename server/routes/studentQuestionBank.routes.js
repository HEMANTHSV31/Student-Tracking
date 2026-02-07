import express from 'express';
import {
  getMyAssignedTasks,
  getTaskQuestion,
  submitMCQAnswer,
  submitCodingSolution,
  getMySubmissionHistory,
  executeCode
} from '../controllers/studentQuestionBank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { studentOnly } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

/**
 * Student Question Bank Routes
 * All routes are protected - require authentication + student role
 */

// Get all tasks assigned to student with question bank integration
router.get('/my-tasks', authenticate, studentOnly, getMyAssignedTasks);

// Get specific question details for a task (hides correct answers for MCQ)
router.get('/task/:taskId/question', authenticate, studentOnly, getTaskQuestion);

// Submit MCQ answer (auto-graded instantly)
router.post('/submit-mcq', authenticate, studentOnly, submitMCQAnswer);

// Submit coding solution (awaits manual faculty grading)
router.post('/submit-code', authenticate, studentOnly, submitCodingSolution);

// Get submission history for a specific task (all attempts)
router.get('/my-submissions/:taskId', authenticate, studentOnly, getMySubmissionHistory);

// Execute code for testing (test run without submitting)
// Note: Requires sandboxed environment for actual execution
router.post('/execute-code', authenticate, studentOnly, executeCode);

export default router;
