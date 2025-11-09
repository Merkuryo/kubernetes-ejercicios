const express = require('express');
const app = express();

// Get PORT from environment variable, default to 8080 (Knative standard)
const PORT = process.env.PORT || 8080;

// Counter stored in memory (stateless approach for serverless)
// Each request increments the counter for this instance
let requestCount = 0;

// Health check endpoints (required for Knative)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Ping endpoint - returns pong
app.get('/ping', (req, res) => {
  requestCount++;
  
  res.json({
    response: 'pong',
    count: requestCount,
    timestamp: new Date().toISOString(),
    pod: process.env.HOSTNAME || 'unknown',
    instance: process.env.INSTANCE_ID || 'serverless'
  });
});

// Pong endpoint - returns ping
app.get('/pong', (req, res) => {
  requestCount++;
  
  res.json({
    response: 'ping',
    count: requestCount,
    timestamp: new Date().toISOString(),
    pod: process.env.HOSTNAME || 'unknown',
    instance: process.env.INSTANCE_ID || 'serverless'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  requestCount++;
  
  res.json({
    message: 'Ping-Pong Serverless Service',
    endpoints: {
      '/ping': 'Returns pong',
      '/pong': 'Returns ping',
      '/health': 'Health check',
      '/ready': 'Readiness check',
      '/stats': 'Statistics'
    },
    stats: {
      requestCount: requestCount,
      instance: process.env.HOSTNAME || 'unknown',
      timestamp: new Date().toISOString()
    }
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    requestCount: requestCount,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pod: process.env.HOSTNAME || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown handling (required for Knative)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Ping-Pong Serverless Service          ║
║   Listening on port ${PORT}                    ║
║   Knative Runtime Contract Compatible    ║
╚══════════════════════════════════════════╝
  `);
  console.log('Environment:');
  console.log(`  PORT: ${PORT}`);
  console.log(`  HOSTNAME: ${process.env.HOSTNAME}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});
