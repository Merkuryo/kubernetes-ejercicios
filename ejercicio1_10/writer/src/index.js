const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const randomString = crypto.randomBytes(16).toString('hex');
const filePath = path.join('/usr/src/app/files', 'logs.txt');

// Función para obtener timestamp
const getTimestamp = () => new Date().toISOString();

// Escribir cada 5 segundos
setInterval(() => {
    const log = `${getTimestamp()}: ${randomString}\n`;
    fs.appendFileSync(filePath, log);
    console.log('Log written:', log.trim());
}, 5000);

console.log('Writer started with string:', randomString);
