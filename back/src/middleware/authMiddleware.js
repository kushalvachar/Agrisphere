// middleware/authMiddleware.js — Phase 5.
//
// NOTE ON SCOPE: this protects the new /api/auth/me endpoint and is
// available for any route that needs it, but the pre-existing data
// routes (offers, transactions, markets, etc.) are NOT retrofitted to
// require a token in this pass — that would be a much larger, higher-
// regression-risk change across the whole existing API surface than
// this pass could safely make and verify. What Phase 5 delivers is a
// real, working registration/login/session system and a frontend that
// gates each role's dashboard behind it — the identity a farmer/FPO/
// buyer sees on their own dashboard is genuinely theirs, not a shared
// hardcoded demo name.
import { verifyToken } from '../services/authService.js';
import User from '../models/User.js';

export function requireAuth(...allowedRoles) {
  return async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: 'Invalid or expired session' });

    if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this action' });
    }

    const user = await User.findById(decoded.sub).lean();
    if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists' });

    req.user = { id: user._id, role: user.role, profileId: user.profileId, profileModel: user.profileModel };
    next();
  };
}
