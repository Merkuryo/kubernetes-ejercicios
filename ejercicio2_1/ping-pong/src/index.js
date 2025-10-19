const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Configuración de PostgreSQL desde variables de entorno
const pool = new Pool({
  user: process.env.DB_USER || 'pingpong',
  password: process.env.DB_PASSWORD || 'pingpong123',
  host: process.env.DB_HOST || 'postgres-stset-0.postgres-svc',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pingpong'
});

// Inicializar tabla de pings
async function initializeDatabase() {
  let retries = 0;
  const maxRetries = 10;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      
      // Crear tabla si no existe
      await client.query(`
        CREATE TABLE IF NOT EXISTS pings (
          id SERIAL PRIMARY KEY,
          count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insertar fila inicial si no existe
      const result = await client.query('SELECT COUNT(*) FROM pings');
      if (result.rows[0].count === 0) {
        await client.query('INSERT INTO pings (count) VALUES (0)');
        console.log('Database initialized with pings table');
      } else {
        console.log('Database already initialized');
      }
      
      client.release();
      return true; // Éxito
    } catch (err) {
      retries++;
      console.error(`Error initializing database (attempt ${retries}/${maxRetries}):`, err.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos
      }
    }
  }
  
  throw new Error('Failed to initialize database after ' + maxRetries + ' attempts');
}

// Endpoint para incrementar y obtener el contador de pings
app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Incrementar contador
    const result = await client.query(
      'UPDATE pings SET count = count + 1, updated_at = CURRENT_TIMESTAMP RETURNING count'
    );
    
    const count = result.rows[0]?.count || 0;
    client.release();
    
    res.json({ pongs: count });
  } catch (err) {
    console.error('Error updating counter:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener solo el número de pongs
app.get('/count', async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query('SELECT count FROM pings');
    const count = result.rows[0]?.count || 0;
    
    client.release();
    res.json({ pongs: count });
  } catch (err) {
    console.error('Error fetching counter:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.send('OK');
});

// Inicializar base de datos y iniciar servidor
initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Ping pong application running on port ${PORT}`);
      console.log(`Connected to PostgreSQL at ${process.env.DB_HOST || 'postgres-stset-0.postgres-svc'}:${process.env.DB_PORT || 5432}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  });
