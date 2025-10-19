const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Rutas y configuración
const DATA_PATH = '/usr/src/app/data';
const LOG_FILE = path.join(DATA_PATH, 'log.txt');
const IMAGE_FILE = path.join(DATA_PATH, 'image.jpg');
const IMAGE_METADATA_FILE = path.join(DATA_PATH, 'image-metadata.json');

// Configuración de caché de imagen (10 minutos)
const IMAGE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos en milisegundos

// Variables de estado
let randomString = crypto.randomBytes(16).toString('hex');
let pingCounter = 0;
let lastImageFetch = null;
let imageFetchInProgress = false;

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

// Inicializar la aplicación
async function initialize() {
  await ensureDataDirectory();
  
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
    const logEntry = `${timestamp}: ${randomString}\nPing / Pongs: ${pingCounter}\n`;
    
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

// Ruta raíz: muestra log output + imagen
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
    
    // Enviar HTML con el log y la imagen
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Project Application</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
    }
    .image-section {
      margin: 20px 0;
      text-align: center;
    }
    .image-section img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .image-info {
      margin-top: 10px;
      color: #666;
      font-size: 14px;
    }
    .log-section {
      margin-top: 30px;
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #4CAF50;
    }
    .log-section pre {
      margin: 0;
      overflow-x: auto;
      color: #333;
      font-size: 12px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    .stat-box {
      background-color: #e3f2fd;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #2196F3;
    }
    .stat-box h3 {
      margin: 0 0 10px 0;
      color: #1976D2;
    }
    .stat-box p {
      margin: 0;
      color: #555;
    }
    .links {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .links a {
      display: inline-block;
      margin-right: 15px;
      padding: 10px 15px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    .links a:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Project Application</h1>
    
    <div class="stats">
      <div class="stat-box">
        <h3>Session ID</h3>
        <p>${randomString}</p>
      </div>
      <div class="stat-box">
        <h3>Ping / Pongs</h3>
        <p>${pingCounter}</p>
      </div>
    </div>

    <div class="image-section">
      <h2>Random Image (Updated every 10 minutes)</h2>
      <img src="/image" alt="Random image from Lorem Picsum" />
      <div class="image-info">
        Image cached from Lorem Picsum. Fresh for 10 minutes.
      </div>
    </div>

    <div class="log-section">
      <h2>Log Output</h2>
      <pre>${logContent || 'No log data available yet...'}</pre>
    </div>

    <div class="links">
      <a href="/pingpong">➕ Ping Pong</a>
      <a href="/">🔄 Refresh</a>
    </div>
  </div>
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
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache por 5 minutos en el cliente
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

// Ruta para healthcheck
app.get('/health', (req, res) => {
  res.send('OK');
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Project application running on port ${PORT}`);
  await initialize();
});
