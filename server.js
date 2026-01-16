import express from "express";
import YouTube from "youtubei.js"; // ← ここを修正
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const youtube = new YouTube(); // ← インスタンス作成

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const video = await youtube.getVideo(videoId);

    const streams = video.streams.filter(s => s.type.includes("video/mp4"));
    if (!streams.length)
      return res.status(500).json({ error: "no_stream_found", message: "再生可能ストリームなし" });

    const best = streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    res.json({
      url: best.url,
      itag: best.itag,
      mimeType: best.type
    });
  } catch (e) {
    console.error("YouTube fetch error:", e);
    res.status(500).json({ error: "failed_to_fetch_video", message: e.message });
  }
});

app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");
  if (!url.startsWith("https://") || !url.includes("googlevideo.com"))
    return res.status(400).send("Invalid URL");

  try {
    const response = await fetch(url);
    res.set({
      "Content-Type": response.headers.get("content-type"),
      "Accept-Ranges": "bytes"
    });
    response.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy failed");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
