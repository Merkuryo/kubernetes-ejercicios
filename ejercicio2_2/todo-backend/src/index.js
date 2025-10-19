const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// In-memory todos storage
let todos = [
  { id: 1, content: 'Learn Kubernetes', created: new Date().toISOString() },
  { id: 2, content: 'Build microservices', created: new Date().toISOString() },
  { id: 3, content: 'Master Docker', created: new Date().toISOString() },
  { id: 4, content: 'Deploy to cluster', created: new Date().toISOString() }
];

let nextId = 5;

// GET /todos - Fetch all todos
app.get('/todos', (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /todos - Returning ${todos.length} todos`);
  res.json(todos);
});

// POST /todos - Create a new todo
app.post('/todos', (req, res) => {
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

  const newTodo = {
    id: nextId++,
    content: content.trim(),
    created: new Date().toISOString()
  };

  todos.push(newTodo);
  console.log(`[${new Date().toISOString()}] POST /todos - Created todo: ${newTodo.content}`);
  res.status(201).json(newTodo);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', todos: todos.length });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Todo Backend listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] GET  /todos - Fetch all todos`);
  console.log(`[${new Date().toISOString()}] POST /todos - Create a new todo`);
  console.log(`[${new Date().toISOString()}] GET  /health - Health check`);
});
