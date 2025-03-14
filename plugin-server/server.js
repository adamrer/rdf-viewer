const express = require('express');
const app = express();
const port = 3000;

// Nastaví složku "plugins" jako veřejnou
app.use('/plugins', express.static('plugins'));

app.listen(port, () => {
    console.log(`Server běží na http://localhost:${port}`);
});