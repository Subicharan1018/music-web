/**
 * PlaylistDetailPage.jsx
 * Displays a single playlist using the PlaylistMusicPortfolio layout.
 * The SonicWaveformBackground is suppressed on /playlist/* routes by
 * sonic-waveform.jsx's internal route check (UI.4).
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { usePlaylistStore } from '../store/playlistStore';
import { useUIStore } from '../store/uiStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayAction } from '../hooks/player/usePlayAction';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { PlaylistMusicPortfolio } from '../components/playlist/PlaylistMusicPortfolio';
import { Play, Sparkles, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

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
  const { setPlaylistBgUrl } = useOutletContext() ?? {};

  const {
    openPlaylist,
    fetchPlaylist,
    renamePlaylist,
    removeSongFromPlaylist,
    reorderPlaylist,
    deletePlaylist,
    isLoading,
    pendingReorder,
  } = usePlaylistStore();

  const { setView, addToast } = useUIStore();
  const { enableSmartShuffle, enableV2Shuffle, currentSong, addToQueue } = usePlayerStore();
  const { playSong } = usePlayAction();
  const v2ShuffleEnabled = useSettingsStore((s) => s.v2ShuffleEnabled);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);
  const inputRef = useRef(null);

  // Add/remove body class so CSS overrides (dark bg, sidebar tint) apply to this page only
  useEffect(() => {
    document.body.classList.add('playlist-page-active');
    return () => document.body.classList.remove('playlist-page-active');
  }, []);

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

  const handleSmartShuffle = async () => {
    if (!openPlaylist?.entry?.length || isShuffling) return;
    setIsShuffling(true);
    try {
      const songs = openPlaylist.entry;
      const opts  = { playlistName: openPlaylist.name };
      console.log(`[PlaylistDetailPage] handleSmartShuffle — v2ShuffleEnabled=${v2ShuffleEnabled}`);
      if (v2ShuffleEnabled && enableV2Shuffle) {
        await enableV2Shuffle({ songs, ...opts });
        addToast(`V2 AI shuffle ready — ${songs.length} songs queued`, 'success');
      } else {
        await enableSmartShuffle(songs, opts);
        addToast(`Smart shuffle ready — ${songs.length} songs queued`, 'success');
      }
    } catch (err) {
      addToast('Shuffle failed — playing in original order', 'error');
    } finally {
      setIsShuffling(false);
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
    if (e.key === 'Enter') handleRenameSubmit();
    else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(openPlaylist.name);
    }
  };

  // P.1 — row-level play handler (play from this index)
  const handlePlaySong = useCallback((song, index) => {
    const songs = openPlaylist?.entry || [];
    const fromHere = [...songs.slice(index), ...songs.slice(0, index)];
    playSong(song, fromHere);
  }, [openPlaylist, playSong]);

  // P.1 — reorder (delegates to playlistStore which calls the API)
  const handleReorder = useCallback((oldIndex, newIndex) => {
    const newSongs = [...(openPlaylist?.entry || [])];
    const [moved] = newSongs.splice(oldIndex, 1);
    newSongs.splice(newIndex, 0, moved);
    reorderPlaylist(client, id, newSongs);
  }, [openPlaylist, client, id, reorderPlaylist]);

  // P.1 — remove song
  const handleRemove = useCallback((songId, index) => {
    removeSongFromPlaylist(client, id, index);
  }, [client, id, removeSongFromPlaylist]);

  const songs = openPlaylist?.entry || [];
  const totalDuration = songs.reduce((acc, song) => acc + (song.duration || 0), 0);

  // P.1 — Background: use playing song's art if it's in this playlist,
  // otherwise fall back to first song in the playlist.
  const defaultBackground = (() => {
    if (client) {
      // Prefer the currently-playing song if it's in this playlist
      if (currentSong) {
        const inList = songs.find(s => s.id === currentSong.id);
        if (inList?.coverArt) return client.getCoverArtUrl(inList.coverArt, 600);
      }
      // Fallback: first song with a coverArt
      const firstWithArt = songs.find(s => s.coverArt);
      if (firstWithArt?.coverArt) return client.getCoverArtUrl(firstWithArt.coverArt, 600);
    }
    return '';
  })();

  if (isLoading && !openPlaylist) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!openPlaylist) return null;

  return (
    <div className="relative min-h-full pb-24 overflow-y-auto">

      {/* ── Back navigation ─────────────────────────────── */}
      <button
        onClick={() => navigate('/playlists')}
        className="flex items-center gap-2 text-white/50 hover:text-white font-sans text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Playlists
      </button>

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-8 mb-10">
        <div>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="font-serif text-5xl font-bold text-white italic tracking-tight bg-transparent border-b border-coral outline-none w-full max-w-2xl py-1"
            />
          ) : (
            <h1
              onClick={() => { setEditName(openPlaylist.name); setIsEditing(true); }}
              className="font-serif text-5xl font-bold text-white italic tracking-tight cursor-text hover:opacity-80 transition-opacity inline-block"
              title="Click to rename"
            >
              {openPlaylist.name}
            </h1>
          )}
          <div className="flex items-center gap-4 mt-4 font-mono text-sm text-white/50">
            <span>{openPlaylist.songCount || 0} SONGS</span>
            <span>·</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>

        {/* ── Action buttons ─────────────────────────────── */}
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handlePlayAll}
            className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-3 rounded-full hover:bg-coral hover:border-coral transition-all hover:scale-105 active:scale-95 shadow-md"
            disabled={songs.length === 0}
          >
            <Play size={18} fill="currentColor" />
            <span className="font-sans text-sm font-medium tracking-wide">Play All</span>
          </button>

          <button
            onClick={handleSmartShuffle}
            className="flex items-center gap-2 bg-transparent border border-white/25 text-white/80 px-8 py-3 rounded-full hover:border-coral hover:text-coral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={songs.length === 0 || isShuffling}
          >
            {isShuffling
              ? <Loader2 size={18} className="animate-spin" />
              : <Sparkles size={18} />}
            <span className="font-sans text-sm font-medium tracking-wide">
              {isShuffling ? 'Thinking…' : 'Smart Shuffle'}
            </span>
          </button>

          <div className="flex-1" />

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-white/40 hover:text-coral transition-colors px-4 py-2 rounded-md hover:bg-coral/10"
          >
            <Trash2 size={18} />
            <span className="font-sans text-sm">Delete Playlist</span>
          </button>
        </div>
      </div>

      {/* ── MusicPortfolio song list ─────────────────────── */}
      <div className={`transition-opacity duration-300 ${pendingReorder ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <PlaylistMusicPortfolio
          songs={songs}
          currentSongId={currentSong?.id ?? null}
          defaultBackground={defaultBackground}
          onPlay={handlePlaySong}
          onReorder={handleReorder}
          onAddToQueue={addToQueue}
          onRemove={handleRemove}
          client={client}
          onBackgroundChange={setPlaylistBgUrl}
        />
      </div>
    </div>
  );
};
