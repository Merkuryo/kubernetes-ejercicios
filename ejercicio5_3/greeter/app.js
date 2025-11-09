const express = require('express');

const app = express();
const PORT = 8080;
const VERSION = process.env.VERSION || 'v1';
const GREETINGS = {
  v1: ['Hello, World!', 'Hi there!', 'Welcome!', 'Good to see you!'],
  v2: ['Hola, Mundo!', '¡Hola!', '¡Bienvenido!', '¡Qué gusto verte!']
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    version: VERSION 
  });
});

// Greeting endpoint
app.get('/greeting', (req, res) => {
  const greetingList = GREETINGS[VERSION] || GREETINGS.v1;
  const greeting = greetingList[Math.floor(Math.random() * greetingList.length)];
  
  console.log(`[${VERSION}] Serving greeting: ${greeting}`);
  
  res.json({ 
    greeting: greeting,
    version: VERSION,
    timestamp: new Date().toISOString()
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({ version: VERSION });
});

app.listen(PORT, () => {
  console.log(`Greeter ${VERSION} listening on port ${PORT}`);
});
