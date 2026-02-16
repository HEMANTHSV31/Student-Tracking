import db from '../config/db.js';
import xlsx from 'xlsx';

/**
 * Bulk upload students to multiple venues from Excel file
 * POST /api/venue-bulk-upload/upload
 * 
 * Excel file should contain columns:
 * - Registration Number (matches users.ID)
 * - Venue Name (matches venue.venue_name)
 * - Faculty Email (matches users.email for faculty)
 * 
 * The process:
 * 1. Groups students by venue and faculty
 * 2. Validates all data (students, venues, faculties)
 * 3. For each venue: removes existing students, moves new students from other venues, adds them to target venue
 * 4. Updates faculty assignments for venues and students
 */
export const bulkUploadStudentsToVenue = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`📊 Parsed ${data.length} rows from Excel file`);

    if (data.length === 0) {
      console.log('❌ Excel file is empty');
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    // Determine which format is being used
    const firstRow = data[0];
    console.log('📋 First row columns:', Object.keys(firstRow));
    
    const hasRegistrationNumber = 'Registration Number' in firstRow;
    const hasVenueName = 'Venue Name' in firstRow;
    const hasFacultyEmail = 'Faculty Email' in firstRow;

    // Validate format
    if (!hasRegistrationNumber) {
      console.log('❌ Missing "Registration Number" column');
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel format. "Registration Number" column is required.',
        hint: 'Required columns: Registration Number, Venue Name, Faculty Email',
        foundColumns: Object.keys(firstRow)
      });
    }

    if (!hasVenueName || !hasFacultyEmail) {
      console.log('❌ Missing required columns:', { hasVenueName, hasFacultyEmail });
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel format. Please use: Registration Number, Venue Name, and Faculty Email columns',
        hint: 'All three columns are required for bulk upload',
        foundColumns: Object.keys(firstRow)
      });
    }

    // Group students by venue and faculty
    const venueGroups = new Map(); // key: "venueName|facultyEmail", value: {venueName, facultyEmail, students: []}
    
    for (const row of data) {
      const regNo = row['Registration Number']?.toString().trim();
      // Use venue name EXACTLY as given in Excel - no trimming or normalization
      const venueName = row['Venue Name']?.toString();
      const facultyEmail = row['Faculty Email']?.toString().trim();

      if (!regNo || !venueName || !facultyEmail) {
        continue; // Skip incomplete rows
      }

      const key = `${venueName}|${facultyEmail}`;
      
      if (!venueGroups.has(key)) {
        venueGroups.set(key, {
          venueName,
          facultyEmail,
          students: []
        });
      }
      
      venueGroups.get(key).students.push(regNo);
    }

    if (venueGroups.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found in Excel file. Ensure all rows have Registration Number, Venue Name, and Faculty Email.'
      });
    }

    await connection.beginTransaction();

    const processResults = [];
    const errors = [];

    // Process each venue group
    for (const [key, venueGroup] of venueGroups) {
      const { venueName, facultyEmail, students: registrationNumbers } = venueGroup;

      try {
        // 1. Validate venue exists - EXACT MATCH ONLY (no normalization)
        console.log(`🔍 Looking for EXACT venue name: "${venueName}"`);
        
        const [venueRows] = await connection.query(
          `SELECT venue_id, venue_name, assigned_faculty_id 
           FROM venue 
           WHERE venue_name = ? AND deleted_at IS NULL`,
          [venueName]
        );
        
        console.log(`✅ Found ${venueRows.length} venue(s)${venueRows.length > 0 ? ': ' + venueRows.map(v => `ID ${v.venue_id} - "${v.venue_name}"`).join(', ') : ''}`);

        if (venueRows.length === 0) {
          console.log(`❌ Venue not found. Excel value: "${venueName}"`);
          errors.push(`Venue "${venueName}" not found. Please ensure the venue name in Excel matches EXACTLY with the database (including spaces, capitalization).`);
          continue;
        }

        const venue = venueRows[0];
        const venueId = venue.venue_id;

        // 2. Validate faculty
        const [facultyRows] = await connection.query(`
          SELECT f.faculty_id, u.user_id, u.name, u.email
          FROM users u
          INNER JOIN faculties f ON u.user_id = f.user_id
          WHERE u.email = ? AND u.role_id = 2 AND u.is_active = 1
        `, [facultyEmail]);

        if (facultyRows.length === 0) {
          errors.push(`Faculty "${facultyEmail}" not found or inactive`);
          continue;
        }

        const faculty = facultyRows[0];
        const facultyId = faculty.faculty_id;

        // 3. Validate all students exist in users table
        const [studentRows] = await connection.query(`
          SELECT u.user_id, u.ID, u.name, u.email, s.student_id
          FROM users u
          INNER JOIN students s ON u.user_id = s.user_id
          WHERE u.ID IN (?) AND u.role_id = 3 AND u.is_active = 1
        `, [registrationNumbers]);

        const foundRegistrationNumbers = studentRows.map(s => s.ID);
        const missingRegistrationNumbers = registrationNumbers.filter(
          regNo => !foundRegistrationNumbers.includes(regNo)
        );

        if (missingRegistrationNumbers.length > 0) {
          errors.push(`Venue "${venueName}": ${missingRegistrationNumbers.length} students not found (${missingRegistrationNumbers.slice(0, 3).join(', ')}${missingRegistrationNumbers.length > 3 ? '...' : ''})`);
          // Continue processing with found students
        }

        if (studentRows.length === 0) {
          errors.push(`Venue "${venueName}": No valid students to process`);
          continue;
        }

        const studentIds = studentRows.map(s => s.student_id);

        // 4. Get groups associated with this venue
        const [groupRows] = await connection.query(
          'SELECT group_id, group_name FROM `groups` WHERE venue_id = ? AND status = "Active"',
          [venueId]
        );

        if (groupRows.length === 0) {
          errors.push(`Venue "${venueName}": No active groups found. Please create a group first.`);
          continue;
        }

        // Use the first active group for this venue
        const targetGroup = groupRows[0];
        const targetGroupId = targetGroup.group_id;

        // 5. Remove existing students from the target venue's groups (replace existing allocation)
        const [existingStudents] = await connection.query(`
          SELECT gs.student_id, u.name, u.ID 
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          INNER JOIN students s ON gs.student_id = s.student_id
          INNER JOIN users u ON s.user_id = u.user_id
          WHERE g.venue_id = ? AND gs.status = 'Active'
        `, [venueId]);

        if (existingStudents.length > 0) {
          await connection.query(`
            UPDATE group_students gs
            INNER JOIN \`groups\` g ON gs.group_id = g.group_id
            SET gs.status = 'Dropped'
            WHERE g.venue_id = ? AND gs.status = 'Active'
          `, [venueId]);
        }

        // 6. Remove new students from any other groups they're currently in
        const [currentAllocations] = await connection.query(`
          SELECT gs.id, gs.student_id, u.ID, u.name, v.venue_name, g.group_name
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          INNER JOIN venue v ON g.venue_id = v.venue_id
          INNER JOIN students s ON gs.student_id = s.student_id
          INNER JOIN users u ON s.user_id = u.user_id
          WHERE gs.student_id IN (?) AND gs.status = 'Active'
        `, [studentIds]);

        if (currentAllocations.length > 0) {
          await connection.query(`
            UPDATE group_students
            SET status = 'Dropped'
            WHERE student_id IN (?) AND status = 'Active'
          `, [studentIds]);
        }

        // 7. Add new students to the target venue's group
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle re-uploads without errors
        const groupStudentValues = studentIds.map(studentId => [
          targetGroupId,
          studentId,
          'Active'
        ]);

        if (groupStudentValues.length > 0) {
          await connection.query(`
            INSERT INTO group_students (group_id, student_id, status)
            VALUES ?
            ON DUPLICATE KEY UPDATE status = 'Active'
          `, [groupStudentValues]);
        }

        // 8. Update venue's assigned faculty
        console.log(`📍 Assigning faculty ${facultyId} (${facultyEmail}) to venue ${venueId} (${venueName})`);
        const [venueUpdateResult] = await connection.query(
          'UPDATE venue SET assigned_faculty_id = ? WHERE venue_id = ?',
          [facultyId, venueId]
        );
        console.log(`✅ Venue updated: ${venueUpdateResult.affectedRows} row(s)`);

        // 9. Update students' assigned faculty
        console.log(`👥 Assigning faculty ${facultyId} to ${studentIds.length} students`);
        const [studentUpdateResult] = await connection.query(
          'UPDATE students SET assigned_faculty_id = ? WHERE student_id IN (?)',
          [facultyId, studentIds]
        );
        console.log(`✅ Students updated: ${studentUpdateResult.affectedRows} row(s)`);

        // 10. Update group's faculty assignment
        console.log(`👨‍🏫 Assigning faculty ${facultyId} to groups in venue ${venueId}`);
        const [groupUpdateResult] = await connection.query(
          'UPDATE `groups` SET faculty_id = ? WHERE venue_id = ?',
          [facultyId, venueId]
        );
        console.log(`✅ Groups updated: ${groupUpdateResult.affectedRows} row(s)`);

        // Track success
        processResults.push({
          venue: {
            name: venueName,
            id: venueId
          },
          faculty: {
            name: faculty.name,
            email: faculty.email
          },
          group: {
            name: targetGroup.group_name,
            id: targetGroupId
          },
          studentsProcessed: {
            total: studentIds.length,
            missing: missingRegistrationNumbers.length,
            addedToVenue: studentIds.length,
            removedFromOtherVenues: currentAllocations.length,
            replacedInTargetVenue: existingStudents.length
          }
        });

      } catch (venueError) {
        console.error(`Error processing venue ${venueName}:`, venueError);
        errors.push(`Venue "${venueName}": ${venueError.message}`);
      }
    }

    if (processResults.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'No venues could be processed successfully',
        errors: errors
      });
    }

    await connection.commit();

    const totalStudents = processResults.reduce((sum, r) => sum + r.studentsProcessed.total, 0);
    const totalMissing = processResults.reduce((sum, r) => sum + r.studentsProcessed.missing, 0);

    res.status(200).json({
      success: true,
      message: `Successfully processed ${processResults.length} venue(s) with ${totalStudents} students`,
      data: {
        venuesProcessed: processResults.length,
        totalStudents: totalStudents,
        totalMissing: totalMissing,
        venues: processResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload students to venue',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Download Excel template for bulk upload
 * GET /api/venue-bulk-upload/template
 */
export const downloadTemplate = async (req, res) => {
  try {
    // Create sample data for template with 3 columns
    const templateData = [
      {
        'Registration Number': '2021-CS-001',
        'Venue Name': 'Lab A',
        'Faculty Email': 'faculty@example.com'
      },
      {
        'Registration Number': '2021-CS-002',
        'Venue Name': 'Lab A',
        'Faculty Email': 'faculty@example.com'
      },
      {
        'Registration Number': '2021-CS-003',
        'Venue Name': 'Lab B',
        'Faculty Email': 'faculty2@example.com'
      }
    ];

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Registration Number
      { wch: 20 }, // Venue Name
      { wch: 30 }  // Faculty Email
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Bulk Upload');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=bulk_student_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

/**
 * Get available venues for dropdown
 * GET /api/venue-bulk-upload/venues
 */
export const getAvailableVenues = async (req, res) => {
  try {
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.location,
        v.capacity,
        v.year,
        v.group_specification,
        f.faculty_id,
        u.name as faculty_name,
        u.email as faculty_email,
        COUNT(DISTINCT gs.student_id) as current_students
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.status = 'Active' AND v.deleted_at IS NULL
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `);

    res.status(200).json({
      success: true,
      data: venues
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues',
      error: error.message
    });
  }
};

/**
 * Get available faculties for dropdown
 * GET /api/venue-bulk-upload/faculties
 */
export const getAvailableFaculties = async (req, res) => {
  try {
    const [faculties] = await db.query(`
      SELECT 
        f.faculty_id,
        u.user_id,
        u.name,
        u.email,
        u.department,
        f.designation,
        COUNT(DISTINCT v.venue_id) as assigned_venues,
        COUNT(DISTINCT s.student_id) as assigned_students
      FROM faculties f
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN venue v ON f.faculty_id = v.assigned_faculty_id AND v.deleted_at IS NULL
      LEFT JOIN students s ON f.faculty_id = s.assigned_faculty_id
      WHERE u.role_id = 2 AND u.is_active = 1
      GROUP BY f.faculty_id
      ORDER BY u.name
    `);

    res.status(200).json({
      success: true,
      data: faculties
    });
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculties',
      error: error.message
    });
  }
};
