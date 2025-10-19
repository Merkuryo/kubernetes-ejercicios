const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configuration
const BACKEND_URL = process.env.TODOS_BACKEND || 'http://todo-backend-svc:3000';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store image cache and metadata
const imageCache = new Map();
const IMAGE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Serve static files if any
app.use(express.static('public'));

// Main page
app.get('/', async (req, res) => {
  try {
    // Fetch todos from backend
    const response = await axios.get(`${BACKEND_URL}/todos`, { timeout: 5000 });
    const todos = response.data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Todo App</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
          }

          .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
          }

          .header p {
            color: #666;
            font-size: 1em;
          }

          .section {
            margin-bottom: 30px;
          }

          .section-title {
            font-size: 1.3em;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
          }

          .input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
          }

          label {
            color: #555;
            font-weight: 500;
            margin-bottom: 5px;
          }

          input[type="text"] {
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1em;
            transition: all 0.3s;
          }

          input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .char-counter {
            font-size: 0.9em;
            color: #999;
            margin-top: 5px;
          }

          .char-counter.warning {
            color: #ff9800;
          }

          .char-counter.error {
            color: #f44336;
          }

          button {
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
          }

          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
          }

          button:active {
            transform: translateY(0);
          }

          button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
          }

          .todos-grid {
            display: grid;
            gap: 12px;
          }

          .todo-item {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            transition: all 0.3s;
          }

          .todo-item:hover {
            background: #efefef;
            transform: translateX(5px);
          }

          .todo-content {
            color: #333;
            font-size: 1.05em;
            margin-bottom: 5px;
          }

          .todo-time {
            font-size: 0.85em;
            color: #999;
          }

          .image-section {
            text-align: center;
            margin: 20px 0;
          }

          .image-section img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin-top: 10px;
          }

          .ping-counter {
            background: #f0f4ff;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
          }

          .ping-counter p {
            color: #667eea;
            font-size: 1.3em;
            font-weight: 600;
          }

          .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #f44336;
          }

          .success-message {
            background: #e8f5e9;
            color: #2e7d32;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #4caf50;
          }

          .loading {
            text-align: center;
            color: #999;
            padding: 20px;
          }

          .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Todo App</h1>
            <p>Manage your tasks with Kubernetes</p>
          </div>

          <div id="messages"></div>

          <div class="section">
            <div class="section-title">Random Picture</div>
            <button onclick="fetchRandomImage()">Get Random Image</button>
            <div id="imageSection" class="image-section"></div>
          </div>

          <div class="section">
            <div class="section-title">Ping Pong</div>
            <div class="ping-counter">
              <p>Pings: <span id="pingCount">0</span></p>
            </div>
            <button onclick="incrementPing()">Ping!</button>
          </div>

          <div class="section">
            <div class="section-title">Create New Todo</div>
            <form onsubmit="createTodo(event)">
              <div class="form-group">
                <label for="todoInput">Todo (Max 140 characters)</label>
                <input 
                  type="text" 
                  id="todoInput" 
                  placeholder="Enter your todo..."
                  maxlength="140"
                  oninput="updateCounter()"
                >
                <div class="char-counter">
                  <span id="charCount">0</span>/140 characters
                </div>
              </div>
              <button type="submit">Add Todo</button>
            </form>
          </div>

          <div class="section">
            <div class="section-title">Todos</div>
            <div class="todos-grid" id="todosList"></div>
          </div>
        </div>

        <script>
          const BACKEND_URL = 'http://todo-backend-svc:3000';
          let pingCount = 0;

          // Update character counter
          function updateCounter() {
            const input = document.getElementById('todoInput');
            const count = document.getElementById('charCount');
            const counter = count.parentElement;
            
            count.textContent = input.value.length;
            
            counter.classList.remove('warning', 'error');
            if (input.value.length > 120) {
              counter.classList.add('error');
            } else if (input.value.length > 100) {
              counter.classList.add('warning');
            }
          }

          // Create new todo
          async function createTodo(event) {
            event.preventDefault();
            const input = document.getElementById('todoInput');
            const content = input.value.trim();

            if (!content) {
              showMessage('Please enter a todo', 'error');
              return;
            }

            if (content.length > 140) {
              showMessage('Todo must not exceed 140 characters', 'error');
              return;
            }

            try {
              const response = await fetch(\`\${BACKEND_URL}/todos\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create todo');
              }

              const newTodo = await response.json();
              input.value = '';
              updateCounter();
              showMessage('Todo created successfully!', 'success');
              loadTodos();
            } catch (error) {
              console.error('Error:', error);
              showMessage(\`Error: \${error.message}\`, 'error');
            }
          }

          // Load todos from backend
          async function loadTodos() {
            try {
              const response = await fetch(\`\${BACKEND_URL}/todos\`);
              if (!response.ok) throw new Error('Failed to fetch todos');
              
              const todos = await response.json();
              const todosList = document.getElementById('todosList');
              
              if (todos.length === 0) {
                todosList.innerHTML = '<p style="color: #999; text-align: center;">No todos yet</p>';
                return;
              }

              todosList.innerHTML = todos.map(todo => \`
                <div class="todo-item">
                  <div class="todo-content">\${escapeHtml(todo.content)}</div>
                  <div class="todo-time">\${new Date(todo.created).toLocaleString()}</div>
                </div>
              \`).join('');
            } catch (error) {
              console.error('Error loading todos:', error);
              document.getElementById('todosList').innerHTML = '<p class="error-message">Failed to load todos</p>';
            }
          }

          // Fetch random image
          async function fetchRandomImage() {
            try {
              const imageSection = document.getElementById('imageSection');
              imageSection.innerHTML = '<div class="loading"><div class="spinner"></div> Loading image...</div>';
              
              const response = await fetch('/image');
              if (!response.ok) throw new Error('Failed to fetch image');
              
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              imageSection.innerHTML = \`<img src="\${url}" alt="Random picture">\`;
            } catch (error) {
              console.error('Error:', error);
              document.getElementById('imageSection').innerHTML = '<p class="error-message">Failed to load image</p>';
            }
          }

          // Increment ping counter
          function incrementPing() {
            pingCount++;
            document.getElementById('pingCount').textContent = pingCount;
          }

          // Show messages
          function showMessage(text, type) {
            const messagesDiv = document.getElementById('messages');
            const messageEl = document.createElement('div');
            messageEl.className = type === 'error' ? 'error-message' : 'success-message';
            messageEl.textContent = text;
            messagesDiv.appendChild(messageEl);

            setTimeout(() => messageEl.remove(), 3000);
          }

          // Escape HTML to prevent XSS
          function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          }

          // Load todos on page load
          document.addEventListener('DOMContentLoaded', () => {
            loadTodos();
            setInterval(loadTodos, 5000);
          });
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching todos:`, error.message);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Todo App</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Error Loading App</h1>
        <p>Failed to connect to todo backend: ${error.message}</p>
        <p>Backend URL: ${BACKEND_URL}</p>
        <p><a href="javascript:location.reload()">Retry</a></p>
      </body>
      </html>
    `;
    res.send(errorHtml);
  }
});

// Image endpoint - return cached or fetch new
app.get('/image', async (req, res) => {
  try {
    const now = Date.now();
    
    // Check if we have a cached image
    if (imageCache.has('current') && (now - imageCache.get('timestamp') < IMAGE_CACHE_DURATION)) {
      console.log(`[${new Date().toISOString()}] Serving cached image`);
      const buffer = imageCache.get('current');
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=600');
      return res.send(buffer);
    }

    // Fetch new image
    console.log(`[${new Date().toISOString()}] Fetching new image from Lorem Picsum`);
    const response = await axios.get('https://picsum.photos/400/300', {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const buffer = Buffer.from(response.data);
    imageCache.set('current', buffer);
    imageCache.set('timestamp', now);

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=600');
    res.send(buffer);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching image:`, error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Todo App listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Backend URL: ${BACKEND_URL}`);
});
