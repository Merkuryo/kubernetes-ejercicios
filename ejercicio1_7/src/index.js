const express = require('express');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;
const randomString = crypto.randomBytes(16).toString('hex');

// Función para obtener el timestamp actual
const getTimestamp = () => new Date().toISOString();

// Log cada 5 segundos
setInterval(() => {
    console.log(`${getTimestamp()}: ${randomString}`);
}, 5000);

// Endpoint para obtener el estado actual
app.get('/', (req, res) => {
    res.json({
        timestamp: getTimestamp(),
        random_string: randomString
    });
});

app.listen(PORT, () => {
    console.log(`Server started in port ${PORT}`);
});
