const express = require('express');
const app = express();

const PORT = process.env.PORT || 3001;
let counter = 0;

app.get('/pingpong', (req, res) => {
    counter++;
    res.send(`pong ${counter}`);
});

app.listen(PORT, () => {
    console.log(`Ping-pong server started in port ${PORT}`);
});
