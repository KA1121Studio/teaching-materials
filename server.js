// ===============================
//  完成版 server.js（ANDROID経路＋cipher対応）
// ===============================

import express from "express";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------- トップページ -----------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ----------- YouTube 取得エンドポイント -----------
app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) {
    return res.status(400).json({ error: "video id required" });
  }

  try {
    const apiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"; // YouTube内部公開キー

    const body = {
  context: {
    client: {
      clientName: "ANDROID",
      clientVersion: "18.12.34",
      androidSdkVersion: 33,
      userAgent:
        "com.google.android.youtube/18.12.34 (Linux; U; Android 13)",
      hl: "ja",
      gl: "JP"
    }
  },

  // ★★★ これが超重要 ★★★
  contentCheckOk: true,
  racyCheckOk: true,

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

    if (!ytRes.ok) {
  const text = await ytRes.text();
  console.error("YouTubeレスポンスエラー:", ytRes.status, text);
  throw new Error("YouTube request failed");
}


    const json = await ytRes.json();
    const adaptive = json?.streamingData?.adaptiveFormats || [];

    // 高ビットレートの「video only」を優先して選ぶ
   // 高ビットレートの動画またはmuxedを優先して選ぶ
let videoStream = adaptive
  .filter(f =>
    f.mimeType?.startsWith("video/") ||
    f.mimeType?.includes("video/mp4")
  )
  .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

// それでも無い場合 → とりあえず一番ビットレートが高いものを拾う（保険）
if (!videoStream) {
  videoStream = adaptive
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
}

    // ---- 最終URLの組み立て ----
    let finalUrl = videoStream.url;

    // url が無い場合 → signatureCipher を展開
    if (!finalUrl && videoStream.signatureCipher) {
      const params = new URLSearchParams(videoStream.signatureCipher);

      const baseUrl = params.get("url");
      const sig = params.get("s");      // 生の署名
      const sp = params.get("sp") || "sig";

      if (baseUrl) {
        finalUrl = `${baseUrl}&${sp}=${encodeURIComponent(sig)}`;
      }
    }

    if (!finalUrl) {
      return res.status(500).json({ error: "最終URLを組み立てられない" });
    }

    res.json({
      url: finalUrl,
      itag: videoStream.itag,
      mimeType: videoStream.mimeType
    });

  } catch (e) {
    console.error("ANDROID client error:", e);
    res.status(500).json({ error: "failed to fetch video" });
  }
});

// ----------- googlevideo 専用プロキシ -----------
app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");

  if (!url.startsWith("https://") || !url.includes("googlevideo.com")) {
    return res.status(400).send("Invalid URL");
  }

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

// ----------- 起動 -----------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
