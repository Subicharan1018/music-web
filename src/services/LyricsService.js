/**
 * LyricsService.js
 * Fetches and caches lyrics from LrcLib and Subsonic with fallbacks.
 */

import { isLrcFormat, parseLrc, parsePlain } from './LrcParser';

const MAX_CACHE = 100;

export class LyricsService {
  constructor({ subsonicClient }) {
    this.subsonicClient = subsonicClient || null;
    this.cache = new Map();
  }

  _touchCache(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > MAX_CACHE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clearCache() {
    this.cache.clear();
  }

  async getLyrics(song) {
    if (!song) return null;
    const key = song.id || `${song.artist || ''}-${song.title || ''}-${song.album || ''}-${song.duration || ''}`;

    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      this._touchCache(key, cached);
      return cached;
    }

    const fromLrcLib = await this._getFromLrcLib(song);
    if (fromLrcLib) {
      this._touchCache(key, fromLrcLib);
      return fromLrcLib;
    }

    const fromStructured = await this._getFromSubsonicStructured(song);
    if (fromStructured) {
      this._touchCache(key, fromStructured);
      return fromStructured;
    }

    const fromPlain = await this._getFromSubsonicPlain(song);
    if (fromPlain) {
      this._touchCache(key, fromPlain);
      return fromPlain;
    }

    this._touchCache(key, null);
    return null;
  }

  async _getFromLrcLib(song) {
    if (!song?.artist || !song?.title) return null;

    try {
      const url = new URL('https://lrclib.net/api/get');
      url.searchParams.set('artist_name', song.artist);
      url.searchParams.set('track_name', song.title);
      if (song.album) url.searchParams.set('album_name', song.album);
      if (song.duration) url.searchParams.set('duration', Math.round(song.duration));

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const syncedLyrics = data?.syncedLyrics || '';
      const plainLyrics = data?.plainLyrics || '';

      if (syncedLyrics && isLrcFormat(syncedLyrics)) {
        const lines = parseLrc(syncedLyrics);
        if (lines.length > 0) {
          return { lines, isSynced: true, source: 'lrclib' };
        }
      }

      if (plainLyrics) {
        const lines = parsePlain(plainLyrics);
        if (lines.length > 0) {
          return { lines, isSynced: false, source: 'lrclib' };
        }
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  async _getFromSubsonicStructured(song) {
    if (!this.subsonicClient || !song?.id) return null;

    try {
      const data = await this.subsonicClient.getLyricsBySongId(song.id);
      const lyrics = data?.lyrics || data?.structuredLyrics || data?.getLyricsBySongId;
      const line = lyrics?.line || lyrics?.lines || [];
      if (!Array.isArray(line) || line.length === 0) return null;

      const lines = line.map((entry) => {
        if (typeof entry === 'string') {
          return { time: null, text: entry };
        }
        const rawTime = entry.start ?? entry.startTime ?? entry.startMs ?? entry.time ?? null;
        let time = rawTime;
        if (typeof time === 'number' && time > 0 && time < 1000) time = Math.round(time * 1000);
        return { time, text: entry.value ?? entry.text ?? '' };
      }).filter((entry) => entry.time !== null && entry.time !== undefined);

      if (lines.length === 0) return null;
      lines.sort((a, b) => a.time - b.time);
      return { lines, isSynced: true, source: 'subsonic-structured' };
    } catch (error) {
      return null;
    }
  }

  async _getFromSubsonicPlain(song) {
    if (!this.subsonicClient || !song?.artist || !song?.title) return null;

    try {
      const data = await this.subsonicClient.getLyrics(song.artist, song.title);
      const lyrics = data?.lyrics || data?.getLyrics || data?.lyric || '';
      if (!lyrics) return null;
      const lines = isLrcFormat(lyrics) ? parseLrc(lyrics) : parsePlain(lyrics);
      if (lines.length === 0) return null;
      return { lines, isSynced: isLrcFormat(lyrics), source: 'subsonic' };
    } catch (error) {
      return null;
    }
  }
}
