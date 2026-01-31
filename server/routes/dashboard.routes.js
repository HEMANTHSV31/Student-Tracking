import express from 'express';
import { 
  getDashboardMetrics,
  getAttendanceByDepartment,
  getTaskCompletion,
  getAlerts,
  getUnmarkedAttendanceVenues,
  getPendingTaskAssignments
} from '../controllers/dashboard.controller.js';
import { getStudentDashboardStats, getStudentTaskCompletionStats } from '../controllers/studentDashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Dashboard routes
router.get('/metrics', getDashboardMetrics);
// Student dashboard stats (StudentDashboard.jsx uses /dashboard/stats)
router.get('/stats', getStudentDashboardStats);
// Student task completion stats for donut chart
router.get('/task-completion-stats', getStudentTaskCompletionStats);
router.get('/attendance-by-dept', getAttendanceByDepartment);
router.get('/task-completion', getTaskCompletion);
router.get('/alerts', getAlerts); // Supports pagination: /api/dashboard/alerts?page=1&limit=3
router.get('/unmarked-attendance', getUnmarkedAttendanceVenues); // Venues with unmarked attendance for today
router.get('/pending-tasks', getPendingTaskAssignments); // Pending task assignments for students

export default router;