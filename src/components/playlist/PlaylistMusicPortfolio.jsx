/**
 * PlaylistMusicPortfolio.jsx
 * NaviVibe-specific playlist view — MusicPortfolio aesthetic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlaylistRow } from './PlaylistRow';

/**
 * @param {object}   props
 * @param {Array}    props.songs            — playlist entry array
 * @param {string}   props.currentSongId    — currently playing song id
 * @param {string}   props.defaultBackground — cover art URL of playing song (or '')
 * @param {function} props.onPlay            — (song, index) => void
 * @param {function} props.onReorder         — (oldIndex, newIndex) => void
 * @param {function} props.onAddToQueue      — (song) => void
 * @param {function} props.onRemove          — (songId, index) => void
 * @param {object}   props.client            — SubsonicClient instance
 * @param {function} props.onBackgroundChange — (url) => void
 */
export const PlaylistMusicPortfolio = ({
  songs = [],
  currentSongId = null,
  defaultBackground = '',
  onPlay,
  onReorder,
  onAddToQueue,
  onRemove,
  client,
  onBackgroundChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeBg, setActiveBg] = useState(defaultBackground);

  // Cover art URL builder
  const getCoverUrl = useCallback((song) => {
    if (!song?.coverArt || !client) return defaultBackground;
    return client.getCoverArtUrl(song.coverArt, 400);
  }, [client, defaultBackground]);

  // Sync background URL upwards whenever it changes
  useEffect(() => {
    onBackgroundChange?.(activeBg);
  }, [activeBg, onBackgroundChange]);

  // Sync background with currently-playing song when no row is hovered
  useEffect(() => {
    if (activeIndex === -1 && defaultBackground) {
      setActiveBg(defaultBackground);
    }
  }, [defaultBackground, activeIndex]);

  // Preload cover art for the first few rows only.
  // Now that URLs are stable per session, the browser HTTP cache handles
  // subsequent loads — no need to eagerly fetch all 50+ images at mount.
  // The 600ms debounce prevents firing during rapid playlist navigation.
  useEffect(() => {
    const timer = setTimeout(() => {
      const preview = songs.slice(0, 6);
      preview.forEach((song) => {
        const url = getCoverUrl(song);
        if (url) { const img = new Image(); img.src = url; }
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [songs, getCoverUrl]);


  const handleRowHover = useCallback((index, coverUrl) => {
    setActiveIndex(index);
    setActiveBg(coverUrl || defaultBackground);
  }, [defaultBackground]);

  const handleRowLeave = useCallback(() => {}, []);

  const handleContainerLeave = useCallback(() => {
    setActiveIndex(-1);
    setActiveBg(defaultBackground);
  }, [defaultBackground]);

  // dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = songs.findIndex((s, i) => `pmp-${s.id}-${i}` === active.id);
    const newIndex = songs.findIndex((s, i) => `pmp-${s.id}-${i}` === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onReorder?.(oldIndex, newIndex);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full min-h-0"
      onMouseLeave={handleContainerLeave}
    >
      {/* Column headers */}
      <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/15 text-white/40 text-[10px] font-mono tracking-widest uppercase pl-2">
        <span className="w-4 shrink-0" />   {/* drag handle placeholder */}
        <span className="w-5 shrink-0" />   {/* index */}
        <span className="flex-1">Artist</span>
        <span className="flex-1">Title</span>
        <span className="w-[18%] hidden md:inline-block">Album</span>
        <span className="w-[12%] hidden lg:inline-block">Genre</span>
        <span className="w-12 text-right">Year</span>
        <span className="w-12 text-right hidden sm:inline-block">Time</span>
        <span className="w-[88px] shrink-0" /> {/* actions placeholder */}
      </div>

      {songs.length === 0 ? (
        <p className="text-white/40 font-serif italic text-center py-16 text-lg">
          This playlist is empty.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={songs.map((s, i) => `pmp-${s.id}-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="w-full" role="list">
              {songs.map((song, index) => (
                <PlaylistRow
                  key={`pmp-${song.id}-${index}`}
                  song={song}
                  index={index}
                  sortableId={`pmp-${song.id}-${index}`}
                  isPlaying={song.id === currentSongId}
                  isActive={activeIndex === index}
                  onMouseEnter={(idx, url) => handleRowHover(idx, url || getCoverUrl(song))}
                  onMouseLeave={handleRowLeave}
                  onPlay={onPlay}
                  onAddToQueue={onAddToQueue}
                  onRemove={onRemove}
                  coverArtUrl={getCoverUrl(song)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default PlaylistMusicPortfolio;
