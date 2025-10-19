const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;
const DATA_PATH = '/usr/src/app/data/log.txt';

// Generar una cadena aleatoria al inicio
const randomString = crypto.randomBytes(16).toString('hex');

// Asegurarse de que el directorio data exista
async function ensureDataDirectory() {
  const dir = path.dirname(DATA_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error al crear el directorio:', error);
    }
  }
}

// Escribir en el archivo cada 5 segundos
async function writeLog() {
  try {
    await ensureDataDirectory();
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${randomString}\n`;
    
    // Leer el contenido actual y agregar la nueva línea
    let currentContent = '';
    try {
      currentContent = await fs.readFile(DATA_PATH, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error al leer el archivo:', error);
      }
    }
    
    await fs.writeFile(DATA_PATH, currentContent + logEntry);
    console.log(`Log escrito: ${logEntry.trim()}`);
  } catch (error) {
    console.error('Error al escribir en el log:', error);
  }
}

// Iniciar la escritura periódica
setInterval(writeLog, 5000);

// Endpoint para contar los pings (POST)
app.post('/ping', async (req, res) => {
  try {
    res.send('Pong');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Writer service running on port ${PORT}`);
  console.log(`Random string: ${randomString}`);
});
