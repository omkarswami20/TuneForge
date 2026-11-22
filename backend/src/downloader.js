import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import NodeID3 from 'node-id3';
import { DOWNLOADS_DIR, YTDLP_PATH, FFMPEG_PATH, AUDIO_QUALITY } from './config.js';
import { detectPlatform, fetchSpotifyTracks, fetchAppleMusicTracks } from './platformParser.js';

export function sanitizeFilename(name) {
  let cleaned = (name ?? '').replace(/[\\/*?:"<>|]/g, '');
  cleaned = cleaned.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '');
  if (!cleaned) cleaned = 'audio_track';
  return cleaned.substring(0, 180);
}

class DownloadManager {
  constructor() {
    this.status = 'idle'; // idle, extracting, downloading, stopped, completed, error
    this.errorMessage = null;
    this.playlistTitle = '';
    this.platform = 'youtube';
    this.items = [];
    this.currentIndex = -1;
    this.completedCount = 0;
    this.failedCount = 0;
    this.totalCount = 0;
    this.cancelRequested = false;
    this.activeChildProcess = null;
    this.listeners = new Set();
  }

  registerListener(ws) {
    if (ws) this.listeners.add(ws);
  }

  unregisterListener(ws) {
    if (ws) this.listeners.delete(ws);
  }

  broadcastState() {
    const payload = JSON.stringify(this.getState());
    for (const ws of this.listeners) {
      try {
        if (ws?.readyState === 1) { // OPEN
          ws.send(payload);
        }
      } catch {
        this.listeners.delete(ws);
      }
    }
  }

  getState() {
    return {
      status: this.status ?? 'idle',
      error_message: this.errorMessage ?? null,
      playlist_title: this.playlistTitle ?? '',
      platform: this.platform ?? 'youtube',
      total_count: this.totalCount ?? 0,
      completed_count: this.completedCount ?? 0,
      failed_count: this.failedCount ?? 0,
      current_index: this.currentIndex ?? -1,
      output_dir: DOWNLOADS_DIR ?? '',
      items: Array.isArray(this.items) ? this.items : []
    };
  }

  async extractUrl(rawUrl) {
    const url = (rawUrl ?? '').trim();
    if (!url) throw new Error('A valid URL is required.');

    this.status = 'extracting';
    this.errorMessage = null;
    this.cancelRequested = false;
    this.items = [];
    this.completedCount = 0;
    this.failedCount = 0;
    this.currentIndex = -1;
    this.broadcastState();

    const plat = detectPlatform(url);
    this.platform = plat;

    try {
      let rawEntries = [];
      if (plat === 'spotify') {
        const parsed = await fetchSpotifyTracks(url);
        this.playlistTitle = parsed?.title ?? 'Spotify Playlist';
        rawEntries = Array.isArray(parsed?.items) ? parsed.items : [];
      } else if (plat === 'apple_music') {
        const parsed = await fetchAppleMusicTracks(url);
        this.playlistTitle = parsed?.title ?? 'Apple Music Playlist';
        rawEntries = Array.isArray(parsed?.items) ? parsed.items : [];
      } else {
        // Native YouTube / YouTube Music extraction via yt-dlp JSON dump
        const jsonOutput = await this._runYtDlpJsonExtract(url);
        if (jsonOutput && Array.isArray(jsonOutput.entries)) {
          this.playlistTitle = jsonOutput.title ?? 'YouTube Playlist';
          rawEntries = jsonOutput.entries;
        } else if (jsonOutput) {
          this.playlistTitle = jsonOutput.title ?? 'Single Video';
          rawEntries = [jsonOutput];
        }
      }

      const items = [];
      for (let idx = 0; idx < rawEntries.length; idx++) {
        const entry = rawEntries[idx];
        if (!entry || typeof entry !== 'object') continue;

        const videoId = entry.id ?? `track_${idx + 1}`;
        const title = entry.title ?? entry.name ?? `Track ${idx + 1}`;
        const cleanTitle = sanitizeFilename(title);
        const duration = Number(entry.duration ?? 0) || 0;
        const uploader = entry.uploader ?? entry.channel ?? entry.subtitle ?? 'Unknown Artist';
        const thumbnail = entry.thumbnail ?? '';
        const searchQuery = entry.search_query ?? null;
        const videoUrl = entry.url ?? (entry.webpage_url ? entry.webpage_url : `https://www.youtube.com/watch?v=${videoId}`);

        const targetFile = path.join(DOWNLOADS_DIR, `${cleanTitle}.mp3`);
        let alreadyExists = false;
        try {
          alreadyExists = fs.existsSync(targetFile) && fs.statSync(targetFile).size > 50000;
        } catch {
          alreadyExists = false;
        }

        items.push({
          id: String(videoId),
          index: idx,
          title: String(title),
          clean_title: cleanTitle,
          url: String(videoUrl),
          search_query: searchQuery ? String(searchQuery) : null,
          duration,
          uploader: String(uploader),
          thumbnail: String(thumbnail),
          status: alreadyExists ? 'completed' : 'queued',
          progress: alreadyExists ? 100.0 : 0.0,
          speed: '',
          eta: '',
          error: null,
          file_path: alreadyExists ? targetFile : null
        });
      }

      this.items = items;
      this.totalCount = items.length;
      this.completedCount = items.filter(i => i?.status === 'completed').length;
      this.status = 'idle';
      this.broadcastState();
      return this.getState();

    } catch (err) {
      this.status = 'error';
      this.errorMessage = err?.message ?? 'Failed to extract URL metadata';
      this.broadcastState();
      throw err;
    }
  }

  _runYtDlpJsonExtract(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--flat-playlist',
        '--skip-download',
        '--no-warnings',
        url
      ];

      const child = spawn(YTDLP_PATH, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => {
        stdout += chunk?.toString() ?? '';
      });

      child.stderr.on('data', chunk => {
        stderr += chunk?.toString() ?? '';
      });

      child.on('close', code => {
        if (code === 0 && stdout) {
          try {
            resolve(JSON.parse(stdout));
          } catch (e) {
            reject(new Error(`Failed to parse metadata JSON: ${e?.message ?? e}`));
          }
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      });

      child.on('error', err => {
        reject(new Error(`Failed to execute yt-dlp: ${err?.message ?? err}`));
      });
    });
  }

  async startQueue() {
    if (this.status === 'downloading') return;

    this.cancelRequested = false;
    this.status = 'downloading';
    this.broadcastState();

    this._processQueue();
  }

  stopQueue() {
    this.cancelRequested = true;
    this.status = 'stopped';
    if (this.activeChildProcess) {
      try {
        this.activeChildProcess.kill('SIGKILL');
      } catch {}
    }
    this.broadcastState();
  }

  async _processQueue() {
    for (let idx = 0; idx < this.items.length; idx++) {
      if (this.cancelRequested) break;

      const item = this.items[idx];
      if (!item || item.status === 'completed') continue;

      this.currentIndex = idx;
      item.status = 'downloading';
      item.progress = 0.0;
      this.broadcastState();

      const safeCleanTitle = item.clean_title || `track_${idx + 1}`;
      const targetBase = path.join(DOWNLOADS_DIR, safeCleanTitle);
      const targetMp3 = path.join(DOWNLOADS_DIR, `${safeCleanTitle}.mp3`);
      const targetSource = item.search_query || item.url;

      try {
        await this._downloadItem(item, targetBase, targetSource);

        if (fs.existsSync(targetMp3) && fs.statSync(targetMp3).size > 1000) {
          try {
            await this._applyId3Tags(targetMp3, item);
          } catch (e) {
            console.warn('[TuneForge ID3] Warning:', e?.message ?? e);
          }

          item.status = 'completed';
          item.progress = 100.0;
          item.speed = '';
          item.eta = '';
          item.file_path = targetMp3;
          this.completedCount++;
        } else {
          item.status = 'failed';
          item.error = 'Output MP3 was not created';
          this.failedCount++;
        }
      } catch (err) {
        if (this.cancelRequested) {
          item.status = 'queued';
          break;
        }
        item.status = 'failed';
        item.error = (err?.message ?? 'Download failed').substring(0, 100);
        this.failedCount++;
      }

      this.broadcastState();
    }

    if (this.cancelRequested) {
      this.status = 'stopped';
    } else {
      this.status = 'completed';
    }

    this.broadcastState();
  }

  _downloadItem(item, targetBase, targetSource) {
    return new Promise((resolve, reject) => {
      const args = [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', AUDIO_QUALITY ?? '320',
        '--output', `${targetBase}.%(ext)s`,
        '--windows-filenames',
        '--no-warnings',
        '--newline',
        '--postprocessor-args', 'FFmpegExtractAudio:-id3v2_version 3',
        targetSource
      ];

      if (FFMPEG_PATH && FFMPEG_PATH !== 'ffmpeg') {
        args.push('--ffmpeg-location', path.dirname(FFMPEG_PATH));
      }

      const child = spawn(YTDLP_PATH, args, { windowsHide: true });
      this.activeChildProcess = child;

      let stderr = '';

      child.stdout.on('data', chunk => {
        const text = chunk?.toString() ?? '';
        
        // Progress parsing
        const pctMatch = text.match(/(\d+(?:\.\d+)?)%/);
        if (pctMatch && pctMatch[1]) {
          item.progress = parseFloat(pctMatch[1]);
        }

        const speedMatch = text.match(/at\s+([\d.]+\w+\/s)/);
        if (speedMatch && speedMatch[1]) {
          item.speed = speedMatch[1];
        }

        const etaMatch = text.match(/ETA\s+([\d:]+)/);
        if (etaMatch && etaMatch[1]) {
          item.eta = etaMatch[1];
        }

        if (text.includes('[ExtractAudio]') || text.includes('[Fixup]')) {
          item.status = 'converting';
          item.progress = 99.0;
          item.speed = 'Converting to pure MP3...';
        }

        this.broadcastState();
      });

      child.stderr.on('data', chunk => {
        stderr += chunk?.toString() ?? '';
      });

      child.on('close', code => {
        this.activeChildProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      });

      child.on('error', err => {
        this.activeChildProcess = null;
        reject(err);
      });
    });
  }

  async _applyId3Tags(mp3Path, item) {
    if (!mp3Path || !fs.existsSync(mp3Path)) return;

    const tags = {
      title: item?.title ?? 'Unknown Title',
      artist: item?.uploader ?? 'Unknown Artist',
      album: this.playlistTitle || 'TuneForge Music',
    };

    if (item?.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
      try {
        const imgRes = await fetch(item.thumbnail);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          if (arrayBuffer && arrayBuffer.byteLength > 0) {
            const buffer = Buffer.from(arrayBuffer);
            tags.image = {
              mime: item.thumbnail.includes('.png') ? 'image/png' : 'image/jpeg',
              type: { id: 3, name: 'front cover' },
              description: 'Cover',
              imageBuffer: buffer
            };
          }
        }
      } catch {}
    }

    NodeID3.write(tags, mp3Path);
  }
}

export const manager = new DownloadManager();
