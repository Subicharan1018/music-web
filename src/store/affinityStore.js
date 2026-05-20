/**
 * affinityStore.js
 * Zustand store for tracking user listening habits and affinities.
 * Phase 6: Extended with recentPlays, dailyListening, lifetimeTotalMs, bestStreak.
 * All new state persisted in the existing 'navivibe-affinity' localStorage key.
 */

import { create } from 'zustand';

const AFFINITY_LIMIT = 500;
const RECENT_PLAYS_LIMIT = 200;
const DAILY_LISTENING_DAYS = 90;
const STORAGE_KEY = 'navivibe-affinity';

const toDateKey = (ts) => new Date(ts).toISOString().slice(0, 10); // 'YYYY-MM-DD'

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
    playHistory: [],
    recentPlays: [],
    dailyListening: {},
    lifetimeTotalMs: 0,
    bestStreak: 0,
  };
};

const initialState = loadPersistedAffinity();

// Utility to cap an object's keys based on the oldest `lastPlayed` timestamp.
const enforceCap = (recordMap) => {
  const keys = Object.keys(recordMap);
  if (keys.length <= AFFINITY_LIMIT) return recordMap;

  const sortedKeys = keys.sort((a, b) =>
    (recordMap[a].lastPlayed || 0) - (recordMap[b].lastPlayed || 0)
  );
  const keysToRemove = sortedKeys.slice(0, keys.length - AFFINITY_LIMIT);
  const newMap = { ...recordMap };
  keysToRemove.forEach((k) => delete newMap[k]);
  return newMap;
};

export const useAffinityStore = create((set, get) => ({
  artists: initialState.artists || {},
  genres: initialState.genres || {},
  songs: initialState.songs || {},
  hourBuckets: initialState.hourBuckets || new Array(24).fill(0),
  playHistory: initialState.playHistory || [],
  recentPlays: initialState.recentPlays || [],
  dailyListening: initialState.dailyListening || {},
  lifetimeTotalMs: initialState.lifetimeTotalMs || 0,
  bestStreak: initialState.bestStreak || 0,

  recordPlay: (song, listenMs) => {
    set((state) => {
      const now = Date.now();
      const hour = new Date().getHours();
      const todayKey = toDateKey(now);

      // ── Artists ──
      const newArtists = { ...state.artists };
      const artistId = song.artistId || song.artist;
      if (artistId) {
        const a = newArtists[artistId] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newArtists[artistId] = {
          ...a,
          name: song.artist || artistId, // store display name
          playCount: a.playCount + 1,
          totalListenMs: a.totalListenMs + (listenMs || 0),
          lastPlayed: now,
        };
      }

      // ── Genres ──
      const newGenres = { ...state.genres };
      const genre = song.genre;
      if (genre) {
        const g = newGenres[genre] || { playCount: 0, totalListenMs: 0, skipCount: 0 };
        newGenres[genre] = {
          ...g,
          playCount: g.playCount + 1,
          totalListenMs: g.totalListenMs + (listenMs || 0),
          lastPlayed: now,
        };
      }

      // ── Songs ──
      const newSongs = { ...state.songs };
      const songId = song.id;
      if (songId) {
        const s = newSongs[songId] || { playCount: 0, totalListenMs: 0, skipCount: 0, rating: 0 };
        newSongs[songId] = {
          ...s,
          title: song.title,
          artist: song.artist,
          playCount: s.playCount + 1,
          totalListenMs: s.totalListenMs + (listenMs || 0),
          lastPlayed: now,
        };
      }

      // ── Hour Buckets ──
      const newHourBuckets = [...state.hourBuckets];
      newHourBuckets[hour] += 1;

      // ── Play History (song IDs only, cap 500) ──
      let newPlayHistory = [...state.playHistory, songId].filter(Boolean);
      if (newPlayHistory.length > 500) newPlayHistory = newPlayHistory.slice(-500);

      // ── Recent Plays (full snapshot, cap 200) ──
      const playEntry = {
        song: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          coverArt: song.coverArt,
          duration: song.duration,
        },
        playedAt: now,
        listenMs: listenMs || 0,
      };
      let newRecentPlays = [...state.recentPlays, playEntry];
      if (newRecentPlays.length > RECENT_PLAYS_LIMIT) {
        newRecentPlays = newRecentPlays.slice(-RECENT_PLAYS_LIMIT);
      }

      // ── Daily Listening ──
      const newDailyListening = { ...state.dailyListening };
      newDailyListening[todayKey] = (newDailyListening[todayKey] || 0) + (listenMs || 0);

      // Prune entries older than 90 days
      const cutoff = Date.now() - DAILY_LISTENING_DAYS * 24 * 60 * 60 * 1000;
      Object.keys(newDailyListening).forEach((key) => {
        if (new Date(key).getTime() < cutoff) delete newDailyListening[key];
      });

      // ── Lifetime ──
      const newLifetimeTotalMs = (state.lifetimeTotalMs || 0) + (listenMs || 0);

      // ── Best Streak (compute current and update best) ──
      // Build a temporary dailyListening with today to compute streak
      const tempDaily = { ...newDailyListening };
      const currentStreak = computeStreak(tempDaily);
      const newBestStreak = Math.max(state.bestStreak || 0, currentStreak);

      return {
        artists: enforceCap(newArtists),
        genres: enforceCap(newGenres),
        songs: enforceCap(newSongs),
        hourBuckets: newHourBuckets,
        playHistory: newPlayHistory,
        recentPlays: newRecentPlays,
        dailyListening: newDailyListening,
        lifetimeTotalMs: newLifetimeTotalMs,
        bestStreak: newBestStreak,
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
        newArtists[artistId] = { ...a, name: song.artist || artistId, skipCount: a.skipCount + 1, lastPlayed: now };
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

  // ── Getters ─────────────────────────────────────────────────────────────────

  getArtistAffinity: (artistId) => get().artists[artistId] || null,
  getGenreAffinity: (genre) => get().genres[genre] || null,
  getSongProfile: (songId) => get().songs[songId] || null,

  getHourPreference: () => {
    const buckets = get().hourBuckets;
    const hour = new Date().getHours();
    const maxVal = Math.max(...buckets, 1);
    return buckets[hour] / maxVal;
  },

  getTopArtists: (limit = 10) => {
    const artists = get().artists;
    return Object.entries(artists)
      .map(([artistId, aff]) => ({ artistId, ...aff }))
      .sort((a, b) => (b.totalListenMs || 0) - (a.totalListenMs || 0))
      .slice(0, limit);
  },

  getTopTracks: (limit = 10) => {
    const songs = get().songs;
    return Object.entries(songs)
      .map(([songId, profile]) => ({ songId, ...profile }))
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, limit);
  },

  getRecentPlays: (limit = 20) => {
    const recent = get().recentPlays;
    return [...recent].reverse().slice(0, limit);
  },

  getDailyListening: () => {
    const daily = get().dailyListening;
    const now = Date.now();
    const days = 30;
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const ts = now - i * 24 * 60 * 60 * 1000;
      const key = toDateKey(ts);
      result.push({
        date: key,
        minutes: Math.round((daily[key] || 0) / 60000),
      });
    }
    return result; // ascending (oldest first), Recharts left-to-right
  },

  getListeningStreak: () => {
    const daily = get().dailyListening;
    const current = computeStreak(daily);
    const best = Math.max(get().bestStreak || 0, current);
    return { current, best };
  },

  reset: () => {
    set({
      artists: {},
      genres: {},
      songs: {},
      hourBuckets: new Array(24).fill(0),
      playHistory: [],
      recentPlays: [],
      dailyListening: {},
      lifetimeTotalMs: 0,
      bestStreak: 0,
    });
  },
}));

// ── Pure helper ─────────────────────────────────────────────────────────────
function computeStreak(dailyListening) {
  const today = toDateKey(Date.now());
  let streak = 0;
  let checkDate = today;

  while (dailyListening[checkDate]) {
    streak++;
    const prev = new Date(checkDate);
    prev.setDate(prev.getDate() - 1);
    checkDate = toDateKey(prev.getTime());
  }
  return streak;
}

// ── Debounced persistence ────────────────────────────────────────────────────
let persistTimer = null;
useAffinityStore.subscribe((state, prevState) => {
  if (!prevState || state !== prevState) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const persistData = {
        artists: state.artists,
        genres: state.genres,
        songs: state.songs,
        hourBuckets: state.hourBuckets,
        playHistory: state.playHistory,
        recentPlays: state.recentPlays,
        dailyListening: state.dailyListening,
        lifetimeTotalMs: state.lifetimeTotalMs,
        bestStreak: state.bestStreak,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
    }, 5000);
  }
});
