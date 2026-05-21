/**
 * PlayerBar.jsx
 * Premium, glassmorphic floating player bar.
 */

import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23000"/><circle cx="200" cy="200" r="120" fill="%23111"/><circle cx="200" cy="200" r="18" fill="%23dc143c"/></svg>';

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
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] z-[70] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          nowPlayingExpanded ? 'opacity-0 pointer-events-none translate-y-10 scale-95' : 'opacity-100 translate-y-0 scale-100'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Outer Glow Wrapper */}
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-coral/40 via-mustard/20 to-black opacity-30 blur-xl pointer-events-none" />
        
        <div
          role="button"
          tabIndex={0}
          onClick={openOverlay}
          onKeyDown={(event) => {
            if (event.key === 'Enter') openOverlay();
          }}
          className="relative w-full bg-paper/60 backdrop-blur-2xl rounded-[2rem] px-3 py-3 flex items-center gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border border-ink/5 overflow-hidden"
        >
          {/* Subtle inner mesh/gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

          {/* Art */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-paper-dark shadow-[0_0_15px_rgba(220,20,60,0.4)] flex-shrink-0">
            <img 
              src={coverUrl} 
              alt={currentSong?.title || 'Cover'} 
              className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'animate-spin-slow' : ''}`} 
              style={{ animationDuration: '8s' }}
            />
            {/* Vinyl inner hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-paper rounded-full shadow-inner border border-white/10" />
          </div>

          <div className="flex-1 min-w-0 text-left z-10 pl-1">
            <div className="font-serif italic font-bold text-sm text-ink truncate drop-shadow-md">{currentSong?.title || 'No track selected'}</div>
            <div className="font-sans text-[11px] font-medium text-ink/60 truncate uppercase tracking-widest">{currentSong?.artist || '—'}</div>
          </div>
          
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              isPlaying ? pause() : play();
            }}
            className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-br from-coral to-mustard text-paper flex items-center justify-center shadow-[0_0_20px_rgba(220,20,60,0.5)] hover:scale-105 active:scale-95 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} className="fill-paper" /> : <Play size={20} className="fill-paper ml-1" />}
          </button>

          {/* Minimal Mobile Progress Bar mapped to border */}
          <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-coral to-mustard" style={{ width: `${duration ? (position/duration)*100 : 0}%`, transition: 'width 0.2s linear' }} />
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`fixed z-[50] bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        nowPlayingExpanded ? 'opacity-0 pointer-events-none translate-y-12 scale-95' : 'opacity-100 translate-y-0 scale-100 group'
      } cursor-pointer`}
      onClick={openOverlay}
    >
      {/* Outer Glow Background */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-r from-coral/30 via-mustard/15 to-black opacity-30 group-hover:opacity-60 transition-opacity duration-700 blur-2xl pointer-events-none" />
      
      {/* Main Glassmorphic Island */}
      <div className="relative h-[90px] w-full rounded-[2.5rem] bg-paper/50 backdrop-blur-[40px] border border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] flex items-center justify-between px-8 overflow-hidden group-hover:border-white/10 transition-colors">
        
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none rounded-[2.5rem]" />

        {/* --- LEFT: Art & Info --- */}
        <div className="relative z-10 flex items-center gap-5 w-1/3 min-w-0">
           {/* Spinning Vinyl Cover Art */}
           <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-paper flex-shrink-0 shadow-[0_0_25px_rgba(220,20,60,0.3)] group-hover:shadow-[0_0_35px_rgba(220,20,60,0.5)] transition-shadow duration-500">
              <img 
                src={coverUrl} 
                alt="cover" 
                className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'animate-spin-slow' : ''}`}
                style={{ animationDuration: '8s' }}
              />
              {/* Vinyl inner hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-paper rounded-full shadow-inner border border-white/10" />
           </div>
           
           <div className="min-w-0 flex-1 pr-4">
             <div className="text-ink font-serif italic text-lg font-bold truncate tracking-wide drop-shadow-md">
               {currentSong?.title || 'No track selected'}
             </div>
             <div className="text-ink/50 font-sans text-xs font-semibold uppercase tracking-[0.2em] mt-0.5 truncate">
               {currentSong?.artist || '—'}
             </div>
           </div>
        </div>

        {/* --- CENTER: Controls & Progress --- */}
        <div className="relative z-10 flex flex-col items-center justify-center w-1/3" onClick={e => e.stopPropagation()}>
           <div className="flex items-center gap-8">
             <button onClick={(e) => { e.stopPropagation(); prev(); }} className="text-ink/60 hover:text-coral transition-colors hover:scale-110 active:scale-95">
               <SkipBack size={22} className="fill-current"/>
             </button>
             
             {/* Play Button - Emphasized with Gradient */}
             <button 
               onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : play(); }} 
               className="w-12 h-12 rounded-full bg-gradient-to-br from-coral to-mustard text-paper flex items-center justify-center shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:shadow-[0_0_30px_rgba(220,20,60,0.6)] hover:scale-110 active:scale-95 transition-all duration-300"
             >
               {isPlaying ? <Pause size={24} className="fill-paper"/> : <Play size={24} className="fill-paper ml-1"/>}
             </button>
             
             <button onClick={(e) => { e.stopPropagation(); next(); }} className="text-ink/60 hover:text-coral transition-colors hover:scale-110 active:scale-95">
               <SkipForward size={22} className="fill-current"/>
             </button>
           </div>
           
           {/* Elevated Progress Bar */}
           <div className="w-full max-w-[360px] flex items-center gap-4 mt-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-[10px] font-mono text-ink/40 w-9 text-right tracking-wider">
                {position ? Math.floor(position/60)+':'+String(Math.floor(position%60)).padStart(2,'0') : '0:00'}
              </span>
              
              <div 
                className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden cursor-pointer hover:h-2 transition-all relative border border-white/5"
                onClick={e => {
                  if (!duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek(((e.clientX - rect.left) / rect.width) * duration);
                }}
              >
                 <div 
                   className="absolute top-0 left-0 h-full bg-gradient-to-r from-coral to-mustard rounded-full shadow-[0_0_10px_rgba(220,20,60,0.8)]" 
                   style={{ width: `${duration ? (position/duration)*100 : 0}%`, transition: 'width 0.2s linear' }} 
                 />
              </div>
              
              <span className="text-[10px] font-mono text-ink/40 w-9 tracking-wider">
                {duration ? Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0') : '0:00'}
              </span>
           </div>
        </div>

        {/* --- RIGHT: Extras --- */}
        <div className="relative z-10 flex items-center justify-end gap-6 w-1/3" onClick={e => e.stopPropagation()}>
           <button 
             onClick={toggleShuffle} 
             className={`transition-all duration-300 hover:scale-110 active:scale-95 ${shuffleMode !== 'none' ? 'text-mustard drop-shadow-[0_0_8px_rgba(255,140,0,0.5)]' : 'text-ink/40 hover:text-ink'}`}
             title={shuffleMode === 'dumb' ? 'Normal Shuffle' : shuffleMode === 'smart' ? 'Smart Shuffle' : 'Shuffle Off'}
           >
             <Shuffle size={20} />
           </button>
           
           <button 
             onClick={cycleLoop} 
             className={`transition-all duration-300 hover:scale-110 active:scale-95 ${repeatMode !== 'none' ? 'text-coral drop-shadow-[0_0_8px_rgba(220,20,60,0.5)]' : 'text-ink/40 hover:text-ink'}`}
             title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
           >
             <Repeat size={20} />
           </button>
        </div>
      </div>
    </footer>
  );
};
