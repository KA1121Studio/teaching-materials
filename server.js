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

app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    // まずInvidiousから動画情報を取得
const instances = [
  "https://invidious.fdn.fr",
  "https://invidious.jing.rocks",
  "https://inv.tux.pizza",
  "https://invidious.protokolla.fi"
];


let info = null;
let usedHost = null;

// 生きているサーバーを探して“実データ”を取るまで回す
for (const host of instances) {
  const apiUrl = `${host}/api/v1/videos/${videoId}`;

  try {
    const r = await fetch(apiUrl);
    const text = await r.text();

    // JSONにできたら成功として採用
    info = JSON.parse(text);
    usedHost = host;
    console.log("使用Invidious:", host);
    break;

  } catch (e) {
    console.warn("失敗:", host, e.message);
  }
}

// 全部ダメだったときだけ終了
if (!info) {
  return res.status(502).json({
    error: "no_invidious_available",
    message: "利用可能なInvidiousが見つかりません"
  });
}

    // mp4形式のストリームだけ抽出
    const streams = info.formatStreams.filter(s =>
      s.mimeType.includes("video/mp4")
    );

    if (!streams.length) {
      return res.status(500).json({
        error: "no_stream_found",
        message: "mp4ストリームが見つからない"
      });
    }

    // ビットレートが一番高いものを選ぶ（今の設計と同じ思想）
    const best = streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    res.json({
      url: best.url,
      itag: best.itag,
      mimeType: best.mimeType
    });

  } catch (e) {
    console.error("Invidious fetch error:", e);
    res.status(500).json({
      error: "failed_to_fetch_video",
      message: e.message
    });
  }
});


// プロキシ配信
app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");

  const range = req.headers.range; // ← これが超重要

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


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
