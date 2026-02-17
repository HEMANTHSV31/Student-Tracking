import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import db from '../config/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'No token' });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email } = ticket.getPayload();

    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, r.role
       FROM users u
       JOIN role r ON u.role_id = r.role_id
       WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(403).json({ message: 'User not authorized' });
    }

    const user = rows[0];
  
    // Get user permissions (handle if table doesn't exist yet)
    let userPermissions = {};
    try {
      const [permissions] = await db.query(
        `SELECT can_access_question_bank, can_manage_tasks, can_access_classes_groups 
         FROM user_permissions WHERE user_id = ?`,
        [user.user_id]
      );

      userPermissions = permissions.length > 0 ? {
        questionBank: Boolean(permissions[0].can_access_question_bank),
        tasks: Boolean(permissions[0].can_manage_tasks),
        classes: Boolean(permissions[0].can_access_classes_groups)
      } : {};
    } catch (err) {
      // Table doesn't exist yet or query failed - continue without permissions
      console.warn('Could not fetch user permissions:', err.message);
    }
  
    // Get client IP for token binding
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        email: user.email,
        ip: clientIP
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set secure httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (same as JWT)
      path: '/'
    });

    // Still return token for localStorage fallback (will remove later)
    res.json({ 
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: userPermissions
      }
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Get authenticated user's data
export const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.name, u.email, u.ID, u.department, r.role
       FROM users u
       JOIN role r ON u.role_id = r.role_id
       WHERE u.user_id = ? AND u.is_active = 1`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Get user permissions (handle if table doesn't exist yet)
    let userPermissions = {};
    try {
      const [permissions] = await db.query(
        `SELECT can_access_question_bank, can_manage_tasks, can_access_classes_groups 
         FROM user_permissions WHERE user_id = ?`,
        [req.user.user_id]
      );

      userPermissions = permissions.length > 0 ? {
        questionBank: Boolean(permissions[0].can_access_question_bank),
        tasks: Boolean(permissions[0].can_manage_tasks),
        classes: Boolean(permissions[0].can_access_classes_groups)
      } : {};
    } catch (err) {
      // Table doesn't exist yet or query failed - continue without permissions
      console.warn('Could not fetch user permissions:', err.message);
    }

    res.json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        ID: user.ID,
        department: user.department,
        permissions: userPermissions
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

// Logout - clear httpOnly cookie
export const logout = async (req, res) => {
  try {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Logout failed' });
  }
};
