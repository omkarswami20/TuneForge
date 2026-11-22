# 🎵 TuneForge

**Universal MP3 Downloader & Audio Engine**  
*(YouTube • YouTube Music • Spotify • Apple Music)*

Download single tracks or 150+ song playlists as **pure 320kbps MP3s** for your **Car USB Pendrive** or directly onto **iPhone, iPad, and Android** devices without installing any apps!

---

## 🚀 How to Run (Choose Your Mode)

### 🚗 Mode 1: For Yourself on PC (Car USB Mode)
Use this when you want to download music directly to your PC for a car pendrive:

1. Double-click [**`start.bat`**](start.bat).
2. Your browser will automatically open at `http://127.0.0.1:8000`.
3. Paste any link from **YouTube**, **YouTube Music**, **Spotify**, or **Apple Music**.
4. Click **Start Download**.
5. When finished, click **"Open Folder"** and copy the MP3 files straight to your USB pendrive!

---

### 📱 Mode 2: For Sharing with Friends (iPhone / iPad / Android)
Use this when you want a friend (on mobile or without a PC) to download music:

1. Double-click [**`share_tunnel.bat`**](share_tunnel.bat).
2. A black terminal window will open. Within a few seconds, look for a box with a link ending in `.trycloudflare.com`:
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at:                                          |
   |  https://example-words-here.trycloudflare.com                                              |
   +--------------------------------------------------------------------------------------------+
   ```
3. **Copy that link** and send it to your friend on WhatsApp or Telegram.
4. **Keep the window open** on your PC while they use it.

---

### 📲 What Your Friend Does on Their Phone:
1. Tap the link in **Safari (iPhone/iPad)** or **Chrome (Android)**.
2. Paste any song or playlist link and tap **Download**.
3. Once completed:
   * **Full Playlist:** Tap **"Save All (ZIP)"** to download all 150 songs in 1 file into their phone's **Files / Downloads** app!
   * **Single Songs:** Tap the individual **Download arrow icon** beside any song.

---

## ⚡ Tech Stack

- **Backend:** **Fastify** (Node.js v24)
- **Frontend:** **React** + **Vite** + **Redux Toolkit (RTK Query)**
- **Downloader Engine:** `yt-dlp` + `FFmpeg` (`libmp3lame` 320kbps)
- **Car Tags:** `node-id3` (Universal ID3v2.3 tags readable by car infotainment dashboards)
- **Mobile Packaging:** `archiver` for 1-tap streaming ZIP downloads
- **Public Tunnel:** `cloudflared` (Cloudflare Quick Tunnels with WebSocket support)

---

## 📁 Project Files Overview

| File | Purpose |
| :--- | :--- |
| `start.bat` | 1-Click launcher for local PC / Car USB use |
| `share_tunnel.bat` | 1-Click launcher to generate a live shareable link for mobile friends |
| `start_dev.bat` | Optional launcher for developers with live hot-reloading |
| `backend/` | Fastify Node.js server and download queue engine |
| `frontend/` | React single-page application with RTK Query |
