// routes/skillOrder.routes.js
import express from 'express';
import {
  getSkillOrders,
  getSkillOrderForVenue,
  createSkillOrder,
  updateSkillOrder,
  reorderSkills,
  deleteSkillOrder,
  deleteCourseType,
  getStudentSkillProgression,
  getAvailableSkillNames,
  getCourseTypes,
  validateCourseType,
  updateSkillOrderAssociations,
  getCourseTypesForStudent
} from '../controllers/skillOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============ PUBLIC ROUTES (Authenticated) ============

// Get all skill orders (with optional filters)
router.get('/', authenticate, getSkillOrders);

// Get available skill names (for dropdowns)
router.get('/available-skills', authenticate, getAvailableSkillNames);

// Get unique course types from skill_order table
router.get('/course-types', authenticate, getCourseTypes);

// Get course types available for logged-in student's venue
router.get('/student/course-types', authenticate, getCourseTypesForStudent);

// Get skill order for a specific venue (with fallback to global)
router.get('/venue/:venue_id', authenticate, getSkillOrderForVenue);

// Get student's skill progression status
router.get('/student/:student_id/progression', authenticate, getStudentSkillProgression);

// ============ ADMIN/FACULTY ROUTES ============

// Create new skill order entry
router.post('/', authenticate, createSkillOrder);

// Validate course type (check if it doesn't already exist)
router.post('/course-type', authenticate, validateCourseType);

// Update skill order entry
router.put('/:id', authenticate, updateSkillOrder);

// Update venue and year associations for a skill order
router.put('/:id/associations', authenticate, updateSkillOrderAssociations);

// Bulk reorder skills
router.put('/reorder/bulk', authenticate, reorderSkills);

// Delete skill order entry
router.delete('/:id', authenticate, deleteSkillOrder);

// Delete entire course type (all skills in that course type)
router.delete('/course-type/:course_type', authenticate, deleteCourseType);

export default router;
