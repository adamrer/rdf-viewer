const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Sets folder "plugins" as public
app.use('/plugins', express.static('../plugins'));

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});