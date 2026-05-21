/**
 * useLyrics.js
 * Loads lyrics with fallbacks and keeps synced line state in sync.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LyricsService } from '../services/LyricsService';
import { getCurrentLineIndex } from '../services/LrcParser';
import { useSubsonic } from './useSubsonic';

export const useLyrics = (song, positionMs) => {
  const client = useSubsonic();
  const serviceRef = useRef(null);
  const lastSongIdRef = useRef(null);

  const [lines, setLines] = useState([]);
  const [isSynced, setIsSynced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const lineRefs = useRef(new Map());

  useEffect(() => {
    serviceRef.current = new LyricsService({ subsonicClient: client });
  }, [client]);

  useEffect(() => {
    if (!song?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLines([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSynced(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentLineIndex(-1);
      lastSongIdRef.current = null;
      return;
    }

    if (lastSongIdRef.current === song.id) return;
    lastSongIdRef.current = song.id;

    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setLines([]);
    setIsSynced(false);
    setCurrentLineIndex(-1);

    serviceRef.current?.getLyrics(song)
      .then((result) => {
        if (isCancelled) return;
        if (!result) {
          setLines([]);
          setIsSynced(false);
          return;
        }
        setLines(result.lines || []);
        setIsSynced(!!result.isSynced);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err?.message || 'Failed to load lyrics');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [song]);

  useEffect(() => {
    if (!isSynced || !lines.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentLineIndex(-1);
      return;
    }
    const idx = getCurrentLineIndex(lines, positionMs || 0);
    setCurrentLineIndex((prev) => (prev === idx ? prev : idx));
  }, [lines, isSynced, positionMs]);

  useEffect(() => {
    if (!isSynced || currentLineIndex < 0) return;
    if (userScrollingRef.current) return;

    const el = lineRefs.current.get(currentLineIndex);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex, isSynced]);

  const handleScroll = useCallback(() => {
    userScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      userScrollingRef.current = false;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const registerLineRef = useCallback((index) => (el) => {
    if (!el) {
      lineRefs.current.delete(index);
      return;
    }
    lineRefs.current.set(index, el);
  }, []);

  return {
    lines,
    currentLineIndex,
    isSynced,
    isLoading,
    error,
    handleScroll,
    registerLineRef
  };
};
