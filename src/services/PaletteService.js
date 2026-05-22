/**
 * PaletteService.js
 * Extracts dominant colors from cover art using colorthief.
 */

import { getColorSync, getPaletteSync } from 'colorthief';
import { cacheService } from './CacheService';

export class PaletteService {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    // RC-04: In-flight promise deduplication. Prevents concurrent extractions
    // for the same URL from racing and resolving in wrong order.
    this._pending = new Map();
    this.fallback = {
      primary: '#ed6f5c',
      secondary: '#e9b94a',
      muted: '#6e7448'
    };
  }

  async getPalette(coverArtUrl) {
    if (!coverArtUrl) return this.fallback;

    // Cache Check
    const cacheKey = `palette_${coverArtUrl}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // RC-04: Return in-flight promise instead of starting a competing extraction
    if (this._pending.has(coverArtUrl)) {
      return this._pending.get(coverArtUrl);
    }

    const promise = new Promise((resolve) => {
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
            cacheService.set(cacheKey, result);
            resolve(result);
          } else {
            const dominant = getColorSync(img);
            if (dominant) {
              const result = {
                primary: dominant.hex(),
                secondary: this.fallback.secondary,
                muted: this.fallback.muted
              };
              cacheService.set(cacheKey, result);
              resolve(result);
            } else {
              cacheService.set(cacheKey, this.fallback);
              resolve(this.fallback);
            }
          }
        } catch (e) {
          console.error("ColorThief extraction failed", e);
          cacheService.set(cacheKey, this.fallback);
          resolve(this.fallback);
        }
      };

      img.onerror = () => {
        this._pending.delete(coverArtUrl);
        cacheService.set(cacheKey, this.fallback);
        resolve(this.fallback);
      };

      img.src = coverArtUrl;
    }).then(result => {
      this._pending.delete(coverArtUrl);
      return result;
    });

    this._pending.set(coverArtUrl, promise);
    return promise;
  }

  clear() {
    this._pending.clear();
  }
}

export const paletteService = new PaletteService();
