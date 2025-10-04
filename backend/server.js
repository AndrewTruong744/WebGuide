const express = require("express");
require('dotenv').config();
const path = require("node:path");
const cors = require('cors');
const app = express();
const{HttpsAgent} = require("agentkeepalive");

const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));
app.use(express.json());
app.use(cors());

const PORT = 3000;
const API_KEY = process.env.API_KEY;

// const _guideCache = new Map();
// const _CACHE_TTL = 15_000;

// function _mkGuideKey(obj) {
//   return JSON.stringify(obj).slice(0, 8000);
// }

// const _keepAliveAgent = new HttpsAgent({
//   keepALive: true,
//   maxSockets: 50,
//   maxFreeSockets: 10,
//   timeout: 60_000,
//   freeSocketTimout: 30_000,
// });

// async function _robustFetch(url, options, {timeoutMs = 15_000, retries = 2} = {}) {
//   for(let attempt = 0; attempt <= retries; attempt++) {
//     const controller = new AbortController();
//     const t = setTimeout(() => controller.abort(), timeoutMs);
//     try {
//       const res = await fetch(url, { ...options, signal: controller.signal, agent: _keepAliveAgent});
//       clearTimeout(t);
//       if(!res.ok){
//         const body = await res.text().catch(() => "");
//         throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
//       }
//       return res;
//     }
//     catch(error){
//       clearTimeout(t);
//       if (attempt === retries || error.name === "AbortError") throw error;
      
//       await new Promise(r => setTimeout(r, 400 * 2 ** attempt));
//     }
//   }
// }

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
// app.post("/guide", async (req, res) => {
//   try{
//     const {promptText, generationConfig} = req.body || {};
//     if (!promptText) return res.status(400).json({ error: "Missing promptText" });

//     const genCfg = {
//       temperature: 0.2,
//       topP: 0.9,
//       topK: 32,
//       maxOutputTokens: 600,
//       response_mime_type: "application/json",
//       ...generationConfig
//     };
//     const requestBody = {
//       contents: [{ role: "user", parts: [{ text: promptText }] }],
//       generationConfig: genCfg
//     };

//     // Cache identical calls briefly
//     const cacheKey = _mkGuideKey({ MODEL, requestBody });
//     const cached = _guideCache.get(cacheKey);
//     if (cached && Date.now() - cached.t < _GUIDE_CACHE_TTL_MS) {
//       return res.json(cached.v);
//     }

//     // Call Gemini
//     const apiURL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;
//     const apiRes = await _robustFetch(apiURL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-goog-api-key": API_KEY,
//         "Accept": "application/json",
//       },
//       body: JSON.stringify(requestBody),
//     });

//     const apiData = await apiRes.json();

//     // Cache and return raw response (or slim it here if you want)
//     _guideCache.set(cacheKey, { v: apiData, t: Date.now() });
//     res.json(apiData);


//   }
//   catch(error){
//     console.error("Guide error:", error);
//     res.status(502).json({error: String(error)});
//   }
// });

app.listen(PORT, (error) => {

  if (error) {
    throw error;
  }
  console.log(`Express app - listening on port ${PORT}!`);
});