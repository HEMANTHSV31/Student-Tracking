import db from '../config/db.js';

// Helper function to get ID from user_id
async function getFacultyIdFromUserId(userId) {
  try {
    // console.log('Fetching ID for user_id:', userId);
    
    const [facultyResult] = await db.query(
      `SELECT ID FROM users WHERE user_id = ?`,
      [userId]
    );
    
    if (facultyResult.length > 0 && facultyResult[0].ID) {
      // console.log('Found ID:', facultyResult[0].ID);
      return facultyResult[0].ID;
    }
    
    // console.log('No ID found for user_id:', userId);
    return null;
    
  } catch (error) {
    console.error('Error fetching ID:', error);
    return null;
  }
}

// Get complete dashboard data
export const getDashboardData = async (req, res) => {
  try {
    // console.log('getDashboardData called with user:', req.user);
    
    if (!req.user || !req.user.user_id) {
      console.error('User not authenticated or user_id missing');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get ID from user_id
    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      console.error('Faculty ID not found for user:', req.user.user_id);
      return res.status(400).json({ 
        message: 'Faculty profile not found. Please contact administrator.',
        user_id: req.user.user_id
      });
    }

    // console.log('Using faculty ID:', facultyId, 'for user:', req.user.user_id);

    // Get stats - FIXED: Added backticks around `groups`
    const [groupsResult] = await db.query(
      `SELECT COUNT(*) as total_groups FROM \`groups\` WHERE ID = ?`,
      [facultyId]
    );

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const [sessionsResult] = await db.query(
      `SELECT COUNT(*) as todays_sessions FROM \`groups\` WHERE ID = ? AND schedule_days LIKE ?`,
      [facultyId, `%${today}%`]
    );

    const [attendancePendingResult] = await db.query(
      `SELECT COUNT(DISTINCT g.group_id) as pending_sessions
       FROM \`groups\` g
       WHERE g.ID = ?
       AND g.group_id NOT IN (
         SELECT DISTINCT group_id FROM attendance WHERE DATE(created_at) = CURDATE()
       )`,
      [facultyId]
    );

    const [tasksResult] = await db.query(
      `SELECT COUNT(*) as pending_reviews
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.status = 'Pending Review'`,
      [facultyId]
    );

    const [deptResult] = await db.query(
      `SELECT COUNT(DISTINCT department) as dept_count FROM \`groups\` WHERE ID = ?`,
      [facultyId]
    );

    const stats = [
      {
        id: 1,
        label: 'My Classes',
        value: groupsResult[0]?.total_groups || 0,
        sub: `Across ${deptResult[0]?.dept_count || 0} departments`,
        icon: 'book-open'
      },
      {
        id: 2,
        label: "Today's Sessions",
        value: sessionsResult[0]?.todays_sessions || 0,
        sub: 'Check schedule for timing',
        icon: 'calendar'
      },
      {
        id: 3,
        label: 'Attendance Pending',
        value: attendancePendingResult[0]?.pending_sessions || 0,
        sub: 'Mark within 24 hours',
        icon: 'clock',
        badge: `${attendancePendingResult[0]?.pending_sessions || 0} groups`
      },
      {
        id: 4,
        label: 'Tasks to Review',
        value: tasksResult[0]?.pending_reviews || 0,
        sub: 'Submissions awaiting review',
        icon: 'clipboard-check'
      }
    ];

    // Get today's classes - FIXED: Added backticks around `groups`
    const [classes] = await db.query(
      `SELECT 
        g.group_code as id,
        g.group_name as name,
        g.max_students as students,
        v.venue_name as loc,
        g.schedule_time as time,
        g.department,
        CASE 
          WHEN TIME(g.schedule_time) < CURTIME() THEN 'Completed'
          WHEN TIME(g.schedule_time) > CURTIME() THEN 'In progress'
          ELSE 'Attendance pending'
        END as status,
        CASE 
          WHEN TIME(g.schedule_time) < CURTIME() THEN 'completed'
          WHEN TIME(g.schedule_time) > CURTIME() THEN 'progress'
          ELSE 'pending'
        END as statusType
       FROM \`groups\` g
       LEFT JOIN venue v ON g.venue_id = v.venue_id
       WHERE g.ID = ?
       AND g.schedule_days LIKE ?
       ORDER BY g.schedule_time`,
      [facultyId, `%${today}%`]
    );

    const classesWithActions = classes.map(cls => {
      let actions = [];
      if (cls.statusType === 'pending') {
        actions = ['Mark Attendance', 'View Class', 'Post Task'];
      } else if (cls.statusType === 'progress') {
        actions = ['Mark Attendance', 'Post Task'];
      } else {
        actions = ['Edit Attendance', 'View Tasks'];
      }
      return { ...cls, actions };
    });

    // Get faculty groups - FIXED: Added backticks around `groups`
    const [groups] = await db.query(
      `SELECT 
        g.group_code as id,
        g.group_name as title,
        CONCAT(g.schedule_days, ' ', g.schedule_time) as schedule,
        g.max_students as students,
        g.department,
        COALESCE((
          SELECT ROUND(AVG(CASE WHEN a.is_present = 1 THEN 100 ELSE 0 END), 0)
          FROM attendance a
          WHERE a.group_id = g.group_id
          AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ), 85) as attend,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.group_id = g.group_id
          AND t.due_date >= CURDATE()
        ) as tasks,
        CASE 
          WHEN g.max_students > 100 THEN 'On track'
          WHEN g.max_students > 50 THEN 'Watch attendance'
          ELSE 'Review tasks'
        END as status,
        CASE 
          WHEN g.max_students > 100 THEN 'success'
          WHEN g.max_students > 50 THEN 'warning'
          ELSE 'info'
        END as type
       FROM \`groups\` g
       WHERE g.ID = ?
       AND g.status = 'Active'
       ORDER BY g.group_name`,
      [facultyId]
    );

    // Get task review queue
    const [pendingResult] = await db.query(
      `SELECT COUNT(*) as pending_reviews
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.status = 'Pending Review'`,
      [facultyId]
    );

    const [avgResult] = await db.query(
      `SELECT ROUND(AVG(ts.grade), 0) as avg_completion
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.grade IS NOT NULL`,
      [facultyId]
    );

    const [taskList] = await db.query(
      `SELECT 
        t.task_id as id,
        t.title as name,
        g.group_name as class,
        COUNT(ts.submission_id) as submitted,
        g.max_students as total,
        'review' as status
       FROM tasks t
       LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.status = 'Pending Review'
       INNER JOIN \`groups\` g ON t.group_id = g.group_id
       WHERE t.ID = ?
       GROUP BY t.task_id
       HAVING COUNT(ts.submission_id) > 0
       LIMIT 3`,
      [facultyId]
    );

    const taskReview = {
      pendingReviews: pendingResult[0]?.pending_reviews || 0,
      avgCompletion: avgResult[0]?.avg_completion || 0,
      tasks: taskList
    };

    // Get attendance summary
    const [overallResult] = await db.query(
      `SELECT 
        ROUND(AVG(CASE WHEN is_present = 1 THEN 100 ELSE 0 END), 0) as overall
       FROM attendance 
       WHERE ID = ?
       AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [facultyId]
    );

    const [pendingSessionsResult] = await db.query(
      `SELECT COUNT(DISTINCT group_id) as sessions_pending
       FROM \`groups\` 
       WHERE ID = ?
       AND group_id NOT IN (
         SELECT DISTINCT group_id FROM attendance WHERE DATE(created_at) = CURDATE()
       )`,
      [facultyId]
    );

    const attendance = {
      overall: overallResult[0]?.overall || 0,
      target: 90,
      pendingSessions: pendingSessionsResult[0]?.sessions_pending || 0,
      highest: { class: 'CS-201', percentage: 94 },
      lowest: { class: 'AI-310', percentage: 78 }
    };

    // Get engagement data - FIXED: Added backticks around `groups`
    const [attendanceData] = await db.query(
      `SELECT 
        g.group_name as label,
        ROUND(AVG(CASE WHEN a.is_present = 1 THEN 100 ELSE 0 END), 0) as attendance_percentage
       FROM attendance a
       INNER JOIN \`groups\` g ON a.group_id = g.group_id
       WHERE a.ID = ?
       GROUP BY a.group_id
       ORDER BY attendance_percentage DESC
       LIMIT 5`,
      [facultyId]
    );

    const [taskData] = await db.query(
      `SELECT 
        COUNT(CASE WHEN ts.status = 'Graded' THEN 1 END) as submitted,
        COUNT(CASE WHEN ts.status = 'Pending Review' THEN 1 END) as pending,
        COUNT(CASE WHEN ts.status = 'Needs Revision' THEN 1 END) as overdue
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?`,
      [facultyId]
    );

    const totalTasks = taskData[0]?.submitted + taskData[0]?.pending + taskData[0]?.overdue;
    const submittedPct = totalTasks > 0 ? Math.round((taskData[0]?.submitted / totalTasks) * 100) : 0;
    const pendingPct = totalTasks > 0 ? Math.round((taskData[0]?.pending / totalTasks) * 100) : 0;
    const overduePct = totalTasks > 0 ? Math.round((taskData[0]?.overdue / totalTasks) * 100) : 0;

    const engagementData = {
      attendance: {
        labels: attendanceData.map(item => item.label) || [],
        datasets: [{
          data: attendanceData.map(item => item.attendance_percentage) || [],
          label: 'Attendance %',
          color: '#2563eb'
        }]
      },
      taskCompletion: {
        labels: ['Submitted', 'Pending', 'Overdue'],
        data: [submittedPct, pendingPct, overduePct],
        colors: ['#10b981', '#f59e0b', '#ef4444']
      }
    };

    const quickActions = [
      { id: 1, title: 'Mark attendance for a class', desc: 'Opens attendance marking flow' },
      { id: 2, title: 'Create a new task', desc: 'Assign work linked to study material' },
      { id: 3, title: 'Upload study material', desc: 'Day-wise roadmap for your groups' },
      { id: 4, title: 'View student performance', desc: 'Open student tracking & profiles' }
    ];

    const dashboardData = {
      stats,
      classes: classesWithActions,
      groups,
      taskReview,
      attendance,
      engagementData,
      quickActions
    };

    // console.log('Dashboard data sent successfully for faculty ID:', facultyId);
    res.json(dashboardData);
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      sql: error.sql
    });
  }
};

// Individual endpoints
export const getFacultyOverview = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }

    // console.log('Fetching overview for faculty ID:', facultyId);

    // FIXED: Added backticks around `groups`
    const [groupsResult] = await db.query(
      `SELECT COUNT(*) as total_groups FROM \`groups\` WHERE ID = ?`,
      [facultyId]
    );

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const [sessionsResult] = await db.query(
      `SELECT COUNT(*) as todays_sessions FROM \`groups\` WHERE ID = ? AND schedule_days LIKE ?`,
      [facultyId, `%${today}%`]
    );

    const [attendancePendingResult] = await db.query(
      `SELECT COUNT(DISTINCT g.group_id) as pending_sessions
       FROM \`groups\` g
       WHERE g.ID = ?
       AND g.group_id NOT IN (
         SELECT DISTINCT group_id FROM attendance WHERE DATE(created_at) = CURDATE()
       )`,
      [facultyId]
    );

    const [tasksResult] = await db.query(
      `SELECT COUNT(*) as pending_reviews
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.status = 'Pending Review'`,
      [facultyId]
    );

    const stats = [
      {
        id: 1,
        label: 'My Classes',
        value: groupsResult[0]?.total_groups || 0,
        sub: 'Across departments',
        icon: 'book-open'
      },
      {
        id: 2,
        label: "Today's Sessions",
        value: sessionsResult[0]?.todays_sessions || 0,
        sub: 'Check schedule for timing',
        icon: 'calendar'
      },
      {
        id: 3,
        label: 'Attendance Pending',
        value: attendancePendingResult[0]?.pending_sessions || 0,
        sub: 'Mark within 24 hours',
        icon: 'clock'
      },
      {
        id: 4,
        label: 'Tasks to Review',
        value: tasksResult[0]?.pending_reviews || 0,
        sub: 'Submissions awaiting review',
        icon: 'clipboard-check'
      }
    ];

    // console.log('Overview stats sent for faculty ID:', facultyId);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getTodaysClasses = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    const [classes] = await db.query(
      `SELECT 
        g.group_code as id,
        g.group_name as name,
        g.max_students as students,
        v.venue_name as loc,
        g.schedule_time as time,
        g.department,
        CASE 
          WHEN TIME(g.schedule_time) < CURTIME() THEN 'Completed'
          WHEN TIME(g.schedule_time) > CURTIME() THEN 'In progress'
          ELSE 'Attendance pending'
        END as status,
        CASE 
          WHEN TIME(g.schedule_time) < CURTIME() THEN 'completed'
          WHEN TIME(g.schedule_time) > CURTIME() THEN 'progress'
          ELSE 'pending'
        END as statusType
       FROM \`groups\` g
       LEFT JOIN venue v ON g.venue_id = v.venue_id
       WHERE g.ID = ?
       AND g.schedule_days LIKE ?
       ORDER BY g.schedule_time`,
      [facultyId, `%${today}%`]
    );

    const classesWithActions = classes.map(cls => {
      let actions = [];
      if (cls.statusType === 'pending') {
        actions = ['Mark Attendance', 'View Class', 'Post Task'];
      } else if (cls.statusType === 'progress') {
        actions = ['Mark Attendance', 'Post Task'];
      } else {
        actions = ['Edit Attendance', 'View Tasks'];
      }
      return { ...cls, actions };
    });

    res.json({ classes: classesWithActions });
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFacultyGroups = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }
    
    const [groups] = await db.query(
      `SELECT 
        g.group_code as id,
        g.group_name as title,
        CONCAT(g.schedule_days, ' ', g.schedule_time) as schedule,
        g.max_students as students,
        g.department,
        COALESCE((
          SELECT ROUND(AVG(CASE WHEN a.is_present = 1 THEN 100 ELSE 0 END), 0)
          FROM attendance a
          WHERE a.group_id = g.group_id
          AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ), 85) as attend,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.group_id = g.group_id
          AND t.due_date >= CURDATE()
        ) as tasks,
        CASE 
          WHEN g.max_students > 100 THEN 'On track'
          WHEN g.max_students > 50 THEN 'Watch attendance'
          ELSE 'Review tasks'
        END as status,
        CASE 
          WHEN g.max_students > 100 THEN 'success'
          WHEN g.max_students > 50 THEN 'warning'
          ELSE 'info'
        END as type
       FROM \`groups\` g
       WHERE g.ID = ?
       AND g.status = 'Active'
       ORDER BY g.group_name`,
      [facultyId]
    );

    res.json({ groups });
  } catch (error) {
    console.error('Error fetching faculty groups:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTaskReviewQueue = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }
    
    const [pendingResult] = await db.query(
      `SELECT COUNT(*) as pending_reviews
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.status = 'Pending Review'`,
      [facultyId]
    );

    const [avgResult] = await db.query(
      `SELECT ROUND(AVG(ts.grade), 0) as avg_completion
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?
       AND ts.grade IS NOT NULL`,
      [facultyId]
    );

    const [taskList] = await db.query(
      `SELECT 
        t.task_id as id,
        t.title as name,
        g.group_name as class,
        COUNT(ts.submission_id) as submitted,
        g.max_students as total,
        'review' as status
       FROM tasks t
       LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.status = 'Pending Review'
       INNER JOIN \`groups\` g ON t.group_id = g.group_id
       WHERE t.ID = ?
       GROUP BY t.task_id
       HAVING COUNT(ts.submission_id) > 0
       LIMIT 3`,
      [facultyId]
    );

    const taskReview = {
      pendingReviews: pendingResult[0]?.pending_reviews || 0,
      avgCompletion: avgResult[0]?.avg_completion || 0,
      tasks: taskList
    };

    res.json(taskReview);
  } catch (error) {
    console.error('Error fetching task review queue:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }
    
    const [overallResult] = await db.query(
      `SELECT 
        ROUND(AVG(CASE WHEN is_present = 1 THEN 100 ELSE 0 END), 0) as overall
       FROM attendance 
       WHERE ID = ?
       AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [facultyId]
    );

    const [pendingSessionsResult] = await db.query(
      `SELECT COUNT(DISTINCT group_id) as sessions_pending
       FROM \`groups\` 
       WHERE ID = ?
       AND group_id NOT IN (
         SELECT DISTINCT group_id FROM attendance WHERE DATE(created_at) = CURDATE()
       )`,
      [facultyId]
    );

    const attendance = {
      overall: overallResult[0]?.overall || 0,
      target: 90,
      pendingSessions: pendingSessionsResult[0]?.sessions_pending || 0,
      highest: { class: 'CS-201', percentage: 94 },
      lowest: { class: 'AI-310', percentage: 78 }
    };

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEngagementData = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const facultyId = await getFacultyIdFromUserId(req.user.user_id);
    
    if (!facultyId) {
      return res.status(400).json({ 
        message: 'Faculty profile not found'
      });
    }
    
    const [attendanceData] = await db.query(
      `SELECT 
        g.group_name as label,
        ROUND(AVG(CASE WHEN a.is_present = 1 THEN 100 ELSE 0 END), 0) as attendance_percentage
       FROM attendance a
       INNER JOIN \`groups\` g ON a.group_id = g.group_id
       WHERE a.ID = ?
       GROUP BY a.group_id
       ORDER BY attendance_percentage DESC
       LIMIT 5`,
      [facultyId]
    );

    const [taskData] = await db.query(
      `SELECT 
        COUNT(CASE WHEN ts.status = 'Graded' THEN 1 END) as submitted,
        COUNT(CASE WHEN ts.status = 'Pending Review' THEN 1 END) as pending,
        COUNT(CASE WHEN ts.status = 'Needs Revision' THEN 1 END) as overdue
       FROM task_submissions ts
       INNER JOIN tasks t ON ts.task_id = t.task_id
       WHERE t.ID = ?`,
      [facultyId]
    );

    const totalTasks = taskData[0]?.submitted + taskData[0]?.pending + taskData[0]?.overdue;
    const submittedPct = totalTasks > 0 ? Math.round((taskData[0]?.submitted / totalTasks) * 100) : 0;
    const pendingPct = totalTasks > 0 ? Math.round((taskData[0]?.pending / totalTasks) * 100) : 0;
    const overduePct = totalTasks > 0 ? Math.round((taskData[0]?.overdue / totalTasks) * 100) : 0;

    const engagementData = {
      attendance: {
        labels: attendanceData.map(item => item.label) || [],
        datasets: [{
          data: attendanceData.map(item => item.attendance_percentage) || [],
          label: 'Attendance %',
          color: '#2563eb'
        }]
      },
      taskCompletion: {
        labels: ['Submitted', 'Pending', 'Overdue'],
        data: [submittedPct, pendingPct, overduePct],
        colors: ['#10b981', '#f59e0b', '#ef4444']
      }
    };

    res.json(engagementData);
  } catch (error) {
    console.error('Error fetching engagement data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getQuickActions = (req, res) => {
  const quickActions = [
    { id: 1, title: 'Mark attendance for a class', desc: 'Opens attendance marking flow' },
    { id: 2, title: 'Create a new task', desc: 'Assign work linked to study material' },
    { id: 3, title: 'Upload study material', desc: 'Day-wise roadmap for your groups' },
    { id: 4, title: 'View student performance', desc: 'Open student tracking & profiles' }
  ];
  res.json({ quickActions });
};