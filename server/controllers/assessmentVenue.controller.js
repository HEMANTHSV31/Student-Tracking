import db from '../config/db.js';

// ─────────────────────────────────────────────────────────────────────
//  Assessment Venues
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/ */
export const getAllVenues = async (req, res) => {
  try {
    const [venues] = await db.query(`
      SELECT id, venue_name, rows_count, columns_count, total_capacity, status, created_at
      FROM assessment_venues
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
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
    const { venue_name, rows_count, columns_count } = req.body;

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

    const [result] = await db.query(
      'INSERT INTO assessment_venues (venue_name, rows_count, columns_count) VALUES (?, ?, ?)',
      [venue_name.trim(), parseInt(rows_count), parseInt(columns_count)]
    );

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: {
        id: result.insertId,
        venue_name: venue_name.trim(),
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
    const { venue_name, rows_count, columns_count } = req.body;

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

    await db.query(
      'UPDATE assessment_venues SET venue_name = ?, rows_count = ?, columns_count = ? WHERE id = ?',
      [venue_name.trim(), parseInt(rows_count), parseInt(columns_count), id]
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

// ─────────────────────────────────────────────────────────────────────
//  Assessment Slot Timings
// ─────────────────────────────────────────────────────────────────────

/** GET /api/assessment-venues/slots?venue_id=&date= */
export const getSlots = async (req, res) => {
  try {
    const { venue_id, date } = req.query;
    let sql = `
      SELECT s.*, v.venue_name
      FROM assessment_slots s
      LEFT JOIN assessment_venues v ON s.venue_id = v.id
      WHERE (v.deleted_at IS NULL OR s.venue_id IS NULL)
    `;
    const params = [];

    if (venue_id) { sql += ' AND s.venue_id = ?'; params.push(venue_id); }
    if (date)     { sql += ' AND s.slot_date = ?'; params.push(date); }

    sql += ' ORDER BY s.slot_date DESC, s.start_time ASC';

    const [slots] = await db.query(sql, params);
    res.json({ success: true, data: slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
};

/** POST /api/assessment-venues/slots */
export const createSlot = async (req, res) => {
  try {
    const { venue_id, slot_date, start_time, end_time, slot_label, subject_code } = req.body;

    if (!slot_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time and end time are required',
      });
    }

    // Check for duplicate slot (same date + time range)
    const [dup] = await db.query(
      `SELECT id FROM assessment_slots
       WHERE slot_date = ? AND start_time = ? AND end_time = ?`,
      [slot_date, start_time, end_time]
    );
    if (dup.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A slot already exists on ${slot_date} at ${start_time} - ${end_time}. Please choose a different time.`,
      });
    }

    // Also warn if any overlapping slot exists on same date
    const [overlap] = await db.query(
      `SELECT id, start_time, end_time FROM assessment_slots
       WHERE slot_date = ? AND status = 'Active'
       ORDER BY start_time`,
      [slot_date]
    );

    const [result] = await db.query(
      `INSERT INTO assessment_slots (venue_id, slot_date, start_time, end_time, slot_label, subject_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [venue_id || null, slot_date, start_time, end_time, slot_label || null, subject_code || null]
    );

    res.status(201).json({
      success: true,
      message: 'Slot created successfully',
      data: { id: result.insertId, slot_date, start_time, end_time, slot_label, subject_code },
      existingSlotsForDay: overlap,
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
