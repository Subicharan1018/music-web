/**
 * PlayerBar.jsx
 * Dark glass floating player — crimson + orange gradient play button,
 * razor-thin progress, no warm tones.
 */

import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23080808"/><circle cx="200" cy="200" r="120" fill="%23111"/><circle cx="200" cy="200" r="18" fill="%23dc143c"/></svg>';

const fmtTime = (s) => {
  if (!s) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export const PlayerBar = () => {
  const {
    currentSong, isPlaying, position, duration,
    play, pause, next, prev, seek,
    shuffleMode, enableSmartShuffle, enableDumbShuffle, disableShuffle,
    repeatMode, setRepeatMode, queue,
  } = usePlayer();

  const client = useSubsonic();
  const { nowPlayingExpanded, setNowPlayingExpanded } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(!!query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const toggleShuffle = (e) => {
    e.stopPropagation();
    if (shuffleMode === 'none') enableDumbShuffle();
    else if (shuffleMode === 'dumb') void enableSmartShuffle(queue);
    else disableShuffle();
  };

  const cycleLoop = (e) => {
    e.stopPropagation();
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const openOverlay = () => setNowPlayingExpanded(true);
  const coverUrl = currentSong?.coverArt && client
    ? client.getCoverArtUrl(currentSong.coverArt, 100)
    : FALLBACK_COVER;

  const progress = duration ? (position / duration) * 100 : 0;

  /* ── MOBILE ──────────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <footer
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] z-[70] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          nowPlayingExpanded ? 'opacity-0 pointer-events-none translate-y-10 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Glow halo */}
        <div
          className="absolute inset-0 rounded-[1.75rem] opacity-20 blur-xl pointer-events-none"
          style={{ background: 'linear-gradient(90deg, #dc143c, #ff6b00)' }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openOverlay}
          onKeyDown={(e) => { if (e.key === 'Enter') openOverlay(); }}
          className="relative w-full backdrop-blur-2xl rounded-[1.75rem] px-3 py-3 flex items-center gap-3 overflow-hidden"
          style={{
            background: 'rgba(10, 10, 10, 0.90)',
            border: '1px solid rgba(220,20,60,0.15)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
          }}
        >
          {/* Inner top highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-[1.75rem]" />

          {/* Vinyl art */}
          <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid rgba(220,20,60,0.3)', boxShadow: '0 0 14px rgba(220,20,60,0.3)' }}>
            <img src={coverUrl} alt={currentSong?.title || 'Cover'} className={`w-full h-full object-cover ${isPlaying ? 'vinyl-spin' : ''}`} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-paper rounded-full border border-white/10" />
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0 text-left z-10 pl-1">
            <div className="font-serif italic font-bold text-sm text-ink truncate">{currentSong?.title || 'No track selected'}</div>
            <div className="font-mono text-[10px] text-ink/40 truncate uppercase tracking-widest mt-0.5">{currentSong?.artist || '—'}</div>
          </div>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
            className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #dc143c 0%, #ff6b00 100%)', boxShadow: '0 0 18px rgba(220,20,60,0.45)' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} className="fill-white text-white" /> : <Play size={18} className="fill-white text-white ml-0.5" />}
          </button>

          {/* Progress underline */}
          <div className="absolute bottom-0 left-0 h-[2px] rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #dc143c, #ff6b00)', transition: 'width 0.2s linear' }} />
        </div>
      </footer>
    );
  }

  /* ── DESKTOP ─────────────────────────────────────────────────────────── */
  return (
    <footer
      className={`fixed z-[50] bottom-5 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        nowPlayingExpanded ? 'opacity-0 pointer-events-none translate-y-12 scale-95' : 'opacity-100 translate-y-0 scale-100 group'
      } cursor-pointer`}
      onClick={openOverlay}
    >
      {/* Outer crimson glow halo */}
      <div
        className="absolute inset-0 rounded-[2rem] opacity-20 group-hover:opacity-35 transition-opacity duration-700 blur-2xl pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #dc143c 0%, #ff6b00 50%, #000 100%)' }}
      />

      {/* Main glass island */}
      <div
        className="relative h-[82px] w-full rounded-[2rem] flex items-center justify-between px-7 overflow-hidden group-hover:border-white/[0.08] transition-colors"
        style={{
          background: 'rgba(8, 8, 8, 0.88)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(220,20,60,0.12)',
          boxShadow: '0 24px 60px -15px rgba(0,0,0,0.95)',
        }}
      >
        {/* Inner top highlight stripe */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* LEFT: Art + track info */}
        <div className="relative z-10 flex items-center gap-4 w-[30%] min-w-0">
          {/* Vinyl disc */}
          <div
            className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 transition-shadow duration-500 group-hover:shadow-[0_0_28px_rgba(220,20,60,0.45)]"
            style={{ border: '1.5px solid rgba(220,20,60,0.25)', boxShadow: '0 0 18px rgba(220,20,60,0.2)' }}
          >
            <img src={coverUrl} alt="cover" className={`w-full h-full object-cover ${isPlaying ? 'vinyl-spin' : ''}`} />
            {/* Centre hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-paper rounded-full border border-white/10" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-serif italic text-[15px] font-bold text-ink truncate tracking-wide">
              {currentSong?.title || 'No track selected'}
            </div>
            <div className="font-mono text-[10px] text-ink/35 font-normal uppercase tracking-[0.18em] mt-1 truncate">
              {currentSong?.artist || '—'}
            </div>
          </div>
        </div>

        {/* CENTER: Controls + progress */}
        <div className="relative z-10 flex flex-col items-center justify-center w-[40%]" onClick={e => e.stopPropagation()}>
          {/* Control row */}
          <div className="flex items-center gap-7 mb-3">
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="text-ink/35 hover:text-white transition-colors hover:scale-110 active:scale-95"
            >
              <SkipBack size={20} className="fill-current" />
            </button>

            {/* Play / Pause — the hero button */}
            <button
              onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #dc143c 0%, #ff6b00 100%)',
                boxShadow: '0 0 22px rgba(220,20,60,0.5)',
              }}
            >
              {isPlaying
                ? <Pause size={22} className="fill-white text-white" />
                : <Play size={22} className="fill-white text-white ml-0.5" />
              }
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="text-ink/35 hover:text-white transition-colors hover:scale-110 active:scale-95"
            >
              <SkipForward size={20} className="fill-current" />
            </button>
          </div>

          {/* Progress row */}
          <div className="w-full max-w-[380px] flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] font-mono text-ink/35 w-9 text-right tabular-nums">{fmtTime(position)}</span>

            <div
              className="flex-1 h-[3px] rounded-full overflow-hidden cursor-pointer relative group/bar"
              style={{ background: 'rgba(255,255,255,0.07)' }}
              onClick={e => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                seek(((e.clientX - rect.left) / rect.width) * duration);
              }}
            >
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #dc143c 0%, #ff6b00 100%)',
                  boxShadow: '0 0 8px rgba(220,20,60,0.6)',
                  transition: 'width 0.2s linear',
                }}
              />
            </div>

            <span className="text-[10px] font-mono text-ink/35 w-9 tabular-nums">{fmtTime(duration)}</span>
          </div>
        </div>

        {/* RIGHT: Shuffle + Repeat */}
        <div className="relative z-10 flex items-center justify-end gap-5 w-[30%]" onClick={e => e.stopPropagation()}>
          <button
            onClick={toggleShuffle}
            className="transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: shuffleMode !== 'none' ? '#ff6b00' : 'rgba(240,240,240,0.25)' }}
            title={shuffleMode === 'dumb' ? 'Normal Shuffle' : shuffleMode === 'smart' ? 'Smart Shuffle' : 'Shuffle Off'}
          >
            <Shuffle size={18} />
          </button>

          <button
            onClick={cycleLoop}
            className="transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ color: repeatMode !== 'none' ? '#dc143c' : 'rgba(240,240,240,0.25)' }}
            title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
          >
            <Repeat size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
};
