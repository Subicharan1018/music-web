/**
 * PlayerBar.jsx
 * Now-playing dock that uses the new music player widget.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import MusicPlayer from '../ui/music-player-widget';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23e6dcc4"/><circle cx="200" cy="200" r="120" fill="%23d3c6a5"/><circle cx="200" cy="200" r="18" fill="%23b9aa87"/></svg>';

export const PlayerBar = () => {
  const {
    queue,
    currentIndex,
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
  const lastIndexRef = useRef(currentIndex);

  const direction = currentIndex > lastIndexRef.current ? 'next' : currentIndex < lastIndexRef.current ? 'prev' : null;
  useEffect(() => {
    lastIndexRef.current = currentIndex;
  }, [currentIndex]);

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
      enableSmartShuffle(queue);
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

  return (
    <footer
      className="fixed bottom-0 left-0 w-full bg-transparent z-50 px-6 pb-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="max-w-5xl mx-auto">
        <MusicPlayer tracks={tracks} playerOverride={playerOverride} />
      </div>
    </footer>
  );
};
