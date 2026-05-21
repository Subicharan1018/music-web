/**
 * useSubsonic.js
 * React hook that initializes and provides the Subsonic API client
 * using credentials from the settingsStore.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubsonicClient, AuthException } from '../api/subsonic';
import { useSettingsStore } from '../store/settingsStore';

export const useSubsonic = () => {
  const serverUrl   = useSettingsStore((s) => s.serverUrl);
  const username    = useSettingsStore((s) => s.username);
  const password    = useSettingsStore((s) => s.password);
  const isConfigured = useSettingsStore((s) => s.isConfigured);

  const clearConfig = useSettingsStore((s) => s.clearConfig);
  const navigate = useNavigate();

  // RC-07: Single stable string dependency prevents re-instantiation when
  // unrelated settings (theme, bitrate, etc.) change in settingsStore.
  const credentialKey = `${serverUrl}|${username}|${password}|${isConfigured}`;

  const client = useMemo(() => {
    if (!isConfigured) return null;
    const c = createSubsonicClient({ serverUrl, username, password });
    
    // Intercept AuthException globally
    const originalRequest = c._request.bind(c);
    c._request = async (...args) => {
      try {
        return await originalRequest(...args);
      } catch (error) {
        if (error instanceof AuthException) {
          clearConfig();
          navigate('/login', { replace: true });
        }
        throw error;
      }
    };
    return c;
  }, [credentialKey, clearConfig, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  return client;
};
