const express = require('express');

const app = express();
const PORT = 3000;

let pingCounter = 0;

// Endpoint para obtener el contador de pings
app.get('/', (req, res) => {
  pingCounter++;
  res.json({ pongs: pingCounter });
});

// Endpoint para obtener solo el número de pongs
app.get('/count', (req, res) => {
  res.json({ pongs: pingCounter });
});

// Health check
app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ping pong application running on port ${PORT}`);
});
