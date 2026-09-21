// services/authService.js — Phase 5: Authentication.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '30d';

// Dev-only fallback so the backend doesn't crash if JWT_SECRET is
// unset in a local .env — production deployments MUST set a real
// secret (see .env.example); this fallback is intentionally obvious
// so it's never mistaken for a real one.
const JWT_SECRET = process.env.JWT_SECRET || 'agrisphere-dev-only-insecure-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set — using an insecure development default. Set JWT_SECRET in .env before deploying.');
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** @returns {object|null} decoded payload, or null if invalid/expired */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
