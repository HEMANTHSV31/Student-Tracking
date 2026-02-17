import db from '../config/db.js';

/**
 * Enhanced role-based access control middleware
 * Validates role from database, not just from JWT token
 * Prevents client-side role manipulation
 */

/**
 * Authorize specific roles
 * @param {Array<string>} allowedRoles - Array of allowed roles: ['admin', 'faculty', 'student']
 */
export const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // JWT token already verified by authenticate middleware
      const user_id = req.user.user_id;
      const jwtRole = req.user.role;

      // CRITICAL: Verify role from database (prevent client-side manipulation)
      const [userRows] = await db.query(
        `SELECT u.user_id, r.role, u.is_active
         FROM users u
         JOIN role r ON u.role_id = r.role_id
         WHERE u.user_id = ?`,
        [user_id]
      );

      if (userRows.length === 0) {
        return res.status(403).json({ 
          success: false,
          message: 'User not found or inactive' 
        });
      }

      const dbUser = userRows[0];

      // Check if user is active
      if (!dbUser.is_active) {
        return res.status(403).json({ 
          success: false,
          message: 'Account has been deactivated' 
        });
      }

      // Validate JWT role matches database role (detect token manipulation)
      if (jwtRole !== dbUser.role) {
        console.error(`[SECURITY] Role mismatch detected: JWT=${jwtRole}, DB=${dbUser.role}, User=${user_id}`);
        return res.status(403).json({ 
          success: false,
          message: 'Invalid token - role mismatch detected' 
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(dbUser.role)) {
        return res.status(403).json({ 
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
      }

      // Attach verified role to request
      req.userRole = dbUser.role;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Authorization failed' 
      });
    }
  };
};

/**
 * Admin only access
 */
export const adminOnly = authorizeRoles('admin');

/**
 * Admin or Faculty access
 */
export const facultyOrAdmin = authorizeRoles('admin', 'faculty');

/**
 * Student only access
 */
export const studentOnly = authorizeRoles('student');

/**
 * Any authenticated user (admin, faculty, or student)
 */
export const anyRole = authorizeRoles('admin', 'faculty', 'student');

/**
 * Verify student owns the resource
 * Used when student can only access their own data
 */
export const verifyStudentOwnership = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const role = req.userRole || req.user.role;

    // Admins and faculty can access any student data
    if (role === 'admin' || role === 'faculty') {
      return next();
    }

    // For students, verify ownership
    if (role === 'student') {
      // Get student_id from database
      const [studentRows] = await db.query(
        'SELECT student_id FROM students WHERE user_id = ?',
        [user_id]
      );

      if (studentRows.length === 0) {
        return res.status(403).json({ 
          success: false,
          message: 'Student record not found' 
        });
      }

      const student_id = studentRows[0].student_id;

      // Check if request is for their own data
      const requestedStudentId = req.params.studentId || req.params.student_id;
      if (requestedStudentId && parseInt(requestedStudentId) !== parseInt(student_id)) {
        return res.status(403).json({ 
          success: false,
          message: 'You can only access your own data' 
        });
      }

      // Attach student_id for convenience
      req.student_id = student_id;
    }

    next();
  } catch (error) {
    console.error('Ownership verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Verification failed' 
    });
  }
};

/**
 * Verify faculty owns the resource or is admin
 */
export const verifyFacultyOwnership = async (req, res, next) => {
  try {
    const user_id = req.user.user_id;
    const role = req.userRole || req.user.role;

    // Admins can access anything
    if (role === 'admin') {
      return next();
    }

    // For faculty, verify ownership
    if (role === 'faculty') {
      const [facultyRows] = await db.query(
        'SELECT faculty_id FROM faculties WHERE user_id = ?',
        [user_id]
      );

      if (facultyRows.length === 0) {
        return res.status(403).json({ 
          success: false,
          message: 'Faculty record not found' 
        });
      }

      req.faculty_id = facultyRows[0].faculty_id;
    }

    next();
  } catch (error) {
    console.error('Faculty ownership verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Verification failed' 
    });
  }
};

/**
 * Check if user has specific permission
 * Allows access if user is admin OR has the specific permission
 * @param {string} permissionKey - Permission key to check (questionBank, tasks, classes)
 */
export const checkPermission = (permissionKey) => {
  // Map permission keys to database columns
  const permissionColumns = {
    questionBank: 'can_access_question_bank',
    tasks: 'can_manage_tasks',
    classes: 'can_access_classes_groups'
  };

  return async (req, res, next) => {
    try {
      const user_id = req.user.user_id;
      const role = req.userRole || req.user.role;

      // Admins always have all permissions
      if (role === 'admin') {
        return next();
      }

      // Check if permission column exists
      const columnName = permissionColumns[permissionKey];
      if (!columnName) {
        console.error(`[PERMISSION] Invalid permission key: ${permissionKey}`);
        return res.status(403).json({ 
          success: false,
          message: 'Access denied' 
        });
      }

      // Check user's permission from database
      const [permissionRows] = await db.query(
        `SELECT ${columnName} FROM user_permissions WHERE user_id = ?`,
        [user_id]
      );

      // If no permission record, deny access
      if (permissionRows.length === 0) {
        return res.status(403).json({ 
          success: false,
          message: 'Access denied - no permissions configured' 
        });
      }

      // Check if permission is granted
      const hasPermission = permissionRows[0][columnName] === 1;
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          message: `Access denied - ${permissionKey} permission required` 
        });
      }

      next();
    } catch (error) {
      console.error('[PERMISSION] Error checking permission:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Permission check failed' 
      });
    }
  };
};

/**
 * Allow access if user is admin, faculty, or has specific permission
 * @param {string} permissionKey - Permission key to check
 */
export const facultyOrPermission = (permissionKey) => {
  const permissionColumns = {
    questionBank: 'can_access_question_bank',
    tasks: 'can_manage_tasks',
    classes: 'can_access_classes_groups'
  };

  return async (req, res, next) => {
    try {
      const user_id = req.user.user_id;
      const role = req.userRole || req.user.role;

      console.log(`[PERMISSION] Checking ${permissionKey} for user ${user_id}, role: ${role}`);

      // Admins and faculty always have access
      if (role === 'admin' || role === 'faculty') {
        console.log(`[PERMISSION] Access granted (admin/faculty)`);
        return next();
      }

      // For students and others, check permission
      const columnName = permissionColumns[permissionKey];
      if (!columnName) {
        console.log(`[PERMISSION] Invalid permission key: ${permissionKey}`);
        return res.status(403).json({ 
          success: false,
          message: 'Access denied' 
        });
      }

      const [permissionRows] = await db.query(
        `SELECT ${columnName} FROM user_permissions WHERE user_id = ?`,
        [user_id]
      );

      console.log(`[PERMISSION] Permission rows:`, permissionRows);

      if (permissionRows.length === 0 || permissionRows[0][columnName] !== 1) {
        console.log(`[PERMISSION] Access denied - no permission found or not granted`);
        return res.status(403).json({ 
          success: false,
          message: 'Access denied - insufficient permissions' 
        });
      }

      console.log(`[PERMISSION] Access granted via permission`);
      next();
    } catch (error) {
      console.error('[PERMISSION] Error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Permission check failed' 
      });
    }
  };
};
