import db from '../config/db.js';

/**
 * Student Question Bank Controller
 * Handles student operations for:
 * - Viewing assigned questions (MCQ/Coding)
 * - Submitting MCQ answers (auto-graded)
 * - Submitting coding solutions (manual grading)
 * - Viewing submission history
 */

// =====================================================
// GET ASSIGNED TASKS
// =====================================================

/**
 * Get all tasks assigned to student with question bank integration
 * Returns tasks that have questions assigned from question_bank
 * GET /api/student/question-bank/my-tasks
 */
export const getMyAssignedTasks = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Get student_id from user_id
    const [student] = await db.query(`
      SELECT student_id, first_name, last_name FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get all tasks with question assignments, filtering by skill completion
    const [tasks] = await db.query(`
      SELECT DISTINCT
        t.task_id,
        t.title as task_title,
        t.description as task_description,
        t.day,
        t.due_date,
        t.max_score,
        t.status as task_status,
        t.skill_filter,
        sc.course_name,
        sc.course_type,
        sc.skill_category,
        sc.supports_mcq,
        sc.supports_coding,
        tqa.question_id,
        tqa.assigned_at,
        tqa.attempt_number,
        tqa.is_active,
        qb.title as question_title,
        qb.question_type,
        qb.difficulty_level,
        qb.max_score as question_max_score,
        ss.submission_id,
        ss.status as submission_status,
        ss.grade,
        ss.submitted_at,
        ss.graded_at,
        ss.feedback,
        ss.is_reassigned,
        stsk.status as skill_status
      FROM task_question_assignments tqa
      INNER JOIN tasks t ON tqa.task_id = t.task_id
      INNER JOIN question_bank qb ON tqa.question_id = qb.question_id
      INNER JOIN skill_courses sc ON qb.course_id = sc.course_id
      LEFT JOIN student_submissions ss ON 
        ss.task_id = tqa.task_id 
        AND ss.student_id = tqa.student_id 
        AND ss.question_id = tqa.question_id
        AND ss.attempt_number = tqa.attempt_number
      LEFT JOIN student_skills stsk ON 
        stsk.student_id = tqa.student_id 
        AND stsk.course_name = t.skill_filter
      WHERE tqa.student_id = ?
        AND t.status = 'Active'
        AND tqa.is_active = 1
        AND (t.skill_filter IS NULL OR t.skill_filter = '' OR stsk.status IS NULL OR stsk.status != 'Cleared')
      ORDER BY t.due_date ASC, t.created_at DESC
    `, [student_id]);

    // Transform tasks to match frontend expectations
    const transformedTasks = tasks.map(t => ({
      task_id: t.task_id,
      skill_name: t.question_title || t.task_title,
      question_type: t.question_type,
      difficulty: t.difficulty_level,
      course_name: t.course_name,
      venue_name: null, // TODO: Add venue join if needed
      attempt_count: t.submission_id ? 1 : 0, // TODO: Count actual attempts
      best_score: t.grade || null,
      latest_score: t.grade || null,
      latest_status: t.submission_status || 'Not Started',
      latest_feedback: t.feedback,
      assigned_date: t.assigned_at
    }));

    // Group tasks by status for frontend tabs
    const pending = transformedTasks.filter(t => t.latest_status === 'Not Started');
    const in_progress = transformedTasks.filter(t => t.latest_status === 'Pending Review');
    const completed = transformedTasks.filter(t => ['Graded', 'Auto-Graded'].includes(t.latest_status));

    res.status(200).json({
      success: true,
      data: {
        pending,
        in_progress,
        completed
      }
    });
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned tasks',
      error: error.message
    });
  }
};

// =====================================================
// GET TASK QUESTION DETAILS
// =====================================================

/**
 * Get specific question details for a task
 * Hides correct answers for MCQ questions
 * GET /api/student/question-bank/task/:taskId/question
 */
export const getTaskQuestion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.user_id;

    // Get student_id
    const [student] = await db.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get assigned question for this task
    const [assignment] = await db.query(`
      SELECT 
        tqa.assignment_id,
        tqa.question_id,
        tqa.assigned_at,
        tqa.attempt_number,
        qb.title,
        qb.description,
        qb.question_type,
        qb.difficulty_level,
        qb.max_score,
        qb.time_limit_minutes,
        qb.hints,
        qb.mcq_options,
        qb.mcq_explanation,
        qb.coding_starter_code,
        qb.coding_language_support,
        qb.coding_expected_output,
        sc.course_name,
        sc.skill_category,
        t.title as task_title,
        t.due_date
      FROM task_question_assignments tqa
      INNER JOIN question_bank qb ON tqa.question_id = qb.question_id
      INNER JOIN skill_courses sc ON qb.course_id = sc.course_id
      INNER JOIN tasks t ON tqa.task_id = t.task_id
      WHERE tqa.task_id = ?
        AND tqa.student_id = ?
        AND tqa.is_active = 1
      LIMIT 1
    `, [taskId, student_id]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No question assigned for this task'
      });
    }

    const question = assignment[0];

    // Check if already submitted
    const [submission] = await db.query(`
      SELECT 
        submission_id,
        submission_type,
        mcq_selected_answer,
        coding_content,
        programming_language,
        status,
        grade,
        submitted_at,
        graded_at,
        feedback,
        is_reassigned
      FROM student_submissions
      WHERE task_id = ?
        AND student_id = ?
        AND question_id = ?
        AND attempt_number = ?
    `, [taskId, student_id, question.question_id, question.attempt_number]);

    // Parse MCQ options if exists (hide correct answer)
    let mcq_options = null;
    if (question.question_type === 'mcq' && question.mcq_options) {
      try {
        mcq_options = JSON.parse(question.mcq_options);
        // Never send the correct answer to frontend
        delete question.mcq_correct_answer;
      } catch (err) {
        console.error('Error parsing MCQ options:', err);
      }
    }

    // Parse coding language support
    let languages = [];
    if (question.question_type === 'coding' && question.coding_language_support) {
      languages = question.coding_language_support.split(',').map(lang => lang.trim());
    }

    res.status(200).json({
      success: true,
      data: {
        assignment: {
          assignment_id: question.assignment_id,
          question_id: question.question_id,
          task_title: question.task_title,
          due_date: question.due_date,
          assigned_at: question.assigned_at,
          attempt_number: question.attempt_number
        },
        question: {
          title: question.title,
          description: question.description,
          question_type: question.question_type,
          difficulty_level: question.difficulty_level,
          max_score: question.max_score,
          time_limit_minutes: question.time_limit_minutes,
          hints: question.hints,
          course_name: question.course_name,
          skill_category: question.skill_category,
          // MCQ specific
          mcq_options,
          mcq_explanation: null, // Only show after submission
          // Coding specific
          coding_starter_code: question.coding_starter_code,
          supported_languages: languages,
          coding_expected_output: question.coding_expected_output
        },
        submission: submission.length > 0 ? {
          submission_id: submission[0].submission_id,
          submission_type: submission[0].submission_type,
          mcq_selected_answer: submission[0].mcq_selected_answer,
          coding_content: submission[0].coding_content,
          programming_language: submission[0].programming_language,
          status: submission[0].status,
          grade: submission[0].grade,
          submitted_at: submission[0].submitted_at,
          graded_at: submission[0].graded_at,
          feedback: submission[0].feedback,
          is_reassigned: submission[0].is_reassigned
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching task question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question details',
      error: error.message
    });
  }
};

// =====================================================
// SUBMIT MCQ ANSWER (AUTO-GRADED)
// =====================================================

/**
 * Submit MCQ answer - Auto-graded instantly
 * POST /api/student/question-bank/submit-mcq
 * Body: { task_id, selected_answer, time_taken_minutes }
 */
export const submitMCQAnswer = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { task_id, selected_answer, time_taken_minutes } = req.body;
    const user_id = req.user.user_id;

    // Validation
    if (!task_id || !selected_answer) {
      return res.status(400).json({
        success: false,
        message: 'Task ID and selected answer are required'
      });
    }

    // Get student_id
    const [student] = await connection.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get assigned question and correct answer
    const [assignment] = await connection.query(`
      SELECT 
        tqa.question_id,
        tqa.attempt_number,
        qb.mcq_correct_answer,
        qb.max_score,
        qb.question_type,
        qb.mcq_explanation
      FROM task_question_assignments tqa
      INNER JOIN question_bank qb ON tqa.question_id = qb.question_id
      WHERE tqa.task_id = ?
        AND tqa.student_id = ?
        AND tqa.is_active = 1
        AND qb.question_type = 'mcq'
    `, [task_id, student_id]);

    if (assignment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active MCQ assignment found for this task'
      });
    }

    const question = assignment[0];

    // Check if already submitted
    const [existing] = await connection.query(`
      SELECT submission_id FROM student_submissions
      WHERE task_id = ? AND student_id = ? AND attempt_number = ?
    `, [task_id, student_id, question.attempt_number]);

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this MCQ'
      });
    }

    // Get student's current venue
    const [venueData] = await connection.query(`
      SELECT v.venue_id
      FROM students s
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE s.student_id = ? AND gs.status = 'Active'
      LIMIT 1
    `, [student_id]);

    const current_venue_id = venueData.length > 0 ? venueData[0].venue_id : null;

    // Auto-grade: Compare selected answer with correct answer
    const is_correct = selected_answer.toUpperCase() === question.mcq_correct_answer.toUpperCase();
    const grade = is_correct ? question.max_score : 0;

    // Insert submission with auto-grade
    const [result] = await connection.query(`
      INSERT INTO student_submissions (
        task_id,
        student_id,
        question_id,
        current_venue_id,
        submission_type,
        mcq_selected_answer,
        mcq_is_correct,
        submitted_at,
        time_taken_minutes,
        attempt_number,
        status,
        grade,
        max_score,
        graded_at,
        is_reassigned
      ) VALUES (?, ?, ?, ?, 'mcq', ?, ?, NOW(), ?, ?, 'Auto-Graded', ?, ?, NOW(), ?)
    `, [
      task_id,
      student_id,
      question.question_id,
      current_venue_id,
      selected_answer.toUpperCase(),
      is_correct ? 1 : 0,
      time_taken_minutes || null,
      question.attempt_number,
      grade,
      question.max_score,
      grade < 50 ? 1 : 0 // Auto-reassign if failed
    ]);

    // If failed (< 50%), mark assignment as inactive and create new attempt
    if (grade < 50) {
      await connection.query(`
        UPDATE task_question_assignments
        SET is_active = 0
        WHERE task_id = ? AND student_id = ? AND attempt_number = ?
      `, [task_id, student_id, question.attempt_number]);

      // Create new assignment for reattempt (could be same or different question)
      await connection.query(`
        INSERT INTO task_question_assignments (
          task_id,
          student_id,
          question_id,
          attempt_number,
          is_active
        ) VALUES (?, ?, ?, ?, 1)
      `, [task_id, student_id, question.question_id, question.attempt_number + 1]);
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: is_correct ? 'Correct answer! Well done!' : 'Incorrect answer. Please try again.',
      data: {
        submission_id: result.insertId,
        is_correct,
        grade,
        max_score: question.max_score,
        explanation: question.mcq_explanation,
        needs_reattempt: grade < 50,
        new_attempt_number: grade < 50 ? question.attempt_number + 1 : null
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting MCQ answer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit MCQ answer',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// =====================================================
// SUBMIT CODING SOLUTION (MANUAL GRADING)
// =====================================================

/**
 * Submit coding solution - Requires manual faculty grading
 * POST /api/student/question-bank/submit-code
 * Body: { task_id, code_content, programming_language, time_taken_minutes }
 */
export const submitCodingSolution = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { task_id, code_content, programming_language, time_taken_minutes } = req.body;
    const user_id = req.user.user_id;

    // Validation
    if (!task_id || !code_content || !programming_language) {
      return res.status(400).json({
        success: false,
        message: 'Task ID, code content, and programming language are required'
      });
    }

    // Get student_id
    const [student] = await connection.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get assigned question
    const [assignment] = await connection.query(`
      SELECT 
        tqa.question_id,
        tqa.attempt_number,
        qb.max_score,
        qb.question_type,
        qb.coding_language_support
      FROM task_question_assignments tqa
      INNER JOIN question_bank qb ON tqa.question_id = qb.question_id
      WHERE tqa.task_id = ?
        AND tqa.student_id = ?
        AND tqa.is_active = 1
        AND qb.question_type = 'coding'
    `, [task_id, student_id]);

    if (assignment.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active coding assignment found for this task'
      });
    }

    const question = assignment[0];

    // Verify language is supported
    const supportedLanguages = question.coding_language_support.split(',').map(lang => lang.trim().toLowerCase());
    if (!supportedLanguages.includes(programming_language.toLowerCase())) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Language ${programming_language} is not supported for this question`
      });
    }

    // Check if already submitted
    const [existing] = await connection.query(`
      SELECT submission_id FROM student_submissions
      WHERE task_id = ? AND student_id = ? AND attempt_number = ?
    `, [task_id, student_id, question.attempt_number]);

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already submitted code for this task'
      });
    }

    // Get student's current venue
    const [venueData] = await connection.query(`
      SELECT v.venue_id
      FROM students s
      INNER JOIN group_students gs ON s.student_id = gs.student_id
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE s.student_id = ? AND gs.status = 'Active'
      LIMIT 1
    `, [student_id]);

    const current_venue_id = venueData.length > 0 ? venueData[0].venue_id : null;

    // Insert submission (awaiting manual grading)
    const [result] = await connection.query(`
      INSERT INTO student_submissions (
        task_id,
        student_id,
        question_id,
        current_venue_id,
        submission_type,
        coding_content,
        programming_language,
        submitted_at,
        time_taken_minutes,
        attempt_number,
        status,
        max_score
      ) VALUES (?, ?, ?, ?, 'coding', ?, ?, NOW(), ?, ?, 'Pending Review', ?)
    `, [
      task_id,
      student_id,
      question.question_id,
      current_venue_id,
      code_content,
      programming_language,
      time_taken_minutes || null,
      question.attempt_number,
      question.max_score
    ]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Code submitted successfully! Awaiting faculty review.',
      data: {
        submission_id: result.insertId,
        status: 'Pending Review',
        submitted_at: new Date()
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting coding solution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit coding solution',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// =====================================================
// GET SUBMISSION HISTORY
// =====================================================

/**
 * Get all submissions for a specific task (including past attempts)
 * GET /api/student/question-bank/my-submissions/:taskId
 */
export const getMySubmissionHistory = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user_id = req.user.user_id;

    // Get student_id
    const [student] = await db.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get all submissions for this task
    const [submissions] = await db.query(`
      SELECT 
        ss.submission_id,
        ss.submission_type,
        ss.mcq_selected_answer,
        ss.mcq_is_correct,
        ss.coding_content,
        ss.programming_language,
        ss.submitted_at,
        ss.time_taken_minutes,
        ss.attempt_number,
        ss.status,
        ss.grade,
        ss.max_score,
        ss.feedback,
        ss.graded_at,
        ss.is_reassigned,
        qb.title as question_title,
        qb.question_type,
        qb.difficulty_level,
        qb.mcq_explanation,
        f.first_name as graded_by_first_name,
        f.last_name as graded_by_last_name
      FROM student_submissions ss
      INNER JOIN question_bank qb ON ss.question_id = qb.question_id
      LEFT JOIN faculties f ON ss.graded_by = f.faculty_id
      WHERE ss.task_id = ?
        AND ss.student_id = ?
      ORDER BY ss.attempt_number DESC, ss.submitted_at DESC
    `, [taskId, student_id]);

    res.status(200).json({
      success: true,
      data: {
        task_id: taskId,
        total_attempts: submissions.length,
        submissions
      }
    });
  } catch (error) {
    console.error('Error fetching submission history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission history',
      error: error.message
    });
  }
};

// =====================================================
// CODE EXECUTION (TEST RUN)
// =====================================================

/**
 * Execute code for testing (without submitting)
 * This is a placeholder - actual execution would need a sandboxed environment
 * POST /api/student/question-bank/execute-code
 * Body: { task_id, code_content, programming_language }
 */
export const executeCode = async (req, res) => {
  try {
    const { task_id, code_content, programming_language } = req.body;
    const user_id = req.user.user_id;

    // Validation
    if (!task_id || !code_content || !programming_language) {
      return res.status(400).json({
        success: false,
        message: 'Task ID, code content, and programming language are required'
      });
    }

    // Get student_id
    const [student] = await db.query(`
      SELECT student_id FROM students WHERE user_id = ?
    `, [user_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const student_id = student[0].student_id;

    // Get question_id
    const [assignment] = await db.query(`
      SELECT question_id FROM task_question_assignments
      WHERE task_id = ? AND student_id = ? AND is_active = 1
    `, [task_id, student_id]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active assignment found'
      });
    }

    const question_id = assignment[0].question_id;

    // Log execution attempt (for analytics)
    await db.query(`
      INSERT INTO code_execution_history (
        task_id,
        student_id,
        question_id,
        code_content,
        programming_language,
        execution_result,
        is_successful
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      task_id,
      student_id,
      question_id,
      code_content,
      programming_language,
      'Code execution feature requires sandboxed environment',
      null
    ]);

    // TODO: Implement actual code execution using:
    // - Docker containers for sandboxing
    // - Judge0 API for code execution
    // - AWS Lambda for serverless execution
    // For now, return placeholder response

    res.status(200).json({
      success: true,
      message: 'Code execution feature coming soon! For now, please submit your code for faculty review.',
      data: {
        note: 'Actual code execution requires a sandboxed environment setup',
        suggestion: 'Test your code locally and submit when ready'
      }
    });
  } catch (error) {
    console.error('Error executing code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute code',
      error: error.message
    });
  }
};
