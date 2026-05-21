import React from 'react';
import { SkipBack, SkipForward, Play, Pause, Heart, Repeat, Shuffle, Volume2 } from 'lucide-react';
import { usePlayer } from '../../hooks/usePlayer';
import { useLibraryStore } from '../../store/libraryStore';
import { useSubsonic } from '../../hooks/useSubsonic';
import { ProgressBar } from '../player/ProgressBar';
import { VolumeSlider } from '../player/VolumeSlider';

const FALLBACK_COVER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23111"/><circle cx="200" cy="200" r="120" fill="%23222"/><circle cx="200" cy="200" r="18" fill="%23333"/></svg>';

export const SpotifyCard = () => {
  const client = useSubsonic();
  const {
    currentSong,
    isPlaying,
    play,
    pause,
    next,
    prev,
    shuffleMode,
    shufflePending,
    enableSmartShuffle,
    enableDumbShuffle,
    disableShuffle,
    repeatMode,
    setRepeatMode,
  } = usePlayer();


  const { toggleStarSong, isSongStarred } = useLibraryStore();
  const isStarred = currentSong ? isSongStarred(currentSong.id) : false;

  const coverUrl = currentSong?.coverArt && client ? client.getCoverArtUrl(currentSong.coverArt, 600) : FALLBACK_COVER;

  const toggleShuffle = () => {
    if (shufflePending) return; // C3: reject while AI fetch in flight
    if (shuffleMode === 'none') enableDumbShuffle();
    else if (shuffleMode === 'dumb') void enableSmartShuffle(); // S6: no queue arg
    else disableShuffle();
  };


  const cycleLoop = () => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  return (
    <div className="w-full max-w-[420px] mx-auto bg-ink/40 backdrop-blur-3xl border border-paper/10 p-7 rounded-[2.5rem] shadow-2xl overflow-hidden relative isolate">
      {/* Background glow based on theme */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-coral/20 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-mustard/15 rounded-full blur-[80px] pointer-events-none -z-10" />
      
      {/* Album Art */}
      <div className="relative w-full aspect-square mb-8 group rounded-2xl overflow-hidden shadow-xl border border-white/5">
        <img 
          src={coverUrl} 
          alt={currentSong?.title || 'Cover'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Info */}
      <div className="flex items-center justify-between mb-7">
        <div className="min-w-0 flex-1 pr-4">
          <h2 className="text-2xl font-bold text-paper truncate font-sans tracking-tight">
            {currentSong?.title || 'No track playing'}
          </h2>
          <p className="text-paper/60 text-base truncate font-sans mt-1">
            {currentSong?.artist || '—'}
          </p>
        </div>
        <button 
          onClick={() => { if (client && currentSong) toggleStarSong(client, currentSong); }}
          className="text-paper/60 hover:text-coral transition-colors flex-shrink-0"
        >
          {isStarred ? <Heart className="fill-coral text-coral" size={26} /> : <Heart size={26} />}
        </button>
      </div>

      {/* Progress */}
      <div className="mb-7">
        <ProgressBar light />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-7">
        <button 
          onClick={toggleShuffle} 
          className={`transition-colors ${shuffleMode !== 'none' ? 'text-coral' : 'text-paper/50 hover:text-paper'}`}
        >
          <Shuffle size={22} />
        </button>
        <button onClick={prev} className="text-paper hover:text-coral transition-colors">
          <SkipBack size={32} className="fill-current" />
        </button>
        <button 
          onClick={isPlaying ? pause : play} 
          className="w-[72px] h-[72px] rounded-full bg-paper text-ink hover:scale-105 transition-transform flex items-center justify-center shadow-lg hover:shadow-coral/20"
        >
          {isPlaying ? <Pause size={32} className="fill-ink" /> : <Play size={32} className="fill-ink ml-1" />}
        </button>
        <button onClick={next} className="text-paper hover:text-coral transition-colors">
          <SkipForward size={32} className="fill-current" />
        </button>
        <button 
          onClick={cycleLoop} 
          className={`transition-colors ${repeatMode !== 'none' ? 'text-coral' : 'text-paper/50 hover:text-paper'}`}
        >
          <Repeat size={22} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 text-paper/50 px-2">
        <Volume2 size={18} />
        <VolumeSlider className="text-paper" />
      </div>
    </div>
  );
};
