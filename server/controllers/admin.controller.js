import db from '../config/db.js';

// Get all users with their roles
export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.ID,
        u.department,
        u.is_active,
        u.role_id,
        CASE 
          WHEN u.role_id = 1 THEN 'admin'
          WHEN u.role_id = 2 THEN 'faculty'
          WHEN u.role_id = 3 THEN 'student'
          ELSE 'unknown'
        END as role,
        u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const roleMap = {
      'admin': 1,
      'faculty': 2,
      'student': 3
    };

    if (!roleMap[role]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be admin, faculty, or student' 
      });
    }

    const newRoleId = roleMap[role];

    await connection.beginTransaction();

    // Get current user details
    const [currentUser] = await connection.query(
      'SELECT user_id, role_id, name, email FROM users WHERE user_id = ?',
      [userId]
    );

    if (currentUser.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const currentRoleId = currentUser[0].role_id;

    // Prevent changing role if it's the same
    if (currentRoleId === newRoleId) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'User already has this role' 
      });
    }

    // Handle role-specific data cleanup and creation
    if (currentRoleId === 2) {
      // Removing from faculty role - delete faculty record
      await connection.query('DELETE FROM faculties WHERE user_id = ?', [userId]);
    } else if (currentRoleId === 3) {
      // Removing from student role - delete student record
      await connection.query('DELETE FROM students WHERE user_id = ?', [userId]);
    }

    // Update role in users table
    await connection.query(
      'UPDATE users SET role_id = ? WHERE user_id = ?',
      [newRoleId, userId]
    );

    // Create role-specific record
    if (newRoleId === 2) {
      // Creating faculty record
      await connection.query(
        'INSERT INTO faculties (user_id, designation) VALUES (?, ?)',
        [userId, 'Faculty']
      );
    } else if (newRoleId === 3) {
      // Creating student record
      await connection.query(
        'INSERT INTO students (user_id, year, semester) VALUES (?, ?, ?)',
        [userId, 1, 1]
      );
    }

    await connection.commit();

    console.log(`✅ Role changed: User ${userId} (${currentUser[0].name}) changed from role_id ${currentRoleId} to ${newRoleId} (${role})`);

    res.status(200).json({ 
      success: true, 
      message: `User role updated to ${role} successfully` 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  } finally {
    connection.release();
  }
};

// Get user permissions
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const [permissions] = await db.query(
      'SELECT * FROM user_permissions WHERE user_id = ?',
      [userId]
    );

    if (permissions.length === 0) {
      // Return default permissions
      return res.status(200).json({ 
        success: true, 
        data: {
          tasks: false,
          assignments: false,
          questionBank: false,
          attendance: false,
          grades: false,
          students: false,
          venues: false
        }
      });
    }

    const permData = permissions[0];
    res.status(200).json({ 
      success: true, 
      data: {
        tasks: Boolean(permData.can_manage_tasks),
        assignments: Boolean(permData.can_manage_assignments),
        questionBank: Boolean(permData.can_manage_question_bank),
        attendance: Boolean(permData.can_manage_attendance),
        grades: Boolean(permData.can_manage_grades),
        students: Boolean(permData.can_manage_students),
        venues: Boolean(permData.can_manage_venues)
      }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch permissions' });
  }
};

// Update user permissions
export const updateUserPermissions = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    await connection.beginTransaction();

    // Check if user exists
    const [user] = await connection.query(
      'SELECT user_id, name, role_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if permissions record exists
    const [existingPerms] = await connection.query(
      'SELECT user_id FROM user_permissions WHERE user_id = ?',
      [userId]
    );

    if (existingPerms.length > 0) {
      // Update existing permissions
      await connection.query(
        `UPDATE user_permissions SET 
          can_manage_tasks = ?,
          can_manage_assignments = ?,
          can_manage_question_bank = ?,
          can_manage_attendance = ?,
          can_manage_grades = ?,
          can_manage_students = ?,
          can_manage_venues = ?,
          updated_at = NOW()
        WHERE user_id = ?`,
        [
          permissions.tasks ? 1 : 0,
          permissions.assignments ? 1 : 0,
          permissions.questionBank ? 1 : 0,
          permissions.attendance ? 1 : 0,
          permissions.grades ? 1 : 0,
          permissions.students ? 1 : 0,
          permissions.venues ? 1 : 0,
          userId
        ]
      );
    } else {
      // Insert new permissions
      await connection.query(
        `INSERT INTO user_permissions 
          (user_id, can_manage_tasks, can_manage_assignments, can_manage_question_bank, 
           can_manage_attendance, can_manage_grades, can_manage_students, can_manage_venues, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          permissions.tasks ? 1 : 0,
          permissions.assignments ? 1 : 0,
          permissions.questionBank ? 1 : 0,
          permissions.attendance ? 1 : 0,
          permissions.grades ? 1 : 0,
          permissions.students ? 1 : 0,
          permissions.venues ? 1 : 0
        ]
      );
    }

    await connection.commit();

    console.log(`✅ Permissions updated for user ${userId} (${user[0].name})`);

    res.status(200).json({ 
      success: true, 
      message: 'Permissions updated successfully' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to update permissions' });
  } finally {
    connection.release();
  }
};
