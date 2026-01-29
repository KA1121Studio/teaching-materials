
# 使い方マニュアル




## 構成概要

```
.
├─ server.js
├─ index.html
├─ watch.html
├─ video.html
├─ audio.html
├─ build.sh
├─ package.json
├─ youtube-cookies.txt   ※ Git 管理しない
```

---

## 使用技術

* Node.js (>=20)
* Express
* yt-dlp
* node-fetch
* HTML5 video / audio
* YouTube DASH ストリーム

---

## セットアップ

### 1. yt-dlp をインストール

```bash
pip install yt-dlp
```

---

### 2. Node.js 依存関係をインストール

```bash
npm install
```

---

### 3. YouTube cookies を用意

ブラウザから取得した cookies を
`youtube-cookies.txt` に保存。

⚠️ **GitHub に絶対にアップしないこと**

`.gitignore`

```
youtube-cookies.txt
```

---

### 4. サーバ起動

```bash
npm start
```

```
Server running at http://localhost:3000
```

---

## API 一覧

### 通常

```
GET /video?id=VIDEO_ID
```

返却例：

```json
{
  "video": "映像URL",
  "audio": "音声URL"
}
```

---

### 映像のみ

```
GET /video-only?id=VIDEO_ID
```

返却例：

```json
{
  "video": "映像URL"
}
```

---

### 音声のみ

```
GET /audio-only?id=VIDEO_ID
```

返却例：

```json
{
  "audio": "音声URL"
}
```

---

### プロキシ（必須）

```
GET /proxy?url=STREAM_URL
```

YouTube のストリームは
**必ずこの proxy 経由で再生すること**。

---

## HTML ページの使い方

### ① 映像だけを見る

```
/video.html?id=VIDEO_ID
```

* 映像のみ再生
* 音声なし
* MP4 ストリーム確認用

---

### ② 音声だけを聴く

```
/audio.html?id=VIDEO_ID
```

* 音声のみ再生
* バックグラウンド検証向き
* 音声 DL 用途にも使える

---

### ③ 映像＋音声を同期再生

```
/watch.html?id=VIDEO_ID
```

* 映像＋音声を別ストリームで取得
* play / pause / seek を同期


---

### なぜ分ける？

YouTube は内部で

* 映像ストリーム
* 音声ストリーム

を **最初から分離** して配信している。

---

### サーバ側で切り分ける理由

* API の責務が明確
* クライアントが単純
* 教材として理解しやすい

```
取得 → サーバ
使い分け → クライアント
```

---

## よくある質問

### Q. なぜ cookies が必要？

* 年齢制限
* 一部制限動画
  に対応するため。

---

### Q. Android で不安定なことがある

* Android Chrome は
  video + audio 同期再生を嫌う
* デモ用途限定で使用すること



* YouTube DASH の正体
* 映像と音声の分離
* Range / proxy の役割
* Web メディア再生の制約


