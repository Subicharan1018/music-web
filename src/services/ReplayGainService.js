/**
 * ReplayGainService.js
 * Pure functions for calculating volume multipliers based on ReplayGain metadata.
 */

class ReplayGainService {
  static getFallbackGain(mode) {
    return mode === 'none' ? 0.0 : -6.0; // Typical fallback if tags are missing
  }

  static getPreampGain(preampDb) {
    return parseFloat(preampDb) || 0.0;
  }

  static calculateVolumeMultiplier(song, mode, preampDb, preventClipping = true) {
    if (!song || mode === 'none') {
      return 1.0;
    }

    let gain = 0.0;
    let peak = 1.0;

    if (mode === 'album') {
      gain = song.replayGainAlbumGain ?? song.replayGainTrackGain ?? ReplayGainService.getFallbackGain(mode);
      peak = song.replayGainAlbumPeak ?? song.replayGainTrackPeak ?? 1.0;
    } else if (mode === 'track') {
      gain = song.replayGainTrackGain ?? ReplayGainService.getFallbackGain(mode);
      peak = song.replayGainTrackPeak ?? 1.0;
    }

    const preamp = ReplayGainService.getPreampGain(preampDb);
    const totalGainDb = gain + preamp;

    // Convert dB to linear multiplier
    let multiplier = Math.pow(10, totalGainDb / 20.0);

    // Prevent clipping if requested and peak is known
    if (preventClipping && peak > 0) {
      const maxMultiplier = 1.0 / peak;
      if (multiplier > maxMultiplier) {
        multiplier = maxMultiplier;
      }
    }

    // Cap at a safe limit to prevent audio distortion/speaker damage
    return Math.max(0.0, Math.min(multiplier, 2.0));
  }
}

export default ReplayGainService;
