import express from 'express';
import { 
  getOverallLeaderboard, 
  getCourseLeaderboard,
  getMyStandings 
} from '../controllers/leaderboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get overall leaderboard
router.get('/overall', authenticate, getOverallLeaderboard);

// Get course-specific leaderboard
router.get('/course/:courseId', authenticate, getCourseLeaderboard);

// Get student's workshop standings
router.get('/my-standings', authenticate, getMyStandings);

export default router;
