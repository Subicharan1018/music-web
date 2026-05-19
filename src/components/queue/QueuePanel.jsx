/**
 * QueuePanel.jsx
 * Slide-in right panel displaying the active queue with drag-to-reorder.
 * Styled in Atelier Zero.
 */

import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { usePlayerStore } from '../../store/playerStore';
import { X, Trash2, GripVertical } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSubsonic } from '../../hooks/useSubsonic';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SortableQueueItem = ({ song, index, isCurrent, playSong, removeSong }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: `queue-${index}` 
  });
  
  const client = useSubsonic();
  const coverUrl = song && client ? client.getCoverArtUrl(song.coverArt, 50) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group flex items-center p-2 rounded-md mb-1 cursor-default ${
        isCurrent ? 'bg-paper-warm border-l-2 border-coral' : 'hover:bg-paper-warm/50 border-l-2 border-transparent'
      } ${isDragging ? 'shadow-md bg-paper' : ''}`}
    >
      <div 
        className="w-6 h-6 mr-2 flex items-center justify-center text-ink-mute hover:text-ink cursor-grab active:cursor-grabbing"
        {...attributes} 
        {...listeners}
      >
        <GripVertical size={16} />
      </div>
      
      <div 
        className="flex-1 flex items-center gap-3 overflow-hidden" 
        onDoubleClick={() => playSong(song)}
      >
        <div className="w-8 h-8 bg-paper-dark rounded-sm flex-shrink-0 overflow-hidden">
          {coverUrl && <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`font-serif text-sm truncate ${isCurrent ? 'text-coral italic' : 'text-ink'}`}>
            {song.title}
          </div>
          <div className="font-sans text-xs text-ink-mute truncate">
            {song.artist}
          </div>
        </div>
        
        <div className="font-mono text-xs text-ink-faint mr-2">
          {formatDuration(song.duration)}
        </div>
      </div>
      
      <button 
        onClick={() => removeSong(index)}
        className="opacity-0 group-hover:opacity-100 text-ink-mute hover:text-coral transition-opacity duration-160 p-1"
        title="Remove"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export const QueuePanel = () => {
  const { queueOpen, setQueueOpen } = useUIStore();
  const { queue, currentIndex, play, setQueue } = usePlayerStore();

  const handleClear = () => {
    setQueue([]);
  };

  const handleRemove = (index) => {
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueue(newQueue);
  };

  const handlePlay = (song) => {
    play(song);
  };

  const itemIds = queue.map((_, i) => `queue-${i}`);

  return (
    <aside 
      className={`fixed top-0 right-0 h-full w-80 bg-paper border-l border-ink/16 z-40 transition-transform duration-300 flex flex-col pb-player-bar shadow-[-4px_0_24px_rgba(0,0,0,0.05)] ${
        queueOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="h-16 border-b border-ink/16 flex items-center justify-between px-4 flex-shrink-0">
        <h2 className="font-serif text-xl font-bold text-ink italic">Up Next</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClear}
            className="text-xs font-sans text-ink-mute hover:text-coral transition-colors px-2 py-1"
          >
            Clear
          </button>
          <button 
            onClick={() => setQueueOpen(false)}
            className="text-ink-mute hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {queue.length === 0 ? (
          <div className="text-center text-ink-mute font-sans mt-10">
            Queue is empty
          </div>
        ) : (
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {queue.map((song, index) => (
              <SortableQueueItem 
                key={`queue-${index}`} 
                song={song} 
                index={index} 
                isCurrent={index === currentIndex}
                playSong={handlePlay}
                removeSong={handleRemove}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </aside>
  );
};
