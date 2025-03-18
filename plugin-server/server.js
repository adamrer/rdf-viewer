const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Nastaví složku "plugins" jako veřejnou
app.use('/plugins', express.static('plugins'));

app.listen(port, () => {
    console.log(`Server běží na http://localhost:${port}`);
});