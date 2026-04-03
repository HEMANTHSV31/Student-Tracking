import db from '../config/db.js';
import xlsx from 'xlsx';

const columnExistsCache = new Map();

async function columnExists(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  // Only trust cached TRUE — a cached FALSE may be stale after migration
  if (columnExistsCache.get(cacheKey) === true) {
    return true;
  }

  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  const exists = rows.length > 0;
  if (exists) {
    columnExistsCache.set(cacheKey, true);
  }
  return exists;
}

async function ensureLocationColumn() {
  if (await columnExists('assessment_venues', 'location')) return;
  await db.query(
    'ALTER TABLE assessment_venues ADD COLUMN location VARCHAR(255) DEFAULT NULL AFTER venue_name'
  );
  columnExistsCache.set('assessment_venues.location', true);
}

const COURSE_SPEC_TABLE = 'assessment_student_course_specs';

const COURSE_SPEC_HEADERS = {
  reg_no: ['Reg. No.', 'Reg No.', 'Reg No', 'Registration Number', 'Register Number'],
  enroll_no: ['Enroll No.', 'Enroll No', 'Enrollment No', 'Enrollment Number'],
  student_name: ['Student Name', 'Name'],
  email_id: ['Email ID', 'Email', 'Mail'],
  dept: ['Dept', 'Department'],
  course_22xx601: ['22XX601'],
  course_22xx602: ['22XX602'],
  course_22xx603: ['22XX603'],
  course_22xx604: ['22XX604'],
  professional_elective_iii: ['PROFESSIONAL ELECTIVE III'],
  professional_elective_iv: ['PROFESSIONAL ELECTIVE IV'],
  professional_elective_v_open: ['PROFESSIONAL ELECTIVE V / OPEN ELECTIVE', 'PROFESSIONAL ELECTIVE V OPEN ELECTIVE'],
  add_on: ['ADD ON', 'ADD-ON'],
  honours_or_minors_status: ['Honours or Minors Status', 'Honors or Minors Status'],
  honours_minors_3: ['HONOURS / MINORS 3', 'HONORS / MINORS 3'],
  honours_minors_4: ['HONOURS / MINORS 4', 'HONORS / MINORS 4'],
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeCell = (value) => (value === null || value === undefined ? '' : String(value).trim());

const pickFromRow = (row, aliases) => {
  const normalizedAliasSet = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliasSet.has(normalizeHeader(key))) {
      return normalizeCell(value);
    }
  }
  return '';
};

async function ensureCourseSpecsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${COURSE_SPEC_TABLE} (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      year TINYINT UNSIGNED NOT NULL DEFAULT 1,
      user_id INT NULL,
      reg_no VARCHAR(50) NOT NULL,
      enroll_no VARCHAR(50) NULL,
      student_name VARCHAR(255) NULL,
      email_id VARCHAR(255) NULL,
      dept VARCHAR(100) NULL,
      course_22xx601 VARCHAR(255) NULL,
      course_22xx602 VARCHAR(255) NULL,
      course_22xx603 VARCHAR(255) NULL,
      course_22xx604 VARCHAR(255) NULL,
      professional_elective_iii VARCHAR(255) NULL,
      professional_elective_iv VARCHAR(255) NULL,
      professional_elective_v_open VARCHAR(255) NULL,
      add_on VARCHAR(255) NULL,
      honours_or_minors_status VARCHAR(255) NULL,
      honours_minors_3 VARCHAR(255) NULL,
      honours_minors_4 VARCHAR(255) NULL,
      raw_subject_data LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_assessment_student_course_specs_year_reg_no (year, reg_no),
      KEY idx_assessment_student_course_specs_year (year),
      KEY idx_assessment_student_course_specs_user_id (user_id),
      KEY idx_assessment_student_course_specs_dept (dept)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await columnExists(COURSE_SPEC_TABLE, 'year'))) {
    await db.query(`ALTER TABLE ${COURSE_SPEC_TABLE} ADD COLUMN year TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER id`);
    columnExistsCache.set(`${COURSE_SPEC_TABLE}.year`, true);
  }

  const [stats] = await db.query(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     GROUP BY INDEX_NAME`,
    [COURSE_SPEC_TABLE]
  );

  const indexMap = new Map(stats.map((row) => [row.INDEX_NAME, row.cols]));
  const hasLegacyUniqueRegNo = indexMap.get('uq_assessment_student_course_specs_reg_no') === 'reg_no';
  const hasYearRegNoUnique = indexMap.get('uq_assessment_student_course_specs_year_reg_no') === 'year,reg_no';

  if (hasLegacyUniqueRegNo) {
    await db.query(`ALTER TABLE ${COURSE_SPEC_TABLE} DROP INDEX uq_assessment_student_course_specs_reg_no`);
  }

  if (!hasYearRegNoUnique) {
    await db.query(
      `ALTER TABLE ${COURSE_SPEC_TABLE}
       ADD UNIQUE KEY uq_assessment_student_course_specs_year_reg_no (year, reg_no)`
    );
  }

  if (!indexMap.has('idx_assessment_student_course_specs_year')) {
    await db.query(
      `ALTER TABLE ${COURSE_SPEC_TABLE}
       ADD KEY idx_assessment_student_course_specs_year (year)`
    );
  }
}

async function ensureCourseColumnsMetaTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS assessment_course_columns_meta (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      year TINYINT UNSIGNED NOT NULL,
      column_name VARCHAR(255) NOT NULL,
      column_label VARCHAR(255) NOT NULL,
      column_order INT UNSIGNED NOT NULL DEFAULT 999,
      is_custom BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_year_column_name (year, column_name),
      KEY idx_year (year),
      KEY idx_column_order (year, column_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

const METADATA_COLUMNS = ['Year', 'Reg. No.', 'Reg No.', 'Reg No', 'Registration Number', 'Register Number', 'Enroll No.', 'Enroll No', 'Enrollment No', 'Enrollment Number', 'Student Name', 'Name', 'Email ID', 'Email', 'Mail', 'Dept', 'Department'];

function detectDynamicColumns(rows) {
  if (!rows || rows.length === 0) return [];
  
  const firstRow = rows[0];
  const allColumns = Object.keys(firstRow);
  
  // Filter out metadata columns
  const metadataSet = new Set(METADATA_COLUMNS.map(normalizeHeader));
  const dynamicColumns = allColumns.filter(col => !metadataSet.has(normalizeHeader(col)));
  
  return dynamicColumns;
}

// ─────────────────────────────────────────────────────────────────────
//  Assessment Venues
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/ */
export const getAllVenues = async (req, res) => {
  try {
    await ensureLocationColumn();
    
    const [venues] = await db.query(`
      SELECT id, venue_name, location, rows_count, columns_count, total_capacity, status, created_at
      FROM assessment_venues
      WHERE deleted_at IS NULL
      ORDER BY venue_name ASC
    `);
    
    res.json({ success: true, data: venues });
  } catch (error) {
    console.error('Error fetching assessment venues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch venues' });
  }
};

/** POST /api/assessment-venues/ */
export const createVenue = async (req, res) => {
  try {
    const { venue_name, location, rows_count, columns_count } = req.body;

    if (!venue_name || !rows_count || !columns_count) {
      return res.status(400).json({ success: false, message: 'Venue name, rows and columns are required' });
    }
    if (rows_count < 1 || rows_count > 26) {
      return res.status(400).json({ success: false, message: 'Rows must be between 1 and 26' });
    }
    if (columns_count < 1 || columns_count > 60) {
      return res.status(400).json({ success: false, message: 'Columns must be between 1 and 60' });
    }

    // Check duplicate name
    const [existing] = await db.query(
      'SELECT id FROM assessment_venues WHERE venue_name = ? AND deleted_at IS NULL',
      [venue_name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Venue "${venue_name}" already exists` });
    }

    await ensureLocationColumn();
    
    const [result] = await db.query(
      'INSERT INTO assessment_venues (venue_name, location, rows_count, columns_count) VALUES (?, ?, ?, ?)',
      [venue_name.trim(), (location || '').trim(), parseInt(rows_count), parseInt(columns_count)]
    );

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: {
        id: result.insertId,
        venue_name: venue_name.trim(),
        location: (location || '').trim(),
        rows_count: parseInt(rows_count),
        columns_count: parseInt(columns_count),
        total_capacity: parseInt(rows_count) * parseInt(columns_count),
        status: 'Active',
      },
    });
  } catch (error) {
    console.error('Error creating assessment venue:', error);
    res.status(500).json({ success: false, message: 'Failed to create venue' });
  }
};

/** PUT /api/assessment-venues/:id */
export const updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { venue_name, location, rows_count, columns_count } = req.body;

    if (!venue_name || !rows_count || !columns_count) {
      return res.status(400).json({ success: false, message: 'Venue name, rows and columns are required' });
    }

    // Check duplicate name (excluding current)
    const [dup] = await db.query(
      'SELECT id FROM assessment_venues WHERE venue_name = ? AND id != ? AND deleted_at IS NULL',
      [venue_name.trim(), id]
    );
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: `Venue "${venue_name}" already exists` });
    }

    await ensureLocationColumn();
    
    await db.query(
      'UPDATE assessment_venues SET venue_name = ?, location = ?, rows_count = ?, columns_count = ? WHERE id = ?',
      [venue_name.trim(), (location || '').trim(), parseInt(rows_count), parseInt(columns_count), id]
    );

    res.json({ success: true, message: 'Venue updated successfully' });
  } catch (error) {
    console.error('Error updating assessment venue:', error);
    res.status(500).json({ success: false, message: 'Failed to update venue' });
  }
};

/** DELETE /api/assessment-venues/:id  (soft delete) */
export const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE assessment_venues SET deleted_at = NOW(), status = 'Inactive' WHERE id = ?",
      [id]
    );
    res.json({ success: true, message: 'Venue deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment venue:', error);
    res.status(500).json({ success: false, message: 'Failed to delete venue' });
  }
};

/** PUT /api/assessment-venues/:id/status - Toggle venue status */
export const toggleVenueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active or Inactive' });
    }

    await db.query(
      'UPDATE assessment_venues SET status = ? WHERE id = ? AND deleted_at IS NULL',
      [status, id]
    );

    res.json({ success: true, message: `Venue status updated to ${status}` });
  } catch (error) {
    console.error('Error toggling venue status:', error);
    res.status(500).json({ success: false, message: 'Failed to update venue status' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Venue Layout Designer (2D Seat Layout)
// ─────────────────────────────────────────────────────────────────────

async function ensureLayoutColumn() {
  if (await columnExists('assessment_venues', 'layout_data')) return;
  await db.query(
    'ALTER TABLE assessment_venues ADD COLUMN layout_data JSON DEFAULT NULL'
  );
  columnExistsCache.set('assessment_venues.layout_data', true);
}

/** GET /api/assessment-venues/:id/layout */
export const getVenueLayout = async (req, res) => {
  try {
    await ensureLayoutColumn();
    const { id } = req.params;

    const [rows] = await db.query(
      'SELECT id, venue_name, rows_count, columns_count, layout_data FROM assessment_venues WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    const venue = rows[0];
    const layoutData = venue.layout_data
      ? (typeof venue.layout_data === 'string' ? JSON.parse(venue.layout_data) : venue.layout_data)
      : null;

    res.json({
      success: true,
      data: { ...venue, layout_data: layoutData },
    });
  } catch (error) {
    console.error('Error fetching venue layout:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch layout' });
  }
};

/** PUT /api/assessment-venues/:id/layout */
export const saveVenueLayout = async (req, res) => {
  try {
    await ensureLayoutColumn();
    const { id } = req.params;
    const { layout_data } = req.body;

    if (!layout_data || (!Array.isArray(layout_data.grid) && !Array.isArray(layout_data.rows))) {
      return res.status(400).json({ success: false, message: 'Layout data with rows or grid array is required' });
    }

    await db.query(
      'UPDATE assessment_venues SET layout_data = ? WHERE id = ? AND deleted_at IS NULL',
      [JSON.stringify(layout_data), id]
    );

    res.json({ success: true, message: 'Layout saved successfully' });
  } catch (error) {
    console.error('Error saving venue layout:', error);
    res.status(500).json({ success: false, message: 'Failed to save layout' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Assessment Slot Timings
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/slots?venue_id=&date= */
export const getSlots = async (req, res) => {
  try {
    const { venue_id, date } = req.query;
    let sql = `
      SELECT s.*
      FROM assessment_slots s
      WHERE 1=1
    `;
    const params = [];

    if (venue_id) { 
      sql += ' AND s.id IN (SELECT slot_id FROM assessment_slot_venues WHERE venue_id = ?)'; 
      params.push(venue_id); 
    }
    if (date) { sql += ' AND s.slot_date = ?'; params.push(date); }

    sql += ' ORDER BY s.slot_date DESC, s.start_time ASC';

    const [slots] = await db.query(sql, params);

    // Fetch venues for each slot
    const slotIds = slots.map(s => s.id);
    let venueMap = {};
    if (slotIds.length > 0) {
      const [venueRows] = await db.query(
        `SELECT sv.slot_id, v.id as venue_id, v.venue_name, v.rows_count, v.columns_count, v.total_capacity
         FROM assessment_slot_venues sv
         JOIN assessment_venues v ON sv.venue_id = v.id
         WHERE sv.slot_id IN (?) AND v.deleted_at IS NULL`,
        [slotIds]
      );
      venueRows.forEach(row => {
        if (!venueMap[row.slot_id]) venueMap[row.slot_id] = [];
        venueMap[row.slot_id].push({
          id: row.venue_id,
          venue_name: row.venue_name,
          rows_count: row.rows_count,
          columns_count: row.columns_count,
          total_capacity: row.total_capacity
        });
      });
    }

    const slotsWithVenues = slots.map(s => ({
      ...s,
      venues: venueMap[s.id] || [],
      venue_ids: (venueMap[s.id] || []).map(v => v.id)
    }));

    res.json({ success: true, data: slotsWithVenues });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
};

/** POST /api/assessment-venues/slots */
export const createSlot = async (req, res) => {
  try {
    const { slot_date, start_time, end_time, slot_label, subject_code, year } = req.body;
    const hasYearColumn = await columnExists('assessment_slots', 'year');

    if (!slot_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time and end time are required',
      });
    }

    // Check for duplicate slot (same date + time range + year)
    let duplicateQuery = `
      SELECT id FROM assessment_slots
      WHERE slot_date = ? AND start_time = ? AND end_time = ?`;
    const duplicateParams = [slot_date, start_time, end_time];

    if (hasYearColumn) {
      duplicateQuery += ' AND year = ?';
      duplicateParams.push(year || 1);
    }

    const [dup] = await db.query(duplicateQuery, duplicateParams);
    if (dup.length > 0) {
      const duplicateMessage = hasYearColumn
        ? `A slot already exists on ${slot_date} at ${start_time} - ${end_time} for Year ${year || 1}. Please choose a different time.`
        : `A slot already exists on ${slot_date} at ${start_time} - ${end_time}. Please choose a different time.`;

      return res.status(409).json({
        success: false,
        message: duplicateMessage,
      });
    }

    // Create the slot
    const insertColumns = ['slot_date', 'start_time', 'end_time', 'slot_label', 'subject_code'];
    const insertValues = [slot_date, start_time, end_time, slot_label || null, subject_code || null];

    if (hasYearColumn) {
      insertColumns.push('year');
      insertValues.push(year || 1);
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO assessment_slots (${insertColumns.join(', ')})
       VALUES (${placeholders})`,
      insertValues
    );

    res.status(201).json({
      success: true,
      message: 'Slot created successfully',
      data: {
        id: result.insertId,
        slot_date,
        start_time,
        end_time,
        slot_label,
        subject_code,
        year: hasYearColumn ? (year || 1) : null,
      },
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ success: false, message: 'Failed to create slot' });
  }
};

/** DELETE /api/assessment-venues/slots/:id */
export const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM assessment_slots WHERE id = ?', [id]);
    res.json({ success: true, message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ success: false, message: 'Failed to delete slot' });
  }
};

/** PUT /api/assessment-venues/slots/:id/status */
export const updateSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Active', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    await db.query('UPDATE assessment_slots SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Slot status updated' });
  } catch (error) {
    console.error('Error updating slot status:', error);
    res.status(500).json({ success: false, message: 'Failed to update slot status' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Department Clusters (year-wise)
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/clusters?year=2 */
export const getClusters = async (req, res) => {
  try {
    const { year } = req.query;
    let query = 'SELECT id, year, cluster_type, departments, column_pattern, created_at, updated_at FROM assessment_dept_clusters';
    const params = [];
    if (year) {
      query += ' WHERE year = ?';
      params.push(Number(year));
    }
    query += ' ORDER BY year ASC, cluster_type ASC';
    const [rows] = await db.query(query, params);
    const data = rows.map(r => ({
      ...r,
      departments: typeof r.departments === 'string' ? JSON.parse(r.departments) : r.departments
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clusters' });
  }
};

/** PUT /api/assessment-venues/clusters/:year */
export const updateCluster = async (req, res) => {
  try {
    const year = Number(req.params.year);
    const { cs_departments, core_departments, column_pattern } = req.body;

    if (!Array.isArray(cs_departments) || !Array.isArray(core_departments)) {
      return res.status(400).json({ success: false, message: 'cs_departments and core_departments must be arrays' });
    }

    const pat = column_pattern || 'CS_FIRST';

    // Upsert CS cluster
    await db.query(
      `INSERT INTO assessment_dept_clusters (year, cluster_type, departments, column_pattern)
       VALUES (?, 'CS', ?, ?)
       ON DUPLICATE KEY UPDATE departments = VALUES(departments), column_pattern = VALUES(column_pattern)`,
      [year, JSON.stringify(cs_departments), pat]
    );

    // Upsert Core cluster
    await db.query(
      `INSERT INTO assessment_dept_clusters (year, cluster_type, departments, column_pattern)
       VALUES (?, 'Core', ?, ?)
       ON DUPLICATE KEY UPDATE departments = VALUES(departments), column_pattern = VALUES(column_pattern)`,
      [year, JSON.stringify(core_departments), pat]
    );

    res.json({ success: true, message: `Clusters for year ${year} updated` });
  } catch (error) {
    console.error('Error updating clusters:', error);
    res.status(500).json({ success: false, message: 'Failed to update clusters' });
  }
};

/** DELETE /api/assessment-venues/clusters/:year */
export const deleteClusterYear = async (req, res) => {
  try {
    const year = Number(req.params.year);
    await db.query('DELETE FROM assessment_dept_clusters WHERE year = ?', [year]);
    res.json({ success: true, message: `Clusters for year ${year} deleted` });
  } catch (error) {
    console.error('Error deleting clusters:', error);
    res.status(500).json({ success: false, message: 'Failed to delete clusters' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Year-wise Courses
// ─────────────────────────────────────────────────────────────────────

async function ensureCourseTypeColumn() {
  if (await columnExists('assessment_year_courses', 'course_type')) return;
  try {
    await db.query(
      `ALTER TABLE assessment_year_courses 
       ADD COLUMN course_type VARCHAR(50) NOT NULL DEFAULT 'CORE' AFTER course_code`
    );
    columnExistsCache.set('assessment_year_courses.course_type', true);
    // Update existing rows
    await db.query(`UPDATE assessment_year_courses SET course_type = 'CORE' WHERE course_type IS NULL OR course_type = ''`);
    // Add index (ignore error if it already exists)
    try {
      await db.query(`ALTER TABLE assessment_year_courses ADD KEY idx_year_course_type (year, course_type)`);
    } catch (_) { /* index may already exist */ }
  } catch (err) {
    // Column may have been added by another request in parallel
    if (!err.message?.includes('Duplicate column')) throw err;
    columnExistsCache.set('assessment_year_courses.course_type', true);
  }
}

/** GET /api/assessment-venues/courses?year=3 */
export const getYearCourses = async (req, res) => {
  try {
    await ensureCourseTypeColumn();

    const { year, course_type } = req.query;
    let query = 'SELECT * FROM assessment_year_courses';
    const params = [];
    const filters = [];
    
    if (year) {
      filters.push('year = ?');
      params.push(Number(year));
    }
    if (course_type) {
      filters.push('course_type = ?');
      params.push(String(course_type));
    }
    
    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }
    query += ' ORDER BY course_type, course_name';
    
    const [rows] = await db.query(query, params);
    
    const data = rows.map(r => {
      let depts = [];
      try {
        if (typeof r.departments === 'string') {
          depts = JSON.parse(r.departments);
        } else if (Array.isArray(r.departments)) {
          depts = r.departments;
        } else {
          depts = [];
        }
      } catch (e) {
        console.warn('Failed to parse departments for course:', r.id, e);
        depts = [];
      }
      return { ...r, departments: depts };
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching year courses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};

/** POST /api/assessment-venues/courses */
export const addYearCourse = async (req, res) => {
  try {
    await ensureCourseTypeColumn();

    const { year, course_name, course_code, course_type = 'CORE', departments } = req.body;
    
    if (!year || !course_name || !course_code) {
      return res.status(400).json({ success: false, message: 'Year, course name, and code are required' });
    }
    
    const validTypes = ['CORE', 'ADD_ON', 'PROFESSIONAL_ELECTIVE', 'HONORS_MINOR'];
    const courseType = validTypes.includes(course_type) ? course_type : 'CORE';
    const deptJson = JSON.stringify(departments || []);

    await db.query(
      `INSERT INTO assessment_year_courses (year, course_name, course_code, course_type, departments)
       VALUES (?, ?, ?, ?, ?)`,
      [year, course_name, course_code, courseType, deptJson]
    );
    
    res.json({ success: true, message: 'Course added successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Course code already exists for this year' });
    }
    console.error('Error adding year course:', error);
    res.status(500).json({ success: false, message: 'Failed to add course' });
  }
};

/** PUT /api/assessment-venues/courses/:id */
export const updateYearCourse = async (req, res) => {
  try {
    await ensureCourseTypeColumn();

    const id = Number(req.params.id);
    const { year, course_name, course_code, course_type = 'CORE', departments } = req.body;
    
    const validTypes = ['CORE', 'ADD_ON', 'PROFESSIONAL_ELECTIVE', 'HONORS_MINOR'];
    const courseType = validTypes.includes(course_type) ? course_type : 'CORE';
    const deptJson = JSON.stringify(departments || []);
    
    await db.query(
      `UPDATE assessment_year_courses 
       SET year = ?, course_name = ?, course_code = ?, course_type = ?, departments = ?
       WHERE id = ?`,
      [year, course_name, course_code, courseType, deptJson, id]
    );
    
    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) {
    console.error('Error updating year course:', error);
    res.status(500).json({ success: false, message: 'Failed to update course' });
  }
};

/** DELETE /api/assessment-venues/courses/:id */
export const deleteYearCourse = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE FROM assessment_year_courses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting year course:', error);
    res.status(500).json({ success: false, message: 'Failed to delete course' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Course-wise Student Specifications
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/course-specs/template */
export const downloadCourseSpecsTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        Year: 2,
        'Reg. No.': '2022CS001',
        'Enroll No.': 'ENR220001',
        'Student Name': 'Student One',
        'Email ID': 'student.one@example.com',
        Dept: 'CSE',
        '22XX601': 'CS601',
        '22XX602': 'CS602',
        '22XX603': 'CS603',
        '22XX604': 'CS604',
        'PROFESSIONAL ELECTIVE III': 'Distributed Systems',
        'PROFESSIONAL ELECTIVE IV': 'Cloud Computing',
        'PROFESSIONAL ELECTIVE V / OPEN ELECTIVE': 'Data Privacy',
        'ADD ON': 'NPTEL - Python',
        'Honours or Minors Status': 'Honours',
        'HONOURS / MINORS 3': 'AI Foundations',
        'HONOURS / MINORS 4': 'Applied ML',
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 32 }, { wch: 32 }, { wch: 40 }, { wch: 24 }, { wch: 26 }, { wch: 24 }, { wch: 24 },
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Course Specs');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=course_wise_student_spec_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating course specs template:', error);
    res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

/** POST /api/assessment-venues/course-specs/upload */
export const uploadCourseWiseSpecifications = async (req, res) => {
  const connection = await db.getConnection();
  let txStarted = false;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No Excel file uploaded' });
    }

    await ensureCourseSpecsTable();
    await ensureCourseColumnsMetaTable();

    const bodyYear = Number(req.body?.year);
    const defaultYear = Number.isFinite(bodyYear) && bodyYear >= 1 && bodyYear <= 4 ? bodyYear : 1;

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    // Detect dynamic columns from the Excel file
    const dynamicColumns = detectDynamicColumns(rows);

    // Prepare rows with dynamic subject data
    const preparedRows = rows.map((row, index) => {
      // ALWAYS use the year from the request body (the tab user selected)
      // Do NOT allow Excel file to override the year selection
      const resolvedYear = defaultYear;

      // Extract all dynamic subject data
      const subjectData = {};
      dynamicColumns.forEach(col => {
        subjectData[col] = normalizeCell(row[col] || '');
      });

      const mapped = {
        year: resolvedYear,
        reg_no: pickFromRow(row, COURSE_SPEC_HEADERS.reg_no),
        enroll_no: pickFromRow(row, COURSE_SPEC_HEADERS.enroll_no),
        student_name: pickFromRow(row, COURSE_SPEC_HEADERS.student_name),
        email_id: pickFromRow(row, COURSE_SPEC_HEADERS.email_id),
        dept: pickFromRow(row, COURSE_SPEC_HEADERS.dept),
        // Keep old mappings for backward compatibility
        course_22xx601: pickFromRow(row, COURSE_SPEC_HEADERS.course_22xx601),
        course_22xx602: pickFromRow(row, COURSE_SPEC_HEADERS.course_22xx602),
        course_22xx603: pickFromRow(row, COURSE_SPEC_HEADERS.course_22xx603),
        course_22xx604: pickFromRow(row, COURSE_SPEC_HEADERS.course_22xx604),
        professional_elective_iii: pickFromRow(row, COURSE_SPEC_HEADERS.professional_elective_iii),
        professional_elective_iv: pickFromRow(row, COURSE_SPEC_HEADERS.professional_elective_iv),
        professional_elective_v_open: pickFromRow(row, COURSE_SPEC_HEADERS.professional_elective_v_open),
        add_on: pickFromRow(row, COURSE_SPEC_HEADERS.add_on),
        honours_or_minors_status: pickFromRow(row, COURSE_SPEC_HEADERS.honours_or_minors_status),
        honours_minors_3: pickFromRow(row, COURSE_SPEC_HEADERS.honours_minors_3),
        honours_minors_4: pickFromRow(row, COURSE_SPEC_HEADERS.honours_minors_4),
        raw_subject_data: JSON.stringify({ ...subjectData, original_row: row }),
        row_number: index + 2,
      };
      return mapped;
    });

    const validRows = preparedRows.filter((r) => r.reg_no);
    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid rows found. Reg. No. (or equivalent header) is required.',
      });
    }

    const regNos = validRows.map((r) => r.reg_no);
    const [userRows] = await connection.query('SELECT user_id, ID FROM users WHERE ID IN (?)', [regNos]);
    const userByRegNo = new Map(userRows.map((u) => [normalizeCell(u.ID), u.user_id]));

    const values = validRows.map((row) => [
      row.year,
      userByRegNo.get(row.reg_no) || null,
      row.reg_no,
      row.enroll_no || null,
      row.student_name || null,
      row.email_id || null,
      row.dept || null,
      row.course_22xx601 || null,
      row.course_22xx602 || null,
      row.course_22xx603 || null,
      row.course_22xx604 || null,
      row.professional_elective_iii || null,
      row.professional_elective_iv || null,
      row.professional_elective_v_open || null,
      row.add_on || null,
      row.honours_or_minors_status || null,
      row.honours_minors_3 || null,
      row.honours_minors_4 || null,
      row.raw_subject_data,
    ]);

    await connection.beginTransaction();
    txStarted = true;

    // Store detected columns metadata
    if (dynamicColumns.length > 0) {
      const columnMetadata = dynamicColumns.map((col, idx) => [
        defaultYear,
        col,
        col, // Use original column name as label
        idx,
        true, // is_custom
      ]);

      // Delete old metadata for this year
      await connection.query('DELETE FROM assessment_course_columns_meta WHERE year = ?', [defaultYear]);

      // Insert new metadata
      if (columnMetadata.length > 0) {
        await connection.query(
          'INSERT INTO assessment_course_columns_meta (year, column_name, column_label, column_order, is_custom) VALUES ?',
          [columnMetadata]
        );
      }
    }

    await connection.query(
      `INSERT INTO ${COURSE_SPEC_TABLE} (
        year, user_id, reg_no, enroll_no, student_name, email_id, dept,
        course_22xx601, course_22xx602, course_22xx603, course_22xx604,
        professional_elective_iii, professional_elective_iv, professional_elective_v_open,
        add_on, honours_or_minors_status, honours_minors_3, honours_minors_4, raw_subject_data
      ) VALUES ?
      ON DUPLICATE KEY UPDATE
        year = VALUES(year),
        user_id = VALUES(user_id),
        enroll_no = VALUES(enroll_no),
        student_name = VALUES(student_name),
        email_id = VALUES(email_id),
        dept = VALUES(dept),
        course_22xx601 = VALUES(course_22xx601),
        course_22xx602 = VALUES(course_22xx602),
        course_22xx603 = VALUES(course_22xx603),
        course_22xx604 = VALUES(course_22xx604),
        professional_elective_iii = VALUES(professional_elective_iii),
        professional_elective_iv = VALUES(professional_elective_iv),
        professional_elective_v_open = VALUES(professional_elective_v_open),
        add_on = VALUES(add_on),
        honours_or_minors_status = VALUES(honours_or_minors_status),
        honours_minors_3 = VALUES(honours_minors_3),
        honours_minors_4 = VALUES(honours_minors_4),
        raw_subject_data = VALUES(raw_subject_data),
        updated_at = CURRENT_TIMESTAMP`,
      [values]
    );
    await connection.commit();
    txStarted = false;

    const missingInUsers = validRows.filter((r) => !userByRegNo.has(r.reg_no)).map((r) => r.reg_no);

    return res.json({
      success: true,
      message: 'Course-wise student specifications uploaded successfully',
      data: {
        totalRows: rows.length,
        validRows: validRows.length,
        skippedRows: rows.length - validRows.length,
        matchedStudents: validRows.length - missingInUsers.length,
        unmatchedStudents: missingInUsers.length,
        unmatchedSample: missingInUsers.slice(0, 20),
        detectedColumns: dynamicColumns,
      },
    });
  } catch (error) {
    if (txStarted) {
      await connection.rollback();
    }
    console.error('Error uploading course-wise specifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to process uploaded file' });
  } finally {
    connection.release();
  }
};

/** GET /api/assessment-venues/course-specs */
export const getCourseWiseSpecifications = async (req, res) => {
  try {
    await ensureCourseSpecsTable();
    await ensureCourseColumnsMetaTable();

    const { search = '', dept = '', year = '', limit = 100, offset = 0 } = req.query;
    const parsedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const parsedOffset = Math.max(Number(offset) || 0, 0);

    const where = [];
    const params = [];

    if (dept) {
      where.push('dept = ?');
      params.push(dept);
    }

    const parsedYear = Number(year);
    if (Number.isFinite(parsedYear) && parsedYear >= 1 && parsedYear <= 4) {
      where.push('year = ?');
      params.push(parsedYear);
    }

    if (search) {
      where.push('(reg_no LIKE ? OR enroll_no LIKE ? OR student_name LIKE ? OR email_id LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM ${COURSE_SPEC_TABLE} ${whereClause}`,
      params
    );

    const [rows] = await db.query(
      `SELECT
        id, year, user_id, reg_no, enroll_no, student_name, email_id, dept,
        course_22xx601, course_22xx602, course_22xx603, course_22xx604,
        professional_elective_iii, professional_elective_iv, professional_elective_v_open,
        add_on, honours_or_minors_status, honours_minors_3, honours_minors_4,
        raw_subject_data, updated_at, created_at
       FROM ${COURSE_SPEC_TABLE}
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parsedLimit, parsedOffset]
    );

    // Fetch detected columns metadata for the year
    let detectedColumns = [];
    if (Number.isFinite(parsedYear) && parsedYear >= 1 && parsedYear <= 4) {
      const [columnsMeta] = await db.query(
        'SELECT column_name, column_label, column_order FROM assessment_course_columns_meta WHERE year = ? ORDER BY column_order ASC',
        [parsedYear]
      );
      detectedColumns = columnsMeta.map(col => ({
        name: col.column_name,
        label: col.column_label,
        order: col.column_order,
      }));
    }

    // Enrich rows with parsed subject data
    const enrichedRows = rows.map(row => {
      try {
        const subjectData = row.raw_subject_data ? JSON.parse(row.raw_subject_data) : {};
        return {
          ...row,
          subjectData: subjectData, // Make subject data easily accessible
        };
      } catch (e) {
        return row;
      }
    });

    res.json({
      success: true,
      data: {
        total: countRows[0]?.total || 0,
        limit: parsedLimit,
        offset: parsedOffset,
        rows: enrichedRows,
        detectedColumns, // Return detected columns info
      },
    });
  } catch (error) {
    console.error('Error fetching course-wise specifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch course-wise specifications' });
  }
};

/** GET /api/assessment-venues/course-specs/departments */
export const getCourseSpecsDepartments = async (req, res) => {
  try {
    await ensureCourseSpecsTable();

    const { year } = req.query;
    const parsedYear = Number(year);

    let query = `SELECT DISTINCT dept FROM ${COURSE_SPEC_TABLE} WHERE dept IS NOT NULL AND dept != ''`;
    const params = [];

    if (Number.isFinite(parsedYear) && parsedYear >= 1 && parsedYear <= 4) {
      query += ' AND year = ?';
      params.push(parsedYear);
    }

    query += ' ORDER BY dept ASC';

    const [rows] = await db.query(query, params);
    const departments = rows.map(r => r.dept).filter(Boolean);

    res.json({
      success: true,
      data: {
        departments,
      },
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

/** DELETE /api/assessment-venues/course-specs/:id */
export const deleteCourseSpec = async (req, res) => {
  try {
    await ensureCourseSpecsTable();

    const { id } = req.params;
    const specId = Number(id);

    if (!Number.isFinite(specId) || specId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid specification ID' });
    }

    const [result] = await db.query(`DELETE FROM ${COURSE_SPEC_TABLE} WHERE id = ?`, [specId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course specification not found' });
    }

    res.json({
      success: true,
      message: 'Course specification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course specification:', error);
    res.status(500).json({ success: false, message: 'Failed to delete course specification' });
  }
};

/** PUT /api/assessment-venues/course-specs/:id */
export const updateCourseSpec = async (req, res) => {
  try {
    await ensureCourseSpecsTable();

    const { id } = req.params;
    const { subjectData } = req.body;
    const specId = Number(id);

    if (!Number.isFinite(specId) || specId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid specification ID' });
    }

    if (!subjectData || typeof subjectData !== 'object') {
      return res.status(400).json({ success: false, message: 'subjectData is required' });
    }

    // Update the raw_subject_data column with new course assignments
    const [result] = await db.query(
      `UPDATE ${COURSE_SPEC_TABLE} SET raw_subject_data = ?, updated_at = NOW() WHERE id = ?`,
      [JSON.stringify(subjectData), specId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course specification not found' });
    }

    res.json({
      success: true,
      message: 'Course specification updated successfully',
    });
  } catch (error) {
    console.error('Error updating course specification:', error);
    res.status(500).json({ success: false, message: 'Failed to update course specification' });
  }
};

/** DELETE /api/assessment-venues/course-specs/year/:year */
export const deleteAllCourseSpecsForYear = async (req, res) => {
  try {
    await ensureCourseSpecsTable();

    const { year } = req.params;
    const parsedYear = Number(year);

    if (!Number.isFinite(parsedYear) || parsedYear < 1 || parsedYear > 4) {
      return res.status(400).json({ success: false, message: 'Invalid year. Must be between 1 and 4.' });
    }

    // Delete records for the year
    const [result] = await db.query(`DELETE FROM ${COURSE_SPEC_TABLE} WHERE year = ?`, [parsedYear]);

    // Also delete column metadata for this year
    await db.query('DELETE FROM assessment_course_columns_meta WHERE year = ?', [parsedYear]);

    res.json({
      success: true,
      message: `All course specifications for Year ${parsedYear} deleted successfully`,
      data: {
        deletedRecords: result.affectedRows,
      },
    });
  } catch (error) {
    console.error('Error deleting course specifications for year:', error);
    res.status(500).json({ success: false, message: 'Failed to delete course specifications' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Assessment Allocations
// ─────────────────────────────────────────────────────────────────────

/** POST /api/assessment-venues/allocations */
export const saveAllocation = async (req, res) => {
  try {
    const { slot_id, allocation_data, overall_stats } = req.body;

    if (!slot_id || !allocation_data) {
      return res.status(400).json({ success: false, message: 'Slot ID and allocation data are required' });
    }

    // Check if slot exists
    const [slotCheck] = await db.query('SELECT id FROM assessment_slots WHERE id = ?', [slot_id]);
    if (slotCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    // Upsert allocation (insert or update)
    await db.query(`
      INSERT INTO assessment_allocations (slot_id, allocation_data, overall_stats)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        allocation_data = VALUES(allocation_data),
        overall_stats = VALUES(overall_stats),
        updated_at = CURRENT_TIMESTAMP
    `, [slot_id, JSON.stringify(allocation_data), JSON.stringify(overall_stats)]);

    // Update slot status to allocated
    await db.query('UPDATE assessment_slots SET status = ? WHERE id = ?', ['Allocated', slot_id]);

    res.json({ success: true, message: 'Allocation saved successfully' });
  } catch (error) {
    console.error('Error saving allocation:', error);
    res.status(500).json({ success: false, message: 'Failed to save allocation' });
  }
};

/** GET /api/assessment-venues/allocations/:slotId */
export const getAllocation = async (req, res) => {
  try {
    const { slotId } = req.params;
    const hasYearColumn = await columnExists('assessment_slots', 'year');

    const yearSelect = hasYearColumn ? ', s.year' : '';

    const [rows] = await db.query(`
      SELECT aa.*, s.slot_label, s.slot_date, s.start_time, s.end_time${yearSelect}, s.subject_code
      FROM assessment_allocations aa
      JOIN assessment_slots s ON s.id = aa.slot_id
      WHERE aa.slot_id = ?
    `, [slotId]);

    if (rows.length === 0) {
      return res.json({ success: true, data: null, hasAllocation: false });
    }

    const allocation = rows[0];
    res.json({
      success: true,
      hasAllocation: true,
      data: {
        id: allocation.id,
        slot_id: allocation.slot_id,
        allocation_data: typeof allocation.allocation_data === 'string' 
          ? JSON.parse(allocation.allocation_data) 
          : allocation.allocation_data,
        overall_stats: typeof allocation.overall_stats === 'string'
          ? JSON.parse(allocation.overall_stats)
          : allocation.overall_stats,
        slot_label: allocation.slot_label,
        slot_date: allocation.slot_date,
        start_time: allocation.start_time,
        end_time: allocation.end_time,
        year: hasYearColumn ? allocation.year : null,
        subject_code: allocation.subject_code,
        created_at: allocation.created_at,
        updated_at: allocation.updated_at,
      }
    });
  } catch (error) {
    console.error('Error fetching allocation:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch allocation' });
  }
};

/** DELETE /api/assessment-venues/allocations/:slotId */
export const deleteAllocation = async (req, res) => {
  try {
    const { slotId } = req.params;

    await db.query('DELETE FROM assessment_allocations WHERE slot_id = ?', [slotId]);
    await db.query('UPDATE assessment_slots SET status = ? WHERE id = ?', ['Pending', slotId]);

    res.json({ success: true, message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Error deleting allocation:', error);
    res.status(500).json({ success: false, message: 'Failed to delete allocation' });
  }
};

/** GET /api/assessment-venues/my-allocation — student looks up their own seat */
export const getMyAllocation = async (req, res) => {
  try {
    const [userRows] = await db.query(
      'SELECT user_id, name, email, ID, department FROM users WHERE user_id = ? AND is_active = 1',
      [req.user.user_id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const student = userRows[0];
    const rollNumber = (student.ID || '').trim().toUpperCase();
    const email = (student.email || '').trim().toLowerCase();

    if (!rollNumber && !email) {
      return res.json({ success: true, allocations: [] });
    }

    const hasYearColumn = await columnExists('assessment_slots', 'year');
    const yearSelect = hasYearColumn ? ', s.year' : '';

    const [rows] = await db.query(`
      SELECT aa.allocation_data, aa.overall_stats,
             s.id AS slot_id, s.slot_label, s.slot_date, s.start_time, s.end_time,
             s.subject_code${yearSelect}
      FROM assessment_allocations aa
      JOIN assessment_slots s ON s.id = aa.slot_id
      WHERE s.status = 'Allocated'
        AND s.slot_date >= CURDATE()
      ORDER BY s.slot_date ASC, s.start_time ASC
    `);

    const results = [];

    for (const row of rows) {
      const allocData = typeof row.allocation_data === 'string'
        ? JSON.parse(row.allocation_data)
        : row.allocation_data;

      for (const [venueName, venueObj] of Object.entries(allocData)) {
        const seatMap = venueObj.seatMap;
        if (!Array.isArray(seatMap)) continue;

        let found = false;
        let myRow = null, myCol = null;

        for (let r = 0; r < seatMap.length && !found; r++) {
          for (let c = 0; c < seatMap[r].length && !found; c++) {
            const seat = seatMap[r][c];
            if (!seat) continue;
            const seatRoll = (seat.rollNumber || '').trim().toUpperCase();
            const seatEmail = (seat.email || '').trim().toLowerCase();
            if ((rollNumber && seatRoll === rollNumber) || (email && seatEmail === email)) {
              found = true;
              myRow = seat.row;
              myCol = seat.col;
            }
          }
        }

        if (found) {
          results.push({
            slot_id: row.slot_id,
            slot_label: row.slot_label,
            slot_date: row.slot_date,
            start_time: row.start_time,
            end_time: row.end_time,
            subject_code: row.subject_code,
            year: hasYearColumn ? row.year : null,
            venue: venueName,
            myRow,
            myCol,
            myRoll: rollNumber,
            rows_count: venueObj.rows,
            columns_count: venueObj.columns,
            seatMap: seatMap,
          });
        }
      }
    }

    res.json({ success: true, allocations: results });
  } catch (error) {
    console.error('Error fetching student allocation:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your allocation' });
  }
};

// ─────────────────────────────────────────────────────────────────────
//  Assessment Attendance
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/attendance/:slotId - Get attendance for a slot */
export const getAttendance = async (req, res) => {
  try {
    const { slotId } = req.params;
    const hasYearColumn = await columnExists('assessment_slots', 'year');
    const yearSelect = hasYearColumn ? ', s.year' : '';

    const [rows] = await db.query(`
      SELECT aa.*, s.slot_label, s.slot_date, s.start_time, s.end_time${yearSelect}, s.subject_code,
             u.name AS marked_by_name
      FROM assessment_allocations aa
      JOIN assessment_slots s ON s.id = aa.slot_id
      LEFT JOIN users u ON u.user_id = aa.attendance_marked_by
      WHERE aa.slot_id = ?
    `, [slotId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    const allocation = rows[0];
    res.json({
      success: true,
      data: {
        slot_id: allocation.slot_id,
        slot_label: allocation.slot_label,
        slot_date: allocation.slot_date,
        start_time: allocation.start_time,
        end_time: allocation.end_time,
        subject_code: allocation.subject_code,
        year: hasYearColumn ? allocation.year : null,
        allocation_data: typeof allocation.allocation_data === 'string'
          ? JSON.parse(allocation.allocation_data)
          : allocation.allocation_data,
        attendance_data: allocation.attendance_data 
          ? (typeof allocation.attendance_data === 'string' 
              ? JSON.parse(allocation.attendance_data) 
              : allocation.attendance_data)
          : null,
        attendance_marked_by: allocation.marked_by_name,
        attendance_marked_at: allocation.attendance_marked_at,
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
};

/** POST /api/assessment-venues/attendance/:slotId - Save attendance for a slot */
export const saveAttendance = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { attendance_data, venue_name } = req.body;
    const userId = req.user.user_id;

    if (!attendance_data) {
      return res.status(400).json({ success: false, message: 'Attendance data is required' });
    }

    // Check if allocation exists
    const [allocCheck] = await db.query(
      'SELECT id, attendance_data FROM assessment_allocations WHERE slot_id = ?',
      [slotId]
    );
    
    if (allocCheck.length === 0) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    // Merge with existing attendance data if updating specific venue
    let finalAttendanceData = attendance_data;
    if (venue_name && allocCheck[0].attendance_data) {
      const existingData = typeof allocCheck[0].attendance_data === 'string'
        ? JSON.parse(allocCheck[0].attendance_data)
        : allocCheck[0].attendance_data;
      finalAttendanceData = { ...existingData, ...attendance_data };
    }

    // Update attendance
    await db.query(`
      UPDATE assessment_allocations 
      SET attendance_data = ?, 
          attendance_marked_by = ?,
          attendance_marked_at = CURRENT_TIMESTAMP
      WHERE slot_id = ?
    `, [JSON.stringify(finalAttendanceData), userId, slotId]);

    res.json({ success: true, message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to save attendance' });
  }
};

/** GET /api/assessment-venues/attendance-stats/:slotId - Get attendance statistics */
export const getAttendanceStats = async (req, res) => {
  try {
    const { slotId } = req.params;

    const [rows] = await db.query(`
      SELECT aa.allocation_data, aa.attendance_data,
             s.slot_label, s.slot_date, s.start_time, s.end_time
      FROM assessment_allocations aa
      JOIN assessment_slots s ON s.id = aa.slot_id
      WHERE aa.slot_id = ?
    `, [slotId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    const allocation = rows[0];
    const allocData = typeof allocation.allocation_data === 'string'
      ? JSON.parse(allocation.allocation_data)
      : allocation.allocation_data;
    const attendData = allocation.attendance_data
      ? (typeof allocation.attendance_data === 'string'
          ? JSON.parse(allocation.attendance_data)
          : allocation.attendance_data)
      : {};

    // Calculate stats per venue
    const stats = {};
    let totalAllocated = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    for (const [venueName, venueObj] of Object.entries(allocData)) {
      const seatMap = venueObj.seatMap || [];
      const venueAttend = attendData[venueName] || {};
      
      let allocated = 0;
      let present = 0;
      let absent = 0;

      for (let r = 0; r < seatMap.length; r++) {
        for (let c = 0; c < seatMap[r].length; c++) {
          const seat = seatMap[r][c];
          if (seat) {
            allocated++;
            const key = `${r}-${c}`;
            if (venueAttend[key] === true) {
              present++;
            } else if (venueAttend[key] === false) {
              absent++;
            }
          }
        }
      }

      stats[venueName] = { allocated, present, absent, unmarked: allocated - present - absent };
      totalAllocated += allocated;
      totalPresent += present;
      totalAbsent += absent;
    }

    res.json({
      success: true,
      data: {
        slot_label: allocation.slot_label,
        slot_date: allocation.slot_date,
        start_time: allocation.start_time,
        end_time: allocation.end_time,
        venues: stats,
        total: {
          allocated: totalAllocated,
          present: totalPresent,
          absent: totalAbsent,
          unmarked: totalAllocated - totalPresent - totalAbsent,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance stats' });
  }
};
