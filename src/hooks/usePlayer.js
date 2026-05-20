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
    setDuration 
  } = store;

  useEffect(() => {
    if (isPlaying && audioEngine) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setPosition(audioEngine.getCurrentPosition());
        const dur = audioEngine.getDuration();
        if (dur > 0) {
          setDuration(dur);
        }
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Cleanup on unmount or when playing state changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, audioEngine, setPosition, setDuration]);

  // Cleanup trackChangeRef on unmount
  useEffect(() => {
    return () => {
      if (trackChangeRef.current) clearTimeout(trackChangeRef.current);
    };
  }, []);

  // Stable action refs with debounce for rapid skipping (BUG 1)
  const debouncedAction = useCallback((action) => {
    if (trackChangeRef.current) clearTimeout(trackChangeRef.current);
    trackChangeRef.current = setTimeout(() => {
      action();
    }, 50);
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
