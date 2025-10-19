const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

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
      
      // Crear tabla si no existe
      await client.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id SERIAL PRIMARY KEY,
          content VARCHAR(140) NOT NULL,
          created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insertar TODOs iniciales si la tabla está vacía
      const result = await client.query('SELECT COUNT(*) FROM todos');
      if (result.rows[0].count === 0) {
        await client.query(`
          INSERT INTO todos (content) VALUES 
          ('Learn Kubernetes'),
          ('Build microservices'),
          ('Master Docker'),
          ('Deploy to cluster')
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
    const result = await client.query('SELECT id, content, created FROM todos ORDER BY created DESC');
    const todos = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      created: row.created.toISOString()
    }));
    client.release();
    
    console.log(`[${new Date().toISOString()}] GET /todos - Returning ${todos.length} todos`);
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
    console.log(`[${new Date().toISOString()}] POST /todos - Invalid content`);
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  if (content.length > 140) {
    console.log(`[${new Date().toISOString()}] POST /todos - Content exceeds 140 characters`);
    return res.status(400).json({ error: 'Content must not exceed 140 characters' });
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO todos (content) VALUES ($1) RETURNING id, content, created',
      [content.trim()]
    );
    const newTodo = {
      id: result.rows[0].id,
      content: result.rows[0].content,
      created: result.rows[0].created.toISOString()
    };
    client.release();

    console.log(`[${new Date().toISOString()}] POST /todos - Created todo: ${newTodo.content}`);
    res.status(201).json(newTodo);
  } catch (err) {
    console.error('Error creating todo:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM todos');
    const count = result.rows[0].count;
    client.release();
    
    res.json({ status: 'ok', todos: parseInt(count) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Inicializar base de datos y iniciar servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[${new Date().toISOString()}] Todo Backend listening on port ${PORT}`);
      console.log(`[${new Date().toISOString()}] Connected to PostgreSQL at ${process.env.DB_HOST || 'todos-db-stset-0.todos-db-svc'}:${process.env.DB_PORT || 5432}`);
      console.log(`[${new Date().toISOString()}] GET  /todos - Fetch all todos`);
      console.log(`[${new Date().toISOString()}] POST /todos - Create a new todo`);
      console.log(`[${new Date().toISOString()}] GET  /health - Health check`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
