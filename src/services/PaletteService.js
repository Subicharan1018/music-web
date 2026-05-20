/**
 * PaletteService.js
 * Extracts dominant colors from cover art using colorthief.
 */

import { getColorSync, getPaletteSync } from 'colorthief';

export class PaletteService {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.fallback = {
      primary: '#ed6f5c',
      secondary: '#e9b94a',
      muted: '#6e7448'
    };
  }

  async getPalette(coverArtUrl) {
    if (!coverArtUrl) return this.fallback;

    // LRU Cache Check
    if (this.cache.has(coverArtUrl)) {
      const value = this.cache.get(coverArtUrl);
      this.cache.delete(coverArtUrl);
      this.cache.set(coverArtUrl, value);
      return value;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const palette = getPaletteSync(img, 3);
          if (palette && palette.length >= 3) {
            const result = {
              primary: palette[0].hex(),
              secondary: palette[1].hex(),
              muted: palette[2].hex()
            };
            this._setToCache(coverArtUrl, result);
            resolve(result);
          } else {
            const dominant = getColorSync(img);
            if (dominant) {
              const result = {
                primary: dominant.hex(),
                secondary: this.fallback.secondary,
                muted: this.fallback.muted
              };
              this._setToCache(coverArtUrl, result);
              resolve(result);
            } else {
              this._setToCache(coverArtUrl, this.fallback);
              resolve(this.fallback);
            }
          }
        } catch (e) {
          console.error("ColorThief extraction failed", e);
          this._setToCache(coverArtUrl, this.fallback);
          resolve(this.fallback);
        }
      };

      img.onerror = () => {
        this._setToCache(coverArtUrl, this.fallback);
        resolve(this.fallback);
      };

      img.src = coverArtUrl;
    });
  }

  _setToCache(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

export const paletteService = new PaletteService();
