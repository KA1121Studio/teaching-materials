// server.js
import express from "express";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";
import { Innertube } from "youtubei.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// YouTubeクライアント初期化
let youtube;
(async () => {
  youtube = await Innertube.create();
  console.log("YouTube client ready");
})();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// watch.html 用 
app.get("/watch.html", (req, res) => {
  res.sendFile(path.join(__dirname, "watch.html"));
});

import { execSync } from "child_process";



// プロキシ配信
app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");

  const range = req.headers.range;
  try {
    const response = await fetch(url, {
      headers: {
        Range: range || "bytes=0-"
      }
    });
    
app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const output = execSync(
      `yt-dlp --cookies youtube-cookies.txt ` +
      `--js-runtimes node --remote-components ejs:github ` +
      `--user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" ` +
      `-f "best[ext=mp4][protocol^=https][protocol!*=manifest][height<=720]/best[ext=mp4][protocol^=https][protocol!*=manifest]/best[ext=mp4][protocol^=https]/best[height<=720][ext=mp4]" ` +
      `--get-url https://youtu.be/${videoId}`
    ).toString().trim();

    const videoUrl = output.split("\n").filter(Boolean)[0];

    if (!videoUrl || videoUrl.includes('.m3u8')) {
      throw new Error("No direct MP4 stream available");
    }

    res.json({
      video: videoUrl,
      audio: null,
      source: "yt-dlp-mp4-only"
    });

  } catch (e) {
    console.error("yt-dlp error:", e.message);
    res.status(500).json({
      error: "failed_to_fetch_video",
      message: e.message,
      videoId: videoId
    });
  }
});

    const headers = {
      "Content-Type": response.headers.get("content-type"),
      "Accept-Ranges": "bytes",
      "Content-Range": response.headers.get("content-range") || range
    };

    res.writeHead(response.status, headers);
    response.body.pipe(res);

  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed");
  }
});

app.get("/proxy-hls", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");

  const r = await fetch(url);
  let text = await r.text();

 
  // HLS内のチャンクURLをすべて /proxy に書き換える
  text = text.replace(
    /https:\/\/rr4---sn-[^\/]+\.googlevideo\.com[^\n]+/g,
    m => "/proxy?url=" + encodeURIComponent(m)
  );

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.send(text);
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
