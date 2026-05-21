/**
 * playerStore.js
 * Zustand store for queue, playback state, and current song.
 *
 * Shuffle Fix v2 (2026-05-21) — 7 bugs resolved:
 *   S1: enableSmartShuffle now calls audioEngine.load() + preloadNext (via _loadAndPlay)
 *   S2: enableDumbShuffle does NOT call _loadAndPlay (current song keeps playing)
 *   S3: disableShuffle doesn't restart audio — only restores queue index
 *   S4: _playlistPool cleared in disableShuffle + enableDumbShuffle
 *   S5: _shuffleLock prevents concurrent enableSmartShuffle calls
 *   S6: enableSmartShuffle defaults to originalQueue as pool source, not shuffled queue
 *   S7: isShuffled + shuffleEnabled removed; derive from shuffleMode !== 'none'
 *   C3: shufflePending field drives loading UI on AI✦ button
 *   C4: loadPersistedState v2 migration strips stale fields
 */

import { create } from 'zustand';
import AudioEngine from '../services/AudioEngine';
import ScrobbleService from '../services/ScrobbleService';
import { applyShuffleAlgorithm } from '../services/ShuffleService';
import { useAIShuffleStore } from './aiShuffleStore';
import { useV2ShuffleStore } from './v2ShuffleStore';
import { mapRecommendationsToSongs } from '../utils/mapRecommendations';
import { useAffinityStore } from './affinityStore';
import * as ListeningLog from '../services/listeningLog';

// ── Smart Local shuffle module-level state ──────────────────────────────────
// Not in Zustand — keeps serializable store clean.
// Mirrors Flutter's _playlistPool + _isFetchingSmartLocal.
let _playlistPool = [];
let _isFetchingSmartLocal = false;
let _shuffleLock = false;          // S5: guard against concurrent enableSmartShuffle
const SMART_LOCAL_BATCH     = 15;
const SMART_LOCAL_THRESHOLD = 3;

// ── Persistence migration ────────────────────────────────────────────────────
// C4: bump PERSIST_VERSION to strip stale fields (isShuffled, shuffleEnabled)
const PERSIST_VERSION = 2;
const PERSIST_KEY = 'navivibe-player-queue';

const loadPersistedState = () => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);

    // v2 migration: strip stale boolean fields, derive shuffleMode
    const version = data.__version ?? 1;
    if (version < PERSIST_VERSION) {
      delete data.isShuffled;
      delete data.shuffleEnabled;
      if (!data.shuffleMode) data.shuffleMode = 'none';
      // Reset shuffle state on reload — don't restore a mid-shuffle queue
      data.shuffleMode = 'none';
      data.originalQueue = [];
    }
    data.__version = PERSIST_VERSION;
    return data;
  } catch (e) {
    console.error('[playerStore] Failed to load persisted state', e);
    return null;
  }
};

const DEFAULT_STATE = {
  queue: [],
  currentIndex: 0,
  currentSong: null,
  volume: 1.0,
  shuffleMode: 'none',    // 'none' | 'dumb' | 'smart' | 'smart-v2'
  originalQueue: [],
  repeatMode: 'none',
  gainValue: 0.0,
  shufflePending: false,  // C3: true while AI HTTP fetch is in flight
};

const persisted = loadPersistedState();
const initialState = { ...DEFAULT_STATE, ...persisted };

// ── _loadAndPlay ─────────────────────────────────────────────────────────────
// S1/C2: Load a new song into AudioEngine and preload the next one.
// Called ONLY by enableSmartShuffle — dumb shuffle keeps current song playing.
// `nextSong` is passed explicitly to avoid reading stale store state.
function _loadAndPlay(song, state, nextSong = null) {
  const { audioEngine, subsonicClient, scrobbleService } = state;
  if (!audioEngine || !subsonicClient || !song) return;

  console.log(`[SmartShuffle] Loading seed: "${song.title}" into AudioEngine`);

  const streamUrl = subsonicClient.stream(song.id);
  audioEngine.load(song, streamUrl, true);
  scrobbleService?.onTrackChange();
  scrobbleService?.onPlay(song);

  // C2: Preload queue[1] so the first next() call has no network stall.
  // We use the explicitly-passed nextSong to avoid a stale store read.
  if (nextSong) {
    const nextUrl = subsonicClient.stream(nextSong.id);
    audioEngine.preloadNext(nextSong, nextUrl);
    console.log(`[SmartShuffle] Preloaded next: "${nextSong.title}"`);
  }
}

// ── _triggerSmartLocalRefill ─────────────────────────────────────────────────
// Background refill — mirrors Flutter's _fetchAndReorderSmartLocal().
// Called when remainingAhead <= SMART_LOCAL_THRESHOLD and pool has songs.
async function _triggerSmartLocalRefill(getState) {
  if (_isFetchingSmartLocal || _playlistPool.length === 0) return;
  _isFetchingSmartLocal = true;

  try {
    const state = getState();
    const currentSong = state.currentSong;
    if (!currentSong) return;

    const batch = _playlistPool.splice(0, SMART_LOCAL_BATCH);
    if (batch.length === 0) return;

    console.log(`[SmartLocal] Refilling for: "${currentSong.title}" | pool remaining: ${_playlistPool.length}`);

    let orderedBatch = null;

    if (state.shuffleMode === 'smart-v2') {
      const v2Store = useV2ShuffleStore.getState();
      if (v2Store.isConfigured && v2Store.isHealthy) {
        console.log(`[SmartLocal-V2] → Sending /next request for refill batch (${batch.length} songs)`);
        await v2Store.fetchNext();
        const freshV2 = useV2ShuffleStore.getState();
        const mapped = mapRecommendationsToSongs(freshV2.recommendedQueue, batch);
        if (mapped.length > 0) {
          orderedBatch = mapped;
          console.log(`[SmartLocal-V2] ✓ V2 AI ordered ${mapped.length} songs for refill`);
        } else {
          // Fail loudly for V2
          console.error('[SmartLocal-V2] AI mapping produced 0 songs! Halting refill.');
          return;
        }
      } else {
        console.error('[SmartLocal-V2] V2 Store not configured or unhealthy. Halting refill.');
        return;
      }
    } else {
      // V1 Logic
      const aiStore = useAIShuffleStore.getState();
      if (aiStore.isConfigured && aiStore.isHealthy) {
        try {
          console.log(`[SmartLocal] → Sending /next request for refill batch (${batch.length} songs)`);
          await aiStore.fetchNext({
            current: currentSong.title || '',
            artist:  currentSong.artist || '',
            count:   SMART_LOCAL_BATCH,
          });
          const fresh = useAIShuffleStore.getState();
          const mapped = mapRecommendationsToSongs(fresh.recommendedQueue, batch);
          if (mapped.length >= 3) {
            orderedBatch = mapped;
            console.log(`[SmartLocal] ✓ AI ordered ${mapped.length} songs for refill`);
          }
        } catch (e) {
          console.warn('[SmartLocal] AI refill request failed, using raw batch order:', e.message);
        }
      }
    }

    const toAppend = orderedBatch || batch;

    // Drain pool of songs now queued
    const appendedIds = new Set(toAppend.map((s) => s.id));
    _playlistPool = _playlistPool.filter((s) => !appendedIds.has(s.id));

    usePlayerStore.setState((s) => ({ queue: [...s.queue, ...toAppend] }));

    console.log(`[SmartLocal] Appended ${toAppend.length} songs. Pool remaining: ${_playlistPool.length}`);
  } catch (e) {
    console.error('[SmartLocal] Refill failed:', e);
  } finally {
    _isFetchingSmartLocal = false;
  }
}

// ── Store ────────────────────────────────────────────────────────────────────
export const usePlayerStore = create((set, get) => ({
  ...initialState,
  isPlaying: false,
  position: 0,
  duration: 0,

  audioEngine: null,
  scrobbleService: null,
  subsonicClient: null,

  // ── Engine init ────────────────────────────────────────────────────────────
  initEngine: (client) => {
    if (get().audioEngine) return; // guard: init once

    const scrobbleService = new ScrobbleService({
      subsonicClient: client,
      onScrobble: (song, listenMs) => {
        useAffinityStore.getState().recordPlay(song, listenMs);
      },
    });

    const engine = new AudioEngine({
      onTrackEnd: () => { get().next(true); },
      onStateChange: (isPlaying) => { set({ isPlaying }); },
      onPositionUpdate: () => { /* polled in usePlayer */ },
      onSkip: (song) => { useAffinityStore.getState().recordSkip(song); },
    });

    engine.setVolume(get().volume);
    set({ audioEngine: engine, scrobbleService, subsonicClient: client });
  },

  // ── Playback ───────────────────────────────────────────────────────────────
  play: (song = null) => {
    const state = get();
    const { audioEngine, scrobbleService, subsonicClient, queue, currentIndex, shuffleMode } = state;
    if (!audioEngine || !subsonicClient) return;

    if (song) {
      const index = queue.findIndex((s) => s.id === song.id);
      const streamUrl = subsonicClient.stream(song.id);
      audioEngine.load(song, streamUrl, true);
      scrobbleService.onTrackChange();
      scrobbleService.onPlay(song);
      ListeningLog.onSongStarted(song, {
        sourceContext:  shuffleMode !== 'none' ? 'shuffle' : 'queue',
        shuffleActive:  shuffleMode !== 'none',
        queuePosition:  index >= 0 ? index : currentIndex,
      });
      set({
        currentSong: song,
        currentIndex: index >= 0 ? index : currentIndex,
        isPlaying: true,
      });
      // Preload next
      const nextIdx = (index >= 0 ? index : currentIndex) + 1;
      if (nextIdx < queue.length) {
        audioEngine.preloadNext(queue[nextIdx], subsonicClient.stream(queue[nextIdx].id));
      }
    } else {
      audioEngine.play();
      if (state.currentSong) scrobbleService.onPlay(state.currentSong);
      set({ isPlaying: true });
    }
  },

  pause: () => {
    const { audioEngine, scrobbleService } = get();
    audioEngine?.pause();
    scrobbleService?.onPause();
    ListeningLog.onPause();
    set({ isPlaying: false });
  },

  next: (autoAdvanced = false) => {
    const state = get();
    const { queue, currentIndex, repeatMode, audioEngine, scrobbleService, subsonicClient, shuffleMode } = state;
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        if (autoAdvanced) {
          // Close the open event before stopping
          if (state.currentSong) {
            ListeningLog.onSongEnded(state.currentSong, 0);
            
            // V2 Feedback
            if (shuffleMode === 'smart-v2' && audioEngine) {
              const dur = audioEngine.getDuration();
              const played = audioEngine.getPlayedDuration();
              const ratio = dur > 0 ? Math.min(played / dur, 1.0) : 0;
              useV2ShuffleStore.getState().submitFeedback(state.currentSong.title, ratio, 'trackdone');
            }
          }
          audioEngine?.stop();
          scrobbleService?.onTrackChange();
          set({ isPlaying: false, position: 0 });
        }
        return;
      }
    }

    // Close the current event (skip or track done)
    if (state.currentSong) {
      ListeningLog.onSongEnded(state.currentSong, 0);
      
      // V2 Feedback
      if (shuffleMode === 'smart-v2' && audioEngine) {
        const dur = audioEngine.getDuration();
        const played = audioEngine.getPlayedDuration();
        const ratio = dur > 0 ? Math.min(played / dur, 1.0) : 0;
        const reason = audioEngine.isNaturalEnd ? 'trackdone' : 'fwdbtn';
        useV2ShuffleStore.getState().submitFeedback(state.currentSong.title, ratio, reason);
      }
    }

    const nextSong = queue[nextIndex];
    if (audioEngine && subsonicClient) {
      audioEngine.load(nextSong, subsonicClient.stream(nextSong.id), true);
      scrobbleService?.onTrackChange();
      scrobbleService?.onPlay(nextSong);
      // Preload next-next
      if (nextIndex + 1 < queue.length) {
        audioEngine.preloadNext(queue[nextIndex + 1], subsonicClient.stream(queue[nextIndex + 1].id));
      } else if (repeatMode === 'all' && queue.length > 0) {
        audioEngine.preloadNext(queue[0], subsonicClient.stream(queue[0].id));
      }
    }

    // onSongStarted closes the previous event and opens the new one
    ListeningLog.onSongStarted(nextSong, {
      sourceContext: shuffleMode !== 'none' ? 'shuffle' : 'queue',
      shuffleActive: shuffleMode !== 'none',
      queuePosition: nextIndex,
    });

    set({ currentIndex: nextIndex, currentSong: nextSong, isPlaying: true });

    // Smart Local: trigger background refill when ≤ SMART_LOCAL_THRESHOLD remain ahead
    const fresh = get();
    if ((fresh.shuffleMode === 'smart' || fresh.shuffleMode === 'smart-v2') && _playlistPool.length > 0) {
      const remainingAhead = fresh.queue.length - 1 - nextIndex;
      if (remainingAhead <= SMART_LOCAL_THRESHOLD) {
        _triggerSmartLocalRefill(get);
      }
    }
  },

  prev: () => {
    const state = get();
    const { queue, currentIndex, audioEngine, scrobbleService, subsonicClient, shuffleMode } = state;
    if (queue.length === 0) return;

    if (state.currentSong) {
      ListeningLog.onSongEnded(state.currentSong, 0);
      
      // V2 Feedback
      if (shuffleMode === 'smart-v2' && audioEngine) {
        const dur = audioEngine.getDuration();
        const played = audioEngine.getPlayedDuration();
        const ratio = dur > 0 ? Math.min(played / dur, 1.0) : 0;
        useV2ShuffleStore.getState().submitFeedback(state.currentSong.title, ratio, 'backbtn');
      }
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;

    const prevSong = queue[prevIndex];
    if (audioEngine && subsonicClient) {
      audioEngine.load(prevSong, subsonicClient.stream(prevSong.id), true);
      scrobbleService?.onTrackChange();
      scrobbleService?.onPlay(prevSong);
      // Preload next from prev position
      const nextIdx = prevIndex + 1 < queue.length ? prevIndex + 1 : 0;
      audioEngine.preloadNext(queue[nextIdx], subsonicClient.stream(queue[nextIdx].id));
    }

    // onSongStarted closes the previous event and opens the new one
    ListeningLog.onSongStarted(prevSong, {
      sourceContext: shuffleMode !== 'none' ? 'shuffle' : 'queue',
      shuffleActive: shuffleMode !== 'none',
      queuePosition: prevIndex,
    });

    set({ currentIndex: prevIndex, currentSong: prevSong, isPlaying: true });
  },

  seek: (seconds) => {
    const { audioEngine, scrobbleService } = get();
    audioEngine?.seek(seconds);
    scrobbleService?.onSeek();
    set({ position: seconds });
  },

  setVolume: (volume) => {
    const { audioEngine, currentSong } = get();
    audioEngine?.setVolume(volume, currentSong);
    set({ volume });
  },

  setGainValue: (gainValue) => set({ gainValue }),

  setQueue: (newQueue, startIndex = 0) => {
    const clamped = Math.min(Math.max(0, startIndex), Math.max(0, newQueue.length - 1));
    // Clear smart local pool — this is a full queue replacement
    _playlistPool = [];
    _isFetchingSmartLocal = false;
    set({
      queue: newQueue,
      currentIndex: clamped,
      currentSong: newQueue[clamped] || null,
      shuffleMode: 'none',
      originalQueue: [],
      isPlaying: false,
      position: 0,
    });
  },

  reorderQueue: (oldIndex, newIndex) => {
    set((state) => {
      const newQueue = [...state.queue];
      const [moved] = newQueue.splice(oldIndex, 1);
      newQueue.splice(newIndex, 0, moved);

      let newCurrentIndex = state.currentIndex;
      if (oldIndex === state.currentIndex) newCurrentIndex = newIndex;
      else if (oldIndex < state.currentIndex && newIndex >= state.currentIndex) newCurrentIndex--;
      else if (oldIndex > state.currentIndex && newIndex <= state.currentIndex) newCurrentIndex++;

      return { queue: newQueue, currentIndex: newCurrentIndex };
    });
  },

  addToQueue: (song) => {
    set((state) => ({
      queue: [...state.queue, song],
      currentSong: state.currentSong || song,
    }));
  },

  // ── Shuffle ────────────────────────────────────────────────────────────────

  /**
   * S1/C1/C2/C3/S5/S6 — Smart Local 15-song initial load.
   * • Uses _shuffleLock to prevent concurrent calls (S5).
   * • Sets shufflePending=true while AI fetch is in flight (C3).
   * • Defaults pool to originalQueue, falls back to current queue (S6).
   * • Calls _loadAndPlay after set() to replace AudioEngine's active track (S1).
   * • Preloads queue[1] in _loadAndPlay (C2).
   */
  enableSmartShuffle: async (songs, options = {}) => {
    if (_shuffleLock) {
      console.log('[SmartShuffle] Already in progress — rejecting concurrent call');
      return;
    }
    _shuffleLock = true;
    set({ shufflePending: true });

    try {
      const { affinityData, playlistName } = options;
      const affinityDataSafe = affinityData || useAffinityStore.getState();
      const state = get();
      const currentSong = state.currentSong;

      // S6: use originalQueue as pool when available — never the already-shuffled queue
      const pool = songs
        || (state.originalQueue.length > 0 ? state.originalQueue : state.queue);

      // Save original queue before first shuffle only
      const originalQueue = state.shuffleMode === 'none' ? [...state.queue] : state.originalQueue;

      // 1. Pick seed — ALWAYS random from pool for a genuinely different queue.
      //    The current song is already playing and would just restart; the user
      //    wants variety when they press smart shuffle.
      const seedSong = pool[Math.floor(Math.random() * pool.length)];

      console.log(`[SmartShuffle] Seed selected: "${seedSong?.title}" (current was: "${currentSong?.title}")`);

      // Remember what was playing BEFORE we mutate the store
      const playingSongId = currentSong?.id ?? null;

      // 2. Init pool: all songs except seed, Fisher-Yates shuffled
      const poolWithoutSeed = pool.filter((s) => s.id !== seedSong?.id);
      for (let i = poolWithoutSeed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolWithoutSeed[i], poolWithoutSeed[j]] = [poolWithoutSeed[j], poolWithoutSeed[i]];
      }
      _playlistPool = poolWithoutSeed;

      // 3. Take first batch (up to 15)
      const firstBatch = _playlistPool.splice(0, SMART_LOCAL_BATCH);

      let ordered = null;
      let queueSource = 'local';

      // 4. Ask AI server to order the batch relative to seed
      const aiStore = useAIShuffleStore.getState();
      if (aiStore.isConfigured && aiStore.isHealthy && seedSong) {
        try {
          console.log(`[SmartShuffle] → Sending /next request | seed: "${seedSong.title}" | count: ${SMART_LOCAL_BATCH}`);
          await aiStore.fetchNext({
            current:  seedSong.title  || '',
            artist:   seedSong.artist || '',
            playlist: playlistName    || '',
            count:    SMART_LOCAL_BATCH,
          });
          const freshAi = useAIShuffleStore.getState();
          const mapped = mapRecommendationsToSongs(freshAi.recommendedQueue, firstBatch);
          if (mapped.length >= 3) {
            ordered = mapped;
            queueSource = freshAi.queueSource || 'model';
            console.log(`[SmartShuffle] ✓ AI returned ${mapped.length} ordered songs (source: ${queueSource})`);
          } else {
            console.warn(`[SmartShuffle] AI mapping produced only ${mapped.length} songs — falling back to local`);
          }
        } catch (e) {
          console.warn('[SmartShuffle] AI /next request failed — falling back to local:', e.message);
        }
      } else {
        console.log('[SmartShuffle] AI not available — using local affinity shuffle');
      }

      // 5. Fallback: local affinity-based ordering of the batch
      if (!ordered || ordered.length === 0) {
        ordered = applyShuffleAlgorithm(firstBatch, affinityDataSafe, {
          maxQueue: SMART_LOCAL_BATCH,
          avoidRecent: true,
          seedSong,
        });
        queueSource = 'local';
      }

      // 6. Build initial queue: [seed, ...ordered batch]
      // Deduplicate: remove seed from ordered in case AI returned it as a recommendation
      const orderedDeduped = seedSong
        ? ordered.filter((s) => s.id !== seedSong.id)
        : ordered;
      const initialQueue = seedSong ? [seedSong, ...orderedDeduped] : orderedDeduped;

      // 7. Drain pool of anything already in initial queue
      const queuedIds = new Set(initialQueue.map((s) => s.id));
      _playlistPool = _playlistPool.filter((s) => !queuedIds.has(s.id));


      // 8. Commit to store
      set({
        shuffleMode: 'smart',
        originalQueue,
        queue: initialQueue,
        queueSource,
        currentIndex: 0,
        currentSong: initialQueue[0] || null,
      });

      // 9. S1/C2: Load into AudioEngine — but ONLY if seed differs from currently-playing song.
      //    If seed === playing song, it's already running; just preload queue[1] silently.
      if (initialQueue[0]?.id !== playingSongId) {
        console.log(`[SmartShuffle] Seed is different from current song — loading into AudioEngine`);
        _loadAndPlay(initialQueue[0], get(), initialQueue[1] || null);
      } else {
        console.log(`[SmartShuffle] Seed matches current song — keeping playback, preloading next only`);
        const { audioEngine, subsonicClient } = get();
        if (audioEngine && subsonicClient && initialQueue[1]) {
          audioEngine.preloadNext(initialQueue[1], subsonicClient.stream(initialQueue[1].id));
          console.log(`[SmartShuffle] Preloaded next: "${initialQueue[1].title}"`);
        }
      }


      console.log(`[SmartShuffle] ✓ Queue ready — ${initialQueue.length} songs (pool: ${_playlistPool.length} remaining)`);
    } catch (e) {
      console.error('[SmartShuffle] enableSmartShuffle failed:', e);
    } finally {
      _shuffleLock = false;
      set({ shufflePending: false });
    }
  },

  /**
   * S1/C1 — Enable V2 Experimental Shuffle.
   * Completely independent from V1, fails loudly if API is down.
   */
  enableV2Shuffle: async (options = {}) => {
    if (_shuffleLock) return;
    const v2Store = useV2ShuffleStore.getState();
    
    // Fail loudly if V2 is not configured
    if (!v2Store.isConfigured || !v2Store.isHealthy) {
      console.error('[V2Shuffle] V2 server is not healthy. Halting shuffle enable.');
      return;
    }

    _shuffleLock = true;
    set({ shufflePending: true });

    try {
      const state = get();
      const currentSong = state.currentSong;
      const pool = options.songs || (state.originalQueue.length > 0 ? state.originalQueue : state.queue);
      const originalQueue = state.shuffleMode === 'none' ? [...state.queue] : state.originalQueue;
      const seedSong = pool[Math.floor(Math.random() * pool.length)];

      console.log(`[V2Shuffle] Seed selected: "${seedSong?.title}" (current was: "${currentSong?.title}")`);

      // Reset V2 Session on manual shuffle enable
      v2Store.resetSession();
      // Temporarily inject the seed into played titles so context knows it
      useV2ShuffleStore.setState({ playedTitles: [seedSong?.title] });

      // Fisher-Yates shuffle the pool (minus seed) — this becomes _playlistPool for refills
      const poolWithoutSeed = pool.filter((s) => s.id !== seedSong?.id);
      for (let i = poolWithoutSeed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolWithoutSeed[i], poolWithoutSeed[j]] = [poolWithoutSeed[j], poolWithoutSeed[i]];
      }
      _playlistPool = poolWithoutSeed;

      // V2 generates recommendations by title from its model — unlike V1 which reorders
      // a batch you send it, V2 returns ANY song titles it deems appropriate.
      // We must match against the FULL pool, not a random 15-song slice.
      let ordered = null;
      const playlistHint = options.playlistName || null;
      console.log(`[V2Shuffle] → Sending POST /next | count=15 | playlist=${playlistHint ?? 'none'}`);
      await v2Store.fetchNext({ count: 15, playlist: playlistHint });
      
      const freshV2 = useV2ShuffleStore.getState();
      console.log(`[V2Shuffle] Server returned ${freshV2.recommendedQueue.length} recommendations — mapping against full pool (${poolWithoutSeed.length} songs)`);
      const mapped = mapRecommendationsToSongs(freshV2.recommendedQueue, poolWithoutSeed);
      
      if (mapped.length > 0) {
        // Take up to SMART_LOCAL_BATCH from the AI-mapped results as initial queue
        ordered = mapped.slice(0, SMART_LOCAL_BATCH);
        console.log(`[V2Shuffle] ✓ Mapped ${mapped.length} songs — using first ${ordered.length} as initial queue`);
      } else {
        // Graceful fallback: AI names didn't match local library (different language/transliteration).
        // Use the first SMART_LOCAL_BATCH of the shuffled pool in order.
        console.warn(`[V2Shuffle] Mapping produced 0 matches — AI song titles don't match local library titles. Using shuffled pool order as fallback.`);
        ordered = poolWithoutSeed.slice(0, SMART_LOCAL_BATCH);
      }

      const orderedDeduped = seedSong ? ordered.filter((s) => s.id !== seedSong.id) : ordered;
      const initialQueue = seedSong ? [seedSong, ...orderedDeduped] : orderedDeduped;

      // Remove initial queue songs from the pool to avoid duplicates in refills
      const queuedIds = new Set(initialQueue.map((s) => s.id));
      _playlistPool = _playlistPool.filter((s) => !queuedIds.has(s.id));

      set({
        shuffleMode: 'smart-v2',
        originalQueue,
        queue: initialQueue,
        queueSource: 'v2-model',
        currentIndex: 0,
        currentSong: initialQueue[0] || null,
      });

      if (initialQueue[0]?.id !== currentSong?.id) {
        _loadAndPlay(initialQueue[0], get(), initialQueue[1] || null);
      } else {
        const { audioEngine, subsonicClient } = get();
        if (audioEngine && subsonicClient && initialQueue[1]) {
          audioEngine.preloadNext(initialQueue[1], subsonicClient.stream(initialQueue[1].id));
        }
      }
      
      console.log(`[V2Shuffle] ✓ Queue ready — ${initialQueue.length} songs (pool: ${_playlistPool.length} remaining)`);
    } catch (e) {
      console.error('[V2Shuffle] Failed to start V2 shuffle:', e);
    } finally {
      _shuffleLock = false;
      set({ shufflePending: false });
    }
  },

  /**
   * S2/S4/C1 — Dumb (Fisher-Yates) shuffle.
   * • Keeps current song at index 0 — NO audioEngine.load() call (C1 correction).
   * • Clears _playlistPool (S4).
   * • Uses originalQueue as base when available.
   */

  enableDumbShuffle: () => {
    const state = get();
    const currentSong = state.currentSong;

    // S6: always shuffle from the original unshuffled order
    const base = state.originalQueue.length > 0 ? state.originalQueue : state.queue;
    if (base.length <= 1) return;

    const originalQueue = state.shuffleMode === 'none' ? [...state.queue] : state.originalQueue;

    // Fisher-Yates on songs other than current
    const rest = base.filter((s) => s.id !== currentSong?.id);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    const newQueue = currentSong ? [currentSong, ...rest].filter(Boolean) : rest;

    // S4: clear pool — dumb shuffle is not a smart-local session
    _playlistPool = [];
    _isFetchingSmartLocal = false;

    // C1: DO NOT call _loadAndPlay — current song keeps playing uninterrupted
    set({
      shuffleMode: 'dumb',
      originalQueue,
      queue: newQueue,
      currentIndex: 0,
    });

    console.log(`[DumbShuffle] Queue shuffled — ${newQueue.length} songs, current song stays playing`);
  },

  /**
   * S3/S4 — Restore original unshuffled order.
   * • Does NOT call audioEngine.load() — current song keeps playing (S3).
   * • Clears _playlistPool and _isFetchingSmartLocal (S4).
   */
  disableShuffle: () => {
    const state = get();
    if (state.shuffleMode === 'none') return;

    // S4: clear smart local pool
    _playlistPool = [];
    _isFetchingSmartLocal = false;
    _shuffleLock = false; // safety reset

    const restoredQueue = [...state.originalQueue];
    if (restoredQueue.length === 0) {
      // No original to restore — just reset mode
      set({ shuffleMode: 'none', originalQueue: [] });
      return;
    }

    // Find current song's position in the restored queue
    let newIndex = 0;
    if (state.currentSong) {
      const found = restoredQueue.findIndex((s) => s.id === state.currentSong.id);
      if (found >= 0) newIndex = found;
    }

    // S3: no audioEngine.load() — song keeps playing, only queue/index changes
    set({
      shuffleMode: 'none',
      queue: restoredQueue,
      originalQueue: [],
      currentIndex: newIndex,
    });

    console.log(`[Shuffle] Disabled — restored ${restoredQueue.length}-song queue, index: ${newIndex}`);
  },

  // ── Misc ───────────────────────────────────────────────────────────────────
  setRepeatMode: (mode) => set({ repeatMode: mode }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
}));

// ── Debounced localStorage persistence (v2) ──────────────────────────────────
let _persistTimer = null;

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
    genre: song.genre,
  };
};

usePlayerStore.subscribe((state, prev) => {
  const changed = !prev || (
    state.queue !== prev.queue ||
    state.currentIndex !== prev.currentIndex ||
    state.currentSong?.id !== prev.currentSong?.id ||
    state.volume !== prev.volume ||
    state.repeatMode !== prev.repeatMode ||
    state.shuffleMode !== prev.shuffleMode
  );

  if (!changed) return;
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({
        __version: PERSIST_VERSION,
        queue: state.queue.map(sanitizeSong),
        currentIndex: state.currentIndex,
        currentSong: sanitizeSong(state.currentSong),
        volume: state.volume,
        shuffleMode: 'none',       // always reset on reload — don't restore mid-shuffle
        originalQueue: [],          // same — reset to avoid stale pool context
        repeatMode: state.repeatMode,
        gainValue: state.gainValue,
      }));
    } catch (e) {
      console.error('[playerStore] Persist failed:', e);
    }
  }, 5000);
});
