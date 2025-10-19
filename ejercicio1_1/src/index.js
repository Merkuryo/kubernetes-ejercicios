const crypto = require('crypto');

// Generar ID único al iniciar
const uniqueId = crypto.randomBytes(16).toString('hex');

// Función para imprimir timestamp + ID
const logIdentifier = () => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${uniqueId}`);
};

// Ejecutar cada 5 segundos
setInterval(logIdentifier, 5000);