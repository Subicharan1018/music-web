/**
 * PlaylistDetailPage.jsx
 * Displays a single playlist, allows reordering songs via dnd-kit.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { usePlaylistStore } from '../store/playlistStore';
import { useUIStore } from '../store/uiStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayAction } from '../hooks/usePlayAction';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { SongRow } from '../components/library/SongRow';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Play, Sparkles, Trash2, ArrowLeft } from 'lucide-react';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min ${s} sec`;
};

export const PlaylistDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useSubsonic();
  const { openPlaylist, fetchPlaylist, renamePlaylist, removeSongFromPlaylist, reorderPlaylist, deletePlaylist, isLoading, pendingReorder } = usePlaylistStore();
  const { setView, addToast } = useUIStore();
  const { enableSmartShuffle } = usePlayerStore();
  const { playSong } = usePlayAction();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setView('playlists');
    if (client && id) {
      fetchPlaylist(client, id);
    }
  }, [client, id, fetchPlaylist, setView]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePlayAll = () => {
    if (openPlaylist?.entry?.length > 0) {
      playSong(openPlaylist.entry[0], openPlaylist.entry);
    }
  };

  const handleSmartShuffle = () => {
    if (openPlaylist?.entry?.length > 0) {
      void enableSmartShuffle(openPlaylist.entry);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      try {
        await deletePlaylist(client, id);
        addToast('Playlist deleted');
        navigate('/playlists');
      } catch (error) {
        addToast(error.message || 'Failed to delete playlist', 'error');
      }
    }
  };

  const handleRenameSubmit = async () => {
    setIsEditing(false);
    if (editName.trim() && editName !== openPlaylist.name) {
      try {
        await renamePlaylist(client, id, editName.trim());
      } catch (error) {
        addToast(error.message || 'Failed to rename playlist', 'error');
      }
    }
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(openPlaylist.name);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = openPlaylist.entry.findIndex((song, idx) => `song-${song.id}-${idx}` === active.id);
      const newIndex = openPlaylist.entry.findIndex((song, idx) => `song-${song.id}-${idx}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSongs = [...openPlaylist.entry];
        const [movedSong] = newSongs.splice(oldIndex, 1);
        newSongs.splice(newIndex, 0, movedSong);
        reorderPlaylist(client, id, newSongs);
      }
    }
  };

  if (isLoading && !openPlaylist) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!openPlaylist) return null;

  const songs = openPlaylist.entry || [];
  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0);

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      <button 
        onClick={() => navigate('/playlists')}
        className="flex items-center gap-2 text-ink-mute hover:text-ink font-sans text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Playlists
      </button>

      <div className="flex flex-col gap-8 mb-12">
        <div>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="font-serif text-5xl font-bold text-ink italic tracking-tight bg-transparent border-b border-coral outline-none w-full max-w-2xl py-1"
            />
          ) : (
            <h1 
              onClick={() => {
                setEditName(openPlaylist.name);
                setIsEditing(true);
              }}
              className="font-serif text-5xl font-bold text-ink italic tracking-tight cursor-text hover:opacity-80 transition-opacity inline-block"
              title="Click to rename"
            >
              {openPlaylist.name}
            </h1>
          )}
          <div className="flex items-center gap-4 mt-4 font-mono text-sm text-ink-mute">
            <span>{openPlaylist.songCount || 0} SONGS</span>
            <span>·</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handlePlayAll}
            className="flex items-center gap-2 bg-ink text-paper px-8 py-3 rounded-full hover:bg-coral transition-all hover:scale-105 active:scale-95 shadow-md"
            disabled={songs.length === 0}
          >
            <Play size={18} fill="currentColor" />
            <span className="font-sans text-sm font-medium tracking-wide">Play All</span>
          </button>
          
          <button 
            onClick={handleSmartShuffle}
            className="flex items-center gap-2 bg-transparent border border-ink/20 text-ink px-8 py-3 rounded-full hover:border-coral hover:text-coral transition-colors"
            disabled={songs.length === 0}
          >
            <Sparkles size={18} />
            <span className="font-sans text-sm font-medium tracking-wide">Smart Shuffle</span>
          </button>

          <div className="flex-1"></div>

          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 text-ink-mute hover:text-coral transition-colors px-4 py-2 rounded-md hover:bg-coral/10"
          >
            <Trash2 size={18} />
            <span className="font-sans text-sm">Delete Playlist</span>
          </button>
        </div>
      </div>

      <div className="border-t border-ink/10 pt-4">
        {songs.length === 0 ? (
          <div className="text-center py-20 font-serif text-xl italic text-ink-mute">
            This playlist is empty.
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={songs.map((song, index) => `song-${song.id}-${index}`)} 
              strategy={verticalListSortingStrategy}
            >
              <div className={`transition-opacity duration-300 ${pendingReorder ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {songs.map((song, index) => (
                  <SongRow 
                    key={`song-${song.id}-${index}`}
                    song={song}
                    index={index}
                    contextSongs={songs}
                    context="playlist"
                    onRemove={() => removeSongFromPlaylist(client, id, index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
