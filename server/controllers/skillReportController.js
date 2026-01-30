import db from '../config/db.js';
import xlsx from 'xlsx';

/**
 * Convert Roman numeral to number
 */
function romanToNumber(roman) {
  if (!roman) return 2; // Default to year 2
  
  const romanStr = roman.toString().trim().toUpperCase();
  
  // If already a number, return it
  if (/^\d+$/.test(romanStr)) {
    return parseInt(romanStr);
  }
  
  // Roman numeral mapping
  const romanMap = {
    'I': 1,
    'II': 2,
    'III': 3,
    'IV': 4,
  };
  
  return romanMap[romanStr] || 2; // Default to 2 if not found
}

/**
 * Normalize course name - just trim whitespace
 */
function normalizeCourseName(courseName) {
  if (!courseName) return courseName;
  return courseName.trim();
}

/**
 * Extract skill level from course name
 * Examples:
 * - "HTML / CSS - Level 1" → 1
 * - "Data Structure Level 1 - Concepts" → 1
 * - "DBMS Level 1 - Concepts" → 1
 * - "Version control - Git, Github Level 0" → 1 (0 becomes 1)
 * - "Aptitude Level - 1L" → 1 (ends with L)
 * - "Logical Reasoning - 1A" → 1 (ends with A, it's 1st level)
 * - "Programming C++ - Level 2" → 2
 * - "Programming Python Level - 1" → 1
 * - "Mechanical Modelling Level - 3B (ADVANCED ASSEMBLY)" → 3
 */
function extractSkillLevel(courseName) {
  if (!courseName) return null;
  
  const courseStr = courseName.toString().trim();
  
  // Pattern 1: "Level X" or "Level - X" (standard format)
  // Matches: "Level 1", "Level - 1", "Level 2"
  let match = courseStr.match(/Level\s*[-]?\s*(\d+)/i);
  if (match) {
    const level = parseInt(match[1]);
    return level === 0 ? 1 : level; // Level 0 becomes Level 1
  }
  
  // Pattern 2: "- XA" or "- XL" at end (Aptitude/Logical Reasoning format)
  // Matches: "- 1A", "- 1L", "- 2A"
  match = courseStr.match(/[-]\s*(\d+)[AL]\s*$/i);
  if (match) {
    const level = parseInt(match[1]);
    return level === 0 ? 1 : level;
  }
  
  // Pattern 3: "XA" or "XL" anywhere (Aptitude Level - 1L format)
  // Matches: "1L", "2A", "1A"
  match = courseStr.match(/(\d+)[AL](?:\s|$|\))/i);
  if (match) {
    const level = parseInt(match[1]);
    return level === 0 ? 1 : level;
  }
  
  // Pattern 4: "Level XB" format (Mechanical Modelling Level - 3B)
  // Matches: "3B", "2B"
  match = courseStr.match(/Level\s*[-]?\s*(\d+)[A-Z]/i);
  if (match) {
    const level = parseInt(match[1]);
    return level === 0 ? 1 : level;
  }
  
  // Pattern 5: Standalone number after dash at end
  // Matches: "Python Level - 1", "C++ - Level 2"
  match = courseStr.match(/[-]\s*(\d+)\s*$/);
  if (match) {
    const level = parseInt(match[1]);
    return level === 0 ? 1 : level;
  }
  
  return null; // No level found
}

/**
 * Upload skill reports from Excel - Admin only
 * New format: id, roll_number, user_id, name, year, email, course_name, venue, attendance, score, attempt, status, slot_date, start_time, end_time
 * 
 * Logic:
 * - Each Excel row is inserted as a new record
 * - If same student + course + same slot_date exists, SKIP (don't insert)
 * - If same student + course + different slot_date, INSERT new record
 * - Attempt count comes from Excel (not auto-incremented)
 * - id from Excel stored as slot_id
 * - year supports Roman numerals (I, II, III, IV)
 * - Skill level is extracted from course_name
 */
export const uploadSkillReport = async (req, res) => {
  // console.log('[SKILL REPORT UPLOAD] Starting upload...');
  // console.log('[SKILL REPORT UPLOAD] User:', req.user?.user_id, 'Role:', req.user?.role);
  // console.log('[SKILL REPORT UPLOAD] File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
  
  // Check admin role
  if (req.user.role !== 'admin') {
    console.error('[SKILL REPORT UPLOAD] Access denied - not admin');
    return res.status(403).json({ 
      success: false,
      message: 'Only admins can upload skill reports' 
    });
  }

  if (!req.file) {
    console.error('[SKILL REPORT UPLOAD] No file uploaded');
    return res.status(400).json({ 
      success: false,
      message: 'No file uploaded. Please select an Excel file.' 
    });
  }

  const connection = await db.getConnection();

  try {
    // console.log('[SKILL REPORT UPLOAD] Parsing Excel file...');
    
    // Set connection timeout for large uploads (10 minutes)
    await connection.query('SET SESSION wait_timeout = 600');
    await connection.query('SET SESSION interactive_timeout = 600');
    // Note: max_allowed_packet is read-only at SESSION level, must be set in MySQL config (my.ini/my.cnf)
    
    // Parse Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // console.log(`[SKILL REPORT UPLOAD] Excel parsed - ${data.length} rows found`);

    if (data.length === 0) {
      console.error('[SKILL REPORT UPLOAD] Excel file is empty');
      return res.status(400).json({ 
        success: false,
        message: 'Excel file is empty. Please add data to the spreadsheet.' 
      });
    }

    if (data.length > 10000) {
      console.error(`[SKILL REPORT UPLOAD] Too many records: ${data.length}`);
      return res.status(400).json({ 
        success: false,
        message: `Maximum 10,000 records allowed per upload. Your file has ${data.length} records. Please split into multiple files.` 
      });
    }
    
    // Log Excel columns for debugging
    const firstRow = data[0];
    const columnNames = firstRow ? Object.keys(firstRow) : [];
    // console.log('[SKILL REPORT UPLOAD] Excel columns detected:', columnNames);

    // Validate required columns
    const requiredColumns = ['user_id', 'course_name', 'status'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    if (missingColumns.length > 0) {
      console.error('[SKILL REPORT UPLOAD] Missing required columns:', missingColumns);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingColumns.join(', ')}. Please check your Excel file format.`,
        detectedColumns: columnNames
      });
    }

    // Pre-fetch student lookups for performance
    const [allStudents] = await connection.execute(
      `SELECT s.student_id, u.ID as roll_number, u.name, u.email, u.user_id
       FROM students s 
       JOIN users u ON s.user_id = u.user_id`
    );

    // Create lookup map by roll_number
    const studentMap = new Map();
    allStudents.forEach(s => {
      const key = s.roll_number.toLowerCase().trim();
      studentMap.set(key, s);
    });
    
    // console.log(`Student map built with ${studentMap.size} entries`);

    await connection.beginTransaction();

    let processedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    const BATCH_SIZE = 100; // Process in batches to avoid timeout
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    const COMMIT_FREQUENCY = 3; // Commit every 3 batches (300 records) for 5000+ records
    
    // console.log(`[SKILL REPORT UPLOAD] Processing ${data.length} records in ${totalBatches} batches (committing every ${COMMIT_FREQUENCY} batches)`);

    // Process each row in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, data.length);
      const batch = data.slice(batchStart, batchEnd);
      
      // console.log(`[SKILL REPORT UPLOAD] Processing batch ${batchNum + 1}/${totalBatches} (rows ${batchStart + 2}-${batchEnd + 1})`);
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowIndex = batchStart + i + 2; // Excel row number (1-indexed + header)

        try {
          const result = await processSkillRow(connection, row, rowIndex, studentMap);
          if (result.success) {
            processedCount++;
            if (result.inserted) insertedCount++;
            if (result.skipped) skippedCount++;
          } else {
            errors.push({ row: rowIndex, message: result.error });
          }
        } catch (error) {
          console.error(`[SKILL REPORT UPLOAD] Error processing row ${rowIndex}:`, error.message);
          errors.push({ row: rowIndex, message: error.message });
        }
      }
      
      // Commit every 500 records to avoid long transactions
      // Commit every COMMIT_FREQUENCY batches (300 records)
      if ((batchNum + 1) % COMMIT_FREQUENCY === 0 || batchNum === totalBatches - 1) {
        await connection.commit();
        // console.log(`[SKILL REPORT UPLOAD] Transaction committed at batch ${batchNum + 1} (${(batchNum + 1) * BATCH_SIZE} records processed)`);
        
        // Start new transaction if not the last batch
        if (batchNum < totalBatches - 1) {
          await connection.beginTransaction();
        }
      }
      
      // Log progress every batch
      // console.log(`[SKILL REPORT UPLOAD] Batch ${batchNum + 1} complete - Processed: ${processedCount}, Inserted: ${insertedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);
    }

    await connection.commit();
    
    // console.log('[SKILL REPORT UPLOAD] Upload completed successfully');
    // console.log(`[SKILL REPORT UPLOAD] Summary - Total: ${data.length}, Processed: ${processedCount}, Inserted: ${insertedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);

    res.status(200).json({
      success: true,
      message: 'Skill reports uploaded successfully',
      summary: {
        totalRecords: data.length,
        processed: processedCount,
        inserted: insertedCount,
        skipped: skippedCount,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    // Rollback transaction on error
    try {
      await connection.rollback();
      console.error('[SKILL REPORT UPLOAD] Transaction rolled back');
    } catch (rollbackError) {
      console.error('[SKILL REPORT UPLOAD] Rollback error:', rollbackError.message);
    }
    
    console.error('[SKILL REPORT UPLOAD] Upload error:', error);
    console.error('[SKILL REPORT UPLOAD] Error code:', error.code);
    console.error('[SKILL REPORT UPLOAD] Error message:', error.message);
    console.error('[SKILL REPORT UPLOAD] Error stack:', error.stack);
    
    // Check for specific MySQL errors
    let errorMessage = 'Failed to process upload';
    if (error.code === 'ER_NET_PACKET_TOO_LARGE') {
      errorMessage = 'Data packet too large. Try uploading in batches of 5000 records.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. The upload is too large or took too long. Try smaller batches (5000 records).';
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      errorMessage = 'Database lock timeout. Please try again in a few moments or upload during off-peak hours.';
    } else if (error.code === 'ER_TOO_MANY_ROWS') {
      errorMessage = 'Too many records. Maximum 10,000 records per upload.';
    }
    
    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    connection.release();
    // console.log('[SKILL REPORT UPLOAD] Database connection released');
  }
};

/**
 * Process single row from Excel
 * Expected columns: id, roll_number, user_id, name, year, email, course_name, venue, attendance, score, attempt, status, slot_date, start_time, end_time
 * 
 * IMPORTANT: Excel column "user_id" is compared with database column "users.ID"
 * Example: Excel user_id = "7376242AL132" matches users.ID = "7376242AL132"
 */
async function processSkillRow(connection, row, rowIndex, studentMap) {
  // Extract fields from Excel
  const slotId = parseInt(row.id) || null;
  
  // Excel "user_id" column - THIS IS COMPARED WITH users.ID in database
  // Example: Excel has user_id = "7376242AL132", we match it with users.ID = "7376242AL132"
  const excelUserIdColumn = (row.user_id || '').toString().trim();
  
  const rollNumber = (row.roll_number || '').toString().trim();
  const studentName = (row.name || '').toString().trim();
  const year = romanToNumber(row.year);
  const studentEmail = (row.email || '').toString().trim();
  const courseName = (row.course_name || '').toString().trim();
  const excelVenueName = (row.venue || '').toString().trim();
  const attendance = validateAttendance(row.attendance);
  const score = parseFloat(row.score) || 0;
  const attempt = parseInt(row.attempt) || 1;
  const status = validateStatus(row.status);
  const slotDate = parseExcelDate(row.slot_date);
  const startTime = parseExcelTime(row.start_time);
  const endTime = parseExcelTime(row.end_time);

  // DEBUG: Log what we're reading from Excel
  // console.log(`Row ${rowIndex}: Excel user_id="${excelUserIdColumn}", roll_number="${rollNumber}"`);

  // PRIMARY LOOKUP: Use Excel column "user_id" to find student via users.ID
  // Excel user_id (e.g., "7376242AL132") must match users.ID (e.g., "7376242AL132")
  const lookupValue = excelUserIdColumn;

  // Validate required fields
  if (!lookupValue) {
    return { success: false, error: `Row ${rowIndex}: Missing user_id column - Excel user_id is empty` };
  }
  if (!courseName) {
    return { success: false, error: `Row ${rowIndex}: Missing course_name` };
  }
  if (!excelVenueName) {
    return { success: false, error: `Row ${rowIndex}: Missing venue` };
  }

  // Find student using Excel "user_id" column matched against users.ID
  let student = studentMap.get(lookupValue.toLowerCase().trim());
  
  // Fallback: try direct DB lookup - Excel "user_id" column matched against users.ID
  if (!student) {
    const [dbStudent] = await connection.execute(
      `SELECT s.student_id, u.ID as roll_number, u.name, u.email, u.user_id
       FROM students s 
       JOIN users u ON s.user_id = u.user_id
       WHERE LOWER(TRIM(u.ID)) = LOWER(TRIM(?))`,
      [lookupValue]
    );
    
    if (dbStudent.length > 0) {
      student = dbStudent[0];
    }
  }
  
  if (!student) {
    return { success: false, error: `Row ${rowIndex}: Student not found - Excel user_id "${lookupValue}" does not match any users.ID in database` };
  }

  // Normalize course name (trim whitespace only)
  const normalizedCourseName = normalizeCourseName(courseName);
  
  // Extract skill level from course name
  const skillLevel = extractSkillLevel(normalizedCourseName);
  // console.log(`Row ${rowIndex}: Normalized "${courseName}" → "${normalizedCourseName}", skill_level=${skillLevel}`);

  // Check if record exists for this student + course (regardless of date)
  const [existing] = await connection.execute(
    `SELECT id, status, total_attempts, best_score, last_slot_date 
     FROM student_skills 
     WHERE student_id = ? AND course_name = ?`,
    [student.student_id, normalizedCourseName]
  );

  // Get student's current venue allocation
  const [studentVenue] = await connection.execute(
    `SELECT g.venue_id, g.faculty_id 
     FROM group_students gs
     JOIN \`groups\` g ON gs.group_id = g.group_id
     WHERE gs.student_id = ? AND gs.status = 'Active'
     LIMIT 1`,
    [student.student_id]
  );

  const studentVenueId = studentVenue.length > 0 ? studentVenue[0].venue_id : null;
  const facultyId = studentVenue.length > 0 ? studentVenue[0].faculty_id : null;

  if (existing.length > 0) {
    const existingRecord = existing[0];
    
    // If already Cleared, don't update
    if (existingRecord.status === 'Cleared') {
      // console.log(`Row ${rowIndex}: Skipped - Student already cleared ${normalizedCourseName}`);
      return { success: true, inserted: false, skipped: true };
    }

    // If same date exists, skip
    if (existingRecord.last_slot_date === slotDate) {
      // console.log(`Row ${rowIndex}: Skipped - Record already exists for date ${slotDate}`);
      return { success: true, inserted: false, skipped: true };
    }

    // Update existing record (Ongoing or Not Cleared)
    const newAttemptCount = existingRecord.total_attempts + 1;
    const newBestScore = Math.max(existingRecord.best_score || 0, score);

    await connection.execute(
      `UPDATE student_skills 
       SET slot_id = ?,
           total_attempts = ?,
           best_score = ?,
           latest_score = ?,
           status = ?,
           last_attendance = ?,
           last_slot_date = ?,
           last_start_time = ?,
           last_end_time = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [slotId, newAttemptCount, newBestScore, score, status, attendance, slotDate, startTime, endTime, existingRecord.id]
    );

    // console.log(`Row ${rowIndex}: Updated - ${rollNumber}, ${normalizedCourseName}, attempt ${newAttemptCount}, status=${status}`);
    return { success: true, inserted: false, skipped: false, updated: true };
  }

  // INSERT new record (student hasn't attempted this skill before)
  await connection.execute(
    `INSERT INTO student_skills 
      (slot_id, student_id, year, student_name, student_email, skill_id, course_name, skill_level,
       excel_venue_name, student_venue_id, faculty_id, total_attempts, best_score, 
       latest_score, status, last_attendance, last_slot_date, last_start_time, 
       last_end_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [slotId, student.student_id, year, studentName, studentEmail, normalizedCourseName, skillLevel,
     excelVenueName, studentVenueId, facultyId, attempt, score, score, status, 
     attendance, slotDate, startTime, endTime]
  );

  // console.log(`Row ${rowIndex}: Inserted - ${rollNumber}, ${normalizedCourseName}, level=${skillLevel}, ${slotDate}`);
  return { success: true, inserted: true, skipped: false };
}

/**
 * Validate status
 */
function validateStatus(status) {
  const normalized = (status || '').toString().trim().toLowerCase();
  if (normalized === 'cleared') return 'Cleared';
  if (normalized === 'not cleared') return 'Not Cleared';
  return 'Ongoing';
}

/**
 * Validate attendance
 */
function validateAttendance(attendance) {
  const normalized = (attendance || '').toString().trim().toLowerCase();
  if (normalized === 'present') return 'Present';
  if (normalized === 'absent') return 'Absent';
  return null;
}

/**
 * Parse Excel date
 */
function parseExcelDate(dateValue) {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Parse Excel time
 */
function parseExcelTime(timeValue) {
  if (!timeValue) return null;
  
  if (typeof timeValue === 'string') {
    // Handle "HH:MM:SS" or "HH:MM"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)) {
      return timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    }
    // Handle "09:00 AM" format
    const match = timeValue.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[3];
      
      if (period) {
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    }
  }
  
  if (typeof timeValue === 'number' && timeValue < 1) {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }
  
  return null;
}

/**
 * Get venues assigned to faculty
 */
export const getFacultyVenues = async (req, res) => {
  try {
    // console.log(`[SKILL REPORT VENUES] user_id: ${req.user.user_id}, role: ${req.user.role}`);
    
    // Admin can see all venues
    if (req.user.role === 'admin') {
      const [venues] = await db.execute(
        `SELECT DISTINCT v.venue_id, v.venue_name, v.location, v.capacity,
                u.name as faculty_name
         FROM venue v
         LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
         LEFT JOIN users u ON f.user_id = u.user_id
         ORDER BY v.venue_name`
      );
      return res.status(200).json({ venues });
    }

    // Get faculty_id from user
    const [faculty] = await db.execute(
      `SELECT faculty_id FROM faculties WHERE user_id = ?`,
      [req.user.user_id]
    );

    // console.log(`[SKILL REPORT VENUES] Faculty lookup - user_id: ${req.user.user_id}, found: ${faculty.length > 0}, faculty_id: ${faculty.length > 0 ? faculty[0].faculty_id : 'NONE'}`);

    if (faculty.length === 0) {
      return res.status(403).json({ message: 'Faculty record not found' });
    }

    const facultyId = faculty[0].faculty_id;

    const [venues] = await db.execute(
      `SELECT DISTINCT v.venue_id, v.venue_name, v.location, v.capacity,
              uf.name as faculty_name
       FROM venue v
       LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
       LEFT JOIN users uf ON f.user_id = uf.user_id
       WHERE v.assigned_faculty_id = ? 
       ORDER BY v.venue_name`,
      [facultyId]
    );

    // console.log(`[SKILL REPORT VENUES] Query result for faculty_id ${facultyId}: ${venues.length} venue(s)`);

    res.status(200).json({ venues });

  } catch (error) {
    console.error('Error fetching faculty venues:', error);
    res.status(500).json({ message: 'Failed to fetch venues', error: error.message });
  }
};

/**
 * Get skill reports for faculty's venue
 * Shows only the LATEST record per student/course (closest date to current date)
 */
export const getSkillReportsForFaculty = async (req, res) => {
  try {
    const { venueId, page = 1, limit = 50, status, date, search, skill, sortBy = 'last_slot_date', sortOrder = 'DESC' } = req.body;
    
    // console.log('[SKILL REPORTS] Request params:', { venueId, page, limit, status, skill, userRole: req.user.role });
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Check if venueId is 'all' (admin requesting all venues)
    const isAllVenues = venueId === 'all';

    // Get faculty_id for access control
    let facultyId = null;
    let facultyVenueIds = [];
    
    if (req.user.role !== 'admin') {
      const [faculty] = await db.execute(
        `SELECT faculty_id FROM faculties WHERE user_id = ?`,
        [req.user.user_id]
      );

      if (faculty.length === 0) {
        return res.status(403).json({ message: 'Faculty record not found' });
      }

      facultyId = faculty[0].faculty_id;

      // Verify faculty has access to this venue
      if (venueId && !isAllVenues) {
        const [venueAccess] = await db.execute(
          `SELECT v.venue_id FROM venue v 
           WHERE v.venue_id = ? AND v.assigned_faculty_id = ?`,
          [parseInt(venueId), facultyId]
        );

        if (venueAccess.length === 0) {
          return res.status(403).json({ message: 'You do not have access to this venue' });
        }
      }
      
      // Get all accessible venues for this faculty
      const [accessibleVenues] = await db.execute(
        `SELECT DISTINCT v.venue_id FROM venue v 
         WHERE v.assigned_faculty_id = ?`,
        [facultyId]
      );
      facultyVenueIds = accessibleVenues.map(v => v.venue_id);
      
      // console.log('[SKILL REPORTS] Faculty accessible venues:', facultyVenueIds);
    }

    // Build query - Get only the LATEST record per student/course (using subquery)
    // This ensures we show the record with the most recent slot_date
    let query = `
      SELECT 
        ss.id,
        ss.slot_id,
        u.ID as roll_number,
        COALESCE(ss.student_name, u.name) as student_name,
        COALESCE(ss.student_email, u.email) as email,
        u.department,
        ss.year,
        ss.course_name,
        ss.excel_venue_name,
        sv.venue_name as student_current_venue,
        ss.total_attempts,
        ss.best_score,
        ss.latest_score,
        ss.status,
        ss.last_attendance,
        ss.last_slot_date,
        ss.last_start_time,
        ss.last_end_time,
        ss.updated_at
      FROM student_skills ss
      INNER JOIN (
        SELECT student_id, course_name, MAX(last_slot_date) as max_date
        FROM student_skills
        GROUP BY student_id, course_name
      ) latest ON ss.student_id = latest.student_id 
                AND ss.course_name = latest.course_name 
                AND ss.last_slot_date = latest.max_date
      JOIN students s ON ss.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN venue sv ON ss.student_venue_id = sv.venue_id
      WHERE 1=1`;

    const params = [];
    
    // Venue filter - Filter by students who are ENROLLED in groups for the selected venue
    // This ensures we only show skill data for students actually assigned to the venue
    // If admin selects "all", skip venue filtering
    if (venueId && !isAllVenues) {
      query += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id = ? AND gs.status = 'Active' AND g.status = 'Active'
      )`;
      params.push(parseInt(venueId));
    } else if (facultyVenueIds.length > 0 && !isAllVenues) {
      // Filter by students enrolled in any of faculty's venues
      query += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id IN (${facultyVenueIds.join(',')}) AND gs.status = 'Active' AND g.status = 'Active'
      )`;
    }
    // If isAllVenues is true (admin), no venue filter is applied

    // Skill/course filter
    if (skill && skill.trim().length > 0) {
      query += ' AND ss.course_name = ?';
      params.push(skill.trim());
    }

    // Status filter
    if (status && ['Cleared', 'Not Cleared', 'Ongoing'].includes(status)) {
      query += ' AND ss.status = ?';
      params.push(status);
    }

    // Date filter
    if (date) {
      query += ' AND DATE(ss.last_slot_date) = ?';
      params.push(date);
    }

    // Search filter
    if (search && search.trim().length > 0) {
      query += ' AND (u.name LIKE ? OR u.ID LIKE ? OR ss.course_name LIKE ? OR ss.student_name LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Sorting - default to most recent date first
    const allowedSortColumns = ['last_slot_date', 'updated_at', 'best_score', 'total_attempts', 'status'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'last_slot_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    query += ` ORDER BY ss.${sortColumn} ${order} LIMIT ${limitNum} OFFSET ${offsetNum}`;

    let reports = [];
    try {
      [reports] = await db.execute(query, params);
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      console.error('Query:', query);
      console.error('Params:', params);
      return res.status(500).json({ 
        message: 'Failed to fetch skill reports',
        error: queryError.message 
      });
    }

    // Get total count (only counting latest records per student/course)
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM student_skills ss
      INNER JOIN (
        SELECT student_id, course_name, MAX(last_slot_date) as max_date
        FROM student_skills
        GROUP BY student_id, course_name
      ) latest ON ss.student_id = latest.student_id 
                AND ss.course_name = latest.course_name 
                AND ss.last_slot_date = latest.max_date
      JOIN students s ON ss.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE 1=1`;
    const countParams = [];
    
    // Venue filter - same logic as main query (filter by group membership)
    if (venueId && !isAllVenues) {
      countQuery += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id = ? AND gs.status = 'Active' AND g.status = 'Active'
      )`;
      countParams.push(parseInt(venueId));
    } else if (facultyVenueIds.length > 0 && !isAllVenues) {
      countQuery += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id IN (${facultyVenueIds.join(',')}) AND gs.status = 'Active' AND g.status = 'Active'
      )`;
    }

    // Skill filter for count
    if (skill && skill.trim().length > 0) {
      countQuery += ' AND ss.course_name = ?';
      countParams.push(skill.trim());
    }

    if (status && ['Cleared', 'Not Cleared', 'Ongoing'].includes(status)) {
      countQuery += ' AND ss.status = ?';
      countParams.push(status);
    }

    if (date) {
      countQuery += ' AND DATE(ss.last_slot_date) = ?';
      countParams.push(date);
    }

    if (search && search.trim().length > 0) {
      countQuery += ' AND (u.name LIKE ? OR u.ID LIKE ? OR ss.course_name LIKE ? OR ss.student_name LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Get statistics (only for latest records per student/course)
    // Statistics SHOULD be affected by venue and skill filters but NOT by status/date/search
    // This gives accurate counts for all statuses within the filtered context
    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ss.status = 'Cleared' THEN 1 ELSE 0 END) as cleared,
        SUM(CASE WHEN ss.status = 'Not Cleared' THEN 1 ELSE 0 END) as not_cleared,
        SUM(CASE WHEN ss.status = 'Ongoing' THEN 1 ELSE 0 END) as ongoing,
        ROUND(AVG(ss.best_score), 2) as avg_best_score,
        (SELECT COUNT(*) FROM students) as total_students
      FROM student_skills ss
      INNER JOIN (
        SELECT student_id, course_name, MAX(last_slot_date) as max_date
        FROM student_skills
        GROUP BY student_id, course_name
      ) latest ON ss.student_id = latest.student_id 
                AND ss.course_name = latest.course_name 
                AND ss.last_slot_date = latest.max_date
      JOIN students s ON ss.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      WHERE 1=1`;
    const statsParams = [];
    
    // Venue filter - MUST match the main query venue filter
    if (venueId && !isAllVenues) {
      statsQuery += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id = ? AND gs.status = 'Active' AND g.status = 'Active'
      )`;
      statsParams.push(parseInt(venueId));
    } else if (!isAllVenues && facultyVenueIds.length > 0) {
      // Faculty non-admin: filter by their assigned venues
      statsQuery += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id IN (${facultyVenueIds.join(',')}) AND gs.status = 'Active' AND g.status = 'Active'
      )`;
    }
    // If isAllVenues=true (admin), no venue filter

    // Skill filter - MUST be applied to stats
    if (skill && skill.trim().length > 0) {
      statsQuery += ' AND ss.course_name = ?';
      statsParams.push(skill.trim());
    }
    // DO NOT apply status/date/search filters to statistics

    const [stats] = await db.execute(statsQuery, statsParams);

    // Get ALL students enrolled in groups for this venue (for "Not Attempted" filter)
    // For "all" venues (admin), get ALL students from ALL groups
    let venueStudents = [];
    if (venueId && !isAllVenues) {
      const [students] = await db.execute(`
        SELECT DISTINCT
          s.student_id,
          u.ID as roll_number,
          u.name as student_name,
          u.email,
          u.department,
          st.year
        FROM group_students gs
        INNER JOIN students st ON gs.student_id = st.student_id
        INNER JOIN users u ON st.user_id = u.user_id
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        INNER JOIN students s ON gs.student_id = s.student_id
        WHERE g.venue_id = ?
          AND gs.status = 'Active'
          AND g.status = 'Active'
        ORDER BY u.name
      `, [parseInt(venueId)]);
      venueStudents = students;
    } else if (isAllVenues) {
      // For "all" venues (admin), get ALL students including those not in any venue/group
      const [students] = await db.execute(`
        SELECT DISTINCT
          s.student_id,
          u.ID as roll_number,
          u.name as student_name,
          u.email,
          u.department,
          s.year
        FROM students s
        INNER JOIN users u ON s.user_id = u.user_id
        ORDER BY u.name
      `);
      venueStudents = students;
    }

    // Get available skills for this venue (distinct course names)
    let availableSkillsQuery = `
      SELECT DISTINCT ss.course_name 
      FROM student_skills ss
      INNER JOIN (
        SELECT student_id, course_name, MAX(last_slot_date) as max_date
        FROM student_skills
        GROUP BY student_id, course_name
      ) latest ON ss.student_id = latest.student_id 
                AND ss.course_name = latest.course_name 
                AND ss.last_slot_date = latest.max_date
      WHERE 1=1`;
    const skillParams = [];
    
    if (venueId && !isAllVenues) {
      availableSkillsQuery += ` AND ss.student_id IN (
        SELECT gs.student_id 
        FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id = ? AND gs.status = 'Active' AND g.status = 'Active'
      )`;
      skillParams.push(parseInt(venueId));
    }
    availableSkillsQuery += ' ORDER BY ss.course_name';
    
    const [skillsList] = await db.execute(availableSkillsQuery, skillParams);
    const availableSkills = skillsList.map(s => s.course_name);

    // Get ALL student IDs who have attempted the selected skill (for "Not Attempted" calculation)
    // This is NOT paginated - we need all IDs to properly calculate who hasn't attempted
    let attemptedStudentIds = [];
    if (skill && skill.trim().length > 0) {
      let attemptedQuery = `
        SELECT DISTINCT ss.student_id
        FROM student_skills ss
        INNER JOIN (
          SELECT student_id, course_name, MAX(last_slot_date) as max_date
          FROM student_skills
          GROUP BY student_id, course_name
        ) latest ON ss.student_id = latest.student_id 
                  AND ss.course_name = latest.course_name 
                  AND ss.last_slot_date = latest.max_date
        JOIN students s ON ss.student_id = s.student_id
        WHERE ss.course_name = ?`;
      const attemptedParams = [skill.trim()];
      
      // Apply same venue filter
      if (venueId && !isAllVenues) {
        attemptedQuery += ` AND ss.student_id IN (
          SELECT gs.student_id 
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE g.venue_id = ? AND gs.status = 'Active' AND g.status = 'Active'
        )`;
        attemptedParams.push(parseInt(venueId));
      } else if (facultyVenueIds.length > 0 && !isAllVenues) {
        attemptedQuery += ` AND ss.student_id IN (
          SELECT gs.student_id 
          FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE g.venue_id IN (${facultyVenueIds.join(',')}) AND gs.status = 'Active' AND g.status = 'Active'
        )`;
      }
      
      const [attemptedStudents] = await db.execute(attemptedQuery, attemptedParams);
      attemptedStudentIds = attemptedStudents.map(s => s.student_id);
    }

    // Return response even if no data
    res.status(200).json({
      venue: isAllVenues 
        ? { venue_name: 'All Venues' } 
        : venueId 
          ? { venue_id: venueId, venue_name: 'Selected Venue' } 
          : { venue_name: 'All Venues' },
      reports: reports || [],
      venueStudents: venueStudents, // All students in the venue for "Not Attempted" filter
      attemptedStudentIds: attemptedStudentIds, // All student IDs who have attempted the selected skill
      availableSkills: availableSkills, // List of skill names for dropdown
      statistics: stats[0] || {
        total: 0,
        cleared: 0,
        not_cleared: 0,
        ongoing: 0,
        avg_best_score: 0
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total || 0,
        totalPages: Math.ceil((total || 0) / parseInt(limit))
      },
      message: reports.length === 0 ? 'No skill reports found for this venue' : undefined
    });

  } catch (error) {
    console.error('Error in getSkillReportsForFaculty:', error);
    res.status(500).json({ 
      message: 'Failed to fetch skill reports',
      error: error.message 
    });
  }
};

/**
 * Search students by name - Faculty
 */
export const searchStudentSkillReports = async (req, res) => {
  try {
    const { query: searchQuery } = req.body;

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    let venueIds = [];
    let placeholders = '';
    
    // Admin can search all venues
    if (req.user.role === 'admin') {
      const [allVenues] = await db.execute(`SELECT venue_id FROM venue`);
      if (allVenues.length === 0) {
        return res.status(200).json({ reports: [] });
      }
      venueIds = allVenues.map(v => v.venue_id);
    } else {
      // Get faculty_id
      const [faculty] = await db.execute(
        `SELECT faculty_id FROM faculties WHERE user_id = ?`,
        [req.user.user_id]
      );

      if (faculty.length === 0) {
        return res.status(403).json({ message: 'Faculty record not found' });
      }

      const facultyId = faculty[0].faculty_id;

      // Get faculty's assigned venues
      const [assignedVenues] = await db.execute(
        `SELECT v.venue_id FROM venue v 
         WHERE v.assigned_faculty_id = ?`,
        [facultyId]
      );

      if (assignedVenues.length === 0) {
        return res.status(200).json({ reports: [] });
      }

      venueIds = assignedVenues.map(v => v.venue_id);
    }

    placeholders = venueIds.map(() => '?').join(',');

    const sqlQuery = `
      SELECT 
        ss.id,
        u.ID as roll_number,
        u.name as student_name,
        u.email,
        u.department,
        ss.course_name,
        v.venue_name,
        ss.total_attempts,
        ss.best_score,
        ss.latest_score,
        ss.status,
        ss.last_slot_date,
        ss.updated_at
      FROM student_skills ss
      JOIN students s ON ss.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      JOIN venue v ON ss.venue_id = v.venue_id
      WHERE ss.venue_id IN (${placeholders})
        AND (u.name LIKE ? OR u.ID LIKE ? OR ss.course_name LIKE ?)
      ORDER BY u.name ASC
      LIMIT 100
    `;

    const searchPattern = `%${searchQuery}%`;
    const params = [...venueIds, searchPattern, searchPattern, searchPattern];

    const [reports] = await db.execute(sqlQuery, params);

    res.status(200).json({ reports });

  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
};

/**
 * Get skill reports for logged-in student
 * Shows only the LATEST record per course (most recent slot_date)
 */
export const getSkillReportsForStudent = async (req, res) => {
  try {
    // Get student_id
    const [student] = await db.execute(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (student.length === 0) {
      return res.status(403).json({ message: 'Student record not found' });
    }

    const studentId = student[0].student_id;

    // Get only the latest record per course
    const [reports] = await db.execute(
      `SELECT 
        ss.id,
        ss.slot_id,
        ss.course_name,
        ss.excel_venue_name as venue_name,
        ss.year,
        ss.total_attempts,
        ss.best_score,
        ss.latest_score,
        ss.status,
        ss.last_attendance,
        ss.last_slot_date,
        ss.last_start_time,
        ss.last_end_time,
        ss.created_at,
        ss.updated_at
      FROM student_skills ss
      INNER JOIN (
        SELECT course_name, MAX(last_slot_date) as max_date
        FROM student_skills
        WHERE student_id = ?
        GROUP BY course_name
      ) latest ON ss.course_name = latest.course_name 
                AND ss.last_slot_date = latest.max_date
      WHERE ss.student_id = ? 
      ORDER BY ss.last_slot_date DESC`,
      [studentId, studentId]
    );

    // Calculate summary based on latest records
    const summary = {
      totalCourses: reports.length,
      cleared: reports.filter(r => r.status === 'Cleared').length,
      notCleared: reports.filter(r => r.status === 'Not Cleared').length,
      ongoing: reports.filter(r => r.status === 'Ongoing').length,
      totalAttempts: reports.reduce((sum, r) => sum + (r.total_attempts || 0), 0),
      averageBestScore: reports.length > 0
        ? (reports.reduce((sum, r) => sum + (parseFloat(r.best_score) || 0), 0) / reports.length).toFixed(2)
        : 0
    };

    res.status(200).json({ reports, summary });

  } catch (error) {
    console.error('Error fetching student reports:', error);
    res.status(500).json({ message: 'Failed to fetch skill reports', error: error.message });
  }
};