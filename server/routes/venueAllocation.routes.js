import express from 'express';
import {
  getAvailableYears,
  getDepartments,
  getAllVenues,
  getVenueLocations,
  getStudents,
  previewAllocation,
  executeAllocation,
  createVenue,
  deleteVenue,
  getAllocationStats,
  getExpiringAllocations,
  getActiveSchedules,
  checkScheduleConflict,
  getStudentVenueMapping,
  updateScheduleDates,
  getAlerts
} from '../controllers/venueAllocation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication (Super Admin only)

// Get available years with student counts
router.get('/years', authenticate, getAvailableYears);

// Get departments for a specific year
router.get('/departments', authenticate, getDepartments);

// Get all venues from database
router.get('/venues', authenticate, getAllVenues);

// Get unique venue locations
router.get('/locations', authenticate, getVenueLocations);

// Get students with filters
router.post('/students', authenticate, getStudents);

// Preview allocation before executing
router.post('/preview', authenticate, previewAllocation);

// Execute the allocation
router.post('/execute', authenticate, executeAllocation);

// Create a new venue
router.post('/create-venue', authenticate, createVenue);

// Delete a venue
router.delete('/venue/:venueId', authenticate, deleteVenue);

// Get allocation statistics
router.get('/stats', authenticate, getAllocationStats);

// NEW: Scheduling and notification endpoints

// Get expiring allocations (schedules ending within X days)
router.get('/expiring', authenticate, getExpiringAllocations);

// Get active allocation schedules/batches
router.get('/schedules', authenticate, getActiveSchedules);

// Check if schedule exists for date range
router.post('/check-schedule', authenticate, checkScheduleConflict);

// Get detailed student-venue mappings
router.get('/mappings', authenticate, getStudentVenueMapping);

// Update/extend schedule dates for a batch
router.put('/schedule/:batchCode', authenticate, updateScheduleDates);

// Get notification alerts for admin dashboard
router.get('/alerts', authenticate, getAlerts);

export default router;
