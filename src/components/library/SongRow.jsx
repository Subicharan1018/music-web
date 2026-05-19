/**
 * SongRow.jsx
 * Row component for displaying a song in lists.
 */
import { useState } from 'react';
import { useSubsonic } from '../../hooks/useSubsonic';
import { usePlayAction } from '../../hooks/usePlayAction';
import { usePlayerStore } from '../../store/playerStore';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SongRow = ({ song, index, contextSongs = [] }) => {
  const client = useSubsonic();
  const { playSong } = usePlayAction();
  const currentSong = usePlayerStore(state => state.currentSong);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  
  const [isStarred, setIsStarred] = useState(!!song.starred);

  const isCurrent = currentSong?.id === song.id;

  const handleDoubleClick = () => {
    playSong(song, contextSongs);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      playSong(song, contextSongs);
    }
  };

  const handleStar = async (e) => {
    e.stopPropagation();
    if (!client) return;
    try {
      if (isStarred) {
        await client.unstar(song.id, 'song');
        setIsStarred(false);
      } else {
        await client.star(song.id, 'song');
        setIsStarred(true);
      }
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  return (
    <div 
      className="group flex items-center gap-4 py-2 px-2 -mx-2 rounded hover:bg-ink/5 transition-colors cursor-default"
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="w-8 text-right font-mono text-xs text-ink-faint shrink-0">
        {isCurrent ? (
          <span className={`text-[var(--accent)] ${isPlaying ? 'animate-pulse' : ''}`}>▮▮</span>
        ) : (
          index + 1
        )}
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className={`font-sans text-sm truncate ${isCurrent ? 'text-[var(--accent)] font-semibold' : 'text-ink'}`}>
          {song.title}
        </div>
        <div className="font-sans text-xs text-ink-mute truncate">
          {song.artist}
        </div>
      </div>
      
      <div className="font-mono text-xs text-ink-faint shrink-0 w-12 text-right">
        {formatDuration(song.duration)}
      </div>
      
      <div className={`shrink-0 flex items-center justify-end w-8 transition-opacity ${isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
        <button 
          onClick={handleStar}
          className={`p-1 transition-colors ${isStarred ? 'text-[var(--accent)]' : 'text-ink-mute hover:text-[var(--accent)]'}`}
          title={isStarred ? "Unstar" : "Star"}
        >
          {isStarred ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
