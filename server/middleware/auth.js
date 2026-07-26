const crypto = require('crypto');

/**
 * Simple authentication & authorisation middleware.
 *
 * - Accepts token from:
 *   1.  `Authorization: Bearer <token>` header (recommended)
 *   2.  `session_token` in JSON body (fallback for existing clients)
 *
 * The middleware queries the `users` table for a matching active session.
 * If found and not expired, the user record is attached to `req.user`.
 */
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  if (req.body && req.body.session_token) return req.body.session_token;
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  // Grace period: allow read-only (GET) access without auth so existing frontend keeps working.
  // TODO: remove this once frontend sends Authorization header.
  if (!token) {
    if (req.method === 'GET') return next();
    return res.status(401).json({ success: false, message: 'Unauthorized: token missing' });
  }

  const db = req.app.locals.db;
  const sql = 'SELECT id, full_name, role, session_expires_at FROM users WHERE session_token = ? LIMIT 1';
  db.query(sql, [token], (err, results) => {
    if (err) {
      console.error('Auth DB error:', err);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    const user = results[0];
    if (user.session_expires_at && new Date(user.session_expires_at) <= new Date()) {
      return res.status(401).json({ success: false, message: 'Session expired' });
    }

    req.user = { id: user.id, name: user.full_name, role: user.role };
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
