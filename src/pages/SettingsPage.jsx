/**
 * SettingsPage.jsx
 * Settings configuration including server connection and Last.fm integration.
 * Phase 6: Added Last.fm connect/disconnect flow with api_key + api_secret fields.
 */

import { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/shared/Button';
import { createSubsonicClient, NetworkException, AuthException, ServerException } from '../api/subsonic';
import { ExternalLink, Music } from 'lucide-react';
import { useServerHealth } from '../hooks/useServerHealth';
import { useAIShuffleStore } from '../store/aiShuffleStore';
import { ShuffleApiService, startedAtFormatted } from '../services/ShuffleApiService';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

const InputField = ({ label, type = 'text', value, onChange, placeholder, hint }) => (
  <div>
    <label className="block text-sm font-sans font-medium text-ink-mute mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-paper-warm border border-ink/20 rounded-md text-ink font-body focus:outline-none focus:border-coral transition-colors"
    />
    {hint && <p className="mt-1 text-xs text-ink-faint font-sans">{hint}</p>}
  </div>
);

const StatusBanner = ({ result }) =>
  result ? (
    <div className={`p-4 rounded-md border ${result.type === 'success' ? 'bg-olive/10 border-olive/20 text-olive' : 'bg-coral/10 border-coral/20 text-coral'}`}>
      <p className="text-sm font-sans font-medium">{result.message}</p>
    </div>
  ) : null;

export const SettingsPage = () => {
  const {
    serverUrl,
    username: storeUsername,
    password: storePassword,
    localShuffleUrl,
    lastfmApiKey: storeLastfmApiKey,
    lastfmApiSecret: storeLastfmApiSecret,
    lastfmSessionKey,
    lastfmUsername,
    scrobblingEnabled,
    clearConfig,
    setServerConfig,
    updateSettings,
  } = useSettingsStore();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [url, setUrl]             = useState(serverUrl || '');
  const [username, setUsername]   = useState(storeUsername || '');
  const [password, setPassword]   = useState(storePassword || '');
  const [shuffleUrl, setShuffleUrl] = useState(localShuffleUrl || '');
  const [lastfmApiKey, setLastfmApiKey]       = useState(storeLastfmApiKey || '');
  const [lastfmApiSecret, setLastfmApiSecret] = useState(storeLastfmApiSecret || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isConnectingLastfm, setIsConnectingLastfm] = useState(false);
  const [lastfmStatus, setLastfmStatus] = useState(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  const { isConfigured, isHealthy, health } = useServerHealth();
  const sessionStatus = useAIShuffleStore((s) => s.sessionStatus);
  const resetSession = useAIShuffleStore((s) => s.resetSession);

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
        setAiTestResult({
          type: 'success',
          message: `Connected · Library size: ${healthData.librarySize?.toLocaleString() ?? 0} songs`,
        });
      } else {
        setAiTestResult({ type: 'error', message: `Server returned status: ${healthData.status}` });
      }
    } catch (err) {
      setAiTestResult({ type: 'error', message: err.message || 'Connection failed.' });
    } finally {
      setIsTestingAi(false);
    }
  };

  useEffect(() => {
    setUrl(serverUrl || '');
    setUsername(storeUsername || '');
    setPassword(storePassword || '');
    setShuffleUrl(localShuffleUrl || '');
    setLastfmApiKey(storeLastfmApiKey || '');
    setLastfmApiSecret(storeLastfmApiSecret || '');
  }, [serverUrl, storeUsername, storePassword, localShuffleUrl, storeLastfmApiKey, storeLastfmApiSecret]);

  // Show banner based on ?lastfm= query param set by LastFmCallbackPage
  useEffect(() => {
    const result = searchParams.get('lastfm');
    if (result === 'connected') setLastfmStatus({ type: 'success', message: 'Last.fm connected successfully.' });
    if (result === 'error')     setLastfmStatus({ type: 'error', message: 'Last.fm connection failed. Check your API key/secret.' });
  }, [searchParams]);

  const handleLogout = () => {
    clearConfig();
    navigate('/login');
  };

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
      if (err instanceof AuthException)    setTestResult({ type: 'error', message: 'Authentication failed.' });
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

  // Step 1 of Last.fm OAuth: get a token, redirect user to Last.fm approval page
  const handleConnectLastFm = async () => {
    if (!lastfmApiKey.trim()) {
      setLastfmStatus({ type: 'error', message: 'Enter your Last.fm API key first, then save.' });
      return;
    }
    setIsConnectingLastfm(true);
    setLastfmStatus(null);
    try {
      // Save API key/secret before redirecting so they survive the navigation
      updateSettings({
        lastfmApiKey: lastfmApiKey.trim(),
        lastfmApiSecret: lastfmApiSecret.trim(),
      });

      // auth.getToken doesn't require a signature
      const res = await fetch(
        `${LASTFM_API_URL}?method=auth.getToken&api_key=${lastfmApiKey.trim()}&format=json`
      );
      const data = await res.json();
      if (!data?.token) throw new Error(data?.message || 'Failed to get token');

      const callbackUrl = encodeURIComponent(`${window.location.origin}/lastfm/callback`);
      window.location.href =
        `https://www.last.fm/api/auth/?api_key=${lastfmApiKey.trim()}&token=${data.token}&cb=${callbackUrl}`;
    } catch (err) {
      setLastfmStatus({ type: 'error', message: `Last.fm error: ${err.message}` });
      setIsConnectingLastfm(false);
    }
  };

  const handleDisconnectLastFm = () => {
    updateSettings({ lastfmSessionKey: null, lastfmUsername: '' });
    setLastfmStatus({ type: 'success', message: 'Last.fm disconnected.' });
  };

  return (
    <div className="animate-in fade-in duration-300 p-8 pb-32 max-w-2xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="mb-12">
        <h1 className="font-serif text-4xl font-medium text-ink mb-3 flex items-baseline gap-3">
          <span className="font-mono text-[10px] text-coral tracking-widest uppercase">Nº 02</span>
          Settings
        </h1>
        <p className="font-body text-base text-ink-mute leading-relaxed">
          Configure your server connection, AI shuffle, and scrobbling preferences.
        </p>
      </div>

      {/* ── Server Connection ──────────────────────────────────────────── */}
      <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint border-b border-ink/10 pb-1 mb-6">
        Server Connection
      </h2>
      <div className="space-y-5 mb-8">
        <InputField label="Server URL"  type="url"      value={url}      onChange={setUrl}      placeholder="https://music.example.com" />
        <InputField label="Username"                     value={username} onChange={setUsername}  />
        <InputField label="Password"    type="password" value={password} onChange={setPassword}  />
        <StatusBanner result={testResult} />
      </div>

      <div className="flex gap-4 mb-16">
        <Button variant="ghost"   onClick={handleLogout}>Disconnect Server</Button>
        <Button variant="ghost"   onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? 'Testing…' : 'Test Connection'}
        </Button>
        <Button variant="primary" onClick={handleSave}>Save Settings</Button>
      </div>

      {/* ── Nº 03 · AI Shuffle Server ────────────────────────────────────────── */}
      <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint border-b border-ink/10 pb-1 mb-6 flex items-baseline gap-3">
        <span className="font-mono text-[9px] text-coral tracking-widest uppercase shrink-0">Nº 03</span>
        AI Shuffle Server
      </h2>
      <div className="space-y-5 mb-6">
        <InputField
          label="Server URL"
          type="url"
          value={shuffleUrl}
          onChange={setShuffleUrl}
          placeholder="http://localhost:5000"
          hint="Uses local AI shuffle server when available; falls back to on-device scoring."
        />
        <StatusBanner result={aiTestResult} />
      </div>

      <div className="flex gap-4 mb-8">
        <Button variant="ghost" onClick={handleTestAiConnection} disabled={isTestingAi}>
          {isTestingAi ? 'Testing…' : 'Test Connection'}
        </Button>
      </div>

      {isConfigured && isHealthy && (
        <div className="mb-16 p-4 bg-paper-warm border border-ink/10 rounded-md">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-sans text-sm font-medium text-ink">Server Connected & Active</span>
          </div>
          
          {health && (
            <div className="font-mono text-[10px] text-ink-faint grid grid-cols-2 gap-2">
              <div>LIBRARY SIZE: {health.librarySize?.toLocaleString() || '—'}</div>
              <div>UPTIME: {health.uptime || '—'}</div>
            </div>
          )}
          
          {sessionStatus && (
            <div className="mt-4 pt-4 border-t border-ink/5 flex items-center justify-between">
              <div>
                <div className="font-sans text-sm text-ink mb-1">Current Session</div>
                <div className="font-mono text-[10px] text-ink-faint">
                  {sessionStatus.songCount} SONGS · {startedAtFormatted(sessionStatus.startedAt)}
                </div>
              </div>
              <Button variant="ghost" onClick={() => resetSession()}>
                Reset Session
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Nº 04 · Last.fm Scrobbling ───────────────────────────────────────── */}
      <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint border-b border-ink/10 pb-1 mb-6 flex items-baseline gap-3">
        <span className="font-mono text-[9px] text-coral tracking-widest uppercase shrink-0">Nº 04</span>
        Last.fm Scrobbling
      </h2>

      {lastfmSessionKey ? (
        /* Connected state */
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 p-4 bg-olive/8 border border-olive/20 rounded-md">
            <Music size={16} className="text-olive shrink-0" />
            <div>
              <p className="font-sans text-sm font-medium text-ink">
                Connected as <span className="text-olive font-semibold">{lastfmUsername || 'Last.fm User'}</span>
              </p>
              <p className="font-mono text-[10px] text-ink-faint">Scrobbles will be sent to Last.fm after threshold.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scrobblingEnabled}
                onChange={(e) => updateSettings({ scrobblingEnabled: e.target.checked })}
                className="accent-coral w-4 h-4"
              />
              <span className="font-sans text-sm text-ink-mute">Enable scrobbling</span>
            </label>
            <Button variant="ghost" onClick={handleDisconnectLastFm}>Disconnect</Button>
          </div>
        </div>
      ) : (
        /* Not connected state */
        <div className="space-y-5 mb-8">
          <p className="font-sans text-sm text-ink-mute">
            Connect your Last.fm account to scrobble tracks automatically.{' '}
            <a
              href="https://www.last.fm/api/account/create"
              target="_blank"
              rel="noopener noreferrer"
              className="text-coral hover:underline inline-flex items-center gap-1"
            >
              Get API key <ExternalLink size={11} />
            </a>
          </p>
          <InputField
            label="API Key"
            value={lastfmApiKey}
            onChange={setLastfmApiKey}
            placeholder="Your Last.fm API key"
          />
          <InputField
            label="API Secret"
            type="password"
            value={lastfmApiSecret}
            onChange={setLastfmApiSecret}
            placeholder="Your Last.fm shared secret"
            hint="Stored locally only. Never sent to any server other than Last.fm."
          />
          <StatusBanner result={lastfmStatus} />
          <Button variant="primary" onClick={handleConnectLastFm} disabled={isConnectingLastfm}>
            {isConnectingLastfm ? 'Redirecting to Last.fm…' : 'Connect Last.fm'}
          </Button>
        </div>
      )}
      {lastfmSessionKey && <StatusBanner result={lastfmStatus} />}
    </div>
  );
};
