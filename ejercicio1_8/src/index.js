const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const MESSAGE = process.env.MESSAGE || 'Hello from Todo App';

const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Todo App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            background-color: #f0f0f0;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Todo App</h1>
        <p>Server running on port: ${PORT}</p>
        <p>Message: ${MESSAGE}</p>
    </div>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Server started in port ${PORT}`);
});
