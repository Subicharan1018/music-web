/**
 * listeningLog.js
 * Singleton module — browser port of Flutter's ListeningEventCollector.
 *
 * Intercepts play events → queues them → flushes to POST /listening-log
 * every 10 seconds. On page unload (tab close), drains via a final sequential
 * flush attempt (sendBeacon cannot send JSON with Content-Type application/json,
 * so we use fetch with keepalive=true instead, which works in all modern browsers
 * and survives page unload better than sendBeacon for JSON payloads).
 *
 * Server endpoint: POST <baseUrl>/listening-log (single-event, no batch support)
 * Required fields: song_id, title, artist, session_id, play_dur_sec,
 *                  skip_before_50, source_context, shuffle_active,
 *                  hour_of_day, day_of_week
 *
 * Mirrors Flutter constants:
 *   _kSessionTimeout   = 30min
 *   _kMinPlayDurationSec = 2.0s
 *   _kMinPairDurationSec = 5.0s
 */

// ── Constants ────────────────────────────────────────────────────────────────
const SESSION_TIMEOUT_MS   = 30 * 60 * 1000;   // 30 minutes
const MIN_PLAY_DURATION_S  = 2.0;               // min seconds to persist event
const MIN_PAIR_DURATION_S  = 5.0;               // min seconds for co-play pair
const FLUSH_INTERVAL_MS    = 10_000;            // flush queue every 10s
const MAX_QUEUE_SIZE       = 50;                // safety cap on queue depth
const CONNECT_TIMEOUT_MS   = 10_000;

// ── Module-level state (not serialisable → not in Zustand) ──────────────────
let _baseUrl           = '';
let _sessionId         = _uuid();
let _lastActivity      = Date.now();

// Open event tracking
let _openEvent         = null;   // { songId, title, artist, album, sessionId, startedAt, queuePos, shuffleActive, sourceContext }
let _currentSong       = null;   // full song object

// Rapid-fire dedup
let _lastStartFp       = null;   // "songId@queuePos"
let _lastStartTime     = 0;

// Batched event queue
const _eventQueue      = [];
let _flushTimer        = null;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call once at app startup (main.jsx), then again whenever localShuffleUrl changes.
 */
export function init(baseUrl) {
  _baseUrl = (baseUrl || '').replace(/\/+$/, '');
}

/**
 * Call when a song starts playing.
 * Mirrors ListeningEventCollector.onSongStarted().
 *
 * @param {object} song          — { id, title, artist, album, duration, ... }
 * @param {object} [options]
 * @param {string} [options.sourceContext]   — 'queue' | 'shuffle' | 'album' | ...
 * @param {boolean} [options.shuffleActive]
 * @param {number}  [options.queuePosition]
 */
export function onSongStarted(song, options = {}) {
  if (!song?.id) return;

  const now        = Date.now();
  const { sourceContext = 'queue', shuffleActive = false, queuePosition = 0 } = options;

  // ── Rapid-fire dedup (500ms guard) ──────────────────────────────────────────
  const fp = `${song.id}@${queuePosition}`;
  if (fp === _lastStartFp && now - _lastStartTime < 500) {
    console.debug('[ListeningLog] ⏭ Rapid duplicate collapsed:', song.title);
    return;
  }

  // ── Self-transition guard (same song + slot already open) ─────────────────
  if (_openEvent && _openEvent.songId === song.id && _openEvent.queuePos === queuePosition) {
    console.debug('[ListeningLog] ⏭ Self-transition ignored:', song.title);
    return;
  }

  _lastStartFp   = fp;
  _lastStartTime = now;

  // ── Session boundary (event-driven, not timer-driven — Correction 3) ───────
  if (now - _lastActivity > SESSION_TIMEOUT_MS) {
    _sessionId = _uuid();
    console.debug('[ListeningLog] 🔑 New session after gap:', _sessionId);
  }
  _lastActivity = now;

  // ── Close previous event ────────────────────────────────────────────────────
  if (_openEvent && _currentSong) {
    _closeEvent(_currentSong, now - _openEvent.startedAt);
  }

  // ── Open new event ──────────────────────────────────────────────────────────
  _openEvent = {
    songId:        song.id,
    title:         song.title  || '',
    artist:        song.artist || '',
    album:         song.album  || '',
    sessionId:     _sessionId,
    startedAt:     now,
    queuePos:      queuePosition,
    shuffleActive,
    sourceContext,
    hourOfDay:     new Date(now).getHours(),
    dayOfWeek:     new Date(now).getDay(),
  };
  _currentSong = song;

  console.debug('[ListeningLog] ⏺ Started:', song.title, `(${sourceContext}, shuffle=${shuffleActive})`);
  _scheduleFlush();
}

/**
 * Call when playback ends naturally or the user skips.
 * Mirrors ListeningEventCollector.onSongEnded().
 *
 * @param {object} song
 * @param {number} playedDurationMs — how long was actually played
 */
export function onSongEnded(song, playedDurationMs) {
  if (!_openEvent || _openEvent.songId !== song?.id) return;
  _closeEvent(song, playedDurationMs);
}

/**
 * Call when playback is paused (accumulates listen time in _openEvent.startedAt
 * via wall-clock diff — we don't store accumulated ms, we snapshot on end).
 * Nothing to flush here — the event is still open until the next song starts.
 */
export function onPause() {
  // Snapshot: store elapsed so far in startedAt offset trick.
  // We don't need to do anything — _closeEvent uses wall-clock elapsed anyway.
  _lastActivity = Date.now();
}

/**
 * Flush remaining events and dispose timers. Call on app unmount / logout.
 */
export async function dispose() {
  if (_openEvent && _currentSong) {
    _closeEvent(_currentSong, Date.now() - _openEvent.startedAt);
  }
  clearTimeout(_flushTimer);
  _flushTimer = null;
  await _flush();
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Closes the open event and enqueues it if it passes the minimum duration check.
 * Returns the closed event object for co-play pair recording.
 */
function _closeEvent(song, playedDurationMs) {
  const event = _openEvent;
  if (!event) return null;
  _openEvent = null;

  const playedSec = playedDurationMs / 1000;
  const totalSec  = song.duration || 0;

  if (playedSec < MIN_PLAY_DURATION_S) {
    console.debug('[ListeningLog] 🗑 Discarded short event:', song.title, `(${playedSec.toFixed(1)}s)`);
    return { ...event, playedSec, skipped: true };
  }

  const skipBeforeEnd = totalSec > 0 && playedSec < totalSec * 0.5;

  const record = {
    song_id:        event.songId,
    title:          event.title,
    artist:         event.artist,
    session_id:     event.sessionId,
    play_dur_sec:   Math.round(playedSec),
    skip_before_50: skipBeforeEnd,
    source_context: event.sourceContext,
    shuffle_active: event.shuffleActive,
    hour_of_day:    event.hourOfDay,
    day_of_week:    event.dayOfWeek,
  };

  _enqueue(record);
  console.debug('[ListeningLog] ✅ Queued:', song.title, `(${playedSec.toFixed(1)}s, skip=${skipBeforeEnd})`);
  return { ...event, playedSec, skipped: skipBeforeEnd };
}

function _enqueue(record) {
  if (_eventQueue.length >= MAX_QUEUE_SIZE) {
    console.warn('[ListeningLog] ⚠ Queue full — dropping oldest event');
    _eventQueue.shift();
  }
  _eventQueue.push(record);
  _scheduleFlush();
}

function _scheduleFlush() {
  if (_flushTimer || !_baseUrl) return;
  _flushTimer = setTimeout(_flush, FLUSH_INTERVAL_MS);
}

/**
 * Sequentially POST each queued event to /listening-log.
 * No batch endpoint on this server — single-event calls only.
 * Failed events are re-queued (up to MAX_QUEUE_SIZE).
 */
async function _flush() {
  _flushTimer = null;
  if (!_baseUrl || _eventQueue.length === 0) return;

  const batch = _eventQueue.splice(0);   // drain atomically
  const endpoint = `${_baseUrl}/listening-log`;
  const failed = [];

  for (const event of batch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    try {
      await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(event),
        signal:  controller.signal,
      });
    } catch {
      failed.push(event);   // network failure — re-queue
    } finally {
      clearTimeout(timer);
    }
  }

  if (failed.length > 0) {
    const space = MAX_QUEUE_SIZE - _eventQueue.length;
    const toRequeue = failed.slice(0, space);
    _eventQueue.unshift(...toRequeue);
    console.warn(`[ListeningLog] ⚠ Re-queued ${toRequeue.length} failed events`);
  }
}

/**
 * Page-unload flush: use fetch with keepalive=true (survives navigation + tab close,
 * works with application/json unlike sendBeacon which requires text/plain or Blob).
 * Fire-and-forget — no await, no retry.
 */
function _flushOnUnload() {
  if (!_baseUrl || _eventQueue.length === 0) return;

  // Close any open event with wall-clock elapsed before flushing
  if (_openEvent && _currentSong) {
    _closeEvent(_currentSong, Date.now() - _openEvent.startedAt);
  }

  const endpoint = `${_baseUrl}/listening-log`;
  for (const event of _eventQueue.splice(0)) {
    try {
      fetch(endpoint, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify(event),
        keepalive: true,   // key: survives page close
      }).catch(() => {});
    } catch {
      // Silently swallow — page is unloading
    }
  }
}

// Register unload handler once
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      _flushOnUnload();
    }
  });
}

// ── UUID helper ───────────────────────────────────────────────────────────────
function _uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
