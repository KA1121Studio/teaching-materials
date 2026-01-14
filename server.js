import express from 'express';
import Youtube from 'youtubei.js';
import fetch from 'node-fetch'; // プロキシ用
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const PORT = 3000;

// ES Modules 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// index.html 配信
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// YouTube ストリーム URL を取得してプロキシ用 URL を返す
app.get('/video', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'video id required' });

  try {
    const youtube = new Youtube();
    const video = await youtube.getVideo(videoId);

    const formats = video.streamingData.formats;
    let stream = formats.find(f => f.hasVideo && f.hasAudio && f.qualityLabel?.includes('720'));
    if(!stream) stream = formats.find(f => f.hasVideo && f.hasAudio);

    if(!stream) return res.status(500).json({ error: '再生可能なストリームが見つかりません' });

    // ブラウザからサーバ経由で再生するための proxy URL
    res.json({ proxyUrl: `/proxy?url=${encodeURIComponent(stream.url)}` });

  } catch (err) {
    console.error('YouTube fetch error:', err);
    res.status(500).json({ error: '動画取得に失敗しました' });
  }
});

// プロキシとして動画データを返す
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if(!url) return res.status(400).send('URL required');

  try {
    const response = await fetch(url);

    // ヘッダーをそのままコピー
    res.set({
      'Content-Type': response.headers.get('content-type'),
      'Content-Length': response.headers.get('content-length'),
      'Accept-Ranges': response.headers.get('accept-ranges') || 'bytes',
    });

    response.body.pipe(res);
  } catch(err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy failed');
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
