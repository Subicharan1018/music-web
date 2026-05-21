/**
 * usePlayer.js
 * React hook exposing player state and stable actions.
 * BUG 1 Fix: Manages position polling timer via useRef to prevent memory leaks.
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useAffinityStore } from '../store/affinityStore';

export const usePlayer = () => {
  const store = usePlayerStore();
  const timerRef = useRef(null);
  const trackChangeRef = useRef(null); // BUG 1 Fix

  const [affinityRefresh, setAffinityRefresh] = useState(0);
  const affinityData = useMemo(() => useAffinityStore.getState(), [affinityRefresh]);

  const { 
    audioEngine, 
    isPlaying, 
    setPosition, 
    setDuration,
    currentSong,
  } = store;

  // Main position + duration polling — only while playing.
  // 300ms is smooth enough for the UI scrubber and saves CPU vs 250ms.
  useEffect(() => {
    if (isPlaying && audioEngine) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const pos = audioEngine.getCurrentPosition();
        const dur = audioEngine.getDuration();
        setPosition(pos);
        if (dur > 0) setDuration(dur);
        // Drive scrobble accumulation from this single tick (replaces AudioEngine's own timer)
        audioEngine._tickScrobble?.(pos, dur, 0.3);
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
  }, [isPlaying, audioEngine, setPosition, setDuration]);


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
        setDuration(dur);
      } else if (++attempts < MAX) {
        raf = requestAnimationFrame(tryRead);
      }
    };
    raf = requestAnimationFrame(tryRead);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [currentSong?.id, audioEngine, setDuration]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const play = useCallback((song) => store.play(song), [store]);
  const pause = useCallback(() => store.pause(), [store]);
  const next = useCallback(() => debouncedAction(() => store.next()), [store, debouncedAction]);
  const prev = useCallback(() => debouncedAction(() => store.prev()), [store, debouncedAction]);
  const seek = useCallback((seconds) => store.seek(seconds), [store]);
  const setVolume = useCallback((v) => store.setVolume(v), [store]);
  const setQueue = useCallback((q) => store.setQueue(q), [store]);
  const addToQueue = useCallback((song) => store.addToQueue(song), [store]);
  const setShuffle = useCallback((e) => store.setShuffle(e), [store]);
  const setRepeatMode = useCallback((m) => store.setRepeatMode(m), [store]);

  const enableSmartShuffle = useCallback(async (songs, options = {}) => {
    await store.enableSmartShuffle(songs, { ...options, affinityData });
    setAffinityRefresh(prev => prev + 1);
  }, [store, affinityData]);

  const enableDumbShuffle = useCallback(() => store.enableDumbShuffle(), [store]);
  const disableShuffle = useCallback(() => store.disableShuffle(), [store]);

  return {
    queue: store.queue,
    currentSong: store.currentSong,
    isPlaying: store.isPlaying,
    currentIndex: store.currentIndex,
    position: store.position,
    duration: store.duration,
    volume: store.volume,
    shuffleEnabled: store.shuffleEnabled,
    shuffleMode: store.shuffleMode,
    repeatMode: store.repeatMode,
    
    play,
    pause,
    next,
    prev,
    seek,
    setVolume,
    setQueue,
    addToQueue,
    setShuffle,
    setRepeatMode,
    enableSmartShuffle,
    enableDumbShuffle,
    disableShuffle,
  };
};
