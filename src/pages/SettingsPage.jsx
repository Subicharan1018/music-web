/**
 * SettingsPage.jsx
 * Phase 7: Settings, Architecture Cleanup & Production Readiness
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/shared/Button';
import { createSubsonicClient, NetworkException, AuthException, ServerException } from '../api/subsonic';
import { ExternalLink, Music, RefreshCw, Server, AlertCircle, Settings2, Download, Trash2, Key } from 'lucide-react';
import { useServerHealth } from '../hooks/ai/useServerHealth';
import { useAIShuffleStore } from '../store/aiShuffleStore';
import { ShuffleApiService, startedAtFormatted } from '../services/ShuffleApiService';
import { PillToggle } from '../components/shared/PillToggle';
import { cacheService } from '../services/CacheService';
import { useAffinityStore } from '../store/affinityStore';
import dayjs from 'dayjs';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

const SectionHeader = ({ num, title }) => (
  <div className="flex items-baseline gap-3 border-b border-ink/10 pb-2 mb-6">
    <span className="font-mono text-[10px] text-coral tracking-widest uppercase shrink-0">{num}</span>
    <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint">{title}</h2>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange, placeholder, hint }) => (
  <div className="mb-6">
    <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-transparent border border-ink/20 rounded-md text-ink font-body focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral/50 transition-all placeholder:text-ink-faint"
    />
    {hint && <p className="mt-2 text-[10px] text-ink-faint font-sans tracking-wide uppercase">{hint}</p>}
  </div>
);

const StatusBanner = ({ result }) =>
  result ? (
    <div className={`py-3 px-4 rounded-md border-l-4 mb-6 ${result.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400' : 'bg-coral/10 border-coral text-coral'}`}>
      <p className="text-sm font-sans font-medium">{result.message}</p>
    </div>
  ) : null;

export const SettingsPage = () => {
  const {
    serverUrl, username: storeUsername, password: storePassword,
    localShuffleUrl,
    lastfmApiKey: storeLastfmApiKey, lastfmApiSecret: storeLastfmApiSecret, lastfmSessionKey, lastfmUsername, scrobblingEnabled,
    transcodeFormat, transcodeMaxBitRate, replayGainMode, replayGainPreamp,
    gaplessPlayback, crossfadeEnabled, crossfadeDuration,
    cacheProvider, cacheMaxSizeMb,
    theme, accentColor,
    clearConfig, setServerConfig, updateSettings,
  } = useSettingsStore();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [url, setUrl] = useState(serverUrl || '');
  const [username, setUsername] = useState(storeUsername || '');
  const [password, setPassword] = useState(storePassword || '');
  const [shuffleUrl, setShuffleUrl] = useState(localShuffleUrl || '');
  const [lastfmApiKey, setLastfmApiKey] = useState(storeLastfmApiKey || '');
  const [lastfmApiSecret, setLastfmApiSecret] = useState(storeLastfmApiSecret || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isConnectingLastfm, setIsConnectingLastfm] = useState(false);
  const [lastfmStatus, setLastfmStatus] = useState(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [cacheUsedMb, setCacheUsedMb] = useState(0);

  const { isConfigured, isHealthy, health } = useServerHealth();
  const sessionStatus = useAIShuffleStore((s) => s.sessionStatus);
  const resetSession = useAIShuffleStore((s) => s.resetSession);
  const affinityReset = useAffinityStore((s) => s.reset);

  useEffect(() => {
    setUrl(serverUrl || '');
    setUsername(storeUsername || '');
    setPassword(storePassword || '');
    setShuffleUrl(localShuffleUrl || '');
    setLastfmApiKey(storeLastfmApiKey || '');
    setLastfmApiSecret(storeLastfmApiSecret || '');
    
    // Fetch cache size
    cacheService.getUsedMb().then(setCacheUsedMb);
  }, [serverUrl, storeUsername, storePassword, localShuffleUrl, storeLastfmApiKey, storeLastfmApiSecret]);

  useEffect(() => {
    const result = searchParams.get('lastfm');
    if (result === 'connected') setLastfmStatus({ type: 'success', message: 'Last.fm connected successfully.' });
    if (result === 'error') setLastfmStatus({ type: 'error', message: 'Last.fm connection failed. Check your API key/secret.' });
  }, [searchParams]);

  const handleTestConnection = async () => {
    setTestResult(null);
    setIsTesting(true);
    try {
      const formattedUrl = url.trim().replace(/\/$/, '');
      const client = createSubsonicClient({ serverUrl: formattedUrl, username: username.trim(), password });
      const startTime = Date.now();
      await client.ping();
      setTestResult({ type: 'success', message: `Connected · ${Date.now() - startTime}ms` });
    } catch (err) {
      if (err instanceof AuthException) setTestResult({ type: 'error', message: 'Authentication failed.' });
      else if (err instanceof ServerException) setTestResult({ type: 'error', message: `Server error: ${err.message}` });
      else if (err instanceof NetworkException) setTestResult({ type: 'error', message: 'Network error. Check URL and connection.' });
      else setTestResult({ type: 'error', message: err.message || 'Unexpected error.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const formattedUrl = url.trim().replace(/\/$/, '');
    setServerConfig({ serverUrl: formattedUrl, username: username.trim(), password });
    updateSettings({
      localShuffleUrl: shuffleUrl.trim().replace(/\/$/, ''),
      lastfmApiKey: lastfmApiKey.trim(),
      lastfmApiSecret: lastfmApiSecret.trim(),
    });
  };

  const handleTestAiConnection = async () => {
    setAiTestResult(null);
    setIsTestingAi(true);
    try {
      const formattedUrl = shuffleUrl.trim().replace(/\/$/, '');
      if (!formattedUrl) {
        setAiTestResult({ type: 'error', message: 'Please enter a URL first.' });
        return;
      }
      const tempService = new ShuffleApiService({ baseUrl: formattedUrl });
      const healthData = await tempService.getHealth();
      if (healthData.isHealthy) {
        setAiTestResult({ type: 'success', message: `Connected · Library size: ${healthData.librarySize?.toLocaleString() ?? 0} songs` });
      } else {
        setAiTestResult({ type: 'error', message: `Server returned status: ${healthData.status}` });
      }
    } catch (err) {
      setAiTestResult({ type: 'error', message: err.message || 'Connection failed.' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleLogout = () => {
    clearConfig();
    navigate('/login');
  };

  const handleConnectLastFm = async () => {
    if (!lastfmApiKey.trim()) {
      setLastfmStatus({ type: 'error', message: 'Enter your Last.fm API key first, then save.' });
      return;
    }
    setIsConnectingLastfm(true);
    setLastfmStatus(null);
    try {
      updateSettings({ lastfmApiKey: lastfmApiKey.trim(), lastfmApiSecret: lastfmApiSecret.trim() });
      const res = await fetch(`${LASTFM_API_URL}?method=auth.getToken&api_key=${lastfmApiKey.trim()}&format=json`);
      const data = await res.json();
      if (!data?.token) throw new Error(data?.message || 'Failed to get token');
      const callbackUrl = encodeURIComponent(`${window.location.origin}/lastfm/callback`);
      window.location.href = `https://www.last.fm/api/auth/?api_key=${lastfmApiKey.trim()}&token=${data.token}&cb=${callbackUrl}`;
    } catch (err) {
      setLastfmStatus({ type: 'error', message: `Last.fm error: ${err.message}` });
      setIsConnectingLastfm(false);
    }
  };

  const handleDisconnectLastFm = () => {
    updateSettings({ lastfmSessionKey: null, lastfmUsername: '' });
    setLastfmStatus({ type: 'success', message: 'Last.fm disconnected.' });
  };

  const handleExportData = () => {
    const data = useAffinityStore.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navivibe-listening-${dayjs().format('YYYY-MM-DD')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to completely erase your listening history? This cannot be undone.')) {
      affinityReset();
      resetSession();
      alert('Listening history and AI session have been reset.');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the local cache?')) {
      await cacheService.clear();
      setCacheUsedMb(0);
      alert('Cache cleared.');
    }
  };

  // Vite injected env vars
  const buildDate = import.meta.env.VITE_BUILD_DATE || 'Unknown';
  const gitCommit = import.meta.env.VITE_GIT_COMMIT || 'Unknown';

  return (
    <div className="animate-in fade-in duration-300 p-8 pb-32 max-w-2xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="mb-12">
        <h1 className="font-serif text-5xl font-bold text-ink italic tracking-tight mb-2">Settings</h1>
      </div>

      {/* Nº 01 · SERVER CONNECTION */}
      <div className="mb-16">
        <SectionHeader num="Nº 01" title="Server Connection" />
        <InputField label="Server URL" type="url" value={url} onChange={setUrl} placeholder="https://music.example.com" />
        <InputField label="Username" value={username} onChange={setUsername} />
        <InputField label="Password" type="password" value={password} onChange={setPassword} />
        <StatusBanner result={testResult} />
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleLogout}>Disconnect</Button>
          <Button variant="ghost" onClick={handleTestConnection} disabled={isTesting}>{isTesting ? 'Testing…' : 'Test'}</Button>
          <Button variant="primary" onClick={handleSave}>Save Config</Button>
        </div>
      </div>

      {/* Nº 02 · AI SHUFFLE SERVER */}
      <div className="mb-16">
        <SectionHeader num="Nº 02" title="AI Shuffle Server" />
        <InputField label="Server URL" type="url" value={shuffleUrl} onChange={setShuffleUrl} placeholder="http://localhost:5000" hint="Uses local AI shuffle server when available; falls back to on-device scoring." />
        <StatusBanner result={aiTestResult} />
        <div className="flex gap-4 mb-6">
          <Button variant="ghost" onClick={handleTestAiConnection} disabled={isTestingAi}>{isTestingAi ? 'Testing…' : 'Test'}</Button>
          <Button variant="primary" onClick={handleSave}>Save Config</Button>
        </div>
        {isConfigured && isHealthy && (
          <div className="p-4 bg-ink/5 border border-ink/10 rounded-md">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-sans text-xs font-bold text-ink uppercase tracking-widest">Active</span>
            </div>
            {sessionStatus && (
              <div className="font-mono text-xs text-ink-mute flex justify-between items-center mt-4">
                <span>{sessionStatus.songCount} SONGS · {startedAtFormatted(sessionStatus.startedAt)}</span>
                <button onClick={resetSession} className="underline hover:text-ink">Reset Session</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nº 03 · AUDIO QUALITY */}
      <div className="mb-16">
        <SectionHeader num="Nº 03" title="Audio Quality" />
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">Transcoding Format</label>
            <PillToggle
              options={[{label: 'Raw/Original', value: 'raw'}, {label: 'MP3', value: 'mp3'}, {label: 'Opus', value: 'opus'}]}
              value={transcodeFormat}
              onChange={(val) => updateSettings({ transcodeFormat: val })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">Max Bitrate</label>
            <PillToggle
              options={[{label: 'Original (0)', value: 0}, {label: '128 kbps', value: 128}, {label: '320 kbps', value: 320}]}
              value={transcodeMaxBitRate}
              onChange={(val) => updateSettings({ transcodeMaxBitRate: val })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">ReplayGain</label>
            <PillToggle
              options={[{label: 'None', value: 'none'}, {label: 'Track', value: 'track'}, {label: 'Album', value: 'album'}]}
              value={replayGainMode}
              onChange={(val) => updateSettings({ replayGainMode: val })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-serif text-ink">Gapless Playback</span>
              <span className="text-[10px] text-ink-mute font-sans uppercase tracking-widest">Removes silence between tracks</span>
            </div>
            <input type="checkbox" checked={gaplessPlayback} onChange={(e) => updateSettings({ gaplessPlayback: e.target.checked })} className="w-4 h-4 accent-coral" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-serif text-ink">Crossfade</span>
              <span className="text-[10px] text-ink-mute font-sans uppercase tracking-widest">Fade between tracks ({crossfadeDuration}s)</span>
            </div>
            <input type="checkbox" checked={crossfadeEnabled} disabled={gaplessPlayback} onChange={(e) => updateSettings({ crossfadeEnabled: e.target.checked })} className="w-4 h-4 accent-coral" />
          </div>
        </div>
      </div>

      {/* Nº 04 · CACHE */}
      <div className="mb-16">
        <SectionHeader num="Nº 04" title="Cache" />
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">Cache Provider</label>
            <PillToggle
              options={[{label: 'IndexedDB', value: 'indexeddb'}, {label: 'Memory', value: 'memory'}]}
              value={cacheProvider}
              onChange={(val) => updateSettings({ cacheProvider: val })}
            />
          </div>
          <div>
             <span className="block text-sm font-serif text-ink mb-1">Max Cache Size</span>
             <p className="text-xs text-ink-mute font-sans mb-3">~{cacheUsedMb.toFixed(1)} MB estimated usage</p>
             <input type="range" min="100" max="2000" step="100" value={cacheMaxSizeMb} onChange={(e) => updateSettings({ cacheMaxSizeMb: parseInt(e.target.value, 10) })} className="w-full accent-coral" />
             <div className="flex justify-between text-xs font-mono text-ink-faint mt-2">
               <span>100MB</span>
               <span>{cacheMaxSizeMb} MB</span>
               <span>2GB</span>
             </div>
          </div>
          <div>
            <Button variant="outline" onClick={handleClearCache} className="w-full text-coral border-coral hover:bg-coral/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Local Cache
            </Button>
          </div>
        </div>
      </div>

      {/* Nº 05 · APPEARANCE */}
      <div className="mb-16">
        <SectionHeader num="Nº 05" title="Appearance" />
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">Theme</label>
            <PillToggle
              options={[{label: 'Light', value: 'light'}, {label: 'Dark', value: 'dark'}, {label: 'System', value: 'system'}]}
              value={theme}
              onChange={(val) => updateSettings({ theme: val })}
            />
          </div>
          <div>
            <label className="block text-[11px] font-sans font-bold text-ink-mute tracking-[0.1em] uppercase mb-2">Accent Color</label>
            <PillToggle
              options={[{label: 'Coral', value: 'coral'}, {label: 'Mustard', value: 'mustard'}, {label: 'Dynamic (Art)', value: 'dynamic'}]}
              value={accentColor}
              onChange={(val) => updateSettings({ accentColor: val })}
            />
          </div>
        </div>
      </div>

      {/* Nº 06 · PRIVACY & DATA */}
      <div className="mb-16">
        <SectionHeader num="Nº 06" title="Privacy & Data" />
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleExportData}><Download size={14} className="mr-2 inline" /> Export Data</Button>
          <Button variant="ghost" onClick={handleResetData} className="text-coral hover:bg-coral/10 hover:text-coral"><Trash2 size={14} className="mr-2 inline" /> Reset History</Button>
        </div>
      </div>

      {/* Nº 07 · LAST.FM */}
      <div className="mb-16">
        <SectionHeader num="Nº 07" title="Last.fm Scrobbling" />
        {lastfmSessionKey ? (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Music size={16} className="text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-sans text-sm font-bold text-ink">Connected as <span className="text-green-600 dark:text-green-400">{lastfmUsername}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={scrobblingEnabled} onChange={(e) => updateSettings({ scrobblingEnabled: e.target.checked })} className="accent-coral w-4 h-4" />
                <span className="font-sans text-sm text-ink-mute">Enable scrobbling</span>
              </label>
              <Button variant="ghost" onClick={handleDisconnectLastFm}>Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <InputField label="API Key" value={lastfmApiKey} onChange={setLastfmApiKey} placeholder="Your API key" />
            <InputField label="API Secret" type="password" value={lastfmApiSecret} onChange={setLastfmApiSecret} placeholder="Your shared secret" hint="Stored locally." />
            <StatusBanner result={lastfmStatus} />
            <Button variant="primary" onClick={handleConnectLastFm} disabled={isConnectingLastfm}>
              {isConnectingLastfm ? 'Redirecting...' : 'Connect Last.fm'}
            </Button>
          </div>
        )}
      </div>

      {/* Nº 08 · KEYBOARD SHORTCUTS */}
      <div className="mb-16">
        <SectionHeader num="Nº 08" title="Keyboard Shortcuts" />
        <div className="grid grid-cols-2 gap-y-4 text-sm font-sans text-ink">
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">Space</span> Play / Pause</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">/</span> Search</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">N</span> Next Track</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">P</span> Previous Track</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">S</span> Shuffle Toggle</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">R</span> Repeat Toggle</div>
          <div><span className="font-mono bg-ink/10 px-1.5 py-0.5 rounded mr-2">M</span> Mute Toggle</div>
        </div>
      </div>

      {/* Nº 09 · ABOUT */}
      <div className="mb-16">
        <SectionHeader num="Nº 09" title="About NaviVibe" />
        <div className="font-mono text-[10px] text-ink-faint space-y-2 uppercase tracking-widest">
          <p>Version <span className="text-ink">1.0.0</span></p>
          <p>Build Date <span className="text-ink">{buildDate}</span></p>
          <p>Commit <span className="text-ink">{gitCommit}</span></p>
          <p className="mt-4"><a href="https://github.com/Subicharan1018/music-web" target="_blank" rel="noopener noreferrer" className="hover:text-coral transition-colors flex items-center gap-1">GitHub Repository <ExternalLink size={10} /></a></p>
        </div>
      </div>

    </div>
  );
};
