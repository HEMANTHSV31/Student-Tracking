
import db from '../config/db.js';

// ====================== CONFIGURATION ======================
// Semester start date - Change this to adjust when attendance tracking begins
const SEMESTER_START_DATE = '2025-12-15';

// ====================== HELPER FUNCTIONS ======================
function getRandomColor() {
  const colors = ['#C0C6D8', '#9CA3AF', '#EBE0D9', '#D1D5DB', '#B4B8C5'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get user info by any ID (user_id, faculty_id, or id)
const getUserInfo = async (userId) => {
  try {
    // Try to find by user_id first
    let [userInfo] = await db.query(`
      SELECT 
        u.user_id, 
        u.name, 
        u.role_id, 
        r.role,
        f.faculty_id,
        f.designation
      FROM users u
      LEFT JOIN role r ON u.role_id = r.role_id
      LEFT JOIN faculties f ON u.user_id = f.user_id
      WHERE u.user_id = ? OR f.faculty_id = ? OR u.ID = ?
    `, [userId, userId, userId]);

    if (userInfo.length === 0) {
      return null;
    }

    return userInfo[0];
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Ensure user has faculty_id (create if needed for admins)
const ensureFacultyId = async (userId) => {
  const user = await getUserInfo(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // If user already has faculty_id, return it
  if (user.faculty_id) {
    return user.faculty_id;
  }

  // If user is admin and doesn't have faculty_id, create one
  if (user.role === 'admin') {
    
    const [result] = await db.query(`
      INSERT INTO faculties (user_id, designation) 
      VALUES (?, 'Administrator')
    `, [user.user_id]);

    return result.insertId;
  }

  // For non-admin users without faculty_id
  throw new Error('User is not a faculty member');
};

// ====================== CONTROLLER FUNCTIONS ======================

// Get venues for attendance marking (faculty sees only assigned, admin sees all)
export const getVenueAllocations = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.user_id;
    const { year } = req.query; // Year filter parameter
    // console.log(`[ATTENDANCE VENUES] user_id: ${userId}, role: ${req.user.role}`);

    // Get user info
    const user = await getUserInfo(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Build year filter condition
    const yearCondition = year ? `AND st.year = ${parseInt(year)}` : '';
    // Only filter by venue.year if we want strict filtering, otherwise show all venues with matching students
    // const venueYearCondition = year ? `AND (v.year = ${parseInt(year)} OR v.year IS NULL)` : '';
    const yearHaving = year ? `HAVING student_count > 0` : '';

    let allocations;
    
    // If user is admin, show all venues
    if (req.user.role === 'admin') {
      [allocations] = await db.query(`
        SELECT 
          v.venue_id,
          v.venue_name,
          v.capacity,
          v.assigned_faculty_id,
          COUNT(DISTINCT CASE WHEN gs.status = 'Active' ${yearCondition} THEN gs.student_id END) as student_count,
          u.name as assigned_faculty_name
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs.group_id
        ${year ? `LEFT JOIN students st ON gs.student_id = st.student_id` : ''}
        LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
        LEFT JOIN users u ON f.user_id = u.user_id
        WHERE v.status = 'Active'
        GROUP BY v.venue_id
        ${yearHaving}
        ORDER BY v.venue_name
      `);
      
    } else {
      // Faculty: Only show venues they are assigned to
      // Get faculty_id first
      const [faculty] = await db.query(
        'SELECT faculty_id FROM faculties WHERE user_id = ?',
        [userId]
      );
      
      // console.log(`[ATTENDANCE VENUES] Faculty lookup - user_id: ${userId}, found: ${faculty.length > 0}, faculty_id: ${faculty.length > 0 ? faculty[0].faculty_id : 'NONE'}`);
      
      if (faculty.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Faculty record not found'
        });
      }
      
      const facultyId = faculty[0].faculty_id;
      
      // Get venues where faculty is assigned
      [allocations] = await db.query(`
        SELECT DISTINCT
          v.venue_id,
          v.venue_name,
          v.capacity,
          v.assigned_faculty_id,
          COUNT(DISTINCT CASE WHEN gs.status = 'Active' ${yearCondition} THEN gs.student_id END) as student_count,
          u.name as assigned_faculty_name
        FROM venue v
        LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id
        LEFT JOIN group_students gs ON g.group_id = gs.group_id
        ${year ? `LEFT JOIN students st ON gs.student_id = st.student_id` : ''}
        LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
        LEFT JOIN users u ON f.user_id = u.user_id
        WHERE v.status = 'Active'
          AND v.assigned_faculty_id = ?
        GROUP BY v.venue_id
        ${yearHaving}
        ORDER BY v.venue_name
      `, [facultyId]);
      
      // console.log(`[ATTENDANCE VENUES] Query result for faculty_id ${facultyId}: ${allocations.length} venue(s)`);
    }


    res.status(200).json({ 
      success: true, 
      data: allocations,
      user_info: {
        user_id: user.user_id,
        faculty_id: user.faculty_id,
        name: user.name,
        role: user.role,
        designation: user.designation
      }
    });
  } catch (error) {
    console.error('❌ Error fetching venues:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch venues',
      error: error.message 
    });
  }
};

// Get students for a specific venue
export const getStudentsForVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { year } = req.query; // Year filter parameter
    
    // Build year filter condition
    const yearFilter = year ? `AND s.year = ${parseInt(year)}` : '';
    
    const [students] = await db.query(`
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        u.department,
        s.year as student_year,
        gs.group_id,
        g.group_name
      FROM group_students gs
      INNER JOIN students s ON gs.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      WHERE g.venue_id = ?  
        AND gs.status = 'Active'
        AND u.is_active = 1
        ${yearFilter}
      ORDER BY u.name
    `, [venueId]);

    const formattedStudents = students.map(student => ({
      id: student.roll_number,
      student_id: student.student_id,
      name: student.name,
      email: student.email,
      department: student.department,
      group_name: student.group_name,
      status: '',
      remarks: '',
      avatarColor: getRandomColor()
    }));

    res.status(200).json({ 
      success: true, 
      data: formattedStudents,
      venue_id: venueId,
      count: students.length
    });
  } catch (error) {
    console.error('❌ Error fetching students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students',
      error: error.message 
    });
  }
};

// Get or create attendance session
export const getOrCreateSession = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { sessionName, date, timeSlot, venueId } = req.body;

    if (!sessionName || !date || !timeSlot || !venueId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: sessionName, date, timeSlot, venueId' 
      });
    }

    // Map timeSlot to session number (1-4)
    const timeSlotMapping = {
      '09:00 AM - 10:30 AM': 'S1',
      '10:30 AM - 12:30 PM': 'S2',
      '01:30 PM - 03:00 PM': 'S3',
      '03:00 PM - 04:30 PM': 'S4'
    };
    
    const sessionNum = timeSlotMapping[timeSlot] || 'S1';

    // Create consistent session name based on venue_id, date, and session number
    // This ensures faculty and admin see the same session for the same venue/date/time
    const fullSessionName = `${sessionNum}_Venue${venueId}_${date}`;

    // Check if session already exists
    const [existingSession] = await connection.query(
      'SELECT session_id FROM attendance_session WHERE session_name = ?',
      [fullSessionName]
    );

    if (existingSession.length > 0) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          session_id: existingSession[0].session_id, 
          existing: true,
          session_name: fullSessionName
        }
      });
    }

    // Create new session
    const [result] = await connection.query(
      'INSERT INTO attendance_session (session_name, created_at) VALUES (?, NOW())',
      [fullSessionName]
    );

    res.status(201).json({ 
      success: true, 
      data: { 
        session_id: result.insertId, 
        existing: false,
        session_name: fullSessionName
      }
    });

  } catch (error) {
    console.error('❌ Error with session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process session',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get existing attendance for a session
export const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId, venueId } = req.params;

    // Get attendance records for this session
    const [attendanceRecords] = await db.query(`
      SELECT 
        a.student_id,
        a.is_present,
        a.is_late,
        a.remarks
      FROM attendance a
      WHERE a.session_id = ? AND a.venue_id = ?
    `, [sessionId, venueId]);

    // Transform to frontend format
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      let status = 'absent';
      
      // Check for special statuses (stored in remarks)
      if (record.remarks === 'PS') {
        status = 'ps';
      } else if (record.remarks === 'MM') {
        status = 'mm';
      } else if (record.remarks === 'AD') {
        status = 'ad';
      } else if (record.remarks === 'Other') {
        status = 'other';
      } else if (record.is_present === 1) {
        status = record.is_late === 1 ? 'late' : 'present';
      }
      
      attendanceMap[record.student_id] = {
        status,
        remarks: record.remarks || ''
      };
    });

    res.status(200).json({
      success: true,
      data: attendanceMap,
      count: attendanceRecords.length
    });

  } catch (error) {
    console.error('❌ Error fetching session attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session attendance',
      error: error.message
    });
  }
};

// Save attendance - MAIN FUNCTION
export const saveAttendance = async (req, res) => {

  const connection = await db.getConnection();
  
  try {
    const { 
      venueId, 
      sessionId, 
      date, 
      timeSlot,
      attendance 
    } = req.body;

    // Get faculty_id from JWT token
    const userId = req.user.user_id;

    // Validation
    if (!venueId || !sessionId || !attendance || attendance.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Ensure user has faculty_id (create for admin if needed)
    const actualFacultyId = await ensureFacultyId(userId);

    // Verify session exists
    const [sessionCheck] = await connection.query(
      'SELECT session_id FROM attendance_session WHERE session_id = ?',
      [sessionId]
    );

    if (sessionCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify venue exists
    const [venueCheck] = await connection.query(
      'SELECT venue_id FROM venue WHERE venue_id = ? AND status = "Active"',
      [venueId]
    );

    if (venueCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    await connection.beginTransaction();

    let insertedCount = 0;
    let updatedCount = 0;

    // Process each attendance record
    for (const record of attendance) {
      
      // Handle different status types: present, late, absent, ps
      let isPresent, isLate, remarks;
      
      switch(record.status) {
        case 'present':
          isPresent = 1;
          isLate = 0;
          remarks = record.remarks && String(record.remarks).trim() ? String(record.remarks).trim() : null;
          break;
        case 'late':
          isPresent = 1;
          isLate = 1;
          remarks = record.remarks && String(record.remarks).trim() ? String(record.remarks).trim() : null;
          break;
        case 'ps':
          isPresent = 1;
          isLate = 0;
          remarks = 'PS';
          break;
        case 'absent':
        default:
          isPresent = 0;
          isLate = 0;
          remarks = record.remarks && String(record.remarks).trim() ? String(record.remarks).trim() : null;
          break;
      }

      // Check if attendance already exists using unique_student_session constraint
      const [existingRecord] = await connection.query(`
        SELECT attendance_id FROM attendance 
        WHERE student_id = ? AND session_id = ?
      `, [record.student_id, sessionId]);

      if (existingRecord.length > 0) {
        // Update existing record - allow updating attendance for same date and session
        await connection.query(`
          UPDATE attendance 
          SET 
            is_present = ?, 
            is_late = ?, 
            remarks = ?,
            faculty_id = ?,
            venue_id = ?,
            updated_at = NOW()
          WHERE student_id = ? AND session_id = ?
        `, [isPresent, isLate, remarks, actualFacultyId, venueId, record.student_id, sessionId]);
        updatedCount++;
      } else {
        // Insert new record
        await connection.query(`
          INSERT INTO attendance 
          (student_id, faculty_id, venue_id, session_id, is_present, is_late, remarks, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [record.student_id, actualFacultyId, venueId, sessionId, isPresent, isLate, remarks]);
        insertedCount++;
      }
    }

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Attendance saved successfully',
      data: {
        inserted: insertedCount,
        updated: updatedCount,
        total: attendance.length,
        faculty_id: actualFacultyId,
        session_id: sessionId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error saving attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save attendance',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    connection.release();
    }
};

// Get students who are late 5+ times
export const getLateStudents = async (req, res) => {
  try {
    const { facultyId: facultyIdParam } = req.params;
    const { facultyId: facultyIdQuery, minCount } = req.query;
    const facultyId = facultyIdQuery ?? facultyIdParam;
    const minLateCount = Math.max(1, parseInt(minCount ?? '5', 10) || 5);
    let query = `
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        u.department,
        COUNT(CASE WHEN a.is_late = 1 THEN 1 END) as late_count,
        GROUP_CONCAT(
          CONCAT(ats.session_name, ' - ', DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i'))
          ORDER BY a.created_at DESC
          SEPARATOR '||'
        ) as late_sessions
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN attendance a ON s.student_id = a.student_id
      INNER JOIN attendance_session ats ON a.session_id = ats.session_id
      WHERE a.is_late = 1
    `;

    const params = [];

    if (facultyId && facultyId !== 'all') {
      query += ` AND a.faculty_id = ?`;
      params.push(facultyId);
    }

    query += `
      GROUP BY s.student_id
      HAVING late_count >= ?
      ORDER BY late_count DESC, u.name
    `;

    params.push(minLateCount);

    const [students] = await db.query(query, params);


    const formattedStudents = students.map(student => ({
      student_id: student.student_id,
      name: student.name,
      roll_number: student.roll_number,
      email: student.email,
      department: student.department,
      late_count: student.late_count,
      late_sessions: student.late_sessions ? student.late_sessions.split('||') : []
    }));

    res.status(200).json({ 
      success: true, 
      data: formattedStudents,
      count: students.length
    });
  } catch (error) {
    console.error('❌ Error fetching late students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch late students',
      error: error.message 
    });
  }
};

// Get attendance history for a student - ONLY for their assigned venues
export const getStudentAttendanceHistory = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.user_id;

    // Get only the latest attendance record for each session (in case faculty marked multiple times)
    const [history] = await db.query(`
      SELECT 
        a.attendance_id,
        a.is_present,
        a.is_late,
        a.remarks,
        a.created_at,
        ats.session_name,
        v.venue_name,
        u.name as faculty_name
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN attendance_session ats ON a.session_id = ats.session_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      INNER JOIN faculties f ON a.faculty_id = f.faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      INNER JOIN (
        SELECT a2.session_id, a2.student_id, MAX(a2.attendance_id) as max_attendance_id
        FROM attendance a2
        INNER JOIN students s2 ON a2.student_id = s2.student_id
        WHERE s2.user_id = ?
        GROUP BY a2.session_id, a2.student_id
      ) latest ON a.session_id = latest.session_id 
              AND a.student_id = latest.student_id 
              AND a.attendance_id = latest.max_attendance_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [userId, userId]);

    res.status(200).json({ 
      success: true, 
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('❌ Error fetching attendance history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance history',
      error: error.message 
    });
  }
};

// Get attendance dashboard data for a student
export const getStudentAttendanceDashboard = async (req, res) => {
  try {
    // Get user ID from JWT token
    const userId = req.user.user_id;
    const { year } = req.query;

    const currentYear = year || new Date().getFullYear();

    // Get overall attendance stats - Calculate by hours per day (4 hours = 100%)
    // Count distinct session dates (from session name), not created_at dates
    const [overallStats] = await db.query(`
      SELECT 
        COUNT(DISTINCT SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10)) as total_days,
        SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) as total_hours_present,
        COUNT(*) as total_hours,
        ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as attendance_percentage
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN attendance_session ats ON a.session_id = ats.session_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND YEAR(a.created_at) = ?
        AND DATE(a.created_at) >= ?
    `, [userId, currentYear, SEMESTER_START_DATE]);

    // Get daily breakdown to calculate present/late/absent days
    // Extract date from session name (format: Venue_YYYYMMDD_YYYY-MM-DD_Time)
    const [dailyBreakdown] = await db.query(`
      SELECT 
        SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10) as attendance_date,
        COUNT(*) as total_hours,
        SUM(CASE WHEN a.is_present = 1 AND a.is_late = 0 THEN 1 ELSE 0 END) as present_hours,
        SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_hours,
        SUM(CASE WHEN a.is_present = 0 THEN 1 ELSE 0 END) as absent_hours,
        ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as day_percentage
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN attendance_session ats ON a.session_id = ats.session_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND YEAR(a.created_at) = ?
        AND DATE(a.created_at) >= ?
      GROUP BY SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10)
    `, [userId, currentYear, SEMESTER_START_DATE]);

    // Count days by status: only days with 4/4 hours present count as Present, everything else is Absent
    let presentDays = 0, lateDays = 0, absentDays = 0;
    dailyBreakdown.forEach(day => {
      const totalHours = parseInt(day.total_hours);
      const presentHours = parseInt(day.present_hours);
      
      if (totalHours === 4 && presentHours === 4) {
        presentDays++; // All 4 hours present = Present Day
      } else {
        absentDays++; // Less than 4 hours = Absent Day
      }
    });

    // Calculate overall stats
    const totalDays = dailyBreakdown.length;
    const overallPercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Get venue-wise (subject) attendance - Calculate by hours
    const [subjectStats] = await db.query(`
      SELECT 
        v.venue_name as name,
        COUNT(DISTINCT DATE(a.created_at)) as total,
        ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as percent,
        SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) as current_hours,
        COUNT(*) as total_hours
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND YEAR(a.created_at) = ?
        AND DATE(a.created_at) >= ?
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `, [userId, currentYear, SEMESTER_START_DATE]);

    // Recalculate current (days attended) based on percentage
    const subjects = subjectStats.map(sub => ({
      name: sub.name,
      total: sub.total,
      current: Math.round((sub.percent / 100) * sub.total),
      percent: sub.percent
    }));

    // Get recent skills/events attendance - ONLY student's assigned venues
    const [recentSkills] = await db.query(`
      SELECT 
        v.venue_name as name,
        'Workshop' as type,
        DATE_FORMAT(a.created_at, '%b %d, %Y') as date,
        CASE 
          WHEN a.is_present = 1 AND a.is_late = 0 THEN 'Present'
          WHEN a.is_late = 1 THEN 'Late'
          ELSE 'Absent'
        END as status
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND YEAR(a.created_at) = ?
        AND DATE(a.created_at) >= ?
      ORDER BY a.created_at DESC
      LIMIT 10
    `, [userId, currentYear, SEMESTER_START_DATE]);

    // Get month-wise attendance for chart - ONLY student's assigned venues
    const [monthlyStats] = await db.query(`
      SELECT 
        DATE_FORMAT(a.created_at, '%b') as month,
        MONTH(a.created_at) as month_num,
        ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as general,
        ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as skill
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND YEAR(a.created_at) = ?
      GROUP BY MONTH(a.created_at), DATE_FORMAT(a.created_at, '%b')
      ORDER BY MONTH(a.created_at)
    `, [userId, currentYear]);

    const stats = overallStats[0];

    const dashboardData = {
      overallStats: [
        {
          title: "OVERALL ATTENDANCE",
          value: `${overallPercentage}%`,
          sub: `Total days: ${totalDays} (${stats?.total_hours_present || 0}/${stats?.total_hours || 0} hours)`,
          color: overallPercentage >= 75 ? "#10B981" : "#F59E0B"
        },
        {
          title: "SKILL ATTENDANCE",
          value: `${overallPercentage}%`,
          sub: `Days Attended: ${presentDays + lateDays}/${totalDays}`,
          color: "#1e293b"
        }
      ],
      sessionStatus: [
        { label: "Present", count: presentDays, theme: "green" },
        { label: "Late", count: lateDays, theme: "orange" },
        { label: "Absent", count: absentDays, theme: "red" }
      ],
      subjects: subjects,
      skills: recentSkills,
      chartData: monthlyStats
    };

    res.status(200).json({ 
      success: true, 
      data: dashboardData,
      user_id: userId,
      year: currentYear
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard data',
      error: error.message 
    });
  }
};

/**
 * Get venue attendance details for a specific date and optional session
 * Used by GroupInsights -> AttendanceView
 * 
 * Tables used:
 * - attendance: student_id, faculty_id, venue_id, session_id, is_present, is_late, remarks
 * - attendance_session: session_id, session_name, created_at
 */
export const getVenueAttendanceDetails = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { date, session, year } = req.query;
    
    if (!venueId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Venue ID is required' 
      });
    }

    const selectedDate = date || new Date().toISOString().split('T')[0];
    const isAllVenues = venueId === 'all';
    
    // Build year filter condition
    const yearFilter = year ? `AND s.year = ${parseInt(year)}` : '';

    // First, get all students enrolled in groups for this venue (or all venues)
    let allStudents;
    if (isAllVenues) {
      // Admin: Get students from ALL active groups
      [allStudents] = await db.query(`
        SELECT DISTINCT
          s.student_id,
          u.name as student_name,
          u.ID as roll_number,
          u.email,
          u.department,
          s.year,
          gs.status as enrollment_status
        FROM group_students gs
        INNER JOIN students s ON gs.student_id = s.student_id
        INNER JOIN users u ON s.user_id = u.user_id
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE gs.status = 'Active'
          AND g.status = 'Active'
          ${yearFilter}
        ORDER BY u.name
      `);
    } else {
      [allStudents] = await db.query(`
        SELECT DISTINCT
          s.student_id,
          u.name as student_name,
          u.ID as roll_number,
          u.email,
          u.department,
          s.year,
          gs.status as enrollment_status
        FROM group_students gs
        INNER JOIN students s ON gs.student_id = s.student_id
        INNER JOIN users u ON s.user_id = u.user_id
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE g.venue_id = ?
          AND gs.status = 'Active'
          AND g.status = 'Active'
          ${yearFilter}
        ORDER BY u.name
      `, [venueId]);
    }

    if (allStudents.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          students: [],
          summary: { total: 0, present: 0, absent: 0, late: 0, notMarked: 0 },
          filters: { date: selectedDate, session: session || 'all', venueId }
        }
      });
    }

    // Get attendance records for the selected date and session
    // Session is now encoded in the session_name as S1_, S2_, S3_, or S4_ prefix
    let attendanceRecords;
    
    if (isAllVenues) {
      let query = `
        SELECT 
          a.student_id,
          a.is_present,
          a.is_late,
          a.remarks,
          asess.session_id,
          asess.session_name
        FROM attendance a
        INNER JOIN attendance_session asess ON a.session_id = asess.session_id
        WHERE (asess.session_name LIKE CONCAT('%_', ?, '_%') OR DATE(a.created_at) = ?)
      `;
      const params = [selectedDate, selectedDate];
      
      if (session) {
        // Filter by session number (1-4) by checking if session_name starts with S1_, S2_, etc.
        query += ` AND asess.session_name LIKE CONCAT('S', ?, '%')`;
        params.push(session);
      }
      
      [attendanceRecords] = await db.query(query, params);
    } else {
      let query = `
        SELECT 
          a.student_id,
          a.is_present,
          a.is_late,
          a.remarks,
          asess.session_id,
          asess.session_name
        FROM attendance a
        INNER JOIN attendance_session asess ON a.session_id = asess.session_id
        WHERE a.venue_id = ?
          AND (asess.session_name LIKE CONCAT('%_', ?, '_%') OR DATE(a.created_at) = ?)
      `;
      const params = [venueId, selectedDate, selectedDate];
      
      if (session) {
        // Filter by session number (1-4) by checking if session_name starts with S1_, S2_, etc.
        query += ` AND asess.session_name LIKE CONCAT('S', ?, '%')`;
        params.push(session);
      }
      
      [attendanceRecords] = await db.query(query, params);
    }

    // Create a map of attendance by student_id
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      // If student has multiple sessions, keep the latest one
      if (!attendanceMap.has(record.student_id)) {
        attendanceMap.set(record.student_id, record);
      }
    });

    // Calculate overall attendance percentage for each student
    let percentages;
    if (isAllVenues) {
      [percentages] = await db.query(`
        SELECT 
          student_id,
          ROUND((SUM(CASE WHEN is_present = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 1) as attendance_percentage
        FROM attendance
        GROUP BY student_id
      `);
    } else {
      [percentages] = await db.query(`
        SELECT 
          student_id,
          ROUND((SUM(CASE WHEN is_present = 1 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 1) as attendance_percentage
        FROM attendance
        WHERE venue_id = ?
        GROUP BY student_id
      `, [venueId]);
    }

    const percentageMap = new Map();
    percentages.forEach(p => percentageMap.set(p.student_id, p.attendance_percentage));

    // Merge attendance data with student data
    const studentsWithAttendance = allStudents.map(student => {
      const attendance = attendanceMap.get(student.student_id);
      let status = 'Not Marked';
      
      if (attendance) {
        // Check for special statuses (stored in remarks)
        if (attendance.remarks === 'PS') {
          status = 'PS';
        } else if (attendance.remarks === 'MM') {
          status = 'MM';
        } else if (attendance.remarks === 'AD') {
          status = 'AD';
        } else if (attendance.remarks === 'Other') {
          status = 'Other';
        } else if (attendance.is_present === 1 && attendance.is_late === 0) {
          status = 'Present';
        } else if (attendance.is_present === 1 && attendance.is_late === 1) {
          status = 'Late';
        } else if (attendance.is_late === 1) {
          status = 'Late';
        } else {
          status = 'Absent';
        }
      }

      return {
        ...student,
        status,
        session_id: attendance?.session_id || null,
        session_name: attendance?.session_name || null,
        remarks: attendance?.remarks || null,
        attendance_percentage: percentageMap.get(student.student_id) || null
      };
    });

    // Calculate summary
    const total = studentsWithAttendance.length;
    const present = studentsWithAttendance.filter(s => s.status === 'Present' || s.status === 'MM' || s.status === 'AD' || s.status === 'Other').length;
    const absent = studentsWithAttendance.filter(s => s.status === 'Absent').length;
    const late = studentsWithAttendance.filter(s => s.status === 'Late').length;
    const ps = studentsWithAttendance.filter(s => s.status === 'PS').length;
    const mm = studentsWithAttendance.filter(s => s.status === 'MM').length;
    const ad = studentsWithAttendance.filter(s => s.status === 'AD').length;
    const other = studentsWithAttendance.filter(s => s.status === 'Other').length;
    const notMarked = studentsWithAttendance.filter(s => s.status === 'Not Marked').length;

    res.status(200).json({
      success: true,
      data: {
        students: studentsWithAttendance,
        summary: { total, present, absent, late, ps, mm, ad, other, notMarked },
        filters: { date: selectedDate, session: session || 'all', venueId }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching venue attendance details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch venue attendance details',
      error: error.message 
    });
  }
};

// Get attendance records by date and session for editing
export const getAttendanceByDateAndSession = async (req, res) => {
  try {
    const { venueId, date, sessionId } = req.query;

    if (!venueId || !date || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'venueId, date, and sessionId are required'
      });
    }

    // Get all students in the venue with their attendance status
    const [students] = await db.query(`
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        a.attendance_id,
        a.is_present,
        a.is_late,
        a.is_ps,
        a.is_half_day,
        a.remarks,
        a.attendance_date,
        sess.session_name
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN attendance a ON s.student_id = a.student_id 
        AND a.attendance_date = ? 
        AND a.session_id = ?
      LEFT JOIN attendance_session sess ON a.session_id = sess.session_id
      WHERE g.venue_id = ?
        AND gs.status = 'Active'
        AND g.status = 'Active'
      GROUP BY s.student_id
      ORDER BY u.name
    `, [date, sessionId, venueId]);

    res.status(200).json({
      success: true,
      data: {
        students,
        date,
        sessionId,
        venueId
      }
    });

  } catch (error) {
    console.error('❌ Error fetching attendance by date and session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
};

// Update attendance by date and session
export const updateAttendanceByDateAndSession = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { venueId, date, sessionId, attendance } = req.body;
    const userId = req.user.user_id;

    if (!venueId || !date || !sessionId || !attendance || attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const actualFacultyId = await ensureFacultyId(userId);

    await connection.beginTransaction();

    let updatedCount = 0;
    let insertedCount = 0;

    for (const record of attendance) {
      const isPresent = (record.status === 'present' || record.status === 'mm' || record.status === 'ad' || record.status === 'other') ? 1 : 0;
      const isLate = record.status === 'late' ? 1 : 0;
      const isPs = record.status === 'ps' ? 1 : 0;
      
      let remarks = null;
      if (record.status === 'ps') {
        remarks = 'PS';
      } else if (record.status === 'mm') {
        remarks = 'MM';
      } else if (record.status === 'ad') {
        remarks = 'AD';
      } else if (record.status === 'other') {
        remarks = 'Other';
      } else if (record.remarks && String(record.remarks).trim()) {
        remarks = String(record.remarks).trim();
      }

      // Check if record exists
      const [existing] = await connection.query(`
        SELECT attendance_id FROM attendance
        WHERE student_id = ? AND attendance_date = ? AND session_id = ?
      `, [record.student_id, date, sessionId]);

      if (existing.length > 0) {
        // Update existing
        await connection.query(`
          UPDATE attendance
          SET is_present = ?, is_late = ?, is_ps = ?, remarks = ?, faculty_id = ?, updated_at = NOW()
          WHERE attendance_id = ?
        `, [isPresent, isLate, isPs, remarks, actualFacultyId, existing[0].attendance_id]);
        updatedCount++;
      } else {
        // Insert new
        await connection.query(`
          INSERT INTO attendance
          (student_id, faculty_id, venue_id, session_id, attendance_date, is_present, is_late, is_ps, remarks, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [record.student_id, actualFacultyId, venueId, sessionId, date, isPresent, isLate, isPs, remarks]);
        insertedCount++;
      }
    }

    // Recalculate half-day status
    try {
      await connection.query(`CALL sp_calculate_daily_attendance(?, ?)`, [date, venueId]);
    } catch (procError) {
      console.warn('⚠️  Stored procedure not available:', procError.message);
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: {
        updated: updatedCount,
        inserted: insertedCount,
        total: attendance.length
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update attendance',
      error: error.message
    });
  } finally {
    connection.release();
  }
}; 

// Export attendance data with filters
export const exportAttendanceData = async (req, res) => {
  try {
    const { venueIds, startDate, endDate, timeSlots, year, facultyId } = req.query;
    const userId = req.user.user_id;

    // Validate required parameters
    if (!venueIds || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Venue IDs, start date, and end date are required'
      });
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Parse venue IDs
    const venueIdArray = venueIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (venueIdArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid venue ID is required'
      });
    }

    // Build the query with filters  
    let query = `
      SELECT 
        DATE(asess.created_at) as date,
        SUBSTRING_INDEX(asess.session_name, '_', 1) as time_slot,
        u.ID as roll_number,
        u.name as student_name,
        u.email as email,
        CASE 
          WHEN a.is_late = 1 THEN 'Late'
          WHEN a.is_present = 1 THEN 'Present'
          ELSE 'Absent'
        END as status,
        a.remarks,
        v.venue_name,
        fu.name as faculty_name
      FROM attendance a
      INNER JOIN attendance_session asess ON a.session_id = asess.session_id
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users fu ON f.user_id = fu.user_id
      WHERE a.venue_id IN (${venueIdArray.map(() => '?').join(',')})
        AND DATE(asess.created_at) BETWEEN ? AND ?
    `;

    const queryParams = [...venueIdArray, startDate, endDate];

    // Add time slots filter if specified (multiple time slots)
    if (timeSlots) {
      const timeSlotArray = timeSlots.split(',').map(slot => slot.trim().toUpperCase()).filter(slot => slot);
      if (timeSlotArray.length > 0) {
        query += ` AND SUBSTRING_INDEX(asess.session_name, '_', 1) IN (${timeSlotArray.map(() => '?').join(',')})`;
        queryParams.push(...timeSlotArray);
      }
    }

    // Add year filter if specified
    if (year) {
      query += ` AND s.year = ?`;
      queryParams.push(parseInt(year));
    }

    // Add faculty filter if specified
    if (facultyId) {
      query += ` AND f.faculty_id = ?`;
      queryParams.push(parseInt(facultyId));
    }

    // Order by date and time slot
    query += ` ORDER BY DATE(asess.created_at) DESC, time_slot, u.ID`;

    const [attendanceRecords] = await db.query(query, queryParams);

    res.status(200).json({
      success: true,
      message: `Retrieved ${attendanceRecords.length} attendance records from ${venueIdArray.length} venue(s)`,
      data: attendanceRecords
    });

  } catch (error) {
    console.error('Error exporting attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance data',
      error: error.message
    });
  }
};

// Test endpoint
export const testAttendance = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Attendance controller is working!',
    timestamp: new Date().toISOString(),
    user: req.user
  });
};