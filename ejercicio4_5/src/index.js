const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalJson = res.json;
  
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const status = res.statusCode;
    const body = JSON.stringify(req.body);
    
    console.log(`[${timestamp}] ${method} ${path} | Status: ${status} | Body: ${body} | Duration: ${duration}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
});

// Configuración de PostgreSQL desde variables de entorno
const pool = new Pool({
  user: process.env.DB_USER || 'todos_user',
  password: process.env.DB_PASSWORD || 'todos_db_password123',
  host: process.env.DB_HOST || 'todos-db-stset-0.todos-db-svc',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'todos_db'
});

// Inicializar base de datos
async function initializeDatabase() {
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      
      // Crear tabla si no existe (ahora con campo 'done')
      await client.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          content VARCHAR(140) NOT NULL,
          done BOOLEAN DEFAULT FALSE,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Migrar tabla existente si no tiene la columna 'done'
      try {
        await client.query('ALTER TABLE todos ADD COLUMN done BOOLEAN DEFAULT FALSE');
        console.log('Added "done" column to todos table');
      } catch (err) {
        if (!err.message.includes('column "done" of relation "todos" already exists')) {
          throw err;
        }
      }
      
      // Insertar TODOs iniciales si la tabla está vacía
      const result = await client.query('SELECT COUNT(*) FROM todos');
      if (result.rows[0].count === 0) {
        await client.query(`
          INSERT INTO todos (content, done) VALUES 
          ('Learn Kubernetes', FALSE),
          ('Build microservices', FALSE),
          ('Master Docker', FALSE),
          ('Deploy to cluster', FALSE)
        `);
        console.log('Database initialized with default todos');
      } else {
        console.log(`Database already initialized with ${result.rows[0].count} todos`);
      }
      
      client.release();
      return true;
    } catch (err) {
      retries++;
      console.error(`Error initializing database (attempt ${retries}/${maxRetries}):`, err.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  throw new Error('Failed to initialize database after ' + maxRetries + ' attempts');
}

// GET /todos - Fetch all todos
app.get('/todos', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, content, done, created FROM todos ORDER BY created DESC');
    const todos = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      done: row.done,
      created: row.created.toISOString()
    }));
    client.release();
    
    res.json(todos);
  } catch (err) {
    console.error('Error fetching todos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /todos - Create a new todo
app.post('/todos', async (req, res) => {
  const { content } = req.body;

  // Validate content
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  if (content.length > 140) {
    return res.status(400).json({ error: 'Content must not exceed 140 characters' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO todos (content, done) VALUES ($1, FALSE) RETURNING id, content, done, created',
      [content]
    );
    const todo = result.rows[0];
    client.release();
    
    res.status(201).json({
      id: todo.id,
      content: todo.content,
      done: todo.done,
      created: todo.created.toISOString()
    });
  } catch (err) {
    console.error('Error creating todo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /todos/:id - Update a todo (mark as done/undone)
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { done } = req.body;

  // Validate id
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid todo ID' });
  }

  // Validate done field
  if (typeof done !== 'boolean') {
    return res.status(400).json({ error: 'Done field must be a boolean' });
  }

  try {
    const client = await pool.connect();
    
    // Check if todo exists
    const checkResult = await client.query('SELECT * FROM todos WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Update todo
    const result = await client.query(
      'UPDATE todos SET done = $1, updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, content, done, created, updated',
      [done, id]
    );
    
    const todo = result.rows[0];
    client.release();
    
    res.json({
      id: todo.id,
      content: todo.content,
      done: todo.done,
      created: todo.created.toISOString(),
      updated: todo.updated.toISOString()
    });
  } catch (err) {
    console.error('Error updating todo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
async function start() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
