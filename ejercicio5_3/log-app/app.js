const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3001;
const LOG_DIR = '/tmp/logs';

// Ensure log directory exists
const fs = require('fs');
const path = require('path');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Get logs endpoint
app.get('/logs', (req, res) => {
  try {
    const logPath = path.join(LOG_DIR, 'log.txt');
    if (!fs.existsSync(logPath)) {
      return res.json([]);
    }
    
    const logs = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .slice(-50); // Return last 50 lines
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Main page that displays logs and greeting
app.get('/', async (req, res) => {
  try {
    // Get greeting from greeter service
    let greeting = 'Hello, World!';
    try {
      const greeterResponse = await axios.get('http://greeter-svc/greeting', {
        timeout: 5000
      });
      greeting = greeterResponse.data.greeting || greeting;
    } catch (error) {
      console.error('Error calling greeter service:', error.message);
      // Use default greeting if greeter service is unavailable
    }

    // Log this greeting
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Greeting: ${greeting}`;
    const logPath = path.join(LOG_DIR, 'log.txt');
    
    fs.appendFileSync(logPath, logEntry + '\n');
    console.log(logEntry);

    // Get all logs
    const logs = fs.readFileSync(logPath, 'utf-8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .slice(-100);

    // HTML response with logs and current greeting
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Log App with Service Mesh</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .header h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    .header p {
      color: #666;
      font-size: 1.1em;
    }
    .greeting-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 1.3em;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    }
    .logs-section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .logs-section h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .log-entry {
      padding: 10px;
      margin: 8px 0;
      background: #f5f5f5;
      border-left: 4px solid #667eea;
      font-family: 'Courier New', monospace;
      font-size: 0.95em;
      word-break: break-all;
      border-radius: 4px;
    }
    .log-entry:hover {
      background: #efefef;
      transform: translateX(5px);
      transition: all 0.2s ease;
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      background: #f0f0f0;
      border-radius: 5px;
      font-size: 0.9em;
      color: #555;
    }
  </style>
  <script>
    // Auto-refresh logs every 3 seconds
    setInterval(() => {
      fetch('/logs')
        .then(r => r.json())
        .then(logs => {
          const logsDiv = document.getElementById('logs');
          logsDiv.innerHTML = logs.map(log => 
            '<div class="log-entry">' + log + '</div>'
          ).join('');
        });
    }, 3000);
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Log App with Service Mesh</h1>
      <p>Demonstrating Istio Ambient Mode with Canary Deployment</p>
    </div>
    
    <div class="greeting-box">
      🎉 Current Greeting: <strong>${greeting}</strong>
    </div>
    
    <div class="logs-section">
      <h2>📝 Log Output</h2>
      <div id="logs">
        ${logs.map(log => `<div class="log-entry">${log}</div>`).join('')}
      </div>
      <div class="status">
        Total entries: ${logs.length} | Last update: ${new Date().toLocaleTimeString()}
      </div>
    </div>
  </div>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Log App Error</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .error { color: red; padding: 20px; background: white; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="error">
    <h1>Error</h1>
    <p>${error.message}</p>
  </div>
</body>
</html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Log App listening on port ${PORT}`);
});
