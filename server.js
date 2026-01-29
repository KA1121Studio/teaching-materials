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

app.get("/video.html", (req, res) => {
  res.sendFile(path.join(__dirname, "video.html"));
});

app.get("/audio.html", (req, res) => {
  res.sendFile(path.join(__dirname, "audio.html"));
});


import { execSync } from "child_process";

app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    // yt-dlpで動画と音声を取得
    const output = execSync(
      `yt-dlp --cookies youtube-cookies.txt --js-runtimes node --remote-components ejs:github --sleep-requests 1 --user-agent "Mozilla/5.0" --get-url -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" https://youtu.be/${videoId}`
    ).toString().trim().split("\n");

    const videoUrl = output[0]; // 動画URL
    const audioUrl = output[1]; // 音声URL

    res.json({
      video: videoUrl,
      audio: audioUrl,
      source: "yt-dlp-with-cookies"
    });

  } catch (e) {
    console.error("yt-dlp error:", e);
    res.status(500).json({
      error: "failed_to_fetch_video",
      message: e.message
    });
  }
});



app.get("/video-only", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const output = execSync(
      `yt-dlp --cookies youtube-cookies.txt --js-runtimes node --remote-components ejs:github --sleep-requests 1 --user-agent "Mozilla/5.0" --get-url -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" https://youtu.be/${videoId}`
    )
      .toString()
      .trim()
      .split("\n");

    res.json({
      video: output[0] // 映像URLだけ返す
    });

  } catch (e) {
    console.error("video-only error:", e);
    res.status(500).json({
      error: "failed_to_fetch_video_only",
      message: e.message
    });
  }
});




app.get("/audio-only", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const output = execSync(
      `yt-dlp --cookies youtube-cookies.txt --js-runtimes node --remote-components ejs:github --sleep-requests 1 --user-agent "Mozilla/5.0" --get-url -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]" https://youtu.be/${videoId}`
    )
      .toString()
      .trim()
      .split("\n");

    res.json({
      audio: output[1]
    });

  } catch (e) {
    console.error("audio-only error:", e);
    res.status(500).json({
      error: "failed_to_fetch_audio_only",
      message: e.message
    });
  }
});



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
