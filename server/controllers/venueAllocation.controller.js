import db from '../config/db.js';

/**
 * Get all available years with student counts
 * GET /api/venue-allocation/years
 */
export const getAvailableYears = async (req, res) => {
  try {
    const [years] = await db.query(`
      SELECT 
        s.year,
        COUNT(*) as total_students,
        SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        ) THEN 1 ELSE 0 END) as unallocated_students
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3 AND u.is_active = 1
      GROUP BY s.year
      ORDER BY s.year
    `);

    res.status(200).json({
      success: true,
      data: years
        .filter(y => y.year !== null && y.year !== undefined)
        .map(y => ({
          year: parseInt(y.year) || 0,
          totalStudents: parseInt(y.total_students) || 0,
          unallocatedStudents: parseInt(y.unallocated_students) || 0
        }))
    });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch years'
    });
  }
};

/**
 * Get all departments for a specific year
 * GET /api/venue-allocation/departments?year=1
 */
export const getDepartments = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    const [departments] = await db.query(`
      SELECT 
        u.department,
        COUNT(*) as total_students,
        SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        ) THEN 1 ELSE 0 END) as unallocated_students
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE s.year = ? AND u.role_id = 3 AND u.is_active = 1
      GROUP BY u.department
      ORDER BY u.department
    `, [year]);

    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
};

/**
 * Get unique venue locations for filtering
 * GET /api/venue-allocation/locations
 */
export const getVenueLocations = async (req, res) => {
  try {
    const [locations] = await db.query(`
      SELECT DISTINCT 
        v.location,
        COUNT(v.venue_id) as venue_count,
        SUM(v.capacity) as total_capacity,
        SUM(v.capacity - COALESCE((SELECT COUNT(*) FROM group_students gs 
            JOIN \`groups\` g ON gs.group_id = g.group_id 
            WHERE g.venue_id = v.venue_id AND g.status = 'Active' AND gs.status = 'Active'), 0)) as available_seats
      FROM venue v
      WHERE v.deleted_at IS NULL 
        AND v.status = 'Active'
        AND v.location IS NOT NULL 
        AND v.location != ''
      GROUP BY v.location
      ORDER BY v.location
    `);

    res.status(200).json({
      success: true,
      data: locations.map(loc => ({
        location: loc.location,
        venue_count: parseInt(loc.venue_count) || 0,
        total_capacity: parseInt(loc.total_capacity) || 0,
        available_seats: parseInt(loc.available_seats) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching venue locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue locations'
    });
  }
};

/**
 * Get all real venues from database
 * GET /api/venue-allocation/venues
 */
export const getAllVenues = async (req, res) => {
  try {
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        v.year,
        v.group_specification,
        v.assigned_faculty_id,
        v.status,
        f.faculty_id,
        u.name as faculty_name,
        COUNT(DISTINCT gs.student_id) as current_students,
        (v.capacity - COUNT(DISTINCT gs.student_id)) as available_seats
      FROM venue v
      LEFT JOIN faculties f ON v.assigned_faculty_id = f.faculty_id
      LEFT JOIN users u ON f.user_id = u.user_id
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.deleted_at IS NULL AND v.status = 'Active'
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `);

    res.status(200).json({
      success: true,
      data: venues.map(v => ({
        venue_id: v.venue_id,
        venue_name: v.venue_name,
        capacity: v.capacity,
        location: v.location || '',
        year: v.year,
        group_specification: v.group_specification,
        faculty_id: v.faculty_id,
        faculty_name: v.faculty_name,
        status: v.status,
        current_students: parseInt(v.current_students) || 0,
        available_seats: parseInt(v.available_seats) || v.capacity
      }))
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
};

/**
 * Get students with filters (year, departments, specific IDs)
 * Now includes current venue mapping information
 * POST /api/venue-allocation/students
 * Body: {
 *   year: 1,
 *   departments: ["CSE", "IT"] or null for all,
 *   onlyUnallocated: true/false,
 *   studentIds: [1, 2, 3] or null for all matching filters
 * }
 */
export const getStudents = async (req, res) => {
  try {
    const { year, departments, onlyUnallocated = true, studentIds } = req.body;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    // Check if schedule_end_date column exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME = 'schedule_end_date'
    `);
    const hasScheduleColumn = columns.length > 0;

    let whereConditions = ['s.year = ?', 'u.role_id = 3', 'u.is_active = 1'];
    let params = [year];

    // Filter by departments if provided
    if (departments && departments.length > 0) {
      whereConditions.push(`u.department IN (${departments.map(() => '?').join(',')})`);
      params.push(...departments);
    }
 
    // Filter by specific student IDs if provided
    if (studentIds && studentIds.length > 0) {
      whereConditions.push(`s.student_id IN (${studentIds.map(() => '?').join(',')})`);
      params.push(...studentIds);
    }
 
    // Filter only unallocated students
    let unallocatedCondition = '';
    if (onlyUnallocated) {
      unallocatedCondition = `
        AND NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        )
      `;
    }

    // Build schedule subquery conditionally
    const scheduleSubquery = hasScheduleColumn ? `
        (
          SELECT g.schedule_end_date FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
          LIMIT 1
        ) as schedule_end_date
    ` : `NULL as schedule_end_date`;
 
    // Enhanced query with venue mapping details
    const query = `
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        u.department,
        s.year,
        CASE WHEN EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        ) THEN 1 ELSE 0 END as is_allocated,
        (
          SELECT v.venue_id FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          INNER JOIN venue v ON g.venue_id = v.venue_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
          LIMIT 1
        ) as current_venue_id,
        (
          SELECT v.venue_name FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          INNER JOIN venue v ON g.venue_id = v.venue_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
          LIMIT 1
        ) as current_venue_name,
        (
          SELECT g.group_name FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
          LIMIT 1
        ) as current_group_name,
        (
          SELECT gs.allocation_date FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
          LIMIT 1
        ) as allocation_date,
        ${scheduleSubquery}
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ${unallocatedCondition}
      ORDER BY u.department, u.ID
    `;

    const [students] = await db.query(query, params);

    // Get department-wise count
    const deptCounts = {};
    const venueMapping = {};
    
    students.forEach(s => {
      if (!deptCounts[s.department]) {
        deptCounts[s.department] = 0;
      }
      deptCounts[s.department]++;
      
      // Track venue mappings
      if (s.current_venue_name) {
        if (!venueMapping[s.current_venue_name]) {
          venueMapping[s.current_venue_name] = {
            venue_id: s.current_venue_id,
            venue_name: s.current_venue_name,
            students: []
          };
        }
        venueMapping[s.current_venue_name].students.push({
          student_id: s.student_id,
          name: s.name,
          roll_number: s.roll_number,
          department: s.department
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        students: students.map(s => ({
          ...s,
          allocation_date: s.allocation_date ? new Date(s.allocation_date).toISOString().split('T')[0] : null,
          schedule_end_date: s.schedule_end_date ? new Date(s.schedule_end_date).toISOString().split('T')[0] : null
        })),
        totalStudents: students.length,
        departmentBreakdown: deptCounts,
        venueMapping: Object.values(venueMapping)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
};

/**
 * Preview allocation before executing
 * POST /api/venue-allocation/preview
 * Body: {
 *   year: 1,
 *   venueIds: [1, 2, 3],       // Selected venue IDs from database
 *   departments: ["CSE", "IT"], // Optional: specific departments
 *   studentIds: [1, 2, 3],      // Optional: specific student IDs to allocate
 *   reservedSlots: 3,           // Reserved slots per venue
 *   groupDepartments: ["CSE", "IT"], // Optional: departments to group together
 *   allocationMode: "department_wise" | "roll_number_wise"
 * }
 */
export const previewAllocation = async (req, res) => {
  try {
    const { 
      year, 
      venueIds: rawVenueIds, 
      departments,
      studentIds,
      reservedSlots = 2, 
      groupDepartments = [],
      allocationMode = 'department_wise'
    } = req.body;

    // Parse venueIds properly
    const venueIds = Array.isArray(rawVenueIds) 
      ? rawVenueIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0)
      : [];

    if (!year || venueIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Year and venue selection are required'
      });
    }

    console.log('Preview allocation request:', { year, venueIds, departments, reservedSlots });

    // Get selected venues from database
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        COUNT(DISTINCT gs.student_id) as current_students
      FROM venue v
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.venue_id IN (${venueIds.map(() => '?').join(',')})
        AND v.deleted_at IS NULL 
        AND v.status = 'Active'
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `, venueIds);

    if (venues.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid venues found'
      });
    }

    // Calculate total available capacity
    let totalAvailableCapacity = 0;
    const venueCapacities = venues.map(v => {
      const effectiveCapacity = Math.max(0, v.capacity - parseInt(v.current_students || 0) - reservedSlots);
      totalAvailableCapacity += effectiveCapacity;
      return {
        ...v,
        current_students: parseInt(v.current_students) || 0,
        effectiveCapacity
      };
    });

    // Build student query
    let whereConditions = ['s.year = ?', 'u.role_id = 3', 'u.is_active = 1'];
    let params = [year];

    // Filter for unallocated students
    whereConditions.push(`
      NOT EXISTS (
        SELECT 1 FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE gs.student_id = s.student_id AND gs.status = 'Active'
      )
    `);

    if (departments && departments.length > 0) {
      whereConditions.push(`u.department IN (${departments.map(() => '?').join(',')})`);
      params.push(...departments);
    }

    if (studentIds && studentIds.length > 0) {
      whereConditions.push(`s.student_id IN (${studentIds.map(() => '?').join(',')})`);
      params.push(...studentIds);
    }

    const orderBy = allocationMode === 'roll_number_wise' 
      ? 'ORDER BY u.ID' 
      : 'ORDER BY u.department, u.ID';

    const [students] = await db.query(`
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        u.department
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ${orderBy}
    `, params);

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    if (students.length > totalAvailableCapacity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient capacity. Need ${students.length} seats, but only ${totalAvailableCapacity} available after reservations`
      });
    }

    // Sort students based on grouping and mode
    let orderedStudents = [...students];
    
    if (groupDepartments.length > 0 && allocationMode === 'department_wise') {
      // Group specified departments together
      const groupedDeptName = groupDepartments.join(' / ');
      
      const groupedStudents = [];
      const otherStudents = [];
      
      orderedStudents.forEach(student => {
        if (groupDepartments.includes(student.department)) {
          groupedStudents.push({ ...student, groupKey: groupedDeptName });
        } else {
          otherStudents.push({ ...student, groupKey: student.department });
        }
      });
      
      // Sort both groups by department/roll
      otherStudents.sort((a, b) => a.department.localeCompare(b.department) || a.roll_number.localeCompare(b.roll_number));
      groupedStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
      
      orderedStudents = [...otherStudents, ...groupedStudents];
    }

    // Allocate students to venues
    const allocation = [];
    let studentIndex = 0;

    for (const venue of venueCapacities) {
      if (studentIndex >= orderedStudents.length) break;
      if (venue.effectiveCapacity <= 0) continue;

      const venueAllocation = {
        venue: {
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          capacity: venue.capacity,
          location: venue.location,
          current_students: venue.current_students
        },
        effectiveCapacity: venue.effectiveCapacity,
        students: [],
        departmentBreakdown: {}
      };

      const studentsToAllocate = Math.min(venue.effectiveCapacity, orderedStudents.length - studentIndex);

      for (let i = 0; i < studentsToAllocate; i++) {
        const student = orderedStudents[studentIndex];
        
        venueAllocation.students.push({
          student_id: student.student_id,
          name: student.name,
          roll_number: student.roll_number,
          email: student.email,
          department: student.department
        });

        if (!venueAllocation.departmentBreakdown[student.department]) {
          venueAllocation.departmentBreakdown[student.department] = 0;
        }
        venueAllocation.departmentBreakdown[student.department]++;

        studentIndex++;
      }

      if (venueAllocation.students.length > 0) {
        allocation.push(venueAllocation);
      }
    }

    const summary = {
      totalStudents: students.length,
      totalAllocated: studentIndex,
      totalVenuesUsed: allocation.length,
      totalVenuesSelected: venues.length,
      reservedSlotsPerVenue: reservedSlots,
      allocationMode,
      groupedDepartments: groupDepartments.length > 0 ? groupDepartments : null,
      venueUtilization: allocation.map(v => ({
        venue_id: v.venue.venue_id,
        name: v.venue.venue_name,
        existing: v.venue.current_students,
        newlyAllocated: v.students.length,
        totalAfter: v.venue.current_students + v.students.length,
        capacity: v.venue.capacity,
        reserved: reservedSlots
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        allocation,
        summary
      }
    });
  } catch (error) {
    console.error('Error previewing allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview allocation: ' + error.message
    });
  }
};

/**
 * Execute allocation - allocate students to existing venues
 * Now includes scheduling with start and end dates
 * POST /api/venue-allocation/execute
 * Body: {
 *   year: 1,
 *   venueIds: [1, 2, 3],
 *   departments: ["CSE", "IT"],
 *   studentIds: [1, 2, 3],
 *   reservedSlots: 2,
 *   groupDepartments: ["CSE", "IT"],
 *   allocationMode: "department_wise",
 *   groupSpecification: "Regular Lab",
 *   scheduleStartDate: "2026-02-07",  // NEW
 *   scheduleEndDate: "2026-05-31",     // NEW
 * }
 */
export const executeAllocation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { 
      year, 
      venueIds: rawVenueIds, 
      departments,
      reservedSlots = 2, 
      groupDepartments = [],
      allocationMode = 'department_wise',
      groupSpecification = ''
    } = req.body;

    // Parse venueIds properly
    const venueIds = Array.isArray(rawVenueIds) 
      ? rawVenueIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0)
      : [];

    if (!year || venueIds.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Year and venue selection are required'
      });
    }

    console.log('Execute allocation request:', { year, venueIds, departments, reservedSlots });

    // Get selected venues from database
    console.log('Step 1: Fetching venues...');
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.location,
        COUNT(DISTINCT gs.student_id) as current_students
      FROM venue v
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.venue_id IN (${venueIds.map(() => '?').join(',')})
        AND v.deleted_at IS NULL 
        AND v.status = 'Active'
      GROUP BY v.venue_id
      ORDER BY v.venue_name
    `, venueIds);

    if (venues.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No valid venues found'
      });
    }

    // Calculate capacities
    console.log('Step 2: Calculating capacities, found', venues.length, 'venues');
    const venueCapacities = venues.map(v => ({
      ...v,
      current_students: parseInt(v.current_students) || 0,
      effectiveCapacity: Math.max(0, v.capacity - parseInt(v.current_students || 0) - reservedSlots)
    }));

    const totalAvailableCapacity = venueCapacities.reduce((sum, v) => sum + v.effectiveCapacity, 0);
    console.log('Step 3: Total available capacity:', totalAvailableCapacity);

    // Build student query
    let whereConditions = ['s.year = ?', 'u.role_id = 3', 'u.is_active = 1'];
    let params = [year];

    whereConditions.push(`
      NOT EXISTS (
        SELECT 1 FROM group_students gs
        INNER JOIN \`groups\` g ON gs.group_id = g.group_id
        WHERE gs.student_id = s.student_id AND gs.status = 'Active'
      )
    `);

    if (departments && departments.length > 0) {
      whereConditions.push(`u.department IN (${departments.map(() => '?').join(',')})`);
      params.push(...departments);
    }

    const orderBy = allocationMode === 'roll_number_wise' 
      ? 'ORDER BY u.ID' 
      : 'ORDER BY u.department, u.ID';

    console.log('Step 4: Fetching students...');
    const [students] = await db.query(`
      SELECT 
        s.student_id,
        u.user_id,
        u.name,
        u.ID as roll_number,
        u.email,
        u.department
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ${orderBy}
    `, params);
    console.log('Step 5: Found', students.length, 'students');

    if (students.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    if (students.length > totalAvailableCapacity) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Insufficient capacity. Need ${students.length} seats, but only ${totalAvailableCapacity} available`
      });
    }

    // Sort students for allocation
    let orderedStudents = [...students];
    
    if (groupDepartments.length > 0 && allocationMode === 'department_wise') {
      const groupedStudents = orderedStudents.filter(s => groupDepartments.includes(s.department));
      const otherStudents = orderedStudents.filter(s => !groupDepartments.includes(s.department));
      
      otherStudents.sort((a, b) => a.department.localeCompare(b.department) || a.roll_number.localeCompare(b.roll_number));
      groupedStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
      
      orderedStudents = [...otherStudents, ...groupedStudents];
    }

    console.log('Step 6: Starting transaction');
    await connection.beginTransaction();

    const allocationResults = [];
    let studentIndex = 0;

    for (const venue of venueCapacities) {
      if (studentIndex >= orderedStudents.length) break;
      if (venue.effectiveCapacity <= 0) continue;

      console.log('Step 7: Processing venue', venue.venue_id, venue.venue_name);

      // Check if venue already has an active group, or create new one
      const [existingGroups] = await connection.query(`
        SELECT group_id, group_name FROM \`groups\` 
        WHERE venue_id = ? AND status = 'Active'
        LIMIT 1
      `, [venue.venue_id]);

      let groupId;
      let groupName;

      if (existingGroups.length > 0) {
        groupId = existingGroups[0].group_id;
        groupName = existingGroups[0].group_name;
        console.log('Step 8: Using existing group', groupId);
      } else {
        // Create new group for this venue
        const groupCode = `V${venue.venue_id}-${Date.now()}`;
        groupName = groupSpecification 
          ? `${venue.venue_name} - ${groupSpecification}`
          : `${venue.venue_name} - Group`;

        console.log('Step 8: Creating new group for venue', venue.venue_id);
        const [groupResult] = await connection.query(`
          INSERT INTO \`groups\` (group_code, group_name, venue_id, faculty_id, schedule_days, schedule_time, max_students, department, status, created_at)
          VALUES (?, ?, ?, NULL, 'Mon-Fri', '09:00-17:00', ?, 'Multiple', 'Active', NOW())
        `, [groupCode, groupName, venue.venue_id, venue.capacity]);
        groupId = groupResult.insertId;
        console.log('Step 9: Created group', groupId);
      }

      const venueStudents = [];
      const studentsToAllocate = Math.min(venue.effectiveCapacity, orderedStudents.length - studentIndex);
      console.log('Step 10: Allocating', studentsToAllocate, 'students to venue', venue.venue_id);

      for (let i = 0; i < studentsToAllocate; i++) {
        const student = orderedStudents[studentIndex];

        try {
          // Use INSERT ... ON DUPLICATE KEY UPDATE to handle any existing records safely
          const [result] = await connection.query(`
            INSERT INTO group_students (group_id, student_id, status, allocation_date)
            VALUES (?, ?, 'Active', NOW())
            ON DUPLICATE KEY UPDATE 
              group_id = VALUES(group_id),
              status = 'Active',
              allocation_date = NOW()
          `, [groupId, student.student_id]);

          // Check if it was an insert (affectedRows=1) or update (affectedRows=2)
          if (result.affectedRows > 0) {
            venueStudents.push({
              student_id: student.student_id,
              name: student.name,
              roll_number: student.roll_number,
              department: student.department
            });
          }
        } catch (insertErr) {
          console.error('Error allocating student', student.student_id, ':', insertErr.message);
        }

        studentIndex++;
      }

      allocationResults.push({
        venue_id: venue.venue_id,
        venue_name: venue.venue_name,
        group_id: groupId,
        group_name: groupName,
        existing_students: venue.current_students,
        newly_allocated: venueStudents.length,
        total_students: venue.current_students + venueStudents.length,
        capacity: venue.capacity
      });
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: `Successfully allocated ${studentIndex} students to ${allocationResults.length} venues`,
      data: {
        totalAllocated: studentIndex,
        venuesUsed: allocationResults.length,
        allocation: allocationResults
      }
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      // Ignore rollback errors (happens if transaction wasn't started)
    }
    console.error('Error executing allocation:', error);
    console.error('Error SQL:', error.sql || 'N/A');
    res.status(500).json({
      success: false,
      message: 'Failed to execute allocation: ' + error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Create a new venue
 * POST /api/venue-allocation/create-venue
 */
export const createVenue = async (req, res) => {
  try {
    const { venue_name, capacity, location, year, group_specification } = req.body;

    if (!venue_name || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Venue name and capacity are required'
      });
    }

    const [result] = await db.query(`
      INSERT INTO venue (venue_name, capacity, location, year, group_specification, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `, [venue_name, capacity, location || '', year || null, group_specification || null]);

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: {
        venue_id: result.insertId,
        venue_name,
        capacity,
        location,
        year,
        group_specification
      }
    });
  } catch (error) {
    console.error('Error creating venue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create venue: ' + error.message
    });
  }
};

/**
 * Delete/Soft-delete a venue
 * DELETE /api/venue-allocation/venue/:venueId
 */
export const deleteVenue = async (req, res) => {
  try {
    const { venueId } = req.params;

    // Soft delete
    await db.query(`
      UPDATE venue SET deleted_at = NOW(), status = 'Inactive'
      WHERE venue_id = ?
    `, [venueId]);

    res.status(200).json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting venue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete venue: ' + error.message
    });
  }
};

/**
 * Get allocation statistics
 * GET /api/venue-allocation/stats
 */
export const getAllocationStats = async (req, res) => {
  try {
    // Students by year and allocation status
    const [studentStats] = await db.query(`
      SELECT 
        s.year,
        COUNT(*) as total,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        ) THEN 1 ELSE 0 END) as allocated,
        SUM(CASE WHEN NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        ) THEN 1 ELSE 0 END) as unallocated
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3 AND u.is_active = 1
      GROUP BY s.year
      ORDER BY s.year
    `);

    // Venue stats
    const [venueStats] = await db.query(`
      SELECT 
        COUNT(*) as total_venues,
        SUM(capacity) as total_capacity,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_venues
      FROM venue
      WHERE deleted_at IS NULL
    `);

    res.status(200).json({
      success: true,
      data: {
        students: studentStats,
        venues: venueStats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

/**
 * Get expiring allocations (schedules ending within X days)
 * GET /api/venue-allocation/expiring?days=7
 */
export const getExpiringAllocations = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + parseInt(days));

    // First check if the schedule columns exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME = 'schedule_end_date'
    `);

    // If schedule columns don't exist, return empty data
    if (columns.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          expiring: [],
          expired: [],
          totalExpiring: 0,
          totalExpired: 0,
          message: 'Schedule columns not yet created. Please run the migration.'
        }
      });
    }

    // Get groups with schedule_end_date approaching
    const [expiringGroups] = await db.query(`
      SELECT 
        g.group_id,
        g.group_name,
        g.schedule_start_date,
        g.schedule_end_date,
        g.allocation_batch,
        v.venue_id,
        v.venue_name,
        v.location,
        COUNT(DISTINCT gs.student_id) as student_count,
        DATEDIFF(g.schedule_end_date, CURDATE()) as days_remaining
      FROM \`groups\` g
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE g.status = 'Active'
        AND g.schedule_end_date IS NOT NULL
        AND g.schedule_end_date <= ?
        AND g.schedule_end_date >= CURDATE()
      GROUP BY g.group_id
      ORDER BY g.schedule_end_date ASC
    `, [warningDate]);

    // Get already expired groups
    const [expiredGroups] = await db.query(`
      SELECT 
        g.group_id,
        g.group_name,
        g.schedule_start_date,
        g.schedule_end_date,
        g.allocation_batch,
        v.venue_id,
        v.venue_name,
        v.location,
        COUNT(DISTINCT gs.student_id) as student_count,
        DATEDIFF(CURDATE(), g.schedule_end_date) as days_overdue
      FROM \`groups\` g
      INNER JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE g.status = 'Active'
        AND g.schedule_end_date IS NOT NULL
        AND g.schedule_end_date < CURDATE()
      GROUP BY g.group_id
      ORDER BY g.schedule_end_date DESC
    `);

    res.status(200).json({
      success: true,
      data: {
        expiring: expiringGroups.map(g => ({
          ...g,
          schedule_start_date: g.schedule_start_date ? new Date(g.schedule_start_date).toISOString().split('T')[0] : null,
          schedule_end_date: g.schedule_end_date ? new Date(g.schedule_end_date).toISOString().split('T')[0] : null,
          status: 'expiring_soon'
        })),
        expired: expiredGroups.map(g => ({
          ...g,
          schedule_start_date: g.schedule_start_date ? new Date(g.schedule_start_date).toISOString().split('T')[0] : null,
          schedule_end_date: g.schedule_end_date ? new Date(g.schedule_end_date).toISOString().split('T')[0] : null,
          status: 'expired'
        })),
        totalExpiring: expiringGroups.length,
        totalExpired: expiredGroups.length
      }
    });
  } catch (error) {
    console.error('Error fetching expiring allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring allocations'
    });
  }
};

/**
 * Get active allocation schedules
 * GET /api/venue-allocation/schedules?year=1
 */
export const getActiveSchedules = async (req, res) => {
  try {
    const { year } = req.query;

    // Get allocation batches from groups
    let query = `
      SELECT 
        g.allocation_batch as batch_code,
        g.group_name,
        MIN(g.schedule_start_date) as start_date,
        MAX(g.schedule_end_date) as end_date,
        COUNT(DISTINCT g.group_id) as venue_count,
        COUNT(DISTINCT gs.student_id) as student_count,
        CASE 
          WHEN MAX(g.schedule_end_date) < CURDATE() THEN 'Expired'
          WHEN MIN(g.schedule_start_date) > CURDATE() THEN 'Upcoming'
          ELSE 'Active'
        END as status
      FROM \`groups\` g
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE g.status = 'Active'
        AND g.allocation_batch IS NOT NULL
    `;
    
    const params = [];
    if (year) {
      query += ` AND EXISTS (
        SELECT 1 FROM students s 
        INNER JOIN group_students gs2 ON s.student_id = gs2.student_id 
        WHERE gs2.group_id = g.group_id AND s.year = ?
      )`;
      params.push(year);
    }
    
    query += ` GROUP BY g.allocation_batch ORDER BY start_date DESC`;

    const [schedules] = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: schedules.map(s => ({
        ...s,
        start_date: s.start_date ? new Date(s.start_date).toISOString().split('T')[0] : null,
        end_date: s.end_date ? new Date(s.end_date).toISOString().split('T')[0] : null
      }))
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules'
    });
  }
};

/**
 * Check if a schedule exists for given date range
 * POST /api/venue-allocation/check-schedule
 */
export const checkScheduleConflict = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // First check if the schedule columns exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME IN ('schedule_start_date', 'schedule_end_date', 'allocation_batch')
    `);

    // If schedule columns don't exist, return no conflict (fresh database)
    if (columns.length < 3) {
      return res.status(200).json({
        success: true,
        hasConflict: false,
        message: 'No existing schedule for the selected dates. You can proceed with allocation.',
        columnsExist: false
      });
    }

    // Check for overlapping schedules
    let query = `
      SELECT 
        g.allocation_batch as batch_code,
        MIN(g.schedule_start_date) as start_date,
        MAX(g.schedule_end_date) as end_date,
        COUNT(DISTINCT g.group_id) as venue_count,
        COUNT(DISTINCT gs.student_id) as student_count,
        v.venue_name,
        v.location
      FROM \`groups\` g
      LEFT JOIN venue v ON g.venue_id = v.venue_id
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE g.status = 'Active'
        AND g.allocation_batch IS NOT NULL
        AND (
          (g.schedule_start_date <= ? AND g.schedule_end_date >= ?) OR
          (g.schedule_start_date <= ? AND g.schedule_end_date >= ?) OR
          (g.schedule_start_date >= ? AND g.schedule_end_date <= ?)
        )
    `;
    
    const params = [endDate, startDate, startDate, startDate, startDate, endDate];

    if (year) {
      query += ` AND EXISTS (
        SELECT 1 FROM students s 
        INNER JOIN group_students gs2 ON s.student_id = gs2.student_id 
        WHERE gs2.group_id = g.group_id AND s.year = ?
      )`;
      params.push(year);
    }

    query += ` GROUP BY g.allocation_batch, v.venue_id`;

    const [existingSchedules] = await db.query(query, params);

    if (existingSchedules.length > 0) {
      // Group by batch_code
      const batches = {};
      existingSchedules.forEach(s => {
        if (!batches[s.batch_code]) {
          batches[s.batch_code] = {
            batch_code: s.batch_code,
            start_date: s.start_date ? new Date(s.start_date).toISOString().split('T')[0] : null,
            end_date: s.end_date ? new Date(s.end_date).toISOString().split('T')[0] : null,
            venues: [],
            total_students: 0
          };
        }
        batches[s.batch_code].venues.push({
          venue_name: s.venue_name,
          location: s.location,
          student_count: parseInt(s.student_count) || 0
        });
        batches[s.batch_code].total_students += parseInt(s.student_count) || 0;
      });

      return res.status(200).json({
        success: true,
        hasConflict: true,
        message: 'Schedule already exists for the selected date range',
        existingSchedules: Object.values(batches)
      });
    }

    res.status(200).json({
      success: true,
      hasConflict: false,
      message: 'No existing schedule for the selected dates. You can proceed with allocation.'
    });
  } catch (error) {
    console.error('Error checking schedule conflict:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check schedule conflict'
    });
  }
};

/**
 * Get detailed student-venue mapping for display
 * GET /api/venue-allocation/mappings?year=1&venueId=1
 */
export const getStudentVenueMapping = async (req, res) => {
  try {
    const { year, venueId, department } = req.query;

    let whereConditions = ['g.status = \'Active\'', 'gs.status = \'Active\''];
    let params = [];

    if (year) {
      whereConditions.push('s.year = ?');
      params.push(year);
    }

    if (venueId) {
      whereConditions.push('v.venue_id = ?');
      params.push(venueId);
    }

    if (department) {
      whereConditions.push('u.department = ?');
      params.push(department);
    }

    const [mappings] = await db.query(`
      SELECT 
        s.student_id,
        u.name as student_name,
        u.ID as roll_number,
        u.email,
        u.department,
        s.year,
        v.venue_id,
        v.venue_name,
        v.location as venue_location,
        v.capacity as venue_capacity,
        g.group_id,
        g.group_name,
        g.schedule_start_date,
        g.schedule_end_date,
        gs.allocation_date,
        NULL as days_until_expiry
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      INNER JOIN students s ON gs.student_id = s.student_id
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY v.venue_name, u.department, u.ID
    `, params);

    // Group by venue for better display
    const venueGroups = {};
    mappings.forEach(m => {
      if (!venueGroups[m.venue_id]) {
        venueGroups[m.venue_id] = {
          venue_id: m.venue_id,
          venue_name: m.venue_name,
          venue_location: m.venue_location,
          venue_capacity: m.venue_capacity,
          group_name: m.group_name,
          schedule_start_date: m.schedule_start_date ? new Date(m.schedule_start_date).toISOString().split('T')[0] : null,
          schedule_end_date: m.schedule_end_date ? new Date(m.schedule_end_date).toISOString().split('T')[0] : null,
          days_until_expiry: m.days_until_expiry,
          allocation_batch: m.allocation_batch,
          students: [],
          departmentBreakdown: {}
        };
      }
      
      venueGroups[m.venue_id].students.push({
        student_id: m.student_id,
        name: m.student_name,
        roll_number: m.roll_number,
        email: m.email,
        department: m.department,
        year: m.year,
        allocation_date: m.allocation_date ? new Date(m.allocation_date).toISOString().split('T')[0] : null
      });

      if (!venueGroups[m.venue_id].departmentBreakdown[m.department]) {
        venueGroups[m.venue_id].departmentBreakdown[m.department] = 0;
      }
      venueGroups[m.venue_id].departmentBreakdown[m.department]++;
    });

    res.status(200).json({
      success: true,
      data: {
        venues: Object.values(venueGroups),
        totalStudents: mappings.length,
        totalVenues: Object.keys(venueGroups).length
      }
    });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student-venue mappings'
    });
  }
};

/**
 * Extend or update schedule dates for a group/batch
 * PUT /api/venue-allocation/schedule/:batchCode
 */
export const updateScheduleDates = async (req, res) => {
  try {
    const { batchCode } = req.params;
    const { newEndDate, newStartDate, notes } = req.body;

    if (!newEndDate) {
      return res.status(400).json({
        success: false,
        message: 'New end date is required'
      });
    }

    // First check if the schedule columns exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME IN ('schedule_start_date', 'schedule_end_date')
    `);

    if (columns.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Schedule columns do not exist. Please run the migration first.'
      });
    }

    const endDate = new Date(newEndDate);
    const startDate = newStartDate ? new Date(newStartDate) : null;

    // Update all groups with this batch code
    const [result] = await db.query(`
      UPDATE \`groups\`
      SET schedule_end_date = ?,
          schedule_start_date = COALESCE(?, schedule_start_date)
      WHERE allocation_batch = ? AND status = 'Active'
    `, [endDate, startDate, batchCode]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active groups found with this batch code'
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.affectedRows} groups`,
      data: {
        batchCode,
        newEndDate: endDate.toISOString().split('T')[0],
        newStartDate: startDate ? startDate.toISOString().split('T')[0] : null,
        groupsUpdated: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule: ' + error.message
    });
  }
};

/**
 * Get notification alerts for admin dashboard
 * GET /api/venue-allocation/alerts
 */
export const getAlerts = async (req, res) => {
  try {
    const alerts = [];
    
    // First check if the schedule columns exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME = 'schedule_end_date'
    `);

    const hasScheduleColumns = columns.length > 0;

    // Only check schedule-related alerts if columns exist
    if (hasScheduleColumns) {
      // Check for expiring allocations (within 7 days)
      const [expiringSoon] = await db.query(`
        SELECT COUNT(DISTINCT g.group_id) as count
        FROM \`groups\` g
        WHERE g.status = 'Active'
          AND g.schedule_end_date IS NOT NULL
          AND g.schedule_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      `);

      if (expiringSoon[0].count > 0) {
        alerts.push({
          type: 'warning',
          title: 'Allocations Expiring Soon',
          message: `${expiringSoon[0].count} venue allocation(s) will expire within the next 7 days`,
          action: 'View expiring allocations',
          actionUrl: '/admin/venue-allocation?tab=expiring',
          priority: 'high'
        });
      }

      // Check for already expired
      const [expired] = await db.query(`
        SELECT COUNT(DISTINCT g.group_id) as count
        FROM \`groups\` g
        WHERE g.status = 'Active'
          AND g.schedule_end_date IS NOT NULL
          AND g.schedule_end_date < CURDATE()
      `);

      if (expired[0].count > 0) {
        alerts.push({
          type: 'error',
          title: 'Expired Allocations',
          message: `${expired[0].count} venue allocation(s) have expired and need renewal`,
          action: 'Renew allocations',
          actionUrl: '/admin/venue-allocation?tab=expired',
          priority: 'critical'
        });
      }
    }

    // Check for unallocated students (this doesn't need the new columns)
    const [unallocated] = await db.query(`
      SELECT COUNT(*) as count
      FROM students s
      INNER JOIN users u ON s.user_id = u.user_id
      WHERE u.role_id = 3 AND u.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM group_students gs
          INNER JOIN \`groups\` g ON gs.group_id = g.group_id
          WHERE gs.student_id = s.student_id AND gs.status = 'Active'
        )
    `);

    if (unallocated[0].count > 0) {
      alerts.push({
        type: 'info',
        title: 'Unallocated Students',
        message: `${unallocated[0].count} student(s) are not allocated to any venue`,
        action: 'Allocate students',
        actionUrl: '/admin/venue-allocation',
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        hasHighPriority: alerts.some(a => a.priority === 'critical' || a.priority === 'high'),
        scheduleColumnsExist: hasScheduleColumns
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts'
    });
  }
};
