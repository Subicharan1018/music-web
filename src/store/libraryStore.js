/**
 * libraryStore.js
 * Zustand store for in-memory caching of albums, artists, and playlists.
 */

import { create } from 'zustand';

export const useLibraryStore = create((set, get) => ({
  // Data
  albums: [],
  artists: [],
  recentAlbums: [],
  frequentAlbums: [],
  starredAlbums: [],
  searchResults: { artists: [], albums: [], songs: [] },
  playlists: [],

  // Pagination
  albumsPage: 0,
  albumsHasMore: true,

  // Status
  isLoading: false,
  error: null,

  // Cache (In-memory only, no localStorage)
  albumCache: {},
  artistCache: {},

  fetchArtists: async (client) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await client.getArtists();
      set({ artists: data.artists?.index || [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAlbums: async (client, type = 'alphabeticalByName', reset = false) => {
    const state = get();
    if (state.isLoading) return;

    const size = 50;
    const offset = reset ? 0 : state.albumsPage * size;

    if (reset) {
      if (type === 'newest') set({ recentAlbums: [], isLoading: true, error: null });
      else if (type === 'frequent') set({ frequentAlbums: [], isLoading: true, error: null });
      else if (type === 'starred') set({ starredAlbums: [], isLoading: true, error: null });
      else set({ albums: [], albumsPage: 0, albumsHasMore: true, isLoading: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const data = await client.getAlbumList2(type, size, offset);
      const newAlbums = data.albumList2?.album || [];
      const hasMore = newAlbums.length === size;

      set((prev) => {
        const update = { isLoading: false };
        if (type === 'newest') {
          update.recentAlbums = reset ? newAlbums : [...prev.recentAlbums, ...newAlbums];
        } else if (type === 'frequent') {
          update.frequentAlbums = reset ? newAlbums : [...prev.frequentAlbums, ...newAlbums];
        } else if (type === 'starred') {
          update.starredAlbums = reset ? newAlbums : [...prev.starredAlbums, ...newAlbums];
        } else {
          update.albums = reset ? newAlbums : [...prev.albums, ...newAlbums];
          update.albumsPage = reset ? 1 : prev.albumsPage + 1;
          update.albumsHasMore = hasMore;
        }
        return update;
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchAlbum: async (client, id) => {
    const { albumCache } = get();
    const cached = albumCache[id];
    if (cached && (Date.now() - cached.fetchedAt < 300000)) {
      return cached.album;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await client.getAlbum(id);
      const albumData = data.album;
      
      set((state) => {
        const newCache = { ...state.albumCache, [id]: { album: albumData, fetchedAt: Date.now() } };
        
        // Eviction logic
        const keys = Object.keys(newCache);
        if (keys.length > 200) {
           keys.sort((a, b) => newCache[a].fetchedAt - newCache[b].fetchedAt);
           const toEvict = keys.length - 200;
           for(let i=0; i<toEvict; i++) delete newCache[keys[i]];
        }
        return { albumCache: newCache, isLoading: false };
      });
      return albumData;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchArtist: async (client, id) => {
    const { artistCache } = get();
    const cached = artistCache[id];
    if (cached && (Date.now() - cached.fetchedAt < 300000)) {
      return cached.artist;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await client.getArtist(id);
      const artistData = data.artist;
      
      set((state) => {
        const newCache = { ...state.artistCache, [id]: { artist: artistData, fetchedAt: Date.now() } };
        
        // Eviction logic
        const keys = Object.keys(newCache);
        if (keys.length > 100) {
           keys.sort((a, b) => newCache[a].fetchedAt - newCache[b].fetchedAt);
           const toEvict = keys.length - 100;
           for(let i=0; i<toEvict; i++) delete newCache[keys[i]];
        }
        return { artistCache: newCache, isLoading: false };
      });
      return artistData;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  search: async (client, query) => {
    if (!query) {
      set({ searchResults: { artists: [], albums: [], songs: [] } });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await client.search3(query);
      set({ 
        searchResults: {
          artists: data.searchResult3?.artist || [],
          albums: data.searchResult3?.album || [],
          songs: data.searchResult3?.song || []
        },
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPlaylists: async (client) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const data = await client.getPlaylists();
      set({ playlists: data.playlists?.playlist || [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  invalidate: () => set({ 
    albums: [], artists: [], recentAlbums: [], frequentAlbums: [], starredAlbums: [],
    searchResults: { artists: [], albums: [], songs: [] }, playlists: [],
    albumsPage: 0, albumsHasMore: true, albumCache: {}, artistCache: {}
  })
}));