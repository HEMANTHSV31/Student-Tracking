import db from '../config/db.js';
import xlsx from 'xlsx';

export const addIndividualStudentToVenue = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { venueId } = req.params;
    const {
      name,
      email,
      rollNumber,
      reg_no,
      department,
      year,
      semester,
    } = req.body;

    const studentRollNumberRaw = rollNumber ?? reg_no;
    const studentRollNumber =
      typeof studentRollNumberRaw === 'string'
        ? studentRollNumberRaw.trim()
        : String(studentRollNumberRaw ?? '').trim();
    
    // Default name to roll number if not provided
    const studentName = (typeof name === 'string' && name.trim()) 
      ? name.trim() 
      : studentRollNumber;
    
    // Default department to "General" if not provided
    const studentDepartment = (typeof department === 'string' && department.trim())
      ? department.trim()
      : 'General';
    
    const studentEmail =
      typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase()
        : `${studentRollNumber}@student.local`;

    const studentYear = Number(year) || 1;
    const studentSemester = Number(semester) || 1;

    if (!venueId) {
      return res.status(400).json({ success: false, message: 'Venue ID is required' });
    }

    if (!studentRollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number is required',
      });
    }



    await connection.beginTransaction();

    // Find the active group for this venue, or auto-create one if none exists.
    let [groupRows] = await connection.query(
      `SELECT g.group_id, g.max_students, v.capacity, v.venue_name
       FROM \`groups\` g
       INNER JOIN venue v ON v.venue_id = g.venue_id
       WHERE g.venue_id = ? AND g.status = 'Active'
       ORDER BY g.group_id DESC
       LIMIT 1
       FOR UPDATE`,
      [venueId]
    );

    // Auto-create a default group if none exists
    if (groupRows.length === 0) {
      // First, get venue details
      const [venueRows] = await connection.query(
        `SELECT venue_id, venue_name, capacity, assigned_faculty_id FROM venue WHERE venue_id = ? FOR UPDATE`,
        [venueId]
      );

      if (venueRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Venue not found.',
        });
      }

      const venue = venueRows[0];
      const groupCode = `V${venueId}-DEFAULT`;
      const groupName = `${venue.venue_name} - Default Group`;

      await connection.query(`
        INSERT INTO \`groups\` (group_code, group_name, venue_id, faculty_id, schedule_days, schedule_time, max_students, department, status, created_at)
        VALUES (?, ?, ?, ?, 'Mon-Fri', '09:00-17:00', ?, 'General', 'Active', NOW())
      `, [groupCode, groupName, venueId, venue.assigned_faculty_id || null, venue.capacity || 50]);

      // Re-fetch the newly created group
      [groupRows] = await connection.query(
        `SELECT g.group_id, g.max_students, v.capacity, v.venue_name
         FROM \`groups\` g
         INNER JOIN venue v ON v.venue_id = g.venue_id
         WHERE g.venue_id = ? AND g.status = 'Active'
         ORDER BY g.group_id DESC
         LIMIT 1
         FOR UPDATE`,
        [venueId]
      );
    }

    const group = groupRows[0];
    const groupId = group.group_id;
    const venueCapacity = Number(group.capacity) || 0;
    const groupMaxStudents = Number(group.max_students) || 0;
    const effectiveCapacity =
      venueCapacity > 0 && groupMaxStudents > 0
        ? Math.min(venueCapacity, groupMaxStudents)
        : Math.max(venueCapacity, groupMaxStudents);

    // Upsert user by roll number (users.ID) or email.
    const [existingUsers] = await connection.query(
      `SELECT user_id, email, ID, is_active
       FROM users
       WHERE ID = ? OR email = ?
       LIMIT 1
       FOR UPDATE`,
      [studentRollNumber, studentEmail]
    );

    let userId;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].user_id;

      if (existingUsers[0].is_active === 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Student user exists but is inactive. Activate the user before adding.',
        });
      }

      // Keep data reasonably up to date (without being destructive).
      await connection.query(
        `UPDATE users
         SET name = ?, department = ?, email = ?, role_id = 3
         WHERE user_id = ?`,
        [studentName, studentDepartment, studentEmail, userId]
      );
    } else {
      const [insertUser] = await connection.query(
        `INSERT INTO users (role_id, name, email, ID, department, is_active)
         VALUES (3, ?, ?, ?, ?, 1)`,
        [studentName, studentEmail, studentRollNumber, studentDepartment]
      );

      userId = insertUser.insertId;
    }

    // Upsert student record.
    const [existingStudents] = await connection.query(
      `SELECT student_id
       FROM students
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );

    let studentId;
    if (existingStudents.length > 0) {
      studentId = existingStudents[0].student_id;
      await connection.query(
        `UPDATE students
         SET year = ?, semester = ?
         WHERE student_id = ?`,
        [studentYear, studentSemester, studentId]
      );
    } else {
      const [insertStudent] = await connection.query(
        `INSERT INTO students (user_id, year, semester, assigned_faculty_id)
         VALUES (?, ?, ?, NULL)`,
        [userId, studentYear, studentSemester]
      );
      studentId = insertStudent.insertId;
    }

    // Check if student is already in ANY active class.
    const [existingAllocation] = await connection.query(
      `SELECT gs.group_id, g.venue_id, v.venue_name
       FROM group_students gs
       INNER JOIN \`groups\` g ON g.group_id = gs.group_id
       INNER JOIN venue v ON v.venue_id = g.venue_id
       WHERE gs.student_id = ? AND gs.status = 'Active'
       LIMIT 1
       FOR UPDATE`,
      [studentId]
    );

    if (existingAllocation.length > 0) {
      const alloc = existingAllocation[0];
      await connection.rollback();

      if (Number(alloc.venue_id) === Number(venueId)) {
        return res.status(409).json({
          success: false,
          message: 'Student is already present in this class.',
          data: {
            venue_id: alloc.venue_id,
            venue_name: alloc.venue_name,
            group_id: alloc.group_id,
          },
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Student is already assigned to another class.',
        data: {
          venue_id: alloc.venue_id,
          venue_name: alloc.venue_name,
          group_id: alloc.group_id,
        },
      });
    }

    // Capacity check.
    if (effectiveCapacity > 0) {
      const [countRows] = await connection.query(
        `SELECT COUNT(*) AS cnt
         FROM group_students
         WHERE group_id = ? AND status = 'Active'
         FOR UPDATE`,
        [groupId]
      );
      const currentCount = Number(countRows?.[0]?.cnt ?? 0);
      if (currentCount >= effectiveCapacity) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `Class is full (${currentCount}/${effectiveCapacity}).`,
        });
      }
    }

    // Check if student was previously in this group but was dropped
    const [previousAllocation] = await connection.query(
      `SELECT gs.group_id, gs.status
       FROM group_students gs
       INNER JOIN \`groups\` g ON g.group_id = gs.group_id
       WHERE gs.student_id = ? AND g.venue_id = ?
       FOR UPDATE`,
      [studentId, venueId]
    );

    if (previousAllocation.length > 0) {
      // Student was previously in this venue - reactivate them
      await connection.query(
        `UPDATE group_students gs
         INNER JOIN \`groups\` g ON gs.group_id = g.group_id
         SET gs.status = 'Active'
         WHERE gs.student_id = ? AND g.venue_id = ?`,
        [studentId, venueId]
      );
    } else {
      // Create new allocation
      await connection.query(
        `INSERT INTO group_students (group_id, student_id, status)
         VALUES (?, ?, 'Active')`,
        [groupId, studentId]
      );
    }

    // Get count of existing tasks and roadmap for this venue (for info)
    const [taskCount] = await connection.query(
      `SELECT COUNT(*) as count FROM tasks WHERE venue_id = ? AND status = 'Active'`,
      [venueId]
    );
    const [roadmapCount] = await connection.query(
      `SELECT COUNT(*) as count FROM roadmap WHERE venue_id = ?`,
      [venueId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Student added to class successfully.',
      data: {
        venue_id: Number(venueId),
        venue_name: group.venue_name,
        group_id: groupId,
        user_id: userId,
        student_id: studentId,
        existing_tasks: taskCount[0]?.count || 0,
        existing_roadmap_modules: roadmapCount[0]?.count || 0
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors
    }

    // Handle duplicate unique constraint (group_id, student_id)
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Student is already present in this class.',
      });
    }

    console.error('Error adding individual student to venue:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add student. Please try again.',
    });
  } finally {
    connection.release();
  }
};

// Lookup student by roll number for auto-fill
export const lookupStudentByRollNumber = async (req, res) => {
  try {
    const { rollNumber } = req.params;

    if (!rollNumber || rollNumber.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number is required (minimum 2 characters)' 
      });
    }

    const [students] = await db.query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.ID as rollNumber,
        u.department,
        s.student_id,
        s.year,
        s.semester,
        s.assigned_faculty_id,
        v.venue_name as current_venue
      FROM users u
      LEFT JOIN students s ON u.user_id = s.user_id
      LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN venue v ON g.venue_id = v.venue_id AND v.status = 'Active'
      WHERE u.ID = ? AND u.role_id = 3
      LIMIT 1
    `, [rollNumber.trim()]);

    if (students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found',
        data: null
      });
    }

    const student = students[0];
    res.status(200).json({ 
      success: true, 
      data: {
        name: student.name || '',
        email: student.email || '',
        rollNumber: student.rollNumber,
        department: student.department || '',
        year: student.year || 1,
        semester: student.semester || 1,
        current_venue: student.current_venue || null,
        is_existing: true
      }
    });

  } catch (error) {
    console.error('Error looking up student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to lookup student' 
    });
  }
};

// ===== VENUE MANAGEMENT =====

// Get all unique group specifications
export const getGroupSpecifications = async (req, res) => {
  try {
    const [specifications] = await db.query(`
      SELECT DISTINCT group_specification
      FROM venue
      WHERE group_specification IS NOT NULL AND group_specification != ''
      ORDER BY group_specification ASC
    `);
    
    const specList = specifications.map(s => s.group_specification);
    res.status(200).json({ success: true, data: specList });
  } catch (error) {
    console.error('Error fetching group specifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch group specifications' });
  }
};

// Get all venues (only Active venues)
export const getAllVenues = async (req, res) => {
  try {
    // console.log(`[GET ALL VENUES] user_id: ${req.user.user_id}, role: ${req.user.role}`);
    const { year } = req.query; // Year filter parameter
    
    // Build year filter - can filter by venue's assigned year OR student year
    const yearCondition = year ? `AND (v.year = ${parseInt(year)} OR v.year IS NULL)` : '';
    const studentYearCondition = year ? `AND s.year = ${parseInt(year)}` : '';
    
    // Admin sees all venues
    if (req.user.role === 'admin') {
      const [venues] = await db.query(`
        SELECT 
          v.venue_id,
          v.venue_name,
          v.capacity,
          v.location,
          v.year as venue_year,
          v.group_specification,
          v.status,
          v.created_at,
          f.faculty_id,
          u.name as faculty_name,
          u.email as faculty_email,
          u.department as faculty_department,
          COUNT(DISTINCT CASE WHEN gs.status = 'Active' THEN gs.student_id END) as current_students
        FROM venue v
        LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
        LEFT JOIN users u ON f.user_id = u.user_id
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs.group_id
        WHERE v.status = 'Active'
        ${yearCondition}
        GROUP BY v.venue_id
        ORDER BY v.venue_name
      `);
      
      // console.log(`[GET ALL VENUES] Admin - found ${venues.length} venue(s)`);
      return res.status(200).json({ success: true, data: venues });
    }
    
    // Faculty sees only their assigned venues
    const [faculty] = await db.query(
      'SELECT faculty_id FROM faculties WHERE user_id = ?',
      [req.user.user_id]
    );
    
    // console.log(`[GET ALL VENUES] Faculty lookup - user_id: ${req.user.user_id}, found: ${faculty.length > 0}, faculty_id: ${faculty.length > 0 ? faculty[0].faculty_id : 'NONE'}`);
    
    if (faculty.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Faculty record not found'
      });
    }
    
    const facultyId = faculty[0].faculty_id;
    
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        v.year as venue_year,
        v.group_specification,
        v.status,
        v.created_at,
        f.faculty_id,
        u.name as faculty_name,
        u.email as faculty_email,
        u.department as faculty_department,
        COUNT(DISTINCT CASE WHEN gs.status = 'Active' THEN gs.student_id END) as current_students
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id
      WHERE v.status = 'Active'
        AND v.assigned_faculty_id = ?
        ${yearCondition}
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `, [facultyId]);
    
    // console.log(`[GET ALL VENUES] Faculty ${facultyId} - found ${venues.length} venue(s)`);
    res.status(200).json({ success: true, data: venues });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venues' });
  }
};

// Create new venue
export const createVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venue_name, capacity, location, assigned_faculty_id, year, group_specification } = req.body;

    if (!venue_name || !capacity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Venue name and capacity are required' 
      });
    }

    // Validate year if provided
    if (year && ![1, 2, 3, 4].includes(parseInt(year))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year must be 1, 2, 3, or 4' 
      });
    }

    // Check if venue name already exists
    const [existing] = await connection.query(
      'SELECT venue_id, status FROM venue WHERE venue_name = ?',
      [venue_name]
    );
    
    if (existing.length > 0) {
      // If venue exists but is inactive, reactivate it
      if (existing[0].status === 'Inactive') {
        await connection.beginTransaction();
        
        await connection.query(
          `UPDATE venue SET status = 'Active', capacity = ?, location = ?, assigned_faculty_id = ?, year = ?, group_specification = ? WHERE venue_id = ?`,
          [capacity, location || '', assigned_faculty_id || null, year || null, group_specification || null, existing[0].venue_id]
        );
        
        // Reactivate associated groups
        await connection.query(
          `UPDATE \`groups\` SET status = 'Active' WHERE venue_id = ?`,
          [existing[0].venue_id]
        );
        
        await connection.commit();
        
        return res.status(200).json({ 
          success: true, 
          message: 'Venue reactivated successfully!',
          data: { venue_id: existing[0].venue_id, reactivated: true }
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Venue name already exists. Please choose a different name.' 
      });
    }

    // Check if faculty is already assigned to another venue
    if (assigned_faculty_id) {
      const [facultyCheck] = await connection.query(
        `SELECT v.venue_name, u.name as faculty_name
         FROM venue v 
         INNER JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
         INNER JOIN users u ON f.user_id = u.user_id
         WHERE v.assigned_faculty_id = ? AND v.status = 'Active'`,
        [assigned_faculty_id]
      );

      if (facultyCheck.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `${facultyCheck[0].faculty_name} is already assigned to "${facultyCheck[0].venue_name}". Please choose a different faculty.` 
        });
      }
    }

    await connection.beginTransaction();

    const [result] = await connection.query(`
      INSERT INTO venue (venue_name, capacity, location, assigned_faculty_id, year, group_specification, status, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW())
    `, [venue_name, capacity, location || '', assigned_faculty_id || null, year || null, group_specification || null]);

    const venueId = result.insertId;

    // Auto-create a default group for this venue
    const groupCode = `V${venueId}-DEFAULT`;
    const groupName = `${venue_name} - Default Group`;
    await connection.query(`
      INSERT INTO \`groups\` (group_code, group_name, venue_id, faculty_id, schedule_days, schedule_time, max_students, department, status, created_at)
      VALUES (?, ?, ?, ?, 'Mon-Fri', '09:00-17:00', ?, 'General', 'Active', NOW())
    `, [groupCode, groupName, venueId, assigned_faculty_id || null, capacity || 50]);

    // Copy existing roadmap modules that were created for "all venues" to this new venue
    // console.log(`[CREATE VENUE] Copying existing "all venues" roadmaps to new venue ${venueId}`);
    
    // Get all roadmap groups (modules created with apply_to_all_venues)
    // A group_id indicates the module was created for multiple venues
    const [roadmapGroups] = await connection.query(`
      SELECT DISTINCT group_id
      FROM roadmap
      WHERE group_id IS NOT NULL AND group_id != ''
    `);

    let copiedCount = 0;

    if (roadmapGroups.length > 0) {
      // console.log(`[CREATE VENUE] Found ${roadmapGroups.length} roadmap group(s) to copy`);
      
      // Use the assigned faculty for this venue, or get a default faculty
      let roadmapFacultyId = assigned_faculty_id;
      
      if (!roadmapFacultyId) {
        const [venueData] = await connection.query('SELECT assigned_faculty_id FROM venue WHERE venue_id = ?', [venueId]);
        if (venueData.length > 0 && venueData[0].assigned_faculty_id) {
          roadmapFacultyId = venueData[0].assigned_faculty_id;
        } else {
          // Get any active faculty as fallback
          const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
          if (anyFaculty.length > 0) {
            roadmapFacultyId = anyFaculty[0].faculty_id;
          }
        }
      }
      
      // For each group, copy one representative module (they're all the same within a group)
      for (const group of roadmapGroups) {
        // Get a representative roadmap from this group
        const [groupRoadmaps] = await connection.query(`
          SELECT 
            day,
            title,
            description,
            course_type,
            learning_objectives,
            module_order,
            status,
            group_id
          FROM roadmap
          WHERE group_id = ?
          LIMIT 1
        `, [group.group_id]);

        if (groupRoadmaps.length > 0) {
          const roadmap = groupRoadmaps[0];
          
          // Check if this roadmap already exists for this venue (avoid duplicates)
          const [existing] = await connection.query(`
            SELECT roadmap_id FROM roadmap
            WHERE venue_id = ? AND day = ? AND course_type = ?
          `, [venueId, roadmap.day, roadmap.course_type]);

          if (existing.length === 0) {
            // Insert the roadmap module for the new venue with the same group_id
            const [roadmapResult] = await connection.query(`
              INSERT INTO roadmap (
                venue_id, 
                faculty_id, 
                day, 
                title, 
                description, 
                course_type, 
                learning_objectives, 
                module_order, 
                status, 
                group_id,
                is_template, 
                created_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
            `, [
              venueId,
              roadmapFacultyId,
              roadmap.day,
              roadmap.title,
              roadmap.description,
              roadmap.course_type,
              roadmap.learning_objectives,
              roadmap.module_order,
              roadmap.status,
              roadmap.group_id
            ]);

            const newRoadmapId = roadmapResult.insertId;

            // Copy resources from the source roadmap
            const [sourceRoadmap] = await connection.query(`
              SELECT roadmap_id FROM roadmap 
              WHERE group_id = ? AND roadmap_id != ?
              LIMIT 1
            `, [roadmap.group_id, newRoadmapId]);

            if (sourceRoadmap.length > 0) {
              const [resources] = await connection.query(`
                SELECT resource_name, resource_type, resource_url, file_path, file_size
                FROM roadmap_resources
                WHERE roadmap_id = ?
              `, [sourceRoadmap[0].roadmap_id]);

              for (const resource of resources) {
                await connection.query(`
                  INSERT INTO roadmap_resources (roadmap_id, resource_name, resource_type, resource_url, file_path, file_size, uploaded_at)
                  VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                  newRoadmapId,
                  resource.resource_name,
                  resource.resource_type,
                  resource.resource_url,
                  resource.file_path,
                  resource.file_size
                ]);
              }

              if (resources.length > 0) {
                // console.log(`[CREATE VENUE] Copied ${resources.length} resource(s) for roadmap "${roadmap.title}"`);
              }
            }
            
            copiedCount++;
            // console.log(`[CREATE VENUE] Copied roadmap "${roadmap.title}" (Day ${roadmap.day}, ${roadmap.course_type}) to venue ${venueId}`);
          } else {
            // console.log(`[CREATE VENUE] Roadmap for Day ${roadmap.day} (${roadmap.course_type}) already exists in venue ${venueId}, skipping`);
          }
        }
      }
      
      // console.log(`[CREATE VENUE] Successfully copied ${copiedCount} roadmap module(s) from groups to venue ${venueId}`);
    } else {
      // console.log(`[CREATE VENUE] No roadmap groups found to copy`);
    }

    // ALSO copy existing roadmaps from any existing venue (for legacy roadmaps without group_id)
    // This ensures new venues get the same curriculum as existing venues
    // console.log(`[CREATE VENUE] Checking for existing roadmaps to replicate...`);
    
    const [existingRoadmaps] = await connection.query(`
      SELECT 
        day,
        title,
        description,
        course_type,
        learning_objectives,
        module_order,
        status
      FROM roadmap
      WHERE (group_id IS NULL OR group_id = '')
      GROUP BY day, course_type, title, description, learning_objectives, module_order, status
      ORDER BY course_type, day
    `);

    if (existingRoadmaps.length > 0) {
      // console.log(`[CREATE VENUE] Found ${existingRoadmaps.length} existing roadmap(s) to replicate`);
      
      let roadmapFacultyId = assigned_faculty_id;
      if (!roadmapFacultyId) {
        const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
        if (anyFaculty.length > 0) {
          roadmapFacultyId = anyFaculty[0].faculty_id;
        }
      }

      for (const roadmap of existingRoadmaps) {
        // Check if already exists
        const [existing] = await connection.query(`
          SELECT roadmap_id FROM roadmap
          WHERE venue_id = ? AND day = ? AND course_type = ?
        `, [venueId, roadmap.day, roadmap.course_type]);

        if (existing.length === 0) {
          const [roadmapResult] = await connection.query(`
            INSERT INTO roadmap (
              venue_id, 
              faculty_id, 
              day, 
              title, 
              description, 
              course_type, 
              learning_objectives, 
              module_order, 
              status, 
              is_template, 
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
          `, [
            venueId,
            roadmapFacultyId,
            roadmap.day,
            roadmap.title,
            roadmap.description,
            roadmap.course_type,
            roadmap.learning_objectives,
            roadmap.module_order,
            roadmap.status
          ]);

          const newRoadmapId = roadmapResult.insertId;

          // Copy resources from any source roadmap with the same day/course_type
          const [sourceRoadmap] = await connection.query(`
            SELECT roadmap_id FROM roadmap 
            WHERE day = ? AND course_type = ? AND roadmap_id != ?
            LIMIT 1
          `, [roadmap.day, roadmap.course_type, newRoadmapId]);

          if (sourceRoadmap.length > 0) {
            const [resources] = await connection.query(`
              SELECT resource_name, resource_type, resource_url, file_path, file_size
              FROM roadmap_resources
              WHERE roadmap_id = ?
            `, [sourceRoadmap[0].roadmap_id]);

            for (const resource of resources) {
              await connection.query(`
                INSERT INTO roadmap_resources (roadmap_id, resource_name, resource_type, resource_url, file_path, file_size, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
              `, [
                newRoadmapId,
                resource.resource_name,
                resource.resource_type,
                resource.resource_url,
                resource.file_path,
                resource.file_size
              ]);
            }

            if (resources.length > 0) {
              // console.log(`[CREATE VENUE] Copied ${resources.length} resource(s) for roadmap "${roadmap.title}"`);
            }
          }
          
          copiedCount++;
          // console.log(`[CREATE VENUE] Replicated roadmap "${roadmap.title}" (Day ${roadmap.day}) to venue ${venueId}`);
        }
      }
    }

    // console.log(`[CREATE VENUE] Total roadmaps copied: ${copiedCount}`);

    // Copy existing tasks that were created for "all venues" to this new venue
    // console.log(`[CREATE VENUE] Copying existing "all venues" tasks to new venue ${venueId}`);
    
    // Get all task groups (tasks created with apply_to_all_venues)
    // A group_id indicates the task was created for multiple venues
    const [taskGroups] = await connection.query(`
      SELECT DISTINCT group_id
      FROM tasks
      WHERE group_id IS NOT NULL AND group_id != ''
    `);

    let copiedTaskCount = 0;

    if (taskGroups.length > 0) {
      // console.log(`[CREATE VENUE] Found ${taskGroups.length} task group(s) to copy`);
      
      // Use the assigned faculty for this venue, or get a default faculty
      let taskFacultyId = assigned_faculty_id;
      
      if (!taskFacultyId) {
        const [venueData] = await connection.query('SELECT assigned_faculty_id FROM venue WHERE venue_id = ?', [venueId]);
        if (venueData.length > 0 && venueData[0].assigned_faculty_id) {
          taskFacultyId = venueData[0].assigned_faculty_id;
        } else {
          // Get any active faculty as fallback
          const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
          if (anyFaculty.length > 0) {
            taskFacultyId = anyFaculty[0].faculty_id;
          }
        }
      }
      
      // For each group, copy one representative task (they're all the same within a group)
      for (const group of taskGroups) {
        // Get a representative task from this group
        const [groupTasks] = await connection.query(`
          SELECT 
            title,
            description,
            day,
            due_date,
            max_score,
            material_type,
            external_url,
            skill_filter,
            course_type,
            status,
            group_id
          FROM tasks
          WHERE group_id = ?
          LIMIT 1
        `, [group.group_id]);

        if (groupTasks.length > 0) {
          const task = groupTasks[0];
          
          // Check if this task already exists for this venue (avoid duplicates)
          const [existingTask] = await connection.query(`
            SELECT task_id FROM tasks
            WHERE venue_id = ? AND title = ? AND day = ?
          `, [venueId, task.title, task.day]);

          if (existingTask.length === 0) {
            // Insert the task for the new venue with the same group_id
            const [taskResult] = await connection.query(`
              INSERT INTO tasks (
                venue_id, 
                faculty_id, 
                title,
                description,
                day, 
                due_date,
                max_score,
                material_type,
                external_url,
                skill_filter,
                course_type,
                status,
                group_id,
                is_template, 
                created_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            `, [
              venueId,
              taskFacultyId,
              task.title,
              task.description,
              task.day,
              task.due_date,
              task.max_score,
              task.material_type,
              task.external_url,
              task.skill_filter,
              task.course_type,
              task.status,
              task.group_id
            ]);

            const newTaskId = taskResult.insertId;

            // Create task submissions for all students in this venue
            const [students] = await connection.query(`
              SELECT DISTINCT s.student_id
              FROM students s
              INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
              INNER JOIN \`groups\` g ON gs.group_id = g.group_id
              WHERE g.venue_id = ?
            `, [venueId]);

            if (students.length > 0) {
              for (const student of students) {
                await connection.query(`
                  INSERT INTO task_submissions (task_id, student_id, status, created_at)
                  VALUES (?, ?, 'Pending', NOW())
                `, [newTaskId, student.student_id]);
              }
              // console.log(`[CREATE VENUE] Copied task "${task.title}" (Day ${task.day}) to venue ${venueId} with ${students.length} student(s)`);
            } else {
              // console.log(`[CREATE VENUE] Copied task "${task.title}" (Day ${task.day}) to venue ${venueId} (no students yet)`);
            }
            
            copiedTaskCount++;
          } else {
            // console.log(`[CREATE VENUE] Task "${task.title}" (Day ${task.day}) already exists in venue ${venueId}, skipping`);
          }
        }
      }
      
      // console.log(`[CREATE VENUE] Successfully copied ${copiedTaskCount} task(s) from groups to venue ${venueId}`);
    } else {
      // console.log(`[CREATE VENUE] No task groups found to copy`);
    }

    // ALSO copy existing tasks from any existing venue (for legacy tasks without group_id)
    // console.log(`[CREATE VENUE] Checking for existing tasks to replicate...`);
    
    const [existingTasks] = await connection.query(`
      SELECT 
        title,
        description,
        day,
        due_date,
        max_score,
        material_type,
        external_url,
        skill_filter,
        course_type,
        status
      FROM tasks
      WHERE (group_id IS NULL OR group_id = '')
      GROUP BY title, day, course_type, description, due_date, max_score, material_type, external_url, skill_filter, status
      ORDER BY course_type, day
    `);

    if (existingTasks.length > 0) {
      // console.log(`[CREATE VENUE] Found ${existingTasks.length} existing task(s) to replicate`);
      
      let taskFacultyId = assigned_faculty_id;
      if (!taskFacultyId) {
        const [anyFaculty] = await connection.query('SELECT faculty_id FROM faculties LIMIT 1');
        if (anyFaculty.length > 0) {
          taskFacultyId = anyFaculty[0].faculty_id;
        }
      }

      for (const task of existingTasks) {
        // Check if already exists
        const [existingTask] = await connection.query(`
          SELECT task_id FROM tasks
          WHERE venue_id = ? AND title = ? AND day = ?
        `, [venueId, task.title, task.day]);

        if (existingTask.length === 0) {
          const [taskResult] = await connection.query(`
            INSERT INTO tasks (
              venue_id, 
              faculty_id, 
              title,
              description,
              day, 
              due_date,
              max_score,
              material_type,
              external_url,
              skill_filter,
              course_type,
              status,
              is_template, 
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
          `, [
            venueId,
            taskFacultyId,
            task.title,
            task.description,
            task.day,
            task.due_date,
            task.max_score,
            task.material_type,
            task.external_url,
            task.skill_filter,
            task.course_type,
            task.status
          ]);

          const newTaskId = taskResult.insertId;

          // Create task submissions for students in this venue
          const [students] = await connection.query(`
            SELECT DISTINCT s.student_id
            FROM students s
            INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
            INNER JOIN \`groups\` g ON gs.group_id = g.group_id
            WHERE g.venue_id = ?
          `, [venueId]);

          if (students.length > 0) {
            for (const student of students) {
              await connection.query(`
                INSERT INTO task_submissions (task_id, student_id, status, created_at)
                VALUES (?, ?, 'Pending', NOW())
              `, [newTaskId, student.student_id]);
            }
          }
          
          copiedTaskCount++;
          // console.log(`[CREATE VENUE] Replicated task "${task.title}" (Day ${task.day}) to venue ${venueId}`);
        }
      }
    }

    // console.log(`[CREATE VENUE] Total tasks copied: ${copiedTaskCount}`);

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: copiedCount > 0 || copiedTaskCount > 0
        ? `Venue created successfully with ${copiedCount} roadmap(s) and ${copiedTaskCount} task(s)!`
        : 'Venue created successfully!',
      data: { 
        venue_id: venueId,
        roadmaps_copied: copiedCount,
        tasks_copied: copiedTaskCount
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating venue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create venue. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Update venue
export const updateVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;
    const { venue_name, capacity, location, assigned_faculty_id, status, year, group_specification } = req.body;

    console.log('[UPDATE VENUE] Request body:', req.body);
    console.log('[UPDATE VENUE] Year value:', year, 'Type:', typeof year);

    // Check if venue name already exists (excluding current venue)
    const [existing] = await connection.query(
      'SELECT venue_id FROM venue WHERE venue_name = ? AND venue_id != ?',
      [venue_name, venueId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Venue name already exists. Please choose a different name.' 
      });
    }

    // Parse year value - convert to number or null
    const yearValue = year ? parseInt(year, 10) : null;
    
    // Validate year if provided
    if (yearValue !== null && ![1, 2, 3, 4].includes(yearValue)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year must be 1, 2, 3, or 4' 
      });
    }

    console.log('[UPDATE VENUE] Parsed year value:', yearValue);

    await connection.beginTransaction();

    await connection.query(`
      UPDATE venue 
      SET venue_name = ?, capacity = ?, location = ?, assigned_faculty_id = ?, status = ?, year = ?, group_specification = ?  
      WHERE venue_id = ?
    `, [venue_name, capacity, location, assigned_faculty_id, status, yearValue, group_specification || null, venueId]);
    
    console.log('[UPDATE VENUE] Update executed for venue_id:', venueId);

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: 'Venue updated successfully!' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating venue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update venue. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Delete venue (soft delete - set status to Inactive)
export const deleteVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;

    await connection.beginTransaction();

    // Mark all active students in this venue as Dropped
    await connection.query(`
      UPDATE group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      SET gs.status = 'Dropped'
      WHERE g.venue_id = ? AND gs.status = 'Active'
    `, [venueId]);

    // Set groups to Inactive
    await connection.query(
      `UPDATE \`groups\` SET status = 'Inactive' WHERE venue_id = ?`,
      [venueId]
    );

    // Soft delete venue (set status to Inactive)
    await connection.query(
      `UPDATE venue SET status = 'Inactive' WHERE venue_id = ?`,
      [venueId]
    );

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: 'Venue deleted successfully!' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting venue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete venue. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Assign/Change faculty for venue (auto-move faculty from other venues)
export const assignFacultyToVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Faculty ID is required' 
      });
    }

    // Get current venue info
    const [currentVenue] = await connection.query(
      'SELECT venue_name, assigned_faculty_id FROM venue WHERE venue_id = ?',
      [venueId]
    );

    if (currentVenue.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venue not found' 
      });
    }

    await connection.beginTransaction();

    let movedFromVenue = null;

    // Check if faculty is already assigned to another venue - auto-move them
    const [facultyCheck] = await connection.query(
      `SELECT v.venue_id, v.venue_name, u.name as faculty_name
       FROM venue v 
       INNER JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
       INNER JOIN users u ON f.user_id = u.user_id
       WHERE v.assigned_faculty_id = ? AND v.venue_id != ? AND v.status = 'Active'`,
      [faculty_id, venueId]
    );

    if (facultyCheck.length > 0) {
      // Remove faculty from old venue (auto-move)
      const oldVenueId = facultyCheck[0].venue_id;
      movedFromVenue = facultyCheck[0].venue_name;
      
      await connection.query(
        'UPDATE venue SET assigned_faculty_id = NULL WHERE venue_id = ?',
        [oldVenueId]
      );

      // Update groups in old venue to have no faculty
      await connection.query(
        'UPDATE `groups` SET faculty_id = NULL WHERE venue_id = ?',
        [oldVenueId]
      );

      // Update students in old venue to have no assigned faculty
      await connection.query(`
        UPDATE students s
        INNER JOIN group_students gs ON s.student_id = gs.student_id
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        SET s.assigned_faculty_id = NULL
        WHERE g.venue_id = ? AND gs.status = 'Active'
      `, [oldVenueId]);
    }

    // Assign faculty to new venue
    await connection.query(
      'UPDATE venue SET assigned_faculty_id = ? WHERE venue_id = ?',
      [faculty_id, venueId]
    );
    // console.log(`[ASSIGN FACULTY] Assigned faculty_id: ${faculty_id} to venue_id: ${venueId}`);

    // Update groups in new venue
    await connection.query(
      'UPDATE `groups` SET faculty_id = ? WHERE venue_id = ?',
      [faculty_id, venueId]
    );

    // Update students in new venue to have this faculty
    await connection.query(`
      UPDATE students s
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      SET s.assigned_faculty_id = ?
      WHERE g.venue_id = ? AND gs.status = 'Active'
    `, [faculty_id, venueId]);

    await connection.commit();

    // Get faculty name for success message
    const [facultyInfo] = await connection.query(
      `SELECT u.name as faculty_name FROM faculties f
       INNER JOIN users u ON f.user_id = u.user_id
       WHERE f.faculty_id = ?`,
      [faculty_id]
    );

    const moveMsg = movedFromVenue ? ` (moved from "${movedFromVenue}")` : '';
    res.status(200).json({ 
      success: true, 
      message: `${facultyInfo[0].faculty_name} has been assigned to ${currentVenue[0].venue_name} successfully!${moveMsg}` 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error assigning faculty:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign faculty. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Get all available faculties for venue assignment
export const getAvailableFaculties = async (req, res) => {
  try {
    const { venueId, search } = req.query;

    let query = `
      SELECT 
        f.faculty_id,
        u.name as faculty_name,
        u.email,
        u.department,
        f.designation,
        v.venue_id as assigned_venue_id,
        v.venue_name as assigned_venue_name,
        CASE 
          WHEN v.venue_id = ? THEN 1 
          WHEN v.venue_id IS NULL THEN 0
          ELSE -1
        END as assignment_status
      FROM faculties f
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN venue v ON f.faculty_id = v.assigned_faculty_id AND v.status = 'Active'
      WHERE u.is_active = 1 AND u.role_id = 2
    `;

    const params = [venueId || 0];

    // Add search filter
    if (search) {
      query += ` AND (u.name LIKE ? OR u.department LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY assignment_status DESC, u.name ASC`;

    const [faculties] = await db.query(query, params);

    // Separate faculties
    let currentlyAssigned = null;
    let availableFaculties = [];
    let assignedToOther = [];

    faculties.forEach(faculty => {
      if (faculty.assignment_status === 1) {
        // Currently assigned to this venue
        currentlyAssigned = {
          ...faculty,
          workload: 1,
          workload_status: 'Current'
        };
      } else if (faculty.assignment_status === 0) {
        // Not assigned to any venue
        availableFaculties.push({
          ...faculty,
          workload: 0,
          workload_status: 'Available',
          venue_names: null
        });
      } else {
        // Assigned to another venue - include for auto-move
        assignedToOther.push({
          ...faculty,
          workload: 1,
          workload_status: 'Assigned',
          venue_names: faculty.assigned_venue_name
        });
      }
    });

    res.status(200).json({ 
      success: true, 
      data: {
        available: availableFaculties,
        assignedToOther: assignedToOther,
        current: currentlyAssigned,
        total: availableFaculties.length + assignedToOther.length + (currentlyAssigned ? 1 : 0)
      }
    });

  } catch (error) {
    console.error('Error fetching available faculties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available faculties' });
  }
};

// ===== STUDENT ALLOCATION =====

// Bulk upload students to venue via Excel
export const bulkUploadStudentsToVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;
    const overwrite = req.query.overwrite === 'true';

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded. Please select an Excel file.' 
      });
    }


    // Get venue details and check capacity
    const [venues] = await connection.query(
      'SELECT * FROM venue WHERE venue_id = ?',
      [venueId]
    );

    if (venues.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venue not found' 
      });
    }

    const venue = venues[0];

    // Parse Excel file first to get count
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Excel file is empty. Please add student data and try again.' 
      });
    }

    await connection.beginTransaction();

    // If overwrite mode, drop all existing students first
    let droppedCount = 0;
    if (overwrite) {
      const [dropResult] = await connection.query(`
        UPDATE group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        SET gs.status = 'Dropped'
        WHERE g.venue_id = ? AND gs.status = 'Active'
      `, [venueId]);
      droppedCount = dropResult.affectedRows;
    }

    // Check capacity after potential drop
    const [currentCount] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      WHERE g.venue_id = ? AND gs.status = 'Active'
    `, [venueId]);

   
    const availableSlots = venue.capacity - currentCount[0].count;

    if (data.length > availableSlots) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Venue capacity exceeded. Available slots: ${availableSlots}, Students in file: ${data.length}` 
      });
    }

    // Get or create default group for venue
    let [groups] = await connection.query(
      'SELECT group_id FROM \`groups\` WHERE venue_id = ? LIMIT 1',
      [venueId]
    );

    let groupId;
    if (groups.length === 0) {
      const [groupResult] = await connection.query(`
        INSERT INTO \`groups\` 
        (group_code, group_name, venue_id, faculty_id, schedule_days, schedule_time, max_students, department, status, created_at) 
        VALUES (?, ?, ?, ?, 'Mon, Wed', '10:00 - 12:00', ?, 'General', 'Active', NOW())
      `, [`VENUE-${venueId}`, venue.venue_name, venueId, venue.assigned_faculty_id, venue.capacity]);
      
      groupId = groupResult.insertId;
    } else {
      groupId = groups[0].group_id;
    }

    let studentsAdded = 0;
    let studentsSkipped = 0;
    const errors = [];
    const successfulStudents = [];
    
    // console.log(`=== BULK UPLOAD TO VENUE ${venueId} ===`);
    // console.log(`Total rows in Excel: ${data.length}`);
    // console.log(`Overwrite mode: ${overwrite}`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Support multiple column name formats (flexible mapping)
      const rollNumber = row.rollNumber || row['Reg No'] || row.reg_no || row.RegNo || row.ID || row['S. No.'];
      const name = row.name || row['Student Name'] || row.studentName || row.Name;
      const email = row.email || row['Student Official Email ID'] || row.Email || row.student_email;
      const department = row.department || row.Department || row.dept;
      const year = row.year || row.Year;
      const semester = row.semester || row.Semester;
      
      // console.log(`\n--- Processing Row ${i + 2} ---`);
      // console.log(`Roll Number: ${rollNumber}, Name: ${name}, Email: ${email}`);

      // Only rollNumber is required
      if (!rollNumber || String(rollNumber).trim() === '') {
        // console.log(`Row ${i + 2}: SKIPPED - Missing roll number`);
        errors.push(`Row ${i + 1}: Missing roll number/registration number`);
        studentsSkipped++;
        continue;
      }

      const rollNumberStr = String(rollNumber).trim();
      // Auto-fill name and email if not provided
      const studentName = (name && String(name).trim()) || rollNumberStr;
      const studentEmail = (email && String(email).trim()) || `${rollNumberStr}@student.local`;

      try {
        // Check if user already exists
        const [existingUser] = await connection.query(
          'SELECT user_id FROM users WHERE email = ? OR ID = ?',
          [studentEmail.toLowerCase(), rollNumberStr]
        );
        
        // console.log(`User lookup result: ${existingUser.length > 0 ? `Found user_id ${existingUser[0].user_id}` : 'No existing user'}`);

        let userId;
        let studentId;

        if (existingUser.length === 0) {
         
          // Insert new user
          const [userResult] = await connection.query(
            `INSERT INTO users (role_id, name, email, ID, department, created_at, is_active) 
             VALUES (3, ?, ?, ?, ?, NOW(), 1)`,
            [studentName, studentEmail.toLowerCase(), rollNumberStr, (department || 'General').trim()]
          );

          userId = userResult.insertId;
          // console.log(`Created new user with user_id: ${userId}`);

          // Insert student record
          const [studentResult] = await connection.query(
            'INSERT INTO students (user_id, year, semester, assigned_faculty_id) VALUES (?, ?, ?, ?)',
            [userId, year || 1, semester || 1, venue.assigned_faculty_id || 0]
          );

          studentId = studentResult.insertId;
          // console.log(`Created new student with student_id: ${studentId}`);
          
        } else {
          userId = existingUser[0].user_id;
          // console.log(`Using existing user_id: ${userId}`);

          // Check if student record exists
          const [student] = await connection.query(
            'SELECT student_id FROM students WHERE user_id = ?',
            [userId]
          );

          if (student.length === 0) {
            // console.log(`Student record not found, creating new student record`);
            const [studentResult] = await connection.query(
              'INSERT INTO students (user_id, year, semester, assigned_faculty_id) VALUES (?, ?, ?, ?)',
              [userId, year || 1, semester || 1, venue.assigned_faculty_id || 0]
            );
            studentId = studentResult.insertId;
            // console.log(`Created new student with student_id: ${studentId}`);
          } else {
            studentId = student[0].student_id;
            // console.log(`Using existing student_id: ${studentId}`);
          }
        }

        // Check if already allocated to this venue
        const [existingAllocation] = await connection.query(`
          SELECT gs.id 
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = ? AND g.venue_id = ? AND gs.status = 'Active'
        `, [studentId, venueId]);
        
        // console.log(`Existing allocation check: ${existingAllocation.length > 0 ? 'ALREADY ALLOCATED TO THIS VENUE' : 'Not in this venue'}`);

        if (existingAllocation.length > 0) {
          studentsSkipped++;
          // console.log(`Row ${i + 2}: SKIPPED - Already in this venue`);
          errors.push(`${studentName} (${rollNumberStr}) already allocated to this venue`);
          continue;
        }

        // Check if student is in another venue - auto-move by dropping from old venue
        const [otherVenueAllocation] = await connection.query(`
          SELECT gs.id, g.venue_id, v.venue_name
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          INNER JOIN venue v ON g.venue_id = v.venue_id
          WHERE gs.student_id = ? AND gs.status = 'Active'
        `, [studentId]);
        
        // console.log(`Other venue check: ${otherVenueAllocation.length > 0 ? `Found in ${otherVenueAllocation[0].venue_name}` : 'Not in any other venue'}`);

        if (otherVenueAllocation.length > 0) {
          // Drop student from old venue (preserves history)
          await connection.query(`
            UPDATE group_students SET status = 'Dropped' WHERE id = ?
          `, [otherVenueAllocation[0].id]);
          // console.log(`Moved student from ${otherVenueAllocation[0].venue_name} to this venue`);
          errors.push(`${studentName} (${rollNumberStr}) moved from ${otherVenueAllocation[0].venue_name}`);
        }

        // Check if student was previously in this venue (reactivate instead of insert)
        const [previousAllocation] = await connection.query(`
          SELECT gs.id
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = ? AND g.venue_id = ? AND gs.status != 'Active'
        `, [studentId, venueId]);
        
        // console.log(`Previous allocation check: ${previousAllocation.length > 0 ? 'Found inactive record - will reactivate' : 'No previous allocation'}`);

        let groupStudentsId = null;
        if (previousAllocation.length > 0) {
          // Reactivate previous allocation
          await connection.query(
            'UPDATE group_students SET status = "Active", allocation_date = NOW() WHERE id = ?',
            [previousAllocation[0].id]
          );
          groupStudentsId = previousAllocation[0].id;
          // console.log(`Reactivated previous allocation with id: ${groupStudentsId}`);
        } else {
          // Insert into group_students
          const [insertResult] = await connection.query(
            'INSERT INTO group_students (group_id, student_id, allocation_date, status) VALUES (?, ?, NOW(), "Active")',
            [groupId, studentId]
          );
          groupStudentsId = insertResult.insertId;
          // console.log(`Created new allocation with id: ${groupStudentsId}`);
        }
        
        studentsAdded++;
        // console.log(`Row ${i + 2}: SUCCESS - Student added to venue`);
        successfulStudents.push({
          name: studentName,
          email: studentEmail,
          rollNumber: rollNumberStr,
          department: department || 'General',
          userId,
          studentId,
          groupStudentsId
        });

      } catch (err) {
        console.error(`Error processing row ${i + 1}:`, err);
        console.error('SQL Error:', err.sqlMessage || err.message);
        console.error('SQL Query:', err.sql || 'No SQL available');
        studentsSkipped++;
        errors.push(`Row ${i + 1}: Error processing ${studentName || 'student'} (${rollNumberStr || 'unknown'}) - ${err.message}`);
      }
    }

    await connection.commit();
    
    // console.log(`\n=== BULK UPLOAD COMPLETE ===`);
    // console.log(`Added: ${studentsAdded}, Skipped: ${studentsSkipped}, Dropped: ${droppedCount}`);
    // console.log(`Errors: ${errors.length}`);

    const overwriteMsg = overwrite && droppedCount > 0 ? ` (Replaced ${droppedCount} existing students)` : '';
    res.status(201).json({ 
      success: true, 
      message: `Successfully uploaded! Added: ${studentsAdded} students, Skipped: ${studentsSkipped}${overwriteMsg}`,
      data: {
        studentsAdded,
        studentsSkipped,
        droppedCount: overwrite ? droppedCount : 0,
        errors: errors.slice(0, 10),
        successfulStudents: successfulStudents.slice(0, 5)
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('=== BULK UPLOAD FAILED ===');
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload students. Please check the file format and try again.',
      error: error.message,
      errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    connection.release();
  }
};

// Allocate students by roll number range
export const allocateStudentsByRollRange = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;
    const { rollNumberFrom, rollNumberTo } = req.body;

    if (!rollNumberFrom || !rollNumberTo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both roll numbers are required' 
      });
    }

    // Get venue details
    const [venues] = await connection.query(
      'SELECT * FROM venue WHERE venue_id = ?',
      [venueId]
    );

    if (venues.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venue not found' 
      });
    }

    const venue = venues[0];

    // Get current student count
    const [currentCount] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      WHERE g.venue_id = ? AND gs.status = 'Active'
    `, [venueId]);

    const availableSlots = venue.capacity - currentCount[0].count;

    // Find students in roll number range (include those in other venues for auto-move)
    const [students] = await connection.query(`
      SELECT s.student_id, u.name, u.ID as rollNumber,
        gs_current.id as current_allocation_id,
        v_current.venue_name as current_venue_name
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN group_students gs_current ON s.student_id = gs_current.student_id AND gs_current.status = 'Active'
      LEFT JOIN \`groups\` g_current ON gs_current.group_id = g_current.group_id
      LEFT JOIN venue v_current ON g_current.venue_id = v_current.venue_id
      WHERE u.ID BETWEEN ? AND ?
        AND u.role_id = 3
        AND u.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id 
            AND g.venue_id = ? 
            AND gs.status = 'Active'
        )
      ORDER BY u.ID
    `, [rollNumberFrom, rollNumberTo, venueId]);

    if (students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No unallocated students found in the range ${rollNumberFrom} to ${rollNumberTo}` 
      });
    }

    if (students.length > availableSlots) {
      return res.status(400).json({ 
        success: false, 
        message: `Venue capacity exceeded. Available: ${availableSlots}, Found: ${students.length} students` 
      });
    }

    await connection.beginTransaction();

    // Get or create default group for venue
    let [groups] = await connection.query(
      'SELECT group_id FROM \`groups\` WHERE venue_id = ? LIMIT 1',
      [venueId]
    );

    let groupId;
    if (groups.length === 0) {
      const [groupResult] = await connection.query(`
        INSERT INTO \`groups\` 
        (group_code, group_name, venue_id, faculty_id, schedule_days, schedule_time, max_students, department, status, created_at) 
        VALUES (?, ?, ?, ?, 'Mon, Wed', '10:00 - 12:00', ?, 'General', 'Active', NOW())
      `, [`VENUE-${venueId}`, venue.venue_name, venueId, venue.assigned_faculty_id, venue.capacity]);
      
      groupId = groupResult.insertId;
    } else {
      groupId = groups[0].group_id;
    }

    // Allocate students (auto-move from other venues if needed)
    const movedStudents = [];
    for (const student of students) {
      // If student is in another venue, drop them first
      if (student.current_allocation_id) {
        await connection.query(
          'UPDATE group_students SET status = "Dropped" WHERE id = ?',
          [student.current_allocation_id]
        );
        movedStudents.push({ name: student.name, from: student.current_venue_name });
      }

      // Check if student was previously in this venue (reactivate)
      const [previousAllocation] = await connection.query(`
        SELECT gs.id
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE gs.student_id = ? AND g.venue_id = ? AND gs.status != 'Active'
      `, [student.student_id, venueId]);

      if (previousAllocation.length > 0) {
        await connection.query(
          'UPDATE group_students SET status = "Active", allocation_date = NOW() WHERE id = ?',
          [previousAllocation[0].id]
        );
      } else {
        await connection.query(
          'INSERT INTO group_students (group_id, student_id, allocation_date, status) VALUES (?, ?, NOW(), "Active")',
          [groupId, student.student_id]
        );
      }
    }

    // Get count of existing tasks and roadmap for this venue
    const [taskCount] = await connection.query(
      `SELECT COUNT(*) as count FROM tasks WHERE venue_id = ? AND status = 'Active'`,
      [venueId]
    );
    const [roadmapCount] = await connection.query(
      `SELECT COUNT(*) as count FROM roadmap WHERE venue_id = ?`,
      [venueId]
    );

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: `Successfully allocated ${students.length} students (${rollNumberFrom} to ${rollNumberTo}) to ${venue.venue_name}!`,
      data: {
        allocated: students.length,
        students: students.map(s => ({ name: s.name, rollNumber: s.rollNumber })),
        existing_tasks: taskCount[0]?.count || 0,
        existing_roadmap_modules: roadmapCount[0]?.count || 0
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error allocating students by range:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to allocate students. Please try again.',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get students in a venue (Active and Dropped students)
export const getVenueStudents = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { includeDropped } = req.query;

    let statusFilter = `gs.status = 'Active'`;
    if (includeDropped === 'true') {
      statusFilter = `gs.status IN ('Active', 'Dropped')`;
    }

    const [students] = await db.query(`
      SELECT 
        gs.id,
        s.student_id,
        u.name,
        u.email,
        u.ID as rollNumber,
        u.department,
        s.year,
        s.semester,
        gs.allocation_date,
        gs.status,
        CASE WHEN gs.status = 'Dropped' THEN 1 ELSE 0 END as is_dropped
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN students s ON gs.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE g.venue_id = ? AND ${statusFilter}
      ORDER BY gs.status ASC, u.ID ASC
    `, [venueId]);

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error('Error fetching venue students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venue students' });
  }
};

// Remove student from venue
export const removeStudentFromVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId, studentId } = req.params;

    await connection.beginTransaction();

    await connection.query(`
      UPDATE group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      SET gs.status = 'Dropped'
      WHERE g.venue_id = ? AND gs.student_id = ?
    `, [venueId, studentId]);

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: 'Student removed from venue successfully!' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error removing student:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove student. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Bulk remove multiple students from venue
export const bulkRemoveStudentsFromVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { venueId } = req.params;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select at least one student to remove' 
      });
    }

    await connection.beginTransaction();

    // Update status to Dropped for all selected students
    const placeholders = studentIds.map(() => '?').join(',');
    await connection.query(`
      UPDATE group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      SET gs.status = 'Dropped'
      WHERE g.venue_id = ? AND gs.student_id IN (${placeholders}) AND gs.status = 'Active'
    `, [venueId, ...studentIds]);

    await connection.commit();

    res.status(200).json({ 
      success: true, 
      message: `${studentIds.length} student(s) removed from venue successfully!` 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error bulk removing students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove students. Please try again.' 
    });
  } finally {
    connection.release();
  }
};

// Get all faculties (basic list)
export const getAllFacultiesForGroups = async (req, res) => {
  try {
    const [faculties] = await db.query(`
      SELECT 
        f.faculty_id,
        u.name as faculty_name,
        u.email,
        u.department,
        f.designation
      FROM faculties f
      INNER JOIN users u ON f.user_id = u.user_id
      WHERE u.is_active = 1 AND u.role_id = 2
      ORDER BY u.name
    `);

    res.status(200).json({ success: true, data: faculties });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch faculties' });
  }
};

// Search venues
export const searchVenues = async (req, res) => {
  try {
    const { search } = req.query;

    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        v.status,
        f.faculty_id,
        u.name as faculty_name,
        COUNT(DISTINCT gs.student_id) as current_students
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.venue_name LIKE ? OR v.location LIKE ? OR u.name LIKE ?
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `, [`%${search}%`, `%${search}%`, `%${search}%`]);

    res.status(200).json({ success: true, data: venues });
  } catch (error) {
    console.error('Error searching venues:', error);
    res.status(500).json({ success: false, message: 'Failed to search venues' });
  }
};

// Get comprehensive venue details by ID
export const getVenueDetails = async (req, res) => {
  try {
    const { venueId } = req.params;

    // Get venue basic info
    const [venueInfo] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        v.status,
        v.created_at,
        v.assigned_faculty_id
      FROM venue v
      WHERE v.venue_id = ?
    `, [venueId]);

    if (venueInfo.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venue not found' 
      });
    }

    // Get students with attendance and task stats
    const [students] = await db.query(`
      SELECT 
        gs.id as allocation_id,
        s.student_id,
        u.name,
        u.email,
        u.ID as rollNumber,
        u.department,
        s.year,
        s.semester,
        gs.allocation_date,
        gs.status,
        COALESCE(att.total_sessions, 0) as total_sessions,
        COALESCE(att.present_count, 0) as present_count,
        COALESCE(att.late_count, 0) as late_count,
        ROUND(
          CASE 
            WHEN COALESCE(att.total_sessions, 0) = 0 THEN 0
            ELSE (COALESCE(att.present_count, 0) + COALESCE(att.late_count, 0)) * 100.0 / att.total_sessions
          END, 1
        ) as attendance_percentage,
        COALESCE(task_stats.total_tasks, 0) as total_tasks,
        COALESCE(task_stats.submitted_tasks, 0) as submitted_tasks,
        COALESCE(task_stats.graded_tasks, 0) as graded_tasks
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN students s ON gs.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN (
        SELECT 
          a.student_id,
          COUNT(DISTINCT a.session_id) as total_sessions,
          SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_count
        FROM attendance a
        WHERE a.venue_id = ?
        GROUP BY a.student_id
      ) att ON s.student_id = att.student_id
      LEFT JOIN (
        SELECT 
          ts.student_id,
          COUNT(DISTINCT t.task_id) as total_tasks,
          COUNT(DISTINCT ts.submission_id) as submitted_tasks,
          SUM(CASE WHEN ts.status = 'Graded' THEN 1 ELSE 0 END) as graded_tasks
        FROM tasks t
        LEFT JOIN task_submissions ts ON t.task_id = ts.task_id
        WHERE t.venue_id = ?
        GROUP BY ts.student_id
      ) task_stats ON s.student_id = task_stats.student_id
      WHERE g.venue_id = ?
      ORDER BY u.ID
    `, [venueId, venueId, venueId]);

    // Get total task count for venue
    const [taskCount] = await db.query(`
      SELECT COUNT(*) as total_tasks FROM tasks WHERE venue_id = ?
    `, [venueId]);

    // Get roadmap count for venue
    const [roadmapCount] = await db.query(`
      SELECT COUNT(*) as total_roadmap_days FROM roadmap WHERE venue_id = ?
    `, [venueId]);

    // Get group info for the venue with faculty details
    const [groupInfo] = await db.query(`
      SELECT 
        g.group_id,
        g.group_code,
        g.group_name,
        g.schedule_days,
        g.schedule_time,
        g.max_students,
        g.department,
        g.status,
        g.faculty_id,
        f.designation as faculty_designation,
        u.name as faculty_name,
        u.email as faculty_email,
        u.department as faculty_department
      FROM \`groups\` g
      LEFT JOIN faculties f ON g.faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE g.venue_id = ?
      LIMIT 1
    `, [venueId]);

    // Calculate venue-wide statistics
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const avgAttendance = students.length > 0 
      ? Math.round(students.reduce((sum, s) => sum + (s.attendance_percentage || 0), 0) / students.length) 
      : 0;

    const venue = venueInfo[0];
    const group = groupInfo.length > 0 ? groupInfo[0] : null;

    res.status(200).json({ 
      success: true, 
      data: {
        venue: {
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          capacity: venue.capacity,
          location: venue.location,
          status: venue.status,
          created_at: venue.created_at
        },
        faculty: group && group.faculty_id ? {
          faculty_id: group.faculty_id,
          name: group.faculty_name,
          email: group.faculty_email,
          department: group.faculty_department,
          designation: group.faculty_designation
        } : null,
        group: group ? {
          group_id: group.group_id,
          group_code: group.group_code,
          group_name: group.group_name,
          schedule_days: group.schedule_days,
          schedule_time: group.schedule_time,
          max_students: group.max_students,
          department: group.department,
          status: group.status
        } : null,
        students: students,
        statistics: {
          total_students: totalStudents,
          active_students: activeStudents,
          capacity: venue.capacity,
          avg_attendance: avgAttendance,
          total_tasks: taskCount[0].total_tasks,
          total_roadmap_days: roadmapCount[0].total_roadmap_days
        }
      }
    });
  } catch (error) {
    console.error('Error fetching venue details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch venue details' 
    });
  }
};