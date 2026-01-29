import db from '../config/db.js';
import xlsx from 'xlsx';

// Get all faculties with user details
export const getAllFaculties = async (req, res) => {
  try {
    const [faculties] = await db.query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.ID as facultyId,
        u.department,
        u.is_active,
        u.created_at as joinDate,
        f.faculty_id,
        f.designation,
        CASE 
          WHEN u.is_active = 1 THEN 'Active'
          WHEN u.is_active = 0 THEN 'Inactive'
          WHEN u.is_active = 2 THEN 'On Leave'
          ELSE 'Unknown'
        END as status
      FROM users u
      INNER JOIN faculties f ON u. user_id = f.user_id
      WHERE u.role_id = 2
      ORDER BY u.created_at DESC
    `);
    
    res.status(200).json({ success: true, data: faculties });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculties' });
  }
};

// Create new faculty
export const createFaculty = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { name, designation, facultyId, email, department } = req.body;

    // Validation
    if (!name || !designation || !facultyId || !email || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if email already exists
    const [existingEmail] = await connection.query(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );
    
    if (existingEmail.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Check if faculty ID already exists
    const [existingId] = await connection.query(
      'SELECT ID FROM users WHERE ID = ?',
      [facultyId]
    );
    
    if (existingId.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faculty ID already exists' 
      });
    }

    await connection.beginTransaction();

    // Insert into users table
    const [userResult] = await connection.query(
      `INSERT INTO users (role_id, name, email, ID, department, created_at, is_active) 
       VALUES (2, ?, ?, ?, ?, NOW(), 1)`,
      [name, email, facultyId, department]
    );

    const userId = userResult.insertId;
    // console.log(`[CREATE FACULTY] Created user record - user_id: ${userId}, name: ${name}, role_id: 2`);

    // Insert into faculties table
    const [facultyResult] = await connection.query(
      'INSERT INTO faculties (user_id, designation) VALUES (?, ?)',
      [userId, designation]
    );

    const dbFacultyId = facultyResult.insertId;
    // console.log(`[CREATE FACULTY] Created faculty record - faculty_id: ${dbFacultyId}, user_id: ${userId}, designation: ${designation}`);

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Faculty created successfully',
      data: { userId, facultyId: dbFacultyId }
    });

  } catch (error) {
    await connection. rollback();
    console.error('Error creating faculty:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create faculty' 
    });
  } finally {
    connection.release();
  }
};

// Update faculty
export const updateFaculty = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { userId } = req.params;
    const { name, designation, email, department, is_active } = req.body;

    // Validation
    if (!name || !designation || !email || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if user exists and is faculty
    const [existingUser] = await connection.query(
      'SELECT user_id, role_id FROM users WHERE user_id = ?  AND role_id = 2',
      [userId]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty not found' 
      });
    }

    // Check if email is being changed and if it already exists
    const [emailCheck] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?  AND user_id != ?',
      [email, userId]
    );
    
    if (emailCheck.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    await connection.beginTransaction();

    // Update users table
    await connection. query(
      `UPDATE users 
       SET name = ?, email = ?, department = ?, is_active = ? 
       WHERE user_id = ? `,
      [name, email, department, is_active !== undefined ? is_active : 1, userId]
    );

    // Update faculties table
    await connection.query(
      'UPDATE faculties SET designation = ? WHERE user_id = ?',
      [designation, userId]
    );

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: 'Faculty updated successfully' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating faculty:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update faculty' 
    });
  } finally {
    connection.release();
  }
};

// Delete faculty
export const deleteFaculty = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { userId } = req.params;

    // Check if user exists and is faculty
    const [existingUser] = await connection.query(
      'SELECT user_id, role_id, email, ID FROM users WHERE user_id = ? AND role_id = 2',
      [userId]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty not found' 
      });
    }

    // Get faculty_id for the user
    const [facultyRecord] = await connection.query(
      'SELECT faculty_id FROM faculties WHERE user_id = ?',
      [userId]
    );

    await connection.beginTransaction();

    if (facultyRecord.length > 0) {
      const facultyId = facultyRecord[0].faculty_id;

      // Get counts of affected records before deleting
      const [venueCount] = await connection.query(
        'SELECT COUNT(*) as count FROM venue WHERE assigned_faculty_id = ?',
        [facultyId]
      );
      
      const [groupsCount] = await connection.query(
        'SELECT COUNT(*) as count FROM `groups` WHERE faculty_id = ?',
        [facultyId]
      );

      const [studentsCount] = await connection.query(
        'SELECT COUNT(*) as count FROM students WHERE assigned_faculty_id = ?',
        [facultyId]
      );

      // Unassign faculty from venues (set to NULL)
      await connection.query(
        'UPDATE venue SET assigned_faculty_id = NULL WHERE assigned_faculty_id = ?',
        [facultyId]
      );

      // Unassign faculty from students (set to NULL)
      await connection.query(
        'UPDATE students SET assigned_faculty_id = NULL WHERE assigned_faculty_id = ?',
        [facultyId]
      );

      // Delete from faculties table first
      // Foreign key constraints will handle:
      // - groups.faculty_id -> SET NULL
      // - attendance.faculty_id -> CASCADE DELETE
      // - roadmap.faculty_id -> CASCADE DELETE  
      // - student_skills.faculty_id -> SET NULL
      await connection.query('DELETE FROM faculties WHERE faculty_id = ?', [facultyId]);

      // Delete from users table
      await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);

      await connection.commit();

      const messages = [];
      if (venueCount[0].count > 0) messages.push(`${venueCount[0].count} venue(s) unassigned`);
      if (groupsCount[0].count > 0) messages.push(`${groupsCount[0].count} group(s) unassigned`);
      if (studentsCount[0].count > 0) messages.push(`${studentsCount[0].count} student(s) unassigned`);

      res.status(200).json({ 
        success: true, 
        message: messages.length > 0 
          ? `Faculty deleted successfully. ${messages.join(', ')}.`
          : 'Faculty deleted successfully.',
        affectedRecords: {
          venues: venueCount[0].count,
          groups: groupsCount[0].count,
          students: studentsCount[0].count
        }
      });

    } else {
      // No faculty record found, just delete user
      await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);
      await connection.commit();
      
      res.status(200).json({ 
        success: true, 
        message: 'Faculty deleted successfully.'
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting faculty:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete faculty',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get single faculty by user_id
export const getFacultyById = async (req, res) => {
  try {
    const { userId } = req.params;

    const [faculty] = await db.query(`
      SELECT 
        u. user_id,
        u. name,
        u.email,
        u.ID as facultyId,
        u.department,
        u.is_active,
        u.created_at as joinDate,
        f.faculty_id,
        f.designation
      FROM users u
      INNER JOIN faculties f ON u.user_id = f.user_id
      WHERE u.user_id = ? AND u.role_id = 2
    `, [userId]);

    if (faculty.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message:  'Faculty not found' 
      });
    }

    res.status(200).json({ success: true, data: faculty[0] });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch faculty' 
    });
  }
};

/**
 * Bulk upload faculties from Excel - Admin only
 * Inserts into users and faculties tables
 * Excel columns: name, email, facultyId, department, designation
 */
export const bulkUploadFaculties = async (req, res) => {
  // Check admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can bulk upload faculties' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const connection = await db.getConnection();

  try {
    // Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    if (data.length > 1000) {
      return res.status(400).json({ success: false, message: 'Maximum 1000 records allowed per upload' });
    }

    await connection.beginTransaction();

    let facultiesAdded = 0;
    let facultiesSkipped = 0;
    const errors = [];
    const successfulFaculties = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel row number (1-indexed + header)

      // Extract fields (support multiple column name formats)
      const name = (row.name || row.Name || row.NAME || '').toString().trim();
      const email = (row.email || row.Email || row.EMAIL || '').toString().trim();
      const facultyId = (row.facultyId || row.faculty_id || row.FacultyId || row.FACULTY_ID || row.ID || row.id || '').toString().trim();
      const department = (row.department || row.Department || row.DEPARTMENT || row.dept || 'General').toString().trim();
      const designation = (row.designation || row.Designation || row.DESIGNATION || row.role || 'Assistant Professor').toString().trim();

      // Validate required fields
      if (!name || !email || !facultyId) {
        errors.push({ row: rowIndex, message: `Missing required fields - name: ${name}, email: ${email}, facultyId: ${facultyId}` });
        facultiesSkipped++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowIndex, message: `Invalid email format: ${email}` });
        facultiesSkipped++;
        continue;
      }

      try {
        // Check if user already exists by email or faculty ID
        const [existingUser] = await connection.query(
          'SELECT user_id, email, ID FROM users WHERE email = ? OR ID = ?',
          [email, facultyId]
        );

        if (existingUser.length > 0) {
          const existing = existingUser[0];
          if (existing.email === email) {
            errors.push({ row: rowIndex, message: `Email already exists: ${email}` });
          } else {
            errors.push({ row: rowIndex, message: `Faculty ID already exists: ${facultyId}` });
          }
          facultiesSkipped++;
          continue;
        }

        // Insert new user with role_id = 2 (faculty)
        const [userResult] = await connection.query(
          `INSERT INTO users (role_id, name, email, ID, department, created_at, is_active) 
           VALUES (2, ?, ?, ?, ?, NOW(), 1)`,
          [name, email, facultyId, department]
        );

        const userId = userResult.insertId;

        // Insert faculty record
        const [facultyResult] = await connection.query(
          'INSERT INTO faculties (user_id, designation) VALUES (?, ?)',
          [userId, designation]
        );

        const newFacultyId = facultyResult.insertId;

        facultiesAdded++;
        successfulFaculties.push({
          row: rowIndex,
          name,
          email,
          facultyId,
          department,
          designation,
          userId,
          faculty_id: newFacultyId
        });

      } catch (err) {
        console.error(`Error processing row ${rowIndex}:`, err);
        errors.push({ row: rowIndex, message: `Database error: ${err.message}` });
        facultiesSkipped++;
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: `Bulk upload completed! Added: ${facultiesAdded} faculties, Skipped: ${facultiesSkipped}`,
      summary: {
        totalRecords: data.length,
        added: facultiesAdded,
        skipped: facultiesSkipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 50),
        successfulFaculties: successfulFaculties.slice(0, 10)
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Bulk upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process upload', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

/**
 * Get faculty's assigned classes/venues with groups and statistics
 * For Faculty "My Classes" screen
 */
export const getFacultyClasses = async (req, res) => {
  try {
    const userId = req.user.user_id;
    // console.log(`[MY CLASSES] user_id: ${userId}`);

    // Get faculty_id for the logged-in user
    const [faculty] = await db.query(
      'SELECT faculty_id FROM faculties WHERE user_id = ?',
      [userId]
    );

    // console.log(`[MY CLASSES] Faculty lookup - user_id: ${userId}, found: ${faculty.length > 0}, faculty_id: ${faculty.length > 0 ? faculty[0].faculty_id : 'NONE'}`);

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }

    const facultyId = faculty[0].faculty_id;

    // Get all venues assigned to this faculty with their groups and student counts
    const [venues] = await db.query(`
      SELECT DISTINCT
        v.venue_id,
        v.venue_name,
        v.location,
        v.capacity,
        v.status as venue_status,
        g.group_id,
        g.group_code,
        g.group_name,
        g.schedule_days,
        g.schedule_time,
        g.department,
        g.max_students,
        g.status as group_status,
        COUNT(DISTINCT gs.student_id) as enrolled_students,
        (
          SELECT COUNT(DISTINCT a.student_id) 
          FROM attendance a 
          WHERE a.venue_id = v.venue_id 
          AND a.is_present = 1
          AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) as present_count_30d,
        (
          SELECT COUNT(*) 
          FROM attendance a 
          WHERE a.venue_id = v.venue_id
          AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) as total_attendance_30d
      FROM venue v
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.assigned_faculty_id = ?
        AND v.status = 'Active'
      GROUP BY v.venue_id, g.group_id
      ORDER BY v.venue_name, g.group_name
    `, [facultyId]);

    // console.log(`[MY CLASSES] Query result for faculty_id ${facultyId}: ${venues.length} venue(s)/group(s)`);

    // Transform into a structured format
    const classesMap = new Map();

    venues.forEach(row => {
      if (!classesMap.has(row.venue_id)) {
        // Calculate attendance percentage
        const attendancePercentage = row.total_attendance_30d > 0 
          ? Math.round((row.present_count_30d / row.total_attendance_30d) * 100) 
          : 0;

        // Determine status based on attendance
        let status = 'active';
        if (attendancePercentage >= 90) status = 'excellent';
        else if (attendancePercentage < 70) status = 'warning';
        else if (attendancePercentage < 60) status = 'critical';

        classesMap.set(row.venue_id, {
          id: row.venue_id,
          code: row.group_code || `VENUE-${row.venue_id}`,
          title: row.venue_name,
          section: row.group_name || 'Default Group',
          dept: row.department || 'General',
          sem: 'Current Semester',
          schedule: row.schedule_days && row.schedule_time 
            ? `${row.schedule_days} • ${row.schedule_time}` 
            : 'Schedule TBD',
          students: row.enrolled_students || 0,
          total: row.capacity || row.max_students || 50,
          attendance: attendancePercentage,
          status: status,
          room: row.location || row.venue_name,
          tasks: 0,
          pendingTasks: 0,
          venue_id: row.venue_id,
          group_id: row.group_id,
          groups: []
        });
      }

      // Add group info if exists
      if (row.group_id) {
        const classData = classesMap.get(row.venue_id);
        classData.groups.push({
          group_id: row.group_id,
          group_code: row.group_code,
          group_name: row.group_name,
          department: row.department,
          schedule_days: row.schedule_days,
          schedule_time: row.schedule_time,
          enrolled_students: row.enrolled_students,
          status: row.group_status
        });
      }
    });

    const classes = Array.from(classesMap.values());

    // Get summary statistics
    const totalStudents = classes.reduce((sum, c) => sum + c.students, 0);
    const avgAttendance = classes.length > 0 
      ? Math.round(classes.reduce((sum, c) => sum + c.attendance, 0) / classes.length) 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        classes: classes,
        summary: {
          totalClasses: classes.length,
          totalStudents: totalStudents,
          averageAttendance: avgAttendance,
          excellentClasses: classes.filter(c => c.status === 'excellent').length,
          warningClasses: classes.filter(c => c.status === 'warning' || c.status === 'critical').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching faculty classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
};