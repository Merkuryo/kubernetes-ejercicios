const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: process.env.POSTGRES_PORT || 5432,
});

async function initializeDatabase() {
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'todos' AND column_name = 'done'`
    );
    
    if (result.rows.length === 0) {
      console.log('[DB] Adding "done" column to todos table...');
      await pool.query(`
        ALTER TABLE todos ADD COLUMN done BOOLEAN DEFAULT FALSE;
      `);
      console.log('[DB] Column "done" added successfully');
    }
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error('[DB] Migration error:', err.message);
    }
  }
}

// GET /todos - Retrieve all todos
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[API] GET /todos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /todos - Create new todo
app.post('/todos', async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (content.length > 140) {
    return res.status(400).json({ error: 'Content must be 140 characters or less' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (content, done) VALUES ($1, $2) RETURNING *',
      [content, false]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[API] POST /todos error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /todos/:id - Update todo done status
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid todo ID' });
  }

  if (typeof done !== 'boolean') {
    return res.status(400).json({ error: 'Done field must be a boolean' });
  }

  try {
    const checkResult = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const result = await pool.query(
      'UPDATE todos SET done = $1, updated = NOW() WHERE id = $2 RETURNING *',
      [done, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[API] PUT /todos/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /health - Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Start server
async function start() {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`[Server] Listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('[Start] Error:', err);
  process.exit(1);
});
