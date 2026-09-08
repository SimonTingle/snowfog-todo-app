/**
 * Database Connection & Schema Setup
 * Handles PostgreSQL pool creation and schema initialization using the 'pg' library.
 * 
 * Documentation & Reference Sources:
 * - node-postgres (pg) Pool Documentation: https://node-postgres.com/api/pool
 * - PostgreSQL CREATE TABLE Syntax: https://www.postgresql.org/docs/current/sql-createtable.html
 * - MDN Node.js Environment Variables: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/deployment
 */

const { Pool } = require('pg');

// Create a PostgreSQL connection pool using the DATABASE_URL environment variable.
// In production (e.g. deployed on CapRover/Render), SSL is enabled with rejectUnauthorized: false.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initializes required SQL database tables if they do not already exist.
 * - 'users': Stores user account credentials and registration timestamps.
 * - 'todos': Stores task items linked to specific users with foreign key cascade deletion.
 */
async function initDb() {
  const client = await pool.connect();
  try {
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Todos Table with cascading delete constraint on user reference
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    // Release client connection back to the pool
    client.release();
  }
}

// Automatically trigger database schema validation/creation on module import
initDb();

module.exports = pool;
