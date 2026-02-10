import db from '../config/db.js';

/**
 * Question Bank Controller
 * Handles admin operations for creating and managing questions (MCQ + Coding)
 * for different skill courses
 */

// =====================================================
// COURSE MANAGEMENT
// =====================================================

/**
 * Get all skill courses
 * GET /api/question-bank/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const [courses] = await db.execute(`
      SELECT 
        sc.course_id,
        sc.course_name,
        sc.course_type,
        sc.skill_category,
        sc.course_level,
        sc.supports_mcq,
        sc.supports_coding,
        sc.description,
        sc.status,
        sc.created_at,
        sc.updated_at,
        COUNT(qb.question_id) as total_questions,
        SUM(CASE WHEN qb.question_type = 'mcq' THEN 1 ELSE 0 END) as mcq_count,
        SUM(CASE WHEN qb.question_type = 'coding' THEN 1 ELSE 0 END) as coding_count
      FROM skill_courses sc
      LEFT JOIN question_bank qb ON sc.course_id = qb.course_id AND qb.status = 'Active'
      WHERE sc.status = 'Active'
      GROUP BY sc.course_id
      ORDER BY sc.course_name
    `);

    res.status(200).json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message
    });
  }
};

/**
 * Get single course by ID
 * GET /api/question-bank/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [courses] = await db.execute(`
      SELECT * FROM skill_courses
      WHERE course_id = ?
    `, [id]);

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: courses[0]
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course',
      error: error.message
    });
  }
};

/**
 * Create new skill course
 * POST /api/question-bank/courses
 */
export const createCourse = async (req, res) => {
  try {
    const {
      course_name,
      course_type,
      skill_category,
      course_level,
      supports_mcq,
      supports_coding,
      description
    } = req.body;

    // Validation
    if (!course_name || !course_type || !skill_category) {
      return res.status(400).json({
        success: false,
        message: 'Course name, type, and category are required'
      });
    }

    // Check if course already exists
    const [existing] = await db.execute(`
      SELECT course_id FROM skill_courses
      WHERE course_name = ? AND course_type = ?
    `, [course_name, course_type]);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Course with this name and type already exists'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO skill_courses (
        course_name, course_type, skill_category, course_level,
        supports_mcq, supports_coding, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
    `, [
      course_name,
      course_type,
      skill_category,
      course_level || 'beginner',
      supports_mcq || 1,
      supports_coding || 0,
      description || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course_id: result.insertId,
        course_name,
        course_type,
        skill_category
      }
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course',
      error: error.message
    });
  }
};

/**
 * Update skill course
 * PUT /api/question-bank/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course_name,
      course_type,
      skill_category,
      course_level,
      supports_mcq,
      supports_coding,
      description,
      status
    } = req.body;

    // Check if course exists
    const [existing] = await db.execute(`
      SELECT course_id FROM skill_courses WHERE course_id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await db.execute(`
      UPDATE skill_courses
      SET 
        course_name = COALESCE(?, course_name),
        course_type = COALESCE(?, course_type),
        skill_category = COALESCE(?, skill_category),
        course_level = COALESCE(?, course_level),
        supports_mcq = COALESCE(?, supports_mcq),
        supports_coding = COALESCE(?, supports_coding),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?
    `, [
      course_name || null,
      course_type || null,
      skill_category || null,
      course_level || null,
      supports_mcq !== undefined ? supports_mcq : null,
      supports_coding !== undefined ? supports_coding : null,
      description || null,
      status || null,
      id
    ]);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully'
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course',
      error: error.message
    });
  }
};

/**
 * Delete skill course (soft delete)
 * DELETE /api/question-bank/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if course has questions
    const [questions] = await db.execute(`
      SELECT COUNT(*) as count FROM question_bank
      WHERE course_id = ?
    `, [id]);

    if (questions[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete course with ${questions[0].count} existing questions`
      });
    }

    await db.execute(`
      UPDATE skill_courses
      SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?
    `, [id]);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course',
      error: error.message
    });
  }
};

// =====================================================
// QUESTION MANAGEMENT
// =====================================================

/**
 * Get all questions with filters
 * GET /api/question-bank/questions
 */
export const getAllQuestions = async (req, res) => {
  try {
    const {
      course_id,
      question_type,
      difficulty_level,
      status,
      search
    } = req.query;

    let query = `
      SELECT 
        qb.question_id,
        qb.course_id,
        sc.course_name,
        sc.skill_category,
        qb.title,
        qb.description,
        qb.question_type,
        qb.difficulty_level,
        qb.mcq_options,
        qb.mcq_correct_answer,
        qb.mcq_explanation,
        qb.coding_starter_code,
        qb.coding_language_support,
        qb.coding_test_cases,
        qb.coding_expected_output,
        qb.sample_image,
        qb.max_score,
        qb.time_limit_minutes,
        qb.hints,
        qb.status,
        qb.created_at,
        qb.updated_at,
        f.user_id,
        u.name as creator_name
      FROM question_bank qb
      JOIN skill_courses sc ON qb.course_id = sc.course_id
      LEFT JOIN faculties f ON qb.created_by = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (course_id) {
      query += ` AND qb.course_id = ?`;
      params.push(course_id);
    }

    if (question_type) {
      query += ` AND qb.question_type = ?`;
      params.push(question_type);
    }

    if (difficulty_level) {
      query += ` AND qb.difficulty_level = ?`;
      params.push(difficulty_level);
    }

    if (status) {
      query += ` AND qb.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (qb.title LIKE ? OR qb.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY qb.created_at DESC`;

    const [questions] = await db.execute(query, params);

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
};

/**
 * Get single question by ID with full details
 * GET /api/question-bank/questions/:id
 */
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [questions] = await db.execute(`
      SELECT 
        qb.*,
        sc.course_name,
        sc.skill_category,
        sc.supports_mcq,
        sc.supports_coding,
        f.user_id,
        u.name as creator_name
      FROM question_bank qb
      JOIN skill_courses sc ON qb.course_id = sc.course_id
      LEFT JOIN faculties f ON qb.created_by = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE qb.question_id = ?
    `, [id]);

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const question = questions[0];

    // Parse JSON fields
    if (question.mcq_options) {
      try {
        question.mcq_options = JSON.parse(question.mcq_options);
      } catch (e) {
        question.mcq_options = null;
      }
    }

    if (question.coding_test_cases) {
      try {
        question.coding_test_cases = JSON.parse(question.coding_test_cases);
      } catch (e) {
        question.coding_test_cases = null;
      }
    }

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch question',
      error: error.message
    });
  }
};

/**
 * Create new question (MCQ or Coding)
 * POST /api/question-bank/questions
 */
export const createQuestion = async (req, res) => {
  try {
    const {
      course_id,
      title,
      description,
      question_type,
      difficulty_level,
      // MCQ fields
      mcq_options,
      mcq_correct_answer,
      mcq_explanation,
      // Coding fields
      coding_starter_code,
      coding_language_support,
      coding_test_cases,
      coding_expected_output,
      // Common fields
      max_score,
      time_limit_minutes,
      hints,
      status
    } = req.body;

    // Get uploaded file path (if any) - normalize to forward slashes
    const sample_image = req.file ? req.file.path.replace(/\\/g, '/') : null;

    // Validation
    if (!course_id || !title || !description || !question_type) {
      return res.status(400).json({
        success: false,
        message: 'Course, title, description, and question type are required'
      });
    }

    // Get user_id and find or create faculty_id
    const user_id = req.user.user_id;
    
    // Check if user is faculty
    let faculty_id = req.user.faculty_id;
    
    // If not faculty (e.g., admin), find or create a faculty record
    if (!faculty_id) {
      const [existingFaculty] = await db.execute(`
        SELECT faculty_id FROM faculties WHERE user_id = ?
      `, [user_id]);
      
      if (existingFaculty.length > 0) {
        faculty_id = existingFaculty[0].faculty_id;
      } else {
        // Create a faculty record for the admin user
        const [facultyResult] = await db.execute(`
          INSERT INTO faculties (user_id) VALUES (?)
        `, [user_id]);
        faculty_id = facultyResult.insertId;
      }
    }
    
    if (!faculty_id) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine user faculty record'
      });
    }

    // Verify course exists and supports this question type
    const [courses] = await db.execute(`
      SELECT supports_mcq, supports_coding
      FROM skill_courses
      WHERE course_id = ? AND status = 'Active'
    `, [course_id]);

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    const course = courses[0];

    // Validate question type support
    if (question_type === 'mcq' && !course.supports_mcq) {
      return res.status(400).json({
        success: false,
        message: 'This course does not support MCQ questions'
      });
    }

    if (question_type === 'coding' && !course.supports_coding) {
      return res.status(400).json({
        success: false,
        message: 'This course does not support Coding questions'
      });
    }

    // Additional validation for MCQ
    if (question_type === 'mcq') {
      if (!mcq_options || !mcq_correct_answer) {
        return res.status(400).json({
          success: false,
          message: 'MCQ questions require options and correct answer'
        });
      }
    }

    // Convert arrays/objects to JSON strings
    const mcqOptionsJson = mcq_options ? JSON.stringify(mcq_options) : null;
    const codingTestCasesJson = coding_test_cases ? JSON.stringify(coding_test_cases) : null;

    const [result] = await db.execute(`
      INSERT INTO question_bank (
        course_id, title, description, question_type, difficulty_level,
        mcq_options, mcq_correct_answer, mcq_explanation,
        coding_starter_code, coding_language_support, coding_test_cases, coding_expected_output, sample_image,
        max_score, time_limit_minutes, hints, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      course_id,
      title,
      description,
      question_type,
      difficulty_level || 'Medium',
      mcqOptionsJson,
      mcq_correct_answer || null,
      mcq_explanation || null,
      coding_starter_code || null,
      coding_language_support || 'javascript',
      codingTestCasesJson,
      coding_expected_output || null,
      sample_image,
      max_score || 100,
      time_limit_minutes || 30,
      hints || null,
      faculty_id,
      status || 'Active'
    ]);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        question_id: result.insertId,
        title,
        question_type
      }
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
};

/**
 * Update existing question
 * PUT /api/question-bank/questions/:id
 */
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course_id,
      title,
      description,
      question_type,
      difficulty_level,
      // MCQ fields
      mcq_options,
      mcq_correct_answer,
      mcq_explanation,
      // Coding fields
      coding_starter_code,
      coding_language_support,
      coding_test_cases,
      coding_expected_output,
      // Common fields
      max_score,
      time_limit_minutes,
      hints,
      status
    } = req.body;

    // Get uploaded file path (if any) - normalize to forward slashes
    const sample_image = req.file ? req.file.path.replace(/\\/g, '/') : undefined;

    // Check if question exists
    const [existing] = await db.execute(`
      SELECT question_id FROM question_bank WHERE question_id = ?
    `, [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Convert arrays/objects to JSON strings if provided
    const mcqOptionsJson = mcq_options ? JSON.stringify(mcq_options) : undefined;
    const codingTestCasesJson = coding_test_cases ? JSON.stringify(coding_test_cases) : undefined;

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (course_id !== undefined) {
      updates.push('course_id = ?');
      params.push(course_id);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (question_type !== undefined) {
      updates.push('question_type = ?');
      params.push(question_type);
    }
    if (difficulty_level !== undefined) {
      updates.push('difficulty_level = ?');
      params.push(difficulty_level);
    }
    if (mcqOptionsJson !== undefined) {
      updates.push('mcq_options = ?');
      params.push(mcqOptionsJson);
    }
    if (mcq_correct_answer !== undefined) {
      updates.push('mcq_correct_answer = ?');
      params.push(mcq_correct_answer);
    }
    if (mcq_explanation !== undefined) {
      updates.push('mcq_explanation = ?');
      params.push(mcq_explanation);
    }
    if (coding_starter_code !== undefined) {
      updates.push('coding_starter_code = ?');
      params.push(coding_starter_code);
    }
    if (coding_language_support !== undefined) {
      updates.push('coding_language_support = ?');
      params.push(coding_language_support);
    }
    if (codingTestCasesJson !== undefined) {
      updates.push('coding_test_cases = ?');
      params.push(codingTestCasesJson);
    }
    if (coding_expected_output !== undefined) {
      updates.push('coding_expected_output = ?');
      params.push(coding_expected_output);
    }
    if (sample_image !== undefined) {
      updates.push('sample_image = ?');
      params.push(sample_image);
    }
    if (max_score !== undefined) {
      updates.push('max_score = ?');
      params.push(max_score);
    }
    if (time_limit_minutes !== undefined) {
      updates.push('time_limit_minutes = ?');
      params.push(time_limit_minutes);
    }
    if (hints !== undefined) {
      updates.push('hints = ?');
      params.push(hints);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE question_bank SET ${updates.join(', ')} WHERE question_id = ?`;

    await db.execute(query, params);

    res.status(200).json({
      success: true,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
};

/**
 * Delete question (soft delete)
 * DELETE /api/question-bank/questions/:id
 */
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if question has submissions
    const [submissions] = await db.execute(`
      SELECT COUNT(*) as count FROM student_submissions
      WHERE question_id = ?
    `, [id]);

    if (submissions[0].count > 0) {
      // Soft delete if has submissions
      await db.execute(`
        UPDATE question_bank
        SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP
        WHERE question_id = ?
      `, [id]);

      return res.status(200).json({
        success: true,
        message: 'Question deactivated (has existing submissions)'
      });
    }

    // Hard delete if no submissions
    await db.execute(`
      DELETE FROM question_bank WHERE question_id = ?
    `, [id]);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
};

/**
 * Get questions by course
 * GET /api/question-bank/questions/by-course/:courseId
 */
export const getQuestionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { question_type } = req.query;

    let query = `
      SELECT 
        qb.question_id,
        qb.title,
        qb.question_type,
        qb.difficulty_level,
        qb.max_score,
        qb.time_limit_minutes,
        qb.status,
        qb.created_at
      FROM question_bank qb
      WHERE qb.course_id = ? AND qb.status = 'Active'
    `;

    const params = [courseId];

    if (question_type) {
      query += ` AND qb.question_type = ?`;
      params.push(question_type);
    }

    query += ` ORDER BY qb.created_at DESC`;

    const [questions] = await db.execute(query, params);

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Error fetching questions by course:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message
    });
  }
};

/**
 * Get statistics for dashboard
 * GET /api/question-bank/statistics
 */
export const getStatistics = async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_questions,
        SUM(CASE WHEN question_type = 'mcq' THEN 1 ELSE 0 END) as mcq_count,
        SUM(CASE WHEN question_type = 'coding' THEN 1 ELSE 0 END) as coding_count,
        SUM(CASE WHEN difficulty_level = 'Easy' THEN 1 ELSE 0 END) as easy_count,
        SUM(CASE WHEN difficulty_level = 'Medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN difficulty_level = 'Hard' THEN 1 ELSE 0 END) as hard_count,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count
      FROM question_bank
    `);

    const [courseStats] = await db.execute(`
      SELECT 
        sc.course_id,
        sc.course_name,
        sc.skill_category,
        COUNT(qb.question_id) as question_count
      FROM skill_courses sc
      LEFT JOIN question_bank qb ON sc.course_id = qb.course_id AND qb.status = 'Active'
      WHERE sc.status = 'Active'
      GROUP BY sc.course_id
      ORDER BY question_count DESC
    `);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0],
        by_course: courseStats
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// =====================================================
// QUESTION RESOURCE IMAGES (For student code usage)
// =====================================================

/**
 * Upload resource images for a question
 * POST /api/question-bank/questions/:id/resources
 * These are images students can use in their HTML/CSS code (e.g., travel page images)
 */
export const uploadResourceImages = async (req, res) => {
  try {
    const { id: questionId } = req.params;
    const files = req.files; // Multiple files from multer

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Verify question exists
    const [questions] = await db.execute(
      'SELECT question_id, title FROM question_bank WHERE question_id = ?',
      [questionId]
    );

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Get current max order
    const [maxOrder] = await db.execute(
      'SELECT MAX(display_order) as max_order FROM question_resource_images WHERE question_id = ?',
      [questionId]
    );
    let order = (maxOrder[0].max_order || 0) + 1;

    const uploadedResources = [];

    for (const file of files) {
      // Generate clean asset path for students to use
      const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
      const assetPath = `assets/images/${cleanFileName}`;
      
      // Get description from body if provided (for single file upload)
      const description = req.body.description || file.originalname.split('.')[0].replace(/[-_]/g, ' ');

      const [result] = await db.execute(`
        INSERT INTO question_resource_images 
        (question_id, file_name, file_path, asset_path, file_size, mime_type, description, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        questionId,
        file.originalname,
        file.path.replace(/\\/g, '/'),
        assetPath,
        file.size,
        file.mimetype,
        description,
        order++
      ]);

      uploadedResources.push({
        resource_id: result.insertId,
        file_name: file.originalname,
        asset_path: assetPath,
        description: description
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedResources.length} resource image(s) uploaded successfully`,
      data: uploadedResources
    });
  } catch (error) {
    console.error('Error uploading resource images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload resource images',
      error: error.message
    });
  }
};

/**
 * Get all resource images for a question
 * GET /api/question-bank/questions/:id/resources
 */
export const getResourceImages = async (req, res) => {
  try {
    const { id: questionId } = req.params;

    const [resources] = await db.execute(`
      SELECT 
        resource_id,
        file_name,
        file_path,
        asset_path,
        file_size,
        mime_type,
        description,
        display_order,
        created_at
      FROM question_resource_images
      WHERE question_id = ?
      ORDER BY display_order
    `, [questionId]);

    // Add full URL for preview
    const resourcesWithUrls = resources.map(r => ({
      ...r,
      preview_url: `/uploads/${r.file_path.replace(/\\/g, '/').replace('uploads/', '')}`
    }));

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resourcesWithUrls
    });
  } catch (error) {
    console.error('Error fetching resource images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource images',
      error: error.message
    });
  }
};

/**
 * Update a resource image (description, asset_path, order)
 * PUT /api/question-bank/resources/:resourceId
 */
export const updateResourceImage = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { description, asset_path, display_order } = req.body;

    const updates = [];
    const params = [];

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (asset_path !== undefined) {
      updates.push('asset_path = ?');
      params.push(asset_path);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(resourceId);

    await db.execute(`
      UPDATE question_resource_images
      SET ${updates.join(', ')}
      WHERE resource_id = ?
    `, params);

    res.status(200).json({
      success: true,
      message: 'Resource image updated successfully'
    });
  } catch (error) {
    console.error('Error updating resource image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resource image',
      error: error.message
    });
  }
};

/**
 * Delete a resource image
 * DELETE /api/question-bank/resources/:resourceId
 */
export const deleteResourceImage = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const fs = await import('fs');
    const path = await import('path');

    // Get file path before deleting
    const [resources] = await db.execute(
      'SELECT file_path FROM question_resource_images WHERE resource_id = ?',
      [resourceId]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource image not found'
      });
    }

    // Delete from database
    await db.execute(
      'DELETE FROM question_resource_images WHERE resource_id = ?',
      [resourceId]
    );

    // Try to delete the file (don't fail if file is missing)
    try {
      const filePath = resources[0].file_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.warn('Could not delete file:', fileErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Resource image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource image',
      error: error.message
    });
  }
};
