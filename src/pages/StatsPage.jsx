/**
 * StatsPage.jsx
 * Listening statistics — Atelier Zero editorial magazine layout.
 * Sections 01–06: local affinity + AI server data.
 * Section 07: Server Listening Stats (weekly/monthly/all) from /listening-log/stats.
 */

import React, { useRef, useMemo, lazy, Suspense } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAffinityStore } from '../store/affinityStore';
import { useSubsonic } from '../hooks/useSubsonic';
import { useGSAPScrollReveal } from '../hooks/useGSAPScrollReveal';
import { usePlayAction } from '../hooks/usePlayAction';
import { Flame, Play, RefreshCw, Server, AlertCircle, Settings2 } from 'lucide-react';
import { useAIShuffleStore } from '../store/aiShuffleStore';
import { useListeningStatsStore, ERR_NOT_CONFIGURED, ERR_ENDPOINT_404, ERR_NETWORK } from '../store/listeningStatsStore';
import { useSettingsStore } from '../store/settingsStore';
import { Link } from 'react-router-dom';
import { PingingDotChart } from '../components/ui/PingingDotChart';
import { GlowingRadarChart } from '../components/ui/GlowingRadarChart';

// Recharts-heavy component loaded in its own chunk
const DailyListeningChart = lazy(() =>
  import('../components/stats/DailyListeningChart').then(m => ({ default: m.DailyListeningChart }))
);

dayjs.extend(relativeTime);

const formatMs = (ms) => {
  if (!ms) return '0';
  const hours = ms / 3_600_000;
  if (hours >= 1) return hours.toFixed(1);
  return (ms / 60_000).toFixed(0) + ' min';
};

const formatMsLabel = (ms) => {
  if (!ms) return 'minutes';
  return ms >= 3_600_000 ? 'total hours' : 'total minutes';
};

const SectionHeader = ({ num, title }) => (
  <div className="flex items-baseline gap-3 border-b border-ink/10 pb-2 mb-6">
    <span className="font-mono text-[10px] text-coral tracking-widest uppercase shrink-0">{num}</span>
    <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint">{title}</h2>
  </div>
);

const SkeletonRow = () => (
  <div className="flex items-center gap-4 py-3 border-b border-ink/5">
    <div className="w-6 h-4 bg-ink/8 rounded animate-pulse" />
    <div className="flex-1 h-4 bg-ink/8 rounded animate-pulse" />
    <div className="w-20 h-3 bg-ink/6 rounded animate-pulse" />
  </div>
);

export const StatsPage = () => {
  const client = useSubsonic();
  const { playSong } = usePlayAction();
  
  const { isConfigured, stats, statsLastFetched, fetchStats } = useAIShuffleStore();
  const [isRefreshingStats, React_setIsRefreshingStats] = React.useState(false);

  const handleRefreshStats = async () => {
    React_setIsRefreshingStats(true);
    await fetchStats();
    React_setIsRefreshingStats(false);
  };

  React.useEffect(() => {
    if (isConfigured) {
      fetchStats();
    }
  }, [isConfigured, fetchStats]);

  const containerRef = useRef(null);

  // All store reads at top — before any early returns
  const getTopArtists   = useAffinityStore((s) => s.getTopArtists);
  const getTopTracks    = useAffinityStore((s) => s.getTopTracks);
  const getRecentPlays  = useAffinityStore((s) => s.getRecentPlays);
  const getDailyListening = useAffinityStore((s) => s.getDailyListening);
  const getListeningStreak = useAffinityStore((s) => s.getListeningStreak);
  const lifetimeTotalMs = useAffinityStore((s) => s.lifetimeTotalMs);
  const recentPlays     = useAffinityStore((s) => s.recentPlays);

  const topArtists  = useMemo(() => getTopArtists(10),  [getTopArtists]);
  const topTracks   = useMemo(() => getTopTracks(10),   [getTopTracks]);
  const recentList  = useMemo(() => getRecentPlays(20), [getRecentPlays]);
  const dailyData   = useMemo(() => getDailyListening(), [getDailyListening]);
  const streak      = useMemo(() => getListeningStreak(), [getListeningStreak]);

  const hasData = recentPlays.length > 0;

  // GSAP scroll reveal — must be called before any conditional returns
  useGSAPScrollReveal(containerRef, {
    selector: '.reveal-item',
    dependencies: [topArtists, topTracks, recentList],
  });

  return (
    <div ref={containerRef} className="p-8 pb-32 max-w-4xl mx-auto h-full overflow-y-auto no-scrollbar">
      {/* Page Header */}
      <div className="mb-12 reveal-item">
        <h1 className="font-serif text-5xl font-bold text-ink italic tracking-tight mb-2">
          Listening Stats
        </h1>
        <p className="font-sans text-sm text-ink-mute">
          {hasData
            ? `${recentPlays.length} recorded plays · ${formatMs(lifetimeTotalMs)} ${formatMsLabel(lifetimeTotalMs)}`
            : 'Start listening to see your stats here.'}
        </p>
      </div>

      {/* Nº 01 · LISTENING TIME */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 01" title="Listening Time" />
        <Suspense fallback={<div className="h-[200px] bg-ink/4 rounded animate-pulse" />}>
          <DailyListeningChart data={dailyData} />
        </Suspense>
        <div className="mt-6 flex items-baseline gap-3">
          <span className="font-serif text-5xl italic text-ink">
            {formatMs(lifetimeTotalMs)}
          </span>
          <span className="font-sans text-sm text-ink-mute uppercase tracking-widest">
            {formatMsLabel(lifetimeTotalMs)}
          </span>
        </div>
      </div>

      {/* Nº 02 · TOP ARTISTS */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 02" title="Top Artists" />
        {!hasData ? (
          [1,2,3,4,5].map((i) => <SkeletonRow key={i} />)
        ) : topArtists.length === 0 ? (
          <p className="font-serif italic text-ink-mute py-6">No artist data yet.</p>
        ) : (
          <div className="space-y-0">
            {topArtists.map((entry, idx) => (
              <div
                key={entry.artistId}
                className={`flex items-center gap-4 py-3 border-b border-ink/5 ${
                  idx === 0 ? 'border-l-4 border-coral pl-4 -ml-4' : ''
                }`}
              >
                <span className="font-mono text-sm text-coral w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                <span className={`flex-1 truncate ${idx === 0 ? 'font-serif text-2xl italic text-ink' : 'font-serif text-lg text-ink'}`}>
                  {entry.name || entry.artistId}
                </span>
                <span className="font-mono text-xs text-ink-faint whitespace-nowrap">
                  {entry.playCount} plays · {formatMs(entry.totalListenMs)} h
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nº 03 · TOP TRACKS */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 03" title="Top Tracks" />
        {!hasData ? (
          [1,2,3,4,5].map((i) => <SkeletonRow key={i} />)
        ) : topTracks.length === 0 ? (
          <p className="font-serif italic text-ink-mute py-6">No track data yet.</p>
        ) : (
          <div className="space-y-0">
            {topTracks.map((entry, idx) => (
              <button
                key={entry.songId}
                onClick={() => {
                  // Build a minimal song object for playSong
                  const songObj = {
                    id: entry.songId,
                    title: entry.title || entry.songId,
                    artist: entry.artist,
                  };
                  playSong(songObj, [songObj]);
                }}
                className={`w-full flex items-center gap-4 py-3 border-b border-ink/5 hover:bg-ink/3 transition-colors text-left group ${
                  idx === 0 ? 'border-l-4 border-coral pl-4 -ml-4' : ''
                }`}
              >
                <span className="font-mono text-sm text-coral w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <p className={`truncate ${idx === 0 ? 'font-serif text-2xl italic text-ink' : 'font-serif text-lg text-ink'}`}>
                    {entry.title || entry.songId}
                  </p>
                  {entry.artist && (
                    <p className="font-sans text-xs text-ink-mute truncate">{entry.artist}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-ink-faint">{entry.playCount}×</span>
                  <Play size={12} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Nº 04 · RECENT PLAYS */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 04" title="Recent Plays" />
        {!hasData ? (
          [1,2,3,4,5].map((i) => <SkeletonRow key={i} />)
        ) : recentList.length === 0 ? (
          <p className="font-serif italic text-ink-mute py-6">Nothing played yet.</p>
        ) : (
          <div className="space-y-0">
            {recentList.map((entry, idx) => {
              const coverUrl = client?.getCoverArtUrl?.(entry.song?.coverArt, 64) || '';
              return (
                <div
                  key={`${entry.song?.id}-${idx}`}
                  className="flex items-center gap-4 py-3 border-b border-ink/5"
                >
                  {/* 32×32 cover */}
                  <div className="w-8 h-8 rounded overflow-hidden bg-ink/8 shrink-0">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-serif text-xs text-ink-faint">♪</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-ink truncate">{entry.song?.title}</p>
                    <p className="font-sans text-xs text-ink-mute truncate">{entry.song?.artist}</p>
                  </div>
                  <span className="font-mono text-[10px] text-ink-faint shrink-0">
                    {dayjs(entry.playedAt).fromNow()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nº 05 · LISTENING STREAK */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 05" title="Listening Streak" />
        <div className="flex items-end gap-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-7xl italic text-coral leading-none">
                {streak.current}
              </span>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame size={14} className="text-coral" />
                  <span className="font-sans text-sm uppercase tracking-widest text-ink-mute">
                    Day Streak
                  </span>
                </div>
                <p className="font-mono text-xs text-ink-faint">
                  current · best: {streak.best} days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nº 06 · AI SERVER STATS */}
      {isConfigured && (
        <div className="mb-14 reveal-item">
          <SectionHeader num="Nº 06" title="AI Server Stats" />
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-xs text-ink-faint uppercase tracking-widest">
              {statsLastFetched ? `Updated ${dayjs(statsLastFetched).fromNow()}` : 'Fetching...'}
            </p>
            <button type="button" onClick={handleRefreshStats} disabled={isRefreshingStats}
              className="flex items-center gap-2 font-sans text-xs font-medium text-ink-mute hover:text-ink transition-colors">
              <RefreshCw size={14} className={isRefreshingStats ? 'animate-spin' : ''} />
              {isRefreshingStats ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
          {!stats ? (
            <p className="font-serif italic text-ink-mute py-6">No server stats available.</p>
          ) : (
            <div>
              <div className="mb-8 flex items-baseline gap-3">
                <span className="font-serif text-5xl italic text-ink">{stats.totalPlays?.toLocaleString() || 0}</span>
                <span className="font-sans text-sm text-ink-mute uppercase tracking-widest">Total AI Predictions</span>
              </div>
              {stats.topSongs?.length > 0 && (
                <div>
                  <h3 className="font-sans text-[10px] tracking-[0.15em] uppercase text-ink-faint mb-3">Top AI Predictions</h3>
                  <div className="space-y-0 border-t border-ink/5 pt-2">
                    {stats.topSongs.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-ink/5">
                        <span className="font-serif text-base text-ink">{entry.song_key || entry.title || 'Unknown'}</span>
                        <span className="font-mono text-xs text-ink-faint">{entry.count} plays</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nº 07 · SERVER LISTENING STATS */}
      <ServerListeningStats />

      {/* Nº 08 · VISUAL ANALYTICS */}
      <div className="mb-14 reveal-item">
        <SectionHeader num="Nº 08" title="Visual Analytics" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PingingDotChart />
          <GlowingRadarChart />
        </div>
      </div>

    </div>
  );
};

// ── Server Listening Stats — self-contained sub-component ────────────────────
const PERIODS = [
  { key: 'weekly',  label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'all',     label: 'All Time' },
];

const ServerListeningStats = () => {
  const { playSong } = usePlayAction();
  const client = useSubsonic();
  const localShuffleUrl = useSettingsStore(s => s.localShuffleUrl);

  const selectedPeriod   = useListeningStatsStore(s => s.selectedPeriod);
  const isLoading        = useListeningStatsStore(s => s.isLoading);
  const error            = useListeningStatsStore(s => s.error);
  const cache            = useListeningStatsStore(s => s.cache);
  const setSelectedPeriod = useListeningStatsStore(s => s.setSelectedPeriod);
  const refresh          = useListeningStatsStore(s => s.refresh);
  const fetchStats       = useListeningStatsStore(s => s.fetchStats);

  const data = cache[selectedPeriod]?.data ?? null;

  // Kick off initial fetch
  React.useEffect(() => {
    if (localShuffleUrl) fetchStats('weekly');
  }, [localShuffleUrl, fetchStats]);

  // ── State 1: URL not configured ─────────────────────────────────────────────
  if (!localShuffleUrl) {
    return (
      <div className="mb-14">
        <SectionHeader num="Nº 07" title="Server Listening Stats" />
        <div className="flex items-start gap-4 py-6 border border-ink/8 rounded-lg px-5">
          <Settings2 size={18} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="font-serif text-base text-ink mb-1">Configure your AI Shuffle server to enable listening stats.</p>
            <Link to="/settings" className="font-sans text-xs text-coral hover:underline">Go to Settings →</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: 404 — server doesn't support this endpoint ────────────────────
  if (error === ERR_ENDPOINT_404) {
    return (
      <div className="mb-14">
        <SectionHeader num="Nº 07" title="Server Listening Stats" />
        <div className="flex items-start gap-4 py-6 border border-ink/8 rounded-lg px-5">
          <Server size={18} className="text-ink-faint mt-0.5 shrink-0" />
          <p className="font-serif text-base text-ink-mute italic">Your server doesn't support listening stats yet.</p>
        </div>
      </div>
    );
  }

  // ── State 3: Network error ──────────────────────────────────────────────────
  if (error && error !== ERR_ENDPOINT_404) {
    return (
      <div className="mb-14">
        <SectionHeader num="Nº 07" title="Server Listening Stats" />
        <div className="flex items-center justify-between py-5 border border-ink/8 rounded-lg px-5">
          <div className="flex items-center gap-3">
            <AlertCircle size={16} className="text-ink-faint shrink-0" />
            <p className="font-serif text-base text-ink-mute italic">Could not reach the server.</p>
          </div>
          <button onClick={refresh} className="flex items-center gap-2 font-sans text-xs text-ink-mute hover:text-ink transition-colors">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Period tab bar (shared by States 4 & 5) ─────────────────────────────────
  const PeriodTabs = () => (
    <div className="flex items-center gap-1 mb-8 border-b border-ink/8">
      {PERIODS.map(p => (
        <button
          key={p.key}
          onClick={() => setSelectedPeriod(p.key)}
          className={`pb-2 px-3 font-sans text-xs tracking-widest uppercase transition-colors border-b-2 -mb-px ${
            selectedPeriod === p.key
              ? 'text-ink border-coral'
              : 'text-ink-faint border-transparent hover:text-ink-mute'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="ml-auto">
        <button onClick={refresh} className="flex items-center gap-1.5 font-sans text-[10px] text-ink-faint hover:text-ink transition-colors pb-2">
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading' : 'Refresh'}
        </button>
      </div>
    </div>
  );

  // ── State 4: Loading ────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <div className="mb-14">
        <SectionHeader num="Nº 07" title="Server Listening Stats" />
        <PeriodTabs />
        {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
      </div>
    );
  }

  // ── State 5: Data ───────────────────────────────────────────────────────────
  const topTracks  = data?.top_tracks  ?? [];
  const topArtists = data?.top_artists ?? [];
  const topAlbums  = data?.top_albums  ?? [];
  const recent     = data?.recent_plays ?? [];
  const totalPlays   = data?.total_plays   ?? 0;
  const totalMinutes = data?.total_minutes ?? 0;

  return (
    <div className="mb-14 reveal-item">
      <SectionHeader num="Nº 07" title="Server Listening Stats" />
      <PeriodTabs />

      {/* Summary row */}
      {data && (
        <div className="flex gap-10 mb-10">
          <div>
            <span className="font-serif text-4xl italic text-ink">{totalPlays.toLocaleString()}</span>
            <p className="font-sans text-[10px] uppercase tracking-widest text-ink-faint mt-0.5">Plays</p>
          </div>
          <div>
            <span className="font-serif text-4xl italic text-ink">{totalMinutes.toLocaleString()}</span>
            <p className="font-sans text-[10px] uppercase tracking-widest text-ink-faint mt-0.5">Minutes</p>
          </div>
        </div>
      )}

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <div className="mb-10">
          <h3 className="font-sans text-[10px] tracking-[0.15em] uppercase text-ink-faint mb-3">Top Artists</h3>
          <div className="space-y-0">
            {topArtists.map((a, idx) => (
              <div key={a.artist} className="flex items-center gap-4 py-2.5 border-b border-ink/5">
                <span className="font-mono text-xs text-coral w-6 shrink-0">{String(idx+1).padStart(2,'0')}</span>
                <span className={`flex-1 truncate font-serif ${idx === 0 ? 'text-xl italic text-ink' : 'text-base text-ink'}`}>{a.artist}</span>
                <span className="font-mono text-xs text-ink-faint">{a.play_count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Albums */}
      {topAlbums.length > 0 && (
        <div className="mb-10">
          <h3 className="font-sans text-[10px] tracking-[0.15em] uppercase text-ink-faint mb-3">Top Albums</h3>
          <div className="space-y-0">
            {topAlbums.map((a, idx) => (
              <div key={`${a.album}-${idx}`} className="flex items-center gap-4 py-2.5 border-b border-ink/5">
                <span className="font-mono text-xs text-coral w-6 shrink-0">{String(idx+1).padStart(2,'0')}</span>
                <div className="flex-1 min-w-0">
                  <p className={`truncate font-serif ${idx === 0 ? 'text-xl italic text-ink' : 'text-base text-ink'}`}>{a.album}</p>
                  <p className="font-sans text-xs text-ink-mute truncate">{a.artist}</p>
                </div>
                <span className="font-mono text-xs text-ink-faint shrink-0">{a.play_count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <div className="mb-10">
          <h3 className="font-sans text-[10px] tracking-[0.15em] uppercase text-ink-faint mb-3">Top Tracks</h3>
          <div className="space-y-0">
            {topTracks.map((t, idx) => (
              <button
                key={`${t.title}-${idx}`}
                onClick={() => playSong({ id: t.id || t.title, title: t.title, artist: t.artist }, [])}
                className={`w-full flex items-center gap-4 py-2.5 border-b border-ink/5 hover:bg-ink/3 transition-colors text-left group ${
                  idx === 0 ? 'border-l-4 border-coral pl-4 -ml-4' : ''
                }`}
              >
                <span className="font-mono text-xs text-coral w-6 shrink-0">{String(idx+1).padStart(2,'0')}</span>
                <div className="flex-1 min-w-0">
                  <p className={`truncate font-serif ${idx === 0 ? 'text-xl italic text-ink' : 'text-base text-ink'}`}>{t.title}</p>
                  {t.artist && <p className="font-sans text-xs text-ink-mute truncate">{t.artist}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-ink-faint">{t.play_count}×</span>
                  <Play size={11} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Plays */}
      {recent.length > 0 && (
        <div className="mb-4">
          <h3 className="font-sans text-[10px] tracking-[0.15em] uppercase text-ink-faint mb-3">Recent Plays</h3>
          <div className="space-y-0">
            {recent.slice(0, 15).map((r) => {
              const coverUrl = r.cover_art || '';
              return (
                <div key={r.id} className="flex items-center gap-4 py-2.5 border-b border-ink/5">
                  <div className="w-8 h-8 rounded overflow-hidden bg-ink/8 shrink-0">
                    {coverUrl
                      ? <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><span className="font-serif text-xs text-ink-faint">♪</span></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-ink truncate">{r.title}</p>
                    <p className="font-sans text-xs text-ink-mute truncate">{r.artist}</p>
                  </div>
                  <span className="font-mono text-[10px] text-ink-faint shrink-0">{dayjs(r.played_at).fromNow()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <p className="font-serif italic text-ink-mute py-6">No data for this period yet.</p>
      )}
    </div>
  );
};
