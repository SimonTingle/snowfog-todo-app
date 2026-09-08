/**
 * Authentication Module
 * Manages password hashing, session tokens, cookie handling, and user database validation.
 * 
 * Documentation & Reference Sources:
 * - Node.js Crypto Module: https://nodejs.org/api/crypto.html#crypto
 * - bcryptjs Library: https://www.npmjs.com/package/bcryptjs
 * - MDN HTTP Cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
 * - MDN Set-Cookie Header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

// In-memory Map to store active session tokens mapped to user records
const sessions = new Map();

/**
 * Parses raw Cookie header string from HTTP request into a key-value JavaScript object.
 * @param {import('http').IncomingMessage} req 
 * @returns {Object.<string, string>}
 */
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

/**
 * Retrieves authenticated user data matching the session token found in request cookies.
 * @param {import('http').IncomingMessage} req 
 * @returns {Promise<Object|null>} User object if valid, else null
 */
async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;
  if (!token) return null;
  return sessions.get(token) || null;
}

/**
 * Hashes password with bcrypt and inserts a new user record into the database.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} Created user record (id, email)
 */
async function registerUser(email, password) {
  // Salt and hash password (cost factor 10)
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Validates user credentials against stored bcrypt hash.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object|null>} User object on success, else null
 */
async function loginUser(email, password) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return null;

  // Compare submitted plain password with hashed password in database
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, email: user.email };
}

/**
 * Generates a random session token, registers it in memory, and builds a Set-Cookie string.
 * @param {Object} user 
 * @returns {string} Set-Cookie header string
 */
function createSession(user) {
  // Generate a cryptographically secure 64-character hex string token
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user);
  // HttpOnly prevents client XSS access; SameSite=Lax defends against CSRF
  return `session_token=${token}; HttpOnly; Path=/; SameSite=Lax`;
}

/**
 * Invalidates active session token and creates an expiring cookie header to clear browser cookie.
 * @param {import('http').IncomingMessage} req 
 * @returns {string} Expiring Set-Cookie header string
 */
function destroySession(req) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;
  if (token) {
    sessions.delete(token);
  }
  return `session_token=; HttpOnly; Path=/; Max-Age=0`;
}

module.exports = {
  getSessionUser,
  registerUser,
  loginUser,
  createSession,
  destroySession
};
