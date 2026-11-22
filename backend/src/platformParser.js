const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

export function detectPlatform(url) {
  const l = (url || '').toLowerCase();
  if (l.includes('spotify.com')) return 'spotify';
  if (l.includes('music.apple.com')) return 'apple_music';
  if (l.includes('music.youtube.com')) return 'youtube_music';
  if (l.includes('youtube.com') || l.includes('youtu.be')) return 'youtube';
  return 'unknown';
}

export async function fetchSpotifyTracks(url) {
  let embedUrl = url.replace(/open\.spotify\.com\/(playlist|album|track)\//, 'open.spotify.com/embed/$1/');
  if (!embedUrl.includes('embed')) {
    const m = url.match(/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (m) embedUrl = `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  }

  const res = await fetch(embedUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`Spotify request failed: HTTP ${res.status}`);
  const html = await res.text();

  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m) throw new Error('Could not parse Spotify playlist structure.');

  const data = JSON.parse(m[1]);
  const pageProps = data?.props?.pageProps || {};
  const stateData = pageProps?.state?.data || {};
  const entity = stateData?.entity || {};

  const title = entity.title || entity.name || 'Spotify Playlist';
  let coverArt = '';
  const visual = entity.visualIdentity?.image || [];
  if (visual.length > 0) {
    coverArt = visual[0].url || '';
  }

  let rawTracks = entity.trackList || [];
  if (rawTracks.length === 0 && entity.type === 'track') {
    rawTracks = [entity];
  }

  const items = rawTracks.map((t, idx) => {
    const trackTitle = t.title || t.name || `Track ${idx + 1}`;
    let subtitle = t.subtitle || '';
    if (!subtitle && Array.isArray(t.artists)) {
      subtitle = t.artists.map(a => a.name).filter(Boolean).join(', ');
    }
    if (!subtitle) subtitle = 'Unknown Artist';

    const durationMs = t.duration || 0;
    const durationSec = durationMs > 1000 ? Math.floor(durationMs / 1000) : durationMs;
    const searchQuery = `ytsearch1:${subtitle} - ${trackTitle} audio`;

    return {
      id: `sp_${idx + 1}`,
      title: trackTitle,
      uploader: subtitle,
      duration: durationSec,
      thumbnail: coverArt,
      search_query: searchQuery,
      source_platform: 'spotify'
    };
  });

  return {
    title,
    platform: 'spotify',
    items
  };
}

export async function fetchAppleMusicTracks(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Apple Music request failed: HTTP ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1] : 'Apple Music Playlist';
  const cleanTitle = rawTitle.replace(/\s*-\s*(Playlist|Album)\s*-\s*Apple Music.*$/i, '').replace(/^[‎\s]+|[‎\s]+$/g, '');

  const scripts = [...html.matchAll(/<script[^>]*>(.*?)<\/script>/gs)].map(m => m[1]);
  if (!scripts.length) throw new Error('Could not parse Apple Music page structure.');

  const foundTracks = [];
  function extractTracks(obj, depth = 0) {
    if (depth > 10 || !obj) return;
    if (typeof obj === 'object') {
      if (obj.title && (obj.artistName || obj.subtitle)) {
        foundTracks.push(obj);
        return;
      }
      for (const val of Object.values(obj)) {
        extractTracks(val, depth + 1);
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        extractTracks(item, depth + 1);
      }
    }
  }

  for (const s of scripts) {
    if (s.length > 20000) {
      try {
        const parsed = JSON.parse(s.trim());
        extractTracks(parsed);
        if (foundTracks.length > 0) break;
      } catch {}
    }
  }

  if (foundTracks.length > 0) {
    const items = foundTracks.map((t, idx) => {
      const trackTitle = t.title || `Track ${idx + 1}`;
      const artist = t.artistName || t.subtitle || 'Unknown Artist';
      let durationSec = 0;
      if (t.duration) {
        durationSec = parseInt(t.duration, 10) || 0;
      }
      const searchQuery = `ytsearch1:${artist} - ${trackTitle} audio`;

      return {
        id: `am_${idx + 1}`,
        title: trackTitle,
        uploader: artist,
        duration: durationSec,
        thumbnail: '',
        search_query: searchQuery,
        source_platform: 'apple_music'
      };
    });

    return {
      title: cleanTitle,
      platform: 'apple_music',
      items
    };
  }

  // Fallback: Schema script (Script 0)
  try {
    const schemaData = JSON.parse(scripts[0].trim());
    const rawTrackList = schemaData.track || [];
    const items = rawTrackList.map((t, idx) => {
      const name = t.name || `Track ${idx + 1}`;
      const searchQuery = `ytsearch1:${name} audio`;
      return {
        id: `am_${idx + 1}`,
        title: name,
        uploader: 'Apple Music',
        duration: 0,
        thumbnail: t.audio?.thumbnailUrl || '',
        search_query: searchQuery,
        source_platform: 'apple_music'
      };
    });

    return {
      title: cleanTitle,
      platform: 'apple_music',
      items
    };
  } catch {
    throw new Error('Could not extract tracks from Apple Music page.');
  }
}
