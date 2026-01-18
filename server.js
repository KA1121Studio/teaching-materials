// server.js
import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { execSync } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 映像＋音声を取得して単一MP4で返す
app.get("/video", async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: "video id required" });

  try {
    const url = execSync(
      `yt-dlp -f bestvideo+bestaudio --merge-output-format mp4 --cookies youtube-cookies.txt --get-url https://youtu.be/${videoId}`
    )
      .toString()
      .trim()
      .split("\n")[0];

    res.json({
      url,
      source: "yt-dlp-with-cookies"
    });
  } catch (e) {
    console.error("yt-dlp error:", e);
    res.status(500).json({ error: "failed_to_fetch_video", message: e.message });
  }
});

// プロキシ配信（Range対応でシークも可能）
app.get("/proxy", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("URL required");

  const range = req.headers.range;

  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(url, { headers: { Range: range || "bytes=0-" } });

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
