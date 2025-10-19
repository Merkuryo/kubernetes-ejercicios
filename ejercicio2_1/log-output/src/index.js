const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configuración
const PING_PONG_URL = 'http://pingpong-svc:3000';

// Variables de estado
let randomString = crypto.randomBytes(16).toString('hex');

// Función para obtener el contador de pongs
async function getPongCount() {
  try {
    const response = await axios.get(`${PING_PONG_URL}/count`, {
      timeout: 5000
    });
    return response.data.pongs || 0;
  } catch (error) {
    console.error('Error al conectar con ping-pong-svc:', error.message);
    return 0;
  }
}

// Ruta principal: muestra el log output
app.get('/', async (req, res) => {
  try {
    const pongCount = await getPongCount();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Log Output Application</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      padding: 20px;
    }
    
    .container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 600px;
      width: 100%;
    }
    
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
    }
    
    .info-box {
      background: #f5f5f5;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    
    .info-box h2 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 14px;
      text-transform: uppercase;
    }
    
    .info-box p {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: bold;
    }
    
    .timestamp {
      color: #666;
      font-size: 12px;
      margin-top: 5px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 20px;
    }
    
    .stat {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    
    .stat h3 {
      margin: 0 0 5px 0;
      color: #667eea;
      font-size: 12px;
    }
    
    .stat p {
      margin: 0;
      font-size: 20px;
      color: #333;
    }
    
    .links {
      text-align: center;
      margin-top: 30px;
    }
    
    .links a {
      display: inline-block;
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 5px;
      transition: background 0.2s;
    }
    
    .links a:hover {
      background: #764ba2;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Log Output Application</h1>
    
    <div class="info-box">
      <h2>Current Log Entry</h2>
      <p>${new Date().toISOString()}: ${randomString}</p>
      <p class="timestamp">Session ID generated at startup</p>
    </div>
    
    <div class="stats">
      <div class="stat">
        <h3>Session ID (first 8 chars)</h3>
        <p>${randomString.substring(0, 8)}</p>
      </div>
      <div class="stat">
        <h3>Ping / Pongs</h3>
        <p>${pongCount}</p>
      </div>
    </div>
    
    <div class="links">
      <a href="/">🔄 Refresh</a>
      <a href="/raw">📋 Raw Data</a>
    </div>
  </div>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al procesar la solicitud');
  }
});

// Ruta para datos crudos
app.get('/raw', async (req, res) => {
  try {
    const pongCount = await getPongCount();
    const timestamp = new Date().toISOString();
    const output = `${timestamp}: ${randomString}\nPing / Pongs: ${pongCount}`;
    res.send(`<pre>${output}</pre>`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error al procesar la solicitud');
  }
});

// Endpoint para obtener datos en JSON
app.get('/api/data', async (req, res) => {
  try {
    const pongCount = await getPongCount();
    res.json({
      timestamp: new Date().toISOString(),
      sessionId: randomString,
      pongCount: pongCount
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Log output application running on port ${PORT}`);
  console.log(`Session ID: ${randomString}`);
  console.log(`Ping Pong URL: ${PING_PONG_URL}`);
});
