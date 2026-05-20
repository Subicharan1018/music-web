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
  starred: {
    albums: [],
    artists: [],
    songs: [],
  },
  isStarredLoading: false,
  searchResults: { artists: [], albums: [], songs: [] },
  playlists: [],

  // Aliases for user expectation
  get starredSongs() { return get().starred.songs; },
  get starredAlbums() { return get().starred.albums; },
  lastFetched: null,

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
      set({ artists: data.artists?.index || [], isLoading: false, lastFetched: Date.now() });
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
        update.lastFetched = Date.now();
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

  fetchStarred: async (client) => {
    set({ isStarredLoading: true, error: null });
    try {
      const data = await client.getStarred2();
      set({ 
        starred: {
          albums: data.starred2?.album || [],
          artists: data.starred2?.artist || [],
          songs: data.starred2?.song || []
        },
        isStarredLoading: false 
      });
    } catch (error) {
      set({ error: error.message, isStarredLoading: false });
    }
  },

  toggleStarAlbum: async (client, album) => {
    const isStarred = get().isAlbumStarred(album.id);
    // Optimistic update
    set((state) => ({
      starred: {
        ...state.starred,
        albums: isStarred 
          ? state.starred.albums.filter(a => a.id !== album.id)
          : [...state.starred.albums, album]
      }
    }));
    try {
      if (isStarred) await client.unstar(album.id, 'album');
      else await client.star(album.id, 'album');
    } catch (error) {
      // Revert on error
      set((state) => ({
        starred: {
          ...state.starred,
          albums: isStarred 
            ? [...state.starred.albums, album]
            : state.starred.albums.filter(a => a.id !== album.id)
        }
      }));
    }
  },

  toggleStarArtist: async (client, artist) => {
    const isStarred = get().isArtistStarred(artist.id);
    set((state) => ({
      starred: {
        ...state.starred,
        artists: isStarred 
          ? state.starred.artists.filter(a => a.id !== artist.id)
          : [...state.starred.artists, artist]
      }
    }));
    try {
      if (isStarred) await client.unstar(artist.id, 'artist');
      else await client.star(artist.id, 'artist');
    } catch (error) {
      set((state) => ({
        starred: {
          ...state.starred,
          artists: isStarred 
            ? [...state.starred.artists, artist]
            : state.starred.artists.filter(a => a.id !== artist.id)
        }
      }));
    }
  },

  toggleStarSong: async (client, song) => {
    const isStarred = get().isSongStarred(song.id);
    set((state) => ({
      starred: {
        ...state.starred,
        songs: isStarred 
          ? state.starred.songs.filter(s => s.id !== song.id)
          : [...state.starred.songs, song]
      }
    }));
    try {
      if (isStarred) await client.unstar(song.id, 'song');
      else await client.star(song.id, 'song');
    } catch (error) {
      set((state) => ({
        starred: {
          ...state.starred,
          songs: isStarred 
            ? [...state.starred.songs, song]
            : state.starred.songs.filter(s => s.id !== song.id)
        }
      }));
    }
  },

  isAlbumStarred: (id) => get().starred.albums.some(a => a.id === id),
  isArtistStarred: (id) => get().starred.artists.some(a => a.id === id),
  isSongStarred: (id) => get().starred.songs.some(s => s.id === id),

  invalidate: () => set({ 
    albums: [], artists: [], recentAlbums: [], frequentAlbums: [], starredAlbums: [],
    searchResults: { artists: [], albums: [], songs: [] }, playlists: [],
    albumsPage: 0, albumsHasMore: true, albumCache: {}, artistCache: {}
  })
}));