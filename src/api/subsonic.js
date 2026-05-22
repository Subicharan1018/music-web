/**
 * subsonic.js
 * Subsonic API layer upgraded to a class-based singleton.
 * Handles authentication, request building, and typed error handling.
 */

import md5 from 'md5';
import { ENDPOINTS } from './endpoints';
import { useSettingsStore } from '../store/settingsStore';

export class NetworkException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkException';
  }
}

export class AuthException extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthException';
  }
}

export class ServerException extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ServerException';
    this.code = code;
  }
}

class SubsonicClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl ? config.serverUrl.replace(/\/$/, '') : '';
    this.username = config.username || '';
    this.password = config.password || '';
    this.clientName = 'NaviVibeWeb';
    this.version = '1.16.1';

    // Stable auth params — generated ONCE per client instance.
    // A new random salt per call (old behaviour) made every cover art URL
    // unique, permanently defeating the browser HTTP cache.
    // Salt is entropy, not a nonce — one value per session is fine.
    this._salt = Math.random().toString(36).substring(2, 15);
    this._token = md5(this.password + this._salt);
  }

  // Stable params — used for cover art, metadata, playlists etc.
  // Same URL every time → browser cache hits on repeat renders.
  _authParams() {
    return {
      u: this.username,
      t: this._token,
      s: this._salt,
      v: this.version,
      c: this.clientName,
      f: 'json',
    };
  }

  // Fresh params — used only for stream URLs where a stale cached
  // response would deliver the wrong audio. Still keeps one token
  // per stream request, not per render.
  _freshAuthParams() {
    const salt = Math.random().toString(36).substring(2, 15);
    return {
      u: this.username,
      t: md5(this.password + salt),
      s: salt,
      v: this.version,
      c: this.clientName,
      f: 'json',
    };
  }

  /** @deprecated use _authParams() or _freshAuthParams() directly */
  _generateAuthParams() {
    return this._authParams();
  }

  _buildUrl(endpoint, extraParams = {}, useFreshToken = false) {
    if (!this.serverUrl) throw new AuthException("Server URL is not configured");
    const url = new URL(`${this.serverUrl}/rest/${endpoint}`);
    const authParams = useFreshToken ? this._freshAuthParams() : this._authParams();
    Object.entries({ ...authParams, ...extraParams }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, v));
        } else {
          url.searchParams.append(key, value);
        }
      }
    });
    return url.toString();
  }

  async _request(endpoint, extraParams = {}) {
    const url = this._buildUrl(endpoint, extraParams);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new NetworkException(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data['subsonic-response']?.status === 'failed') {
        const error = data['subsonic-response'].error;
        if (error.code === 40 || error.code === 50) {
          throw new AuthException(error.message || 'Authentication failed');
        }
        throw new ServerException(error.message || 'Server error', error.code);
      }
      
      return data['subsonic-response'];
    } catch (error) {
      if (error instanceof AuthException || error instanceof ServerException || error instanceof NetworkException) {
        throw error;
      }
      throw new NetworkException(error.message || 'Network request failed');
    }
  }

  async ping() {
    return this._request(ENDPOINTS.PING);
  }

  async getArtists() {
    return this._request(ENDPOINTS.GET_ARTISTS);
  }

  async getArtist(id) {
    return this._request(ENDPOINTS.GET_ARTIST, { id });
  }

  async getAlbum(id) {
    return this._request(ENDPOINTS.GET_ALBUM, { id });
  }

  async getAlbumList(type = 'newest', size = 50, offset = 0) {
    return this._request(ENDPOINTS.GET_ALBUM_LIST, { type, size, offset });
  }

  async getAlbumList2(type = 'newest', size = 50, offset = 0) {
    return this._request(ENDPOINTS.GET_ALBUM_LIST2, { type, size, offset });
  }

  async getSong(id) {
    return this._request(ENDPOINTS.GET_SONG, { id });
  }

  async getSimilarSongs2(id, count = 50) {
    return this._request(ENDPOINTS.GET_SIMILAR_SONGS2, { id, count });
  }

  async search(query, { artistCount = 20, albumCount = 20, songCount = 20 } = {}) {
    return this._request(ENDPOINTS.SEARCH, { query, artistCount, albumCount, songCount });
  }

  async search3(query, { artistCount = 20, albumCount = 20, songCount = 20 } = {}) {
    return this._request(ENDPOINTS.SEARCH3, { query, artistCount, albumCount, songCount });
  }

  async star(id, type = 'song') {
    const params = {};
    if (type === 'song') params.id = id;
    else if (type === 'album') params.albumId = id;
    else if (type === 'artist') params.artistId = id;
    return this._request(ENDPOINTS.STAR, params);
  }

  async unstar(id, type = 'song') {
    const params = {};
    if (type === 'song') params.id = id;
    else if (type === 'album') params.albumId = id;
    else if (type === 'artist') params.artistId = id;
    return this._request(ENDPOINTS.UNSTAR, params);
  }

  async getRandomSongs(size = 50, options = {}) {
    return this._request(ENDPOINTS.GET_RANDOM_SONGS, { size, ...options });
  }

  async getPlaylists() {
    return this._request(ENDPOINTS.GET_PLAYLISTS);
  }

  async getPlaylist(id) {
    return this._request(ENDPOINTS.GET_PLAYLIST, { id });
  }

  async createPlaylist(name, songId = []) {
    return this._request(ENDPOINTS.CREATE_PLAYLIST, { name, songId });
  }

  async updatePlaylist(playlistId, { name, comment, public: isPublic, songIdToAdd = [], songIndexToRemove = [] }) {
    return this._request(ENDPOINTS.UPDATE_PLAYLIST, { 
      playlistId, 
      name, 
      comment, 
      public: isPublic, 
      songIdToAdd, 
      songIndexToRemove 
    });
  }

  async deletePlaylist(id) {
    return this._request(ENDPOINTS.DELETE_PLAYLIST, { id });
  }

  async getStarred() {
    return this._request(ENDPOINTS.GET_STARRED);
  }

  async getStarred2() {
    return this._request(ENDPOINTS.GET_STARRED2);
  }

  async getLyrics(artist, title) {
    return this._request(ENDPOINTS.GET_LYRICS, { artist, title });
  }

  async getLyricsBySongId(id) {
    return this._request(ENDPOINTS.GET_LYRICS_BY_SONG_ID, { id });
  }

  async getGenres() {
    return this._request(ENDPOINTS.GET_GENRES);
  }

  /**
   * GET /rest/getSongsByGenre — fetch songs matching a genre tag.
   * Used by the shuffle pipeline to expand the candidate pool beyond the current playlist.
   * @param {string} genre    - exact genre label (case-sensitive on most servers)
   * @param {number} count    - max songs to return (default 50)
   * @param {number} offset   - pagination offset
   * @returns {Promise<Array>} normalised Song array
   */
  async getSongsByGenre(genre, count = 50, offset = 0) {
    const resp = await this._request(ENDPOINTS.GET_SONGS_BY_GENRE, { genre, count, offset });
    const songs = resp?.songsByGenre?.song;
    if (!Array.isArray(songs)) return [];
    return songs;
  }

  /**
   * GET /rest/getTopSongs — fetch top-played songs for an artist (Subsonic 1.13+).
   * Wrapped in try/catch — older servers (< 1.13) throw a ServerException.
   * @param {string} artistName - artist display name
   * @param {number} count      - max songs (default 20)
   * @returns {Promise<Array>} normalised Song array, or [] on unsupported servers
   */
  async getTopSongs(artistName, count = 20) {
    try {
      const resp = await this._request(ENDPOINTS.GET_TOP_SONGS, { artist: artistName, count });
      const songs = resp?.topSongs?.song;
      if (!Array.isArray(songs)) return [];
      return songs;
    } catch {
      // Graceful degradation — server doesn't support this endpoint
      return [];
    }
  }

  // Stream URL gets a fresh token each call — prevents browser from serving
  // a cached stream response when a different song is requested.
  stream(songId, options = {}) {
    const settings = useSettingsStore.getState();
    const transcodeFormat = settings.transcodeFormat || 'raw';
    const maxBitRate = settings.transcodeMaxBitRate || 0;

    const defaultOptions = {};
    if (transcodeFormat !== 'raw') {
      defaultOptions.format = transcodeFormat;
      if (maxBitRate > 0) {
        defaultOptions.maxBitRate = maxBitRate;
      }
    } else {
      defaultOptions.format = 'raw';
    }

    return this._buildUrl(ENDPOINTS.STREAM, { id: songId, ...defaultOptions, ...options }, true);
  }

  getStreamUrl(songId, options = {}) {
    return this.stream(songId, options);
  }

  // Cover art URLs are stable (same salt/token per session).
  // This is the key to browser HTTP cache hits on album art.
  getCoverArtUrl(id, size = 300) {
    if (!id) return '';
    return this._buildUrl(ENDPOINTS.GET_COVER_ART, { id, size });
  }

  async scrobble(id, time, submission = true) {
    return this._request(ENDPOINTS.SCROBBLE, { id, time, submission });
  }
}

let clientInstance = null;

export const createSubsonicClient = (config) => {
  if (!clientInstance || config) {
    clientInstance = new SubsonicClient(config);
  }
  return clientInstance;
};
