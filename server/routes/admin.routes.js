import express from 'express';
import {
  getAllUsers,
  updateUserRole,
  getUserPermissions,
  updateUserPermissions
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { adminOnly } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// All routes require authentication and admin role
router.get('/users', authenticate, adminOnly, getAllUsers);
router.put('/users/:userId/role', authenticate, adminOnly, updateUserRole);
router.get('/users/:userId/permissions', authenticate, adminOnly, getUserPermissions);
router.post('/users/:userId/permissions', authenticate, adminOnly, updateUserPermissions);

export default router;
