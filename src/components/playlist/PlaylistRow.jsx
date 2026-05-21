import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Plus, X, GripVertical } from 'lucide-react';

gsap.registerPlugin(ScrambleTextPlugin);

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const EqualizerBars = () => (
  <div className="flex items-end justify-center gap-[2px] w-5 h-4 shrink-0">
    <div className="w-[3px] h-[50%] bg-coral rounded-t-sm animate-[eq1_1s_ease-in-out_infinite]" />
    <div className="w-[3px] h-[100%] bg-coral rounded-t-sm animate-[eq2_1.2s_ease-in-out_infinite]" />
    <div className="w-[3px] h-[30%] bg-coral rounded-t-sm animate-[eq3_0.9s_ease-in-out_infinite]" />
  </div>
);

export const PlaylistRow = ({
  song,
  index,
  sortableId,
  isPlaying,
  isActive,       // hovered in portfolio sense
  isDragging,
  onMouseEnter,
  onMouseLeave,
  onPlay,
  onAddToQueue,
  onRemove,
  coverArtUrl,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  // Refs for GSAP ScrambleText
  const artistRef = useRef(null);
  const titleRef  = useRef(null);
  const albumRef  = useRef(null);
  const genreRef  = useRef(null);
  const yearRef   = useRef(null);
  const durationRef = useRef(null);

  const fields = [
    { ref: artistRef,   key: 'artist' },
    { ref: titleRef,    key: 'title' },
    { ref: albumRef,    key: 'album' },
    { ref: genreRef,    key: 'genre' },
    { ref: yearRef,     key: 'year' },
    { ref: durationRef, key: 'duration' },
  ];

  const songValues = {
    artist:   song.artist   || '—',
    title:    song.title    || 'Unknown',
    album:    song.album    || '—',
    genre:    song.genre    || '—',
    year:     song.year?.toString() || '—',
    duration: formatDuration(song.duration),
  };

  useEffect(() => {
    if (isActive && !isSortableDragging) {
      fields.forEach(({ ref, key }) => {
        if (!ref.current) return;
        gsap.killTweensOf(ref.current);
        gsap.to(ref.current, {
          duration: 0.7,
          scrambleText: {
            text: songValues[key],
            chars: SCRAMBLE_CHARS,
            revealDelay: 0.25,
            speed: 0.45,
          },
        });
      });
    } else {
      fields.forEach(({ ref, key }) => {
        if (!ref.current) return;
        gsap.killTweensOf(ref.current);
        ref.current.textContent = songValues[key];
      });
    }
  }, [isActive, isSortableDragging]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li
      ref={setNodeRef}
      style={{ ...style, minHeight: '52px' }}
      className={`group relative flex items-center gap-2 border-b border-ink/10 text-paper font-sans uppercase text-xs transition-all duration-200
        ${isActive && !isSortableDragging ? 'opacity-100 bg-white/5' : 'opacity-60 hover:opacity-100'}
        ${isPlaying ? 'pl-[5px]' : 'pl-2'}
      `}
      onMouseEnter={() => !isSortableDragging && onMouseEnter(index, coverArtUrl)}
      onMouseLeave={onMouseLeave}
    >
      {/* Drag handle — only visible on hover */}
      <span
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-paper/30 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </span>

      {/* Row index or Equalizer Bars */}
      {isPlaying ? (
        <EqualizerBars />
      ) : (
        <span className="shrink-0 w-5 text-paper/30 text-[10px] font-mono text-right select-none">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}

      {/* ARTIST */}
      <span ref={artistRef} className={`flex-1 min-w-0 truncate pr-2 ${isPlaying ? 'text-coral' : 'text-paper'}`}>
        {songValues.artist}
      </span>

      {/* TITLE */}
      <span ref={titleRef} className={`flex-1 min-w-0 truncate pr-2 ${isPlaying ? 'text-coral/80' : 'text-paper/80'}`}>
        {songValues.title}
      </span>

      {/* ALBUM — hidden on small screens */}
      <span ref={albumRef} className="w-[18%] min-w-0 truncate pr-2 text-paper/60 hidden md:inline-block">
        {songValues.album}
      </span>

      {/* GENRE — hidden on medium screens */}
      <span ref={genreRef} className="w-[12%] min-w-0 truncate pr-2 text-paper/50 hidden lg:inline-block">
        {songValues.genre}
      </span>

      {/* YEAR */}
      <span ref={yearRef} className="w-12 text-right shrink-0 text-paper/50">
        {songValues.year}
      </span>

      {/* DURATION */}
      <span ref={durationRef} className="w-12 text-right shrink-0 text-paper/40 font-mono hidden sm:inline-block">
        {songValues.duration}
      </span>

      {/* Row actions — fade in on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlay(song, index); }}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-coral/20 text-paper/60 hover:text-coral transition-colors"
          title="Play from here"
        >
          <Play size={11} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 text-paper/60 hover:text-paper transition-colors"
          title="Add to queue"
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(song.id, index); }}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-500/20 text-paper/40 hover:text-red-400 transition-colors"
          title="Remove from playlist"
        >
          <X size={11} />
        </button>
      </div>
    </li>
  );
};
