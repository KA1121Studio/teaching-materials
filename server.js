import express from 'express';
import ytdl from '@distube/ytdl-core';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// ES Modules 対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// favicon 無視（404防止・任意）
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Range 完全対応ストリーム
app.get('/video', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId) {
    res.status(400).send('video id required');
    return;
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const range = req.headers.range;

  if (!range) {
    res.status(416).send('Range header required');
    return;
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highest',
      filter: 'audioandvideo'
    });

    const contentLength = parseInt(format.contentLength, 10);
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : contentLength - 1;

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${contentLength}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });

    ytdl(url, {
      format,
      range: { start, end },
      highWaterMark: 1 << 25
    }).pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).send('stream error');
  }
});

app.listen(PORT, () => {
  console.log('server started on port', PORT);
});
