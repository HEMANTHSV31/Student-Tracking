import db from '../config/db.js';

async function resolveStudentIdFromToken(req) {
  const userId = req.user?.user_id || req.user?.userId || req.user?.id;
  if (!userId) return null;

  const [rows] = await db.query('SELECT student_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  return rows.length ? rows[0].student_id : null;
}

async function resolveStudentVenueIds(studentId) {
  // Get ONLY the student's current active venue (primary assignment)
  // This matches the logic in getStudentTasks which shows tasks from current venue only
  const [rows] = await db.query(
    `
    SELECT g.venue_id
    FROM group_students gs
    INNER JOIN \`groups\` g ON gs.group_id = g.group_id
    WHERE gs.student_id = ? AND gs.status = 'Active' AND g.status = 'Active'
    LIMIT 1
    `,
    [studentId]
  );
  return rows.map(r => r.venue_id).filter(v => v != null);
}

function computeLetterGrade(percentage) {
  const p = Number(percentage);
  if (Number.isNaN(p)) return 'N/A';
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  return 'F';
}

export const getStudentDashboardStats = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    const venueIds = await resolveStudentVenueIds(studentId);
    const userId = req.user?.user_id || req.user?.userId || req.user?.id;
    const currentYear = new Date().getFullYear();
    const SEMESTER_START_DATE = '2025-12-15';
    
    // console.log('[DASHBOARD STATS] Student ID:', studentId);
    // console.log('[DASHBOARD STATS] Venue IDs:', venueIds);

    // Attendance - Match attendance screen calculation exactly
    // Get daily breakdown to calculate present/late/absent days (4 hours = 1 complete day)
    const [dailyBreakdown] = await db.query(`
      SELECT 
        SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10) as attendance_date,
        COUNT(*) as total_hours,
        SUM(CASE WHEN a.is_present = 1 AND a.is_late = 0 THEN 1 ELSE 0 END) as present_hours,
        SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_hours,
        SUM(CASE WHEN a.is_present = 0 THEN 1 ELSE 0 END) as absent_hours
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

    // Count days by status: only days with 4/4 hours present count as Present
    let presentDays = 0, absentDays = 0;
    dailyBreakdown.forEach(day => {
      const totalHours = parseInt(day.total_hours);
      const presentHours = parseInt(day.present_hours);
      
      if (totalHours === 4 && presentHours === 4) {
        presentDays++; // All 4 hours present = Present Day
      } else {
        absentDays++; // Less than 4 hours = Absent Day
      }
    });

    const totalDays = dailyBreakdown.length;
    const overallAttendance = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    // For trend: get last 30 days vs previous 30 days breakdown
    const [trendBreakdown] = await db.query(`
      SELECT 
        SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10) as attendance_date,
        COUNT(*) as total_hours,
        SUM(CASE WHEN a.is_present = 1 AND a.is_late = 0 THEN 1 ELSE 0 END) as present_hours,
        DATE(a.created_at) as record_date
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.student_id
      INNER JOIN attendance_session ats ON a.session_id = ats.session_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id AND gs.student_id = s.student_id
      WHERE s.user_id = ?
        AND gs.status = 'Active'
        AND a.created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
      GROUP BY SUBSTRING(ats.session_name, LOCATE('_20', ats.session_name) + 10, 10), DATE(a.created_at)
    `, [userId]);

    // Split into last 30 and previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    
    let last30PresentDays = 0, last30TotalDays = 0;
    let prev30PresentDays = 0, prev30TotalDays = 0;
    
    const dayGroups = {};
    trendBreakdown.forEach(day => {
      const dateKey = day.attendance_date;
      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = { totalHours: 0, presentHours: 0, recordDate: day.record_date };
      }
      dayGroups[dateKey].totalHours += parseInt(day.total_hours);
      dayGroups[dateKey].presentHours += parseInt(day.present_hours);
    });
    
    Object.values(dayGroups).forEach(dayData => {
      const recordDate = new Date(dayData.recordDate);
      const isComplete = dayData.totalHours === 4 && dayData.presentHours === 4;
      
      if (recordDate >= thirtyDaysAgo) {
        last30TotalDays++;
        if (isComplete) last30PresentDays++;
      } else if (recordDate >= sixtyDaysAgo) {
        prev30TotalDays++;
        if (isComplete) prev30PresentDays++;
      }
    });
    
    const last30Attendance = last30TotalDays > 0 ? Math.round((last30PresentDays / last30TotalDays) * 100) : 0;
    const prev30Attendance = prev30TotalDays > 0 ? Math.round((prev30PresentDays / prev30TotalDays) * 100) : 0;
    const attendanceTrend = last30Attendance - prev30Attendance;
    
    // console.log('[DASHBOARD STATS] Attendance - Present Days:', presentDays, 'Total Days:', totalDays);
    // console.log('[DASHBOARD STATS] Overall Attendance:', overallAttendance);
    // console.log('[DASHBOARD STATS] Attendance Trend:', attendanceTrend);

    // Tasks: Use the filtered tasks logic from tasks.controller
    // This respects skill progression, locked skills, and cleared skills
    let pendingTasks = 0;
    let tasksDueTomorrow = 0;
    let courseProgress = 0;
    let completedTasks = 0;
    let totalTasks = 0;

    if (venueIds.length) {
      // Import task filtering logic - get actual visible tasks for student
      const { getStudentTasks } = await import('./tasks.controller.js');
      
      // console.log('[DASHBOARD STATS] Calling getStudentTasks with user:', req.user);
      
      // Create fake request object to reuse getStudentTasks logic
      const fakeReq = {
        user: req.user,
        query: { course_type: 'all' }  // Get all course types
      };
      
      let visibleTasks = [];
      const fakeRes = {
        status: (code) => ({
          json: (data) => {
            // console.log('[DASHBOARD STATS] getStudentTasks returned:', { 
            //   success: data.success, 
            //   dataKeys: data.data ? Object.keys(data.data) : [],
            //   statusCode: code 
            // });
            
            if (data.success && data.data) {
              // Extract tasks from groupedTasks structure
              if (data.data.groupedTasks) {
                const groupedTasks = data.data.groupedTasks;
                // console.log('[DASHBOARD STATS] Grouped tasks keys:', Object.keys(groupedTasks));
                
                // Flatten all tasks from all groups
                visibleTasks = Object.values(groupedTasks).flatMap(group => group.tasks || []);
                // console.log('[DASHBOARD STATS] Extracted tasks from groups:', visibleTasks.length);
              }
            }
            return data;
          }
        })
      };
      
      await getStudentTasks(fakeReq, fakeRes);
      
      // Ensure visibleTasks is an array
      if (!Array.isArray(visibleTasks)) {
        console.warn('[DASHBOARD STATS] getStudentTasks did not return array, got:', typeof visibleTasks);
        visibleTasks = [];
      }
      
      // console.log('[DASHBOARD STATS] Visible tasks after filtering:', visibleTasks.length);
      if (visibleTasks.length > 0) {
        // console.log('[DASHBOARD STATS] Sample task:', {
        //   title: visibleTasks[0].title,
        //   status: visibleTasks[0].status,
        //   submissionStatus: visibleTasks[0].submissionStatus,
        //   grade: visibleTasks[0].grade
        // });
      }
      
      // Now count based on visible tasks only
      totalTasks = visibleTasks.length;
      
      visibleTasks.forEach(task => {
        // Completed: task status is 'completed' (graded with grade >= 50)
        if (task.status === 'completed') {
          completedTasks++;
        }
        
        // Pending: not completed and not revision
        if (task.status !== 'completed' && task.status !== 'revision') {
          pendingTasks++;
        }
        
        // Due tomorrow: has due date between today and tomorrow, not yet completed
        if (task.dueDate && task.status !== 'completed') {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 2);
          
          if (dueDate >= today && dueDate < tomorrow) {
            tasksDueTomorrow++;
          }
        }
      });
      
      courseProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // console.log('[DASHBOARD STATS] Total visible tasks:', totalTasks);
      // console.log('[DASHBOARD STATS] Completed tasks:', completedTasks);
      // console.log('[DASHBOARD STATS] Pending tasks:', pendingTasks);
      // console.log('[DASHBOARD STATS] Course Progress:', courseProgress);
    }

    // Tasks Completed: use graded tasks count as "completed" metric
    // (skill_completion table may not exist, so we use task completion instead)
    const tasksCompleted = completedTasks;

    const responseData = {
      overallAttendance,
      pendingTasks,
      tasksCompleted,
      totalTasks,
      courseProgress,
      attendanceTrend,
      tasksDueTomorrow,
    };
    
    // console.log('[DASHBOARD STATS] Final response data:', responseData);

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error in getStudentDashboardStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

export const getStudentUpcomingSchedule = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    const [rows] = await db.query(
      `
      SELECT
        g.group_id,
        g.group_name,
        g.schedule_time,
        g.schedule_days,
        v.location,
        v.venue_name,
        u_fac.name as faculty_name
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN faculties f ON g.faculty_id = f.faculty_id
      LEFT JOIN users u_fac ON f.user_id = u_fac.user_id
      WHERE gs.student_id = ?
        AND gs.status = 'Active'
        AND g.status = 'Active'
      ORDER BY g.group_name ASC
      LIMIT 10
      `,
      [studentId]
    );

    // Keep response shape compatible with StudentDashboard mapping
    const data = rows.map(r => ({
      class_id: r.group_id,
      subject_name: r.group_name,
      class_type: 'Lecture',
      start_time: null,
      end_time: null,
      location: r.location || r.venue_name || 'TBD',
      faculty_name: r.faculty_name || 'TBA',
      schedule_time: r.schedule_time,
      schedule_days: r.schedule_days,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getStudentUpcomingSchedule:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch upcoming schedule', error: error.message });
  }
};

export const getStudentRecentAssignments = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    const venueIds = await resolveStudentVenueIds(studentId);
    if (!venueIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const placeholders = venueIds.map(() => '?').join(',');

    const [rows] = await db.query(
      `
      SELECT
        t.task_id,
        t.title,
        t.course_type,
        t.due_date,
        t.max_score,
        ts.submitted_at,
        ts.status as submission_status
      FROM tasks t
      LEFT JOIN task_submissions ts
        ON ts.task_id = t.task_id AND ts.student_id = ?
      WHERE t.status = 'Active'
        AND t.venue_id IN (${placeholders})
      ORDER BY (t.due_date IS NULL) ASC, t.due_date ASC, t.created_at DESC
      LIMIT 10
      `,
      [studentId, ...venueIds]
    );

    const data = rows.map(r => ({
      assignment_id: r.task_id,
      title: r.title,
      subject_name: r.course_type || 'Task',
      due_date: r.due_date,
      total_required: 1,
      submission_count: r.submitted_at ? 1 : 0,
      is_submitted: !!r.submitted_at,
      submission_status: r.submission_status || null,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getStudentRecentAssignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recent assignments', error: error.message });
  }
};

export const getStudentRecentGrades = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    const [rows] = await db.query(
      `
      SELECT
        ts.submission_id,
        ts.grade,
        t.max_score,
        t.title,
        t.course_type,
        ts.graded_at
      FROM task_submissions ts
      INNER JOIN tasks t ON ts.task_id = t.task_id
      WHERE ts.student_id = ?
        AND ts.status = 'Graded'
        AND ts.grade IS NOT NULL
      ORDER BY ts.graded_at DESC, ts.submitted_at DESC
      LIMIT 5
      `,
      [studentId]
    );

    const data = rows.map(r => {
      const percentage = Number(r.grade);
      return {
        grade_id: r.submission_id,
        subject_name: r.course_type || 'Task',
        subject_code: (r.course_type || 'TASK').toString().toUpperCase().slice(0, 8),
        grade_letter: computeLetterGrade(percentage),
        score_obtained: Math.round(percentage),
        total_score: 100,
        percentage,
        title: r.title,
        graded_at: r.graded_at,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in getStudentRecentGrades:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recent grades', error: error.message });
  }
};

export const getStudentSubjectWiseAttendance = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    // Return empty array since students table doesn't have course_type column
    // and we removed the course breakdown from the UI
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    console.error('Error in getStudentSubjectWiseAttendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subject-wise attendance', error: error.message });
  }
};

/**
 * Get task completion statistics for the donut chart
 * Returns: { completed: number, pending: number, overdue: number }
 * Uses filtered tasks that respect skill progression
 */
export const getStudentTaskCompletionStats = async (req, res) => {
  try {
    const studentId = await resolveStudentIdFromToken(req);
    if (!studentId) {
      return res.status(404).json({ success: false, message: 'Student not found for this user' });
    }

    const venueIds = await resolveStudentVenueIds(studentId);

    if (!venueIds.length) {
      return res.status(200).json({
        success: true,
        data: { completed: 0, pending: 0, overdue: 0 },
      });
    }

    // Use filtered tasks logic from tasks.controller (respects skill progression)
    const { getStudentTasks } = await import('./tasks.controller.js');
    
    const fakeReq = {
      user: req.user,
      query: { course_type: 'all' }
    };
    
    let visibleTasks = [];
    const fakeRes = {
      status: (code) => ({
        json: (data) => {
          if (data.success && Array.isArray(data.data)) {
            visibleTasks = data.data;
          }
          return data;
        }
      })
    };
    
    await getStudentTasks(fakeReq, fakeRes);
    
    // Ensure visibleTasks is an array
    if (!Array.isArray(visibleTasks)) {
      console.warn('getStudentTasks did not return array in task completion stats, got:', typeof visibleTasks);
      visibleTasks = [];
    }
    
    let completed = 0;
    let pending = 0;
    let overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    visibleTasks.forEach(task => {
      // Completed: graded tasks
      if (task.submission_status === 'Graded') {
        completed++;
      } else {
        // Not graded yet
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < today) {
            overdue++;
          } else {
            pending++;
          }
        } else {
          // No due date = pending
          pending++;
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: { completed, pending, overdue },
    });
  } catch (error) {
    console.error('Error in getStudentTaskCompletionStats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch task stats', error: error.message });
  }
};
