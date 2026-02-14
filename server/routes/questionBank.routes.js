import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as questionBankController from '../controllers/questionBank.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles, adminOnly, facultyOrAdmin } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// Configure multer for question image uploads (sample output images)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/questions';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'question-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) are allowed'), false);
    }
  }
});

// Configure multer for resource images (images students use in their code)
const resourceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/resources';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename but make it safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const uniqueSuffix = Date.now() + '-';
    cb(null, uniqueSuffix + safeName);
  }
});

const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for resource images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'), false);
    }
  }
});

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
  upload.single('sampleImage'),
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
  upload.single('sampleImage'),
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

// =====================================================
// RESOURCE IMAGES ROUTES (Images students use in code)
// =====================================================

/**
 * @route   POST /api/question-bank/questions/:id/resources
 * @desc    Upload resource images for a question (images students can use in their HTML/CSS)
 * @access  Admin, Faculty
 * @body    files[] - Multiple image files
 * @example POST /api/question-bank/questions/5/resources with multipart form (images[])
 */
router.post(
  '/questions/:id/resources',
  authenticate,
  facultyOrAdmin,
  resourceUpload.array('images', 10), // Max 10 images per upload
  questionBankController.uploadResourceImages
);

/**
 * @route   GET /api/question-bank/questions/:id/resources
 * @desc    Get all resource images for a question
 * @access  Admin, Faculty, Students (for their assigned questions)
 */
router.get(
  '/questions/:id/resources',
  authenticate,
  questionBankController.getResourceImages
);

/**
 * @route   PUT /api/question-bank/resources/:resourceId
 * @desc    Update a resource image (description, asset_path)
 * @access  Admin, Faculty
 */
router.put(
  '/resources/:resourceId',
  authenticate,
  facultyOrAdmin,
  questionBankController.updateResourceImage
);

/**
 * @route   DELETE /api/question-bank/resources/:resourceId
 * @desc    Delete a resource image
 * @access  Admin, Faculty
 */
router.delete(
  '/resources/:resourceId',
  authenticate,
  facultyOrAdmin,
  questionBankController.deleteResourceImage
);

export default router;
