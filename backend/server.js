const express = require("express");
require('dotenv').config();
const path = require("node:path");
const cors = require('cors');
const app = express();

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.json());
app.use(cors());

const PORT = 3000;
const API_KEY = process.env.API_KEY;
console.log("Loaded API key (first 10 chars):", API_KEY?.slice(0, 10));


app.get("/ping", (req, res) => {
  res.json({ok: true, message: "Server is alive!"});
});

app.post("/ask", async (req, res) => {
  const {prompt} = req.body;

  if(!prompt)
    return res.status(400).json({error: "no prompt provided"});

  try{
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": API_KEY
        },
        body: JSON.stringify({
          contents: [
            {role: "user", parts: [{text: prompt}]}
          ]
        })
      }
    );

    const data = await response.json();

    res.json(data);
  }
  catch(error){
    console.error("API error:", error);
    res.status(500).json({error: "Failed to fetch gemini response"});
  }
});


app.listen(PORT, (error) => {

  if (error) {
    throw error;
  }
  console.log(`Express app - listening on port ${PORT}!`);
});