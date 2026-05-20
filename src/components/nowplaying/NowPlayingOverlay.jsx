/**
 * NowPlayingOverlay.jsx
 * Full-screen now playing view. Phase 6.5 redesign — luxury editorial direction.
 *
 * Skill directives applied (frontend-design SKILL.md):
 *   - Bold direction: luxury editorial — tactile, material, physical
 *   - Differentiation: SVG vinyl groove ring with CSS animation-play-state
 *   - Typography: Atelier Zero serif/mono — non-generic, already distinctive
 *   - Motion: ONE orchestrated GSAP stagger on open only (not on song change)
 *   - Spatial: two-column asymmetric desktop, stacked mobile
 *   - Depth: FluidBackground as atmosphere + bg-ink/50 dark overlay + bottom gradient
 */

import { useEffect, useMemo, useState, useRef } from 'react';
import { SkipBack, SkipForward, Play, Pause, Heart, HeartOff, Repeat, X } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useLyrics } from '../../hooks/useLyrics';
import { ProgressBar } from '../player/ProgressBar';
import { VolumeSlider } from '../player/VolumeSlider';
import { AddToPlaylistDialog } from '../playlists/AddToPlaylistDialog';
import { FluidBackground } from './FluidBackground';
import { AIShuffleButton } from '../shared/AIShuffleButton';
import { gsap } from '../../lib/gsap';
import { useAIShuffleStore } from '../../store/aiShuffleStore';
import { useServerHealth } from '../../hooks/useServerHealth';
import { startedAtFormatted } from '../../services/ShuffleApiService';
import { usePlayerStore } from '../../store/playerStore';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23e6dcc4"/><circle cx="200" cy="200" r="120" fill="%23d3c6a5"/><circle cx="200" cy="200" r="18" fill="%23b9aa87"/></svg>';

// ── VinylRing ─────────────────────────────────────────────────────────────────
// Positioned behind the album art. CSS vinyl-spin class from index.css.
// z-0 behind img (z-10). prefers-reduced-motion handled in CSS.
const VinylRing = ({ isPlaying }) => (
  <div
    className={`vinyl-spin absolute inset-[-28px] rounded-full pointer-events-none select-none ${isPlaying ? '' : 'paused'}`}
    aria-hidden="true"
  >
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Groove rings */}
      {[180, 166, 152, 138, 124, 110].map((r) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="rgba(239,231,210,0.06)" strokeWidth="1" />
      ))}
      {/* Outer label ring */}
      <circle cx="200" cy="200" r="188" fill="none" stroke="rgba(239,231,210,0.10)" strokeWidth="2" />
      {/* Inner spindle hole hint */}
      <circle cx="200" cy="200" r="16" fill="rgba(21,20,15,0.4)" />
      <circle cx="200" cy="200" r="5" fill="rgba(239,231,210,0.15)" />
    </svg>
  </div>
);

// ── NowPlayingOverlay ─────────────────────────────────────────────────────────
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
    shuffleMode,
    enableSmartShuffle,
    enableDumbShuffle,
    disableShuffle,
    repeatMode,
    setRepeatMode,
  } = usePlayer();

  const queueSource    = usePlayerStore((s) => s.queueSource);
  const { toggleStarSong, isSongStarred } = useLibraryStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // AI shuffle server
  const { isConfigured, isHealthy, health } = useServerHealth();
  const sessionStatus   = useAIShuffleStore((s) => s.sessionStatus);
  const resetSession    = useAIShuffleStore((s) => s.resetSession);

  const { lines, currentLineIndex, isSynced, isLoading: lyricsLoading, error: lyricsError, handleScroll, registerLineRef } = useLyrics(
    currentSong,
    (position || 0) * 1000
  );

  const coverUrl = useMemo(() => {
    if (!client || !currentSong?.coverArt) return FALLBACK_COVER;
    return client.getCoverArtUrl(currentSong.coverArt, 600);
  }, [client, currentSong]);

  const isStarred = currentSong ? isSongStarred(currentSong.id) : false;
  const loopMode  = repeatMode === 'none' ? 'off' : repeatMode;

  const toggleShuffle = () => {
    if (shuffleMode === 'none')  enableDumbShuffle();
    else if (shuffleMode === 'dumb') void enableSmartShuffle(queue);
    else disableShuffle();
  };

  const cycleLoop = () => {
    if (repeatMode === 'none')  setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const closeOverlay = () => setNowPlayingExpanded(false);

  // Keyboard shortcut
  useEffect(() => {
    if (!nowPlayingExpanded) return;
    const onKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nowPlayingExpanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // GSAP stagger — fires on `nowPlayingExpanded` change ONLY.
  // Intentionally NOT in [nowPlayingExpanded, currentSong?.id]: animating on
  // song change while the overlay is open would be jarring.
  const containerRef = useRef(null);
  useEffect(() => {
    if (!nowPlayingExpanded || !containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.np-reveal',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [nowPlayingExpanded]); // intentionally dep on expand only

  // Handle session reset — refetch immediately after reset
  const handleResetSession = async () => {
    await resetSession(currentSong?.title);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[60] transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        nowPlayingExpanded ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
      }`}
      aria-hidden={!nowPlayingExpanded}
    >
      {/* Fluid background — click to close */}
      <div className="absolute inset-0" onClick={closeOverlay}>
        <FluidBackground song={currentSong} />
      </div>

      {/* Server health strip — desktop only (hidden md:flex avoids mobile overlap with close btn) */}
      {isConfigured && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 font-mono text-[9px] text-paper/30 uppercase tracking-[0.15em] z-20 pointer-events-none">
          <span className={`w-1 h-1 rounded-full ${isHealthy ? 'bg-paper/50' : 'bg-coral/60'}`} />
          {isHealthy
            ? `AI SERVER · ONLINE${health?.librarySize ? ` · ${health.librarySize.toLocaleString()} SONGS` : ''}`
            : 'AI SERVER · OFFLINE'}
        </div>
      )}

      {/* Mobile health dot (small, top-center, no text) */}
      {isConfigured && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex md:hidden items-center z-20 pointer-events-none">
          <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-green-400/60' : 'bg-coral/60'}`} />
        </div>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={closeOverlay}
        className="absolute top-5 right-6 text-paper/60 hover:text-paper transition-colors z-20"
        aria-label="Close now playing"
      >
        <X size={24} />
      </button>

      {/* Content — stops click propagation so backdrop click still closes */}
      <div
        className="relative z-10 h-full w-full px-6 sm:px-10 pb-24 pt-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-12">

          {/* ── LEFT PANEL: art + controls ─────────────────────────────── */}
          <section className="flex flex-col gap-5 justify-center">

            {/* Album art with vinyl ring */}
            <div className="np-reveal flex justify-center lg:justify-start">
              <div className="relative w-[260px] h-[260px] lg:w-[300px] lg:h-[300px] flex-shrink-0">
                {/* Vinyl ring sits BEHIND art */}
                <VinylRing isPlaying={isPlaying} />
                {/* Album art — z-10 ensures it's above the vinyl ring */}
                <img
                  src={coverUrl}
                  alt={currentSong?.title || 'Album cover'}
                  className="relative z-10 w-full h-full object-cover rounded-2xl shadow-2xl"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* Song info */}
            <div className="np-reveal text-center lg:text-left">
              <h1 className="font-serif text-4xl italic text-paper leading-tight mb-1">
                {currentSong?.title || 'No track selected'}
              </h1>
              <div className="font-sans text-lg font-medium text-paper/70 mb-1">
                {currentSong?.artist || '—'}
              </div>

              {/* AI source label — between artist and album */}
              {queueSource === 'cold_start' && (
                <span className="font-mono text-[9px] text-coral/80 uppercase tracking-[0.2em] block mb-1">
                  AI · DISCOVERY
                </span>
              )}
              {queueSource === 'model' && (
                <span className="font-mono text-[9px] text-paper/40 uppercase tracking-[0.2em] block mb-1">
                  AI · RECOMMENDED
                </span>
              )}

              <div className="font-mono text-sm text-paper/50">
                {currentSong?.album || 'Unknown album'}
                {currentSong?.year ? ` · ${currentSong.year}` : ''}
              </div>
            </div>

            {/* Main controls */}
            <div className="np-reveal flex items-center justify-center lg:justify-start gap-7">
              <button
                type="button"
                onClick={prev}
                className="text-paper/70 hover:text-paper transition-colors"
                aria-label="Previous track"
              >
                <SkipBack size={28} />
              </button>
              <button
                type="button"
                onClick={isPlaying ? pause : play}
                className="w-16 h-16 rounded-full bg-paper/20 hover:bg-paper/30 transition-colors duration-150 flex items-center justify-center text-paper"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={next}
                className="text-paper/70 hover:text-paper transition-colors"
                aria-label="Next track"
              >
                <SkipForward size={28} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="np-reveal">
              <ProgressBar light />
            </div>

            {/* Secondary controls */}
            <div className="np-reveal flex flex-wrap items-center gap-5">
              <VolumeSlider className="text-paper" />
              <AIShuffleButton className="text-paper hover:text-paper" />
              <button
                type="button"
                onClick={cycleLoop}
                className={`flex items-center gap-2 text-sm font-sans transition-colors ${
                  loopMode === 'off' ? 'text-paper/50 hover:text-paper/80' : 'text-paper'
                }`}
              >
                <Repeat size={18} />
                {loopMode === 'one' ? 'Once' : loopMode === 'all' ? 'All' : 'Off'}
              </button>
            </div>

            {/* Favorite + Add to playlist */}
            <div className="np-reveal flex items-center gap-5">
              <button
                type="button"
                onClick={() => { if (client && currentSong) toggleStarSong(client, currentSong); }}
                className="flex items-center gap-2 text-paper/70 hover:text-paper transition-colors"
                disabled={!currentSong}
              >
                {isStarred ? <HeartOff size={18} /> : <Heart size={18} />}
                <span className="text-sm font-sans">{isStarred ? 'Unfavorite' : 'Favorite'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 rounded-full bg-paper/15 hover:bg-paper/25 text-paper text-sm font-sans transition-colors"
                disabled={!currentSong}
              >
                Add to playlist
              </button>
            </div>

            {/* Session strip — bottom of left panel */}
            {isConfigured && sessionStatus && (
              <div className="np-reveal flex items-center gap-4 font-mono text-[9px] text-paper/30 uppercase tracking-[0.15em]">
                <span>
                  SESSION · {sessionStatus.songCount} SONGS
                  {sessionStatus.startedAt ? ` · ${startedAtFormatted(sessionStatus.startedAt)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="hover:text-paper/60 transition-colors underline underline-offset-2"
                >
                  RESET
                </button>
              </div>
            )}
          </section>

          {/* ── RIGHT PANEL: lyrics ────────────────────────────────────── */}
          <section className="np-reveal flex flex-col bg-ink/20 border border-paper/10 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-2xl text-paper">Lyrics</h2>
              {isSynced && (
                <span className="text-paper/40 text-[10px] font-mono uppercase tracking-widest">Synced</span>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pr-2"
              onScroll={handleScroll}
            >
              {lyricsLoading ? (
                <div className="flex flex-col gap-4 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-5 rounded bg-paper/10 animate-pulse" style={{ width: `${70 - i * 10}%` }} />
                  ))}
                </div>
              ) : lyricsError ? (
                <div className="font-serif italic text-2xl text-paper/25 text-center mt-16">{lyricsError}</div>
              ) : lines.length === 0 ? (
                <div className="font-serif italic text-2xl text-paper/25 text-center mt-16">No lyrics available</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {lines.map((line, index) => {
                    const isCurrent = isSynced && index === currentLineIndex;
                    const isPast    = isSynced && currentLineIndex !== -1 && index < currentLineIndex;
                    const isFuture  = isSynced && currentLineIndex !== -1 && index > currentLineIndex;

                    const textClass = isCurrent
                      ? 'font-serif text-xl text-paper font-semibold scale-105 origin-left'
                      : isPast
                        ? 'font-sans text-base text-paper/25'
                        : isFuture
                          ? 'font-sans text-base text-paper/50'
                          : 'font-sans text-base text-paper/70';

                    return (
                      <button
                        key={`${line.time ?? 'plain'}-${index}`}
                        type="button"
                        ref={registerLineRef(index)}
                        onClick={() => {
                          if (line.time == null) return;
                          const s = line.time / 1000;
                          if (!Number.isNaN(s)) get().seek(Math.max(0, s));
                        }}
                        className={`text-left transition-all duration-300 ${textClass}`}
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
