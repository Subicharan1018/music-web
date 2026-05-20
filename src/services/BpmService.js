/**
 * BpmService.js
 * Pure service for estimating and caching song BPMs.
 */

import { GENRE_BPM_MAP } from '../lib/constants';

const DEFAULT_BPM = 110;

/**
 * Estimates BPM based on genre.
 * @param {string} genre 
 * @returns {number}
 */
export function estimateBpmFromGenre(genre) {
  if (!genre) return DEFAULT_BPM;
  
  const normalizedGenre = genre.toLowerCase();
  
  // Direct match
  if (GENRE_BPM_MAP[normalizedGenre] || GENRE_BPM_MAP[genre]) {
    return GENRE_BPM_MAP[normalizedGenre] || GENRE_BPM_MAP[genre];
  }

  // Partial match
  for (const [key, bpm] of Object.entries(GENRE_BPM_MAP)) {
    if (normalizedGenre.includes(key.toLowerCase())) {
      return bpm;
    }
  }

  return DEFAULT_BPM;
}

/**
 * Retrieves a cached BPM for a song.
 * @param {string} songId 
 * @param {Map} cache 
 * @returns {number|null}
 */
export function getCachedBpm(songId, cache) {
  if (!cache || !(cache instanceof Map)) return null;
  return cache.get(songId) || null;
}

/**
 * Caches a BPM for a song.
 * @param {string} songId 
 * @param {number} bpm 
 * @param {Map} cache 
 * @returns {Map} updated cache
 */
export function cacheBpm(songId, bpm, cache, maxSize = 200) {
  if (!cache || !(cache instanceof Map)) {
    console.warn('cacheBpm requires a valid Map instance for cache');
    return cache;
  }
  
  // BUG 6 Fix: LRU Cache eviction
  if (cache.has(songId)) {
    cache.delete(songId); // Delete to push it to the end (most recently used)
  }
  
  cache.set(songId, bpm);
  
  // Enforce max size by dropping oldest (first entry in Map iterator)
  if (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  return cache;
}
