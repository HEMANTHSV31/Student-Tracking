// controllers/skillOrder.controller.js
import db from '../config/db.js';

// Get all skill orders (with venue and year associations)
export const getSkillOrders = async (req, res) => {
  try {
    const { course_type } = req.query;

    let query = `
      SELECT 
        so.id,
        so.course_type,
        so.skill_name,
        so.display_order,
        so.is_prerequisite,
        so.description,
        so.created_by,
        so.apply_to_all_venues,
        so.apply_to_all_years,
        u.name as created_by_name,
        so.created_at,
        so.updated_at
      FROM skill_order so
      LEFT JOIN faculties f ON so.created_by = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      WHERE 1=1
    `;
    
    const params = [];

    if (course_type) {
      query += ` AND so.course_type = ?`;
      params.push(course_type);
    }

    query += ` ORDER BY so.course_type, so.display_order ASC`;

    const [skillOrders] = await db.query(query, params);

    // Fetch associated venues and years for each skill order (if tables exist)
    for (const skillOrder of skillOrders) {
      try {
        // Get venues
        const [venues] = await db.query(`
          SELECT sov.venue_id, v.venue_name
          FROM skill_order_venues sov
          JOIN venue v ON sov.venue_id = v.venue_id
          WHERE sov.skill_order_id = ?
        `, [skillOrder.id]);
        
        skillOrder.venues = venues;

        // Get years
        const [years] = await db.query(`
          SELECT year
          FROM skill_order_years
          WHERE skill_order_id = ?
          ORDER BY year ASC
        `, [skillOrder.id]);
        
        skillOrder.years = years.map(y => y.year);
      } catch (err) {
        // Tables might not exist yet - set defaults
        skillOrder.venues = [];
        skillOrder.years = [];
        skillOrder.apply_to_all_venues = true;
        skillOrder.apply_to_all_years = true;
      }
    }

    res.status(200).json({
      success: true,
      data: skillOrders
    });
  } catch (error) {
    console.error('Error fetching skill orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill orders'
    });
  }
};

// Get skill order for a specific venue (filtered by venue and year)
export const getSkillOrderForVenue = async (req, res) => {
  try {
    const { venue_id } = req.params;
    const { course_type, year } = req.query;

    // Get student's current year if not provided
    let studentYear = year;
    if (!studentYear && req.user?.student_id) {
      const [student] = await db.query('SELECT year FROM students WHERE student_id = ?', [req.user.student_id]);
      if (student.length > 0) {
        studentYear = student[0].year;
      }
    }

    let query = `
      SELECT DISTINCT
        so.id,
        so.course_type,
        so.skill_name,
        so.display_order,
        so.is_prerequisite,
        so.description,
        so.apply_to_all_venues,
        so.apply_to_all_years
      FROM skill_order so
      WHERE (
        so.apply_to_all_venues = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_venues sov 
          WHERE sov.skill_order_id = so.id AND sov.venue_id = ?
        )
      )
    `;
    
    const params = [venue_id];

    // Filter by year if provided
    if (studentYear) {
      query += ` AND (
        so.apply_to_all_years = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_years soy 
          WHERE soy.skill_order_id = so.id AND soy.year = ?
        )
      )`;
      params.push(studentYear);
    }

    if (course_type) {
      query += ` AND so.course_type = ?`;
      params.push(course_type);
    }

    query += ` ORDER BY so.display_order ASC`;

    const [skillOrders] = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: skillOrders
    });
  } catch (error) {
    console.error('Error fetching skill order for venue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch skill order'
    });
  }
};

// Create a new skill order entry (with optional venue/year targeting)
export const createSkillOrder = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { 
      course_type, 
      skill_name, 
      display_order, 
      is_prerequisite, 
      description,
      venue_ids,  // Array of venue IDs
      years,       // Array of years (1,2,3,4)
      apply_to_all_venues,
      apply_to_all_years
    } = req.body;
    const user_id = req.user.user_id;

    if (!course_type || !skill_name) {
      return res.status(400).json({
        success: false,
        message: 'Course type and skill name are required'
      });
    }

    // Get faculty_id from user_id
    let created_by = null;
    const [faculty] = await connection.query('SELECT faculty_id FROM faculties WHERE user_id = ?', [user_id]);
    if (faculty.length > 0) {
      created_by = faculty[0].faculty_id;
    }

    // Check for duplicate
    const [existing] = await connection.query(`
      SELECT id FROM skill_order 
      WHERE course_type = ? AND skill_name = ?
    `, [course_type, skill_name]);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This skill already exists in the order for this course type'
      });
    }

    // Get max display_order if not provided
    let orderValue = display_order;
    if (!orderValue) {
      const [maxOrder] = await connection.query(`
        SELECT MAX(display_order) as max_order 
        FROM skill_order 
        WHERE course_type = ?
      `, [course_type]);
      orderValue = (maxOrder[0].max_order || 0) + 1;
    }

    await connection.beginTransaction();

    // Check if new columns exist
    let hasNewColumns = false;
    try {
      await connection.query('SELECT apply_to_all_venues FROM skill_order LIMIT 1');
      hasNewColumns = true;
    } catch (err) {
      // Columns don't exist yet
      hasNewColumns = false;
    }

    // Insert skill order
    let insertQuery, insertParams;
    if (hasNewColumns) {
      insertQuery = `
        INSERT INTO skill_order (
          course_type, 
          skill_name, 
          display_order, 
          is_prerequisite, 
          description, 
          created_by,
          apply_to_all_venues,
          apply_to_all_years
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      insertParams = [
        course_type, 
        skill_name, 
        orderValue, 
        is_prerequisite !== false ? 1 : 0, 
        description || null, 
        created_by,
        apply_to_all_venues !== false,
        apply_to_all_years !== false
      ];
    } else {
      insertQuery = `
        INSERT INTO skill_order (
          course_type, 
          skill_name, 
          display_order, 
          is_prerequisite, 
          description, 
          created_by
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      insertParams = [
        course_type, 
        skill_name, 
        orderValue, 
        is_prerequisite !== false ? 1 : 0, 
        description || null, 
        created_by
      ];
    }

    const [result] = await connection.query(insertQuery, insertParams);

    const skillOrderId = result.insertId;

    // Insert venue associations if specified (and tables exist)
    if (hasNewColumns && !apply_to_all_venues && venue_ids && Array.isArray(venue_ids) && venue_ids.length > 0) {
      try {
        for (const venueId of venue_ids) {
          await connection.query(
            'INSERT INTO skill_order_venues (skill_order_id, venue_id) VALUES (?, ?)',
            [skillOrderId, venueId]
          );
        }
      } catch (err) {
        console.log('skill_order_venues table not found, skipping venue associations');
      }
    }

    // Insert year associations if specified (and tables exist)
    if (hasNewColumns && !apply_to_all_years && years && Array.isArray(years) && years.length > 0) {
      try {
        for (const year of years) {
          await connection.query(
            'INSERT INTO skill_order_years (skill_order_id, year) VALUES (?, ?)',
            [skillOrderId, year]
          );
        }
      } catch (err) {
        console.log('skill_order_years table not found, skipping year associations');
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Skill order created successfully',
      data: { id: skillOrderId }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating skill order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create skill order'
    });
  } finally {
    connection.release();
  }
};

// Update skill order entry
export const updateSkillOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill_name, display_order, is_prerequisite, description } = req.body;

    const updates = [];
    const params = [];

    if (skill_name !== undefined) {
      updates.push('skill_name = ?');
      params.push(skill_name);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }
    if (is_prerequisite !== undefined) {
      updates.push('is_prerequisite = ?');
      params.push(is_prerequisite ? 1 : 0);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await db.query(`
      UPDATE skill_order SET ${updates.join(', ')} WHERE id = ?
    `, params);

    res.status(200).json({
      success: true,
      message: 'Skill order updated successfully'
    });
  } catch (error) {
    console.error('Error updating skill order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update skill order'
    });
  }
};

// Reorder skills (bulk update display_order)
export const reorderSkills = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { skills } = req.body; // Array of { id, display_order }

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Skills array is required'
      });
    }

    await connection.beginTransaction();

    for (const skill of skills) {
      await connection.query(
        'UPDATE skill_order SET display_order = ? WHERE id = ?',
        [skill.display_order, skill.id]
      );
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Skills reordered successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error reordering skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder skills'
    });
  } finally {
    connection.release();
  }
};

// Delete skill order entry
export const deleteSkillOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM skill_order WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Skill order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Skill order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete skill order'
    });
  }
};

// Get student's skill progression status (filtered by student's venue and year)
export const getStudentSkillProgression = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { course_type } = req.query;

    // Get student's venue and year
    const [student] = await db.query(`
      SELECT venue_id, year 
      FROM students 
      WHERE student_id = ?
    `, [student_id]);

    if (student.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const { venue_id, year } = student[0];

    // Get skill order filtered by student's venue and year
    let orderQuery = `
      SELECT DISTINCT
        so.id,
        so.skill_name,
        so.display_order,
        so.is_prerequisite,
        so.description
      FROM skill_order so
      WHERE (
        so.apply_to_all_venues = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_venues sov 
          WHERE sov.skill_order_id = so.id AND sov.venue_id = ?
        )
      )
      AND (
        so.apply_to_all_years = 1 
        OR EXISTS (
          SELECT 1 FROM skill_order_years soy 
          WHERE soy.skill_order_id = so.id AND soy.year = ?
        )
      )
    `;
    
    const orderParams = [venue_id, year];

    if (course_type) {
      orderQuery += ` AND so.course_type = ?`;
      orderParams.push(course_type);
    }

    orderQuery += ` ORDER BY so.display_order ASC`;

    const [skillOrders] = await db.query(orderQuery, orderParams);

    // Get student's skill status
    const [studentSkills] = await db.query(`
      SELECT 
        ss.course_name,
        ss.status,
        ss.best_score,
        ss.latest_score,
        ss.proficiency_level,
        ss.total_attempts
      FROM student_skills ss
      WHERE ss.student_id = ?
    `, [student_id]);

    // Create a map of student's cleared skills
    const clearedSkillsMap = new Map();
    studentSkills.forEach(skill => {
      if (skill.status === 'Cleared') {
        clearedSkillsMap.set(skill.course_name.toLowerCase().trim(), skill);
      }
    });

    // Determine progression status for each skill
    const progression = [];
    let previousCleared = true; // First skill is always unlocked

    for (const skill of skillOrders) {
      const skillNameLower = skill.skill_name.toLowerCase().trim();
      const isCleared = clearedSkillsMap.has(skillNameLower);
      const studentSkillData = clearedSkillsMap.get(skillNameLower);
      
      // A skill is locked if it requires prerequisite and previous skill is not cleared
      const isLocked = skill.is_prerequisite && !previousCleared;
      
      // A skill is "current" if it's not cleared but is unlocked
      const isCurrent = !isCleared && !isLocked;

      progression.push({
        skill_order_id: skill.id,
        skill_name: skill.skill_name,
        display_order: skill.display_order,
        is_prerequisite: skill.is_prerequisite,
        description: skill.description,
        status: isCleared ? 'Cleared' : (isLocked ? 'Locked' : 'Available'),
        is_cleared: isCleared,
        is_locked: isLocked,
        is_current: isCurrent,
        best_score: studentSkillData?.best_score || null,
        latest_score: studentSkillData?.latest_score || null,
        proficiency_level: studentSkillData?.proficiency_level || null,
        total_attempts: studentSkillData?.total_attempts || 0
      });

      previousCleared = isCleared;
    }

    res.status(200).json({
      success: true,
      data: {
        student_id: parseInt(student_id),
        course_type: course_type || 'all',
        progression
      }
    });
  } catch (error) {
    console.error('Error getting student skill progression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get skill progression'
    });
  }
};

// Get available skills for dropdown (from existing student_skills course_names)
export const getAvailableSkillNames = async (req, res) => {
  try {
    const [skills] = await db.query(`
      SELECT DISTINCT course_name as skill_name
      FROM student_skills
      WHERE course_name IS NOT NULL AND course_name != ''
      ORDER BY course_name
    `);

    // Also get unique skill_filter values from tasks
    const [taskSkills] = await db.query(`
      SELECT DISTINCT skill_filter as skill_name
      FROM tasks
      WHERE skill_filter IS NOT NULL AND skill_filter != ''
      ORDER BY skill_filter
    `);

    // Merge and deduplicate
    const allSkills = new Set([
      ...skills.map(s => s.skill_name),
      ...taskSkills.map(s => s.skill_name)
    ]);

    res.status(200).json({
      success: true,
      data: Array.from(allSkills).sort()
    });
  } catch (error) {
    console.error('Error getting available skill names:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get skill names'
    });
  }
};

// Update venue and year associations for a skill order
export const updateSkillOrderAssociations = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { id } = req.params;
    const { venue_ids, years, apply_to_all_venues, apply_to_all_years } = req.body;

    await connection.beginTransaction();

    // Update apply_to_all flags
    await connection.query(`
      UPDATE skill_order 
      SET apply_to_all_venues = ?, apply_to_all_years = ?
      WHERE id = ?
    `, [apply_to_all_venues !== false, apply_to_all_years !== false, id]);

    // Update venue associations
    await connection.query('DELETE FROM skill_order_venues WHERE skill_order_id = ?', [id]);
    if (!apply_to_all_venues && venue_ids && Array.isArray(venue_ids) && venue_ids.length > 0) {
      for (const venueId of venue_ids) {
        await connection.query(
          'INSERT INTO skill_order_venues (skill_order_id, venue_id) VALUES (?, ?)',
          [id, venueId]
        );
      }
    }

    // Update year associations
    await connection.query('DELETE FROM skill_order_years WHERE skill_order_id = ?', [id]);
    if (!apply_to_all_years && years && Array.isArray(years) && years.length > 0) {
      for (const year of years) {
        await connection.query(
          'INSERT INTO skill_order_years (skill_order_id, year) VALUES (?, ?)',
          [id, year]
        );
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Associations updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating associations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update associations'
    });
  } finally {
    connection.release();
  }
};

// Get unique course types from skill_order table
export const getCourseTypes = async (req, res) => {
  try {
    const [courseTypes] = await db.query(`
      SELECT DISTINCT course_type
      FROM skill_order
      WHERE course_type IS NOT NULL AND course_type != ''
      ORDER BY course_type
    `);

    res.status(200).json({
      success: true,
      data: courseTypes.map(ct => ct.course_type)
    });
  } catch (error) {
    console.error('Error getting course types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get course types'
    });
  }
};

// Validate course type (checks if it exists in skill_order table)
export const validateCourseType = async (req, res) => {
  try {
    const { course_type } = req.body;

    if (!course_type) {
      return res.status(400).json({
        success: false,
        message: 'Course type is required'
      });
    }

    // Check if course type exists in skill_order table
    const [existing] = await db.query(`
      SELECT COUNT(*) as count
      FROM skill_order
      WHERE course_type = ?
    `, [course_type]);

    if (existing[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'This course type already exists'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Course type is available'
    });
  } catch (error) {
    console.error('Error validating course type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate course type'
    });
  }
};
