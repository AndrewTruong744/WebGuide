const express = require("express");
require('dotenv').config();
const path = require("node:path");
const cors = require('cors');
const app = express();

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

app.use(cors());

const PORT = 3000;
app.listen(PORT, (error) => {
  // This is important!
  // Without this, any startup errors will silently fail
  // instead of giving you a helpful error message.
  if (error) {
    throw error;
  }
  console.log(`Express app - listening on port ${PORT}!`);
});