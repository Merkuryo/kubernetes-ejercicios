const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Información del ConfigMap
let configMapInfo = {
  fileContent: 'File not found',
  messageEnv: process.env.MESSAGE || 'MESSAGE not set'
};

// Leer el archivo del ConfigMap
const configFilePath = '/etc/config/information.txt';
if (fs.existsSync(configFilePath)) {
  try {
    configMapInfo.fileContent = fs.readFileSync(configFilePath, 'utf8').trim();
    console.log(`[${new Date().toISOString()}] Loaded ConfigMap file from ${configFilePath}`);
  } catch (error) {
    console.error(`Error reading ConfigMap file: ${error.message}`);
  }
}

console.log(`[${new Date().toISOString()}] ConfigMap Information:`);
console.log(`  File content: ${configMapInfo.fileContent}`);
console.log(`  MESSAGE env: ${configMapInfo.messageEnv}`);

// Contador de pings
let pingCount = 0;

// Endpoint principal - muestra logs
app.get('/', (req, res) => {
  pingCount++;
  const timestamp = new Date().toISOString();
  const requestId = uuidv4();
  
  const output = `file content: ${configMapInfo.fileContent}
env variable: MESSAGE=${configMapInfo.messageEnv}
${timestamp}: ${requestId}
Ping / Pongs: ${pingCount}`;

  console.log(`[${timestamp}] GET / - Ping count: ${pingCount}`);
  
  res.type('text/plain').send(output);
});

// Endpoint para obtener datos en raw format
app.get('/raw', (req, res) => {
  const timestamp = new Date().toISOString();
  
  const data = {
    timestamp,
    fileContent: configMapInfo.fileContent,
    messageEnv: configMapInfo.messageEnv,
    pingCount
  };
  
  res.json(data);
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    configMapLoaded: true,
    fileContent: configMapInfo.fileContent !== 'File not found',
    messageSet: configMapInfo.messageEnv !== 'MESSAGE not set'
  });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Log Output Application listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] GET  / - View logs with ConfigMap content`);
  console.log(`[${new Date().toISOString()}] GET  /raw - JSON format`);
  console.log(`[${new Date().toISOString()}] GET  /health - Health check`);
});
