/**
 * BpmService.js
 * Pure service for estimating and caching song BPMs.
 */

const GENRE_BPM_MAP = {
  'classical': 60,
  'ambient': 70,
  'blues': 80,
  'reggae': 90,
  'hip-hop': 90,
  'r&b': 95,
  'soul': 100,
  'funk': 105,
  'country': 110,
  'folk': 110,
  'pop': 120,
  'jazz': 120,
  'electronic': 128,
  'rock': 130,
  'metal': 160,
  'punk': 160
};

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
  if (GENRE_BPM_MAP[normalizedGenre]) {
    return GENRE_BPM_MAP[normalizedGenre];
  }

  // Partial match
  for (const [key, bpm] of Object.entries(GENRE_BPM_MAP)) {
    if (normalizedGenre.includes(key)) {
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
export function cacheBpm(songId, bpm, cache) {
  if (!cache || !(cache instanceof Map)) {
    console.warn('cacheBpm requires a valid Map instance for cache');
    return cache;
  }
  cache.set(songId, bpm);
  return cache;
}
