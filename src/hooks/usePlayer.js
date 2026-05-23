/**
 * usePlayer.js
 * React hook exposing player state and stable actions.
 * BUG 1 Fix: Manages position polling timer via useRef to prevent memory leaks.
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useAffinityStore } from '../store/affinityStore';

export const usePlayer = () => {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentSong = usePlayerStore(s => s.currentSong);
  const audioEngine = usePlayerStore(s => s.audioEngine);

  const timerRef = useRef(null);
  const trackChangeRef = useRef(null);

  // Main position + duration polling — only while playing.
  // 300ms is smooth enough for the UI scrubber and saves CPU vs 250ms.
  useEffect(() => {
    if (isPlaying && audioEngine) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const pos = audioEngine.getCurrentPosition();
        const dur = audioEngine.getDuration();
        usePlayerStore.getState().setPosition(pos);
        if (dur > 0) usePlayerStore.getState().setDuration(dur);
        // Drive scrobble accumulation from this single tick
        const store = usePlayerStore.getState();
        if (store.scrobbleService) {
          store.scrobbleService.tick();
        }
      }, 300);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, audioEngine]);


  // One-shot duration read on song change — covers the paused/initial case.
  // Uses rAF retry instead of a tight 100ms interval (avoids 40 ticks over 4s).
  useEffect(() => {
    if (!audioEngine || !currentSong) return;
    let raf = null;
    let attempts = 0;
    const MAX = 20; // ~20 frames ≈ 333ms at 60fps — more than enough for Howl load
    const tryRead = () => {
      const dur = audioEngine.getDuration();
      if (dur > 0) {
        usePlayerStore.getState().setDuration(dur);
      } else if (++attempts < MAX) {
        raf = requestAnimationFrame(tryRead);
      }
    };
    raf = requestAnimationFrame(tryRead);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [currentSong?.id, audioEngine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup trackChangeRef on unmount
  useEffect(() => {
    return () => {
      if (trackChangeRef.current) clearTimeout(trackChangeRef.current);
    };
  }, []);

  // RC-02: Stable action refs with AbortController + debounce for rapid skipping.
  // If the effect re-fires before the timer, abort() prevents the stale action.
  const debouncedAction = useCallback((action) => {
    if (trackChangeRef.current) {
      trackChangeRef.current.abort?.();
      clearTimeout(trackChangeRef.current.timerId);
    }
    const controller = new AbortController();
    const timerId = setTimeout(() => {
      if (!controller.signal.aborted) action();
    }, 80);
    trackChangeRef.current = { abort: () => controller.abort(), timerId };
  }, []);

  const play = useCallback((song) => usePlayerStore.getState().play(song), []);
  const pause = useCallback(() => usePlayerStore.getState().pause(), []);
  const next = useCallback(() => debouncedAction(() => usePlayerStore.getState().next()), [debouncedAction]);
  const prev = useCallback(() => debouncedAction(() => usePlayerStore.getState().prev()), [debouncedAction]);
  const seek = useCallback((seconds) => usePlayerStore.getState().seek(seconds), []);
  const setVolume = useCallback((v) => usePlayerStore.getState().setVolume(v), []);
  const setQueue = useCallback((q) => usePlayerStore.getState().setQueue(q), []);
  const addToQueue = useCallback((song) => usePlayerStore.getState().addToQueue(song), []);
  const setShuffle = useCallback((e) => usePlayerStore.getState().setShuffle(e), []);
  const setRepeatMode = useCallback((m) => usePlayerStore.getState().setRepeatMode(m), []);

  const enableSmartShuffle = useCallback(async (songs, options = {}) => {
    await usePlayerStore.getState().enableSmartShuffle(songs, options);
    setAffinityRefresh(prev => prev + 1);
  }, []);

  const enableV2Shuffle = useCallback(async (songs, options = {}) => {
    await usePlayerStore.getState().enableV2Shuffle(songs, options);
  }, []);

  const enableDumbShuffle = useCallback(() => usePlayerStore.getState().enableDumbShuffle(), []);
  const disableShuffle = useCallback(() => usePlayerStore.getState().disableShuffle(), []);

  return {
    play,
    pause,
    next,
    prev,
    seek,
    setVolume,
    setQueue,
    addToQueue,
    setRepeatMode,
    enableSmartShuffle,
    enableV2Shuffle,
    enableDumbShuffle,
    disableShuffle,
  };

};
