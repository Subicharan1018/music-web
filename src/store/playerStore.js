/**
 * playerStore.js
 * Zustand store for queue, playback state, and current song.
 * Integrates AudioEngine and ScrobbleService.
 * Implements BUG 5 debounce for localStorage queue persistence.
 */

import { create } from 'zustand';
import AudioEngine from '../services/AudioEngine';
import ScrobbleService from '../services/ScrobbleService';
import { applyShuffleAlgorithm } from '../services/ShuffleService';
import { ShuffleApiService, mapRecommendationsToSongs } from '../services/ShuffleApiService';
import { useAffinityStore } from './affinityStore';
import { useSettingsStore } from './settingsStore';

const loadPersistedState = () => {
  try {
    const data = localStorage.getItem('navivibe-player-queue');
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load persisted player state', e);
  }
  return {
    queue: [],
    currentIndex: 0,
    currentSong: null,
    volume: 1.0,
    shuffleEnabled: false, // Legacy boolean, kept for backward compatibility if needed, or remove? I will keep it for now but we use shuffleMode.
    shuffleMode: 'none',
    originalQueue: [],
    repeatMode: 'none'
  };
};

const initialState = loadPersistedState();

export const usePlayerStore = create((set, get) => ({
  queue: initialState.queue,
  currentIndex: initialState.currentIndex,
  isPlaying: false,
  currentSong: initialState.currentSong,
  position: 0,
  duration: 0,
  volume: initialState.volume,
  shuffleEnabled: initialState.shuffleEnabled,
  shuffleMode: initialState.shuffleMode || 'none',
  originalQueue: initialState.originalQueue || [],
  repeatMode: initialState.repeatMode,
  
  audioEngine: null,
  scrobbleService: null,
  subsonicClient: null,

  initEngine: (client) => {
    const currentEngine = get().audioEngine;
    if (currentEngine) return; // Guard: only init once

    const scrobbleService = new ScrobbleService({
      subsonicClient: client,
      onScrobble: (song, listenMs) => {
        useAffinityStore.getState().recordPlay(song, listenMs);
      }
    });
    
    const engine = new AudioEngine({
      onTrackEnd: () => {
        get().next(true);
      },
      onStateChange: (isPlaying) => {
        set({ isPlaying });
      },
      onPositionUpdate: () => {
        // We poll inside the hook
      },
      onSkip: (song) => {
        useAffinityStore.getState().recordSkip(song);
      }
    });

    engine.setVolume(get().volume);

    set({ 
      audioEngine: engine, 
      scrobbleService, 
      subsonicClient: client 
    });
  },

  play: (song = null) => {
    const state = get();
    const { audioEngine, scrobbleService, subsonicClient, queue, currentIndex } = state;
    
    if (!audioEngine || !subsonicClient) return;

    if (song) {
      // Find the song in the queue to update index, or add it if not found?
      // Assuming play(song) means play this exact track right now (e.g. clicked in list)
      // Usually it replaces the queue or finds index. For now, let's just play it.
      const index = queue.findIndex(s => s.id === song.id);
      
      const streamUrl = subsonicClient.stream(song.id);
      audioEngine.load(song, streamUrl, true);
      scrobbleService.onTrackChange();
      scrobbleService.onPlay(song);
      
      set({ 
        currentSong: song, 
        currentIndex: index >= 0 ? index : currentIndex,
        isPlaying: true 
      });

      // Preload next
      const nextIdx = index >= 0 ? index + 1 : currentIndex + 1;
      if (nextIdx < queue.length) {
        audioEngine.preloadNext(queue[nextIdx], subsonicClient.stream(queue[nextIdx].id));
      }
    } else {
      // Resume
      audioEngine.play();
      if (state.currentSong) {
        scrobbleService.onPlay(state.currentSong);
      }
      set({ isPlaying: true });
    }
  },

  pause: () => {
    const { audioEngine, scrobbleService } = get();
    if (audioEngine) audioEngine.pause();
    if (scrobbleService) scrobbleService.onPause();
    set({ isPlaying: false });
  },

  next: (autoAdvanced = false) => {
    const state = get();
    const { queue, currentIndex, repeatMode, audioEngine, scrobbleService, subsonicClient } = state;
    
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        if (autoAdvanced) {
          audioEngine?.stop();
          scrobbleService?.onTrackChange();
          set({ isPlaying: false, position: 0 });
        }
        return;
      }
    }

    const nextSong = queue[nextIndex];
    if (audioEngine && subsonicClient) {
      const streamUrl = subsonicClient.stream(nextSong.id);
      audioEngine.load(nextSong, streamUrl, true);
      scrobbleService?.onTrackChange();
      scrobbleService?.onPlay(nextSong);
      
      // Preload next-next
      if (nextIndex + 1 < queue.length) {
        audioEngine.preloadNext(queue[nextIndex + 1], subsonicClient.stream(queue[nextIndex + 1].id));
      } else if (repeatMode === 'all' && queue.length > 0) {
        audioEngine.preloadNext(queue[0], subsonicClient.stream(queue[0].id));
      }
    }

    set({ currentIndex: nextIndex, currentSong: nextSong, isPlaying: true });
  },

  prev: () => {
    const state = get();
    const { queue, currentIndex, audioEngine, scrobbleService, subsonicClient } = state;
    
    if (queue.length === 0) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    const prevSong = queue[prevIndex];
    if (audioEngine && subsonicClient) {
      const streamUrl = subsonicClient.stream(prevSong.id);
      audioEngine.load(prevSong, streamUrl, true);
      scrobbleService?.onTrackChange();
      scrobbleService?.onPlay(prevSong);
      
      // Preload next
      let nextIndex = prevIndex + 1;
      if (nextIndex >= queue.length) nextIndex = 0;
      audioEngine.preloadNext(queue[nextIndex], subsonicClient.stream(queue[nextIndex].id));
    }

    set({ currentIndex: prevIndex, currentSong: prevSong, isPlaying: true });
  },

  seek: (seconds) => {
    const { audioEngine, scrobbleService } = get();
    if (audioEngine) audioEngine.seek(seconds);
    if (scrobbleService) scrobbleService.onSeek();
    set({ position: seconds });
  },

  setVolume: (volume) => {
    const { audioEngine, currentSong } = get();
    if (audioEngine) audioEngine.setVolume(volume, currentSong);
    set({ volume });
  },

  setQueue: (newQueue) => {
    set({ 
      queue: newQueue, 
      currentIndex: 0, 
      currentSong: newQueue[0] || null
    });
  },

  reorderQueue: (oldIndex, newIndex) => {
    set((state) => {
      const newQueue = [...state.queue];
      const [movedItem] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, movedItem);
      
      // Update currentIndex if necessary to keep current song playing
      let newCurrentIndex = state.currentIndex;
      if (oldIndex === state.currentIndex) {
        newCurrentIndex = newIndex;
      } else if (oldIndex < state.currentIndex && newIndex >= state.currentIndex) {
        newCurrentIndex--;
      } else if (oldIndex > state.currentIndex && newIndex <= state.currentIndex) {
        newCurrentIndex++;
      }

      return { queue: newQueue, currentIndex: newCurrentIndex };
    });
  },

  addToQueue: (song) => {
    set((state) => ({ 
      queue: [...state.queue, song],
      currentSong: state.currentSong || song
    }));
  },

  enableSmartShuffle: async (songs, affinityData) => {
    const state = get();
    const currentQueue = state.queue;
    const currentSong = state.currentSong;
    
    // Save original queue before shuffling
    const originalQueue = state.shuffleMode === 'none' ? [...currentQueue] : state.originalQueue;
    const pool = songs || originalQueue;

    const maxQueue = 50;
    const localFallback = () => applyShuffleAlgorithm(pool, affinityData, {
      maxQueue,
      avoidRecent: true,
      seedSong: currentSong
    });

    let shuffled = null;
    const shuffleUrl = useSettingsStore.getState().localShuffleUrl;
    if (shuffleUrl) {
      try {
        const service = new ShuffleApiService(shuffleUrl);
        const count = Math.min(15, pool.length);
        const recommendations = await service.getNext({
          currentSong,
          candidates: pool,
          count
        });

        const ordered = mapRecommendationsToSongs(recommendations, pool);
        const usedIds = new Set(ordered.map((song) => song.id));
        const seedSong = currentSong && pool.find((song) => song.id === currentSong.id) ? currentSong : null;

        const result = [];
        if (seedSong) {
          result.push(seedSong);
          usedIds.add(seedSong.id);
        }

        ordered.forEach((song) => {
          if (!usedIds.has(song.id)) {
            result.push(song);
            usedIds.add(song.id);
          }
        });

        const remainingPool = pool.filter((song) => !usedIds.has(song.id));
        const filler = applyShuffleAlgorithm(remainingPool, affinityData, {
          maxQueue: Math.max(0, maxQueue - result.length),
          avoidRecent: true,
          seedSong: null
        });

        shuffled = [...result, ...filler].slice(0, maxQueue);
      } catch (error) {
        shuffled = null;
      }
    }

    if (!shuffled || shuffled.length === 0) {
      shuffled = localFallback();
    }

    set({
      shuffleMode: 'smart',
      originalQueue,
      queue: shuffled,
      currentIndex: 0, // seedSong is at index 0
      currentSong: shuffled[0] || null
    });
  },

  enableDumbShuffle: () => {
    const state = get();
    const currentQueue = state.queue;
    const currentSong = state.currentSong;
    
    if (currentQueue.length <= 1) return;

    const originalQueue = state.shuffleMode === 'none' ? [...currentQueue] : state.originalQueue;

    // Standard Fisher-Yates, but keep currentSong at index 0
    let pool = [...currentQueue];
    if (currentSong) {
      pool = pool.filter(s => s.id !== currentSong.id);
    }

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const newQueue = currentSong ? [currentSong, ...pool] : pool;

    set({
      shuffleMode: 'dumb',
      originalQueue,
      queue: newQueue,
      currentIndex: 0
    });
  },

  disableShuffle: () => {
    const state = get();
    if (state.shuffleMode === 'none') return;

    const restoredQueue = [...state.originalQueue];
    let newIndex = 0;
    
    if (state.currentSong) {
      const foundIdx = restoredQueue.findIndex(s => s.id === state.currentSong.id);
      if (foundIdx >= 0) newIndex = foundIdx;
    }

    set({
      shuffleMode: 'none',
      queue: restoredQueue,
      originalQueue: [], // clear original queue
      currentIndex: newIndex
    });
  },

  setShuffle: (enabled) => set({ shuffleEnabled: enabled }), // Legacy
  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
}));

// BUG 5 Fix: Debounced write to localStorage
let persistTimer = null;
usePlayerStore.subscribe((state, prevState) => {
  // We manually implement subscribe by checking changes, 
  // since subscribeWithSelector isn't default in Zustand 4+
  // Wait, in Zustand without subscribeWithSelector, the listener receives (state, prevState)
  const isChanged = prevState && (
    state.queue !== prevState.queue ||
    state.currentIndex !== prevState.currentIndex ||
    state.currentSong?.id !== prevState.currentSong?.id ||
    state.volume !== prevState.volume ||
    state.shuffleEnabled !== prevState.shuffleEnabled ||
    state.repeatMode !== prevState.repeatMode
  );

  if (!prevState || isChanged) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const sanitizeSong = (song) => {
        if (!song) return null;
        return {
          id: song.id,
          title: song.title,
          artist: song.artist,
          artistId: song.artistId,
          album: song.album,
          coverArt: song.coverArt,
          duration: song.duration,
          year: song.year,
          genre: song.genre
        };
      };

      const persistData = {
        queue: Array.isArray(state.queue) ? state.queue.map(sanitizeSong) : [],
        currentIndex: state.currentIndex,
        currentSong: sanitizeSong(state.currentSong),
        volume: state.volume,
        shuffleEnabled: state.shuffleEnabled,
        shuffleMode: state.shuffleMode,
        originalQueue: Array.isArray(state.originalQueue) ? state.originalQueue.map(sanitizeSong) : [],
        repeatMode: state.repeatMode
      };
      localStorage.setItem('navivibe-player-queue', JSON.stringify(persistData));
    }, 5000);
  }
});
