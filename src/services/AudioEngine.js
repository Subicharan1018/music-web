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
    this.progressTimer = null;
    this._accumulatedTime = 0;
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
    
    // If we already preloaded this exact song, swap it in
    if (this.preloadedHowl && this.preloadedSong?.id === song.id) {
      this.activeHowl = this.preloadedHowl;
      this.activeSong = this.preloadedSong;
      
      this.preloadedHowl = null;
      this.preloadedSong = null;
      
      // Update handlers for the now-active howl
      this._attachActiveHandlers(this.activeHowl, song);
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
    });

    this._attachActiveHandlers(this.activeHowl, song);
  }

  _attachActiveHandlers(howl, song) {
    // Clear any previous handlers if it was a preloaded howl
    howl.off('end');
    howl.off('play');
    howl.off('pause');
    howl.off('stop');

    howl.on('play', () => {
      this.onStateChange?.(true);
      this._startProgressTimer();
    });
    howl.on('pause', () => {
      this.onStateChange?.(false);
      this._stopProgressTimer();
    });
    howl.on('stop', () => {
      this.onStateChange?.(false);
      this._stopProgressTimer();
    });

    howl.on('end', () => {
      this.isNaturalEnd = true;
      // 200ms buffer before triggering onTrackEnd to prevent gap
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
    if (this.activeHowl && this.activeHowl.playing()) {
      return this.activeHowl.seek() || 0;
    }
    return 0;
  }

  getDuration() {
    if (this.activeHowl) {
      return this.activeHowl.duration() || 0;
    }
    return 0;
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

  _startProgressTimer() {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => {
      const pos = this.getCurrentPosition();
      const dur = this.getDuration();
      
      this.onPositionUpdate?.(pos, dur);

      if (this.activeSong && this._accumulatedTime !== Infinity) {
        this._accumulatedTime += 0.5;
        if (this._accumulatedTime >= dur * 0.5 || this._accumulatedTime >= 240) {
          ScrobbleService.scrobble(this.activeSong.id);
          this._accumulatedTime = Infinity; // Prevent double-scrobble
        }
      }
    }, 500);
  }

  _stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  _cleanupActive() {
    if (this.activeHowl) {
      this.activeHowl.unload();
      this.activeHowl = null;
    }
    this.activeSong = null;
    this.isNaturalEnd = false;
    this._accumulatedTime = 0;
    if (this.trackEndTimer) {
      clearTimeout(this.trackEndTimer);
      this.trackEndTimer = null;
    }
    this._stopProgressTimer();
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
