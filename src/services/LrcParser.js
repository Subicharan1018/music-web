/**
 * LrcParser.js
 * Pure helpers for parsing synced and plain lyrics.
 */

const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
const META_RE = /^\[(ti|ar|al|by|offset):([^\]]*)\]/i;
const WORD_TS_RE = /<\d{1,2}:\d{2}(?:\.\d{1,3})?>/g;

const toMillis = (minStr, secStr, fracStr) => {
  const minutes = parseInt(minStr, 10) || 0;
  const seconds = parseInt(secStr, 10) || 0;
  const frac = (fracStr || '').trim();
  let ms = 0;
  if (frac.length === 1) ms = parseInt(frac, 10) * 100;
  else if (frac.length === 2) ms = parseInt(frac, 10) * 10;
  else if (frac.length >= 3) ms = parseInt(frac.slice(0, 3), 10);
  return minutes * 60000 + seconds * 1000 + ms;
};

export function isLrcFormat(text) {
  if (!text) return false;
  return /\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/.test(text);
}

export function parseLrc(text) {
  const lines = [];
  const meta = {};
  if (!text) {
    lines.meta = meta;
    return lines;
  }

  const rawLines = text.split(/\r?\n/);
  rawLines.forEach((raw) => {
    if (!raw) return;
    const metaMatch = raw.match(META_RE);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase();
      const value = metaMatch[2]?.trim() || '';
      meta[key] = value;
      return;
    }

    TIMESTAMP_RE.lastIndex = 0;
    const timestamps = [];
    let match;
    while ((match = TIMESTAMP_RE.exec(raw)) !== null) {
      timestamps.push(toMillis(match[1], match[2], match[3]));
    }

    if (timestamps.length === 0) return;

    const textPart = raw
      .replace(TIMESTAMP_RE, '')
      .replace(WORD_TS_RE, '')
      .trimEnd();

    timestamps.forEach((time) => {
      lines.push({ time, text: textPart });
    });
  });

  lines.sort((a, b) => a.time - b.time);
  lines.meta = meta;
  return lines;
}

export function parsePlain(text) {
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => ({ time: null, text: line }));
}

export function getCurrentLineIndex(lines, positionMs) {
  if (!Array.isArray(lines) || lines.length === 0) return -1;

  let low = 0;
  let high = lines.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const time = lines[mid].time;
    if (time === null || time === undefined) {
      high = mid - 1;
      continue;
    }
    if (positionMs >= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}
