/**
 * ScoringService.js
 * Pure service for calculating song shuffle scores and weights.
 */

const WEIGHT_EXPONENT = 2.5;
const RECENCY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Calculates a normalized score (0.0 - 1.0) for a song.
 * 
 * @param {Object} song - Subsonic song object
 * @param {Object} songProfile - from affinityStore
 * @param {Object} artistAff - from affinityStore
 * @param {Object} genreAff - from affinityStore
 * @param {number} hourScore - from affinityStore (0.0 - 1.0)
 * @param {Object} options - { avoidRecent: bool }
 * @returns {number} score between 0.0 and 1.0
 */
export function calculateSongScore(song, songProfile, artistAff, genreAff, hourScore = 0, options = {}) {
  let score = 0.5; // Base neutral score

  // 1. Artist Affinity
  if (artistAff) {
    score += Math.min(artistAff.playCount * 0.05, 0.3); // up to +0.3
    score -= Math.min(artistAff.skipCount * 0.05, 0.2); // up to -0.2
  }

  // 2. Genre Affinity
  if (genreAff) {
    score += Math.min(genreAff.playCount * 0.02, 0.15); // up to +0.15
  }

  // 3. Song Profile (Play/Skip/Rating)
  if (songProfile) {
    score += Math.min(songProfile.playCount * 0.1, 0.3); // up to +0.3
    score -= Math.min(songProfile.skipCount * 0.2, 0.5); // up to -0.5
    
    if (songProfile.rating) {
      // Subsonic rating is usually 1-5
      score += (songProfile.rating - 3) * 0.1; 
    }
  }

  // 4. Hour Preference
  if (hourScore > 0) {
    score += hourScore * 0.2; // up to +0.2
  }

  // Clamp score between 0.01 and 1.0 before recency penalty
  score = Math.max(0.01, Math.min(1.0, score));

  // 5. Recency Penalty
  if (options.avoidRecent !== false && songProfile?.lastPlayed) {
    const timeSincePlayed = Date.now() - songProfile.lastPlayed;
    if (timeSincePlayed < RECENCY_WINDOW_MS) {
      score *= 0.1; // Severe penalty for playing in the last 30 minutes
    } else if (timeSincePlayed < RECENCY_WINDOW_MS * 4) {
      // Gradual recovery over 2 hours
      score *= 0.5;
    }
  }

  return score;
}

/**
 * Converts a linear score (0.0 - 1.0) to a weighted probability curve.
 * 
 * @param {number} score 
 * @returns {number} 
 */
export function songWeight(score) {
  // Use user-defined exponent to create non-linear curve
  return Math.pow(Math.max(0, score), WEIGHT_EXPONENT);
}
