import express from 'express';
import { Innertube } from 'youtubei.js';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * adaptiveFormats から
 * - video only
 * - audio only
 * を1本ずつ返す
 */
app.get('/video', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'video id required' });

  try {
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    const adaptive = info.streamingData?.adaptiveFormats || [];

    const videoStream = adaptive
      .filter(f => f.hasVideo && !f.hasAudio && f.url)
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

    const audioStream = adaptive
      .filter(f => f.hasAudio && !f.hasVideo && f.url)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (!videoStream || !audioStream) {
      return res.status(500).json({ error: '映像または音声が取得できない' });
    }

    res.json({
      video: {
        url: `/proxy?url=${encodeURIComponent(videoStream.url)}`,
        mimeType: videoStream.mimeType,
        codecs: videoStream.codecs
      },
      audio: {
        url: `/proxy?url=${encodeURIComponent(audioStream.url)}`,
        mimeType: audioStream.mimeType,
        codecs: audioStream.codecs
      }
    });

  } catch (err) {
    console.error('YouTube error:', err);
    res.status(500).json({ error: '動画取得に失敗しました' });
  }
});

/**
 * googlevideo.com 専用プロキシ
 */
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('URL required');

  if (!url.startsWith('https://') || !url.includes('googlevideo.com')) {
    return res.status(400).send('Invalid URL');
  }

  try {
    const response = await fetch(url);
    res.set({
      'Content-Type': response.headers.get('content-type'),
      'Accept-Ranges': 'bytes'
    });
    response.body.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
