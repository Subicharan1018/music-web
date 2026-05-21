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
import { useLyrics } from '../../hooks/useLyrics';
import { AddToPlaylistDialog } from '../playlists/AddToPlaylistDialog';
import { FluidBackground } from './FluidBackground';
import { gsap } from '../../lib/gsap';
import { useAIShuffleStore } from '../../store/aiShuffleStore';
import { useServerHealth } from '../../hooks/useServerHealth';
import { usePlayerStore } from '../../store/playerStore';

const FALLBACK_COVER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%230a0a0a"/><circle cx="200" cy="200" r="120" fill="%23111"/><circle cx="200" cy="200" r="18" fill="%23333"/></svg>';

const fmt = (s) => {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

/* ── BB8 Toggle — queue=unchecked(day), lyrics=checked(night) ───────────── */
const BB8Toggle = ({ showLyrics, onChange }) => (
  <div className="bb8-toggle-wrapper">
    <label className="bb8-toggle">
      <input
        className="bb8-toggle__checkbox"
        type="checkbox"
        checked={showLyrics}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="bb8-toggle__container">
        <div className="bb8-toggle__scenery">
          <div className="bb8-toggle__star" /><div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" /><div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" /><div className="bb8-toggle__star" />
          <div className="bb8-toggle__star" />
          <div className="tatto-1" /><div className="tatto-2" />
          <div className="gomrassen" /><div className="hermes" /><div className="chenini" />
          <div className="bb8-toggle__cloud" /><div className="bb8-toggle__cloud" />
          <div className="bb8-toggle__cloud" />
        </div>
        <div className="bb8">
          <div className="bb8__head-container">
            <div className="bb8__antenna" /><div className="bb8__antenna" />
            <div className="bb8__head" />
          </div>
          <div className="bb8__body" />
        </div>
        <div className="artificial__hidden"><div className="bb8__shadow" /></div>
      </div>
    </label>
    {/* Labels */}
    <div className="flex justify-between px-1 mt-1.5">
      <span className={`text-[9px] font-mono uppercase tracking-widest transition-colors ${!showLyrics ? 'text-white/70' : 'text-white/20'}`}>Queue</span>
      <span className={`text-[9px] font-mono uppercase tracking-widest transition-colors ${showLyrics ? 'text-white/70' : 'text-white/20'}`}>Lyrics</span>
    </div>
    <style>{`
      .bb8-toggle-wrapper { display: flex; flex-direction: column; align-items: center; }
      .bb8-toggle {
        --toggle-size: 11px;
        --toggle-width: 10.625em; --toggle-height: 5.625em;
        --toggle-offset: calc((var(--toggle-height) - var(--bb8-diameter)) / 2);
        --toggle-bg: linear-gradient(#2c4770, #070e2b 35%, #628cac 50% 70%, #a6c5d4) no-repeat;
        --bb8-diameter: 4.375em; --radius: 99em; --transition: 0.4s;
        --accent: #de7d2f; --bb8-bg: #fff;
        cursor: pointer; font-size: var(--toggle-size);
      }
      .bb8-toggle, .bb8-toggle *, .bb8-toggle *::before, .bb8-toggle *::after { box-sizing: border-box; }
      .bb8-toggle__checkbox { appearance: none; display: none; }
      .bb8-toggle__container {
        width: var(--toggle-width); height: var(--toggle-height);
        background: var(--toggle-bg); background-size: 100% 11.25em;
        background-position-y: -5.625em; border-radius: var(--radius);
        position: relative; transition: var(--transition);
      }
      .bb8 {
        display: flex; flex-direction: column; align-items: center;
        position: absolute; top: calc(var(--toggle-offset) - 1.688em + 0.188em);
        left: var(--toggle-offset); transition: var(--transition); z-index: 2;
      }
      .bb8__head-container { position: relative; transition: var(--transition); z-index: 2; transform-origin: 1.25em 3.75em; }
      .bb8__head {
        overflow: hidden; margin-bottom: -0.188em; width: 2.5em; height: 1.688em;
        background: linear-gradient(transparent .063em,dimgray .063em .313em,transparent .313em .375em,var(--accent) .375em .5em,transparent .5em 1.313em,silver 1.313em 1.438em,transparent 1.438em),linear-gradient(45deg,transparent .188em,var(--bb8-bg) .188em 1.25em,transparent 1.25em),linear-gradient(-45deg,transparent .188em,var(--bb8-bg) .188em 1.25em,transparent 1.25em),linear-gradient(var(--bb8-bg) 1.25em,transparent 1.25em);
        border-radius: var(--radius) var(--radius) 0 0; position: relative; z-index: 1;
        filter: drop-shadow(0 .063em .125em gray);
      }
      .bb8__head::before {
        content: ""; position: absolute; width: .563em; height: .563em;
        background: radial-gradient(.125em circle at .25em .375em,red,transparent),radial-gradient(.063em circle at .375em .188em,var(--bb8-bg) 50%,transparent 100%),linear-gradient(45deg,#000 .188em,dimgray .313em .375em,#000 .5em);
        border-radius: var(--radius); top: .413em; left: 50%; transform: translate(-50%);
        box-shadow: 0 0 0 .089em lightgray,.563em .281em 0 -.148em,.563em .281em 0 -.1em var(--bb8-bg),.563em .281em 0 -.063em;
        z-index: 1; transition: var(--transition);
      }
      .bb8__head::after {
        content: ""; position: absolute; bottom: .375em; left: 0; width: 100%; height: .188em;
        background: linear-gradient(to right,var(--accent) .125em,transparent .125em .188em,var(--accent) .188em .313em,transparent .313em .375em,var(--accent) .375em .938em,transparent .938em 1em,var(--accent) 1em 1.125em,transparent 1.125em 1.875em,var(--accent) 1.875em 2em,transparent 2em 2.063em,var(--accent) 2.063em 2.25em,transparent 2.25em 2.313em,var(--accent) 2.313em 2.375em,transparent 2.375em 2.438em,var(--accent) 2.438em);
        transition: var(--transition);
      }
      .bb8__antenna { position: absolute; transform: translateY(-90%); width: .059em; border-radius: var(--radius) var(--radius) 0 0; transition: var(--transition); }
      .bb8__antenna:nth-child(1) { height: .938em; right: .938em; background: linear-gradient(#000 .188em,silver .188em); }
      .bb8__antenna:nth-child(2) { height: .375em; left: 50%; transform: translate(-50%,-90%); background: silver; }
      .bb8__body {
        width: 4.375em; height: 4.375em; border-radius: var(--radius);
        position: relative; overflow: hidden; transition: var(--transition); z-index: 1; transform: rotate(45deg);
        background: linear-gradient(-90deg,var(--bb8-bg) 4%,var(--accent) 4% 10%,transparent 10% 90%,var(--accent) 90% 96%,var(--bb8-bg) 96%),linear-gradient(var(--bb8-bg) 4%,var(--accent) 4% 10%,transparent 10% 90%,var(--accent) 90% 96%,var(--bb8-bg) 96%),linear-gradient(to right,transparent 2.156em,silver 2.156em 2.219em,transparent 2.188em),linear-gradient(transparent 2.156em,silver 2.156em 2.219em,transparent 2.188em);
        background-color: var(--bb8-bg);
      }
      .bb8__body::after { content:"";bottom:1.5em;left:.563em;position:absolute;width:.188em;height:.188em;background:rgb(236,236,236);border-radius:50%;box-shadow:.875em .938em,0 -1.25em,.875em -2.125em,2.125em -2.125em,3.063em -1.25em,3.063em 0,2.125em .938em; }
      .bb8__body::before {
        content:"";width:2.625em;height:2.625em;position:absolute;border-radius:50%;z-index:.1;overflow:hidden;top:50%;left:50%;transform:translate(-50%,-50%);border:.313em solid var(--accent);
        background: radial-gradient(1em circle at center,rgb(236,236,236) 50%,transparent 51%),radial-gradient(1.25em circle at center,var(--bb8-bg) 50%,transparent 51%),linear-gradient(-90deg,transparent 42%,var(--accent) 42% 58%,transparent 58%),linear-gradient(var(--bb8-bg) 42%,var(--accent) 42% 58%,var(--bb8-bg) 58%);
      }
      .artificial__hidden { position:absolute;border-radius:inherit;inset:0;pointer-events:none;overflow:hidden; }
      .bb8__shadow { content:"";width:var(--bb8-diameter);height:20%;border-radius:50%;background:#3a271c;box-shadow:.313em 0 3.125em #3a271c;opacity:.25;position:absolute;bottom:0;left:calc(var(--toggle-offset) - .938em);transition:var(--transition);transform:skew(-70deg);z-index:1; }
      .bb8-toggle__scenery { width:100%;height:100%;pointer-events:none;overflow:hidden;position:relative;border-radius:inherit; }
      .bb8-toggle__scenery::before { content:"";position:absolute;width:100%;height:30%;bottom:0;background:#b18d71;z-index:1; }
      .bb8-toggle__cloud { z-index:1;position:absolute;border-radius:50%; }
      .bb8-toggle__cloud:nth-last-child(1) { width:.875em;height:.625em;filter:blur(.125em) drop-shadow(.313em .313em #ffffffae) drop-shadow(-.625em 0 #fff) drop-shadow(-.938em -.125em #fff);right:1.875em;top:2.813em;background:linear-gradient(to top right,#ffffffae,#ffffffae);transition:var(--transition); }
      .bb8-toggle__cloud:nth-last-child(2) { top:.625em;right:4.375em;width:.875em;height:.375em;background:#dfdedeae;filter:blur(.125em) drop-shadow(-.313em -.188em #e0dfdfae) drop-shadow(-.625em -.188em #bbbbbbae) drop-shadow(-1em .063em #cfcfcfae);transition:.6s; }
      .bb8-toggle__cloud:nth-last-child(3) { top:1.25em;right:.938em;width:.875em;height:.375em;background:#ffffffae;filter:blur(.125em) drop-shadow(.438em .188em #ffffffae) drop-shadow(-.625em .313em #ffffffae);transition:.8s; }
      .gomrassen,.hermes,.chenini { position:absolute;border-radius:var(--radius);background:linear-gradient(#fff,#6e8ea2);top:100%; }
      .gomrassen { left:.938em;width:1.875em;height:1.875em;box-shadow:0 0 .188em #ffffff52,0 0 .188em #6e8ea24b;transition:var(--transition); }
      .gomrassen::before,.gomrassen::after { content:"";position:absolute;border-radius:inherit;box-shadow:inset 0 0 .063em rgb(140,162,169);background:rgb(184,196,200); }
      .gomrassen::before { left:.313em;top:.313em;width:.438em;height:.438em; }
      .gomrassen::after { width:.25em;height:.25em;left:1.25em;top:.75em; }
      .hermes { left:3.438em;width:.625em;height:.625em;box-shadow:0 0 .125em #ffffff52,0 0 .125em #6e8ea24b;transition:.6s; }
      .chenini { left:4.375em;width:.5em;height:.5em;box-shadow:0 0 .125em #ffffff52,0 0 .125em #6e8ea24b;transition:.8s; }
      .tatto-1,.tatto-2 { position:absolute;width:1.25em;height:1.25em;border-radius:var(--radius); }
      .tatto-1 { background:#fefefe;right:3.125em;top:.625em;box-shadow:0 0 .438em #fdf4e1;transition:var(--transition); }
      .tatto-2 { background:linear-gradient(#e6ac5c,#d75449);right:1.25em;top:2.188em;box-shadow:0 0 .438em #e6ad5c3d,0 0 .438em #d755494f;transition:.7s; }
      .bb8-toggle__star { position:absolute;width:.063em;height:.063em;background:#fff;border-radius:var(--radius);filter:drop-shadow(0 0 .063em #fff);color:#fff;top:100%; }
      .bb8-toggle__star:nth-child(1){left:3.75em;box-shadow:1.25em .938em,-1.25em 2.5em,0 1.25em,1.875em .625em,-3.125em 1.875em,1.25em 2.813em;transition:.2s;}
      .bb8-toggle__star:nth-child(2){left:4.688em;box-shadow:.625em 0,0 .625em,-.625em -.625em,.625em .938em,-3.125em 1.25em,1.25em -1.563em;transition:.3s;}
      .bb8-toggle__star:nth-child(3){left:5.313em;box-shadow:-.625em -.625em,-2.188em 1.25em,-2.188em 0,-3.75em -.625em,-3.125em -.625em,-2.5em -.313em,.75em -.625em;transition:var(--transition);}
      .bb8-toggle__star:nth-child(4){left:1.875em;width:.125em;height:.125em;transition:.5s;}
      .bb8-toggle__star:nth-child(5){left:5em;width:.125em;height:.125em;transition:.6s;}
      .bb8-toggle__star:nth-child(6){left:2.5em;width:.125em;height:.125em;transition:.7s;}
      .bb8-toggle__star:nth-child(7){left:3.438em;width:.125em;height:.125em;transition:.8s;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(1){top:.625em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(2){top:1.875em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(3){top:1.25em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(4){top:3.438em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(5){top:3.438em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(6){top:.313em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__star:nth-child(7){top:1.875em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8-toggle__cloud{right:-100%;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .gomrassen{top:.938em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .hermes{top:2.5em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .chenini{top:2.75em;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container{background-position-y:0;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .tatto-1{top:100%;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .tatto-2{top:100%;}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8{left:calc(100% - var(--bb8-diameter) - var(--toggle-offset));}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8__shadow{left:calc(100% - var(--bb8-diameter) - var(--toggle-offset) + .938em);transform:skew(70deg);}
      .bb8-toggle__checkbox:checked+.bb8-toggle__container .bb8__body{transform:rotate(225deg);}
      .bb8-toggle__checkbox:hover+.bb8-toggle__container .bb8__head::before{left:100%;}
      .bb8-toggle__checkbox:not(:checked):hover+.bb8-toggle__container .bb8__antenna:nth-child(1){right:1.5em;}
      .bb8-toggle__checkbox:hover+.bb8-toggle__container .bb8__antenna:nth-child(2){left:.938em;}
      .bb8-toggle__checkbox:hover+.bb8-toggle__container .bb8__head::after{background-position:1.375em 0;}
      .bb8-toggle__checkbox:checked:hover+.bb8-toggle__container .bb8__head::before{left:0;}
      .bb8-toggle__checkbox:checked:hover+.bb8-toggle__container .bb8__antenna:nth-child(2){left:calc(100% - .938em);}
      .bb8-toggle__checkbox:checked:hover+.bb8-toggle__container .bb8__head::after{background-position:-1.375em 0;}
      .bb8-toggle__checkbox:active+.bb8-toggle__container .bb8__head-container{transform:rotate(25deg);}
      .bb8-toggle__checkbox:checked:active+.bb8-toggle__container .bb8__head-container{transform:rotate(-25deg);}
    `}</style>
  </div>
);

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
const QueuePanel = ({ queue, currentIndex, client }) => {
  if (!queue.length) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-serif italic text-2xl text-white/15">Queue is empty</p>
    </div>
  );

  return (
    <div className="overflow-y-auto h-full pb-12" style={{ scrollbarWidth: 'none' }}>
      <div className="px-2 py-4 flex flex-col gap-0.5">
        {queue.map((song, i) => {
          const isCurrent = i === currentIndex;
          const coverUrl = song?.coverArt && client ? client.getCoverArtUrl(song.coverArt, 64) : null;
          return (
            <div
              key={`${i}-${song.id}`}
              className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-default ${
                isCurrent
                  ? 'bg-[#c0392b]/20 border border-[#c0392b]/25'
                  : 'hover:bg-[#c0392b]/10 hover:border hover:border-[#c0392b]/15 border border-transparent'
              }`}
            >
              <div className="w-5 text-center flex-shrink-0">
                {isCurrent
                  ? <span className="text-[#c0392b] text-xs">▶</span>
                  : <span className="text-white/20 text-[11px] font-mono group-hover:text-[#c0392b]/60 transition-colors">{i + 1}</span>}
              </div>
              <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-white/5">
                {coverUrl ? <img src={coverUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate font-sans transition-colors ${
                  isCurrent
                    ? 'text-white font-semibold'
                    : 'text-white/65 group-hover:text-[#e8623a] group-hover:font-medium'
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
    currentSong, isPlaying, position, duration, volume, queue,
    play, pause, next, prev, seek, setVolume,
    shuffleMode, shufflePending, enableSmartShuffle, enableDumbShuffle, disableShuffle,
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

  const { lines, currentLineIndex, isSynced, isLoading: lyricsLoading, error: lyricsError, handleScroll, registerLineRef } = useLyrics(currentSong, (position || 0) * 1000);

  /* ── Progress range ── */
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
    else if (shuffleMode === 'dumb') void enableSmartShuffle(); // S6: no queue arg
    else disableShuffle();
  }, [shuffleMode, shufflePending, enableDumbShuffle, enableSmartShuffle, disableShuffle]);

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
  const shuffleColor = shuffleMode === 'smart' ? '#ff8c00' : shuffleMode === 'dumb' ? '#dc143c' : null;

  const handleAI = useCallback(() => { fetchNext({ current: currentSong?.title }); }, [fetchNext, currentSong?.title]);
  const handleResetSession = useCallback(async () => { await resetSession(currentSong?.title); }, [resetSession, currentSong?.title]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[60] flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0,0,1)] ${nowPlayingExpanded ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'}`}
      aria-hidden={!nowPlayingExpanded}
    >
      {/* Full-bleed fluid background — NO overlay tint at all */}
      <div className="absolute inset-0">
        <FluidBackground song={currentSong} />
      </div>

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-5 pb-3 flex-shrink-0">
        <button type="button" onClick={closeOverlay}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all"
          aria-label="Close">
          <X size={18} />
        </button>

        <div className="text-center">
          {queueSource === 'model' && <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35">AI · Recommended</p>}
          {queueSource === 'cold_start' && <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c0392b]/70">AI · Discovery</p>}
          {isConfigured && (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`w-1 h-1 rounded-full ${isHealthy ? 'bg-white/30' : 'bg-[#c0392b]/50'}`} />
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/20">
                {isHealthy ? `AI${health?.librarySize ? ` · ${health.librarySize.toLocaleString()} songs` : ''}` : 'AI · Offline'}
              </span>
            </div>
          )}
        </div>

        <button type="button" onClick={() => currentSong && toggleStarSong(client, currentSong)}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 text-white/40 hover:text-white transition-all"
          aria-label={isStarred ? 'Unstar' : 'Star'}>
          <Heart size={17} className={isStarred ? 'fill-[#c0392b] text-[#c0392b]' : ''} />
        </button>
      </div>

      {/* ── Two-column body ── */}
      <div className="relative z-10 flex-1 min-h-0 flex gap-0 px-4 pb-6">

        {/* ══ LEFT — Player ══ */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-8 gap-7">

          {/* Album art */}
          <div className="np-reveal flex-shrink-0">
            <div className="rounded-2xl overflow-hidden"
              style={{ width: 'min(320px, 34vw)', height: 'min(320px, 34vw)', boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.6)' }}>
              <img src={coverUrl} alt={currentSong?.title || 'Album art'} className="w-full h-full object-cover"
                style={{ transform: isPlaying ? 'scale(1.03)' : 'scale(1)', transition: 'transform 1s ease' }} />
            </div>
          </div>

          {/* Track info */}
          <div className="np-reveal w-full max-w-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif italic text-3xl text-white font-bold truncate leading-tight drop-shadow-lg">
                  {currentSong?.title || 'No track selected'}
                </h1>
                <p className="font-mono text-[11px] text-white/50 uppercase tracking-[0.22em] mt-1.5 truncate">
                  {currentSong?.artist || '—'}
                </p>
                {currentSong?.album && (
                  <p className="font-sans text-xs text-white/30 mt-0.5 truncate">{currentSong.album}</p>
                )}
              </div>
              <button type="button" onClick={handleAI}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all hover:scale-105 active:scale-95 mt-1"
                style={{ background: 'rgba(192,57,43,0.25)', border: '1px solid rgba(192,57,43,0.45)', color: '#e34262' }}
                aria-label="AI next">
                <Sparkles size={10} /><span>AI✦</span>
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="np-reveal w-full max-w-xs">
            <input ref={rangeRef} type="range" className="player-range w-full" min="0" max="100" step="0.05" defaultValue="0"
              onMouseDown={onRangeDown} onTouchStart={onRangeDown} onMouseUp={onRangeUp} onTouchEnd={onRangeUp} onChange={onRangeChange} aria-label="Seek" />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] font-mono text-white/30 tabular-nums">{fmt(position)}</span>
              <span className="text-[10px] font-mono text-white/30 tabular-nums">{fmt(duration)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="np-reveal w-full max-w-xs">
            <div className="flex items-center justify-between">
              <button type="button" onClick={toggleShuffle}
                style={{ color: shuffleColor || 'rgba(255,255,255,0.35)' }}
                className="transition-all hover:scale-110 active:scale-95 hover:text-white/70" aria-label="Shuffle">
                <Shuffle size={19} />
              </button>
              <button type="button" onClick={() => prev()}
                className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95" aria-label="Previous">
                <SkipBack size={28} className="fill-current" />
              </button>
              <button type="button" onClick={() => isPlaying ? pause() : play()}
                className="w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg,#c0392b,#8b0000)', boxShadow: '0 0 36px rgba(192,57,43,0.6)' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={28} className="fill-white text-white" /> : <Play size={28} className="fill-white text-white ml-1" />}
              </button>
              <button type="button" onClick={() => next()}
                className="text-white/70 hover:text-white transition-all hover:scale-110 active:scale-95" aria-label="Next">
                <SkipForward size={28} className="fill-current" />
              </button>
              <button type="button" onClick={cycleRepeat}
                style={{ color: repeatMode !== 'none' ? '#c0392b' : 'rgba(255,255,255,0.35)' }}
                className="transition-all hover:scale-110 active:scale-95" aria-label="Repeat">
                <RepeatIcon size={19} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 mt-6">
              <VolumeX size={13} className="text-white/25 flex-shrink-0" />
              <input ref={volRef} type="range" className="player-range flex-1" min="0" max="100" step="1"
                defaultValue={Math.round(volume * 100)}
                onChange={(e) => { const v = parseFloat(e.target.value) / 100; setVolume(v); e.target.style.setProperty('--pct', (v * 100).toFixed(2)); }}
                aria-label="Volume" />
              <Volume2 size={13} className="text-white/25 flex-shrink-0" />
            </div>

            {isConfigured && sessionStatus && (
              <div className="flex items-center justify-center gap-3 mt-4 font-mono text-[9px] text-white/20 uppercase tracking-[0.15em]">
                <span>Session · {sessionStatus.songCount} songs</span>
                <button type="button" onClick={handleResetSession} className="hover:text-white/45 underline underline-offset-2">Reset</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="w-px bg-white/10 flex-shrink-0 my-6 mx-3" />

        {/* ══ RIGHT — Lyrics / Queue ══ */}
        <div className="np-reveal flex flex-col w-[360px] flex-shrink-0 min-h-0">

          {/* BB8 Toggle header */}
          <div className="flex items-center justify-center pt-4 pb-5 flex-shrink-0">
            <BB8Toggle showLyrics={showLyrics} onChange={setShowLyrics} />
          </div>

          {/* Panel — NO background, NO glass, pure content on the fluid bg */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {showLyrics ? (
              <LyricsPanel
                lines={lines} currentLineIndex={currentLineIndex} isSynced={isSynced}
                isLoading={lyricsLoading} error={lyricsError}
                handleScroll={handleScroll} registerLineRef={registerLineRef} seek={seek}
              />
            ) : (
              <QueuePanel queue={queue} currentIndex={currentIndex ?? 0} client={client} />
            )}
          </div>
        </div>
      </div>

      <AddToPlaylistDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} songsToAdd={currentSong ? [currentSong] : []} />
    </div>
  );
};