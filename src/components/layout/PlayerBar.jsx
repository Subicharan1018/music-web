/**
 * PlayerBar.jsx
 * Fixed bottom bar for media controls, styled in Atelier Zero.
 */

import React, { useEffect } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { useSubsonic } from '../../hooks/useSubsonic';
import { useUIStore } from '../../store/uiStore';
import { paletteService } from '../../services/PaletteService';
import { ProgressBar } from '../player/ProgressBar';
import { VolumeSlider } from '../player/VolumeSlider';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, ListVideo, Heart, Sparkles } from 'lucide-react';

export const PlayerBar = () => {
  const { 
    currentSong, isPlaying, 
    play, pause, next, prev, 
    shuffleMode, enableSmartShuffle, enableDumbShuffle, disableShuffle,
    repeatMode, setRepeatMode 
  } = usePlayer();
  
  const client = useSubsonic();
  const { queueOpen, setQueueOpen } = useUIStore();

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleRepeatClick = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const handleShuffleClick = () => {
    if (shuffleMode === 'none') {
      enableDumbShuffle();
    } else if (shuffleMode === 'dumb') {
      enableSmartShuffle();
    } else {
      disableShuffle();
    }
  };

  const getShuffleIcon = () => {
    if (shuffleMode === 'smart') {
      return <Sparkles size={16} />;
    }
    return <Shuffle size={16} />;
  };

  const getShuffleColorClass = () => {
    if (shuffleMode === 'smart') return 'text-[var(--accent)] hover:brightness-110';
    if (shuffleMode === 'dumb') return 'text-[var(--accent)] hover:brightness-110';
    return 'text-ink-mute hover:text-[var(--accent)]';
  };

  const coverUrl = currentSong && client ? client.getCoverArtUrl(currentSong.coverArt, 300) : null;

  useEffect(() => {
    if (!coverUrl) return;
    let isMounted = true;
    
    const applyPalette = async () => {
       const palette = await paletteService.getPalette(coverUrl);
       if (isMounted && palette?.primary) {
         document.documentElement.style.setProperty('--accent', palette.primary);
       }
    };
    applyPalette();

    return () => {
      isMounted = false;
      document.documentElement.style.setProperty('--accent', '#ed6f5c');
    };
  }, [coverUrl]);

  return (
    <footer 
      className="fixed bottom-0 left-0 w-full h-20 bg-paper-warm border-t border-ink/16 flex items-center justify-between px-6 z-50 transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      
      {/* Left: Album Art + Song Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-12 h-12 bg-paper-dark rounded-sm flex-shrink-0 overflow-hidden relative shadow-sm">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-mute text-[10px] uppercase">No Art</div>
          )}
          {isPlaying && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse shadow-sm"></div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="font-serif text-sm italic text-ink truncate">
            {currentSong ? currentSong.title : 'No track selected'}
          </div>
          <div className="font-sans text-xs text-ink-faint truncate">
            {currentSong ? currentSong.artist : '—'}
          </div>
        </div>
        <button className="text-ink-mute hover:text-[var(--accent)] transition-colors duration-[160ms] ease-in-out flex-shrink-0">
          <Heart size={16} />
        </button>
      </div>
      
      {/* Center: Transport + Progress */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl">
        <div className="flex items-center justify-center gap-6 mb-1">
          <button 
            className="text-ink hover:text-[var(--accent)] transition-colors duration-[160ms] ease-in-out"
            onClick={prev}
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          
          <button 
            className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-[var(--accent)] transition-colors duration-[160ms] ease-in-out shadow-sm"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <button 
            className="text-ink hover:text-[var(--accent)] transition-colors duration-[160ms] ease-in-out"
            onClick={() => next(false)}
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
        
        <ProgressBar />
      </div>
      
      {/* Right: Volume + Extras */}
      <div className="w-1/3 flex items-center justify-end gap-5 pl-4">
        <span className="hidden lg:inline-block font-sans text-[10px] uppercase tracking-widest text-ink-faint mr-2">
          Volume · Extras
        </span>

        <button 
          onClick={handleShuffleClick}
          className={`transition-colors duration-[160ms] ease-in-out ${getShuffleColorClass()}`}
          title={`Shuffle: ${shuffleMode}`}
        >
          {getShuffleIcon()}
        </button>
        
        <button 
          onClick={handleRepeatClick}
          className={`transition-colors duration-[160ms] ease-in-out ${repeatMode !== 'none' ? 'text-[var(--accent)]' : 'text-ink-mute hover:text-[var(--accent)]'}`}
        >
          {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
        </button>

        <VolumeSlider className="w-24 hidden md:flex" />
        
        <button 
          onClick={() => setQueueOpen(!queueOpen)}
          className={`transition-colors duration-[160ms] ease-in-out ${queueOpen ? 'text-[var(--accent)]' : 'text-ink-mute hover:text-[var(--accent)]'}`}
        >
          <ListVideo size={16} />
        </button>
      </div>

    </footer>
  );
};
