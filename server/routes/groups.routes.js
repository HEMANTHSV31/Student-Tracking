import express from 'express';
import multer from 'multer';
import { 
  getAllVenues,
  getGroupSpecifications,
  createVenue,
  updateVenue,
  deleteVenue,
  assignFacultyToVenue,
  addIndividualStudentToVenue,
  bulkUploadStudentsToVenue,
  allocateStudentsByRollRange,
  getVenueStudents,
  getVenueDetails,
  removeStudentFromVenue,
  bulkRemoveStudentsFromVenue,
  getAllFacultiesForGroups,
    getAvailableFaculties,
  searchVenues,
  lookupStudentByRollNumber
} from '../controllers/groups.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { facultyOrPermission } from '../middleware/role.middleware.enhanced.js';

const router = express.Router();

// Multer configuration for Excel uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd. ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Student lookup for auto-fill (MUST be before parameterized venue routes)
router.get('/student-lookup/:rollNumber', authenticate, facultyOrPermission('classes'), lookupStudentByRollNumber);

// Venue routes
router.get('/venues', authenticate, facultyOrPermission('classes'), getAllVenues);
router.get('/venues/group-specifications', authenticate, facultyOrPermission('classes'), getGroupSpecifications);
router.get('/venues/search', authenticate, facultyOrPermission('classes'), searchVenues);
router.get('/venues/:venueId/details', authenticate, facultyOrPermission('classes'), getVenueDetails);
router.post('/venues', authenticate, facultyOrPermission('classes'), createVenue);
router.put('/venues/:venueId', authenticate, facultyOrPermission('classes'), updateVenue);
router.delete('/venues/:venueId', authenticate, facultyOrPermission('classes'), deleteVenue);
router.put('/venues/:venueId/assign-faculty', authenticate, facultyOrPermission('classes'), assignFacultyToVenue);

// Student allocation routes
router.post('/venues/:venueId/bulk-upload', authenticate, facultyOrPermission('classes'), upload.single('file'), bulkUploadStudentsToVenue);
router.post('/venues/:venueId/allocate-range', authenticate, facultyOrPermission('classes'), allocateStudentsByRollRange);
router.post('/venues/:venueId/add-student', authenticate, facultyOrPermission('classes'), addIndividualStudentToVenue);
router.get('/venues/:venueId/students', authenticate, facultyOrPermission('classes'), getVenueStudents);
router.delete('/venues/:venueId/students/:studentId', authenticate, facultyOrPermission('classes'), removeStudentFromVenue);
router.post('/venues/:venueId/bulk-remove-students', authenticate, facultyOrPermission('classes'), bulkRemoveStudentsFromVenue);

// Faculty routes
router.get('/faculties', authenticate, facultyOrPermission('classes'), getAllFacultiesForGroups);
router.get('/faculties/available', authenticate, facultyOrPermission('classes'), getAvailableFaculties);

export default router;