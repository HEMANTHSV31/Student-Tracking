import db from '../config/db.js';

/**
 * Leaderboard Controller
 * Handles student performance rankings and leaderboards
 */

/**
 * Get overall leaderboard across all tasks
 * GET /api/leaderboard/overall
 */
export const getOverallLeaderboard = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get current student info
    const [currentStudent] = await db.query(`
      SELECT s.student_id, u.name, s.venue_id, s.year
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = ?
    `, [user_id]);

    if (currentStudent.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { student_id, venue_id, year } = currentStudent[0];

    // Calculate overall leaderboard based on all submissions
    // Includes both question bank tasks and regular assignments
    const [leaderboard] = await db.query(`
      SELECT 
        s.student_id,
        u.name as student_name,
        u.ID as roll_no,
        COALESCE(SUM(CASE 
          WHEN sub.grade IS NOT NULL THEN sub.grade
          WHEN ss.grade IS NOT NULL THEN ss.grade
          ELSE 0
        END), 0) as total_points,
        COUNT(DISTINCT CASE WHEN sub.submission_id IS NOT NULL THEN sub.submission_id END) as assignment_count,
        COUNT(DISTINCT CASE WHEN ss.submission_id IS NOT NULL THEN ss.submission_id END) as question_bank_count
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN submissions sub ON s.student_id = sub.student_id AND sub.status = 'Graded'
      LEFT JOIN student_submissions ss ON s.student_id = ss.student_id AND ss.status IN ('Graded', 'Auto-Graded')
      WHERE s.venue_id = ? AND s.year = ?
      GROUP BY s.student_id, u.name, u.ID
      ORDER BY total_points DESC, student_name ASC
    `, [venue_id, year]);

    // Add rank to each student
    leaderboard.forEach((student, index) => {
      student.rank = index + 1;
      student.is_current_user = student.student_id === student_id;
    });

    // Find current user's rank
    const currentUserData = leaderboard.find(s => s.is_current_user);

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        current_user: currentUserData || {
          rank: leaderboard.length + 1,
          student_name: currentStudent[0].name,
          total_points: 0,
          is_current_user: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching overall leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
};

/**
 * Get course-specific leaderboard
 * GET /api/leaderboard/course/:courseId
 */
export const getCourseLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.user_id;

    // Get current student info
    const [currentStudent] = await db.query(`
      SELECT s.student_id, u.name, s.venue_id, s.year
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = ?
    `, [user_id]);

    if (currentStudent.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { student_id, venue_id, year } = currentStudent[0];

    // Get course name
    const [course] = await db.query(`
      SELECT course_name FROM skill_courses WHERE course_id = ?
    `, [courseId]);

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Calculate leaderboard for specific course
    const [leaderboard] = await db.query(`
      SELECT 
        s.student_id,
        u.name as student_name,
        u.ID as roll_no,
        COALESCE(SUM(ss.grade), 0) as total_points,
        COUNT(ss.submission_id) as submission_count
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      LEFT JOIN student_submissions ss ON s.student_id = ss.student_id AND ss.status IN ('Graded', 'Auto-Graded')
      LEFT JOIN task_question_assignments tqa ON ss.task_id = tqa.task_id AND ss.student_id = tqa.student_id
      LEFT JOIN question_bank qb ON tqa.question_id = qb.question_id
      WHERE s.venue_id = ? AND s.year = ? AND (qb.course_id = ? OR qb.course_id IS NULL)
      GROUP BY s.student_id, u.name, u.ID
      HAVING submission_count > 0
      ORDER BY total_points DESC, student_name ASC
    `, [venue_id, year, courseId]);

    // Add rank
    leaderboard.forEach((student, index) => {
      student.rank = index + 1;
      student.is_current_user = student.student_id === student_id;
    });

    const currentUserData = leaderboard.find(s => s.is_current_user);

    res.status(200).json({
      success: true,
      data: {
        course_name: course[0].course_name,
        leaderboard,
        current_user: currentUserData || {
          rank: leaderboard.length + 1,
          student_name: currentStudent[0].name,
          total_points: 0,
          is_current_user: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching course leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course leaderboard',
      error: error.message
    });
  }
};

/**
 * Get student's workshop standings (courses with their rank)
 * GET /api/leaderboard/my-standings
 */
export const getMyStandings = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get student info
    const [student] = await db.query(`
      SELECT s.student_id, s.venue_id, s.year
      FROM students s
      WHERE s.user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { student_id, venue_id, year } = student[0];

    // Get all courses with student's performance
    const [standings] = await db.query(`
      SELECT 
        sc.course_id,
        sc.course_name,
        sc.course_type,
        COALESCE(SUM(CASE WHEN ss.student_id = ? AND ss.status IN ('Graded', 'Auto-Graded') THEN ss.grade ELSE 0 END), 0) as my_points,
        COUNT(DISTINCT CASE WHEN ss.student_id = ? AND ss.submission_id IS NOT NULL THEN ss.submission_id END) as my_submissions,
        (
          SELECT COUNT(DISTINCT s2.student_id)
          FROM students s2
          LEFT JOIN student_submissions ss2 ON s2.student_id = ss2.student_id AND ss2.status IN ('Graded', 'Auto-Graded')
          LEFT JOIN task_question_assignments tqa2 ON ss2.task_id = tqa2.task_id AND ss2.student_id = tqa2.student_id
          LEFT JOIN question_bank qb2 ON tqa2.question_id = qb2.question_id
          WHERE s2.venue_id = ? AND s2.year = ? AND qb2.course_id = sc.course_id
          GROUP BY s2.student_id
          HAVING COALESCE(SUM(ss2.grade), 0) > (
            SELECT COALESCE(SUM(ss3.grade), 0)
            FROM student_submissions ss3
            INNER JOIN task_question_assignments tqa3 ON ss3.task_id = tqa3.task_id AND ss3.student_id = tqa3.student_id
            INNER JOIN question_bank qb3 ON tqa3.question_id = qb3.question_id
            WHERE ss3.student_id = ? AND ss3.status IN ('Graded', 'Auto-Graded') AND qb3.course_id = sc.course_id
          )
        ) + 1 as my_rank,
        MIN(t.created_at) as start_date,
        MAX(t.due_date) as end_date,
        CASE 
          WHEN MAX(t.due_date) >= CURDATE() THEN 'In Progress'
          ELSE 'Completed'
        END as status
      FROM skill_courses sc
      LEFT JOIN question_bank qb ON sc.course_id = qb.course_id
      LEFT JOIN task_question_assignments tqa ON qb.question_id = tqa.question_id
      LEFT JOIN tasks t ON tqa.task_id = t.task_id
      LEFT JOIN student_submissions ss ON tqa.task_id = ss.task_id AND tqa.student_id = ss.student_id AND tqa.question_id = ss.question_id
      WHERE sc.status = 'Active'
        AND (tqa.student_id = ? OR tqa.student_id IS NULL)
      GROUP BY sc.course_id, sc.course_name, sc.course_type
      HAVING my_submissions > 0
      ORDER BY my_points DESC
    `, [student_id, student_id, venue_id, year, student_id, student_id]);

    res.status(200).json({
      success: true,
      data: standings
    });
  } catch (error) {
    console.error('Error fetching standings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standings',
      error: error.message
    });
  }
};
