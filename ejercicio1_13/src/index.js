const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas y configuración
const DATA_PATH = '/usr/src/app/data';
const LOG_FILE = path.join(DATA_PATH, 'log.txt');
const IMAGE_FILE = path.join(DATA_PATH, 'image.jpg');
const IMAGE_METADATA_FILE = path.join(DATA_PATH, 'image-metadata.json');
const TODOS_FILE = path.join(DATA_PATH, 'todos.json');

// Configuración de caché de imagen (10 minutos)
const IMAGE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos en milisegundos
const MAX_TODO_LENGTH = 140;

// Variables de estado
let randomString = crypto.randomBytes(16).toString('hex');
let pingCounter = 0;
let lastImageFetch = null;
let imageFetchInProgress = false;
let todos = [];

// Asegurarse de que el directorio data exista
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_PATH, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error al crear el directorio:', error);
    }
  }
}

// Cargar TODOs del archivo
async function loadTodos() {
  try {
    const data = await fs.readFile(TODOS_FILE, 'utf8');
    todos = JSON.parse(data);
    console.log(`${todos.length} TODOs cargados`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Crear archivo con TODOs predeterminados
      todos = [
        { id: 1, text: 'Implement TODO app functionality', completed: false },
        { id: 2, text: 'Add image caching feature', completed: true },
        { id: 3, text: 'Create responsive HTML interface', completed: false },
        { id: 4, text: 'Deploy to Kubernetes', completed: true }
      ];
      await saveTodos();
    } else {
      console.error('Error al cargar TODOs:', error);
    }
  }
}

// Guardar TODOs en archivo
async function saveTodos() {
  try {
    await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2));
  } catch (error) {
    console.error('Error al guardar TODOs:', error);
  }
}

// Inicializar la aplicación
async function initialize() {
  await ensureDataDirectory();
  await loadTodos();
  
  // Cargar metadata de imagen si existe
  try {
    const metadata = await fs.readFile(IMAGE_METADATA_FILE, 'utf8');
    const data = JSON.parse(metadata);
    lastImageFetch = data.timestamp;
    console.log('Metadata de imagen cargada:', data);
  } catch (error) {
    console.log('No hay metadata de imagen previa');
  }
  
  // Iniciar escritura periódica de log
  setInterval(writeLog, 5000);
  
  // Intentar cargar imagen cacheada o descargar una nueva
  await updateImageIfNeeded();
}

// Escribir en el archivo de log
async function writeLog() {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${randomString}\nPing / Pongs: ${pingCounter}\nTODOs: ${todos.length}\n`;
    
    let currentContent = '';
    try {
      currentContent = await fs.readFile(LOG_FILE, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error al leer el log:', error);
      }
    }
    
    await fs.writeFile(LOG_FILE, currentContent + logEntry);
  } catch (error) {
    console.error('Error al escribir en el log:', error);
  }
}

// Actualizar imagen si es necesario
async function updateImageIfNeeded() {
  const now = Date.now();
  const shouldFetchNew = !lastImageFetch || (now - lastImageFetch) >= IMAGE_CACHE_DURATION;
  
  if (shouldFetchNew && !imageFetchInProgress) {
    imageFetchInProgress = true;
    try {
      console.log('Descargando nueva imagen de Lorem Picsum...');
      const response = await axios.get('https://picsum.photos/1200', {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      
      await fs.writeFile(IMAGE_FILE, response.data);
      
      lastImageFetch = Date.now();
      await fs.writeFile(IMAGE_METADATA_FILE, JSON.stringify({
        timestamp: lastImageFetch,
        url: 'https://picsum.photos/1200',
        timestamp_iso: new Date(lastImageFetch).toISOString()
      }));
      
      console.log('Imagen descargada y cacheada exitosamente');
    } catch (error) {
      console.error('Error al descargar imagen:', error.message);
    } finally {
      imageFetchInProgress = false;
    }
  }
}

// Rutas

// Ruta raíz: muestra todo integrado
app.get('/', async (req, res) => {
  try {
    // Actualizar imagen si es necesario
    await updateImageIfNeeded();
    
    let logContent = '';
    try {
      logContent = await fs.readFile(LOG_FILE, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error al leer el log:', error);
      }
    }
    
    // Generar HTML con TODO list
    const todoListHTML = todos.map(todo => `
      <li class="todo-item ${todo.completed ? 'completed' : ''}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} disabled>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
      </li>
    `).join('');
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Project Application</title>
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
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    
    h1 {
      color: #333;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    
    .section {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .section h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 18px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-box {
      background-color: white;
      padding: 15px;
      border-radius: 6px;
      border: 2px solid #e0e0e0;
    }
    
    .stat-box h3 {
      color: #667eea;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .stat-box p {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .image-section {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .image-section h2 {
      margin-bottom: 15px;
      color: #333;
    }
    
    .image-section img {
      max-width: 100%;
      max-height: 400px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .image-info {
      margin-top: 10px;
      color: #666;
      font-size: 12px;
    }
    
    .todo-section {
      margin-bottom: 30px;
    }
    
    .todo-input-container {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .todo-input-container input {
      flex: 1;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .todo-input-container input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .todo-input-container button {
      padding: 12px 24px;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .todo-input-container button:hover {
      background-color: #764ba2;
    }
    
    .todo-input-container button:active {
      transform: scale(0.98);
    }
    
    .char-count {
      font-size: 12px;
      color: #999;
      margin-top: 5px;
    }
    
    .char-count.warning {
      color: #ff9800;
    }
    
    .char-count.error {
      color: #f44336;
    }
    
    .todo-list {
      list-style: none;
      background-color: white;
      border-radius: 6px;
      padding: 10px;
    }
    
    .todo-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      transition: background-color 0.2s;
    }
    
    .todo-item:last-child {
      border-bottom: none;
    }
    
    .todo-item:hover {
      background-color: #f5f5f5;
    }
    
    .todo-item.completed .todo-text {
      text-decoration: line-through;
      color: #999;
    }
    
    .todo-checkbox {
      width: 18px;
      height: 18px;
      margin-right: 12px;
      cursor: pointer;
      flex-shrink: 0;
    }
    
    .todo-text {
      color: #333;
      font-size: 14px;
      flex: 1;
    }
    
    .log-section {
      margin-top: 30px;
      background-color: #f0f0f0;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #764ba2;
    }
    
    .log-section h2 {
      color: #333;
      margin-bottom: 15px;
    }
    
    .log-section pre {
      margin: 0;
      overflow-x: auto;
      color: #333;
      font-size: 12px;
      line-height: 1.5;
      background-color: white;
      padding: 10px;
      border-radius: 4px;
    }
    
    .links {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
    }
    
    .links a {
      display: inline-block;
      padding: 12px 24px;
      background-color: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    
    .links a:hover {
      background-color: #764ba2;
    }
    
    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .container {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Project Application</h1>
    
    <div class="grid">
      <div class="section">
        <h2>📊 Statistics</h2>
        <div class="stats">
          <div class="stat-box">
            <h3>Session ID</h3>
            <p>${randomString.substring(0, 8)}</p>
          </div>
          <div class="stat-box">
            <h3>Ping Pongs</h3>
            <p>${pingCounter}</p>
          </div>
          <div class="stat-box">
            <h3>Total TODOs</h3>
            <p>${todos.length}</p>
          </div>
          <div class="stat-box">
            <h3>Completed</h3>
            <p>${todos.filter(t => t.completed).length}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🎨 Cached Image</h2>
        <div class="image-section">
          <img src="/image" alt="Random image from Lorem Picsum" />
          <div class="image-info">
            Fresh for 10 minutes. Updates hourly.
          </div>
        </div>
      </div>
    </div>

    <div class="todo-section">
      <h2>📝 TODO List</h2>
      <div class="todo-input-container">
        <input 
          type="text" 
          id="todoInput" 
          placeholder="Add a new TODO (max 140 characters)..."
          maxlength="140"
        >
        <button onclick="addTodo()">Add</button>
      </div>
      <div class="char-count">
        <span id="charCount">0</span>/140
      </div>
      <ul class="todo-list">
        ${todoListHTML || '<li style="padding: 12px; text-align: center; color: #999;">No TODOs yet. Add one above!</li>'}
      </ul>
    </div>

    <div class="log-section">
      <h2>📋 Activity Log</h2>
      <pre>${logContent || 'No activity yet...'}</pre>
    </div>

    <div class="links">
      <a href="/pingpong">➕ Ping Pong</a>
      <a href="/">🔄 Refresh</a>
    </div>
  </div>

  <script>
    const todoInput = document.getElementById('todoInput');
    const charCount = document.getElementById('charCount');

    // Actualizar contador de caracteres
    todoInput.addEventListener('input', function() {
      charCount.textContent = this.value.length;
      const charCountEl = document.querySelector('.char-count');
      
      if (this.value.length > 120) {
        charCountEl.classList.add('warning');
        charCountEl.classList.remove('error');
      } else if (this.value.length > 130) {
        charCountEl.classList.add('error');
        charCountEl.classList.remove('warning');
      } else {
        charCountEl.classList.remove('warning', 'error');
      }
    });

    // Permitir agregar TODO con Enter
    todoInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        addTodo();
      }
    });

    function addTodo() {
      const text = todoInput.value.trim();
      
      if (!text) {
        alert('Please enter a TODO');
        return;
      }
      
      if (text.length > 140) {
        alert('TODO is too long (max 140 characters)');
        return;
      }
      
      // Mostrar mensaje (sin enviar aún)
      alert('TODO added: ' + text + '\\n\\n(Sending functionality coming soon)');
      todoInput.value = '';
      charCount.textContent = '0';
      document.querySelector('.char-count').classList.remove('warning', 'error');
    }
  </script>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error en ruta raíz:', error);
    res.status(500).send('Error al procesar la solicitud');
  }
});

// Ruta para servir la imagen cacheada
app.get('/image', async (req, res) => {
  try {
    await updateImageIfNeeded();
    
    try {
      const imageData = await fs.readFile(IMAGE_FILE);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(imageData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).send('Imagen no disponible');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error al servir imagen:', error);
    res.status(500).send('Error al servir la imagen');
  }
});

// Ruta ping pong
app.get('/pingpong', (req, res) => {
  pingCounter++;
  res.send(`Pong: ${pingCounter}`);
});

// API: Obtener TODOs
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

// API: Agregar TODO
app.post('/api/todos', (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  if (text.length > MAX_TODO_LENGTH) {
    return res.status(400).json({ error: `TODO must be ${MAX_TODO_LENGTH} characters or less` });
  }
  
  const newTodo = {
    id: todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1,
    text: text.trim(),
    completed: false
  };
  
  todos.push(newTodo);
  saveTodos();
  
  res.status(201).json(newTodo);
});

// Ruta para healthcheck
app.get('/health', (req, res) => {
  res.send('OK');
});

// Función auxiliar para escapar HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Project application running on port ${PORT}`);
  await initialize();
});
