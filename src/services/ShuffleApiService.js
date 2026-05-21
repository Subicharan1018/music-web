/**
 * ShuffleApiService.js
 * Full port of shuffle_api_service.dart — all 6 endpoints with typed errors,
 * _unconfigured guard, _wrap() error mapping, and 10s AbortController timeout.
 *
 * Phase 6.5: complete rewrite replacing the previous 1-endpoint stub.
 *
 * Exported error classes:
 *   ShuffleNetworkError  — network/timeout failures (safe to swallow in UI)
 *   ShuffleServerError   — HTTP 5xx from the server
 *   ShuffleEmptyResponse — server returned zero recommendations
 *
 * Exported helper:
 *   startedAtFormatted(isoString) — shared by NowPlayingOverlay + SettingsPage
 */

// ── Typed error classes ──────────────────────────────────────────────────────

export class ShuffleNetworkError extends Error {
  constructor(message = 'Connection failed') {
    super(message);
    this.name = 'ShuffleNetworkError';
  }
}

export class ShuffleServerError extends Error {
  constructor(statusCode) {
    super(`Server error ${statusCode}`);
    this.name = 'ShuffleServerError';
    this.statusCode = statusCode;
  }
}

export class ShuffleEmptyResponse extends Error {
  constructor(message = 'Server returned no recommendations') {
    super(message);
    this.name = 'ShuffleEmptyResponse';
  }
}

// ── Shared helper ────────────────────────────────────────────────────────────

/**
 * Human-readable relative time from an ISO timestamp string.
 * Mirrors SessionStatusResponse.startedAtFormatted from Dart.
 * Shared export — import in NowPlayingOverlay AND SettingsPage.
 */
export function startedAtFormatted(isoString) {
  if (!isoString) return '';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return isoString;
  const diffMs = Date.now() - dt.getTime();
  const diffS  = Math.floor(diffMs / 1000);
  const diffM  = Math.floor(diffS / 60);
  const diffH  = Math.floor(diffM / 60);
  const diffD  = Math.floor(diffH / 24);
  if (diffS < 60)  return 'just now';
  if (diffM < 60)  return `${diffM}m ago`;
  if (diffH < 24)  return `${diffH}h ago`;
  return `${diffD}d ago`;
}

// ── URL validation — localhost is valid ──────────────────────────────────────
function isValidUrl(str) {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.hostname !== '';       // empty string only on failure
  } catch {
    return false;
  }
}

// ── Constants ────────────────────────────────────────────────────────────────
const CONNECT_TIMEOUT_MS = 10_000;
const RECEIVE_TIMEOUT_MS = 15_000;

// ── Service class ────────────────────────────────────────────────────────────

export class ShuffleApiService {
  /**
   * @param {string} baseUrl  Full URL with scheme + port, e.g. "http://192.168.1.10:5000"
   *                          Mirrors Dart: baseUrl.isEmpty is the only invalid case after authority check.
   *                          localhost is explicitly allowed for local development.
   */
  constructor({ baseUrl }) {
    this._unconfigured = !baseUrl || !isValidUrl(baseUrl);
    this._base = baseUrl ? baseUrl.replace(/\/$/, '') : 'http://localhost';
  }

  // ── GET /health ────────────────────────────────────────────────────────────

  async getHealth() {
    if (this._unconfigured) throw new ShuffleNetworkError('Server not configured');
    return this._wrap(async (signal) => {
      const res = await fetch(`${this._base}/health`, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ShuffleServerError(res.status);
      const json = await res.json();
      return {
        status:      json.status?.toString() ?? 'unknown',
        uptime:      json.uptime?.toString() ?? '',
        librarySize: _parseInt(json.library_size),
        modelLoaded: json.model_loaded === true,
        get isHealthy() { return this.status === 'ok' || this.status === 'healthy'; },
      };
    });
  }

  // ── GET /next ──────────────────────────────────────────────────────────────

  /**
   * @param {string}  current   — current song title (required)
   * @param {string}  playlist  — optional playlist name hint
   * @param {string}  artist    — optional artist hint
   * @param {number}  count     — number of recommendations (default 5)
   * NOTE: 'candidates' param removed — not in Dart spec; confuses server.
   */
  async getNext({ current, playlist, artist, count = 5 }) {
    if (this._unconfigured) throw new ShuffleNetworkError('Server not configured');
    return this._wrap(async (signal) => {
      const url = new URL(`${this._base}/next`);
      url.searchParams.set('current', current);
      url.searchParams.set('count',   String(count));
      if (playlist) url.searchParams.set('playlist', playlist);
      if (artist)   url.searchParams.set('artist',   artist);

      console.log(`[SmartShuffle] Requesting next songs for: ${current}`);

      const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ShuffleServerError(res.status);
      const data = await res.json();

      if (Array.isArray(data)) {
        // Legacy flat list format (old Flask server)
        return { songs: data.map(_parseRecommendedSong), source: 'legacy', sessionId: '' };
      }
      if (data && Array.isArray(data.songs)) {
        // Envelope format (new server)
        return {
          songs:     data.songs.map(_parseRecommendedSong),
          source:    data.source?.toString() ?? 'model',
          sessionId: data.session_id?.toString() ?? '',
        };
      }
      return { songs: [], source: 'unknown', sessionId: '' };
    });
  }

  // ── GET /profile ───────────────────────────────────────────────────────────

  async getProfile({ song }) {
    if (this._unconfigured) throw new ShuffleNetworkError('Server not configured');
    return this._wrap(async (signal) => {
      const url = new URL(`${this._base}/profile`);
      url.searchParams.set('song', song);
      const res = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ShuffleServerError(res.status);
      const json = await res.json();
      return {
        song:         json.song?.toString() ?? '',
        behavioural:  (typeof json.behavioural === 'object' && json.behavioural) ? json.behavioural : {},
        acoustic:     (typeof json.acoustic === 'object' && json.acoustic) ? json.acoustic : {},
        playCount:    _parseInt(json.play_count),
      };
    });
  }

  // ── GET /stats ─────────────────────────────────────────────────────────────

  async getStats() {
    if (this._unconfigured) throw new ShuffleNetworkError('Server not configured');
    return this._wrap(async (signal) => {
      const res = await fetch(`${this._base}/stats`, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ShuffleServerError(res.status);
      const json = await res.json();
      return {
        totalPlays:  _parseInt(json.total_plays),
        topSongs:    _parseList(json.top_songs),
        topArtists:  _parseList(json.top_artists),
        weekly:      (typeof json.weekly === 'object' && json.weekly) ? json.weekly : {},
        monthly:     (typeof json.monthly === 'object' && json.monthly) ? json.monthly : {},
      };
    });
  }

  // ── POST /session/reset ────────────────────────────────────────────────────

  async resetSession() {
    if (this._unconfigured) throw new ShuffleNetworkError('Server not configured');
    return this._wrap(async (signal) => {
      const res = await fetch(`${this._base}/session/reset`, {
        method: 'POST',
        signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new ShuffleServerError(res.status);
      // void return — no body required
    });
  }

  // ── Error mapping — mirrors Dart _wrap() ───────────────────────────────────

  async _wrap(callFn) {
    const controller = new AbortController();
    const connectTimer = setTimeout(() => controller.abort('connect_timeout'), CONNECT_TIMEOUT_MS);
    try {
      const result = await Promise.race([
        callFn(controller.signal),
        new Promise((_, reject) =>
          setTimeout(() => reject(new ShuffleNetworkError('Receive timeout')), RECEIVE_TIMEOUT_MS)
        ),
      ]);
      clearTimeout(connectTimer);
      return result;
    } catch (err) {
      clearTimeout(connectTimer);
      if (err instanceof ShuffleNetworkError || err instanceof ShuffleServerError || err instanceof ShuffleEmptyResponse) {
        throw err;
      }
      // AbortError = connect timeout
      if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
        throw new ShuffleNetworkError('Connection timed out');
      }
      // TypeError = network failure (no connection, DNS, etc.)
      if (err instanceof TypeError) {
        throw new ShuffleNetworkError('Connection failed');
      }
      throw new ShuffleNetworkError(err?.message ?? 'Unknown network error');
    }
  }
}

// ── Parse helpers ────────────────────────────────────────────────────────────

function _parseInt(value) {
  if (typeof value === 'number') return Math.round(value);
  return parseInt(value?.toString() ?? '', 10) || 0;
}

function _parseList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => v && typeof v === 'object');
}

/**
 * Mirrors RecommendedSong.fromJson() from Dart.
 * title fallback: 'song_key' (old server format).
 * coldStart from 'cold_start' field (camelCase JS convention).
 */
function _parseRecommendedSong(json) {
  return {
    id:        json.id?.toString() ?? null,
    title:     json.title?.toString() ?? json.song_key?.toString() ?? '',
    artist:    json.artist?.toString() ?? '',
    album:     json.album?.toString() ?? '',
    score:     parseFloat(json.score) || 0.0,
    coldStart: json.cold_start === true,
  };
}
