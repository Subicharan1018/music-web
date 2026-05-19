/**
 * useSubsonic.js
 * React hook that initializes and provides the Subsonic API client
 * using credentials from the settingsStore.
 */

import { useMemo } from 'react';
import { createSubsonicClient } from '../api/subsonic';
import { useSettingsStore } from '../store/settingsStore';

export const useSubsonic = () => {
  const { serverUrl, username, password, isConfigured } = useSettingsStore();

  const client = useMemo(() => {
    if (!isConfigured) return null;
    return createSubsonicClient({ serverUrl, username, password });
  }, [serverUrl, username, password, isConfigured]);

  return client;
};
