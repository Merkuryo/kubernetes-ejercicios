const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const filePath = path.join('/usr/src/app/files', 'logs.txt');

app.get('/', (req, res) => {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.send(content);
    } catch (error) {
        res.status(500).send('Error reading logs: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`Reader server started in port ${PORT}`);
});
