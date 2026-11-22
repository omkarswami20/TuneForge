import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');

// Downloads directory
export function getDownloadsDir() {
  const custom = process.env.TUNFORGE_DOWNLOADS_DIR;
  if (custom) {
    try {
      if (!fs.existsSync(custom)) fs.mkdirSync(custom, { recursive: true });
      return custom;
    } catch {}
  }

  const userDl = path.join(os.homedir(), 'Downloads', 'TuneForge');
  try {
    if (!fs.existsSync(userDl)) fs.mkdirSync(userDl, { recursive: true });
    return userDl;
  } catch {}

  const tempDl = path.join(os.tmpdir(), 'TuneForge');
  try {
    if (!fs.existsSync(tempDl)) fs.mkdirSync(tempDl, { recursive: true });
    return tempDl;
  } catch {
    return os.tmpdir();
  }
}

export const DOWNLOADS_DIR = getDownloadsDir();

// Locate yt-dlp binary
export function findYtDlpBin() {
  const custom = process.env.YTDLP_PATH;
  if (custom && fs.existsSync(custom)) return custom;

  const pythonScript = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'yt-dlp.exe');
  if (fs.existsSync(pythonScript)) return pythonScript;

  // Check PATH
  return 'yt-dlp';
}

export const YTDLP_PATH = findYtDlpBin();

// Locate FFmpeg binary
export function findFFmpegBin() {
  const custom = process.env.FFMPEG_PATH;
  if (custom && fs.existsSync(custom)) return custom;

  const wingetDir = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(wingetDir)) {
    try {
      const entries = fs.readdirSync(wingetDir);
      for (const entry of entries) {
        if (entry.includes('FFmpeg')) {
          const subDir = path.join(wingetDir, entry);
          const subEntries = fs.readdirSync(subDir);
          for (const s of subEntries) {
            const candidate = path.join(subDir, s, 'bin', 'ffmpeg.exe');
            if (fs.existsSync(candidate)) {
              return candidate;
            }
          }
        }
      }
    } catch {}
  }

  return 'ffmpeg';
}

export const FFMPEG_PATH = findFFmpegBin();
export const AUDIO_QUALITY = '320';
export const HOST = '127.0.0.1';
export const PORT = 8000;
