/**
 * ScrobbleService.js
 * Handles scrobbling logic with a dual-threshold (50% or 4 mins) 
 * and tracking accumulated listen time. 
 * BUG 2 Fix applied: Seek resets accumulated time.
 */

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
    
    // Threshold 1: 4 minutes
    if (this.accumulatedListenTime >= 240) return true;
    
    // Threshold 2: 50% of duration
    const duration = this.currentSong.duration || 0;
    if (duration > 0 && this.accumulatedListenTime >= (duration / 2)) return true;
    
    return false;
  }

  onPlay(song) {
    if (!this.currentSong || this.currentSong.id !== song.id) {
      // New track
      this.currentSong = song;
      this.accumulatedListenTime = 0;
      this.lastPlayTimestamp = Date.now();
    } else {
      // Resuming same track
      this.lastPlayTimestamp = Date.now();
    }
    
    // Also try to check on every play, just in case
    this.checkAndSubmit();
  }

  onPause() {
    this._updateListenTime();
    this.lastPlayTimestamp = null;
    this.checkAndSubmit();
  }

  onSeek() {
    // BUG 2 FIX: Reset accumulated listen time on seek 
    // to prevent artificially inflating listen time by seeking back and forth.
    this.accumulatedListenTime = 0;
    if (this.lastPlayTimestamp) {
      this.lastPlayTimestamp = Date.now(); // Restart timer from now
    }
  }

  onTrackChange() {
    // Before switching out, see if we hit the threshold
    if (this.lastPlayTimestamp) {
      this._updateListenTime();
    }
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
    
    // Mark as scrobbled immediately to prevent duplicate rapid fires
    this.scrobbledSongs.add(song.id);
    
    try {
      await this.client._request('scrobble.view', {
        id: song.id,
        time: Date.now(),
        submission: true
      });
      console.log(`Scrobbled: ${song.title}`);
      
      if (this.onScrobbleCallback) {
        // Convert accumulated time (seconds) to listenMs
        this.onScrobbleCallback(song, Math.round(this.accumulatedListenTime * 1000));
      }
    } catch (err) {
      console.error(`Failed to scrobble ${song.title}:`, err);
    }
  }
}

export default ScrobbleService;
