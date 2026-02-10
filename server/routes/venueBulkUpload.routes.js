import express from 'express';
import multer from 'multer';
import {
  bulkUploadStudentsToVenue,
  downloadTemplate,
  getAvailableVenues,
  getAvailableFaculties
} from '../controllers/venueBulkUpload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for Excel file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx, .xls)'));
    }
  }
});

// All routes require authentication (Super Admin only)

/**
 * POST /api/venue-bulk-upload/upload
 * Upload Excel file to bulk assign students to a venue
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  bulkUploadStudentsToVenue
);

/**
 * GET /api/venue-bulk-upload/template
 * Download Excel template for bulk upload
 */
router.get(
  '/template',
  authenticate,
  downloadTemplate
);

/**
 * GET /api/venue-bulk-upload/venues
 * Get list of available venues
 */
router.get(
  '/venues',
  authenticate,
  getAvailableVenues
);

/**
 * GET /api/venue-bulk-upload/faculties
 * Get list of available faculties
 */
router.get(
  '/faculties',
  authenticate,
  getAvailableFaculties
);

export default router;
