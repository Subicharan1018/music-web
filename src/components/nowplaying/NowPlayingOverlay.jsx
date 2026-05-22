/**
 * NowPlayingOverlay.jsx — Spotify-style two-column full-screen player.
 * Layout: LEFT = art + controls, RIGHT = lyrics/queue toggled by BB8 toggle.
 * Background: FluidBackground full-bleed. Zero glass/backdrop on panels.
 */

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  SkipBack, SkipForward, Play, Pause, Heart,
  Repeat, Repeat1, Shuffle, X, Sparkles, Volume2, VolumeX,
} from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useLyrics } from '../../hooks/lyrics/useLyrics';
import { AddToPlaylistDialog } from '../playlists/AddToPlaylistDialog';
import { GenerativeArtScene } from '../ui/GenerativeArtScene';
import { gsap } from '../../lib/gsap';
import { useAIShuffleStore } from '../../store/aiShuffleStore';
import { useServerHealth } from '../../hooks/ai/useServerHealth';
import { usePlayerStore } from '../../store/playerStore';
import { useV2ShuffleStore } from '../../store/v2ShuffleStore';
import { useSettingsStore } from '../../store/settingsStore';
import React from 'react';

const FALLBACK_COVER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%230a0a0a"/><circle cx="200" cy="200" r="120" fill="%23111"/><circle cx="200" cy="200" r="18" fill="%23333"/></svg>';

const fmt = (s) => {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

const OverlayProgress = React.memo(({ seek }) => {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const rangeRef = useRef(null);
  const seekingRef = useRef(false);

  useEffect(() => {
    if (!rangeRef.current || seekingRef.current) return;
    const pct = duration > 0 ? (position / duration) * 100 : 0;
    rangeRef.current.style.setProperty('--pct', pct.toFixed(2));
    rangeRef.current.value = pct.toFixed(2);
  }, [position, duration]);

  const onRangeDown = useCallback(() => { seekingRef.current = true; }, []);
  const onRangeChange = useCallback((e) => { e.target.style.setProperty('--pct', parseFloat(e.target.value).toFixed(2)); }, []);
  const onRangeUp = useCallback((e) => { seek((parseFloat(e.target.value) / 100) * duration); seekingRef.current = false; }, [seek, duration]);

  return (
    <div className="w-full max-w-md relative flex items-center gap-4">
      <span className="text-[10px] font-mono text-white/40 tabular-nums">{fmt(position)}</span>
      <div className="flex-1 relative group h-2 flex items-center">
        <div className="absolute inset-x-0 h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#e34262] relative" style={{ width: `${(position / duration) * 100 || 0}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <input ref={rangeRef} type="range" className="absolute inset-x-0 -inset-y-2 w-full h-[20px] opacity-0 cursor-pointer z-10" min="0" max="100" step="0.05" defaultValue="0"
          onMouseDown={onRangeDown} onTouchStart={onRangeDown} onMouseUp={onRangeUp} onTouchEnd={onRangeUp} onChange={onRangeChange} aria-label="Seek" />
      </div>
      <span className="text-[10px] font-mono text-white/40 tabular-nums">{fmt(duration)}</span>
    </div>
  );
});

/* ── UI Subcomponents ────────────────────────────────────────────────────── */
const LiveWaveform = ({ isPlaying }) => {
  const barsRef = useRef([]);

  useEffect(() => {
    barsRef.current.forEach((bar, i) => {
      if (!bar) return;
      if (isPlaying) {
        gsap.to(bar, {
          scaleY: 1,
          opacity: 1,
          duration: gsap.utils.random(0.3, 0.7),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.05,
        });
      } else {
        gsap.killTweensOf(bar);
        gsap.to(bar, {
          scaleY: 0.15,
          opacity: 0.4,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    });
  }, [isPlaying]);

  return (
    <div className="waveform-bar mt-6" role="presentation">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          ref={(el) => (barsRef.current[i] = el)}
          style={{ transformOrigin: 'bottom', transform: 'scaleY(0.15)', opacity: 0.4 }}
        />
      ))}
    </div>
  );
};

const VinylArt = ({ coverUrl, isPlaying }) => {
  const discRef = useRef(null);
  const spinTween = useRef(null);

  useEffect(() => {
    if (!discRef.current) return;
    if (!spinTween.current) {
      spinTween.current = gsap.to(discRef.current, {
        rotation: 360,
        duration: 8,
        repeat: -1,
        ease: "none",
        paused: true,
      });
    }
    
    if (isPlaying) {
      spinTween.current.play();
    } else {
      spinTween.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="vinyl-wrap">
      <div className="vinyl-disc" ref={discRef}>
        <div className="vinyl-art">
          <img src={coverUrl} alt="Album Art" />
        </div>
      </div>
      <div className="vinyl-hole" />
      <div className="vinyl-shine" />
    </div>
  );
};

const TabPills = ({ showLyrics, onChange }) => {
  const bgRef = useRef(null);
  
  useEffect(() => {
    if (!bgRef.current) return;
    gsap.to(bgRef.current, {
      x: showLyrics ? '100%' : '0%',
      duration: 0.4,
      ease: 'back.out(1.5)',
    });
  }, [showLyrics]);

  return (
    <div className="relative flex p-[3px] bg-black border border-white/10 rounded-md w-48 mx-auto h-[32px] mb-2">
      <div
        ref={bgRef}
        className="absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] bg-[#c0392b] rounded shadow-md pointer-events-none"
      />
      <button
        type="button"
        className={`flex-1 relative z-10 text-[9px] font-mono uppercase tracking-[0.16em] transition-colors ${!showLyrics ? 'text-white' : 'text-white/40'}`}
        onClick={() => onChange(false)}
      >
        Queue
      </button>
      <button
        type="button"
        className={`flex-1 relative z-10 text-[9px] font-mono uppercase tracking-[0.16em] transition-colors ${showLyrics ? 'text-white' : 'text-white/40'}`}
        onClick={() => onChange(true)}
      >
        Lyrics
      </button>
      <div className="absolute -right-14 top-1/2 -translate-y-1/2 px-1.5 py-0.5 border border-white/10 rounded text-[7px] tracking-widest text-white/30 font-mono">
        BB8 ↕
      </div>
    </div>
  );
};

/* ── LyricsPanel ─────────────────────────────────────────────────────────── */
const LyricsPanel = ({ lines, currentLineIndex, isSynced, isLoading, error, handleScroll, registerLineRef, seek }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || currentLineIndex < 0) return;
    const active = containerRef.current.querySelector(`[data-line-index="${currentLineIndex}"]`);
    active?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentLineIndex]);

  if (isLoading) return (
    <div className="flex flex-col gap-5 px-6 pt-8">
      {[75, 55, 65, 45, 70, 50].map((w, i) => (
        <div key={i} className="h-4 rounded-full animate-pulse bg-white/8" style={{ width: `${w}%` }} />
      ))}
    </div>
  );

  if (error || lines.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-serif italic text-2xl text-white/15">{error || 'No lyrics available'}</p>
    </div>
  );

  return (
    <div ref={containerRef} className="overflow-y-auto h-full px-6 pb-12" style={{ scrollbarWidth: 'none' }} onScroll={handleScroll}>
      <div className="flex flex-col gap-4 py-8">
        {lines.map((line, index) => {
          const isCurrent = isSynced && index === currentLineIndex;
          const isPast = isSynced && currentLineIndex !== -1 && index < currentLineIndex;
          return (
            <button
              key={`${line.time ?? 'plain'}-${index}`}
              type="button"
              ref={registerLineRef(index)}
              onClick={() => { if (line.time == null) return; const s = line.time / 1000; if (!Number.isNaN(s)) seek(Math.max(0, s)); }}
              className={`text-left transition-all duration-500 leading-snug font-sans ${isCurrent ? 'text-white text-2xl font-bold' : isPast ? 'text-white/20 text-lg font-medium' : 'text-white/45 text-lg font-medium hover:text-white/70'}`}
              data-line-index={index}
              disabled={line.time == null}
            >
              {line.text || ''}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── QueuePanel ──────────────────────────────────────────────────────────── */
const QueuePanel = ({ queue, currentIndex, client, play }) => {
  if (!queue.length) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-serif italic text-2xl text-white/15">Queue is empty</p>
    </div>
  );

  return (
    <div className="overflow-y-auto h-full pb-12" style={{ scrollbarWidth: 'none' }}>
      <div className="px-2 flex flex-col">
        {queue.map((song, i) => {
          const isCurrent = i === currentIndex;
          const coverUrl = song?.coverArt && client ? client.getCoverArtUrl(song.coverArt, 64) : null;
          return (
            <div
              key={`${i}-${song.id}`}
              onClick={() => play(song)}
              className={`q-item ${isCurrent ? 'current' : ''} cursor-pointer`}
            >
              <div className="w-5 text-center flex-shrink-0">
                {isCurrent
                  ? <span className="text-[#e34262] text-xs">▶</span>
                  : <span className="text-white/20 text-[11px] font-mono group-hover:text-[#e34262]/60 transition-colors">{i + 1}</span>}
              </div>
              <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-white/5">
                {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate font-sans transition-colors ${isCurrent
                    ? 'text-white font-semibold'
                    : 'text-white/65 group-hover:text-[#e34262] group-hover:font-medium'
                  }`}>
                  {song.title || '—'}
                </div>
                <div className="text-[11px] text-white/30 truncate font-mono uppercase tracking-wider mt-0.5 group-hover:text-white/45 transition-colors">
                  {song.artist || ''}
                </div>
              </div>
              <div className="text-[11px] font-mono text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors">
                {fmt(song.duration)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── NowPlayingOverlay ───────────────────────────────────────────────────── */
export const NowPlayingOverlay = () => {
  const { nowPlayingExpanded, setNowPlayingExpanded } = useUIStore();
  const client = useSubsonic();
  const {
    currentSong, isPlaying, volume, queue,
    play, pause, next, prev, seek, setVolume,
    shuffleMode, shufflePending, enableSmartShuffle, enableV2Shuffle, enableDumbShuffle, disableShuffle,
    repeatMode, setRepeatMode, currentIndex,
  } = usePlayer();

  const queueSource = usePlayerStore((s) => s.queueSource);
  const { toggleStarSong, isSongStarred } = useLibraryStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  // false = queue (BB8 day), true = lyrics (BB8 night)
  const [showLyrics, setShowLyrics] = useState(false);
  const { isConfigured, isHealthy, health } = useServerHealth();

  const fetchNext = useAIShuffleStore((s) => s.fetchNext);
  const sessionStatus = useAIShuffleStore((s) => s.sessionStatus);
  const resetSession = useAIShuffleStore((s) => s.resetSession);

  const fetchNextV2 = useV2ShuffleStore((s) => s.fetchNext);
  const v2SessionStatus = useV2ShuffleStore((s) => s.sessionStatus);
  const resetSessionV2 = useV2ShuffleStore((s) => s.resetSession);

  const { v2ShuffleEnabled } = useSettingsStore();

  const { lines, currentLineIndex, isSynced, isLoading: lyricsLoading, error: lyricsError, handleScroll, registerLineRef } = useLyrics(currentSong);

  /* ── Volume ── */
  const volRef = useRef(null);
  useEffect(() => { if (!volRef.current) return; volRef.current.style.setProperty('--pct', (volume * 100).toFixed(2)); }, [volume]);

  /* ── Cover URL ── */
  const coverUrl = useMemo(() => {
    if (!client || !currentSong?.coverArt) return FALLBACK_COVER;
    return client.getCoverArtUrl(currentSong.coverArt, 600);
  }, [client, currentSong]);

  const isStarred = currentSong ? isSongStarred(currentSong.id) : false;

  const toggleShuffle = useCallback(() => {
    if (shufflePending) return; // reject while AI fetch in flight (C3)
    if (shuffleMode === 'none') enableDumbShuffle();
    else if (shuffleMode === 'dumb') {
      if (v2ShuffleEnabled) void enableV2Shuffle();
      else void enableSmartShuffle(); // S6: no queue arg
    }
    else disableShuffle();
  }, [shuffleMode, shufflePending, enableDumbShuffle, enableSmartShuffle, enableV2Shuffle, disableShuffle, v2ShuffleEnabled]);

  const cycleRepeat = useCallback(() => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  }, [repeatMode, setRepeatMode]);

  const closeOverlay = useCallback(() => setNowPlayingExpanded(false), [setNowPlayingExpanded]);

  useEffect(() => {
    if (!nowPlayingExpanded) return;
    const onKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nowPlayingExpanded, closeOverlay]);

  const containerRef = useRef(null);
  useEffect(() => {
    if (!nowPlayingExpanded || !containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.np-reveal', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' });
    }, containerRef);
    return () => ctx.revert();
  }, [nowPlayingExpanded]);

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const shuffleColor = shuffleMode === 'smart' ? '#ff8c00' : shuffleMode === 'smart-v2' ? '#a855f7' : shuffleMode === 'dumb' ? '#dc143c' : null;

  const handleAI = useCallback(() => {
    if (shuffleMode === 'smart-v2') {
      fetchNextV2();
    } else {
      fetchNext({ current: currentSong?.title });
    }
  }, [fetchNext, fetchNextV2, currentSong?.title, shuffleMode]);

  const handleResetSession = useCallback(async () => {
    if (shuffleMode === 'smart-v2') {
      await resetSessionV2();
    } else {
      await resetSession(currentSong?.title);
    }
  }, [resetSession, resetSessionV2, currentSong?.title, shuffleMode]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[60] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0,0,1)] np-root ${nowPlayingExpanded ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'}`}
    >
      <GenerativeArtScene isPlaying={isPlaying} />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-5 pb-3 flex-shrink-0">
        <button type="button" onClick={closeOverlay}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all"
          aria-label="Close">
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="np-source-dot" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e34262] font-bold">
              {queueSource === 'model' ? 'AI · Recommended' : queueSource === 'v2-model' ? 'V2 AI · Recommended' : queueSource === 'cold_start' ? 'AI · Discovery' : 'Local Queue'}
            </p>
          </div>
          {isConfigured && (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`w-1 h-1 rounded-full ${isHealthy ? 'bg-white/30' : 'bg-[#e34262]/50'}`} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
                {isHealthy ? `AI${health?.librarySize ? ` · ${health.librarySize.toLocaleString()} songs` : ''}` : 'AI · Offline'}
              </span>
            </div>
          )}
        </div>

        <button type="button" onClick={() => currentSong && toggleStarSong(client, currentSong)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white/40 hover:text-white transition-all"
          aria-label={isStarred ? 'Unstar' : 'Star'}>
          <Heart size={17} className={isStarred ? 'fill-[#e34262] text-[#e34262]' : ''} />
        </button>
      </div>

      {/* ── Main Viewport (Overlay Layout) ── */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
        
        {/* ══ RIGHT — Lyrics / Queue (Floating) ══ */}
        <div className="absolute top-24 right-8 bottom-[180px] w-[360px] flex flex-col pointer-events-auto np-reveal">
          <div className="flex items-center justify-center pt-2 pb-3 flex-shrink-0">
            <TabPills showLyrics={showLyrics} onChange={setShowLyrics} />
          </div>
          {/* Panel Background added slightly to separate text from complex 3D wireframe, but kept sleek and dark */}
          <div className="flex-1 min-h-0 overflow-hidden bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
            {showLyrics ? (
              <LyricsPanel
                lines={lines} currentLineIndex={currentLineIndex} isSynced={isSynced}
                isLoading={lyricsLoading} error={lyricsError}
                handleScroll={handleScroll} registerLineRef={registerLineRef} seek={seek}
              />
            ) : (
              <QueuePanel queue={queue} currentIndex={currentIndex ?? 0} client={client} play={play} />
            )}
          </div>
        </div>

        {/* ══ BOTTOM — Player Bar ══ */}
        <div className="absolute bottom-0 left-0 right-0 px-10 pb-8 pt-24 flex items-end justify-between pointer-events-auto bg-gradient-to-t from-[#0a0808] via-[#0a0808]/80 to-transparent z-20">
          
          {/* LEFT: Vinyl & Info */}
          <div className="flex items-center gap-6 w-[30%]">
            <div className="relative flex-shrink-0" style={{ width: '112px', height: '112px' }}>
              <div style={{ transform: 'scale(0.4)', transformOrigin: 'top left' }} className="absolute top-0 left-0">
                 <VinylArt coverUrl={coverUrl} isPlaying={isPlaying} />
              </div>
            </div>
            <div className="min-w-0 flex-1 pb-1">
               <h1 className="text-3xl text-white truncate drop-shadow-md" style={{ fontFamily: '"DM Serif Display", serif' }}>
                 {currentSong?.title || 'No track selected'}
               </h1>
               <p className="font-mono text-[12px] text-[#e34262] tracking-[0.05em] mt-1.5 truncate drop-shadow">
                 {currentSong?.artist || '—'}
               </p>
               {currentSong?.album && (
                 <p className="font-sans text-[10px] text-white/30 mt-1 truncate">{currentSong.album}</p>
               )}
            </div>
          </div>

          {/* CENTER: Controls */}
          <div className="flex flex-col items-center gap-5 w-[40%] pb-2">
             <div className="flex items-center gap-8">
                <button type="button" onClick={toggleShuffle}
                  style={{ color: shuffleColor || 'rgba(255,255,255,0.35)' }}
                  className="transition-all hover:scale-110 active:scale-95 hover:text-white/70" aria-label="Shuffle">
                  <Shuffle size={19} />
                </button>
                <button type="button" onClick={() => prev()}
                  className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95" aria-label="Previous">
                  <SkipBack size={24} className="fill-current" />
                </button>
                <button type="button" onClick={() => isPlaying ? pause() : play()}
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-[#e34262] text-white shadow-[0_0_20px_rgba(227,66,98,0.4)] transition-all hover:scale-105 active:scale-95 hover:bg-[#ff4f73]"
                  aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause size={22} className="fill-white" /> : <Play size={22} className="fill-white ml-1" />}
                </button>
                <button type="button" onClick={() => next()}
                  className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95" aria-label="Next">
                  <SkipForward size={24} className="fill-current" />
                </button>
                <button type="button" onClick={cycleRepeat}
                  style={{ color: repeatMode !== 'none' ? '#e34262' : 'rgba(255,255,255,0.35)' }}
                  className="transition-all hover:scale-110 active:scale-95" aria-label="Repeat">
                  <RepeatIcon size={19} />
                </button>
             </div>
             
             {/* Progress */}
             <OverlayProgress seek={seek} />
          </div>

          {/* RIGHT: Extra */}
          <div className="flex flex-col items-end justify-end gap-5 w-[30%] pb-3">
             <div className="flex items-center gap-5">
               <div className="-mt-4"><LiveWaveform isPlaying={isPlaying} /></div>
               <button type="button" onClick={handleAI}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                 style={{
                   background: shuffleMode === 'smart-v2' ? 'rgba(168,85,247,0.25)' : 'rgba(227,66,98,0.25)',
                   border: `1px solid ${shuffleMode === 'smart-v2' ? 'rgba(168,85,247,0.45)' : 'rgba(227,66,98,0.45)'}`,
                   color: shuffleMode === 'smart-v2' ? '#d8b4fe' : '#e34262'
                 }}
                 aria-label="AI next">
                 <Sparkles size={11} /><span>{shuffleMode === 'smart-v2' ? 'V2✦' : 'AI✦'}</span>
               </button>
             </div>
             
             {/* Volume & Session */}
             <div className="flex items-center gap-6">
                {(shuffleMode === 'smart-v2' ? v2SessionStatus : sessionStatus) && (
                  <div className="flex items-center gap-2 font-mono text-[9px] text-white/30 uppercase tracking-widest">
                    <span>{shuffleMode === 'smart-v2' ? v2SessionStatus?.songCount : sessionStatus?.songCount} AI Queue</span>
                    <button type="button" onClick={handleResetSession} className="hover:text-[#e34262] transition-colors underline underline-offset-2">Reset</button>
                  </div>
                )}
                <div className="flex items-center gap-2 w-28 relative group">
                  <VolumeX size={12} className="text-white/30" />
                  <div className="relative flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden flex items-center">
                    <div className="h-full bg-white/50" style={{ width: `${volume * 100}%` }} />
                    <input ref={volRef} type="range" className="absolute -inset-y-2 inset-x-0 w-full opacity-0 cursor-pointer z-10" min="0" max="100" step="1"
                      defaultValue={Math.round(volume * 100)}
                      onChange={(e) => { const v = parseFloat(e.target.value) / 100; setVolume(v); }}
                      aria-label="Volume" />
                  </div>
                  <Volume2 size={12} className="text-white/30" />
                </div>
             </div>
          </div>

        </div>
      </div>

      <AddToPlaylistDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} songsToAdd={currentSong ? [currentSong] : []} />
    </div>
  );
};