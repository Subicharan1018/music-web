/**
 * settingsStore.js
 * Persisted Zustand store for application settings, Subsonic server config, and theme preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      serverUrl: '',
      username: '',
      password: '',
      isConfigured: false,

      // Getters for compatibility
      get replayGainEnabled() { return get().replayGainMode !== 'none'; },
      get scrobbleEnabled() { return get().scrobblingEnabled; },

      localShuffleUrl: '',
      
      transcodeFormat: 'mp3',
      transcodeBitrate: '320',
      
      replayGainMode: 'none',
      replayGainPreamp: '0',
      
      scrobblingEnabled: true,
      lastfmSessionKey: null,
      
      theme: 'dark',

      setServerConfig: (config) => set((state) => ({
        serverUrl: config.serverUrl,
        username: config.username,
        password: config.password,
        isConfigured: true
      })),

      clearConfig: () => set({
        serverUrl: '',
        username: '',
        password: '',
        isConfigured: false
      }),

      updateSettings: (newSettings) => set((state) => ({
        ...state,
        ...newSettings
      }))
    }),
    {
      name: 'navivibe-settings',
    }
  )
);
