/**
 * ScrobbleService.js
 * Dual-target scrobble: Subsonic (primary) + Last.fm (optional, user-configured).
 * Phase 6: Added _submitToLastFm(). Gated on settingsStore.lastfmSessionKey.
 *
 * api_sig rules (Last.fm spec): sort all params alphabetically, concatenate
 * key+value pairs WITHOUT separator, append shared_secret, MD5 the result.
 * IMPORTANT: exclude 'format' and 'callback' from the signature string.
 */

import md5 from 'md5';
import { useSettingsStore } from '../store/settingsStore';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

class ScrobbleService {
  constructor({ subsonicClient, onScrobble }) {
    this.client = subsonicClient;
    this.onScrobbleCallback = onScrobble;
    this.currentSong = null;
    this.lastPlayTimestamp = null;
    this.accumulatedListenTime = 0;
    this.scrobbledSongs = new Set();
  }

  _updateListenTime() {
    if (this.lastPlayTimestamp) {
      const now = Date.now();
      const diff = (now - this.lastPlayTimestamp) / 1000;
      this.accumulatedListenTime += diff;
      this.lastPlayTimestamp = now;
    }
  }

  _checkThresholds() {
    if (!this.currentSong || this.scrobbledSongs.has(this.currentSong.id)) return false;
    if (this.accumulatedListenTime >= 240) return true;
    const duration = this.currentSong.duration || 0;
    if (duration > 0 && this.accumulatedListenTime >= duration / 2) return true;
    return false;
  }

  onPlay(song) {
    if (!this.currentSong || this.currentSong.id !== song.id) {
      this.currentSong = song;
      this.accumulatedListenTime = 0;
      this.lastPlayTimestamp = Date.now();
    } else {
      this.lastPlayTimestamp = Date.now();
    }
    this.checkAndSubmit();
  }

  onPause() {
    this._updateListenTime();
    this.lastPlayTimestamp = null;
    this.checkAndSubmit();
  }

  tick() {
    if (this.lastPlayTimestamp) {
      this._updateListenTime();
      this.checkAndSubmit();
    }
  }

  onSeek() {
    // BUG 2 FIX: Reset accumulated listen time on seek
    this.accumulatedListenTime = 0;
    if (this.lastPlayTimestamp) {
      this.lastPlayTimestamp = Date.now();
    }
  }

  onTrackChange() {
    if (this.lastPlayTimestamp) this._updateListenTime();
    this.checkAndSubmit();
    this.currentSong = null;
    this.accumulatedListenTime = 0;
    this.lastPlayTimestamp = null;
  }

  async checkAndSubmit() {
    if (this._checkThresholds()) {
      await this.submitScrobble(this.currentSong);
    }
  }

  async submitScrobble(song) {
    if (!song || !this.client) return;

    this.scrobbledSongs.add(song.id);
    const timestamp = Math.floor(Date.now() / 1000);

    // ── Subsonic scrobble ────────────────────────────────────────────────────
    try {
      await this.client._request('scrobble.view', {
        id: song.id,
        time: Date.now(),
        submission: true,
      });
      console.log(`Scrobbled (Subsonic): ${song.title}`);
    } catch (err) {
      console.error(`Failed to scrobble to Subsonic: ${song.title}`, err);
    }

    // ── Affinity callback ────────────────────────────────────────────────────
    if (this.onScrobbleCallback) {
      this.onScrobbleCallback(song, Math.round(this.accumulatedListenTime * 1000));
    }

    // ── Last.fm scrobble (optional) ──────────────────────────────────────────
    await this._submitToLastFm(song, timestamp);
  }

  /**
   * Submit a scrobble to Last.fm.
   * api_sig: sort params alphabetically (excluding 'format' and 'callback'),
   * concatenate as key+value pairs, append api_secret, MD5 the whole string.
   * Ref: https://www.last.fm/api/authspec
   */
  async _submitToLastFm(song, timestamp) {
    const settings = useSettingsStore.getState();
    const { scrobblingEnabled, lastfmSessionKey, lastfmApiKey, lastfmApiSecret } = settings;

    if (!scrobblingEnabled || !lastfmSessionKey || !lastfmApiKey || !lastfmApiSecret) return;

    const params = {
      method:    'track.scrobble',
      api_key:   lastfmApiKey,
      sk:        lastfmSessionKey,
      artist:    song.artist || '',
      track:     song.title || '',
      album:     song.album || '',
      timestamp: String(timestamp),
    };

    // Build signature — sort keys, exclude 'format' and 'callback', concatenate, append secret
    const sigString =
      Object.keys(params)
        .sort()
        .map((k) => `${k}${params[k]}`)
        .join('') + lastfmApiSecret;

    const api_sig = md5(sigString);

    const body = new URLSearchParams({
      ...params,
      api_sig,
      format: 'json', // excluded from sig but included in request
    });

    try {
      const res = await fetch(LASTFM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await res.json();
      if (data?.scrobbles?.['@attr']?.accepted > 0) {
        console.log(`Scrobbled (Last.fm): ${song.title}`);
      } else {
        console.warn('Last.fm scrobble not accepted:', data?.scrobbles?.scrobble);
      }
    } catch (err) {
      console.error('Last.fm scrobble failed:', err);
    }
  }
}

export default ScrobbleService;
