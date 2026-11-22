import React, { useState, useMemo } from 'react';
import { 
  Music, 
  FolderOpen, 
  DownloadCloud, 
  StopCircle, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Car, 
  Link2, 
  X, 
  Sparkles, 
  Headphones,
  Download,
  Archive
} from 'lucide-react';
import {
  useGetStateQuery,
  useGetFolderInfoQuery,
  useExtractUrlMutation,
  useStartQueueMutation,
  useStopQueueMutation,
  useOpenFolderMutation
} from './store/apiSlice.js';

// Genuine Brand Vector Icons
const YouTubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const YouTubeMusicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.144c-3.94 0-7.144-3.204-7.144-7.144 0-3.94 3.204-7.144 7.144-7.144 3.94 0 7.144 3.204 7.144 7.144 0 3.94-3.204 7.144-7.144 7.144zm0-11.43c-2.364 0-4.286 1.922-4.286 4.286 0 2.364 1.922 4.286 4.286 4.286 2.364 0 4.286-1.922 4.286-4.286 0-2.364-1.922-4.286-4.286-4.286zm-1.714 6V9.43l3.428 1.714-3.428 1.714z"/>
  </svg>
);

const SpotifyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.67-.82 1.12-1.95 1-3.08-.96.04-2.13.64-2.82 1.45-.6.7-.1.14-1.84 1.13-2.98.05 1.19 1.19 2.27 1.82 2.61"/>
  </svg>
);

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: YouTubeIcon, color: '#ef4444' },
  { id: 'youtube_music', name: 'YT Music', icon: YouTubeMusicIcon, color: '#f43f5e' },
  { id: 'spotify', name: 'Spotify', icon: SpotifyIcon, color: '#10b981' },
  { id: 'apple_music', name: 'Apple Music', icon: AppleMusicIcon, color: '#ec4899' }
];

export default function App() {
  const [url, setUrl] = useState('');
  const [submitError, setSubmitError] = useState(null);

  // RTK Query hooks
  const { data: queueState } = useGetStateQuery(undefined, {
    pollingInterval: 0
  });
  const { data: folderInfo, refetch: refetchFolder } = useGetFolderInfoQuery();

  const [extractUrl, { isLoading: isExtracting }] = useExtractUrlMutation();
  const [startQueue] = useStartQueueMutation();
  const [stopQueue] = useStopQueueMutation();
  const [openFolder] = useOpenFolderMutation();

  // Defensive null-checked state access
  const safeStatus = queueState?.status ?? 'idle';
  const safeItems = Array.isArray(queueState?.items) ? queueState.items : [];
  const safeTotal = typeof queueState?.total_count === 'number' ? queueState.total_count : safeItems.length;
  const safeCompleted = typeof queueState?.completed_count === 'number' ? queueState.completed_count : 0;
  const safePlatform = queueState?.platform ?? 'youtube';
  const safeIndex = typeof queueState?.current_index === 'number' ? queueState.current_index : -1;
  const safeActiveItem = (safeIndex >= 0 && safeIndex < safeItems.length) ? safeItems[safeIndex] : null;

  const percent = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  // Real-time live platform detection
  const liveDetectedPlatform = useMemo(() => {
    const trimmed = (url ?? '').trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.includes('spotify.com')) return 'spotify';
    if (trimmed.includes('music.apple.com')) return 'apple_music';
    if (trimmed.includes('music.youtube.com')) return 'youtube_music';
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) return 'youtube';
    return 'unknown';
  }, [url]);

  const activePlatObj = useMemo(() => {
    return PLATFORMS.find((p) => p.id === safePlatform) ?? PLATFORMS[0];
  }, [safePlatform]);

  const handleStart = async (e) => {
    e?.preventDefault?.();
    const cleanUrl = (url ?? '').trim();
    if (!cleanUrl) return;

    setSubmitError(null);

    try {
      await extractUrl(cleanUrl).unwrap();
      await startQueue().unwrap();
      refetchFolder();
    } catch (err) {
      const errMsg = err?.data?.detail ?? err?.error ?? err?.message ?? 'Failed to process link';
      setSubmitError(errMsg);
    }
  };

  const handleStop = async () => {
    try {
      await stopQueue().unwrap();
    } catch (err) {
      console.warn('[TuneForge] Stop queue failed:', err);
    }
  };

  const handleResume = async () => {
    try {
      await startQueue().unwrap();
    } catch (err) {
      console.warn('[TuneForge] Resume queue failed:', err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await openFolder().unwrap();
    } catch (err) {
      alert(`Could not open folder on host: ${err?.data?.detail ?? err?.message ?? 'Unknown error'}`);
    }
  };

  const formatDuration = (seconds) => {
    const secNum = Number(seconds);
    if (!Number.isFinite(secNum) || secNum <= 0) return '--:--';
    const mins = Math.floor(secNum / 60);
    const secs = Math.floor(secNum % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isDownloading = safeStatus === 'downloading';
  const isStopped = safeStatus === 'stopped';
  const isCompleted = safeStatus === 'completed';

  return (
    <div className="app-shell">
      {/* Subtle Gradient Atmosphere */}
      <div className="ambient-glow" />

      <div className="container">
        {/* Navigation / Header */}
        <header className="header">
          <div className="brand">
            <div className="brand-icon-wrapper">
              <Music className="brand-icon" size={24} />
            </div>
            <div>
              <div className="brand-title-row">
                <h1 className="brand-title">TuneForge</h1>
                <span className="car-tag">
                  <Car size={13} /> Car USB & Mobile
                </span>
              </div>
              <p className="brand-subtitle">High-fidelity 320kbps MP3 downloader for iPhone, iPad & Android</p>
            </div>
          </div>

          <div className="header-actions">
            {/* If there are completed files, show download all zip button */}
            {safeCompleted > 0 && (
              <a 
                href="/api/download-zip" 
                download 
                className="btn btn-zip"
                title="Download all completed songs as a ZIP file"
              >
                <Archive size={17} />
                <span>Download ZIP ({safeCompleted})</span>
              </a>
            )}

            <button 
              type="button" 
              className="btn btn-folder" 
              onClick={handleOpenFolder}
              title={folderInfo?.path ?? 'Open destination folder on PC'}
            >
              <FolderOpen size={17} />
              <span className="folder-btn-text">PC Folder</span>
              <span className="folder-count-badge">
                {folderInfo?.file_count ?? 0}
              </span>
            </button>
          </div>
        </header>

        {/* Platform Strip */}
        <section className="platform-strip">
          <span className="platform-strip-label">Supported Sources</span>
          <div className="platform-badges-row">
            {PLATFORMS.map((plat) => {
              const Icon = plat.icon;
              const isDetected = liveDetectedPlatform === plat.id;
              const isCurrentActive = safeItems.length > 0 && safePlatform === plat.id;
              
              return (
                <div 
                  key={plat.id}
                  className={`platform-badge-pill ${isDetected ? 'is-detected' : ''} ${isCurrentActive ? 'is-active' : ''}`}
                  style={{ '--brand-color': plat.color }}
                >
                  <span className="platform-icon-wrap" style={{ color: plat.color }}>
                    <Icon />
                  </span>
                  <span className="platform-label">{plat.name}</span>
                  {isDetected && (
                    <span className="detected-chip">
                      <Sparkles size={11} /> Detected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Hero Search Bar */}
        <section className="hero-card">
          <form onSubmit={handleStart}>
            <div className="search-bar-wrap">
              <div className="search-icon-box">
                <Link2 size={20} className="search-icon" />
              </div>
              
              <input 
                type="text" 
                className="search-input" 
                placeholder="Paste YouTube, YouTube Music, Spotify, or Apple Music link..." 
                value={url}
                onChange={(e) => setUrl(e?.target?.value ?? '')}
                disabled={isExtracting || isDownloading}
              />

              {url && !isExtracting && !isDownloading && (
                <button 
                  type="button" 
                  className="clear-btn" 
                  onClick={() => setUrl('')}
                  title="Clear input"
                >
                  <X size={16} />
                </button>
              )}

              {isDownloading ? (
                <button 
                  type="button" 
                  className="btn-action btn-stop" 
                  onClick={handleStop}
                >
                  <StopCircle size={18} />
                  <span>Stop</span>
                </button>
              ) : isStopped && safeItems.length > 0 ? (
                <button 
                  type="button" 
                  className="btn-action btn-resume" 
                  onClick={handleResume}
                >
                  <Play size={18} />
                  <span>Resume</span>
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn-action btn-download" 
                  disabled={isExtracting || !(url ?? '').trim()}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={18} />
                      <span>Download</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Micro-Features Row */}
          <div className="feature-row">
            <span className="feature-item">
              <span className="feature-dot" /> Genuine 320kbps MP3
            </span>
            <span className="feature-item">
              <span className="feature-dot" /> Mobile Direct ZIP & MP3 Download
            </span>
            <span className="feature-item">
              <span className="feature-dot" /> ID3v2.3 Car Dashboard Tags
            </span>
          </div>

          {(submitError || queueState?.error_message) && (
            <div className="error-alert">
              <AlertCircle size={17} />
              <span>{submitError ?? queueState?.error_message}</span>
            </div>
          )}
        </section>

        {/* Active Player / Progress Dashboard */}
        {safeItems.length > 0 && (
          <section className="dashboard-card">
            <div className="dashboard-top">
              <div className="dashboard-info">
                <div className="dashboard-badge-row">
                  <span 
                    className="brand-chip" 
                    style={{ 
                      color: activePlatObj?.color ?? '#2563eb', 
                      background: `${activePlatObj?.color ?? '#2563eb'}14`, 
                      border: `1px solid ${activePlatObj?.color ?? '#2563eb'}35` 
                    }}
                  >
                    {activePlatObj?.name ?? 'Audio'}
                  </span>
                  <span className={`status-pill status-${safeStatus}`}>
                    {isDownloading 
                      ? 'Downloading One by One' 
                      : isCompleted 
                        ? 'All Finished' 
                        : safeStatus}
                  </span>
                </div>
                <h2 className="dashboard-title">
                  {queueState?.playlist_title || 'Audio Queue'}
                </h2>
              </div>

              <div className="dashboard-stats-box">
                <span className="stats-number">
                  {safeCompleted} <span className="stats-divider">/</span> {safeTotal}
                </span>
                <span className="stats-label">Completed ({percent}%)</span>
              </div>
            </div>

            {/* Glowing Gradient Progress Bar */}
            <div className="progress-track">
              <div 
                className="progress-fill" 
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="dashboard-bottom">
              <div className="now-playing-snippet">
                {safeActiveItem && isDownloading ? (
                  <div className="active-track-preview">
                    {safeActiveItem?.thumbnail ? (
                      <img src={safeActiveItem.thumbnail} alt="" className="active-thumb-img" />
                    ) : (
                      <div className="active-thumb-placeholder"><Music size={14} /></div>
                    )}
                    <div className="active-text-details">
                      <span className="active-song-name">
                        {safeActiveItem?.clean_title ?? safeActiveItem?.title ?? 'Processing song...'}
                      </span>
                      <span className="active-sub-meta">
                        {(safeActiveItem?.progress ?? 0) > 0 && `${Math.round(safeActiveItem.progress)}%`}
                        {safeActiveItem?.speed ? ` • ${safeActiveItem.speed}` : ''}
                        {safeActiveItem?.eta ? ` • ETA ${safeActiveItem.eta}` : ''}
                      </span>
                    </div>
                  </div>
                ) : isCompleted ? (
                  <div className="all-done-box">
                    <span className="all-done-note">
                      ✓ All tracks ready as pure 320k MP3! Tap "Download ZIP" to save to your iPhone/iPad/Android.
                    </span>
                    <a href="/api/download-zip" download className="btn-save-mobile">
                      <Archive size={16} /> Save All ({safeCompleted} MP3s)
                    </a>
                  </div>
                ) : (
                  <span className="destination-note">
                    Destination: {folderInfo?.path ?? queueState?.output_dir ?? 'Downloads/TuneForge'}
                  </span>
                )}
              </div>

              {isDownloading && (
                <button 
                  type="button" 
                  className="pause-link-btn" 
                  onClick={handleStop}
                >
                  <StopCircle size={15} /> Pause
                </button>
              )}
            </div>
          </section>
        )}

        {/* Track List Section */}
        <section className="list-card">
          {safeItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-ring">
                <Headphones size={28} />
              </div>
              <h3 className="empty-title">Your Queue is Empty</h3>
              <p className="empty-desc">
                Paste any song or playlist from <strong>YouTube</strong>, <strong>YouTube Music</strong>, <strong>Spotify</strong>, or <strong>Apple Music</strong> above.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="tracks-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '56px' }}></th>
                    <th>Track Title & Artist</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Length</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Status</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Save</th>
                  </tr>
                </thead>
                <tbody>
                  {safeItems.map((item, index) => {
                    const isCurrentlyActive = index === safeIndex && isDownloading;
                    const itemStatus = item?.status ?? 'queued';
                    const itemProgress = item?.progress ?? 0;
                    const isFinished = itemStatus === 'completed';

                    return (
                      <tr key={item?.id ?? index} className={isCurrentlyActive ? 'row-active' : ''}>
                        <td className="cell-num">{index + 1}</td>
                        <td className="cell-thumb">
                          {item?.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="table-thumb" />
                          ) : (
                            <div className="table-thumb-fallback">
                              <Music size={14} />
                            </div>
                          )}
                        </td>
                        <td className="cell-title">
                          <div className="track-title-text" title={item?.title ?? ''}>
                            {item?.title ?? `Track ${index + 1}`}
                          </div>
                          <div className="track-artist-text">
                            {item?.uploader ?? 'Unknown Artist'}
                          </div>
                        </td>
                        <td className="cell-duration">
                          {formatDuration(item?.duration)}
                        </td>
                        <td className="cell-status">
                          {isFinished && (
                            <span className="status-badge badge-done">
                              <CheckCircle2 size={13} />
                              <span>Done</span>
                            </span>
                          )}
                          {(itemStatus === 'downloading' || itemStatus === 'converting') && (
                            <span className="status-badge badge-active">
                              <Loader2 size={13} className="spinner" />
                              <span>
                                {itemStatus === 'converting' ? 'Converting' : `${Math.round(itemProgress)}%`}
                              </span>
                            </span>
                          )}
                          {itemStatus === 'queued' && (
                            <span className="status-badge badge-queued">
                              <Clock size={13} />
                              <span>Queued</span>
                            </span>
                          )}
                          {itemStatus === 'failed' && (
                            <span className="status-badge badge-failed" title={item?.error ?? 'Failed'}>
                              <AlertCircle size={13} />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                        <td className="cell-download-action">
                          {isFinished ? (
                            <a 
                              href={`/api/download-file?file=${encodeURIComponent((item?.clean_title || 'track') + '.mp3')}`} 
                              download 
                              className="btn-track-dl"
                              title="Download MP3 directly to your device"
                            >
                              <Download size={15} />
                            </a>
                          ) : (
                            <span className="cell-dl-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
