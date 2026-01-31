import db from '../config/db.js';

// Get dashboard metrics
export const getDashboardMetrics = async (req, res) => {
  try {
    
    // Get user info from request (added by auth middleware)
    const userId = req.user?.userId || req.user?.user_id || req.user?.id;
    
    // 1. Total Students Count - Count directly from students table
    const [totalStudentsResult] = await db.query(`
      SELECT COUNT(student_id) as total_count FROM students 
    `);

    const totalStudents = totalStudentsResult[0]?.total_count;

    // 2. Active Groups Count - Count from groups table where status is Active
    const [activeGroupsResult] = await db.query(`
      SELECT COUNT(*) as total_count FROM \`groups\` WHERE status = 'Active'
    `);
    const activeGroups = activeGroupsResult[0]?.total_count || 0;

    // 3. Average Attendance Percentage
    const [attendanceResult] = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(is_present) as present_count,
        ROUND((SUM(is_present) / COUNT(*)) * 100, 1) as avg_attendance
      FROM attendance
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    const avgAttendance = attendanceResult[0]?.avg_attendance || 0;
    const attendanceTrend = 0; // You can calculate trend by comparing with previous period

    // 4. Tasks Due (within next 2 days)
    const [tasksDueResult] = await db.query(`
      SELECT COUNT(*) as due_count FROM tasks
      WHERE due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 DAY)
      AND status = 'Active'
    `);
    const tasksDue = tasksDueResult[0]?.due_count || 0;

    const metrics = [
      { 
        id: 1, 
        label: 'Total Students', 
        value: totalStudents.toString(), 
        trend: '+0%', 
        trendContext: 'from last semester', 
        isPositive: true 
      },
      { 
        id: 2, 
        label: 'Active Groups', 
        value: activeGroups.toString(), 
        context: 'Active classes this term' 
      },
      { 
        id: 3, 
        label: 'Avg Attendance', 
        value: `${avgAttendance}%`, 
        trend: attendanceTrend >= 0 ? `+${attendanceTrend}%` : `${attendanceTrend}%`, 
        trendContext: 'vs last week', 
        isPositive: attendanceTrend >= 0 
      },
      { 
        id: 4, 
        label: 'Tasks Due', 
        value: tasksDue.toString(), 
        context: 'Within next 48 hours' 
      },
    ];

    res.status(200).json({ 
      success: true, 
      data: metrics,
      user_id: userId
    });
  } catch (error) {
    console.error(' Error fetching dashboard metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard metrics',
      error: error.message 
    });
  }
};

// Get attendance by department/venue
export const getAttendanceByDepartment = async (req, res) => {
  try {
    const { period } = req.query; // 'Weekly' or 'Monthly'

    let dateFilter = '';
    if (period === 'Weekly') {
      dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'Monthly') {
      dateFilter = 'AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const [attendanceData] = await db.query(`
      SELECT 
        v.venue_name as dept,
        COUNT(*) as total_sessions,
        SUM(a.is_present) as present_count,
        ROUND((SUM(a.is_present) / COUNT(*)) * 100, 0) as attendance_percentage
      FROM attendance a
      INNER JOIN venue v ON a.venue_id = v.venue_id
      WHERE 1=1 ${dateFilter}
      GROUP BY v.venue_id, v.venue_name
      ORDER BY attendance_percentage DESC
      LIMIT 10
    `);

    const formattedData = attendanceData.map(item => ({
      dept: item.dept,
      value: item.attendance_percentage
    }));

    // If no data, return some defaults
    if (formattedData.length === 0) {
      const [allVenues] = await db.query(`
        SELECT venue_name as dept FROM venue WHERE status = 'Active' LIMIT 5
      `);
      formattedData.push(...allVenues.map(v => ({ dept: v.dept, value: 0 })));
    }


    res.status(200).json({ 
      success: true, 
      data: formattedData,
      period: period || 'Weekly'
    });
  } catch (error) {
    console.error(' Error fetching attendance by department:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance data',
      error: error.message 
    });
  }
};

// Get task completion percentage
export const getTaskCompletion = async (req, res) => {
  try {
    const [taskStats] = await db.query(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN ts.status = 'Graded' THEN 1 ELSE 0 END) as completed_tasks,
        ROUND((SUM(CASE WHEN ts.status = 'Graded' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 0) as completion_percentage
      FROM task_submissions ts
      INNER JOIN tasks t ON ts.task_id = t.task_id
      WHERE t.status = 'Active'
        AND ts.submitted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    const completionPercentage = taskStats[0]?.completion_percentage || 0;

    res.status(200).json({ 
      success: true, 
      data: {
        percentage: completionPercentage,
        label: 'Task Completion',
        total: taskStats[0]?.total_tasks || 0,
        completed: taskStats[0]?.completed_tasks || 0
      }
    });
  } catch (error) {
    console.error(' Error fetching task completion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch task completion data',
      error: error.message 
    });
  }
};

// Get alerts with pagination - FIXED VERSION
export const getAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 3, search = '', issueType = 'all', sortBy = 'date', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get all alerts without pagination first (simpler approach)
    const [lowAttendanceAlerts] = await db.query(`
      SELECT s.student_id as id, u.name, u.ID as roll_number,
      CONCAT(v.venue_name, ' - ', g.group_name) as group_name,
      'Low Attendance (< 60%)' as issue, 
      'danger' as type, 
      MAX(a.created_at) as last_date,
      COUNT(*) as session_count,
      SUM(a.is_present) as present_count,
      ROUND((SUM(a.is_present) / COUNT(*)) * 100, 0) as attendance_percentage
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      INNER JOIN attendance a ON s.student_id = a.student_id
      WHERE gs.status = 'Active'
        AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY s.student_id, u.name, u.ID, v.venue_name, g.group_name
      HAVING attendance_percentage < 60
      ORDER BY attendance_percentage ASC
    `);

    const [overdueTasksAlerts] = await db.query(`
      SELECT DISTINCT
        s.student_id as id,
        u.name,
        u.ID as roll_number,
        t.title as group_name,
        CONCAT('Task Overdue: ', t.title) as issue,
        'warning' as type,
        t.due_date as last_date
      FROM task_submissions ts
      INNER JOIN students s ON ts.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN tasks t ON ts.task_id = t.task_id
      WHERE ts.status = 'Pending Review'
        AND t.due_date < NOW()
        AND t.status = 'Active'
      ORDER BY t.due_date ASC
    `);

    const [consecutiveAbsenceAlerts] = await db.query(`
      SELECT DISTINCT
        s.student_id as id,
        u.name,
        u.ID as roll_number,
        v.venue_name as group_name,
        '3+ Consecutive Absences' as issue,
        'danger' as type,
        MAX(a.created_at) as last_date
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN attendance a ON s.student_id = a.student_id
      INNER JOIN venue v ON a.venue_id = v.venue_id
      WHERE a.is_present = 0
        AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY s.student_id, u.name, u.ID, v.venue_name
      HAVING COUNT(*) >= 3
      ORDER BY last_date DESC
    `);

    // Combine all alerts
    let allAlerts = [
      ...lowAttendanceAlerts.map(a => ({
        id: a.roll_number || a.id,
        student_id: a.id,
        name: a.name,
        group: a.group_name,
        issue: `${a.issue} (${a.attendance_percentage}%)`,
        type: a.type,
        date: formatDate(a.last_date),
        dateRaw: a.last_date,
        attendance_percentage: a.attendance_percentage
      })),
      ...overdueTasksAlerts.map(a => ({
        id: a.roll_number || a.id,
        student_id: a.id,
        name: a.name,
        group: a.group_name,
        issue: a.issue,
        type: a.type,
        date: formatDate(a.last_date),
        dateRaw: a.last_date
      })),
      ...consecutiveAbsenceAlerts.map(a => ({
        id: a.roll_number || a.id,
        student_id: a.id,
        name: a.name,
        group: a.group_name,
        issue: a.issue,
        type: a.type,
        date: formatDate(a.last_date),
        dateRaw: a.last_date
      }))
    ];

    // Apply search filter
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      allAlerts = allAlerts.filter(alert => 
        alert.name.toLowerCase().includes(searchLower) ||
        alert.id.toString().toLowerCase().includes(searchLower) ||
        alert.group.toLowerCase().includes(searchLower) ||
        alert.issue.toLowerCase().includes(searchLower)
      );
    }

    // Apply issue type filter
    if (issueType && issueType !== 'all') {
      if (issueType === 'danger' || issueType === 'warning') {
        allAlerts = allAlerts.filter(alert => alert.type === issueType);
      } else if (issueType === 'attendance') {
        allAlerts = allAlerts.filter(alert => alert.issue.includes('Attendance') || alert.issue.includes('Absence'));
      } else if (issueType === 'task') {
        allAlerts = allAlerts.filter(alert => alert.issue.includes('Task'));
      } else if (issueType === 'absence') {
        allAlerts = allAlerts.filter(alert => alert.issue.includes('Absence'));
      }
    }

    // Apply sorting
    allAlerts.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'issue':
          comparison = a.issue.localeCompare(b.issue);
          break;
        case 'date':
        default:
          comparison = new Date(b.dateRaw || 0) - new Date(a.dateRaw || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const totalAlerts = allAlerts.length;
    const totalPages = Math.ceil(totalAlerts / limitNum);
    const paginatedAlerts = allAlerts.slice(offset, offset + limitNum);

    res.status(200).json({ 
      success: true, 
      data: paginatedAlerts,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalItems: totalAlerts,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error(' Error fetching alerts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alerts',
      error: error.message 
    });
  }
};



// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}

// Get venues that haven't marked attendance for today's sessions (45 mins after session start)
export const getUnmarkedAttendanceVenues = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    
    console.log(`📊 Checking unmarked attendance - Current time: ${currentHour}:${currentMinute} (${currentTimeInMinutes} minutes), Date: ${today}`);
    
    // Define the 4 standard sessions with start times in minutes from midnight
    // Sessions become "overdue" 45 minutes after they start
    const sessions = [
      { id: 'S1', name: 'Session 1', time: '09:00 AM - 10:30 AM', startMinutes: 9 * 60, deadlineMinutes: 9 * 60 + 45 },      // 9:00 AM, deadline 9:45 AM
      { id: 'S2', name: 'Session 2', time: '10:30 AM - 12:30 PM', startMinutes: 10 * 60 + 30, deadlineMinutes: 10 * 60 + 30 + 45 }, // 10:30 AM, deadline 11:15 AM
      { id: 'S3', name: 'Session 3', time: '01:30 PM - 03:00 PM', startMinutes: 13 * 60 + 30, deadlineMinutes: 13 * 60 + 30 + 45 }, // 1:30 PM, deadline 2:15 PM
      { id: 'S4', name: 'Session 4', time: '03:00 PM - 04:30 PM', startMinutes: 15 * 60, deadlineMinutes: 15 * 60 + 45 }      // 3:00 PM, deadline 3:45 PM
    ];

    // Filter sessions that are past their 45-minute deadline
    const overdueSessionIds = sessions
      .filter(session => currentTimeInMinutes >= session.deadlineMinutes)
      .map(session => session.id);

    console.log(`📊 Overdue sessions (45 min past start): ${overdueSessionIds.join(', ') || 'None'}`);

    // If no sessions are overdue yet, return empty
    if (overdueSessionIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        },
        date: today,
        current_time: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        message: 'No sessions have passed their 45-minute attendance marking deadline yet',
        total_venues: 0,
        venues_with_unmarked: 0
      });
    }

    // Get all active venues with their faculty info
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.location,
        u.name as faculty_name,
        COUNT(DISTINCT gs.student_id) as student_count
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.status = 'Active'
      GROUP BY v.venue_id, v.venue_name, v.location, u.name
      ORDER BY v.venue_name
    `);

    console.log(`📊 Total active venues found: ${venues.length}`);

    // Get attendance sessions that have been created for today
    // Session name format: S1_Venue{venueId}_{date} e.g., S1_Venue1_2026-01-31
    const [markedSessions] = await db.query(`
      SELECT 
        session_name
      FROM attendance_session
      WHERE session_name LIKE ?
    `, [`%_${today}`]);

    console.log(`📊 Marked sessions today: ${markedSessions.length}`, markedSessions.map(s => s.session_name));

    // Parse marked sessions to identify venue/session combinations
    const markedSet = new Set();
    markedSessions.forEach(s => {
      // Session name format: S1_Venue1_2026-01-31
      const parts = s.session_name.split('_');
      if (parts.length >= 3) {
        const sessionId = parts[0]; // S1, S2, etc.
        const venueIdPart = parts[1].replace('Venue', ''); // Extract venue ID
        const key = `${venueIdPart}_${sessionId}`;
        markedSet.add(key);
        console.log(`📊 Parsed marked: venue ${venueIdPart}, session ${sessionId}`);
      }
    });

    console.log(`📊 Marked venue-session combinations: ${[...markedSet].join(', ')}`);

    // Build unmarked venues list - only for sessions that are past their deadline
    const unmarkedVenues = [];
    const overdueSessions = sessions.filter(s => overdueSessionIds.includes(s.id));
    
    venues.forEach(venue => {
      // Only check sessions that are past their 45-minute deadline
      const unmarkedOverdueSessions = overdueSessions.filter(session => {
        const key = `${venue.venue_id}_${session.id}`;
        const isMarked = markedSet.has(key);
        console.log(`📊 Checking venue ${venue.venue_id} (${venue.venue_name}), session ${session.id}: ${isMarked ? 'MARKED' : 'NOT MARKED'}`);
        return !isMarked;
      });
      
      if (unmarkedOverdueSessions.length > 0) {
        // Calculate how late the attendance is for each session
        const sessionsWithDelay = unmarkedOverdueSessions.map(session => ({
          ...session,
          minutes_overdue: currentTimeInMinutes - session.deadlineMinutes
        }));

        unmarkedVenues.push({
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          location: venue.location,
          faculty_name: venue.faculty_name || 'Not Assigned',
          student_count: venue.student_count || 0,
          unmarked_sessions: sessionsWithDelay,
          total_overdue_sessions: overdueSessions.length,
          marked_count: overdueSessions.length - unmarkedOverdueSessions.length
        });
      }
    });

    console.log(`📊 Venues with unmarked overdue attendance: ${unmarkedVenues.length}`);

    // Apply pagination
    const totalItems = unmarkedVenues.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVenues = unmarkedVenues.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedVenues,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit
      },
      date: today,
      current_time: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      total_venues: venues.length,
      venues_with_unmarked: unmarkedVenues.length,
      sessions_checked: overdueSessionIds
    });

  } catch (error) {
    console.error('❌ Error fetching unmarked attendance venues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unmarked attendance venues',
      error: error.message
    });
  }
};

// Get venues without task assignments for today (if past 12:30 PM and no task assigned today)
export const getPendingTaskAssignments = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    
    // Task assignment deadline is 12:30 PM (12 * 60 + 30 = 750 minutes from midnight)
    const taskDeadlineMinutes = 12 * 60 + 30; // 12:30 PM
    
    // If it's before 12:30 PM, no venues are overdue yet
    if (currentTimeInMinutes < taskDeadlineMinutes) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit
        },
        stats: {
          total_venues: 0,
          venues_without_tasks_today: 0,
          venues_with_tasks_today: 0
        },
        message: `Task assignment deadline is 12:30 PM. Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
        deadline_passed: false
      });
    }

    // Get all active venues with their task assignment status for TODAY
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.location,
        u.name as faculty_name,
        COUNT(DISTINCT gs.student_id) as student_count,
        COUNT(DISTINCT CASE WHEN DATE(t.created_at) = CURDATE() THEN t.task_id END) as tasks_assigned_today,
        MAX(CASE WHEN DATE(t.created_at) = CURDATE() THEN t.created_at END) as last_task_today
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      LEFT JOIN tasks t ON t.group_id = g.group_id AND t.status = 'Active'
      WHERE v.status = 'Active'
      GROUP BY v.venue_id, v.venue_name, v.location, u.name
      ORDER BY tasks_assigned_today ASC, v.venue_name
    `);

    // Filter venues that have NOT assigned any task today
    const venuesWithoutTasksToday = venues.filter(v => v.tasks_assigned_today === 0);
    const venuesWithTasksToday = venues.filter(v => v.tasks_assigned_today > 0);

    // Calculate how late each venue is (time since 12:30 PM)
    const minutesOverdue = currentTimeInMinutes - taskDeadlineMinutes;
    const hoursOverdue = Math.floor(minutesOverdue / 60);
    const minsOverdue = minutesOverdue % 60;

    const venuesWithOverdueInfo = venuesWithoutTasksToday.map(v => ({
      ...v,
      minutes_overdue: minutesOverdue,
      overdue_display: hoursOverdue > 0 
        ? `${hoursOverdue}h ${minsOverdue}m overdue` 
        : `${minsOverdue}m overdue`
    }));

    // Apply pagination
    const totalItems = venuesWithOverdueInfo.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVenues = venuesWithOverdueInfo.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: paginatedVenues,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalItems,
        itemsPerPage: limit
      },
      stats: {
        total_venues: venues.length,
        venues_without_tasks_today: venuesWithoutTasksToday.length,
        venues_with_tasks_today: venuesWithTasksToday.length
      },
      date: today,
      current_time: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
      deadline: '12:30 PM',
      deadline_passed: true,
      minutes_since_deadline: minutesOverdue
    });

  } catch (error) {
    console.error('❌ Error fetching venues without task assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues without task assignments',
      error: error.message
    });
  }
};