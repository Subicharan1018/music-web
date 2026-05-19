/**
 * PlayerBar.jsx
 * Now-playing dock that uses the new music player widget.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import MusicPlayer from '../ui/music-player-widget';
import { useUIStore } from '../../store/uiStore';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23e6dcc4"/><circle cx="200" cy="200" r="120" fill="%23d3c6a5"/><circle cx="200" cy="200" r="18" fill="%23b9aa87"/></svg>';

export const PlayerBar = () => {
  const {
    queue,
    currentIndex,
    currentSong,
    isPlaying,
    position,
    duration,
    play,
    pause,
    next,
    prev,
    seek,
    shuffleMode,
    enableSmartShuffle,
    enableDumbShuffle,
    disableShuffle,
    repeatMode,
    setRepeatMode
  } = usePlayer();

  const client = useSubsonic();
  const { nowPlayingExpanded, setNowPlayingExpanded } = useUIStore();
  const lastIndexRef = useRef(currentIndex);
  const [isMobile, setIsMobile] = useState(false);

  const direction = currentIndex > lastIndexRef.current ? 'next' : currentIndex < lastIndexRef.current ? 'prev' : null;
  useEffect(() => {
    lastIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(!!query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const tracks = useMemo(() => {
    if (!queue.length) {
      return [{ title: 'No track selected', artist: '—', cover: FALLBACK_COVER, src: '' }];
    }
    return queue.map((song) => ({
      title: song.title,
      artist: song.artist,
      cover: client ? client.getCoverArtUrl(song.coverArt, 600) : FALLBACK_COVER,
      src: ''
    }));
  }, [queue, client]);

  const safeIndex = Math.max(0, Math.min(currentIndex, tracks.length - 1));
  const loopMode = repeatMode === 'none' ? 'off' : repeatMode;

  const toggleShuffle = () => {
    if (shuffleMode === 'none') {
      enableDumbShuffle();
    } else if (shuffleMode === 'dumb') {
      void enableSmartShuffle(queue);
    } else {
      disableShuffle();
    }
  };

  const cycleLoop = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const playerOverride = useMemo(() => ({
    state: {
      currentIndex: safeIndex,
      shuffled: shuffleMode !== 'none',
      loopMode,
      isPlaying,
      direction
    },
    currentTrack: tracks[safeIndex],
    currentTime: position,
    duration,
    toggle: isPlaying ? pause : play,
    next,
    prev,
    seek: (pct) => {
      if (!duration) return;
      seek(pct * duration);
    },
    seekBy: (delta) => {
      if (!duration) return;
      seek(Math.max(0, Math.min(duration, position + delta)));
    },
    toggleShuffle,
    cycleLoop,
    getFrequencyData: null
  }), [safeIndex, shuffleMode, loopMode, isPlaying, direction, tracks, position, duration, pause, play, next, prev, seek]);

  const openOverlay = () => setNowPlayingExpanded(true);

  if (isMobile) {
    const mobileCover = currentSong?.coverArt ? client?.getCoverArtUrl(currentSong.coverArt, 80) : FALLBACK_COVER;
    return (
      <footer
        className={`fixed bottom-0 left-0 w-full bg-transparent z-[70] px-4 pb-4 transition-opacity ${
          nowPlayingExpanded ? 'opacity-50' : 'opacity-100'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openOverlay}
          onKeyDown={(event) => {
            if (event.key === 'Enter') openOverlay();
          }}
          className="w-full bg-paper/90 backdrop-blur-md border border-ink/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
        >
          <div className="w-10 h-10 rounded-md overflow-hidden bg-ink/10 flex-shrink-0">
            <img src={mobileCover} alt={currentSong?.title || 'Album cover'} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-serif text-sm text-ink truncate">{currentSong?.title || 'No track selected'}</div>
            <div className="font-sans text-xs text-ink-mute truncate">{currentSong?.artist || '—'}</div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              isPlaying ? pause() : play();
            }}
            className="w-9 h-9 rounded-full bg-ink text-paper text-xs flex items-center justify-center"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`fixed bottom-0 left-0 w-full bg-transparent z-[70] px-6 pb-4 transition-opacity ${
        nowPlayingExpanded ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="max-w-5xl mx-auto">
        <MusicPlayer tracks={tracks} playerOverride={playerOverride} onExpand={openOverlay} />
      </div>
    </footer>
  );
};
