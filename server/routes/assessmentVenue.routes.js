import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getAllVenues, createVenue, updateVenue, deleteVenue, toggleVenueStatus,
  getVenueLayout, saveVenueLayout,
  getSlots, createSlot, deleteSlot, updateSlotStatus,
  getClusters, updateCluster, deleteClusterYear,
  getYearCourses, addYearCourse, updateYearCourse, deleteYearCourse,
  saveAllocation, getAllocation, deleteAllocation,
  getMyAllocation,
  getAttendance, saveAttendance, getAttendanceStats,
} from '../controllers/assessmentVenue.controller.js';

const router = Router();

// Venue CRUD
router.get('/',              authenticate, getAllVenues);
router.post('/',             authenticate, createVenue);
router.put('/:id',           authenticate, updateVenue);
router.put('/:id/status',    authenticate, toggleVenueStatus);
router.delete('/:id',        authenticate, deleteVenue);

// Venue layout designer
router.get('/:id/layout',   authenticate, getVenueLayout);
router.put('/:id/layout',   authenticate, saveVenueLayout);

// Slot management
router.get('/slots',            authenticate, getSlots);
router.post('/slots',           authenticate, createSlot);
router.delete('/slots/:id',     authenticate, deleteSlot);
router.put('/slots/:id/status', authenticate, updateSlotStatus);

// Department clusters (year-wise)
router.get('/clusters',            authenticate, getClusters);
router.put('/clusters/:year',      authenticate, updateCluster);
router.delete('/clusters/:year',   authenticate, deleteClusterYear);

// Year-wise Courses
router.get('/courses',             authenticate, getYearCourses);
router.post('/courses',            authenticate, addYearCourse);
router.put('/courses/:id',         authenticate, updateYearCourse);
router.delete('/courses/:id',      authenticate, deleteYearCourse);

// Student self-lookup
router.get('/my-allocation', authenticate, getMyAllocation);

// Allocations
router.post('/allocations',           authenticate, saveAllocation);
router.get('/allocations/:slotId',    authenticate, getAllocation);
router.delete('/allocations/:slotId', authenticate, deleteAllocation);

// Attendance
router.get('/attendance/:slotId',       authenticate, getAttendance);
router.post('/attendance/:slotId',      authenticate, saveAttendance);
router.get('/attendance-stats/:slotId', authenticate, getAttendanceStats);

export default router;
