/**
 * AudioEngine.js
 * Framework-agnostic wrapper around Howler.js for audio playback.
 * Handles gapless pre-buffering, replay gain, and state emission.
 */

import { Howl } from 'howler';
import ReplayGainService from './ReplayGainService';
import ScrobbleService from './ScrobbleService';

class AudioEngine {
  constructor({ onTrackEnd, onPositionUpdate, onStateChange, onSkip }) {
    this.onTrackEnd = onTrackEnd;
    this.onPositionUpdate = onPositionUpdate;
    this.onStateChange = onStateChange;
    this.onSkip = onSkip;

    this.activeHowl = null;
    this.preloadedHowl = null;
    this.activeSong = null;
    this.preloadedSong = null;
    this.isNaturalEnd = false;

    this.volume = 1.0;
    this.replayGainMode = 'none';
    this.replayGainPreamp = '0';
    this.preventClipping = true;

    this.trackEndTimer = null;
    this._accumulatedTime = 0;
    this._lastProgressPos = 0;
    this._isPlaying = false; // tracks play state for accumulation

    // RC-01: Generation counter
    this._generation = 0;
  }

  _calculateVolume(song) {
    if (!song) return this.volume;
    const multiplier = ReplayGainService.calculateVolumeMultiplier(
      song,
      this.replayGainMode,
      this.replayGainPreamp,
      this.preventClipping
    );
    return this.volume * multiplier;
  }

  load(song, streamUrl, autoplay = true) {
    this._checkSkipCondition();
    this._cleanupActive();
    this._accumulatedTime = 0;
    this._lastProgressPos = 0;

    // RC-01: Capture generation for this load. Any Howl callback that sees
    // a different generation is a stale listener and must be ignored.
    const gen = ++this._generation;

    // If we already preloaded this exact song, swap it in
    if (this.preloadedHowl && this.preloadedSong?.id === song.id) {
      this.activeHowl = this.preloadedHowl;
      this.activeSong = this.preloadedSong;

      this.preloadedHowl = null;
      this.preloadedSong = null;

      // Update handlers for the now-active howl
      this._attachActiveHandlers(this.activeHowl, song, gen);
      this.activeHowl.volume(this._calculateVolume(song));

      if (autoplay) {
        this.activeHowl.play();
      }
      return;
    }

    // Otherwise, create a new Howl
    this.activeSong = song;
    this.activeHowl = new Howl({
      src: [streamUrl],
      html5: true, // Force HTML5 Audio to avoid loading entire file into memory before playing
      format: ['mp3', 'aac', 'flac', 'ogg', 'opus', 'm4a'],
      volume: this._calculateVolume(song),
      autoplay: autoplay,
      // BUG-3 fix: unlock autoplay-blocked audio on first user gesture
      onplayerror: (_id, _err) => {
        this.activeHowl?.once('unlock', () => this.activeHowl?.play());
      },
    });

    this._attachActiveHandlers(this.activeHowl, song, gen);
  }

  _attachActiveHandlers(howl, song, gen) {
    howl.off('end');
    howl.off('play');
    howl.off('pause');
    howl.off('stop');

    howl.on('play', () => {
      if (this._generation !== gen) return;
      this._isPlaying = true;
      this.onStateChange?.(true);
    });
    howl.on('pause', () => {
      if (this._generation !== gen) return;
      this._isPlaying = false;
      this.onStateChange?.(false);
    });
    howl.on('stop', () => {
      if (this._generation !== gen) return;
      this._isPlaying = false;
      this.onStateChange?.(false);
    });

    howl.on('end', () => {
      if (this._generation !== gen) return; // RC-01: stale Howl fired, discard
      this._isPlaying = false;
      this.isNaturalEnd = true;
      if (this.trackEndTimer) clearTimeout(this.trackEndTimer);
      this.trackEndTimer = setTimeout(() => {
        this.onTrackEnd?.();
      }, 200);
    });
  }

  preloadNext(song, streamUrl) {
    if (!song || !streamUrl) return;

    // If already preloaded this song, do nothing
    if (this.preloadedSong?.id === song.id) return;

    this._cleanupPreloaded();

    this.preloadedSong = song;
    this.preloadedHowl = new Howl({
      src: [streamUrl],
      html5: true,
      volume: 0, // Keep muted while preloading
      preload: true,
    });
  }

  play() {
    if (this.activeHowl && !this.activeHowl.playing()) {
      this.activeHowl.play();
    }
  }

  pause() {
    if (this.activeHowl && this.activeHowl.playing()) {
      this.activeHowl.pause();
    }
  }

  stop() {
    if (this.activeHowl) {
      this.activeHowl.stop();
    }
  }

  seek(seconds) {
    if (this.activeHowl) {
      this.activeHowl.seek(seconds);
    }
  }

  setVolume(volume, currentSong = null) {
    this.volume = volume;
    if (this.activeHowl) {
      this.activeHowl.volume(this._calculateVolume(currentSong));
    }
  }

  setReplayGainSettings(mode, preamp, preventClipping, currentSong = null) {
    this.replayGainMode = mode;
    this.replayGainPreamp = preamp;
    this.preventClipping = preventClipping;

    if (this.activeHowl) {
      this.activeHowl.volume(this._calculateVolume(currentSong));
    }
  }

  getCurrentPosition() {
    // Fix: seek() returns current position regardless of playing state;
    // previously returned 0 when paused, losing scrubber position.
    return this.activeHowl?.seek() ?? 0;
  }

  getDuration() {
    if (this.activeHowl) {
      return this.activeHowl.duration() || 0;
    }
    return 0;
  }

  getPlayedDuration() {
    return this._accumulatedTime || 0;
  }

  _checkSkipCondition() {
    if (this.activeHowl && this.activeSong && !this.isNaturalEnd) {
      const pos = this.getCurrentPosition();
      const dur = this.getDuration();
      if (dur > 0 && pos < dur * 0.8) {
        this.onSkip?.(this.activeSong);
      }
    }
  }

  /**
   * Called by usePlayer's polling interval (300ms while playing).
   * Drives scrobble accumulation without a separate setInterval.
   * dt = elapsed seconds since last call (approximate, caller should track).
   */
  _tickScrobble(pos, dur, dt) {
    if (!this.activeSong || this._accumulatedTime === Infinity) return;

    // RC-05: Detect repeat-one loop — position jumped backward by >5s
    if (pos < this._lastProgressPos - 5) {
      this._accumulatedTime = 0;
    }
    this._lastProgressPos = pos;

    if (this._isPlaying) {
      this._accumulatedTime += dt;
    }
    if (this._accumulatedTime >= Math.min(dur * 0.5, 240) && dur > 0) {
      ScrobbleService.scrobble(this.activeSong.id);
      this._accumulatedTime = Infinity; // prevent double-scrobble
    }
  }

  _cleanupActive() {
    if (this.activeHowl) {
      this.activeHowl.unload();
      this.activeHowl = null;
    }
    this.activeSong = null;
    this._isPlaying = false;
    this.isNaturalEnd = false;
    this._accumulatedTime = 0;
    this._lastProgressPos = 0;
    if (this.trackEndTimer) {
      clearTimeout(this.trackEndTimer);
      this.trackEndTimer = null;
    }
  }

  _cleanupPreloaded() {
    if (this.preloadedHowl) {
      this.preloadedHowl.unload();
      this.preloadedHowl = null;
    }
    this.preloadedSong = null;
  }

  destroy() {
    this._cleanupActive();
    this._cleanupPreloaded();
  }
}

export default AudioEngine;
