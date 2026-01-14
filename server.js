import express from "express";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * ANDROID client で InnerTube API を直接叩く
 */
app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // 公開鍵（youtube内部用）

    const body = {
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "18.11.34",
          androidSdkVersion: 33,
          userAgent:
            "com.google.android.youtube/18.11.34 (Linux; U; Android 13)",
          hl: "ja",
          gl: "JP"
        }
      },
      videoId
    };

    const ytRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": body.context.client.userAgent,
          "x-youtube-client-name": "3",
          "x-youtube-client-version": body.context.client.clientVersion
        },
        body: JSON.stringify(body)
      }
    );

    const json = await ytRes.json();
    const adaptive = json?.streamingData?.adaptiveFormats || [];

    // video only（高画質優先）
    const videoStream = adaptive
      .filter(f => f.mimeType?.startsWith("video/") && f.url)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!videoStream) {
      return res.status(500).json({ error: "video stream not found" });
    }

    // ★ ここで「君が貼ったのと同型のURL」が出る
    res.json({
      url: videoStream.url,
      itag: videoStream.itag,
      mimeType: videoStream.mimeType
    });

  } catch (e) {
    console.error("ANDROID client error:", e);
    res.status(500).json({ error: "failed to fetch video" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
