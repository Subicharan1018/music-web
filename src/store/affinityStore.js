/**
 * affinityStore.js
 * Zustand store for tracking user listening habits and affinities.
 * Replaces Drift ArtistAffinityCompanion and GenreAffinityCompanion.
 */

import { create } from 'zustand';

const AFFINITY_LIMIT = 500;
const STORAGE_KEY = 'navivibe-affinity';

const loadPersistedAffinity = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load persisted affinity data', e);
  }
  return {
    artists: {},
    genres: {},
    songs: {},
    hourBuckets: new Array(24).fill(0),
  };
};

const initialState = loadPersistedAffinity();

// Utility to cap an object's keys based on the oldest `lastPlayed` timestamp.
const enforceCap = (recordMap) => {
  const keys = Object.keys(recordMap);
  if (keys.length <= AFFINITY_LIMIT) return recordMap;

  // Sort keys by lastPlayed ascending (oldest first)
  const sortedKeys = keys.sort((a, b) => {
    return (recordMap[a].lastPlayed || 0) - (recordMap[b].lastPlayed || 0);
  });

  // Remove the oldest ones
  const keysToRemove = sortedKeys.slice(0, keys.length - AFFINITY_LIMIT);
  const newMap = { ...recordMap };
  keysToRemove.forEach((k) => delete newMap[k]);
  return newMap;
};

export const useAffinityStore = create((set, get) => ({
  artists: initialState.artists,
  genres: initialState.genres,
  songs: initialState.songs,
  hourBuckets: initialState.hourBuckets,

  recordPlay: (song, listenMs) => {
    set((state) => {
      const now = Date.now();
      const hour = new Date().getHours();
      
      const newArtists = { ...state.artists };
      const newGenres = { ...state.genres };
      const newSongs = { ...state.songs };
      const newHourBuckets = [...state.hourBuckets];

      const artistId = song.artistId || song.artist;
      if (artistId) {
        const a = newArtists[artistId] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newArtists[artistId] = {
          ...a,
          playCount: a.playCount + 1,
          totalListenMs: a.totalListenMs + listenMs,
          lastPlayed: now,
        };
      }

      const genre = song.genre;
      if (genre) {
        const g = newGenres[genre] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newGenres[genre] = {
          ...g,
          playCount: g.playCount + 1,
          totalListenMs: g.totalListenMs + listenMs,
          lastPlayed: now,
        };
      }

      const songId = song.id;
      if (songId) {
        const s = newSongs[songId] || { playCount: 0, totalListenMs: 0, skipCount: 0, rating: 0 };
        newSongs[songId] = {
          ...s,
          playCount: s.playCount + 1,
          totalListenMs: s.totalListenMs + listenMs,
          lastPlayed: now,
        };
      }

      newHourBuckets[hour] += 1;

      return {
        artists: enforceCap(newArtists),
        genres: enforceCap(newGenres),
        songs: enforceCap(newSongs),
        hourBuckets: newHourBuckets,
      };
    });
  },

  recordSkip: (song) => {
    set((state) => {
      const newArtists = { ...state.artists };
      const newGenres = { ...state.genres };
      const newSongs = { ...state.songs };
      const now = Date.now();

      const artistId = song.artistId || song.artist;
      if (artistId) {
        const a = newArtists[artistId] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newArtists[artistId] = { ...a, skipCount: a.skipCount + 1, lastPlayed: now };
      }

      const genre = song.genre;
      if (genre) {
        const g = newGenres[genre] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newGenres[genre] = { ...g, skipCount: g.skipCount + 1, lastPlayed: now };
      }

      const songId = song.id;
      if (songId) {
        const s = newSongs[songId] || { playCount: 0, totalListenMs: 0, skipCount: 0, rating: 0 };
        newSongs[songId] = { ...s, skipCount: s.skipCount + 1, lastPlayed: now };
      }

      return {
        artists: enforceCap(newArtists),
        genres: enforceCap(newGenres),
        songs: enforceCap(newSongs),
      };
    });
  },

  recordRating: (songId, rating) => {
    set((state) => {
      const newSongs = { ...state.songs };
      const s = newSongs[songId] || { playCount: 0, totalListenMs: 0, skipCount: 0, lastPlayed: Date.now() };
      newSongs[songId] = { ...s, rating };
      return { songs: enforceCap(newSongs) };
    });
  },

  getArtistAffinity: (artistId) => {
    return get().artists[artistId] || null;
  },

  getGenreAffinity: (genre) => {
    return get().genres[genre] || null;
  },

  getSongProfile: (songId) => {
    return get().songs[songId] || null;
  },

  getHourPreference: () => {
    const buckets = get().hourBuckets;
    const hour = new Date().getHours();
    const maxVal = Math.max(...buckets, 1); // Avoid division by zero
    return buckets[hour] / maxVal; // Normalized 0-1
  },

  reset: () => {
    set({
      artists: {},
      genres: {},
      songs: {},
      hourBuckets: new Array(24).fill(0),
    });
  },
}));

// Debounced write to localStorage
let persistTimer = null;
useAffinityStore.subscribe((state, prevState) => {
  // Deep equality or reference check might be needed if objects mutate,
  // but Zustand ensures a new object is returned when state changes.
  if (!prevState || state !== prevState) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const persistData = {
        artists: state.artists,
        genres: state.genres,
        songs: state.songs,
        hourBuckets: state.hourBuckets,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
    }, 5000);
  }
});
