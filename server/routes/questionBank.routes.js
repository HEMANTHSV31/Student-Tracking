import express from 'express';
import * as questionBankController from '../controllers/questionBank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, adminOnly, facultyOrAdmin } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// =====================================================
// COURSE ROUTES
// =====================================================

/**
 * @route   GET /api/question-bank/courses
 * @desc    Get all skill courses
 * @access  Admin, Faculty
 */
router.get(
  '/courses',
  authenticate,
  facultyOrAdmin,
  questionBankController.getAllCourses
);

/**
 * @route   GET /api/question-bank/courses/:id
 * @desc    Get single course by ID
 * @access  Admin, Faculty
 */
router.get(
  '/courses/:id',
  authenticate,
  facultyOrAdmin,
  questionBankController.getCourseById
);

/**
 * @route   POST /api/question-bank/courses
 * @desc    Create new skill course
 * @access  Admin only
 */
router.post(
  '/courses',
  authenticate,
  adminOnly,
  questionBankController.createCourse
);

/**
 * @route   PUT /api/question-bank/courses/:id
 * @desc    Update skill course
 * @access  Admin only
 */
router.put(
  '/courses/:id',
  authenticate,
  adminOnly,
  questionBankController.updateCourse
);

/**
 * @route   DELETE /api/question-bank/courses/:id
 * @desc    Delete skill course (soft delete)
 * @access  Admin only
 */
router.delete(
  '/courses/:id',
  authenticate,
  adminOnly,
  questionBankController.deleteCourse
);

// =====================================================
// QUESTION ROUTES
// =====================================================

/**
 * @route   GET /api/question-bank/questions
 * @desc    Get all questions with filters
 * @access  Admin, Faculty
 * @query   course_id, question_type, difficulty_level, status, search
 */
router.get(
  '/questions',
  authenticate,
  facultyOrAdmin,
  questionBankController.getAllQuestions
);

/**
 * @route   GET /api/question-bank/questions/:id
 * @desc    Get single question by ID with full details
 * @access  Admin, Faculty
 */
router.get(
  '/questions/:id',
  authenticate,
  facultyOrAdmin,
  questionBankController.getQuestionById
);

/**
 * @route   POST /api/question-bank/questions
 * @desc    Create new question (MCQ or Coding)
 * @access  Admin, Faculty
 */
router.post(
  '/questions',
  authenticate,
  facultyOrAdmin,
  questionBankController.createQuestion
);

/**
 * @route   PUT /api/question-bank/questions/:id
 * @desc    Update existing question
 * @access  Admin, Faculty (creator only)
 */
router.put(
  '/questions/:id',
  authenticate,
  facultyOrAdmin,
  questionBankController.updateQuestion
);

/**
 * @route   DELETE /api/question-bank/questions/:id
 * @desc    Delete question (soft delete if has submissions)
 * @access  Admin only
 */
router.delete(
  '/questions/:id',
  authenticate,
  adminOnly,
  questionBankController.deleteQuestion
);

/**
 * @route   GET /api/question-bank/questions/by-course/:courseId
 * @desc    Get questions by course
 * @access  Admin, Faculty
 * @query   question_type (optional)
 */
router.get(
  '/questions/by-course/:courseId',
  authenticate,
  facultyOrAdmin,
  questionBankController.getQuestionsByCourse
);

/**
 * @route   GET /api/question-bank/statistics
 * @desc    Get question bank statistics for dashboard
 * @access  Admin, Faculty
 */
router.get(
  '/statistics',
  authenticate,
  facultyOrAdmin,
  questionBankController.getStatistics
);

export default router;
