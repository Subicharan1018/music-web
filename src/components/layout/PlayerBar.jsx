/**
 * PlayerBar.jsx
 * Now-playing dock with an elegant inline Tailwind design.
 */

import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23111"/><circle cx="200" cy="200" r="120" fill="%23222"/><circle cx="200" cy="200" r="18" fill="%23333"/></svg>';

export const PlayerBar = () => {
  const {
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
    setRepeatMode,
    queue
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
    if (shuffleMode === 'none') {
      enableDumbShuffle();
    } else if (shuffleMode === 'dumb') {
      void enableSmartShuffle(queue);
    } else {
      disableShuffle();
    }
  };

  const cycleLoop = (e) => {
    e.stopPropagation();
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const openOverlay = () => setNowPlayingExpanded(true);
  const coverUrl = currentSong?.coverArt && client ? client.getCoverArtUrl(currentSong.coverArt, 100) : FALLBACK_COVER;

  if (isMobile) {
    return (
      <footer
        className={`fixed bottom-0 left-0 w-full bg-transparent z-[70] px-4 pb-4 transition-opacity ${
          nowPlayingExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
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
          className="w-full bg-paper/90 backdrop-blur-xl border border-ink/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl"
        >
          <div className="w-11 h-11 rounded-lg overflow-hidden bg-ink/10 flex-shrink-0 shadow-md">
            <img src={coverUrl} alt={currentSong?.title || 'Cover'} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-sans font-bold text-sm text-ink truncate tracking-tight">{currentSong?.title || 'No track selected'}</div>
            <div className="font-sans text-xs text-ink/60 truncate">{currentSong?.artist || '—'}</div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              isPlaying ? pause() : play();
            }}
            className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} className="fill-paper" /> : <Play size={20} className="fill-paper ml-0.5" />}
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`z-[50] flex items-center justify-between transition-all duration-300 ${
        nowPlayingExpanded ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0 hover:bg-ink/80'
      } cursor-pointer group`}
      onClick={openOverlay}
      style={{ 
        gridArea: 'player', 
        height: '84px', 
        background: 'rgba(10, 10, 10, 0.85)', 
        backdropFilter: 'blur(30px)', 
        borderTop: '1px solid rgba(255,255,255,0.06)' 
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Left: Info */}
        <div className="flex items-center gap-4 w-1/3 min-w-0">
           <div className="w-14 h-14 rounded-xl overflow-hidden shadow-xl flex-shrink-0 border border-white/5 relative">
              <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none" />
           </div>
           <div className="min-w-0 flex-1 pr-4">
             <div className="text-paper font-sans font-semibold truncate group-hover:text-coral transition-colors">{currentSong?.title || 'No track selected'}</div>
             <div className="text-paper/50 font-sans text-sm truncate">{currentSong?.artist || '—'}</div>
           </div>
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center justify-center w-1/3" onClick={e => e.stopPropagation()}>
           <div className="flex items-center gap-6">
             <button onClick={prev} className="text-paper/60 hover:text-paper transition-colors hover:scale-110">
               <SkipBack size={20} className="fill-current"/>
             </button>
             <button 
               onClick={isPlaying ? pause : play} 
               className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
             >
               {isPlaying ? <Pause size={20} className="fill-ink"/> : <Play size={20} className="fill-ink ml-0.5"/>}
             </button>
             <button onClick={next} className="text-paper/60 hover:text-paper transition-colors hover:scale-110">
               <SkipForward size={20} className="fill-current"/>
             </button>
           </div>
           
           {/* Simple progress bar */}
           <div className="w-full max-w-md flex items-center gap-3 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-mono text-paper/40 w-8 text-right">
                {position ? Math.floor(position/60)+':'+String(Math.floor(position%60)).padStart(2,'0') : '0:00'}
              </span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all" onClick={e => {
                  if (!duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * duration);
              }}>
                 <div className="h-full bg-coral rounded-full" style={{ width: `${duration ? (position/duration)*100 : 0}%` }} />
              </div>
              <span className="text-[10px] font-mono text-paper/40 w-8">
                {duration ? Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0') : '0:00'}
              </span>
           </div>
        </div>

        {/* Right: Extra */}
        <div className="flex items-center justify-end gap-5 w-1/3" onClick={e => e.stopPropagation()}>
           <button onClick={toggleShuffle} className={`transition-colors hover:scale-110 ${shuffleMode !== 'none' ? 'text-coral' : 'text-paper/40 hover:text-paper'}`}>
             <Shuffle size={18} />
           </button>
           <button onClick={cycleLoop} className={`transition-colors hover:scale-110 ${repeatMode !== 'none' ? 'text-coral' : 'text-paper/40 hover:text-paper'}`}>
             <Repeat size={18} />
           </button>
        </div>
      </div>
    </footer>
  );
};
