/**
 * ShuffleService.js
 * Main pipeline for AI Smart Shuffle.
 */

import { calculateSongScore, songWeight } from './ScoringService';
import { weightedRandomSelect } from '../utils/weightedRandom';

const DEFAULT_MAX_QUEUE = 50;

/**
 * Main entry point. Takes the full library and returns a weighted-shuffled queue.
 *
 * @param {Array}  songs        - full song list from libraryStore or album/playlist
 * @param {Object} affinityData - snapshot from affinityStore
 * @param {Object} options      - { maxQueue, avoidRecent, seedSong }
 * @returns {Array}             - ordered array of songs (the new queue)
 */
export function applyShuffleAlgorithm(songs, affinityData, options = {}) {
  if (!songs || songs.length === 0) return [];

  const maxQueue = options.maxQueue || DEFAULT_MAX_QUEUE;
  const avoidRecent = options.avoidRecent !== false; // default true
  const seedSong = options.seedSong;

  // If there's a seed song, we remove it from the pool to avoid duplicates
  let pool = [...songs];
  if (seedSong) {
    pool = pool.filter(s => s.id !== seedSong.id);
  }

  // 1. Score every song & 2. Apply songWeight
  const weights = pool.map(song => {
    const artistId = song.artistId || song.artist;
    const score = calculateSongScore(
      song,
      affinityData.songs?.[song.id],
      affinityData.artists?.[artistId],
      affinityData.genres?.[song.genre],
      affinityData.hourBuckets ? getHourPreference(affinityData.hourBuckets) : 0,
      { avoidRecent }
    );
    return songWeight(score);
  });

  // 3 & 4. weightedRandomSelect 
  const countToSelect = seedSong ? maxQueue - 1 : maxQueue;
  const selectedItems = weightedRandomSelect(pool, weights, countToSelect);

  // 5. Interleave
  const interleaved = interleave(selectedItems);

  // Re-attach seed song to the front if provided
  if (seedSong) {
    return [seedSong, ...interleaved];
  }

  return interleaved;
}

/**
 * Helper to compute hour preference from raw buckets manually since 
 * affinityStore.getHourPreference() is bound to the store instance.
 */
function getHourPreference(hourBuckets) {
  if (!hourBuckets || hourBuckets.length !== 24) return 0;
  const hour = new Date().getHours();
  const maxVal = Math.max(...hourBuckets, 1);
  return hourBuckets[hour] / maxVal;
}

/**
 * Re-orders a selected list of songs to prevent identical back-to-back artists or genres.
 * 
 * @param {Array} songs 
 * @returns {Array}
 */
export function interleave(songs) {
  if (songs.length <= 1) return songs;

  const pool = [...songs];
  const result = [];
  
  // Start with the first song
  result.push(pool.shift());

  let iterationCount = 0;
  const MAX_ITERATIONS = songs.length * 2;

  while (pool.length > 0) {
    iterationCount++;

    const lastArtist = result[result.length - 1].artist;
    
    // Track genres in last 2 positions
    const recentGenres = [];
    if (result.length >= 1) recentGenres.push(result[result.length - 1].genre);
    if (result.length >= 2) recentGenres.push(result[result.length - 2].genre);

    let foundCandidate = false;
    let attempts = 0;

    for (let i = 0; i < pool.length; i++) {
      attempts++;
      const candidate = pool[i];
      
      const artistMatch = candidate.artist === lastArtist;
      const genreMatch = recentGenres.includes(candidate.genre);

      // We relax the constraints if we can't find a good match quickly.
      // E.g., after 3 attempts, we accept artistMatch or genreMatch.
      const isRelaxed = attempts > 3;

      if (!isRelaxed && (artistMatch || genreMatch)) {
        continue;
      }

      // Found a suitable candidate (or relaxed)
      result.push(candidate);
      pool.splice(i, 1);
      foundCandidate = true;
      break;
    }

    // Failsafe: if we couldn't place *anything* (should be impossible with relaxation),
    // or if we hit the infinite loop protection cap, just take the first item.
    if (!foundCandidate || iterationCount > MAX_ITERATIONS) {
      result.push(pool.shift());
    }
  }

  return result;
}
