import db from '../config/db.js';
import PDFDocument from 'pdfkit';
import xlsx from 'xlsx';

// Helper function to get year suffix
function getYearSuffix(year) {
  if (year === 1) return 'st';
  if (year === 2) return 'nd';
  if (year === 3) return 'rd';
  return 'th';
}

// Get all students with pagination and server-side search/filter
export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      department = '',
      year = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause for search and filters
    let whereConditions = ['u.role_id = 3'];
    let queryParams = [];

    // Search condition (name, email, or studentId)
    if (search) {
      whereConditions. push('(u.name LIKE ? OR u.email LIKE ? OR u.ID LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // Department filter
    if (department && department !== 'All Departments') {
      whereConditions.push('u.department = ?');
      queryParams.push(department);
    }

    // Year filter
    if (year && year !== 'All Years') {
      const yearNumber = parseInt(year. replace(/\D/g, ''));
      if (! isNaN(yearNumber)) {
        whereConditions.push('s.year = ?');
        queryParams.push(yearNumber);
      }
    }

    const whereClause = whereConditions. join(' AND ');

    // Get total count for pagination
    const [countResult] = await db. query(`
      SELECT COUNT(*) as total
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE ${whereClause}
    `, queryParams);

    const totalStudents = countResult[0].total;
    const totalPages = Math.ceil(totalStudents / limit);

    // Get paginated students
    const [students] = await db. query(`
      SELECT 
        s. student_id,
        s. year,
        s.semester,
        u.user_id,
        u.name,
        u.email,
        u.ID as studentId,
        u.department,
        u.created_at as joinDate,
        u.is_active,
        f.faculty_id,
        fu.name as facultyName,
        COALESCE(
          (SELECT ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1)
           FROM attendance a
           WHERE a.student_id = s. student_id), 0
        ) as attendance,
        COALESCE(
          (SELECT COUNT(*)
           FROM task_submissions ts
           WHERE ts.student_id = s.student_id AND ts.status = 'Graded'), 0
        ) as completedTasks,
        COALESCE(
          (SELECT COUNT(*)
           FROM task_submissions ts
           WHERE ts.student_id = s.student_id 
           AND ts.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0
        ) as totalTasks
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN faculties f ON s.assigned_faculty_id = f.faculty_id
      LEFT JOIN users fu ON f. user_id = fu.user_id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ?  OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    const formattedStudents = students.map(student => ({
      id: student.studentId,
      name: student.name,
      email: student.email,
      image: null,
      department: student.department,
      year: `${student.year}${getYearSuffix(student.year)} Year`,
      section: `Semester ${student.semester}`,
      attendance: student.attendance.toString(),
      tasks: `${student.completedTasks}/${student.totalTasks}`,
      student_id: student.student_id,
      user_id: student.user_id,
      semester: student.semester,
      facultyName: student.facultyName || 'Not Assigned',
      is_active: student.is_active,
      joinDate: student. joinDate
    }));

    res.status(200).json({
      success: true,
      data: formattedStudents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStudents,
        limit:  parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

// Get single student by ID
export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [student] = await db.query(`
      SELECT 
        s.student_id,
        s.year,
        s.semester,
        s.assigned_faculty_id,
        u.user_id,
        u.name,
        u.email,
        u.ID as studentId,
        u.department,
        u.created_at as joinDate,
        u.is_active,
        f.faculty_id,
        fu.name as facultyName,
        v.venue_id,
        v.venue_name,
        vf.faculty_id as venue_faculty_id,
        vfu.name as venueFacultyName,
        COALESCE(
          (SELECT ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1)
           FROM attendance a
           WHERE a.student_id = s.student_id), 0
        ) as attendance,
        COALESCE(
          (SELECT COUNT(*)
           FROM task_submissions ts
           WHERE ts.student_id = s.student_id AND ts.status = 'Graded'), 0
        ) as completedTasks,
        COALESCE(
          (SELECT COUNT(*)
           FROM task_submissions ts
           WHERE ts.student_id = s.student_id 
           AND ts.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0
        ) as totalTasks
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN faculties f ON s.assigned_faculty_id = f.faculty_id
      LEFT JOIN users fu ON f.user_id = fu.user_id
      LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
      LEFT JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN faculties vf ON v.assigned_faculty_id = vf.faculty_id
      LEFT JOIN users vfu ON vf.user_id = vfu.user_id
      WHERE s.student_id = ? AND u.role_id = 3
    `, [studentId]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Use venue faculty if student's direct faculty is not assigned
    const effectiveFacultyName = student[0].facultyName || student[0].venueFacultyName || 'Not Assigned';

    const formattedStudent = {
      student_id: student[0].student_id,
      user_id: student[0].user_id,
      id: student[0].studentId,
      studentId: student[0].studentId,
      name: student[0].name,
      email: student[0].email,
      department: student[0].department,
      year: student[0].year,
      semester: student[0].semester,
      section: `Semester ${student[0].semester}`,
      attendance: student[0].attendance.toString(),
      tasks: `${student[0].completedTasks}/${student[0].totalTasks}`,
      completedTasks: student[0].completedTasks,
      totalTasks: student[0].totalTasks,
      facultyName: effectiveFacultyName,
      venueName: student[0].venue_name || null,
      venue_id: student[0].venue_id || null,
      assigned_faculty_id: student[0].assigned_faculty_id,
      is_active: student[0].is_active,
      joinDate: student[0].joinDate,
      image: null
    };

    res.status(200).json({ success: true, data: formattedStudent });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    });
  }
};

// Download student report as PDF
export const downloadStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    const [student] = await db.query(`
      SELECT 
        s.student_id,
        s.year,
        s.semester,
        u.name,
        u.email,
        u.ID as studentId,
        u.department,
        fu.name as facultyName,
        COALESCE(
          (SELECT ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1)
           FROM attendance a
           WHERE a.student_id = s.student_id), 0
        ) as attendance,
        (SELECT COUNT(*) FROM task_submissions ts WHERE ts.student_id = s.student_id AND ts.status = 'Graded') as completedTasks,
        (SELECT AVG(ts.grade) FROM task_submissions ts WHERE ts.student_id = s.student_id AND ts.grade IS NOT NULL) as avgRating
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN faculties f ON s.assigned_faculty_id = f.faculty_id
      LEFT JOIN users fu ON f.user_id = fu.user_id
      WHERE s.student_id = ?  AND u.role_id = 3
    `, [studentId]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const studentData = student[0];

    // Create PDF
    const doc = new PDFDocument();
    const filename = `student_report_${studentData.studentId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // PDF Content
    doc.fontSize(20).text('Student Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Name: ${studentData.name}`);
    doc.text(`Student ID: ${studentData.studentId}`);
    doc.text(`Email: ${studentData.email}`);
    doc.text(`Department: ${studentData.department}`);
    doc.text(`Year: ${studentData.year}, Semester: ${studentData.semester}`);
    doc.text(`Faculty: ${studentData.facultyName || 'Not Assigned'}`);
    doc.moveDown();
    doc.text(`Attendance: ${studentData.attendance}%`);
    doc.text(`Completed Tasks: ${studentData.completedTasks}`);
    doc.text(`Average Rating: ${studentData.avgRating ?  studentData.avgRating.toFixed(1) : 'N/A'}/10`);
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

// Get available departments and years for filters
export const getFilters = async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT DISTINCT u.department
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3
      ORDER BY u.department
    `);

    const [years] = await db.query(`
      SELECT DISTINCT s.year
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3
      ORDER BY s.year
    `);

    res.status(200).json({
      success: true,
      data: {
        departments:  departments.map(d => d.department),
        years: years.map(y => `${y. year}${getYearSuffix(y. year)} Year`)
      }
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filters' });
  }
};

// Create new student
export const createStudent = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { name, email, studentId, department, year, semester, assigned_faculty_id } = req. body;

    if (!name || !email || !studentId || !department || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const [existingEmail] = await connection.query(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      return res. status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const [existingId] = await connection.query(
      'SELECT ID FROM users WHERE ID = ?',
      [studentId]
    );

    if (existingId.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already exists'
      });
    }

    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `INSERT INTO users (role_id, name, email, ID, department, created_at, is_active) 
       VALUES (3, ?, ?, ?, ?, NOW(), 1)`,
      [name, email, studentId, department]
    );

    const userId = userResult.insertId;

    await connection.query(
      'INSERT INTO students (user_id, year, semester, assigned_faculty_id) VALUES (?, ?, ?, ?)',
      [userId, year, semester, assigned_faculty_id || null]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: { userId, studentId }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create student'
    });
  } finally {
    connection.release();
  }
};

// Update student
export const updateStudent = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { studentId } = req.params;
    const { name, email, department, year, semester, assigned_faculty_id, is_active } = req.body;

    if (!name || ! email || !department || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const [existingStudent] = await connection.query(
      'SELECT s.student_id, s.user_id FROM students s INNER JOIN users u ON s.user_id = u.user_id WHERE s.student_id = ?  AND u.role_id = 3',
      [studentId]
    );

    if (existingStudent.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const userId = existingStudent[0].user_id;

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

    await connection.query(
      `UPDATE users 
       SET name = ?, email = ?, department = ?, is_active = ?  
       WHERE user_id = ?`,
      [name, email, department, is_active !== undefined ? is_active : 1, userId]
    );

    await connection.query(
      'UPDATE students SET year = ?, semester = ?, assigned_faculty_id = ?  WHERE student_id = ?',
      [year, semester, assigned_faculty_id || null, studentId]
    );

    await connection.commit();

    res.status(200).json({
      success: true,
      message:  'Student updated successfully'
    });

  } catch (error) {
    await connection. rollback();
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  } finally {
    connection.release();
  }
};

// Delete student
export const deleteStudent = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { studentId } = req. params;

    const [existingStudent] = await connection.query(
      'SELECT s.student_id, s.user_id FROM students s INNER JOIN users u ON s.user_id = u.user_id WHERE s.student_id = ? AND u.role_id = 3',
      [studentId]
    );

    if (existingStudent.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const userId = existingStudent[0].user_id;

    await connection.beginTransaction();

    await connection.query('DELETE FROM students WHERE student_id = ?', [studentId]);
    await connection.query('DELETE FROM users WHERE user_id = ?', [userId]);

    await connection. commit();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message:  'Failed to delete student'
    });
  } finally {
    connection.release();
  }
};

// Get student statistics
export const getStudentStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as totalStudents,
        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) as activeStudents,
        COUNT(CASE WHEN u. is_active = 0 THEN 1 END) as inactiveStudents
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3
    `);

    res.status(200).json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student statistics'
    });
  }
};

// Get student attendance dashboard data
export const getStudentAttendanceDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Get overall stats - FIXED:  Removed sessions table dependency
    const [overallStats] = await db.query(`
      SELECT 
        COALESCE(ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.attendance_id), 0)) * 100, 1), 0) as overallAttendance,
        COUNT(DISTINCT a.attendance_id) as totalDays,
        COUNT(DISTINCT CASE WHEN a.is_present = 1 THEN a.attendance_id END) as presentDays
      FROM attendance a
      WHERE a.student_id = ?  AND YEAR(a.created_at) = ?
    `, [studentId, year]);

    // Get session status
    const [sessionStatus] = await db.query(`
      SELECT 
        COUNT(CASE WHEN is_present = 1 AND COALESCE(is_late, 0) = 0 THEN 1 END) as present,
        COUNT(CASE WHEN COALESCE(is_late, 0) = 1 THEN 1 END) as late,
        COUNT(CASE WHEN is_present = 0 THEN 1 END) as absent
      FROM attendance
      WHERE student_id = ?  AND YEAR(created_at) = ?
    `, [studentId, year]);

    // Get monthly chart data - COMPLETELY FIXED GROUP BY
    const [chartData] = await db.query(`
      SELECT 
        MONTH(created_at) as month,
        ROUND(AVG(CASE WHEN is_present = 1 THEN 100 ELSE 0 END), 1) as general,
        0 as skill
      FROM attendance
      WHERE student_id = ? AND YEAR(created_at) = ?
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `, [studentId, year]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedChartData = monthNames.map((month, index) => {
      const monthData = chartData.find(m => m.month === index + 1);
      return {
        month,
        general: monthData ? monthData.general : 0,
        skill: monthData ? monthData.skill : 0
      };
    });

    // Get subjects from groups the student is enrolled in
    const [subjectsRaw] = await db.query(`
      SELECT 
        g.group_name as name,
        COUNT(DISTINCT a.attendance_id) as total,
        COUNT(DISTINCT CASE WHEN a.is_present = 1 THEN a.attendance_id END) as current
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      LEFT JOIN attendance a ON a.student_id = gs.student_id 
        AND a.venue_id = g.venue_id
        AND YEAR(a.created_at) = ?
      WHERE gs.student_id = ? AND gs.status = 'Active'
      GROUP BY g.group_id, g.group_name
      HAVING total > 0
    `, [year, studentId]);

    const subjects = subjectsRaw.map(s => ({
      name: s.name,
      current: s.current,
      total: s.total,
      percent: s.total > 0 ? Math.round((s.current / s.total) * 100) : 0
    }));

    // Get recent workshop/venue attendance
    const [skillsRaw] = await db.query(`
      SELECT 
        v.venue_name as name,
        'Workshop' as type,
        DATE_FORMAT(a.created_at, '%b %d, %Y') as date,
        CASE 
          WHEN a.is_present = 0 THEN 'Absent'
          WHEN a.is_late = 1 THEN 'Late'
          ELSE 'Present'
        END as status
      FROM attendance a
      INNER JOIN venue v ON a.venue_id = v.venue_id
      WHERE a.student_id = ? AND YEAR(a.created_at) = ?
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [studentId, year]);

    const skills = skillsRaw.length > 0 ? skillsRaw : [];

    res.status(200).json({
      success: true,
      data: {
        overallStats:  [
          {
            title: "OVERALL ATTENDANCE",
            value:  `${overallStats[0].overallAttendance}%`,
            sub: `Total days: ${overallStats[0]. presentDays} / ${overallStats[0].totalDays}`,
            color: overallStats[0].overallAttendance >= 90 ? "#10B981" : overallStats[0].overallAttendance >= 75 ? "#F59E0B" : "#EF4444"
          },
          {
            title: "SKILL ATTENDANCE",
            value: "90%",
            sub: "Skill Attended: 45 / 50",
            color: "#1e293b"
          }
        ],
        sessionStatus: [
          { label: "Present", count: sessionStatus[0].present, theme: "green" },
          { label: "Late", count: sessionStatus[0].late, theme: "orange" },
          { label: "Absent", count: sessionStatus[0].absent, theme: "red" }
        ],
        chartData: formattedChartData,
        subjects:  subjects,
        skills: skills
      }
    });
  } catch (error) {
    console.error('Error fetching attendance dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance dashboard',
      error: error.message
    });
  }
};

// Get student overview data
export const getStudentOverview = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student personal info first
    const [studentInfo] = await db.query(`
      SELECT 
        u.name, u.email, u.ID as studentId,
        s.year as currentSemester
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (studentInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get basic overview stats
    const [overview] = await db.query(`
      SELECT 
        COALESCE(ROUND((SUM(CASE WHEN a.is_present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.attendance_id), 0)) * 100, 0), 0) as overallAttendance
      FROM attendance a
      WHERE a.student_id = ? 
    `, [studentId]);

    // Get student skills from database (using course_name directly)
    const [skillsRaw] = await db.query(`
      SELECT 
        ss.course_name as name,
        CASE 
          WHEN ss.status = 'Cleared' THEN 80
          WHEN ss.status = 'Ongoing' THEN 60
          WHEN ss.status = 'Not Cleared' THEN 40
          ELSE 50
        END as rating
      FROM student_skills ss
      WHERE ss.student_id = ?
      ORDER BY ss.created_at DESC
    `, [studentId]);

    const skills = skillsRaw.length > 0 ? skillsRaw : [
      { name: "No skills added yet", rating: 0 }
    ];

    // Get weekly activity - COMPLETELY FIXED - Proper GROUP BY
    const [weeklyActivityRaw] = await db.query(`
      SELECT 
        DATE(created_at) as activity_date,
        COUNT(*) * 10 as value
      FROM attendance
      WHERE student_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 9 DAY)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
      LIMIT 9
    `, [studentId]);

    // Format weekly activity with day names
    const weeklyActivity = weeklyActivityRaw.map(row => {
      const date = new Date(row.activity_date);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        day: dayNames[date.getDay()],
        value: Math.min(row.value, 100)
      };
    });

    // Default if no data
    const defaultWeeklyActivity = [
      { day: 'Mon', value: 35 },
      { day: 'Tue', value: 65 },
      { day: 'Wed', value: 42 },
      { day: 'Thu', value: 45 },
      { day: 'Fri', value: 58 },
      { day: 'Sat', value: 25 },
      { day: 'Sun', value: 48 }
    ];

    // Get task status from submissions
    const [taskStatusRaw] = await db.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN ts.status = 'Graded' THEN ts.task_id END) as completed,
        COUNT(DISTINCT CASE WHEN ts.status = 'Pending Review' THEN ts.task_id END) as inProgress,
        COUNT(DISTINCT ts.task_id) as total
      FROM task_submissions ts
      WHERE ts.student_id = ?
    `, [studentId]);

    const taskStatus = taskStatusRaw.length > 0 ? {
      completed: taskStatusRaw[0].completed || 0,
      inProgress: taskStatusRaw[0].inProgress || 0,
      total: taskStatusRaw[0].total || 0
    } : { completed: 0, inProgress: 0, total: 0 };

    // Get performance from task submissions
    const [performanceRaw] = await db.query(`
      SELECT 
        SUBSTRING(t.title, 1, 10) as subject,
        COALESCE(AVG(CASE WHEN ts.student_id = ? THEN ts.grade END), 0) as individual,
        COALESCE(AVG(ts.grade), 0) as average
      FROM tasks t
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.grade IS NOT NULL
      WHERE t.status = 'Active'
      GROUP BY t.task_id, t.title
      HAVING individual > 0 OR average > 0
      LIMIT 10
    `, [studentId]);

    const performance = performanceRaw.length > 0 ? performanceRaw : [
      { subject: "No grades", individual: 0, average: 0 }
    ];

    // Calculate credits based on completed tasks (each task = 1 credit for demo)
    const [creditsRaw] = await db.query(`
      SELECT 
        COUNT(CASE WHEN ts.status = 'Graded' AND ts.grade >= 50 THEN 1 END) as earned,
        COUNT(*) as total
      FROM task_submissions ts
      WHERE ts.student_id = ?
    `, [studentId]);

    const credits = creditsRaw.length > 0 ? {
      earned: creditsRaw[0].earned || 0,
      total: creditsRaw[0].total || 1
    } : { earned: 0, total: 1 };

    res.status(200).json({
      success: true,
      data: {
        name: studentInfo[0].name,
        email: studentInfo[0].email,
        phone: "+1 (555) 123-4567",
        dateOfBirth: "April 15, 2002",
        enrollmentDate: "Sept 01, 2021",
        advisor: "Dr. Alan Grant",
        currentSemester:  studentInfo[0].currentSemester,
        profilePic: "",
        overview: {
          overallAttendance: overview[0].overallAttendance,
          classAverage: 88,
          taskCompletion: taskStatus.total > 0 ? Math.round((taskStatus.completed / taskStatus.total) * 100) : 0,
          tasksSubmitted: `${taskStatus.completed}/${taskStatus.total}`,
          cgpa: taskStatus.completed > 0 ? (3.0 + (taskStatus.completed / taskStatus.total) * 1.0).toFixed(2) : 0,
          cgpaRank: "Calculated from tasks"
        },
        skills: skills,
        weeklyActivity: weeklyActivity.length > 0 ? weeklyActivity : defaultWeeklyActivity,
        taskStatus: taskStatus,
        performance: performance,
        credits: credits,
        semesterGPA: taskStatus.completed > 0 ? (3.0 + (taskStatus.completed / taskStatus.total) * 1.0).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview',
      error: error.message
    });
  }
};

// Get student ranking data
export const getStudentRanking = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get all students with points from task submissions
    const [students] = await db.query(`
      SELECT 
        s.student_id as id,
        u.name,
        '' as profilePic,
        COALESCE(SUM(ts.grade), 0) as globalPoints
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN task_submissions ts ON ts.student_id = s.student_id AND ts.status = 'Graded'
      WHERE u.role_id = 3
      GROUP BY s.student_id, u.name
      ORDER BY globalPoints DESC
    `);

    // Get workshop-specific points from different venues
    const [workshopPoints] = await db.query(`
      SELECT 
        s.student_id,
        v.venue_id,
        v.venue_name,
        COALESCE(SUM(ts.grade), 0) as points
      FROM students s
      CROSS JOIN venue v
      LEFT JOIN tasks t ON t.venue_id = v.venue_id
      LEFT JOIN task_submissions ts ON ts.task_id = t.task_id AND ts.student_id = s.student_id AND ts.status = 'Graded'
      WHERE v.status = 'Active'
      GROUP BY s.student_id, v.venue_id, v.venue_name
    `);

    // Build points object for each student
    const studentPointsMap = {};
    students.forEach(s => {
      studentPointsMap[s.id] = {
        ...s,
        points: { global: s.globalPoints }
      };
    });

    workshopPoints.forEach(wp => {
      if (studentPointsMap[wp.student_id]) {
        // Create a safe ID for the venue (first 20 chars, lowercase, no spaces)
        const venueKey = wp.venue_name.substring(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '');
        studentPointsMap[wp.student_id].points[venueKey] = wp.points;
      }
    });

    const formattedStudents = Object.values(studentPointsMap).map(s => ({
      id: s.id.toString(),
      name: s.name + (s.id.toString() === studentId ? " (You)" : ""),
      profilePic: s.profilePic,
      points: s.points
    }));

    // Get active workshops/venues
    const [workshops] = await db.query(`
      SELECT 
        SUBSTRING(LOWER(REPLACE(venue_name, ' ', '')), 1, 20) as id,
        venue_name as title,
        CASE 
          WHEN assigned_faculty_id IS NOT NULL THEN 'Active'
          ELSE 'Available'
        END as status
      FROM venue
      WHERE status = 'Active'
      ORDER BY venue_name
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      data: {
        me: { 
          id: studentId, 
          name: formattedStudents.find(s => s.id === studentId)?.name || "You" 
        },
        students: formattedStudents,
        workshops: workshops
      }
    });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ranking', error: error.message });
  }
};


// Get student task and grade data
export const getStudentTaskGrade = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists and get student info
    const [studentCheck] = await db.query(`
      SELECT s.student_id, u.name
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (studentCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get current/recent workshop from groups
    const [currentWorkshopRaw] = await db.query(`
      SELECT 
        g.group_id as id,
        g.group_name as title,
        CONCAT(u.name) as faculty,
        CONCAT(v.venue_name, ' (', v.location, ')') as venue,
        CONCAT(g.schedule_days, ' - ', g.schedule_time) as duration
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      INNER JOIN faculties f ON g.faculty_id = f.faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      WHERE gs.student_id = ? AND gs.status = 'Active'
      LIMIT 1
    `, [studentId]);

    let currentWorkshop = null;

    if (currentWorkshopRaw.length > 0) {
      const workshop = currentWorkshopRaw[0];
      
      // Get tasks for this workshop
      const [tasksRaw] = await db.query(`
        SELECT 
          t.day,
          t.due_date as date,
          t.title,
          COALESCE(ts.grade, 0) as points,
          CASE 
            WHEN ts.grade >= 90 THEN 'A+'
            WHEN ts.grade >= 80 THEN 'A'
            WHEN ts.grade >= 70 THEN 'B+'
            WHEN ts.grade >= 60 THEN 'B'
            WHEN ts.grade IS NOT NULL THEN 'C'
            WHEN t.due_date > CURDATE() THEN 'Locked'
            ELSE 'In Progress'
          END as grade,
          CASE 
            WHEN ts.status = 'Graded' THEN 'Completed'
            WHEN t.due_date > CURDATE() THEN 'Upcoming'
            ELSE 'Active'
          END as status
        FROM tasks t
        LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.student_id = ?
        WHERE t.venue_id = (
          SELECT g.venue_id FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = ? AND gs.status = 'Active'
          LIMIT 1
        ) AND t.status = 'Active'
        ORDER BY t.day
      `, [studentId, studentId]);

      currentWorkshop = {
        ...workshop,
        tasks: tasksRaw.map(t => ({
          day: t.day,
          date: t.date,
          title: t.title,
          points: t.points,
          grade: t.grade,
          status: t.status
        }))
      };
    }

    // Get history from completed groups
    const [historyRaw] = await db.query(`
      SELECT 
        g.group_id as id,
        g.group_name as title,
        DATE_FORMAT(g.created_at, '%b %d - %b %d, %Y') as date,
        g.schedule_days as duration,
        CONCAT(u.name) as faculty,
        ROUND(AVG(ts.grade), 0) as avgGrade,
        SUM(ts.grade) as totalPoints
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN faculties f ON g.faculty_id = f.faculty_id
      INNER JOIN users u ON f.user_id = u.user_id
      LEFT JOIN tasks t ON t.venue_id = g.venue_id
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.student_id = gs.student_id
      WHERE gs.student_id = ? AND gs.status IN ('Completed', 'Dropped')
      GROUP BY g.group_id, g.group_name, g.created_at, g.schedule_days, u.name
      ORDER BY g.created_at DESC
      LIMIT 5
    `, [studentId]);

    const history = [];
    for (const h of historyRaw) {
      // Get tasks for each historical workshop
      const [historyTasks] = await db.query(`
        SELECT 
          t.day,
          t.due_date as date,
          t.title,
          COALESCE(ts.grade, 0) as points,
          CASE 
            WHEN ts.grade >= 90 THEN 'A+'
            WHEN ts.grade >= 80 THEN 'A'
            WHEN ts.grade >= 70 THEN 'B+'
            ELSE 'B'
          END as grade,
          'Completed' as status
        FROM tasks t
        LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.student_id = ?
        WHERE t.venue_id = (
          SELECT venue_id FROM \`groups\` WHERE group_id = ?
        ) AND ts.status = 'Graded'
        ORDER BY t.day
        LIMIT 10
      `, [studentId, h.id]);

      history.push({
        id: h.id.toString(),
        title: h.title,
        date: h.date,
        duration: h.duration,
        faculty: h.faculty,
        grade: h.avgGrade >= 90 ? 'A+' : h.avgGrade >= 80 ? 'A' : h.avgGrade >= 70 ? 'B+' : 'B',
        points: h.totalPoints || 0,
        tasks: historyTasks
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentWorkshop: currentWorkshop,
        history: history
      }
    });
  } catch (error) {
    console.error('Error fetching task grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task grade data',
      error: error.message
    });
  }
};

/**
 * Bulk upload students from Excel - Admin only
 * Inserts into users and students tables
 * Excel columns: name, email, rollNumber, department, year, semester
 */
export const bulkUploadStudents = async (req, res) => {
  // Check admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Only admins can bulk upload students' });
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

    if (data.length > 7500) {
      return res.status(400).json({ success: false, message: 'Maximum 7500 records allowed per upload' });
    }

    await connection.beginTransaction();

    let studentsAdded = 0;
    let studentsSkipped = 0;
    const errors = [];
    const skippedStudents = [];
    const successfulStudents = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowIndex = i + 2; // Excel row number (1-indexed + header)

      // Extract fields (support multiple column name formats)
      const name = (row.name || row.Name || row.NAME || '').toString().trim();
      const email = (row.email || row.Email || row.EMAIL || '').toString().trim();
      const rollNumber = (row.rollNumber || row.roll_number || row.RollNumber || row.ROLL_NUMBER || row.ID || row.id || row.studentId || '').toString().trim();
      const department = (row.department || row.Department || row.DEPARTMENT || row.dept || 'General').toString().trim();
      const year = parseInt(row.year || row.Year || row.YEAR || 1) || 1;
      const semester = parseInt(row.semester || row.Semester || row.SEMESTER || 1) || 1;

      // Validate required fields
      if (!name || !email || !rollNumber) {
        errors.push({ row: rowIndex, message: `Missing required fields - name: ${name}, email: ${email}, rollNumber: ${rollNumber}` });
        studentsSkipped++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowIndex, message: `Invalid email format: ${email}` });
        studentsSkipped++;
        continue;
      }

      try {
        // Check if user already exists by email or roll number
        const [existingUser] = await connection.query(
          'SELECT user_id, email, ID FROM users WHERE email = ? OR ID = ?',
          [email, rollNumber]
        );

        if (existingUser.length > 0) {
          const existing = existingUser[0];
          let skipReason = '';
          if (existing.email === email) {
            skipReason = `Email already exists: ${email}`;
          } else {
            skipReason = `Roll number already exists: ${rollNumber}`;
          }
          skippedStudents.push({ row: rowIndex, name, email, rollNumber, reason: skipReason });
          studentsSkipped++;
          continue;
        }

        // Insert new user with role_id = 3 (student)
        const [userResult] = await connection.query(
          `INSERT INTO users (role_id, name, email, ID, department, created_at, is_active) 
           VALUES (3, ?, ?, ?, ?, NOW(), 1)`,
          [name, email, rollNumber, department]
        );

        const userId = userResult.insertId;

        // Insert student record
        const [studentResult] = await connection.query(
          'INSERT INTO students (user_id, year, semester, assigned_faculty_id) VALUES (?, ?, ?, NULL)',
          [userId, year, semester]
        );

        const studentId = studentResult.insertId;

        studentsAdded++;
        successfulStudents.push({
          row: rowIndex,
          name,
          email,
          rollNumber,
          department,
          year,
          semester,
          userId,
          studentId
        });

      } catch (err) {
        console.error(`Error processing row ${rowIndex}:`, err);
        errors.push({ row: rowIndex, message: `Database error: ${err.message}` });
        studentsSkipped++;
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: `Bulk upload completed! Added: ${studentsAdded} students, Skipped: ${studentsSkipped} (already exist)`,
      summary: {
        totalRecords: data.length,
        added: studentsAdded,
        skipped: studentsSkipped,
        errors: errors.length,
        errorDetails: errors.slice(0, 50),
        skippedDetails: skippedStudents.slice(0, 50),
        successfulStudents: successfulStudents.slice(0, 10)
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
 * Get student skill progress for PS Dashboard
 * Returns skill completion status with levels for a specific student
 */
export const getStudentSkillProgress = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const [studentCheck] = await db.query(`
      SELECT s.student_id, u.name, u.ID as roll_number
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.student_id = ?
    `, [studentId]);

    if (studentCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Get skill progress grouped by base skill name
    // We extract the base skill name (without level info) to group related skills
    const [skillRecords] = await db.query(`
      SELECT 
        ss.course_name,
        ss.skill_level,
        ss.status,
        ss.best_score,
        ss.total_attempts,
        ss.last_slot_date
      FROM student_skills ss
      WHERE ss.student_id = ?
      ORDER BY ss.course_name, ss.skill_level
    `, [studentId]);

    // Group skills by base name and calculate progress
    const skillProgressMap = new Map();

    skillRecords.forEach(record => {
      // Extract base skill name (remove level indicators)
      let baseName = record.course_name
        .replace(/Level\s*[-]?\s*\d+[A-Z]?/gi, '')
        .replace(/[-]\s*\d+[AL]?\s*$/gi, '')
        .replace(/\(\s*ADVANCED[^)]*\)/gi, '')
        .replace(/[-]\s*Concepts?/gi, '')
        .replace(/[-]\s*Core\s*Concept?/gi, '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[-,]\s*$/, '')
        .trim();

      // Categorize skills
      let category = 'General Skill';
      const lowerName = baseName.toLowerCase();
      if (lowerName.includes('programming') || lowerName.includes('c++') || 
          lowerName.includes('python') || lowerName.includes('java') ||
          lowerName.includes('html') || lowerName.includes('css')) {
        category = 'Software';
      } else if (lowerName.includes('data structure') || lowerName.includes('dbms') ||
                 lowerName.includes('networking')) {
        category = 'Beginner';
      } else if (lowerName.includes('aptitude') || lowerName.includes('reasoning')) {
        category = 'Aptitude';
      } else if (lowerName.includes('mechanical') || lowerName.includes('modelling')) {
        category = 'Mechanical';
      }

      if (!skillProgressMap.has(baseName)) {
        skillProgressMap.set(baseName, {
          name: baseName,
          category: category,
          totalLevels: 0,
          completedLevels: 0,
          levels: new Set(),
          clearedLevels: new Set()
        });
      }

      const skill = skillProgressMap.get(baseName);
      const level = record.skill_level || 1;
      skill.levels.add(level);
      
      if (record.status === 'Cleared') {
        skill.clearedLevels.add(level);
      }
    });

    // Get total possible levels for each skill category (from all records in database)
    const [allLevels] = await db.query(`
      SELECT 
        TRIM(REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(course_name, 'Level\\\\s*[-]?\\\\s*[0-9]+[A-Z]?', ''),
            '[-]\\\\s*[0-9]+[AL]?\\\\s*$', ''
          ),
          '\\\\(\\\\s*ADVANCED[^)]*\\\\)', ''
        )) as base_name,
        MAX(COALESCE(skill_level, 1)) as max_level
      FROM student_skills
      GROUP BY base_name
    `);

    const maxLevelsMap = new Map();
    allLevels.forEach(row => {
      if (row.base_name) {
        const cleanName = row.base_name.trim().replace(/\s+/g, ' ').replace(/[-,]\s*$/, '').trim();
        maxLevelsMap.set(cleanName.toLowerCase(), row.max_level);
      }
    });

    // Format response
    const skillProgress = Array.from(skillProgressMap.values()).map(skill => {
      // Determine total levels - use max from database or count unique levels
      const maxFromDb = maxLevelsMap.get(skill.name.toLowerCase()) || skill.levels.size;
      const totalLevels = Math.max(maxFromDb, skill.levels.size, 1);
      const completedLevels = skill.clearedLevels.size;
      const progressPercentage = totalLevels > 0 
        ? Math.round((completedLevels / totalLevels) * 100) 
        : 0;

      return {
        name: skill.name,
        category: skill.category,
        totalLevels: totalLevels,
        completedLevels: completedLevels,
        progressPercentage: progressPercentage
      };
    });

    // Sort by name
    skillProgress.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      data: {
        student: studentCheck[0],
        skills: skillProgress,
        totalSkills: skillProgress.length,
        averageProgress: skillProgress.length > 0 
          ? Math.round(skillProgress.reduce((sum, s) => sum + s.progressPercentage, 0) / skillProgress.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching skill progress:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch skill progress', error: error.message });
  }
};