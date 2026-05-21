/**
 * SongRow.jsx
 * Row component for displaying a song in lists.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useSubsonic } from '../../hooks/useSubsonic';
import { usePlayAction } from '../../hooks/usePlayAction';
import { usePlayerStore } from '../../store/playerStore';
import { useLibraryStore } from '../../store/libraryStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { AddToPlaylistDialog } from '../playlists/AddToPlaylistDialog';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const SongRow = ({ song, index, contextSongs = [], context = 'library', onRemove }) => {
  const client = useSubsonic();
  const { playSong } = usePlayAction();
  const currentSong = usePlayerStore(state => state.currentSong);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  
  // Library store handles favorites now
  const { toggleStarSong, isSongStarred } = useLibraryStore();
  const isStarred = isSongStarred(song.id);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const menuRef = useRef(null);

  const isCurrent = currentSong?.id === song.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `song-${song.id}-${index}`, // Need index to make it unique in playlist if duplicates exist
    disabled: context !== 'playlist'
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

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
    toggleStarSong(client, song);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const coverUrl = client ? client.getCoverArtUrl(song.coverArt, 48) : null;

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        className={`reveal-item group flex items-center gap-3 py-2 px-2 -mx-2 rounded cursor-default ${
          isCurrent ? 'bg-paper-raised' : 'hover:bg-white/[0.03] transition-colors'
        } ${isDragging ? 'shadow-md bg-paper' : ''}`}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {context === 'playlist' ? (
          <div 
            className="w-6 shrink-0 text-ink-mute hover:text-ink cursor-grab active:cursor-grabbing flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            {...attributes} 
            {...listeners}
          >
            <GripVertical size={16} />
          </div>
        ) : (
          <div className="w-8 text-right font-mono text-xs text-ink-faint shrink-0">
            {isCurrent ? (
              <span className={`text-[var(--accent)] ${isPlaying ? 'animate-pulse' : ''}`}>▮▮</span>
            ) : (
              index + 1
            )}
          </div>
        )}

        {(context === 'playlist' || context === 'favorites') && (
          <div className="w-6 h-6 bg-paper-dark rounded-sm flex-shrink-0 overflow-hidden">
            {coverUrl && <img src={coverUrl} alt="Cover" loading="lazy" className="w-full h-full object-cover" />}
          </div>
        )}
        
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
        
        <div className="shrink-0 flex items-center justify-end w-24 gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button 
            onClick={handleStar}
            className={`p-1 transition-colors ${isStarred ? 'text-[var(--accent)] opacity-100' : 'text-ink-mute hover:text-[var(--accent)]'}`}
            title={isStarred ? "Unstar" : "Star"}
            style={{ opacity: isStarred ? 1 : undefined }}
          >
            {isStarred ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
          </button>

          {context === 'playlist' && onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(index); }}
              className="p-1 text-ink-mute hover:text-coral transition-colors"
              title="Remove from Playlist"
            >
              <Trash2 size={16} />
            </button>
          )}

          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1 text-ink-mute hover:text-ink transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 z-20"
                style={{ background: 'rgba(10,10,10,0.97)', border: '1px solid rgba(220,20,60,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    setShowAddDialog(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-sans text-ink/70 hover:text-ink hover:bg-white/[0.04] flex items-center gap-2 transition-colors"
                >
                  <Plus size={14} />
                  Add to Playlist
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddToPlaylistDialog 
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        songsToAdd={[song]}
      />
    </>
  );
};