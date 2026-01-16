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

// 動画情報取得
app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    if (!youtube) return res.status(503).json({ error: "YouTube client not ready" });

    const info = await youtube.getInfo(videoId);
    const formats = info.streaming_data?.formats ?? [];

    // mp4 ストリームだけ抽出
    const mp4s = formats.filter(f => f.mimeType?.includes("mp4"));
    if (!mp4s.length) return res.status(500).json({ error: "no_stream_found" });

    // ビットレート高い順にソートして選択
    const best = mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    // 再生可能URLを生成
    const url = best.decipher ? best.decipher(info.session.player) : best.url;

    res.json({
      url,
      itag: best.itag,
      mimeType: best.mimeType
    });
  } catch (e) {
    console.error("YouTube fetch error:", e);
    res.status(500).json({ error: "failed_to_fetch_video", message: e.message });
  }
});

// プロキシ配信
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
