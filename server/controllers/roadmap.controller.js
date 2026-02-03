
// controllers/roadmap.controller.js
import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Sanitize filename to prevent security vulnerabilities
 * - Double extension prevention  
 * - Path traversal prevention
 */
function sanitizeFilename(filename) {
  if (!filename) return 'file';
  
  const ext = path.extname(filename).toLowerCase();
  let baseName = path.basename(filename, ext);
  
  // Remove ALL dots, slashes, backslashes (prevent double extensions)
  baseName = baseName.replace(/[.\\\/]/g, '_');
  baseName = baseName.replace(/[`${};<>|&\"'\\n\\r\\t@#%^*+=\[\]()]/g, '');
  baseName = baseName.replace(/\\.\\./g, '');
  baseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '');
  
  if (baseName.length > 100) {
    baseName = baseName.substring(0, 100);
  }
  
  if (!baseName || baseName.trim() === '') {
    baseName = 'file';
  }
  
  return baseName.trim() + ext;
}

// Configure multer for resource uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/roadmap';
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

export const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only 1 PDF per upload
  },
  fileFilter: (req, file, cb) => {
    const sanitizedName = sanitizeFilename(file.originalname);
    const ext = path.extname(sanitizedName).toLowerCase();
    
    // Only allow PDF
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    
    // Validate MIME type
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('File content must be PDF'));
    }
    
    cb(null, true);
  }
});

// Get roadmap for a venue
export const getRoadmapByVenue = async (req, res) => {
  try {
    const { venue_id } = req.params;
    const user_id = req.user.user_id; // Get user_id from JWT token

    // console.log('Fetching roadmap for venue:', venue_id, 'user:', user_id);

    // Get user role first
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) { // Faculty role
      const [faculty] = await db.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not registered as faculty'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    // Get all roadmap modules for the venue
    // Admin can see all, faculty can only see roadmap for venues they are assigned to
    let query = '';
    let params = [];

    if (userRole === 1) { // Admin
      query = `
        SELECT 
          r.roadmap_id,
          r.day,
          r.title,
          r.description,
          r.course_type,
          r.learning_objectives,
          r.module_order,
          r.status,
          r.created_at,
          r.updated_at,
          r.faculty_id,
          u.name as faculty_name,
          f.user_id as faculty_user_id
        FROM roadmap r
        LEFT JOIN faculties f ON r.faculty_id = f.faculty_id
        LEFT JOIN users u ON f.user_id = u.user_id
        WHERE r.venue_id = ? 
        ORDER BY r.course_type, r.module_order ASC
      `;
      params = [venue_id];
    } else if (userRole === 2 && faculty_id) { // Faculty
      // First check if faculty is assigned to this venue
      const [venueCheck] = await db.query(`
        SELECT venue_id FROM venue WHERE venue_id = ? AND assigned_faculty_id = ?
      `, [venue_id, faculty_id]);

      if (venueCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this venue'
        });
      }

      // Faculty can see all roadmap modules for their assigned venues
      query = `
        SELECT 
          r.roadmap_id,
          r.day,
          r.title,
          r.description,
          r.course_type,
          r.learning_objectives,
          r.module_order,
          r.status,
          r.created_at,
          r.updated_at,
          r.faculty_id,
          u.name as faculty_name,
          f.user_id as faculty_user_id
        FROM roadmap r
        LEFT JOIN faculties f ON r.faculty_id = f.faculty_id
        LEFT JOIN users u ON f.user_id = u.user_id
        WHERE r.venue_id = ?
        ORDER BY r.course_type, r.module_order ASC
      `;
      params = [venue_id];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view roadmap'
      });
    }

    const [modules] = await db.query(query, params);
    // console.log('Found modules:', modules.length);

    // Get resources for each module
    for (let module of modules) {
      const [resources] = await db.query(`
        SELECT 
          resource_id,
          resource_name,
          resource_type,
          resource_url,
          file_path,
          file_size,
          uploaded_at
        FROM roadmap_resources
        WHERE roadmap_id = ?
        ORDER BY uploaded_at ASC
      `, [module.roadmap_id]);

      module.resources = resources || [];
    }

    res.status(200).json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roadmap'
    });
  }
};

// Get all roadmap modules across all venues (for "All Venues" view)
export const getAllVenuesRoadmap = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const user_role = req.user.role;
    const { course_type } = req.query; // Get course_type filter from query

    let query = `
      SELECT 
        r.roadmap_id,
        r.group_id,
        r.venue_id,
        v.venue_name,
        v.year as venue_year,
        r.faculty_id,
        r.day,
        r.title,
        r.description,
        r.course_type,
        r.learning_objectives,
        r.module_order,
        r.status,
        r.is_template,
        r.created_at,
        r.updated_at
      FROM roadmap r
      LEFT JOIN venue v ON r.venue_id = v.venue_id
      WHERE r.group_id IS NOT NULL
    `;

    const params = [];
    
    // Filter by course_type if provided
    if (course_type) {
      query += ' AND r.course_type = ?';
      params.push(course_type);
    }

    // Group modules by group_id and course_type
    const [modules] = await db.query(query + ' ORDER BY r.course_type, r.day, r.created_at DESC', params);

    // For each unique skill (title + course_type), check if there are skill order venue restrictions
    const skillOrderRestrictions = new Map();
    
    // Get all skill orders that have venue restrictions
    const [skillOrders] = await db.query(`
      SELECT so.id, so.skill_name, so.course_type, so.apply_to_all_venues
      FROM skill_order so
      WHERE so.apply_to_all_venues = 0
    `);

    // Build map of course_type -> allowed venue_ids (union of all skills in that course_type)
    const courseTypeRestrictions = new Map();
    
    for (const so of skillOrders) {
      const [venueRestrictions] = await db.query(`
        SELECT venue_id FROM skill_order_venues WHERE skill_order_id = ?
      `, [so.id]);
      
      if (venueRestrictions.length > 0) {
        const courseType = so.course_type;
        if (!courseTypeRestrictions.has(courseType)) {
          courseTypeRestrictions.set(courseType, new Set());
        }
        // Add all venues from this skill to the course_type set
        venueRestrictions.forEach(v => {
          courseTypeRestrictions.get(courseType).add(v.venue_id);
        });
      }
    }

    // Filter modules based on course_type skill order restrictions
    const filteredModules = modules.filter(module => {
      // If this course_type has venue restrictions, only show venues in that list
      if (courseTypeRestrictions.has(module.course_type)) {
        const allowedVenues = courseTypeRestrictions.get(module.course_type);
        return allowedVenues.has(module.venue_id);
      }
      
      // No restrictions for this course_type, show all
      return true;
    });

    // Group by group_id to show unique modules
    const groupedModules = {};
    filteredModules.forEach(module => {
      const key = `${module.group_id}_${module.course_type}`;
      if (!groupedModules[key]) {
        groupedModules[key] = {
          ...module,
          venues_count: 0,
          venues: [],
          first_roadmap_id: module.roadmap_id // Store first roadmap_id to fetch resources
        };
      }
      groupedModules[key].venues_count++;
      groupedModules[key].venues.push({
        venue_id: module.venue_id,
        venue_name: module.venue_name,
        venue_year: module.venue_year,
        roadmap_id: module.roadmap_id
      });
    });

    const uniqueModules = Object.values(groupedModules);

    // Fetch resources for each unique module (from the first venue in the group)
    for (let module of uniqueModules) {
      const [resources] = await db.query(`
        SELECT 
          resource_id,
          resource_name,
          resource_type,
          resource_url,
          file_path,
          file_size,
          uploaded_at
        FROM roadmap_resources
        WHERE roadmap_id = ?
        ORDER BY uploaded_at DESC
      `, [module.first_roadmap_id]);

      module.resources = resources || [];
      delete module.first_roadmap_id; // Remove temporary field
    }

    res.status(200).json({
      success: true,
      data: uniqueModules
    });
  } catch (error) {
    console.error('Error fetching all venues roadmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roadmap'
    });
  }
};

// Delete roadmap module group (all modules with same group_id)
export const deleteRoadmapModuleGroup = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { group_id } = req.params;

    await connection.beginTransaction();

    // First, get all roadmap_ids in this group
    const [modules] = await connection.query(
      'SELECT roadmap_id FROM roadmap WHERE group_id = ?',
      [group_id]
    );

    if (modules.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No modules found with this group ID'
      });
    }

    const roadmap_ids = modules.map(m => m.roadmap_id);

    // Delete all resources associated with these modules
    if (roadmap_ids.length > 0) {
      const [resources] = await connection.query(
        `SELECT file_path FROM roadmap_resources WHERE roadmap_id IN (?)`,
        [roadmap_ids]
      );

      // Delete resource files from filesystem
      resources.forEach(resource => {
        if (resource.file_path) {
          const filePath = path.join(process.cwd(), resource.file_path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });

      // Delete resource records
      await connection.query(
        'DELETE FROM roadmap_resources WHERE roadmap_id IN (?)',
        [roadmap_ids]
      );
    }

    // Delete all roadmap modules in this group
    const [result] = await connection.query(
      'DELETE FROM roadmap WHERE group_id = ?',
      [group_id]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Module group deleted successfully',
      data: { deleted_count: result.affectedRows }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting roadmap module group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete module group'
    });
  } finally {
    connection.release();
  }
};

// Create new roadmap module
export const createRoadmapModule = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venue_id, day, title, description, status, course_type, learning_objectives, apply_to_all_venues } = req.body;
    const user_id = req.user.user_id; // Get user_id from JWT

    // console.log('Creating module:', { venue_id, day, title, course_type, user_id, apply_to_all_venues });

    if (!venue_id || !day || !title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide venue_id, day, and title'
      });
    }

    // Get user role and determine faculty_id
    let actual_faculty_id;

    if (req.user.role === 'admin') {
      // Admin can create modules for any venue
      // First check if admin is also a faculty
      const [faculty] = await connection.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);
      
      if (faculty.length > 0) {
        actual_faculty_id = faculty[0].faculty_id;
      } else {
        // Admin is not a faculty - use the venue's assigned faculty
        const [venueData] = await connection.query('SELECT assigned_faculty_id FROM venue WHERE venue_id = ?', [venue_id]);
        if (venueData.length > 0 && venueData[0].assigned_faculty_id) {
          actual_faculty_id = venueData[0].assigned_faculty_id;
        } else {
          // No faculty assigned to venue - get any active faculty as fallback
          const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
          if (anyFaculty.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No faculty available. Please assign a faculty to this venue first.'
            });
          }
          actual_faculty_id = anyFaculty[0].faculty_id;
        }
      }
    } else if (req.user.role === 'faculty') {
      // Faculty must use their own faculty_id
      const [faculty] = await connection.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not registered as faculty'
        });
      }

      actual_faculty_id = faculty[0].faculty_id;

      // Check if faculty is assigned to this venue
      const [venueCheck] = await connection.query(`
        SELECT venue_id FROM venue WHERE venue_id = ? AND assigned_faculty_id = ?
      `, [venue_id, actual_faculty_id]);

      if (venueCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to create modules for this venue'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'User role not authorized to create modules'
      });
    }

    await connection.beginTransaction();

    // ALWAYS check if there's a skill order that restricts venues/years for this course_type
    let skillOrderVenues = [];
    let skillOrderRestricted = false;
    
    if (course_type && (apply_to_all_venues === 'true' || apply_to_all_venues === true)) {
      // When "All Venues" is selected, check ALL skill orders for this course_type
      // Get the intersection of allowed venues across all skills in this course_type
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
    }

    // Determine venues to create roadmaps for
    let targetVenues = [];
    let group_id = null;
    
    if (skillOrderRestricted) {
      // PRIORITY 1: If skill order has venue restrictions, ONLY use those venues
      targetVenues = skillOrderVenues;
      group_id = `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else if (apply_to_all_venues === 'true' || apply_to_all_venues === true) {
      // PRIORITY 2: User selected "all venues" and no skill order restrictions
      const [allVenues] = await connection.query(`
        SELECT venue_id FROM venue WHERE status = 'Active'
      `);
      targetVenues = allVenues.map(v => v.venue_id);
      group_id = `roadmap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      // PRIORITY 3: Single venue selected
      targetVenues = [parseInt(venue_id)];
    }

    const createdRoadmaps = [];
    const skippedVenues = [];

    // Create roadmap for each target venue
    for (const target_venue_id of targetVenues) {
      // Get venue's faculty or use the provided one
      let venue_faculty_id = actual_faculty_id;
      
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

      // Check if day already exists for this venue and course_type
      const [existing] = await connection.query(`
        SELECT roadmap_id FROM roadmap
        WHERE venue_id = ? AND day = ? AND course_type = ?
      `, [target_venue_id, day, course_type || 'frontend']);

      if (existing.length > 0) {
        if (!apply_to_all_venues) {
          // For single venue, return error
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Module ${day} already exists for this course in this venue`
          });
        } else {
          // For all venues, skip this venue and continue
          skippedVenues.push(target_venue_id);
          continue;
        }
      }

      // Insert roadmap for this venue
      const [result] = await connection.query(`
        INSERT INTO roadmap (group_id, venue_id, faculty_id, day, title, description, course_type, learning_objectives, module_order, status, is_template, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [group_id, target_venue_id, venue_faculty_id, day, title, description || '', course_type || 'frontend', learning_objectives || '', day, status || 'draft', group_id ? 1 : 0]);

      createdRoadmaps.push({ roadmap_id: result.insertId, venue_id: target_venue_id });
    }

    await connection.commit();

    // Check if any roadmaps were created
    if (createdRoadmaps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Module already exists in all selected venues'
      });
    }

    res.status(201).json({
      success: true,
      message: apply_to_all_venues 
        ? `Roadmap module created for ${createdRoadmaps.length} venue(s)${skippedVenues.length > 0 ? `, skipped ${skippedVenues.length} (already exists)` : ''}!`
        : 'Roadmap module created successfully!',
      data: { 
        roadmaps: createdRoadmaps,
        group_id: group_id,
        venues_count: createdRoadmaps.length,
        skipped_count: skippedVenues.length,
        total_venues: targetVenues.length
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating roadmap module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create roadmap module',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update roadmap module
export const updateRoadmapModule = async (req, res) => {
  try {
    const { roadmap_id } = req.params;
    const { title, description, status, course_type, learning_objectives } = req.body;
    const user_id = req.user.user_id;

    // console.log('Updating module:', roadmap_id, { title, status, course_type });

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Get user role
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) {
      const [faculty] = await db.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not a faculty member'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    let whereClause = '';
    let params = [];

    if (userRole === 1) { // Admin can update any module
      whereClause = 'roadmap_id = ?';
      params = [title, description || '', course_type || 'frontend', learning_objectives || '', status || 'published', roadmap_id];
    } else if (userRole === 2 && faculty_id) { // Faculty can only update their own
      whereClause = 'roadmap_id = ? AND faculty_id = ?';
      params = [title, description || '', course_type || 'frontend', learning_objectives || '', status || 'published', roadmap_id, faculty_id];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this module'
      });
    }

    const [result] = await db.query(`
      UPDATE roadmap
      SET title = ?, description = ?, course_type = ?, learning_objectives = ?, status = ?, updated_at = NOW()
      WHERE ${whereClause}
    `, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module not found or unauthorized'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Roadmap module updated successfully!'
    });
  } catch (error) {
    console.error('Error updating roadmap module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update roadmap module'
    });
  }
};

// Delete roadmap module
export const deleteRoadmapModule = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { roadmap_id } = req.params;
    const user_id = req.user.user_id;

    // console.log('Deleting module:', roadmap_id);

    await connection.beginTransaction();

    // Get user role
    const [user] = await connection.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) {
      const [faculty] = await connection.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'User is not a faculty member'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    // Build where clause based on user role
    let whereClause = '';
    let params = [];

    if (userRole === 1) { // Admin can delete any module
      whereClause = 'roadmap_id = ?';
      params = [roadmap_id];
    } else if (userRole === 2 && faculty_id) { // Faculty can only delete their own
      whereClause = 'roadmap_id = ? AND faculty_id = ?';
      params = [roadmap_id, faculty_id];
    } else {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this module'
      });
    }

    // Get module to verify it exists
    const [module] = await connection.query(`
      SELECT roadmap_id FROM roadmap WHERE ${whereClause}
    `, params);

    if (module.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Module not found or unauthorized'
      });
    }

    // Get all resource files to delete them
    const [resources] = await connection.query(`
      SELECT file_path FROM roadmap_resources
      WHERE roadmap_id = ? AND file_path IS NOT NULL
    `, [roadmap_id]);

    // Delete files from filesystem
    for (const resource of resources) {
      if (resource.file_path && fs.existsSync(resource.file_path)) {
        try {
          fs.unlinkSync(resource.file_path);
          // console.log('Deleted file:', resource.file_path);
        } catch (fileError) {
          console.warn('Failed to delete file:', resource.file_path, fileError.message);
        }
      }
    }

    // Delete resources from database
    await connection.query(`
      DELETE FROM roadmap_resources WHERE roadmap_id = ?
    `, [roadmap_id]);

    // Delete roadmap module
    await connection.query(`
      DELETE FROM roadmap WHERE roadmap_id = ?
    `, [roadmap_id]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Roadmap module deleted successfully!'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting roadmap module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete roadmap module'
    });
  } finally {
    connection.release();
  }
};

// Add resource to roadmap module
export const addResourceToModule = async (req, res) => {
  try {
    const { roadmap_id, resource_name, resource_type, resource_url, existing_file_path } = req.body;
    const file = req.file;
    const user_id = req.user.user_id;

    // console.log('Adding resource:', { roadmap_id, resource_name, resource_type, hasFile: !!file, existing_file_path, user_id });

    if (!roadmap_id || !resource_name || !resource_type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roadmap_id, resource_name, and resource_type'
      });
    }

    // Validate resource type
    if (!['pdf', 'video', 'link'].includes(resource_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource type. Must be pdf, video, or link'
      });
    }

    // Get user role
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) {
      const [faculty] = await db.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not a faculty member'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    // Verify the module belongs to the user (or admin can access any)
    let verifyQuery = '';
    let verifyParams = [];

    if (userRole === 1) { // Admin can add resource to any module
      verifyQuery = 'SELECT roadmap_id FROM roadmap WHERE roadmap_id = ?';
      verifyParams = [roadmap_id];
    } else if (userRole === 2 && faculty_id) { // Faculty can only add to their own
      verifyQuery = 'SELECT roadmap_id FROM roadmap WHERE roadmap_id = ? AND faculty_id = ?';
      verifyParams = [roadmap_id, faculty_id];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to add resource to this module'
      });
    }

    const [verify] = await db.query(verifyQuery, verifyParams);

    if (verify.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to add resource to this module'
      });
    }

    let filePath = null;
    let fileSize = null;
    let url = resource_url || null;

    // If it's a PDF upload
    if (resource_type === 'pdf') {
      // Check if using existing file path (for multi-venue resource addition)
      if (existing_file_path) {
        filePath = existing_file_path;
        // Get file size from existing file
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          fileSize = stats.size;
        }
      } else if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF file'
        });
      } else {
        filePath = file.path;
        fileSize = file.size;
      }
      url = null;
    } else {
      // For video or link, URL is required
      if (!resource_url) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a resource URL'
        });
      }
    }

    const [result] = await db.query(`
      INSERT INTO roadmap_resources (roadmap_id, resource_name, resource_type, resource_url, file_path, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [roadmap_id, resource_name, resource_type, url, filePath, fileSize]);

    res.status(201).json({
      success: true,
      message: 'Resource added successfully!',
      data: {
        resource_id: result.insertId,
        file_path: filePath
      }
    });
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add resource'
    });
  }
};

// Delete resource from roadmap module
export const deleteResourceFromModule = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const user_id = req.user.user_id;

    // console.log('Deleting resource:', resource_id);

    // Get user role
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) {
      const [faculty] = await db.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not a faculty member'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    // Get resource details and verify ownership
    let query = '';
    let params = [];

    if (userRole === 1) { // Admin can delete any resource
      query = `
        SELECT rr.file_path, rr.roadmap_id 
        FROM roadmap_resources rr
        WHERE rr.resource_id = ?
      `;
      params = [resource_id];
    } else if (userRole === 2 && faculty_id) { // Faculty can only delete their own
      query = `
        SELECT rr.file_path, rr.roadmap_id 
        FROM roadmap_resources rr
        JOIN roadmap r ON rr.roadmap_id = r.roadmap_id
        WHERE rr.resource_id = ? AND r.faculty_id = ?
      `;
      params = [resource_id, faculty_id];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete resource'
      });
    }

    const [resources] = await db.query(query, params);

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or unauthorized'
      });
    }

    // Delete file from filesystem if it exists
    const filePath = resources[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        // console.log('Deleted resource file:', filePath);
      } catch (fileError) {
        console.warn('Failed to delete file:', filePath, fileError.message);
      }
    }

    // Delete from database
    await db.query(`
      DELETE FROM roadmap_resources WHERE resource_id = ?
    `, [resource_id]);

    res.status(200).json({
      success: true,
      message: 'Resource deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource'
    });
  }
};

// Get roadmap for students (by their venue) with skill-based progression
export const getStudentRoadmap = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { course_type } = req.query;

    // console.log('Fetching roadmap for student user:', user_id);
    // console.log('Course type requested:', course_type);

    // Get student info and their venue
    const [student] = await db.query(`
      SELECT 
        s.student_id,
        u.name,
        u.ID as roll_number,
        g.venue_id,
        v.venue_name
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN venue v ON g.venue_id = v.venue_id
      WHERE s.user_id = ?
      LIMIT 1
    `, [user_id]);

    // console.log('Student query result:', student.length, 'rows');

    if (student.length === 0) {
      console.error('Student not found for user_id:', user_id);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student_id = student[0].student_id;
    const venue_id = student[0].venue_id;
    
    // console.log('Student ID:', student_id, 'Venue ID:', venue_id);

    if (!venue_id) {
      // console.log('No venue assigned for student');
      return res.status(200).json({
        success: true,
        message: 'No venue assigned yet',
        data: [],
        venue: {
          student_id: student_id,
          venue_id: null,
          venue_name: null
        },
        skill_progression: []
      });
    }

    // Get skill order (GLOBAL - same for all venues)
    let skillOrderQuery = `
      SELECT 
        so.id as skill_order_id,
        so.skill_name,
        so.display_order,
        so.is_prerequisite,
        so.description as skill_description,
        so.course_type
      FROM skill_order so
      WHERE 1=1
    `;
    const skillOrderParams = [];
    
    if (course_type) {
      skillOrderQuery += ` AND so.course_type = ?`;
      skillOrderParams.push(course_type);
    }
    
    skillOrderQuery += ` ORDER BY so.course_type, so.display_order ASC`;
    
    const [skillOrders] = await db.query(skillOrderQuery, skillOrderParams);

    // Use skills directly (no venue preference needed anymore)
    const orderedSkills = skillOrders;

    // Get student's skill status
    const [studentSkills] = await db.query(`
      SELECT 
        ss.course_name,
        ss.status,
        ss.best_score,
        ss.latest_score,
        ss.proficiency_level
      FROM student_skills ss
      WHERE ss.student_id = ?
    `, [student_id]);

    // Helper function to normalize skill names for comparison
    // Only lowercase and trim - exact matching required
    const normalizeSkillName = (name) => {
      if (!name) return '';
      return name.toLowerCase().trim();
    };

    // Helper function to check if a student skill matches a skill order entry
    // Uses exact case-insensitive matching
    const skillMatches = (studentSkillName, orderSkillName) => {
      const studentNorm = normalizeSkillName(studentSkillName);
      const orderNorm = normalizeSkillName(orderSkillName);
      return studentNorm === orderNorm;
    };

    // Create a map of student's cleared skills (normalize to lowercase)
    const clearedSkillsMap = new Map();
    const ongoingSkillsMap = new Map();
    const clearedSkillsList = []; // Keep list for flexible matching
    const ongoingSkillsList = [];
    
    studentSkills.forEach(skill => {
      const normalizedName = normalizeSkillName(skill.course_name);
      if (skill.status === 'Cleared') {
        clearedSkillsMap.set(normalizedName, skill);
        clearedSkillsList.push(skill);
      } else if (skill.status === 'Ongoing' || skill.status === 'Not Cleared') {
        ongoingSkillsMap.set(normalizedName, skill);
        ongoingSkillsList.push(skill);
      }
    });

    // console.log('========== STUDENT ROADMAP SKILL PROGRESSION ==========');
    // console.log('Student ID:', student_id, 'Venue:', venue_id);
    // console.log('Student skills from DB:', studentSkills.map(s => ({ name: s.course_name, status: s.status })));
    // console.log('Cleared skills (normalized):', Array.from(clearedSkillsMap.keys()));
    // console.log('Skill order entries:', orderedSkills.map(s => s.skill_name));

    // Build skill progression with unlock status
    const skillProgression = [];
    const courseProgress = {}; // Track progress per course type
    
    for (const skill of orderedSkills) {
      const skillNameNormalized = normalizeSkillName(skill.skill_name);
      
      // Check with flexible matching - exact match first, then keyword matching
      let isCleared = clearedSkillsMap.has(skillNameNormalized);
      let isOngoing = ongoingSkillsMap.has(skillNameNormalized);
      let matchedSkill = null;
      
      // If no exact match, try flexible matching
      if (!isCleared && !isOngoing) {
        matchedSkill = clearedSkillsList.find(s => skillMatches(s.course_name, skill.skill_name));
        if (matchedSkill) {
          isCleared = true;
          // console.log(`Skill "${skill.skill_name}" MATCHED with cleared skill "${matchedSkill.course_name}" via flexible matching`);
        } else {
          matchedSkill = ongoingSkillsList.find(s => skillMatches(s.course_name, skill.skill_name));
          if (matchedSkill) {
            isOngoing = true;
            // console.log(`Skill "${skill.skill_name}" MATCHED with ongoing skill "${matchedSkill.course_name}" via flexible matching`);
          }
        }
      }
      
      // console.log(`Skill "${skill.skill_name}" -> normalized: "${skillNameNormalized}", isCleared: ${isCleared}, isOngoing: ${isOngoing}`);
      
      // Initialize course progress tracker
      if (!courseProgress[skill.course_type]) {
        courseProgress[skill.course_type] = { previousCleared: true, currentUnlocked: null };
      }
      
      const courseTracker = courseProgress[skill.course_type];
      
      // STRICT SEQUENTIAL UNLOCKING:
      // A skill is unlocked ONLY if:
      // 1. It's already cleared by the student (they can always access cleared content), OR
      // 2. ALL previous skills in the same course are cleared
      // This ensures strict sequential progression
      const isUnlockedByClearing = isCleared;
      const isUnlockedBySequence = courseTracker.previousCleared;
      const isUnlocked = isUnlockedByClearing || isUnlockedBySequence;
      const isLocked = !isUnlocked;
      
      // console.log(`Skill "${skill.skill_name}": previousCleared=${courseTracker.previousCleared}, isCleared=${isCleared}, isUnlocked=${isUnlocked}, isLocked=${isLocked}`);
      
      // Track the first unlocked but not cleared skill as "current"
      const isCurrent = isUnlocked && !isCleared && !courseTracker.currentUnlocked;
      if (isCurrent) {
        courseTracker.currentUnlocked = skill.skill_name;
      }

      // Get best score from matched skill
      const bestScore = matchedSkill?.best_score || 
                       clearedSkillsMap.get(skillNameNormalized)?.best_score || 
                       ongoingSkillsMap.get(skillNameNormalized)?.best_score || 
                       null;
      
      skillProgression.push({
        skill_order_id: skill.skill_order_id,
        skill_name: skill.skill_name,
        course_type: skill.course_type,
        display_order: skill.display_order,
        description: skill.skill_description,
        status: isCleared ? 'Cleared' : (isLocked ? 'Locked' : (isOngoing ? 'In Progress' : 'Available')),
        is_cleared: isCleared,
        is_locked: isLocked,
        is_current: isCurrent,
        best_score: bestScore,
        matched_with: matchedSkill?.course_name || null
      });

      // Update tracker for next iteration
      // If this skill is cleared, mark the next skill as unlockable
      if (isCleared) {
        courseTracker.previousCleared = true;
      } else {
        // Only block next skills if this one is unlocked but not cleared yet
        if (isUnlocked) {
          courseTracker.previousCleared = false;
        }
      }
    }

    // console.log('\n--- Skill Progression Summary ---');
    skillProgression.forEach(s => {
      // console.log(`${s.skill_name} (${s.course_type}): ${s.status} | Cleared: ${s.is_cleared} | Locked: ${s.is_locked} | Current: ${s.is_current}${s.matched_with ? ` | Matched: "${s.matched_with}"` : ''}`);
    });
    // console.log('======================================================\n');

    // Get all roadmap modules for the student's venue
    let modulesQuery = `
      SELECT 
        r.roadmap_id,
        r.day,
        r.title,
        r.description,
        r.course_type,
        r.learning_objectives,
        r.module_order,
        r.status,
        r.created_at,
        r.updated_at,
        r.faculty_id,
        u.name as faculty_name,
        v.venue_name,
        v.venue_id
      FROM roadmap r
      LEFT JOIN faculties f ON r.faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN venue v ON r.venue_id = v.venue_id
      WHERE r.venue_id = ?
    `;
    const modulesParams = [venue_id];

    if (course_type) {
      modulesQuery += ` AND r.course_type = ?`;
      modulesParams.push(course_type);
    }

    modulesQuery += ` ORDER BY r.course_type, COALESCE(r.module_order, r.day) ASC`;

    const [modules] = await db.query(modulesQuery, modulesParams);

    // console.log('Found modules for student:', modules.length);

    // Create a map of cleared skills for quick lookup (using normalized names)
    const clearedSkillsNormalized = new Set();
    studentSkills.forEach(skill => {
      if (skill.status === 'Cleared') {
        clearedSkillsNormalized.add(normalizeSkillName(skill.course_name));
      }
    });

    // console.log('Cleared skills (for module matching):', Array.from(clearedSkillsNormalized));

    // Track module index per course type for sequential unlocking
    const moduleIndexByCourse = {};
    const firstUnlockedModuleByCourse = {};

    // First pass: determine completion status for all modules
    for (let module of modules) {
      // Get resources for each module
      const [resources] = await db.query(`
        SELECT 
          resource_id,
          resource_name,
          resource_type,
          resource_url,
          file_path,
          file_size,
          uploaded_at
        FROM roadmap_resources
        WHERE roadmap_id = ?
        ORDER BY uploaded_at ASC
      `, [module.roadmap_id]);

      module.resources = resources || [];

      // Helper: Extract keywords for matching (remove common words)
      const extractKeywords = (name) => {
        const normalized = normalizeSkillName(name);
        return normalized
          .split(/[\s\/,.-]+/)
          .filter(word => word.length > 2 && !['level', 'the', 'and', 'for'].includes(word));
      };

      // Try to match module title with skill progression using keyword matching
      let moduleSkillName = null;
      const moduleKeywords = extractKeywords(module.title);
      
      for (const skill of skillProgression) {
        if (skill.course_type !== module.course_type) continue;
        
        const skillKeywords = extractKeywords(skill.skill_name);
        
        // Check if at least 50% of module keywords appear in skill keywords
        const matchingKeywords = moduleKeywords.filter(mk => 
          skillKeywords.some(sk => sk.includes(mk) || mk.includes(sk))
        );
        
        if (matchingKeywords.length >= Math.ceil(moduleKeywords.length * 0.5) && matchingKeywords.length > 0) {
          moduleSkillName = skill.skill_name;
          // console.log(`Module "${module.title}" keywords [${moduleKeywords}] matched skill "${skill.skill_name}" keywords [${skillKeywords}] via [${matchingKeywords}]`);
          break;
        }
      }

      // Find the skill progression entry for this module
      const skillEntry = skillProgression.find(s => 
        normalizeSkillName(s.skill_name) === normalizeSkillName(moduleSkillName || '') &&
        s.course_type === module.course_type
      );

      // Determine if this module/skill is completed
      if (skillEntry) {
        // Module is completed if skill is cleared (is_cleared = 1)
        module.is_completed = Boolean(skillEntry.is_cleared);
        module.matched_skill = skillEntry.skill_name;
        // console.log(`Module "${module.title}" matched skill "${skillEntry.skill_name}", is_cleared: ${skillEntry.is_cleared}, is_completed: ${module.is_completed}`);
      } else {
        // No skill match found - check if any cleared skill keywords match module keywords
        const moduleTitleNormalized = normalizeSkillName(module.title);
        const isCleared = Array.from(clearedSkillsNormalized).some(skillName => 
          moduleTitleNormalized.includes(skillName) || skillName.includes(moduleTitleNormalized.substring(0, 6))
        );
        module.is_completed = isCleared;
        module.matched_skill = null;
        // console.log(`Module "${module.title}" no skill match, checking cleared skills, is_completed: ${isCleared}`);
      }
    }

    // Second pass: determine lock status based on sequential order
    for (let module of modules) {
      const courseType = module.course_type;
      
      // Initialize course index tracker
      if (moduleIndexByCourse[courseType] === undefined) {
        moduleIndexByCourse[courseType] = 0;
      }
      
      const moduleIndex = moduleIndexByCourse[courseType];
      
      // Get all modules of this course type to check previous completion
      const courseModules = modules.filter(m => m.course_type === courseType);
      
      if (moduleIndex === 0) {
        // First module is always unlocked
        module.is_locked = false;
      } else {
        // Check if ALL previous modules are completed
        const previousModules = courseModules.slice(0, moduleIndex);
        const allPreviousCompleted = previousModules.every(m => Boolean(m.is_completed));
        module.is_locked = !allPreviousCompleted;
        
        // Debug logging
        if (!allPreviousCompleted) {
          const incompleteModules = previousModules.filter(m => !m.is_completed).map(m => m.title);
          // console.log(`Module "${module.title}" is LOCKED. Incomplete prerequisites: ${incompleteModules.join(', ')}`);
        }
      }

      // Set current status
      module.is_current = !module.is_locked && !module.is_completed;
      
      // Track first unlocked incomplete module
      if (!module.is_locked && !module.is_completed && !firstUnlockedModuleByCourse[courseType]) {
        firstUnlockedModuleByCourse[courseType] = module.roadmap_id;
        module.is_current = true;
      }

      // Set skill status
      if (module.is_completed) {
        module.skill_status = 'Cleared';
      } else if (module.is_locked) {
        module.skill_status = 'Locked';
      } else {
        module.skill_status = 'Available';
      }

      module.locked_reason = module.is_locked ? 
        `Complete previous skill to unlock` : '';

      // Increment course index
      moduleIndexByCourse[courseType]++;

      // console.log(`Module "${module.title}": completed=${module.is_completed}, locked=${module.is_locked}, current=${module.is_current}`);
    }

    res.status(200).json({
      success: true,
      data: modules,
      venue: {
        student_id: student_id,
        venue_id: venue_id,
        venue_name: student[0].venue_name
      },
      skill_progression: skillProgression
    });
  } catch (error) {
    console.error('Error fetching student roadmap:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roadmap',
      error: error.message
    });
  }
};

// Get resource file (for download)
export const getResourceFile = async (req, res) => {
  try {
    const { resource_id } = req.params;
    const { mode } = req.query; // ?mode=preview or ?mode=download
    const user_id = req.user.user_id;

    // console.log('Accessing resource:', resource_id, 'mode:', mode || 'preview');

    // Get user role
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;
    let faculty_id = null;
    let student_venue_id = null;

    // If user is faculty, get their faculty_id
    if (userRole === 2) {
      const [faculty] = await db.query(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);

      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'User is not a faculty member'
        });
      }
      faculty_id = faculty[0].faculty_id;
    }

    // If user is student, get their venue_id
    if (userRole === 3) {
      const [student] = await db.query(`
        SELECT g.venue_id
        FROM students s
        LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
        LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE s.user_id = ?
        LIMIT 1
      `, [user_id]);

      if (student.length === 0 || !student[0].venue_id) {
        return res.status(403).json({
          success: false,
          message: 'Student not found or no venue assigned'
        });
      }
      student_venue_id = student[0].venue_id;
    }

    // Verify access before allowing download
    let query = '';
    let params = [];

    if (userRole === 1) { // Admin can access any resource
      query = `
        SELECT rr.resource_name, rr.file_path, rr.resource_type
        FROM roadmap_resources rr
        WHERE rr.resource_id = ?
      `;
      params = [resource_id];
    } else if (userRole === 2 && faculty_id) { // Faculty can only access their own
      query = `
        SELECT rr.resource_name, rr.file_path, rr.resource_type
        FROM roadmap_resources rr
        JOIN roadmap r ON rr.roadmap_id = r.roadmap_id
        WHERE rr.resource_id = ? AND r.faculty_id = ?
      `;
      params = [resource_id, faculty_id];
    } else if (userRole === 3 && student_venue_id) { // Students can access resources from their venue
      query = `
        SELECT rr.resource_name, rr.file_path, rr.resource_type
        FROM roadmap_resources rr
        JOIN roadmap r ON rr.roadmap_id = r.roadmap_id
        WHERE rr.resource_id = ? AND r.venue_id = ?
      `;
      params = [resource_id, student_venue_id];
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access resource'
      });
    }

    const [resources] = await db.query(query, params);

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or unauthorized'
      });
    }

    const resource = resources[0];

    if (resource.resource_type !== 'pdf' || !resource.file_path) {
      return res.status(400).json({
        success: false,
        message: 'This resource is not a downloadable file'
      });
    }

    if (!fs.existsSync(resource.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set proper headers based on mode
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    if (mode === 'download') {
      // Force download
      res.setHeader('Content-Disposition', `attachment; filename="${resource.resource_name}.pdf"`);
    } else {
      // Inline preview (default)
      res.setHeader('Content-Disposition', `inline; filename="${resource.resource_name}.pdf"`);
    }
    
    // Stream the file
    const fileStream = fs.createReadStream(resource.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error accessing resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to access resource'
    });
  }
};

// Update all modules in a group (all venues)
export const updateRoadmapModuleGroup = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { title, description, learning_objectives, status } = req.body;
    const user_id = req.user.user_id;

    // console.log('Updating module group:', group_id, { title, status });

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Get user role
    const [user] = await db.query(`
      SELECT role_id FROM users WHERE user_id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found'
      });
    }

    const userRole = user[0].role_id;

    // Only admin can update module groups
    if (userRole !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can update modules across all venues'
      });
    }

    // Update all modules with this group_id
    const [result] = await db.query(`
      UPDATE roadmap
      SET title = ?, description = ?, learning_objectives = ?, status = ?, updated_at = NOW()
      WHERE group_id = ?
    `, [title, description || '', learning_objectives || '', status || 'published', group_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Module group not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Updated ${result.affectedRows} module(s) successfully!`,
      data: {
        updated_count: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Error updating roadmap module group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update roadmap module group'
    });
  }
};