import db from '../config/db.js';

/**
 * Faculty Question Bank Controller
 * Handles faculty operations for:
 * - Viewing pending student submissions (MCQ/Coding)
 * - Grading coding submissions manually
 * - Viewing auto-graded MCQ results
 * - Reassigning questions to students who failed
 * - Viewing student progress analytics
 */

// =====================================================
// GET PENDING SUBMISSIONS
// =====================================================

/**
 * Get all pending submissions for faculty's assigned venues
 * Filters by coding submissions that need manual grading
 * GET /api/faculty/question-bank/pending-submissions
 */
export const getPendingSubmissions = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get faculty_id
    const [faculty] = await db.query(`
      SELECT f.faculty_id, u.name as faculty_name 
      FROM faculties f
      INNER JOIN users u ON f.user_id = u.user_id
      WHERE f.user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Get pending submissions from faculty's assigned venues
    const [submissions] = await db.query(`
      SELECT DISTINCT
        ss.submission_id,
        ss.task_id,
        ss.student_id,
        ss.question_id,
        ss.submission_type,
        ss.coding_content,
        ss.programming_language,
        ss.submitted_at,
        ss.time_taken_minutes,
        ss.attempt_number,
        ss.status,
        ss.max_score,
        u.name as student_name,
        u.ID as roll_no,
        t.title as task_title,
        t.day as task_day,
        t.due_date,
        qb.title as question_title,
        qb.question_type,
        qb.difficulty_level,
        qb.coding_expected_output,
        sc.course_name,
        sc.skill_category,
        v.venue_name,
        v.venue_id
      FROM student_submissions ss
      INNER JOIN students s ON ss.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN tasks t ON ss.task_id = t.task_id
      INNER JOIN question_bank qb ON ss.question_id = qb.question_id
      INNER JOIN skill_courses sc ON qb.course_id = sc.course_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE v.assigned_faculty_id = ?
        AND gs.status = 'Active'
        AND ss.status = 'Pending Review'
        AND ss.submission_type = 'coding'
      ORDER BY ss.submitted_at ASC
    `, [faculty_id]);

    // Group by venue
    const byVenue = submissions.reduce((acc, sub) => {
      const venueKey = sub.venue_id;
      if (!acc[venueKey]) {
        acc[venueKey] = {
          venue_id: sub.venue_id,
          venue_name: sub.venue_name,
          submissions: []
        };
      }
      acc[venueKey].submissions.push(sub);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        faculty: {
          faculty_id,
          name: faculty[0].faculty_name
        },
        summary: {
          total_pending: submissions.length,
          venues_count: Object.keys(byVenue).length
        },
        submissions_by_venue: Object.values(byVenue),
        all_submissions: submissions
      }
    });
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending submissions',
      error: error.message
    });
  }
};

// =====================================================
// GET SUBMISSION DETAILS
// =====================================================

/**
 * Get detailed information about a specific submission
 * Includes student code, question details, and grading history
 * GET /api/faculty/question-bank/submission/:submissionId
 */
export const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const user_id = req.user.user_id;

    // Get faculty_id
    const [faculty] = await db.query(`
      SELECT faculty_id FROM faculties WHERE user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Get submission details with authorization check
    const [submission] = await db.query(`
      SELECT 
        ss.*,
        u.name as student_name,
        u.ID as roll_no,
        u.email as student_email,
        t.title as task_title,
        t.description as task_description,
        t.day as task_day,
        t.due_date,
        qb.title as question_title,
        qb.description as question_description,
        qb.question_type,
        qb.difficulty_level,
        qb.coding_starter_code,
        qb.coding_language_support,
        qb.coding_test_cases,
        qb.coding_expected_output,
        qb.hints,
        sc.course_name,
        sc.skill_category,
        v.venue_name,
        v.venue_id,
        grader_user.name as graded_by_name
      FROM student_submissions ss
      INNER JOIN students s ON ss.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN tasks t ON ss.task_id = t.task_id
      INNER JOIN question_bank qb ON ss.question_id = qb.question_id
      INNER JOIN skill_courses sc ON qb.course_id = sc.course_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN faculties grader ON ss.graded_by = grader.faculty_id
      LEFT JOIN users grader_user ON grader.user_id = grader_user.user_id
      WHERE ss.submission_id = ?
        AND v.assigned_faculty_id = ?
        AND gs.status = 'Active'
    `, [submissionId, faculty_id]);

    if (submission.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or you do not have permission to view it'
      });
    }

    const data = submission[0];

    // Parse test cases if exists
    let test_cases = null;
    if (data.coding_test_cases) {
      try {
        test_cases = JSON.parse(data.coding_test_cases);
      } catch (err) {
        console.error('Error parsing test cases:', err);
      }
    }

    // Get previous attempts for this task
    const [previousAttempts] = await db.query(`
      SELECT 
        submission_id,
        attempt_number,
        submitted_at,
        status,
        grade,
        feedback,
        graded_at
      FROM student_submissions
      WHERE task_id = ?
        AND student_id = ?
        AND submission_id != ?
      ORDER BY attempt_number DESC
    `, [data.task_id, data.student_id, submissionId]);

    res.status(200).json({
      success: true,
      data: {
        submission: {
          submission_id: data.submission_id,
          submission_type: data.submission_type,
          coding_content: data.coding_content,
          programming_language: data.programming_language,
          submitted_at: data.submitted_at,
          time_taken_minutes: data.time_taken_minutes,
          attempt_number: data.attempt_number,
          status: data.status,
          grade: data.grade,
          max_score: data.max_score,
          feedback: data.feedback,
          graded_at: data.graded_at,
          graded_by_name: data.graded_by_name || null,
          is_reassigned: data.is_reassigned
        },
        student: {
          student_id: data.student_id,
          name: data.student_name,
          roll_no: data.roll_no,
          email: data.student_email
        },
        task: {
          task_id: data.task_id,
          title: data.task_title,
          description: data.task_description,
          day: data.task_day,
          due_date: data.due_date
        },
        question: {
          question_id: data.question_id,
          title: data.question_title,
          description: data.question_description,
          question_type: data.question_type,
          difficulty_level: data.difficulty_level,
          course_name: data.course_name,
          skill_category: data.skill_category,
          starter_code: data.coding_starter_code,
          expected_output: data.coding_expected_output,
          test_cases,
          hints: data.hints,
          supported_languages: data.coding_language_support ? data.coding_language_support.split(',') : []
        },
        venue: {
          venue_id: data.venue_id,
          venue_name: data.venue_name
        },
        previous_attempts: previousAttempts
      }
    });
  } catch (error) {
    console.error('Error fetching submission details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission details',
      error: error.message
    });
  }
};

// =====================================================
// GRADE CODING SUBMISSION
// =====================================================

/**
 * Grade a coding submission
 * Automatically reassigns if grade < 50%
 * POST /api/faculty/question-bank/grade-submission
 * Body: { submission_id, grade, feedback }
 */
export const gradeSubmission = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { submission_id, grade, feedback } = req.body;
    const user_id = req.user.user_id;

    // Validation
    if (!submission_id || grade === undefined || grade === null) {
      return res.status(400).json({
        success: false,
        message: 'Submission ID and grade are required'
      });
    }

    if (grade < 0 || grade > 100) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be between 0 and 100'
      });
    }

    // Get faculty_id
    const [faculty] = await connection.query(`
      SELECT faculty_id FROM faculties WHERE user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Get submission details with authorization check
    const [submission] = await connection.query(`
      SELECT 
        ss.submission_id,
        ss.task_id,
        ss.student_id,
        ss.question_id,
        ss.attempt_number,
        ss.max_score,
        ss.status,
        v.assigned_faculty_id
      FROM student_submissions ss
      INNER JOIN students s ON ss.student_id = s.student_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE ss.submission_id = ?
        AND gs.status = 'Active'
    `, [submission_id]);

    if (submission.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const sub = submission[0];

    // Verify faculty has permission (must be assigned to the venue)
    if (sub.assigned_faculty_id !== faculty_id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to grade this submission'
      });
    }

    // Check if already graded
    if (sub.status === 'Graded') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This submission has already been graded'
      });
    }

    // Determine status based on grade
    const needs_reassignment = grade < 50;
    const new_status = 'Graded';

    // Update submission with grade
    await connection.query(`
      UPDATE student_submissions
      SET grade = ?,
          feedback = ?,
          status = ?,
          graded_at = NOW(),
          graded_by = ?,
          is_reassigned = ?
      WHERE submission_id = ?
    `, [grade, feedback || null, new_status, faculty_id, needs_reassignment ? 1 : 0, submission_id]);

    // If failed, create new assignment for reattempt
    if (needs_reassignment) {
      // Mark current assignment as inactive
      await connection.query(`
        UPDATE task_question_assignments
        SET is_active = 0
        WHERE task_id = ? AND student_id = ? AND attempt_number = ?
      `, [sub.task_id, sub.student_id, sub.attempt_number]);

      // Create new assignment (same question for now, could be randomized)
      await connection.query(`
        INSERT INTO task_question_assignments (
          task_id,
          student_id,
          question_id,
          attempt_number,
          is_active
        ) VALUES (?, ?, ?, ?, 1)
      `, [sub.task_id, sub.student_id, sub.question_id, sub.attempt_number + 1]);
    } else {
      // Mark assignment as complete
      await connection.query(`
        UPDATE task_question_assignments
        SET is_active = 0
        WHERE task_id = ? AND student_id = ? AND attempt_number = ?
      `, [sub.task_id, sub.student_id, sub.attempt_number]);
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: needs_reassignment 
        ? 'Submission graded. Student scored below 50% and has been reassigned for reattempt.'
        : 'Submission graded successfully!',
      data: {
        submission_id,
        grade,
        max_score: sub.max_score,
        status: new_status,
        needs_reattempt: needs_reassignment,
        new_attempt_number: needs_reassignment ? sub.attempt_number + 1 : null
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error grading submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// =====================================================
// GET STUDENT PROGRESS
// =====================================================

/**
 * Get progress summary for all students in faculty's venues
 * Shows MCQ auto-grades and coding submission status
 * GET /api/faculty/question-bank/student-progress
 */
export const getStudentProgress = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { venue_id } = req.query;

    // Get faculty_id
    const [faculty] = await db.query(`
      SELECT faculty_id FROM faculties WHERE user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Build venue filter
    let venueFilter = 'AND v.assigned_faculty_id = ?';
    let venueParams = [faculty_id];
    
    if (venue_id) {
      venueFilter += ' AND v.venue_id = ?';
      venueParams.push(venue_id);
    }

    // Get student progress
    const [progress] = await db.query(`
      SELECT 
        s.student_id,
        s.first_name,
        s.last_name,
        s.roll_no,
        v.venue_name,
        v.venue_id,
        COUNT(DISTINCT ss.submission_id) as total_submissions,
        SUM(CASE WHEN ss.status = 'Pending Review' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN ss.status IN ('Graded', 'Auto-Graded') THEN 1 ELSE 0 END) as graded_count,
        SUM(CASE WHEN ss.is_reassigned = 1 THEN 1 ELSE 0 END) as failed_count,
        AVG(CASE WHEN ss.status IN ('Graded', 'Auto-Graded') THEN ss.grade ELSE NULL END) as average_grade,
        COUNT(DISTINCT CASE WHEN ss.submission_type = 'mcq' THEN ss.submission_id END) as mcq_count,
        COUNT(DISTINCT CASE WHEN ss.submission_type = 'coding' THEN ss.submission_id END) as coding_count
      FROM students s
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN student_submissions ss ON s.student_id = ss.student_id
      WHERE gs.status = 'Active'
        ${venueFilter}
      GROUP BY s.student_id, s.first_name, s.last_name, s.roll_no, v.venue_name, v.venue_id
      ORDER BY v.venue_name, s.roll_no
    `, venueParams);

    // Get venue summary
    const [venueSummary] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        COUNT(DISTINCT s.student_id) as total_students,
        COUNT(DISTINCT ss.submission_id) as total_submissions,
        SUM(CASE WHEN ss.status = 'Pending Review' THEN 1 ELSE 0 END) as pending_reviews
      FROM venue v
      INNER JOIN \`groups\` g ON v.venue_id = g.venue_id
      INNER JOIN group_students gs ON g.group_id = gs.group_id
      INNER JOIN students s ON gs.student_id = s.student_id
      LEFT JOIN student_submissions ss ON s.student_id = ss.student_id
      WHERE v.assigned_faculty_id = ?
        AND gs.status = 'Active'
        ${venue_id ? 'AND v.venue_id = ?' : ''}
      GROUP BY v.venue_id, v.venue_name
      ORDER BY v.venue_name
    `, venue_id ? [faculty_id, venue_id] : [faculty_id]);

    res.status(200).json({
      success: true,
      data: {
        venue_summary: venueSummary,
        student_progress: progress
      }
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student progress',
      error: error.message
    });
  }
};

// =====================================================
// MANUALLY REASSIGN QUESTION
// =====================================================

/**
 * Manually reassign a different question to a student
 * POST /api/faculty/question-bank/reassign-question
 * Body: { task_id, student_id, new_question_id }
 */
export const reassignQuestion = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { task_id, student_id, new_question_id } = req.body;
    const user_id = req.user.user_id;

    // Validation
    if (!task_id || !student_id || !new_question_id) {
      return res.status(400).json({
        success: false,
        message: 'Task ID, student ID, and new question ID are required'
      });
    }

    // Get faculty_id
    const [faculty] = await connection.query(`
      SELECT faculty_id FROM faculties WHERE user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Verify faculty has permission
    const [permission] = await connection.query(`
      SELECT v.assigned_faculty_id
      FROM students s
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE s.student_id = ?
        AND gs.status = 'Active'
    `, [student_id]);

    if (permission.length === 0 || permission[0].assigned_faculty_id !== faculty_id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reassign questions for this student'
      });
    }

    // Get current assignment
    const [currentAssignment] = await connection.query(`
      SELECT attempt_number FROM task_question_assignments
      WHERE task_id = ? AND student_id = ? AND is_active = 1
    `, [task_id, student_id]);

    if (currentAssignment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active assignment found'
      });
    }

    const attempt_number = currentAssignment[0].attempt_number;

    // Mark current assignment as inactive
    await connection.query(`
      UPDATE task_question_assignments
      SET is_active = 0
      WHERE task_id = ? AND student_id = ? AND attempt_number = ?
    `, [task_id, student_id, attempt_number]);

    // Create new assignment with different question
    await connection.query(`
      INSERT INTO task_question_assignments (
        task_id,
        student_id,
        question_id,
        attempt_number,
        is_active
      ) VALUES (?, ?, ?, ?, 1)
    `, [task_id, student_id, new_question_id, attempt_number + 1]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Question reassigned successfully!',
      data: {
        task_id,
        student_id,
        new_question_id,
        new_attempt_number: attempt_number + 1
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error reassigning question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reassign question',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// =====================================================
// GET ALL GRADED SUBMISSIONS
// =====================================================

/**
 * Get all graded submissions (MCQ auto-graded + manually graded coding)
 * GET /api/faculty/question-bank/graded-submissions
 */
export const getGradedSubmissions = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { venue_id, submission_type } = req.query;

    // Get faculty_id
    const [faculty] = await db.query(`
      SELECT faculty_id FROM faculties WHERE user_id = ?
    `, [user_id]);

    if (faculty.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Faculty profile not found'
      });
    }

    const faculty_id = faculty[0].faculty_id;

    // Build filters
    let filters = 'AND v.assigned_faculty_id = ? AND ss.status IN ("Graded", "Auto-Graded")';
    let params = [faculty_id];

    if (venue_id) {
      filters += ' AND v.venue_id = ?';
      params.push(venue_id);
    }

    if (submission_type) {
      filters += ' AND ss.submission_type = ?';
      params.push(submission_type);
    }

    // Get graded submissions
    const [submissions] = await db.query(`
      SELECT 
        ss.submission_id,
        ss.task_id,
        ss.student_id,
        ss.submission_type,
        ss.submitted_at,
        ss.graded_at,
        ss.status,
        ss.grade,
        ss.max_score,
        ss.feedback,
        ss.mcq_is_correct,
        ss.is_reassigned,
        u.name as student_name,
        u.ID as roll_no,
        t.title as task_title,
        qb.title as question_title,
        qb.difficulty_level,
        sc.course_name,
        v.venue_name,
        grader_user.name as graded_by_name
      FROM student_submissions ss
      INNER JOIN students s ON ss.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      INNER JOIN tasks t ON ss.task_id = t.task_id
      INNER JOIN question_bank qb ON ss.question_id = qb.question_id
      INNER JOIN skill_courses sc ON qb.course_id = sc.course_id
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN faculties grader ON ss.graded_by = grader.faculty_id
      LEFT JOIN users grader_user ON grader.user_id = grader_user.user_id
      WHERE gs.status = 'Active'
        ${filters}
      ORDER BY ss.graded_at DESC
    `, params);

    res.status(200).json({
      success: true,
      data: {
        total: submissions.length,
        submissions
      }
    });
  } catch (error) {
    console.error('Error fetching graded submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch graded submissions',
      error: error.message
    });
  }
};
