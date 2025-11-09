const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const nats = require('nats.js');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres-svc',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'todos',
  port: 5432,
});

let natsConnection = null;

// Initialize database connection and NATS
async function initialize() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL');

    // Ensure todos table exists with done column
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        content VARCHAR(140) NOT NULL,
        done BOOLEAN DEFAULT FALSE,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if done column exists, if not add it
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'done'
    `);

    if (result.rows.length === 0) {
      await pool.query('ALTER TABLE todos ADD COLUMN done BOOLEAN DEFAULT FALSE');
      console.log('Added done column to todos table');
    }

    // Connect to NATS
    const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
    try {
      natsConnection = await nats.connect({
        servers: [natsUrl],
        reconnect: true,
      });
      console.log('Connected to NATS at', natsUrl);
    } catch (e) {
      console.warn('NATS connection failed:', e.message);
      console.warn('Continuing without NATS...');
    }

  } catch (err) {
    console.error('Initialization error:', err);
    process.exit(1);
  }
}

// Publish event to NATS
async function publishEvent(eventType, todo) {
  if (!natsConnection) return;
  
  try {
    const event = {
      type: eventType,
      todo: todo,
      timestamp: new Date().toISOString()
    };
    
    natsConnection.publish('todo_events', JSON.stringify(event));
  } catch (err) {
    console.error('Error publishing event:', err);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all todos
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new todo
app.post('/todos', async (req, res) => {
  const { content } = req.body;

  if (!content || content.length === 0 || content.length > 140) {
    return res.status(400).json({ error: 'Content must be between 1 and 140 characters' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (content, done) VALUES ($1, false) RETURNING *',
      [content]
    );

    const todo = result.rows[0];
    await publishEvent('created', todo);
    res.status(201).json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a todo
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { content, done } = req.body;

  try {
    const result = await pool.query(
      'UPDATE todos SET content = COALESCE($1, content), done = COALESCE($2, done), updated = NOW() WHERE id = $3 RETURNING *',
      [content || null, done !== undefined ? done : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const todo = result.rows[0];
    await publishEvent('updated', todo);
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a todo
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    await publishEvent('deleted', result.rows[0]);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

const port = process.env.PORT || 3000;

initialize().then(() => {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
});
