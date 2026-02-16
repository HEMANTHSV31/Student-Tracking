import pool from '../config/db.js';

/**
 * Get coding submission details for faculty/admin review
 * This retrieves code_submissions data (from code_practice tasks)
 * GET /api/tasks/code-submission/:submission_id
 */
export const getCodingSubmissionDetail = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { submission_id } = req.params;

    // Get submission details with student info, task info, and code
    const [submissions] = await connection.execute(`
      SELECT 
        ss.submission_id,
        ss.task_id,
        ss.student_id,
        ss.submission_type,
        ss.auto_graded_score,
        ss.percentage,
        ss.grade,
        ss.status,
        ss.feedback,
        ss.attempt_number,
        ss.submitted_at,
        ss.graded_at,
        cs.combined_code,
        cs.html_code,
        cs.css_code,
        cs.js_code,
        t.title as task_title,
        t.description as task_description,
        t.max_score,
        t.question_type,
        u.name as student_name,
        u.email as student_email,
        u.ID as student_roll,
        grader.name as graded_by_name,
        v.venue_name
      FROM student_submissions ss
      LEFT JOIN code_submissions cs ON ss.submission_id = cs.submission_id
      JOIN tasks t ON ss.task_id = t.task_id
      JOIN students s ON ss.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
      LEFT JOIN faculties f ON ss.graded_by = f.faculty_id
      LEFT JOIN users grader ON f.user_id = grader.user_id
      LEFT JOIN venue v ON ss.current_venue_id = v.venue_id
      WHERE ss.submission_id = ?
    `, [submission_id]);

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const submission = submissions[0];

    // If MCQ, get individual answers
    if (submission.question_type === 'mcq') {
      const [mcqAnswers] = await connection.execute(`
        SELECT 
          ma.question_id,
          ma.selected_answer,
          ma.correct_answer,
          ma.is_correct,
          qb.title as question_text,
          qb.mcq_options
        FROM mcq_answers ma
        JOIN question_bank qb ON ma.question_id = qb.question_id
        WHERE ma.submission_id = ?
        ORDER BY ma.question_id
      `, [submission_id]);

      // Parse mcq_options JSON
      mcqAnswers.forEach(answer => {
        if (answer.mcq_options) {
          try {
            answer.mcq_options = JSON.parse(answer.mcq_options);
          } catch (e) {
            // Keep as is
          }
        }
      });

      submission.mcq_answers = mcqAnswers;
    }

    res.json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('Error fetching coding submission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching submission',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Grade coding submission
 * PUT /api/tasks/code-submission/:submission_id/grade
 */
export const gradeCodingSubmission = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { submission_id } = req.params;
    const { grade, feedback, status } = req.body;
    const user_id = req.user.user_id;

    // Get faculty_id
    const [facultyResult] = await connection.execute(
      'SELECT faculty_id FROM faculties WHERE user_id = ?',
      [user_id]
    );

    if (facultyResult.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const faculty_id = facultyResult[0].faculty_id;

    // Get submission and task details
    const [submissionData] = await connection.execute(
      'SELECT task_id, student_id FROM student_submissions WHERE submission_id = ?',
      [submission_id]
    );

    if (submissionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const { task_id, student_id } = submissionData[0];

    // Get task max_score
    const [taskData] = await connection.execute(
      'SELECT max_score FROM tasks WHERE task_id = ?',
      [task_id]
    );

    const max_score = taskData[0]?.max_score || 100;

    await connection.beginTransaction();

    // Update student_submissions
    const finalStatus = status || (grade >= max_score * 0.5 ? 'Graded' : 'Needs Revision');
    
    await connection.execute(`
      UPDATE student_submissions 
      SET grade = ?, feedback = ?, status = ?, graded_at = NOW(), graded_by = ?
      WHERE submission_id = ?
    `, [grade, feedback || null, finalStatus, faculty_id, submission_id]);

    // Update task_submissions
    await connection.execute(`
      UPDATE task_submissions 
      SET grade = ?, feedback = ?, status = ?, graded_at = NOW(), graded_by = ?
      WHERE task_id = ? AND student_id = ?
    `, [grade, feedback || null, finalStatus, faculty_id, task_id, student_id]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Submission graded successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error grading coding submission:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while grading submission',
      error: error.message
    });
  } finally {
    connection.release();
  }
};
