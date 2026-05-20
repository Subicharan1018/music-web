/**
 * mapRecommendations.js
 * Pure utility: maps RecommendedSong[] from AI server → Subsonic song objects.
 * Uses exact (title+artist+album, title+artist, title-only) then Fuse.js fuzzy fallback.
 * No imports from stores or React.
 */

import Fuse from 'fuse.js';

const normalize = (v) => (v || '').toString().trim().toLowerCase();

// Build a fast lookup index from the Subsonic song pool.
function buildIndex(songs) {
  const byTitleArtistAlbum = new Map();
  const byTitleArtist      = new Map();
  const byTitle            = new Map();

  songs.forEach((song) => {
    const t = normalize(song.title);
    const a = normalize(song.artist);
    const al = normalize(song.album);
    if (!t) return;

    if (a && al) byTitleArtistAlbum.set(`${t}|${a}|${al}`, song);
    if (a)       byTitleArtist.set(`${t}|${a}`, song);
    if (!byTitle.has(t)) byTitle.set(t, song);
  });

  return { byTitleArtistAlbum, byTitleArtist, byTitle };
}

// Build a Fuse.js index for fuzzy fallback on title+artist.
let _fuseCache = null;
let _fuseSongs = null;

function getFuse(songs) {
  if (_fuseSongs !== songs) {
    _fuseCache = new Fuse(songs, {
      keys: ['title', 'artist'],
      threshold: 0.35,
      includeScore: true,
    });
    _fuseSongs = songs;
  }
  return _fuseCache;
}

/**
 * Maps an array of RecommendedSong objects (from AI server) to Subsonic song objects.
 * Priority: exact title+artist+album → title+artist → title-only → Fuse.js fuzzy.
 * coldStart flag is preserved on the returned song object.
 *
 * @param {RecommendedSong[]} recommendations
 * @param {SubsonicSong[]}    pool            — full library or current queue
 * @returns {SubsonicSong[]}  ordered, deduplicated
 */
export function mapRecommendationsToSongs(recommendations, pool) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return [];
  if (!Array.isArray(pool) || pool.length === 0) return [];

  const index = buildIndex(pool);
  const fuse  = getFuse(pool);
  const usedIds = new Set();
  const result  = [];

  recommendations.forEach((rec) => {
    const t  = normalize(rec.title);
    const a  = normalize(rec.artist);
    const al = normalize(rec.album);
    if (!t) return;

    let song =
      (a && al && index.byTitleArtistAlbum.get(`${t}|${a}|${al}`)) ||
      (a       && index.byTitleArtist.get(`${t}|${a}`))             ||
      index.byTitle.get(t) ||
      null;

    // Fuse.js fuzzy fallback when exact lookup fails
    if (!song) {
      const hits = fuse.search(`${rec.title} ${rec.artist}`, { limit: 1 });
      if (hits.length > 0 && (hits[0].score ?? 1) < 0.4) {
        song = hits[0].item;
      }
    }

    if (song && !usedIds.has(song.id)) {
      usedIds.add(song.id);
      // Preserve coldStart flag for UI label rendering
      result.push(rec.coldStart ? { ...song, coldStart: true } : song);
    }
  });

  return result;
}
