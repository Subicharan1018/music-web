/**
 * V2ShuffleApiService.js
 * Service layer for the experimental V2 Context-Aware Shuffle algorithm.
 * Handles trailing slashes, network errors, and fire-and-forget feedback.
 */

export class V2ShuffleNetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'V2ShuffleNetworkError';
  }
}

export class V2ShuffleApiService {
  constructor({ baseUrl }) {
    this._baseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
    this._unconfigured = !this._baseUrl;
  }

  /**
   * Helper to execute fetch requests with timeouts and standard error wrapping.
   */
  async _wrap(promise) {
    if (this._unconfigured) throw new Error('V2 Server not configured');
    try {
      return await promise;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new V2ShuffleNetworkError('Connection timed out');
      }
      throw new V2ShuffleNetworkError(err.message || 'Network error');
    }
  }

  /**
   * GET /health
   */
  async getHealth() {
    if (this._unconfigured) return { isHealthy: false };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this._wrap(
        fetch(`${this._baseUrl}/health`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        })
      );
      if (!response.ok) {
        return { isHealthy: false, status: response.status };
      }
      const data = await response.json();
      return {
        isHealthy: data.status === 'ok',
        builtAt: data.built_at,
        totalPlaysProcessed: data.total_plays_processed,
        unprocessedEvents: data.unprocessed_events,
        weather: data.weather,
      };
    } catch (e) {
      return { isHealthy: false, error: e.message };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * GET /weather
   */
  async getWeather() {
    if (this._unconfigured) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await this._wrap(
        fetch(`${this._baseUrl}/weather`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        })
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST /next
   * Gets the next batch of recommended songs.
   */
  async getNext({ sessionId, depth = 0, lastEndReason, playedTitles, recentListenRatios }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const payload = {
      session_id: sessionId,
      depth,
      last_end_reason: lastEndReason,
      played_titles: playedTitles || [],
      recent_listen_ratios: recentListenRatios || [],
    };

    console.debug('[V2ShuffleApi] POST /next Request Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await this._wrap(
        fetch(`${this._baseUrl}/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      );
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const data = await response.json();
      console.debug('[V2ShuffleApi] POST /next Response Queue:', data.queue);
      console.debug('[V2ShuffleApi] POST /next Response Context:', data.context);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST /feedback (Fire and forget)
   * Does not throw, fails silently to prevent blocking the UI.
   */
  submitFeedback({ title, listenRatio, endReason, sessionId, sessionDepth }) {
    if (this._unconfigured) return;
    
    const payload = {
      title,
      listen_ratio: listenRatio,
      end_reason: endReason,
      session_id: sessionId,
      session_depth: sessionDepth,
      timestamp: new Date().toISOString(),
    };

    console.debug('[V2ShuffleApi] POST /feedback Payload:', JSON.stringify(payload, null, 2));

    // Fire and forget
    fetch(`${this._baseUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // Survive page unloads
    }).catch(err => {
      console.debug('[V2ShuffleApi] Silent feedback failure:', err);
    });
  }
}
