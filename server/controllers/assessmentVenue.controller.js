import db from '../config/db.js';

const columnExistsCache = new Map();

async function columnExists(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnExistsCache.has(cacheKey)) {
    return columnExistsCache.get(cacheKey);
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
  columnExistsCache.set(cacheKey, exists);
  return exists;
}

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
