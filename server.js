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

app.get('/video', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'video id required' });

  try {
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);

    const formats = info.streamingData?.formats || [];
    let stream = formats
      .filter(f => f.hasVideo && f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

    if (!stream) return res.status(500).json({ error: '再生可能なストリームが見つからない' });

    res.json({ proxyUrl: `/proxy?url=${encodeURIComponent(stream.url)}` });

  } catch (err) {
    console.error('YouTube fetch error:', err);
    res.status(500).json({ error: '動画取得に失敗しました' });
  }
});

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
      'Content-Length': response.headers.get('content-length'),
      'Accept-Ranges': response.headers.get('accept-ranges') || 'bytes',
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
