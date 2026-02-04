import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Sanitize filename to prevent security vulnerabilities:
 * - Path traversal (../, ../../, ./, etc.)
 * - Command injection (backticks, ${})
 * - Special characters that could be exploited
 * - Double extensions (.pdf.exe, .docx.js)
 * - Multiple dots before extension
 */
function sanitizeFilename(filename) {
  if (!filename) return 'file';
  
  // Get the file extension first (only the last extension)
  const ext = path.extname(filename).toLowerCase();
  
  // Get filename without extension
  let baseName = path.basename(filename, ext);
  
  // Remove ALL dots, slashes, backslashes from basename (prevent double extensions)
  baseName = baseName.replace(/[.\\\/]/g, '_');
  
  // Remove dangerous characters: backticks, $, {}, semicolons, pipes, etc.
  baseName = baseName.replace(/[`${};<>|&"'\n\r\t@#%^*+=\[\]()]/g, '');
  
  // Remove any path components
  baseName = baseName.replace(/\.\./g, '');
  
  // Only allow alphanumeric, underscore, hyphen, and space
  baseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '');
  
  // Limit basename length
  if (baseName.length > 100) {
    baseName = baseName.substring(0, 100);
  }
  
  // Ensure basename is not empty
  if (!baseName || baseName.trim() === '') {
    baseName = 'file';
  }
  
  // Return sanitized name with ONLY ONE extension
  return baseName.trim() + ext;
}

/**
 * Validate file content matches declared MIME type
 */
const ALLOWED_MIMETYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'application/zip': ['.zip'],
  'text/plain': ['.txt', '.c', '.cpp', '.py', '.js', '.java'],
  'text/x-c': ['.c'],
  'text/x-c++': ['.cpp'],
  'text/x-python': ['.py'],
  'text/javascript': ['.js'],
  'application/javascript': ['.js'],
  'text/x-java': ['.java'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/tasks';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedOriginal = sanitizeFilename(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(sanitizedOriginal).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// Faculty/Admin upload - allows multiple file types
export const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit for faculty/admin
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Sanitize filename first
    const sanitizedName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedName).toLowerCase();
    
    // Block dangerous file types
    const dangerousExts = ['.exe', '.bat', '.sh', '.cmd', '.com', '.pif', '.scr', '.vbs', '.jar', '.dll', '.app', '.deb', '.rpm'];
    if (dangerousExts.includes(ext)) {
      return cb(new Error('Executable files are not allowed'));
    }
    
    // Block dangerous MIME types
    const dangerousMimes = [
      'application/x-msdownload',
      'application/x-executable',
      'application/x-sh',
      'application/x-httpd-php',
      'text/html',
      'text/x-sh'
    ];
    if (dangerousMimes.includes(file.mimetype)) {
      return cb(new Error('This file type is not allowed for security reasons'));
    }
    
    // Validate MIME type matches extension
    const allowedExts = Object.values(ALLOWED_MIMETYPES).flat();
    if (!allowedExts.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed. Allowed: PDF, images, videos, code files, documents`));
    }
    
    // Validate MIME type is in whitelist
    const mimeAllowed = Object.keys(ALLOWED_MIMETYPES).includes(file.mimetype);
    if (!mimeAllowed) {
      return cb(new Error('Invalid file content type'));
    }
    
    // Validate extension matches MIME type
    const expectedExts = ALLOWED_MIMETYPES[file.mimetype];
    if (expectedExts && !expectedExts.includes(ext)) {
      return cb(new Error('File extension does not match content type'));
    }
    
    cb(null, true);
  }
});

// Student upload - ONLY PDF and DOCX allowed (strict security)
export const studentUpload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit for students
    files: 1 // Students can only upload 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    const sanitizedName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedName).toLowerCase();
    
    // STRICT: Only PDF and DOCX allowed for students
    const allowedExts = ['.pdf', '.docx'];
    const allowedMimes = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    
    // Check extension
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Students can only upload PDF or DOCX files'));
    }
    
    // Check MIME type
    if (!Object.keys(allowedMimes).includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF and DOCX documents are allowed'));
    }
    
    // Verify extension matches MIME type
    if (allowedMimes[file.mimetype] !== ext) {
      return cb(new Error('File extension does not match document type'));
    }
    
    cb(null, true);
  }
});

// backend/controllers/tasks.controller.js
// backend/controllers/tasks.controller.js

export const getVenuesForFaculty = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.user_id;


    // ✅ FIX: JOIN with role table to get role name
    const [adminCheck] = await db.query(`
      SELECT r.role 
      FROM users u 
      JOIN role r ON u.role_id = r. role_id
      WHERE u.user_id = ?  
    `, [userId]);

    let query;
    let params;

    if (adminCheck. length > 0 && adminCheck[0].role === 'admin') {
      
      query = `
        SELECT 
          v.venue_id,
          v.venue_name,
          v.capacity,
          COUNT(DISTINCT gs.student_id) as student_count
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
        WHERE v.status = 'Active'
        GROUP BY v.venue_id
        ORDER BY v.venue_name
      `;
      params = [];
      
    } else {
      
      // Get faculty_id from user_id
      const [faculty] = await db.query('SELECT faculty_id FROM faculties WHERE user_id = ?', [userId]);
      
      // console.log(`[GET VENUES] user_id: ${userId}, faculty record found:`, faculty.length > 0, faculty.length > 0 ? `faculty_id: ${faculty[0].faculty_id}` : 'NO FACULTY RECORD');
      
      if (faculty.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Faculty record not found'
        });
      }
      
      query = `
        SELECT 
          v.venue_id,
          v.venue_name,
          v.capacity,
          COUNT(DISTINCT gs.student_id) as student_count
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs. group_id AND gs.status = 'Active'
        WHERE v.assigned_faculty_id = ?  AND v.status = 'Active'
        GROUP BY v.venue_id
        ORDER BY v. venue_name
      `;
      params = [faculty[0].faculty_id];
      // console.log(`[GET VENUES] Querying venues for faculty_id: ${faculty[0].faculty_id}`);
    }

    const [venues] = await db.query(query, params);
    // console.log(`[GET VENUES] Found ${venues.length} venue(s)`);

    res.status(200).json({
      success: true,
      data: venues
    });
    
  } catch (error) {
    console.error(' Error fetching venues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
};
// Create new task/assignment
export const createTask = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { title, description, venue_id, day, due_date, max_score, material_type, external_url, skill_filter, course_type, apply_to_all_venues } = req.body;

    if (!title || !venue_id || !day || !max_score) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, venue, day, and max score'
      });
    }

    // Get faculty_id from JWT token
    const userId = req.user.user_id;
    let faculty_id;

    if (req.user.role === 'admin') {
      // Admin can create tasks - try to get their faculty_id, or use the venue's assigned faculty
      const [faculty] = await connection.query('SELECT faculty_id FROM faculties WHERE user_id = ?', [userId]);
      if (faculty.length > 0) {
        faculty_id = faculty[0].faculty_id;
      } else {
        // Admin is not a faculty - use the venue's assigned faculty instead
        const [venueData] = await connection.query('SELECT assigned_faculty_id FROM venue WHERE venue_id = ?', [venue_id]);
        if (venueData.length > 0 && venueData[0].assigned_faculty_id) {
          faculty_id = venueData[0].assigned_faculty_id;
        } else {
          // No faculty assigned to venue - get any active faculty as fallback
          const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
          if (anyFaculty.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No faculty available. Please create a faculty account first.'
            });
          }
          faculty_id = anyFaculty[0].faculty_id;
        }
      }
    } else {
      // Faculty must use their own faculty_id
      const [faculty] = await connection.query('SELECT faculty_id FROM faculties WHERE user_id = ?', [userId]);
      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not registered as faculty'
        });
      }
      faculty_id = faculty[0].faculty_id;

      // Check if faculty is assigned to this venue
      const [venueCheck] = await connection.query(`
        SELECT venue_id FROM venue WHERE venue_id = ? AND assigned_faculty_id = ?
      `, [venue_id, faculty_id]);

      if (venueCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create tasks for this venue'
        });
      }
    }

    await connection.beginTransaction();

    // ALWAYS check if there's a skill order that restricts venues/years for this task
    let skillOrderVenues = [];
    let skillOrderRestricted = false;
    
    if (course_type && (apply_to_all_venues === 'true' || apply_to_all_venues === true)) {
      // When "All Venues" is selected, check ALL skill orders for this course_type
      // Get the union of allowed venues across all skills in this course_type
      const [skillOrderCheck] = await connection.query(`
        SELECT so.id, so.skill_name, so.apply_to_all_venues
        FROM skill_order so
        WHERE so.course_type = ? AND so.apply_to_all_venues = 0
      `, [course_type]);

      if (skillOrderCheck.length > 0) {
        // Collect all venues that are allowed for this course_type
        const venueSet = new Set();
        
        for (const skillOrder of skillOrderCheck) {
          const [venueRestrictions] = await connection.query(`
            SELECT venue_id FROM skill_order_venues WHERE skill_order_id = ?
          `, [skillOrder.id]);
          
          // Add all allowed venues to the set
          venueRestrictions.forEach(v => venueSet.add(v.venue_id));
        }
        
        if (venueSet.size > 0) {
          skillOrderVenues = Array.from(venueSet);
          skillOrderRestricted = true;
        }
      }
    } else if (skill_filter && course_type) {
      // Check if skill order exists with venue restrictions for this specific skill
      const [skillOrderCheck] = await connection.query(`
        SELECT so.id, so.apply_to_all_venues
        FROM skill_order so
        WHERE so.skill_name = ? AND so.course_type = ?
      `, [skill_filter.trim(), course_type]);

      if (skillOrderCheck.length > 0) {
        const skillOrder = skillOrderCheck[0];
        
        // If skill order doesn't apply to all venues, get specific venues
        if (!skillOrder.apply_to_all_venues || skillOrder.apply_to_all_venues === 0) {
          const [venueRestrictions] = await connection.query(`
            SELECT venue_id FROM skill_order_venues WHERE skill_order_id = ?
          `, [skillOrder.id]);
          
          if (venueRestrictions.length > 0) {
            skillOrderVenues = venueRestrictions.map(v => v.venue_id);
            skillOrderRestricted = true;
          }
        }
      }
    }

    // Determine venues to create tasks for
    let targetVenues = [];
    let group_id = null;
    
    if (skillOrderRestricted) {
      // PRIORITY 1: If skill order has venue restrictions, ONLY use those venues
      targetVenues = skillOrderVenues;
      group_id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else if (apply_to_all_venues === 'true' || apply_to_all_venues === true) {
      // PRIORITY 2: User selected "all venues" and no skill order restrictions
      const [allVenues] = await connection.query(`
        SELECT venue_id FROM venue WHERE status = 'Active'
      `);
      targetVenues = allVenues.map(v => v.venue_id);
      group_id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // PRIORITY 3: Single venue selected
      targetVenues = [parseInt(venue_id)];
    }

    const createdTasks = [];
    let totalStudents = 0;

    // Create task for each target venue
    for (const target_venue_id of targetVenues) {
      // Get venue's faculty or use the provided one
      let venue_faculty_id = faculty_id;
      
      if (apply_to_all_venues) {
        // For multi-venue, try to use each venue's assigned faculty
        const [venueData] = await connection.query(
          'SELECT assigned_faculty_id FROM venue WHERE venue_id = ?', 
          [target_venue_id]
        );
        if (venueData.length > 0 && venueData[0].assigned_faculty_id) {
          venue_faculty_id = venueData[0].assigned_faculty_id;
        }
      }

      // Insert task
      const [taskResult] = await connection.query(`
        INSERT INTO tasks (group_id, title, description, venue_id, faculty_id, day, due_date, max_score, material_type, external_url, skill_filter, course_type, status, is_template, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, NOW())
      `, [group_id, title, description || '', target_venue_id, venue_faculty_id, day, due_date || null, max_score, material_type, external_url || null, skill_filter || null, course_type || null, group_id ? 1 : 0]);

      const taskId = taskResult.insertId;
      createdTasks.push({ task_id: taskId, venue_id: target_venue_id });

      // If files were uploaded, save them for each task
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await connection.query(`
            INSERT INTO task_files (task_id, file_name, file_path, file_type, file_size, uploaded_at)
            VALUES (?, ?, ?, ?, ?, NOW())
          `, [taskId, file.originalname, file.path, file.mimetype, file.size]);
        }
      }

      // Get all students in this venue
      const [students] = await connection.query(`
        SELECT DISTINCT s.student_id
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        INNER JOIN students s ON gs.student_id = s.student_id
        WHERE g.venue_id = ? AND gs.status = 'Active'
      `, [target_venue_id]);

      // Filter students based on skill_filter if provided
      let eligibleStudents = students;
      
      if (skill_filter && skill_filter.trim()) {
        // console.log(`Filtering students for skill: ${skill_filter}`);
        
        // Get students who have CLEARED this skill
        const [clearedStudents] = await connection.query(`
          SELECT DISTINCT student_id
          FROM student_skills
          WHERE course_name = ? AND status = 'Cleared'
        `, [skill_filter.trim()]);
        
        const clearedStudentIds = new Set(clearedStudents.map(s => s.student_id));
        
        // Only include students who have NOT cleared the skill
        eligibleStudents = students.filter(s => !clearedStudentIds.has(s.student_id));
        
        // console.log(`Total students in venue: ${students.length}, Eligible students: ${eligibleStudents.length}`);
      }

      // Do not pre-create placeholder submissions.
      // Student/Faculty views use LEFT JOIN and treat missing submissions as "Not Submitted".
      totalStudents += eligibleStudents.length;
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: apply_to_all_venues 
        ? `Assignment published to ${targetVenues.length} venues successfully!` 
        : 'Assignment published successfully!',
      data: { 
        tasks: createdTasks,
        group_id: group_id,
        venues_count: targetVenues.length,
        students_count: totalStudents 
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    });
  } finally {
    connection.release();
  }
};

// Get all tasks for a venue
export const getTasksByVenue = async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { status } = req.query;

    let query = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.day,
        t.due_date,
        t.max_score,
        t.material_type,
        t.external_url,
        t.skill_filter,
        t.course_type,
        t.status,
        t.created_at,
        t.venue_id,
        v.venue_name,
        u.name as faculty_name,
        COUNT(DISTINCT ts.submission_id) as total_submissions,
        COUNT(DISTINCT CASE WHEN ts.status = 'Pending Review' THEN ts.submission_id END) as pending_submissions,
        COUNT(DISTINCT CASE WHEN ts.status = 'Graded' THEN ts. submission_id END) as graded_submissions
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN faculties f ON t.faculty_id = f.faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id
      WHERE t.venue_id = ? 
    `;

    const params = [venue_id];

    if (status && status !== 'All') {
      query += ` AND t.status = ? `;
      params.push(status);
    }

    query += ` GROUP BY t.task_id ORDER BY t.created_at DESC`;

    const [tasks] = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
};

// Get tasks from ALL venues
export const getTasksAllVenues = async (req, res) => {
  try {
    const { status, course_type } = req.query;

    let query = `
      SELECT 
        t.task_id,
        t.title,
        t.description,
        t.day,
        t.due_date,
        t.max_score,
        t.material_type,
        t.external_url,
        t.skill_filter,
        t.course_type,
        t.status,
        t.created_at,
        t.venue_id,
        v.venue_name,
        u.name as faculty_name,
        COUNT(DISTINCT ts.submission_id) as total_submissions,
        COUNT(DISTINCT CASE WHEN ts.status = 'Pending Review' THEN ts.submission_id END) as pending_submissions,
        COUNT(DISTINCT CASE WHEN ts.status = 'Graded' THEN ts.submission_id END) as graded_submissions
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN faculties f ON t.faculty_id = f.faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id
    `;

    const params = [];

    if (status && status !== 'All') {
      query += ` WHERE t.status = ? `;
      params.push(status);
    }

    query += ` GROUP BY t.task_id ORDER BY v.venue_name, t.created_at DESC`;

    const [tasks] = await db.query(query, params);

    // Get skill orders with venue restrictions
    const [skillOrders] = await db.query(`
      SELECT so.id, so.skill_name, so.course_type, so.apply_to_all_venues
      FROM skill_order so
      WHERE so.apply_to_all_venues = 0
    `);

    // Build map of course_type -> allowed venue_ids (union of all skills in that course_type)
    const courseTypeRestrictions = new Map();
    
    for (const so of skillOrders) {
      const [venueRows] = await db.query(`
        SELECT venue_id FROM skill_order_venues WHERE skill_order_id = ?
      `, [so.id]);
      
      if (venueRows.length > 0) {
        const courseType = so.course_type;
        if (!courseTypeRestrictions.has(courseType)) {
          courseTypeRestrictions.set(courseType, new Set());
        }
        // Add all venues from this skill to the course_type set
        venueRows.forEach(v => {
          courseTypeRestrictions.get(courseType).add(v.venue_id);
        });
      }
    }

    // Filter tasks based on course_type skill order restrictions
    const filteredTasks = tasks.filter(task => {
      // If this course_type has venue restrictions, only show venues in that list
      if (courseTypeRestrictions.has(task.course_type)) {
        const allowedVenues = courseTypeRestrictions.get(task.course_type);
        return allowedVenues.has(task.venue_id);
      }
      
      // No restrictions for this course_type, show all
      return true;
    });

    res.status(200).json({
      success: true,
      data: filteredTasks
    });
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
};

// Get task details with files
export const getTaskDetails = async (req, res) => {
  try {
    const { task_id } = req.params;

    const [tasks] = await db.query(`
      SELECT 
        t.*,
        v.venue_name,
        u.name as faculty_name
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN faculties f ON t.faculty_id = f. faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      WHERE t.task_id = ? 
    `, [task_id]);

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const [files] = await db.query(`
      SELECT file_id, file_name, file_path, file_type, file_size
      FROM task_files
      WHERE task_id = ?
    `, [task_id]);

    res.status(200).json({
      success: true,
      data: {
        ... tasks[0],
        files
      }
    });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task details'
    });
  }
};

// Toggle task status (Active/Inactive)
export const toggleTaskStatus = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.  Must be Active or Inactive'
      });
    }

    await db.query(`
      UPDATE tasks
      SET status = ?, updated_at = NOW()
      WHERE task_id = ?
    `, [status, task_id]);

    res.status(200).json({
      success: true,
      message: `Task set to ${status} successfully! `
    });
  } catch (error) {
    console.error('Error toggling task status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task status'
    });
  }
};

// Get submissions for a task with PAGINATION and SEARCH (from backend)
export const getTaskSubmissions = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { status, search, page = 1, limit = 10 } = req.query;
    
    // Decode status if it's URL encoded
    const decodedStatus = status ? decodeURIComponent(status) : null;
    const decodedSearch = search ? decodeURIComponent(search) : '';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Helper function to normalize skill names for comparison
    // EXACT case-insensitive matching only (matches skill_order and roadmap logic)
    const normalizeSkillName = (name) => {
      if (!name) return '';
      return name.toLowerCase().trim();
    };

    // Helper: Extract keywords for matching (remove common words)
    const extractKeywords = (name) => {
      const normalized = normalizeSkillName(name);
      return normalized
        .split(/[\s\/,.-]+/)
        .filter(word => word.length > 2 && !['level', 'the', 'and', 'for'].includes(word));
    };

    // Helper: Check if task skill_filter matches student skill using keyword matching
    const skillMatches = (taskSkillFilter, studentSkillName) => {
      // First try exact match
      if (normalizeSkillName(taskSkillFilter) === normalizeSkillName(studentSkillName)) {
        return true;
      }
      
      // Then try keyword matching (50% threshold like roadmap)
      const taskKeywords = extractKeywords(taskSkillFilter);
      const studentKeywords = extractKeywords(studentSkillName);
      
      if (taskKeywords.length === 0 || studentKeywords.length === 0) {
        return false;
      }
      
      const matchingKeywords = taskKeywords.filter(tk => 
        studentKeywords.some(sk => sk.includes(tk) || tk.includes(sk))
      );
      
      return matchingKeywords.length >= Math.ceil(taskKeywords.length * 0.5) && matchingKeywords.length > 0;
    };

    // First, get the venue_id, skill_filter, and title for this task
    const [taskInfo] = await db.query(`
      SELECT venue_id, skill_filter, title FROM tasks WHERE task_id = ?
    `, [task_id]);

    if (taskInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const venue_id = taskInfo[0].venue_id;
    const skill_filter = taskInfo[0].skill_filter;
    const task_title = taskInfo[0].title;

    // Get students who have CLEARED the skill (if skill_filter exists)
    let clearedStudentIds = new Set();
    if (skill_filter && skill_filter.trim()) {
      const [allClearedStudents] = await db.query(`
        SELECT DISTINCT student_id, course_name
        FROM student_skills
        WHERE status = 'Cleared'
      `);
      
      // console.log(`Task "${task_title}" - skill_filter: "${skill_filter}"`);
      allClearedStudents.forEach(s => {
        if (skillMatches(skill_filter, s.course_name)) {
          clearedStudentIds.add(s.student_id);
          // console.log(`  ✓ Matched student ${s.student_id} skill: "${s.course_name}"`);
        }
      });
      // console.log(`Total students with cleared skill: ${clearedStudentIds.size}`);
    }

    // Build base conditions for both current venue students AND students who submitted this task
    let statusCondition = '';
    let statusParams = [];
    
    if (decodedStatus && decodedStatus !== 'All Statuses') {
      if (decodedStatus === 'Not Submitted') {
        statusCondition = 'AND ts.submission_id IS NULL';
      } else {
        statusCondition = 'AND ts.status = ?';
        statusParams.push(decodedStatus);
      }
    }

    let searchCondition = '';
    let searchParams = [];
    if (decodedSearch && decodedSearch.trim() !== '') {
      searchCondition = 'AND (u.name LIKE ? OR u.ID LIKE ?)';
      searchParams.push(`%${decodedSearch}%`, `%${decodedSearch}%`);
    }

    let clearedCondition = '';
    if (clearedStudentIds.size > 0) {
      clearedCondition = `AND s.student_id NOT IN (${[...clearedStudentIds].join(',')})`;
    }

    // Get submissions from students CURRENTLY in this venue
    // Submissions are routed based on student's current venue, not task's original venue
    const countQuery = `
      SELECT COUNT(DISTINCT s.student_id) as total
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN task_submissions ts ON s.student_id = ts.student_id 
        AND ts.task_id = ?
      WHERE g.venue_id = ? ${clearedCondition} ${statusCondition} ${searchCondition}
    `;

    const countParams = [task_id, venue_id, ...statusParams, ...searchParams];
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    // Main query: Students CURRENTLY in this venue (submissions routed by current venue)
    const mainQuery = `
      SELECT 
        ts.submission_id,
        ts.submitted_at,
        ts.file_name,
        ts.file_path,
        ts.link_url,
        ts.status,
        ts.grade,
        ts.feedback,
        ts.is_late,
        ts.current_venue_id,
        s.student_id,
        u.ID as student_roll,
        u.name as student_name,
        u.email as student_email,
        u.department
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN task_submissions ts ON s.student_id = ts.student_id 
        AND ts.task_id = ?
      WHERE g.venue_id = ? ${clearedCondition} ${statusCondition} ${searchCondition}
      ORDER BY ts.submitted_at IS NULL, ts.submitted_at DESC, u.name ASC
      LIMIT ? OFFSET ?
    `;

    const mainParams = [task_id, venue_id, ...statusParams, ...searchParams, parseInt(limit), parseInt(offset)];
    
    const [submissions] = await db.query(mainQuery, mainParams);

    res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    });
  }
};

// Grade a submission
export const gradeSubmission = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { submission_id } = req.params;
    const { grade, feedback } = req.body;

    // Get faculty_id from JWT token
    const userId = req.user.user_id;
    
    // Get faculty_id from user_id
    const [faculty] = await connection.query('SELECT faculty_id FROM faculties WHERE user_id = ?', [userId]);
    const faculty_id = faculty.length > 0 ? faculty[0].faculty_id : userId;

    // Validate grade
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid grade between 0 and 100'
      });
    }

    // Determine status based on grade
    let submissionStatus;
    if (gradeNum >= 50) {
      submissionStatus = 'Graded'; // Successfully completed
    } else {
      submissionStatus = 'Needs Revision'; // Failed - student must resubmit
    }

    // Get submission details to check for due date extension
    const [submissionDetails] = await connection.query(`
      SELECT ts.student_id, ts.task_id, t.due_date, t.title
      FROM task_submissions ts
      INNER JOIN tasks t ON ts.task_id = t.task_id
      WHERE ts.submission_id = ?
    `, [submission_id]);

    if (submissionDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    await connection.beginTransaction();

    await connection.query(`
      UPDATE task_submissions
      SET 
        grade = ?,
        feedback = ?,
        status = ?,
        graded_at = NOW(),
        graded_by = ?
      WHERE submission_id = ?
    `, [gradeNum, feedback || null, submissionStatus, faculty_id, submission_id]);

    // If grade < 50%, automatically extend the due date by 1 day for this student
    if (gradeNum < 50 && submissionDetails[0].due_date) {
      const currentDueDate = submissionDetails[0].due_date;

      // Get current extension from submission
      const [currentSubmission] = await connection.query(`
        SELECT extended_due_date, extension_days FROM task_submissions
        WHERE submission_id = ?
      `, [submission_id]);

      const baseDueDate = currentSubmission[0].extended_due_date 
        ? new Date(currentSubmission[0].extended_due_date)
        : new Date(currentDueDate);
      
      const currentExtensionDays = currentSubmission[0].extension_days || 0;
      
      // Extend by 1 day
      const extendedDueDate = new Date(baseDueDate);
      extendedDueDate.setDate(extendedDueDate.getDate() + 1);

      // Update submission with extension
      await connection.query(`
        UPDATE task_submissions
        SET extended_due_date = ?,
            extension_days = ?
        WHERE submission_id = ?
      `, [extendedDueDate, currentExtensionDays + 1, submission_id]);

      // console.log(`Auto-extended due date for submission ${submission_id} by 1 day`);
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: gradeNum >= 50 
        ? 'Submission graded successfully!' 
        : 'Submission graded. Student needs to resubmit. Due date extended by 1 day.',
      data: { 
        status: submissionStatus,
        needsResubmission: gradeNum < 50,
        autoExtended: gradeNum < 50 && submissionDetails[0].due_date ? true : false
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission'
    });
  } finally {
    connection.release();
  }
};

// Student submits file for assignment
export const submitAssignmentFile = async (req, res) => {
  try {
    const { submission_id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    // Check if submission exists and get task details
    const [submissions] = await db.query(`
      SELECT ts.*, t.due_date
      FROM task_submissions ts
      INNER JOIN tasks t ON ts. task_id = t.task_id
      WHERE ts.submission_id = ?
    `, [submission_id]);

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const isLate = submissions[0].due_date && new Date() > new Date(submissions[0].due_date);

    // Update submission with file
    await db.query(`
      UPDATE task_submissions
      SET 
        file_name = ?,
        file_path = ?,
        is_late = ?,
        submitted_at = NOW()
      WHERE submission_id = ? 
    `, [req.file.originalname, req.file.path, isLate, submission_id]);

    res.status(200).json({
      success: true,
      message: 'File submitted successfully!'
    });
  } catch (error) {
    console.error('Error submitting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit file'
    });
  }
};

// backend/controllers/tasks.controller.js

export const getVenuesByEmail = async (req, res) => {
  try {
    const { email } = req. params;
  

    //  Get user with role using JOIN
    const [users] = await db.query(`
      SELECT u.user_id, r.role 
      FROM users u
      JOIN role r ON u.role_id = r.role_id
      WHERE u.email = ?  
    `, [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    
    let venues;
    
    // If admin, show ALL venues
    if (user.role === 'admin') {
      
      [venues] = await db.query(`
        SELECT 
          v. venue_id,
          v. venue_name,
          v. capacity,
          COUNT(DISTINCT gs.student_id) as student_count
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g. group_id = gs.group_id AND gs.status = 'Active'
        WHERE v.status = 'Active'
        GROUP BY v.venue_id
        ORDER BY v.venue_name
      `);
      
    } else if (user.role === 'faculty') {
      
      // Get faculty_id
      const [faculty] = await db.query('SELECT faculty_id FROM faculties WHERE user_id = ? ', [user.user_id]);
      
      if (faculty. length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Faculty record not found' 
        });
      }
      
      // Get assigned venues
      [venues] = await db. query(`
        SELECT 
          v.venue_id,
          v.venue_name,
          v.capacity,
          COUNT(DISTINCT gs.student_id) as student_count
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs. group_id AND gs.status = 'Active'
        WHERE v.assigned_faculty_id = ?  AND v.status = 'Active'
        GROUP BY v.venue_id
        ORDER BY v. venue_name
      `, [faculty[0].faculty_id]);
      
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized role' 
      });
    }
    
    
    res.status(200).json({
      success: true,
      data: venues
    });
    
  } catch (error) {
    console.error(' Error fetching venues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
};

// ============ STUDENT TASK FUNCTIONS ============

// Get all tasks/assignments for a student
export const getStudentTasks = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { course_type } = req.query;

    // Get student info and their current venue
    const [studentInfo] = await db.query(`
      SELECT 
        s.student_id, 
        u.ID as roll_number, 
        gs.group_id, 
        g.venue_id, 
        v.venue_name
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN venue v ON g.venue_id = v.venue_id
      WHERE s.user_id = ?
    `, [user_id]);

    if (studentInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found or not assigned to any venue'
      });
    }

    const { student_id, venue_id, venue_name } = studentInfo[0];

    // console.log('Student Info:', { student_id, venue_id, venue_name, user_id });

    // Get ALL venues the student has been in (current + dropped) for historical task display
    const [allVenueAllocations] = await db.query(`
      SELECT DISTINCT g.venue_id, v.venue_name, gs.status as allocation_status
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE gs.student_id = ?
      ORDER BY gs.status DESC
    `, [student_id]);

    const currentVenueId = venue_id;
    const allVenueIds = allVenueAllocations.map(v => v.venue_id);

    // console.log('All venues student has been in:', allVenueAllocations);

    if (!venue_id && allVenueIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Student not assigned to any venue',
        data: {
          venue_name: null,
          venue_id: null,
          student_id: student_id,
          groupedTasks: {},
          skill_progression: []
        }
      });
    }

    // Get student's venue and year through group membership
    const [studentDetails] = await db.query(`
      SELECT g.venue_id, s.year 
      FROM students s 
      LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
      WHERE s.student_id = ?
      LIMIT 1
    `, [student_id]);

    const studentVenueId = studentDetails[0]?.venue_id || currentVenueId;
    const studentYear = studentDetails[0]?.year || 2;

    let skillOrderQuery = `
      SELECT DISTINCT
        so.id as skill_order_id,
        so.skill_name,
        so.display_order,
        so.is_prerequisite,
        so.course_type
      FROM skill_order so
      WHERE (
        so.apply_to_all_venues = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_venues sov 
          WHERE sov.skill_order_id = so.id AND sov.venue_id = ?
        )
      )
      AND (
        so.apply_to_all_years = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_years soy 
          WHERE soy.skill_order_id = so.id AND soy.year = ?
        )
      )
    `;
    const skillOrderParams = [studentVenueId, studentYear];
    
    if (course_type) {
      skillOrderQuery += ` AND so.course_type = ?`;
      skillOrderParams.push(course_type);
    }
    
    skillOrderQuery += ` ORDER BY so.course_type, so.display_order ASC`;
    
    const [skillOrders] = await db.query(skillOrderQuery, skillOrderParams);

    // Use skills directly (no venue preference needed anymore)
    const orderedSkills = skillOrders;

    // Get student's cleared skills to filter tasks
    const [studentSkills] = await db.query(`
      SELECT DISTINCT course_name, status
      FROM student_skills
      WHERE student_id = ?
    `, [student_id]);

    // Helper function to normalize skill names for comparison
    const normalizeSkillName = (name) => {
      if (!name) return '';
      return name.toLowerCase().trim();
    };

    // Helper: Extract keywords for matching (remove common words)
    const extractKeywords = (name) => {
      const normalized = normalizeSkillName(name);
      return normalized
        .split(/[\s\/,.-]+/)
        .filter(word => word.length > 2 && !['level', 'the', 'and', 'for'].includes(word));
    };

    // Helper: Check if task skill_filter matches student skill using keyword matching
    const skillMatches = (taskSkillFilter, studentSkillName) => {
      // First try exact match
      if (normalizeSkillName(taskSkillFilter) === normalizeSkillName(studentSkillName)) {
        return true;
      }
      
      // Then try keyword matching (50% threshold like roadmap)
      const taskKeywords = extractKeywords(taskSkillFilter);
      const studentKeywords = extractKeywords(studentSkillName);
      
      if (taskKeywords.length === 0 || studentKeywords.length === 0) {
        return false;
      }
      
      const matchingKeywords = taskKeywords.filter(tk => 
        studentKeywords.some(sk => sk.includes(tk) || tk.includes(sk))
      );
      
      return matchingKeywords.length >= Math.ceil(taskKeywords.length * 0.5) && matchingKeywords.length > 0;
    };

    // Create sets for cleared and ongoing skills
    const clearedSkillsSet = new Set();
    const clearedSkillsMap = new Map();
    const clearedSkillsList = [];
    
    studentSkills.forEach(skill => {
      if (skill.status === 'Cleared') {
        clearedSkillsSet.add(skill.course_name); // Keep original for keyword matching
        clearedSkillsMap.set(skill.course_name, skill); // Use original name as key
        clearedSkillsList.push(skill);
      }
    });

    // console.log('========== STUDENT TASKS SKILL PROGRESSION ==========');
    // console.log('Student ID:', student_id, 'Venue:', currentVenueId);
    // console.log('Student cleared skills:', Array.from(clearedSkillsSet));
    // console.log('Normalized cleared skills:', Array.from(clearedSkillsMap.keys()));
    // console.log('Skill order entries:', orderedSkills.map(s => s.skill_name));

    // Build skill progression with unlock status
    const skillProgression = [];
    const courseProgress = {}; // Track progress per course type
    const unlockedSkills = new Set(); // Skills that are unlocked for this student (normalized names)
    
    for (const skill of orderedSkills) {
      const normalizedSkillName = normalizeSkillName(skill.skill_name);
      
      // Check with flexible matching - exact match first, then keyword matching
      let isCleared = clearedSkillsMap.has(normalizedSkillName);
      
      // If no exact match, try flexible matching
      if (!isCleared) {
        const matchedSkill = clearedSkillsList.find(s => skillMatches(s.course_name, skill.skill_name));
        if (matchedSkill) {
          isCleared = true;
          // Add to map for future lookups
          clearedSkillsMap.set(normalizedSkillName, matchedSkill);
          // console.log(`Skill "${skill.skill_name}" MATCHED with cleared skill "${matchedSkill.course_name}" via flexible matching`);
        }
      }
      
      // Initialize course progress tracker
      if (!courseProgress[skill.course_type]) {
        courseProgress[skill.course_type] = { previousCleared: true, currentUnlocked: null };
      }
      
      const courseTracker = courseProgress[skill.course_type];
      
      // A skill is unlocked if:
      // 1. It's already cleared by the student (regardless of prerequisites), OR
      // 2. Previous skill in same course is cleared (normal progression)
      // This allows students who cleared a skill directly to proceed
      const isUnlockedByClearing = isCleared;
      const isUnlockedByPrerequisite = !skill.is_prerequisite || courseTracker.previousCleared;
      const isUnlocked = isUnlockedByClearing || isUnlockedByPrerequisite;
      const isLocked = !isUnlocked;
      
      if (isUnlocked) {
        unlockedSkills.add(normalizedSkillName); // Use normalized name for consistent matching
      }
      
      // If this skill is cleared, mark the next skill as unlockable
      // This ensures that clearing any skill unlocks the next one
      if (isCleared) {
        courseTracker.previousCleared = true;
      } else {
        // Only block next skills if this one is unlocked but not cleared yet
        if (isUnlocked) {
          courseTracker.previousCleared = false;
        }
      }
      
      // Track the first unlocked but not cleared skill as "current"
      const isCurrent = isUnlocked && !isCleared && !courseTracker.currentUnlocked;
      if (isCurrent) {
        courseTracker.currentUnlocked = skill.skill_name;
      }

      skillProgression.push({
        skill_order_id: skill.skill_order_id,
        skill_name: skill.skill_name,
        course_type: skill.course_type,
        display_order: skill.display_order,
        status: isCleared ? 'Cleared' : (isLocked ? 'Locked' : 'Available'),
        is_cleared: isCleared,
        is_locked: isLocked,
        is_current: isCurrent
      });

      // previousCleared tracking is done above in the if-else block
    }

    // console.log('\n--- Skill Progression Summary ---');
    skillProgression.forEach(s => {
      // console.log(`${s.skill_name} (${s.course_type}): ${s.status} | Cleared: ${s.is_cleared} | Locked: ${s.is_locked} | Current: ${s.is_current}`);
    });
    // console.log('Unlocked skills set:', Array.from(unlockedSkills));
    // console.log('======================================================\n');

    // Get tasks from CURRENT venue only (new venues start with no tasks)
    let tasksQuery = `
      SELECT DISTINCT
        t.task_id,
        t.title,
        t.description,
        t.day,
        t.due_date,
        t.max_score,
        t.material_type,
        t.external_url,
        t.skill_filter,
        t.course_type,
        t.status as task_status,
        t.created_at,
        t.venue_id as task_venue_id,
        v.venue_name as task_venue_name,
        u.name as faculty_name,
        ts.submission_id,
        ts.file_name,
        ts.file_path,
        ts.link_url,
        ts.submitted_at,
        ts.grade,
        ts.feedback,
        ts.is_late,
        ts.status as submission_status,
        ts.extended_due_date,
        ts.extension_days
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN faculties f ON t.faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.student_id = ?
      WHERE t.venue_id = ?
      AND t.status = 'Active'
    `;
    const tasksParams = [student_id, currentVenueId || 0];

    // Only filter by course_type if it's specified AND not 'all'
    if (course_type && course_type !== 'all') {
      tasksQuery += ` AND t.course_type = ?`;
      tasksParams.push(course_type);
    }

    tasksQuery += ` ORDER BY t.day ASC, t.created_at ASC`;

    const [tasks] = await db.query(tasksQuery, tasksParams);

    // Filter tasks based on skill_filter, skill_order, and completion status
    // HIDE tasks for skills student has already CLEARED
    const filteredTasks = tasks.filter(task => {
      // ALWAYS show tasks that need revision (grade < 50%)
      if (task.submission_status === 'Needs Revision') {
        // console.log(`Task "${task.title}" needs revision - showing to student`);
        return true;
      }
      
      // Get the effective skill filter from skill_filter field
      const effectiveSkillFilter = task.skill_filter;
      
      // If no skill_filter is set, show task if not already completed successfully
      if (!effectiveSkillFilter) {
        // Hide tasks that are already graded successfully (grade >= 50%)
        if (task.submission_status === 'Graded' && task.grade >= 50) {
          // console.log(`Task "${task.title}" - No skill filter, already graded successfully - hiding`);
          return false;
        }
        // console.log(`Task "${task.title}" - No skill filter - showing`);
        return true;
      }
      
      // Use the same normalization function for consistent matching
      const normalizedSkillFilter = normalizeSkillName(effectiveSkillFilter);
      
      // Use keyword matching to check if student has cleared this skill
      const hasCleared = Array.from(clearedSkillsMap.keys()).some(clearedSkillName => {
        const match = skillMatches(effectiveSkillFilter, clearedSkillName);
        if (match) {
          // console.log(`  Task skill "${effectiveSkillFilter}" matched cleared skill "${clearedSkillName}"`);
        }
        return match;
      });
      
      // console.log(`Task "${task.title}" - skill_filter: "${effectiveSkillFilter}", hasCleared: ${hasCleared}`);
      
      // HIDE task if student has CLEARED this skill (they don't need it anymore)
      if (hasCleared) {
        // console.log(`Task "${task.title}" - Skill "${effectiveSkillFilter}" CLEARED - hiding from student`);
        return false;
      }
      
      // If no skill order is defined, show all tasks (don't check unlock status)
      if (orderedSkills.length === 0) {
        // console.log(`Task "${task.title}" - No skill order defined - showing`);
        return true;
      }
      
      // Check if this skill exists in the skill_order table (using normalized names)
      const skillExistsInOrder = orderedSkills.some(s => 
        normalizeSkillName(s.skill_name) === normalizedSkillFilter
      );
      
      // If skill is not in skill_order table, show the task anyway (don't block on unknown skills)
      if (!skillExistsInOrder) {
        // console.log(`Task "${task.title}" - Skill "${effectiveSkillFilter}" not in skill_order table - showing`);
        return true;
      }
      
      // Check if the skill is unlocked for this student (based on skill order progression)
      // Use normalized skill name for matching
      const isSkillUnlocked = unlockedSkills.has(normalizedSkillFilter);
      
      // If skill is locked, don't show the task
      if (!isSkillUnlocked) {
        // console.log(`Task "${task.title}" - Skill "${effectiveSkillFilter}" is LOCKED - hiding from student`);
        return false;
      }
      
      // console.log(`Task "${task.title}" - Skill Filter: ${effectiveSkillFilter}, Unlocked: ${isSkillUnlocked}, Cleared: ${hasCleared} - SHOWING`);
      
      // Show task - skill is unlocked and not yet cleared
      return true;
    });

    // console.log(`Showing ${filteredTasks.length} tasks after skill filtering and revision check`);

    // Debug: Check all tasks in the venue regardless of status
    const [allVenueTasks] = await db.query(`
      SELECT task_id, title, status, venue_id FROM tasks WHERE venue_id = ?
    `, [currentVenueId || allVenueIds[0] || 0]);
    // console.log(`Total tasks in venue ${currentVenueId}:`, allVenueTasks);

    // Get materials for each task
    const tasksWithResources = await Promise.all(filteredTasks.map(async (task) => {
      // Parse materials from task if they exist
      let materials = [];
      
      // Add external_url material if it exists
      if (task.material_type && task.external_url) {
        materials.push({
          type: task.material_type,
          name: task.title,
          fileUrl: task.material_type === 'file' ? task.external_url : null,
          url: task.material_type === 'link' ? task.external_url : null
        });
      }

      // Fetch uploaded files from task_files table
      const [taskFiles] = await db.query(`
        SELECT file_id, file_name, file_path, file_type, file_size
        FROM task_files
        WHERE task_id = ?
      `, [task.task_id]);

      // Add task files to materials
      if (taskFiles && taskFiles.length > 0) {
        taskFiles.forEach(file => {
          materials.push({
            type: 'file',
            name: file.file_name,
            fileUrl: `/${file.file_path.replace(/\\/g, '/')}`,
            url: null
          });
        });
      }

      // Use extended due date if available, otherwise use original due date
      const effectiveDueDate = task.extended_due_date || task.due_date;

      // Determine overall status
      let overallStatus = 'pending';
      if (task.submission_status === 'Needs Revision') {
        overallStatus = 'revision'; // Student needs to resubmit
      } else if (task.submission_status === 'Graded' && task.grade >= 50) {
        overallStatus = 'completed';
      } else if (task.submission_id) {
        overallStatus = 'pending'; // Submitted but not graded yet
      } else if (effectiveDueDate && new Date(effectiveDueDate) < new Date()) {
        overallStatus = 'overdue';
      }

      return {
        id: task.task_id,
        day: task.day,
        title: task.title,
        description: task.description,
        dueDate: effectiveDueDate,
        originalDueDate: task.due_date,
        isExtended: task.extended_due_date ? true : false,
        extensionDays: task.extension_days || 0,
        status: overallStatus,
        score: task.max_score,
        materialType: task.material_type,
        skillFilter: task.skill_filter || '',
        courseType: task.course_type || '',
        moduleTitle: `Day ${task.day}`,
        instructor: task.faculty_name || 'Faculty',
        submittedDate: task.submitted_at,
        grade: task.grade ? `${task.grade}/${task.max_score}` : null,
        feedback: task.feedback,
        isLate: task.is_late,
        fileName: task.file_name,
        filePath: task.file_path,
        link_url: task.link_url,
        submissionStatus: task.submission_status,
        materials: materials,
        fromPreviousVenue: task.from_previous_venue || null
      };
    }));

    // Group tasks by module/subject
    const groupedTasks = tasksWithResources.reduce((acc, task) => {
      const key = `DAY-${task.day}`;
      if (!acc[key]) {
        acc[key] = {
          title: `Day ${task.day}`,
          instructor: task.instructor,
          tasks: []
        };
      }
      acc[key].tasks.push(task);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        venue_name,
        venue_id,
        student_id,
        groupedTasks,
        skill_progression: skillProgression
      }
    });
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// Submit task assignment
export const submitTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { submission_type, link_url } = req.body;
    const user_id = req.user.user_id;
    const file = req.file;

    // Get student_id
    const [student] = await db.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student_id = student[0].student_id;

    // Verify task exists and is active
    const [task] = await db.query(`
      SELECT task_id, due_date FROM tasks WHERE task_id = ? AND status = 'Active'
    `, [task_id]);

    if (task.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not available'
      });
    }

    // Check if already submitted
    const [existing] = await db.query(`
      SELECT submission_id, file_path, extended_due_date, status FROM task_submissions 
      WHERE task_id = ? AND student_id = ?
    `, [task_id, student_id]);

    const due_date = task[0].due_date;
    
    // Check effective due date (extended_due_date takes priority)
    const effectiveDueDate = (existing.length > 0 && existing[0].extended_due_date) 
      ? existing[0].extended_due_date 
      : due_date;
    
    const currentDate = new Date();
    const dueDateTime = effectiveDueDate ? new Date(effectiveDueDate) : null;
    
    // Students can submit even after due date - just mark as late
    const is_late = dueDateTime && currentDate > dueDateTime;

    // Support both file and link submission at the same time
    const hasFile = file && file.originalname;
    const hasLink = link_url && link_url.trim();

    if (!hasFile && !hasLink) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a file or a link'
      });
    }

    // Validate link URL for security
    if (hasLink) {
      const urlString = link_url.trim();
      
      // Block dangerous protocols
      const dangerousProtocols = /^(javascript|data|file|vbscript|about):/i;
      if (dangerousProtocols.test(urlString)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL protocol. Only http and https are allowed.'
        });
      }

      // Ensure URL starts with http:// or https://
      if (!/^https?:\/\//i.test(urlString)) {
        return res.status(400).json({
          success: false,
          message: 'URL must start with http:// or https://'
        });
      }

      // Basic URL validation
      try {
        const url = new URL(urlString);
        // Additional check - ensure protocol is http or https
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return res.status(400).json({
            success: false,
            message: 'Only HTTP and HTTPS URLs are allowed'
          });
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }
    }

    if (existing.length > 0) {
      // Update existing submission - support both file and link
      const updateFields = [];
      const updateValues = [];

      // Delete old file if new file is uploaded
      if (hasFile && existing[0].file_path) {
        const oldFilePath = existing[0].file_path;
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            // console.log(`Deleted old file: ${oldFilePath}`);
          } catch (err) {
            console.error(`Failed to delete old file: ${oldFilePath}`, err);
            // Continue with update even if deletion fails
          }
        }
        
        updateFields.push('file_name = ?', 'file_path = ?');
        updateValues.push(file.originalname, file.path);
      }

      if (hasLink) {
        updateFields.push('link_url = ?');
        updateValues.push(link_url.trim());
      }

      updateFields.push('is_late = ?', 'submitted_at = NOW()', "status = 'Pending Review'");
      updateValues.push(is_late, existing[0].submission_id);

      await db.query(`
        UPDATE task_submissions 
        SET ${updateFields.join(', ')}
        WHERE submission_id = ?
      `, updateValues);

      return res.status(200).json({
        success: true,
        message: 'Assignment resubmitted successfully!'
      });
    } else {
      // Get student's current venue
      const [studentVenue] = await db.query(`
        SELECT g.venue_id 
        FROM students s
        INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE s.student_id = ?
      `, [student_id]);
      
      const current_venue_id = studentVenue.length > 0 ? studentVenue[0].venue_id : null;
      
      // Create new submission - support both file and link
      const columns = ['task_id', 'student_id', 'is_late', 'submitted_at', 'status', 'current_venue_id'];
      const values = [task_id, student_id, is_late, current_venue_id];
      const placeholders = ['?', '?', '?', 'NOW()', "'Pending Review'", '?'];

      if (hasFile) {
        columns.push('file_name', 'file_path');
        placeholders.push('?', '?');
        values.push(file.originalname, file.path);
      }

      if (hasLink) {
        columns.push('link_url');
        placeholders.push('?');
        values.push(link_url.trim());
      }

      await db.query(`
        INSERT INTO task_submissions (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `, values);

      return res.status(201).json({
        success: true,
        message: 'Assignment submitted successfully!'
      });
    }
  } catch (error) {
    console.error('Error submitting task:', error);
    
    // Ensure we always return JSON, not HTML
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to submit assignment',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

// Download or preview submission file
export const downloadSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { mode } = req.query; // ?mode=preview or ?mode=download
    const user_id = req.user.user_id;
    const userRole = req.userRole || req.user.role;

    let student_id = null;

    // If student, get their student_id
    if (userRole === 'student') {
      const [student] = await db.query(`
        SELECT s.student_id 
        FROM students s
        WHERE s.user_id = ?
      `, [user_id]);

      if (student.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Student record not found'
        });
      }
      student_id = student[0].student_id;
    }

    // Build query based on role
    let query = `
      SELECT file_path, file_name, submission_type 
      FROM task_submissions 
      WHERE submission_id = ?
    `;
    const params = [submission_id];

    // Students can only access their own submissions
    if (userRole === 'student') {
      query += ` AND student_id = ?`;
      params.push(student_id);
    }
    // Faculty and admin can access any submission (already verified by middleware)

    const [submission] = await db.query(query, params);

    if (submission.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or access denied'
      });
    }

    if (!submission[0].file_path) {
      return res.status(404).json({
        success: false,
        message: 'No file attached to this submission'
      });
    }

    const filePath = submission[0].file_path;
    const fileName = submission[0].file_name || path.basename(filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Set headers for preview (inline) or download
    // Faculty and admin ALWAYS get preview mode, students can choose
    if (userRole === 'student' && mode === 'download') {
      // Students can download their own files if they request it
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    } else {
      // Faculty/Admin ALWAYS preview, students default to preview
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error accessing submission file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access file'
    });
  }
};

// Sync task submissions for students added after task creation
export const syncTaskSubmissions = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    // No-op: submissions are created only when a student actually submits.
    // This endpoint remains for backward compatibility (e.g., UI button clicks).
    const { venue_id } = req.params;
    const [tasks] = await connection.query(
      `SELECT COUNT(*) as cnt FROM tasks WHERE venue_id = ? AND status = 'Active'`,
      [venue_id]
    );

    res.json({
      success: true,
      message: 'Sync not required (submissions are created on submit).',
      data: {
        tasksProcessed: tasks[0]?.cnt ?? 0,
        submissionsCreated: 0
      }
    });
    
  } catch (error) {
    console.error('Error syncing task submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync task submissions',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Extend task due date for a specific student
export const extendTaskDueDate = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { task_id, student_id } = req.params;
    const { extension_days = 1 } = req.body; // Default 1 day extension
    
    const userId = req.user.user_id;
    
    // Get user role
    const [user] = await connection.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [userId]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    
    // Only admin and faculty can extend deadlines
    if (userRole !== 1 && userRole !== 2) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and admin can extend task deadlines'
      });
    }

    // Verify task exists and get current due date
    const [task] = await connection.query(`
      SELECT t.task_id, t.due_date, t.venue_id, v.assigned_faculty_id
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      WHERE t.task_id = ? AND t.status = 'Active'
    `, [task_id]);

    if (task.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not active'
      });
    }

    // If faculty, verify they are assigned to this venue
    if (userRole === 2) {
      const [faculty] = await connection.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [userId]);

      if (faculty.length === 0 || task[0].assigned_faculty_id !== faculty[0].faculty_id) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this venue'
        });
      }
    }

    // Verify student exists
    const [student] = await connection.query(`
      SELECT student_id FROM students WHERE student_id = ?
    `, [student_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const currentDueDate = task[0].due_date;
    
    if (!currentDueDate) {
      return res.status(400).json({
        success: false,
        message: 'This task has no due date set'
      });
    }

    // Check if submission exists for this student and task
    const [existingSubmission] = await connection.query(`
      SELECT submission_id, extended_due_date, extension_days FROM task_submissions
      WHERE task_id = ? AND student_id = ?
    `, [task_id, student_id]);

    let submission_id;
    let currentExtensionDays = 0;
    let baseDueDate = new Date(currentDueDate);

    if (existingSubmission.length > 0) {
      submission_id = existingSubmission[0].submission_id;
      currentExtensionDays = existingSubmission[0].extension_days || 0;
      baseDueDate = existingSubmission[0].extended_due_date 
        ? new Date(existingSubmission[0].extended_due_date)
        : new Date(currentDueDate);
    } else {
      // Create a submission record for this student if it doesn't exist
      const [newSubmission] = await connection.query(`
        INSERT INTO task_submissions (task_id, student_id, status, created_at)
        VALUES (?, ?, 'Not Submitted', NOW())
      `, [task_id, student_id]);
      submission_id = newSubmission.insertId;
    }
    
    // Calculate new extended due date
    const extendedDueDate = new Date(baseDueDate);
    extendedDueDate.setDate(extendedDueDate.getDate() + parseInt(extension_days));

    await connection.beginTransaction();

    // Update submission with extension
    await connection.query(`
      UPDATE task_submissions
      SET extended_due_date = ?,
          extension_days = ?
      WHERE submission_id = ?
    `, [extendedDueDate, currentExtensionDays + parseInt(extension_days), submission_id]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: `Task deadline extended by ${extension_days} day(s) for this student`,
      data: {
        task_id,
        student_id,
        original_due_date: currentDueDate,
        extended_due_date: extendedDueDate,
        extension_days: extension_days
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error extending task due date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend task due date',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

export const deleteTask = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { task_id } = req.params;
    const userId = req.user.user_id;

    // Get user role and details
    const [user] = await connection.query(`
      SELECT u.role_id, u.email, f.faculty_id 
      FROM users u 
      LEFT JOIN faculties f ON u.user_id = f.user_id 
      WHERE u.user_id = ?
    `, [userId]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    const facultyId = user[0].faculty_id;

    // Start transaction
    await connection.beginTransaction();

    // Get task details and verify permissions
    const [taskDetails] = await connection.execute(
      'SELECT t.*, v.assigned_faculty_id, v.venue_name FROM tasks t INNER JOIN venue v ON t.venue_id = v.venue_id WHERE t.task_id = ?',
      [task_id]
    );

    if (taskDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const task = taskDetails[0];

    // Admin (role_id = 1) can delete any task
    // Faculty (role_id = 2) can only delete tasks from their assigned venue
    if (userRole === 2) {
      if (!facultyId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'Faculty information not found'
        });
      }

      if (task.assigned_faculty_id !== facultyId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: `You can only delete tasks from your assigned venue. This task is in ${task.venue_name}.`
        });
      }
    } else if (userRole !== 1) {
      // Not admin or faculty
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete tasks'
      });
    }

    // Check if soft delete columns exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasks' 
      AND TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME = 'deleted'
    `);

    let deleteResult;
    if (columns.length > 0) {
      // Soft delete - mark as deleted
      [deleteResult] = await connection.execute(
        'UPDATE tasks SET deleted = 1, deleted_at = NOW() WHERE task_id = ? AND (deleted IS NULL OR deleted = 0)',
        [task_id]
      );
    } else {
      // Hard delete - remove from database
      // First delete submissions
      await connection.execute(
        'DELETE FROM task_submissions WHERE task_id = ?',
        [task_id]
      );
      
      // Then delete task
      [deleteResult] = await connection.execute(
        'DELETE FROM tasks WHERE task_id = ?',
        [task_id]
      );
    }

    if (deleteResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Task not found or already deleted'
      });
    }

    // Commit the transaction
    await connection.commit();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task',
      error: error.message
    });
  } finally {
    connection.release();
  }
};