const express = require('express');
const app = express();

// Puerto desde variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server started in port ' + PORT);
});

app.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});