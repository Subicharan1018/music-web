/**
 * LastFmCallbackPage.jsx
 * OAuth callback landing page for Last.fm authentication.
 * Reads ?token= from the URL, calls auth.getSession, saves session key to settingsStore.
 * Redirects to /settings on success or failure.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

export const LastFmCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lastfmApiKey, lastfmApiSecret, updateSettings } = useSettingsStore();
  const hasFired = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (hasFired.current) return;
    hasFired.current = true;

    const token = searchParams.get('token');

    if (!token) {
      console.error('Last.fm callback: no token in URL');
      navigate('/settings?lastfm=error', { replace: true });
      return;
    }

    const fetchSession = async () => {
      try {
        // Build api_sig for auth.getSession
        // Params to sign: api_key, method, token  (exclude format/callback)
        const { default: md5 } = await import('md5');
        const params = {
          method:  'auth.getSession',
          api_key: lastfmApiKey,
          token,
        };

        const sigString =
          Object.keys(params)
            .sort()
            .map((k) => `${k}${params[k]}`)
            .join('') + lastfmApiSecret;

        const api_sig = md5(sigString);

        const url = new URL(LASTFM_API_URL);
        Object.entries({ ...params, api_sig, format: 'json' }).forEach(([k, v]) =>
          url.searchParams.set(k, v)
        );

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data?.session?.key) {
          updateSettings({
            lastfmSessionKey: data.session.key,
            lastfmUsername: data.session.name || '',
          });
          navigate('/settings?lastfm=connected', { replace: true });
        } else {
          console.error('Last.fm getSession failed:', data?.error, data?.message);
          navigate('/settings?lastfm=error', { replace: true });
        }
      } catch (err) {
        console.error('Last.fm callback error:', err);
        navigate('/settings?lastfm=error', { replace: true });
      }
    };

    fetchSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-paper gap-4">
      <LoadingSpinner />
      <p className="font-sans text-sm text-ink-mute">Connecting to Last.fm…</p>
    </div>
  );
};
