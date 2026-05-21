/**
 * PlayerBar.jsx
 * Spotify-style single-row player bar with native range scrubber.
 *
 * Design:
 *   - Background: rgba(10,0,0,0.92) + backdrop-filter blur/saturate
 *   - Border-top: 1px solid rgba(180,20,20,0.18) — no solid grey
 *   - Progress bar: .player-range with --pct CSS var written from rAF (no React state)
 *   - Seeking: useRef flag (no re-render during drag)
 *   - AI✦ pill: fires aiShuffleStore.fetchNext on click
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Volume2, VolumeX, Sparkles,
} from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';
import { useAIShuffleStore } from '../../store/aiShuffleStore';
import { useV2ShuffleStore } from '../../store/v2ShuffleStore';
import { useSettingsStore } from '../../store/settingsStore';

/* ── helpers ── */
const fmt = (s) => {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

const FALLBACK_COVER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%230a0000"/><circle cx="200" cy="200" r="120" fill="%23150000"/><circle cx="200" cy="200" r="18" fill="%23c0392b"/></svg>';

/* ── PlayerBar ── */
export const PlayerBar = () => {
  const {
    currentSong, isPlaying, position, duration,
    volume, play, pause, next, prev, seek, setVolume,
    shuffleMode, shufflePending, enableSmartShuffle, enableV2Shuffle, enableDumbShuffle, disableShuffle,
    repeatMode, setRepeatMode, queue,
  } = usePlayer();


  const client = useSubsonic();
  const { nowPlayingExpanded, setNowPlayingExpanded } = useUIStore();
  const fetchNext = useAIShuffleStore((s) => s.fetchNext);
  const aiActive = useAIShuffleStore((s) => s.sessionStatus?.songCount > 0);
  
  const fetchNextV2 = useV2ShuffleStore((s) => s.fetchNext);
  const v2Active = useV2ShuffleStore((s) => s.sessionStatus?.songCount > 0);
  const { v2ShuffleEnabled } = useSettingsStore();

  /* ── Responsive: mobile breakpoints ── */
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = width < 768;
  const isCompact = width < 480;

  /* ── Progress bar: --pct via direct DOM write, no React state ── */
  const rangeRef = useRef(null);
  const seekingRef = useRef(false);

  // Keep --pct in sync via rAF when not seeking
  useEffect(() => {
    if (!rangeRef.current || seekingRef.current) return;
    const pct = duration > 0 ? (position / duration) * 100 : 0;
    rangeRef.current.style.setProperty('--pct', pct.toFixed(2));
    rangeRef.current.value = pct.toFixed(2);
  }, [position, duration]);

  const onRangeChange = useCallback((e) => {
    const pct = parseFloat(e.target.value);
    e.target.style.setProperty('--pct', pct.toFixed(2));
  }, []);

  const onRangeDown = useCallback(() => {
    seekingRef.current = true;
  }, []);

  const onRangeUp = useCallback((e) => {
    const pct = parseFloat(e.target.value);
    seek((pct / 100) * duration);
    seekingRef.current = false;
  }, [seek, duration]);

  /* ── Volume ── */
  const volRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const prevVol = useRef(volume);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      setVolume(prevVol.current || 0.7);
    } else {
      prevVol.current = volume;
      setMuted(true);
      setVolume(0);
    }
  }, [muted, volume, setVolume]);

  const onVolChange = useCallback((e) => {
    const v = parseFloat(e.target.value) / 100;
    setVolume(v);
    if (v > 0) { setMuted(false); prevVol.current = v; }
    e.target.style.setProperty('--pct', (v * 100).toFixed(2));
  }, [setVolume]);

  // Sync vol slider --pct
  useEffect(() => {
    if (!volRef.current) return;
    volRef.current.style.setProperty('--pct', ((muted ? 0 : volume) * 100).toFixed(2));
  }, [volume, muted]);

  /* ── Shuffle / Repeat ── */
  const toggleShuffle = useCallback((e) => {
    e.stopPropagation();
    if (shufflePending) return; // reject while AI fetch in flight
    console.log(`[ShuffleToggle:PlayerBar] mode=${shuffleMode} | v2ShuffleEnabled=${v2ShuffleEnabled}`);
    if (shuffleMode === 'none') enableDumbShuffle();
    else if (shuffleMode === 'dumb') {
      if (v2ShuffleEnabled) void enableV2Shuffle();
      else void enableSmartShuffle(); // S6: no queue arg
    }
    else disableShuffle();
  }, [shuffleMode, shufflePending, enableDumbShuffle, enableSmartShuffle, enableV2Shuffle, disableShuffle, v2ShuffleEnabled]);


  const cycleRepeat = useCallback((e) => {
    e.stopPropagation();
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  }, [repeatMode, setRepeatMode]);

  /* ── AI✦ pill ── */
  const handleAI = useCallback((e) => {
    e.stopPropagation();
    if (shuffleMode === 'smart-v2') {
      fetchNextV2();
    } else {
      fetchNext({ current: currentSong?.title });
    }
  }, [fetchNext, fetchNextV2, currentSong, shuffleMode]);

  /* ── Cover URL ── */
  const coverUrl = currentSong?.coverArt && client
    ? client.getCoverArtUrl(currentSong.coverArt, 100)
    : null;

  const openOverlay = () => setNowPlayingExpanded(true);

  /* ── Shuffle icon color ── */
  const shuffleColor = shuffleMode === 'smart'
    ? '#ff8c00'
    : shuffleMode === 'smart-v2'
      ? '#a855f7' // purple-500
    : shuffleMode === 'dumb'
      ? '#dc143c'
      : undefined;

  /* ── RepeatMode icon ── */
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  /* ══════════════════════════════════════════════════════════════════════════
     MOBILE: floating pill bar
  ══════════════════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <footer
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] z-[70] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${nowPlayingExpanded
            ? 'opacity-0 pointer-events-none translate-y-10 scale-95'
            : 'opacity-100 translate-y-0 scale-100'
          }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openOverlay}
          onKeyDown={(e) => { if (e.key === 'Enter') openOverlay(); }}
          style={{
            background: 'rgba(10,0,0,0.92)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderTop: '1px solid rgba(180,20,20,0.18)',
          }}
          className="relative w-full rounded-2xl px-3 py-3 flex items-center gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Art */}
          <div
            className="relative flex-shrink-0 overflow-hidden rounded-md"
            style={{ width: 36, height: 36 }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentSong?.title || 'Cover'}
                className="w-full h-full object-cover art-spinning"
                style={{ '--spin-state': isPlaying ? 'running' : 'paused' }}
              />
            ) : (
              <div className="w-full h-full bg-[#150000] art-placeholder rounded-md" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-serif italic font-bold text-white truncate">
              {currentSong?.title || 'No track selected'}
            </div>
            <div className="text-[11px] font-mono text-white/40 truncate uppercase tracking-widest">
              {currentSong?.artist || '—'}
            </div>
          </div>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #c0392b, #8b0000)' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause size={18} className="fill-white text-white" />
              : <Play size={18} className="fill-white text-white ml-0.5" />
            }
          </button>

          {/* Progress line at bottom */}
          <div
            className="absolute bottom-0 left-0 h-[2px] rounded-full"
            style={{
              width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #c0392b, #8b0000)',
              transition: 'width 0.3s linear',
            }}
          />
        </div>
      </footer>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DESKTOP: full single-row bar
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-[50] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${nowPlayingExpanded
          ? 'opacity-0 pointer-events-none translate-y-4'
          : 'opacity-100 translate-y-0'
        }`}
      style={{
        background: 'rgba(10,0,0,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(180,20,20,0.18)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-2 max-w-screen-2xl mx-auto">

        {/* LEFT: Art + Info */}
        <div
          className="flex items-center gap-3 flex-shrink-0 cursor-pointer group/info"
          style={{ width: isCompact ? 160 : 220 }}
          onClick={openOverlay}
        >
          <div
            className="relative flex-shrink-0 overflow-hidden rounded-[6px] shadow-md"
            style={{ width: isCompact ? 36 : 44, height: isCompact ? 36 : 44 }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={currentSong?.title || 'Cover'}
                className="w-full h-full object-cover art-spinning"
                style={{ '--spin-state': isPlaying ? 'running' : 'paused' }}
              />
            ) : (
              <div
                className="w-full h-full rounded-[6px] art-placeholder"
                style={{ background: 'linear-gradient(135deg, #150000, #2a0000)' }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-serif italic font-bold truncate leading-tight group-hover/info:text-[#e34262] transition-colors">
              {currentSong?.title || 'No track selected'}
            </div>
            <div className="text-white/40 text-[11px] font-mono uppercase tracking-widest truncate mt-0.5">
              {currentSong?.artist || '—'}
            </div>
          </div>
        </div>

        {/* CENTER: Transport + Progress */}
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Transport row */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="text-white/50 hover:text-white transition-colors hover:scale-110 active:scale-95"
              aria-label="Previous"
            >
              <SkipBack size={20} className="fill-current" />
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(192,57,43,0.5)] hover:shadow-[0_0_24px_rgba(192,57,43,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #c0392b, #8b0000)' }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying
                ? <Pause size={16} className="fill-white text-white" />
                : <Play size={16} className="fill-white text-white ml-0.5" />
              }
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="text-white/50 hover:text-white transition-colors hover:scale-110 active:scale-95"
              aria-label="Next"
            >
              <SkipForward size={20} className="fill-current" />
            </button>
          </div>

          {/* Progress row */}
          <div className="flex items-center gap-2 w-full max-w-lg">
            <span className="text-[10px] font-mono text-white/30 w-8 text-right tabular-nums">
              {fmt(position)}
            </span>

            <input
              ref={rangeRef}
              type="range"
              className="player-range flex-1"
              min="0"
              max="100"
              step="0.05"
              defaultValue="0"
              onMouseDown={onRangeDown}
              onTouchStart={onRangeDown}
              onMouseUp={onRangeUp}
              onTouchEnd={onRangeUp}
              onChange={onRangeChange}
              aria-label="Seek"
            />

            <span className="text-[10px] font-mono text-white/30 w-8 tabular-nums">
              {fmt(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT: Volume + Controls + AI✦ */}
        <div
          className="flex items-center gap-3 flex-shrink-0 justify-end"
          style={{ width: isCompact ? 'auto' : 220 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Volume — hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="text-white/40 hover:text-white transition-colors"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0
                  ? <VolumeX size={16} />
                  : <Volume2 size={16} />
                }
              </button>
              <input
                ref={volRef}
                type="range"
                className="player-range"
                style={{ width: 72 }}
                min="0"
                max="100"
                step="1"
                defaultValue={Math.round(volume * 100)}
                onChange={onVolChange}
                aria-label="Volume"
              />
            </div>
          )}

          {/* Shuffle */}
          {!isCompact && (
            <button
              type="button"
              onClick={toggleShuffle}
              title={
                shuffleMode === 'smart' ? (v2ShuffleEnabled ? 'AI Shuffle (click for V2)' : 'AI Shuffle (click to disable)')
                  : shuffleMode === 'smart-v2' ? 'V2 Context AI (click to disable)'
                  : shuffleMode === 'dumb' ? 'Shuffle (click for AI)'
                    : 'Shuffle off'
              }
              className="transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ color: shuffleColor || 'rgba(255,255,255,0.3)' }}
              aria-label="Shuffle"
            >
              <Shuffle size={17} />
            </button>
          )}

          {/* Repeat */}
          {!isCompact && (
            <button
              type="button"
              onClick={cycleRepeat}
              title={
                repeatMode === 'one' ? 'Repeat One'
                  : repeatMode === 'all' ? 'Repeat All'
                    : 'Repeat Off'
              }
              className="transition-all duration-200 hover:scale-110 active:scale-95"
              style={{ color: repeatMode !== 'none' ? '#dc143c' : 'rgba(255,255,255,0.3)' }}
              aria-label="Repeat"
            >
              <RepeatIcon size={17} />
            </button>
          )}

          {/* AI✦ pill — pulsing when shufflePending */}
          <button
            type="button"
            onClick={handleAI}
            disabled={shufflePending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              background: (shuffleMode === 'smart-v2' ? v2Active : aiActive) 
                ? (shuffleMode === 'smart-v2' ? 'rgba(168,85,247,0.35)' : 'rgba(180,20,20,0.35)') 
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${(shuffleMode === 'smart-v2' ? v2Active : aiActive) 
                ? (shuffleMode === 'smart-v2' ? 'rgba(168,85,247,0.7)' : 'rgba(192,57,43,0.7)') 
                : 'rgba(255,255,255,0.12)'}`,
              color: (shuffleMode === 'smart-v2' ? v2Active : aiActive) 
                ? (shuffleMode === 'smart-v2' ? '#d8b4fe' : '#e34262') 
                : 'rgba(255,255,255,0.4)',
              boxShadow: (shuffleMode === 'smart-v2' ? v2Active : aiActive) 
                ? (shuffleMode === 'smart-v2' ? '0 0 12px rgba(168,85,247,0.3)' : '0 0 12px rgba(192,57,43,0.3)') 
                : 'none',
              opacity: shufflePending ? 0.5 : 1,
              animation: shufflePending ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
            aria-label="AI Shuffle next"
          >
            <Sparkles size={11} className={shufflePending ? 'animate-spin' : ''} />
            {!isCompact && <span>{shuffleMode === 'smart-v2' ? 'V2' : 'AI'}</span>}
          </button>

        </div>
      </div>
    </footer>
  );
};
