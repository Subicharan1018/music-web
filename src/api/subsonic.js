/**
 * subsonic.js
 * Subsonic API layer upgraded to a class-based singleton.
 * Handles authentication, request building, and typed error handling.
 */

import md5 from 'md5';
import { ENDPOINTS } from './endpoints';

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
  }

  _generateAuthParams() {
    const salt = Math.random().toString(36).substring(2, 15);
    const token = md5(this.password + salt);
    
    return {
      u: this.username,
      t: token,
      s: salt,
      v: this.version,
      c: this.clientName,
      f: 'json'
    };
  }

  _buildUrl(endpoint, extraParams = {}) {
    if (!this.serverUrl) throw new AuthException("Server URL is not configured");
    
    const url = new URL(`${this.serverUrl}/rest/${endpoint}`);
    const authParams = this._generateAuthParams();
    
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

  async getAlbumList2(type = 'newest', size = 50, offset = 0) {
    return this._request(ENDPOINTS.GET_ALBUM_LIST2, { type, size, offset });
  }

  async getSong(id) {
    return this._request(ENDPOINTS.GET_SONG, { id });
  }

  async getSimilarSongs2(id, count = 50) {
    return this._request(ENDPOINTS.GET_SIMILAR_SONGS2, { id, count });
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

  async getStarred2() {
    return this._request(ENDPOINTS.GET_STARRED2);
  }

  async getLyrics(artist, title) {
    return this._request(ENDPOINTS.GET_LYRICS, { artist, title });
  }

  async getLyricsBySongId(id) {
    return this._request(ENDPOINTS.GET_LYRICS_BY_SONG_ID, { id });
  }

  stream(songId, options = {}) {
    return this._buildUrl(ENDPOINTS.STREAM, { id: songId, ...options });
  }

  getCoverArtUrl(id, size = 300) {
    if (!id) return '';
    return this._buildUrl(ENDPOINTS.GET_COVER_ART, { id, size });
  }
}

let clientInstance = null;

export const createSubsonicClient = (config) => {
  if (!clientInstance || config) {
    clientInstance = new SubsonicClient(config);
  }
  return clientInstance;
};
