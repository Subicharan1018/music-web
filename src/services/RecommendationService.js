/**
 * RecommendationService.js
 * Pure deterministic recommendation engine. No React, no Zustand imports.
 * Phase 6: sync recommend(), async enrichWithSimilar() for post-processing.
 */

import { calculateSongScore } from './ScoringService';

const RECENT_EXCLUDE_MS = 2 * 60 * 60 * 1000; // 2 hours

export class RecommendationService {
  /**
   * Synchronously scores and ranks songs for the "Recommended For You" section.
   *
   * @param {Array}  allSongs          - Full song pool (from libraryStore)
   * @param {Object} affinitySnapshot  - Plain state snapshot from affinityStore.getState()
   * @param {Object} options
   * @param {number}  options.limit         - Number of songs to return (default 20)
   * @param {boolean} options.excludeRecent - Skip songs played in last 2 hours (default true)
   * @param {Object}  options.seedSong      - Optional anchor song for artist/genre boost
   * @returns {Array} - Ranked song list (deterministic, no randomness)
   */
  recommend(allSongs, affinitySnapshot, options = {}) {
    if (!allSongs || allSongs.length === 0) return [];

    const {
      limit = 20,
      excludeRecent = true,
      seedSong = null,
    } = options;

    const aff = affinitySnapshot || { artists: {}, genres: {}, songs: {}, hourBuckets: [] };
    const now = Date.now();

    const scored = allSongs
      .filter((song) => {
        if (!excludeRecent) return true;
        const profile = aff.songs?.[song.id];
        if (!profile?.lastPlayed) return true;
        return now - profile.lastPlayed > RECENT_EXCLUDE_MS;
      })
      .map((song) => {
        const artistId = song.artistId || song.artist;
        let score = calculateSongScore(
          song,
          aff.songs?.[song.id],
          aff.artists?.[artistId],
          aff.genres?.[song.genre],
          this._getHourPreference(aff.hourBuckets),
          { avoidRecent: excludeRecent }
        );

        // Seed song boosts
        if (seedSong) {
          if (song.artist === seedSong.artist) score += 0.3;
          else if (song.genre && song.genre === seedSong.genre) score += 0.2;
        }

        return { song, score };
      });

    // Deterministic sort — highest score first
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.song);
  }

  /**
   * Optionally enriches recommendations using Subsonic's getSimilarSongs2.
   * Used as async post-process after recommend() — does not block UI.
   * Only applies for identical-score tiebreaking (rarely needed).
   *
   * @param {Array}          recommendations - Output from recommend()
   * @param {SubsonicClient} client          - Live client instance
   * @param {number}         topN            - How many top songs to fetch similar for
   * @returns {Promise<Array>}
   */
  async enrichWithSimilar(recommendations, client, topN = 3) {
    if (!recommendations.length || !client) return recommendations;

    try {
      const seeds = recommendations.slice(0, topN);
      const similarResults = await Promise.allSettled(
        seeds.map((s) => client.getSimilarSongs2(s.id, 5))
      );

      const similarSongIds = new Set();
      similarResults.forEach((r) => {
        if (r.status === 'fulfilled') {
          const songs = r.value?.similarSongs2?.song || [];
          songs.forEach((s) => similarSongIds.add(s.id));
        }
      });

      // Move recommendations whose IDs match similar songs higher in the list
      // (simple tiebreaker: no scoring change, just a stable reorder)
      const boosted = recommendations.filter((s) => similarSongIds.has(s.id));
      const rest = recommendations.filter((s) => !similarSongIds.has(s.id));
      return [...boosted, ...rest];
    } catch {
      return recommendations;
    }
  }

  _getHourPreference(hourBuckets) {
    if (!hourBuckets || hourBuckets.length !== 24) return 0;
    const hour = new Date().getHours();
    const maxVal = Math.max(...hourBuckets, 1);
    return hourBuckets[hour] / maxVal;
  }
}

export const recommendationService = new RecommendationService();
