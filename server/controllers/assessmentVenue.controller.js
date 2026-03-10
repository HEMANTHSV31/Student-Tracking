import db from '../config/db.js';

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
      ORDER BY s.slot_date DESC, s.start_time DESC
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
