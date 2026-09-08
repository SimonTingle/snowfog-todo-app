/**
 * Application Request Router
 * Custom HTTP request routing engine handling REST API endpoints and static file delivery.
 * 
 * Documentation & Reference Sources:
 * - Node.js File System (fs): https://nodejs.org/api/fs.html
 * - Node.js Path Module: https://nodejs.org/api/path.html
 * - MDN HTTP Request Methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
 * - MDN Common MIME Types: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
 * - MDN Fetch API & JSON: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');
const auth = require('./auth');

/**
 * Sends structured JSON responses with appropriate HTTP status codes and headers.
 * @param {import('http').ServerResponse} res 
 * @param {number} status - HTTP Status Code
 * @param {Object} data - Payload object
 * @param {Object} [headers={}] - Additional headers
 */
function sendJSON(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
}

/**
 * Asynchronously buffers incoming HTTP request chunks and parses JSON payload.
 * @param {import('http').IncomingMessage} req 
 * @returns {Promise<Object>} Parsed JSON object
 */
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Main HTTP request handler callback.
 * Routing logic branches across Authentication routes, protected CRUD Todo endpoints, and static files.
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // -------------------------------------------------------------------------
    // AUTHENTICATION API ROUTES (/api/auth/*)
    // -------------------------------------------------------------------------
    
    // GET /api/auth/me - Return current logged-in user profile
    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await auth.getSessionUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });
      return sendJSON(res, 200, { user });
    }

    // POST /api/auth/register - Register a new account
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password } = await parseJSONBody(req);
      if (!email || !password || password.length < 6) {
        return sendJSON(res, 400, { error: 'Valid email and password (min 6 chars) required' });
      }
      try {
        const user = await auth.registerUser(email, password);
        const cookie = auth.createSession(user);
        return sendJSON(res, 201, { user }, { 'Set-Cookie': cookie });
      } catch (err) {
        return sendJSON(res, 400, { error: 'Email already registered' });
      }
    }

    // POST /api/auth/login - Authenticate existing credentials
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await parseJSONBody(req);
      const user = await auth.loginUser(email, password);
      if (!user) return sendJSON(res, 401, { error: 'Invalid email or password' });

      const cookie = auth.createSession(user);
      return sendJSON(res, 200, { user }, { 'Set-Cookie': cookie });
    }

    // POST /api/auth/logout - Clear session
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookie = auth.destroySession(req);
      return sendJSON(res, 200, { message: 'Logged out' }, { 'Set-Cookie': cookie });
    }

    // -------------------------------------------------------------------------
    // PROTECTED TODO API ROUTES (/api/todos/*)
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/todos')) {
      const user = await auth.getSessionUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Unauthorized' });

      // GET /api/todos - Fetch all todo items for current user
      if (pathname === '/api/todos' && method === 'GET') {
        const result = await db.query(
          'SELECT * FROM todos WHERE user_id = $1 ORDER BY id ASC',
          [user.id]
        );
        return sendJSON(res, 200, { todos: result.rows });
      }

      // POST /api/todos - Create new todo item
      if (pathname === '/api/todos' && method === 'POST') {
        const { title } = await parseJSONBody(req);
        if (!title) return sendJSON(res, 400, { error: 'Title required' });

        const result = await db.query(
          'INSERT INTO todos (user_id, title) VALUES ($1, $2) RETURNING *',
          [user.id, title]
        );
        return sendJSON(res, 201, { todo: result.rows[0] });
      }

      // PATCH /api/todos/:id - Update existing todo (title/completion status)
      if (pathname.match(/^\/api\/todos\/\d+$/) && method === 'PATCH') {
        const id = pathname.split('/')[3];
        const body = await parseJSONBody(req);
        
        let query = 'UPDATE todos SET ';
        const params = [];
        const updates = [];

        if (body.title !== undefined) {
          params.push(body.title);
          updates.push(`title = $${params.length}`);
        }
        if (body.completed !== undefined) {
          params.push(body.completed);
          updates.push(`completed = $${params.length}`);
        }

        if (updates.length === 0) return sendJSON(res, 400, { error: 'No fields to update' });

        params.push(id, user.id);
        query += updates.join(', ') + ` WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`;

        const result = await db.query(query, params);
        if (result.rowCount === 0) return sendJSON(res, 404, { error: 'Todo not found' });

        return sendJSON(res, 200, { todo: result.rows[0] });
      }

      // DELETE /api/todos/:id - Delete todo item
      if (pathname.match(/^\/api\/todos\/\d+$/) && method === 'DELETE') {
        const id = pathname.split('/')[3];
        const result = await db.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, user.id]);
        if (result.rowCount === 0) return sendJSON(res, 404, { error: 'Todo not found' });

        return sendJSON(res, 200, { message: 'Deleted successfully' });
      }
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVER (public/ index.html, styles.css, app.js)
    // -------------------------------------------------------------------------
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    const extname = path.extname(filePath);
    
    // Map file extension to MIME type
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json'
    };

    const contentType = mimeTypes[extname] || 'text/plain';

    // Read and serve asset from disk
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });

  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Internal Server Error' });
  }
}

module.exports = { handleRequest };
