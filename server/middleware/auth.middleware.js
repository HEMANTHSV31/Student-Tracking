import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';

export const authenticate = (req, res, next) => {
  const authHeaderToken = req.headers.authorization?.split(' ')[1];
  const cookieToken = req.cookies?.auth_token;

  const tokenCandidates = [];
  if (authHeaderToken) tokenCandidates.push(authHeaderToken);
  if (cookieToken && cookieToken !== authHeaderToken) tokenCandidates.push(cookieToken);

  if (tokenCandidates.length === 0) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  const normalizeIP = (rawIP) => {
    if (!rawIP) return null;
    const first = String(rawIP).split(',')[0].trim();
    if (first === '::1') return '127.0.0.1';
    if (first.startsWith('::ffff:')) return first.substring(7);
    return first;
  };

  let decoded = null;
  for (const token of tokenCandidates) {
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      break;
    } catch (err) {
      // Try next available token source
    }
  }

  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  try {
    const clientIP = normalizeIP(req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress);
    const tokenIP = normalizeIP(decoded.ip);

    if (tokenIP && clientIP && tokenIP !== clientIP) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`[SECURITY] IP mismatch - Token IP: ${tokenIP}, Request IP: ${clientIP}`);
        return res.status(403).json({ message: 'Token cannot be used from a different device' });
      }

      // In development environments (localhost, proxy, VPN), IP can change often.
      console.warn(`[AUTH] Ignoring IP mismatch in ${process.env.NODE_ENV || 'development'} mode - Token IP: ${tokenIP}, Request IP: ${clientIP}`);
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Authentication middleware error' });
  }
};
