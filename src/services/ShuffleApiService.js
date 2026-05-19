/**
 * ShuffleApiService.js
 * Client for the local AI shuffle server endpoints.
 */

const normalize = (value) => (value || '').toString().trim().toLowerCase();

const buildIndex = (songs) => {
  const byTitle = new Map();
  const byTitleArtist = new Map();
  const byTitleArtistAlbum = new Map();

  songs.forEach((song) => {
    const title = normalize(song.title);
    if (!title) return;
    const artist = normalize(song.artist);
    const album = normalize(song.album);

    if (artist) byTitleArtist.set(`${title}|${artist}`, song);
    if (artist && album) byTitleArtistAlbum.set(`${title}|${artist}|${album}`, song);
    if (!byTitle.has(title)) byTitle.set(title, song);
  });

  return { byTitle, byTitleArtist, byTitleArtistAlbum };
};

export const mapRecommendationsToSongs = (recommendations, pool) => {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return [];
  const { byTitle, byTitleArtist, byTitleArtistAlbum } = buildIndex(pool);
  const usedIds = new Set();
  const ordered = [];

  recommendations.forEach((rec) => {
    const title = normalize(rec.title || rec.song_key);
    if (!title) return;
    const artist = normalize(rec.artist);
    const album = normalize(rec.album);

    let song = null;
    if (artist && album) song = byTitleArtistAlbum.get(`${title}|${artist}|${album}`);
    if (!song && artist) song = byTitleArtist.get(`${title}|${artist}`);
    if (!song) song = byTitle.get(title);

    if (song && !usedIds.has(song.id)) {
      ordered.push(song);
      usedIds.add(song.id);
    }
  });

  return ordered;
};

export class ShuffleApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  }

  async getNext({ currentSong, playlistName, candidates, count = 15 }) {
    if (!this.baseUrl) return [];

    const url = new URL(`${this.baseUrl}/next`);
    url.searchParams.set('count', String(count));

    if (currentSong?.title) url.searchParams.set('current', currentSong.title);
    if (currentSong?.artist) url.searchParams.set('artist', currentSong.artist);
    if (playlistName) url.searchParams.set('playlist', playlistName);

    if (Array.isArray(candidates) && candidates.length > 0) {
      const list = candidates
        .map((song) => normalize(song.title))
        .filter(Boolean)
        .join('|');
      if (list) url.searchParams.set('candidates', list);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) return [];
    const data = await res.json();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.songs)) return data.songs;
    return [];
  }
}
