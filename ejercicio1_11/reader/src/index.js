const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_PATH = '/usr/src/app/data/log.txt';

app.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf8');
    res.send(`<pre>${data}</pre>`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.send('No hay datos disponibles aún');
    } else {
      console.error('Error al leer el archivo:', error);
      res.status(500).send('Error al leer los datos');
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Reader service running on port ${PORT}`);
});
