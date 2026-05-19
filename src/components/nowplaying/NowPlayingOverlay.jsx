/**
 * NowPlayingOverlay.jsx
 * Full-screen now playing view with lyrics and controls.
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, HeartOff, Repeat, Shuffle, X } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useLyrics } from '../../hooks/useLyrics';
import { ProgressBar } from '../player/ProgressBar';
import { VolumeSlider } from '../player/VolumeSlider';
import { AddToPlaylistDialog } from '../playlists/AddToPlaylistDialog';
import { FluidBackground } from './FluidBackground';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23e6dcc4"/><circle cx="200" cy="200" r="120" fill="%23d3c6a5"/><circle cx="200" cy="200" r="18" fill="%23b9aa87"/></svg>';

export const NowPlayingOverlay = () => {
  const { nowPlayingExpanded, setNowPlayingExpanded } = useUIStore();
  const client = useSubsonic();
  const {
    currentSong,
    isPlaying,
    position,
    queue,
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

  const { toggleStarSong, isSongStarred } = useLibraryStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { lines, currentLineIndex, isSynced, isLoading, error, handleScroll, registerLineRef } = useLyrics(
    currentSong,
    (position || 0) * 1000
  );

  const coverUrl = useMemo(() => {
    if (!client || !currentSong?.coverArt) return FALLBACK_COVER;
    return client.getCoverArtUrl(currentSong.coverArt, 600);
  }, [client, currentSong]);

  const isStarred = currentSong ? isSongStarred(currentSong.id) : false;
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

  const closeOverlay = () => setNowPlayingExpanded(false);

  useEffect(() => {
    if (!nowPlayingExpanded) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nowPlayingExpanded]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        nowPlayingExpanded ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
      }`}
      aria-hidden={!nowPlayingExpanded}
    >
      <div className="absolute inset-0" onClick={closeOverlay}>
        <FluidBackground song={currentSong} />
      </div>

      <div className="relative z-10 h-full w-full px-6 sm:px-10 pb-24 pt-20" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={closeOverlay}
          className="absolute top-6 right-6 text-paper/70 hover:text-paper transition-colors"
          aria-label="Close now playing"
        >
          <X size={26} />
        </button>

        <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
          <section className="flex flex-col gap-6">
            <div className="flex flex-col items-center lg:items-start gap-6">
              <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden bg-ink/20">
                <img
                  src={coverUrl}
                  alt={currentSong?.title || 'Album cover'}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="text-center lg:text-left">
                <h1 className="font-serif text-4xl italic text-paper leading-tight">
                  {currentSong?.title || 'No track selected'}
                </h1>
                <div className="font-sans text-lg text-paper/70">
                  {currentSong?.artist || '—'}
                </div>
                <div className="font-mono text-sm text-paper/50 mt-1">
                  {currentSong?.album ? currentSong.album : 'Unknown album'}
                  {currentSong?.year ? ` · ${currentSong.year}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-6">
              <button
                type="button"
                onClick={prev}
                className="text-paper/70 hover:text-paper transition-colors"
                aria-label="Previous track"
              >
                <ChevronLeft size={30} />
              </button>
              <button
                type="button"
                onClick={isPlaying ? pause : play}
                className="w-14 h-14 rounded-full bg-paper/90 text-ink hover:bg-paper transition-colors flex items-center justify-center"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                onClick={next}
                className="text-paper/70 hover:text-paper transition-colors"
                aria-label="Next track"
              >
                <ChevronRight size={30} />
              </button>
            </div>

            <div className="bg-paper/10 border border-paper/10 rounded-xl px-4 py-3">
              <ProgressBar />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <VolumeSlider className="text-paper" />
              <button
                type="button"
                onClick={toggleShuffle}
                className={`flex items-center gap-2 text-sm font-sans ${
                  shuffleMode === 'none' ? 'text-paper/60' : 'text-paper'
                }`}
              >
                <Shuffle size={18} />
                Shuffle
              </button>
              <button
                type="button"
                onClick={cycleLoop}
                className={`flex items-center gap-2 text-sm font-sans ${
                  loopMode === 'off' ? 'text-paper/60' : 'text-paper'
                }`}
              >
                <Repeat size={18} />
                Repeat
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (!client || !currentSong) return;
                  toggleStarSong(client, currentSong);
                }}
                className="flex items-center gap-2 text-paper/70 hover:text-paper transition-colors"
                disabled={!currentSong}
              >
                {isStarred ? <HeartOff size={18} /> : <Heart size={18} />}
                {isStarred ? 'Unfavorite' : 'Favorite'}
              </button>

              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 rounded-full bg-paper/90 text-ink text-sm font-sans hover:bg-paper transition-colors"
                disabled={!currentSong}
              >
                Add to playlist
              </button>
            </div>
          </section>

          <section className="flex flex-col bg-ink/20 border border-paper/10 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl text-paper">Lyrics</h2>
              {isSynced ? (
                <span className="text-paper/50 text-xs font-mono">Synced</span>
              ) : null}
            </div>

            <div
              className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pr-2"
              onScroll={handleScroll}
            >
              {isLoading ? (
                <div className="flex flex-col gap-3">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="h-5 w-3/4 rounded bg-paper/10 animate-shimmer" />
                  ))}
                </div>
              ) : error ? (
                <div className="font-serif italic text-paper/40 text-center">{error}</div>
              ) : lines.length === 0 ? (
                <div className="font-serif italic text-paper/30 text-center">No lyrics available</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {lines.map((line, index) => {
                    const isCurrent = isSynced && index === currentLineIndex;
                    const isPast = isSynced && currentLineIndex !== -1 && index < currentLineIndex;
                    const isFuture = isSynced && currentLineIndex !== -1 && index > currentLineIndex;
                    const textClass = isCurrent
                      ? 'text-paper text-xl font-semibold scale-105'
                      : isPast
                        ? 'text-paper/30 text-base'
                        : isFuture
                          ? 'text-paper/50 text-base'
                          : 'text-paper/70 text-base';

                    return (
                      <button
                        key={`${line.time || 'plain'}-${index}`}
                        type="button"
                        ref={registerLineRef(index)}
                        onClick={() => {
                          if (line.time == null) return;
                          const seconds = line.time / 1000;
                          if (!Number.isNaN(seconds)) {
                            const target = Math.max(0, seconds);
                            seek(target);
                          }
                        }}
                        className={`text-left transition-all duration-300 origin-left ${textClass}`}
                        data-line-index={index}
                        disabled={line.time == null}
                      >
                        {line.text || ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AddToPlaylistDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        songsToAdd={currentSong ? [currentSong] : []}
      />
    </div>
  );
};
