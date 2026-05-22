/**
 * playlistStore.js
 * Zustand store for playlist management.
 * State is not persisted; all data lives on the Subsonic server.
 * Uses optimistic updates for snappy UX.
 */

import { create } from 'zustand';

export const usePlaylistStore = create((set, get) => ({
  playlists: [],
  openPlaylist: null,
  isLoading: false,
  isSaving: false,
  pendingReorder: false,
  error: null,

  fetchPlaylists: async (client, force = false) => {
    // Skip if we already have playlists and this isn't a forced refresh
    if (!force && get().playlists.length > 0) return;
    set({ isLoading: true, error: null });
    try {
      const data = await client.getPlaylists();
      set({ playlists: data.playlists?.playlist || [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },


  fetchPlaylist: async (client, id) => {
    set({ isLoading: true, error: null });
    try {
      const data = await client.getPlaylist(id);
      set({ openPlaylist: data.playlist, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createPlaylist: async (client, name, songIds = []) => {
    set({ isSaving: true, error: null });
    try {
      await client.createPlaylist(name, songIds);
      // Refresh playlists to get the new one with its ID
      await get().fetchPlaylists(client);
      set({ isSaving: false });
      
      // Attempt to return the newly created playlist (usually the last one if ordered chronologically, 
      // or we can find it by name. Since Subsonic doesn't return the ID, finding by name is a heuristic)
      const state = get();
      return state.playlists.find(p => p.name === name);
    } catch (error) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  renamePlaylist: async (client, id, name) => {
    const { openPlaylist } = get();
    const originalName = openPlaylist?.name;

    // Optimistic update for openPlaylist
    if (openPlaylist && openPlaylist.id === id) {
      set({ openPlaylist: { ...openPlaylist, name } });
    }
    
    set((state) => ({
      playlists: state.playlists.map(p => p.id === id ? { ...p, name } : p)
    }));

    try {
      await client.updatePlaylist(id, { name });
    } catch (error) {
      // Revert
      if (openPlaylist && openPlaylist.id === id) {
        set({ openPlaylist: { ...openPlaylist, name: originalName } });
      }
      set((state) => ({
        playlists: state.playlists.map(p => p.id === id ? { ...p, name: originalName } : p),
        error: error.message
      }));
    }
  },

  addSongsToPlaylist: async (client, id, songIds) => {
    set({ isSaving: true, error: null });
    try {
      await client.updatePlaylist(id, { songIdToAdd: songIds });
      // If this is the currently open playlist, refresh it to get the new songs
      if (get().openPlaylist?.id === id) {
        await get().fetchPlaylist(client, id);
      } else {
        await get().fetchPlaylists(client);
      }
      set({ isSaving: false });
    } catch (error) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  },

  removeSongFromPlaylist: async (client, id, songIndex) => {
    const { openPlaylist } = get();
    if (!openPlaylist || openPlaylist.id !== id) return;

    const originalSongs = [...(openPlaylist.entry || [])];
    
    // Optimistic remove
    set({
      openPlaylist: {
        ...openPlaylist,
        entry: originalSongs.filter((_, idx) => idx !== songIndex),
        songCount: Math.max(0, (openPlaylist.songCount || 1) - 1)
      }
    });

    try {
      await client.updatePlaylist(id, { songIndexToRemove: [songIndex] });
    } catch (error) {
      // Revert
      set({ openPlaylist: { ...openPlaylist, entry: originalSongs }, error: error.message });
    }
  },

  reorderPlaylist: async (client, id, newSongsList) => {
    if (get().pendingReorder) return;
    const { openPlaylist } = get();
    if (!openPlaylist || openPlaylist.id !== id) return;

    set({ pendingReorder: true, error: null });

    // 1. Fetch server's ground truth to ensure we have the absolute current list to revert to
    let serverPlaylist;
    try {
      const data = await client.getPlaylist(id);
      serverPlaylist = data.playlist;
    } catch (error) {
      set({ error: "Failed to fetch playlist before reorder.", pendingReorder: false });
      return;
    }

    const groundTruthSongs = serverPlaylist.entry || [];
    
    // Optimistic update
    set({
      openPlaylist: {
        ...openPlaylist,
        entry: newSongsList
      }
    });

    try {
      // 2. Clear all songs by index
      const indexesToRemove = groundTruthSongs.map((_, i) => i);
      if (indexesToRemove.length > 0) {
        await client.updatePlaylist(id, { songIndexToRemove: indexesToRemove });
      }

      // 3. Add songs in new order
      const newSongIds = newSongsList.map(song => song.id);
      if (newSongIds.length > 0) {
        await client.updatePlaylist(id, { songIdToAdd: newSongIds });
      }

    } catch (error) {
      // Revert to ground truth
      set({
        openPlaylist: { ...openPlaylist, entry: groundTruthSongs },
        error: error.message,
      });
      // Try to sync store by fetching again, just in case
      get().fetchPlaylist(client, id).catch(() => {});
    } finally {
      set({ pendingReorder: false });
    }
  },

  deletePlaylist: async (client, id) => {
    set({ isSaving: true, error: null });
    try {
      await client.deletePlaylist(id);
      set((state) => ({
        playlists: state.playlists.filter(p => p.id !== id),
        isSaving: false
      }));
    } catch (error) {
      set({ error: error.message, isSaving: false });
      throw error;
    }
  }
}));
