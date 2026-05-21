/**
 * settingsStore.js
 * Persisted Zustand store for application settings, Subsonic server config, and theme preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authCookies } from '../lib/auth';

const initialAuth = authCookies.get() || {
  serverUrl: '',
  username: '',
  password: '',
  isConfigured: false
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      serverUrl: initialAuth.serverUrl,
      username: initialAuth.username,
      password: initialAuth.password,
      isConfigured: initialAuth.isConfigured,

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
      lastfmApiKey: '',
      lastfmApiSecret: '',
      lastfmUsername: '',
      
      theme: 'dark',

      setServerConfig: (config) => {
        authCookies.set({
          serverUrl: config.serverUrl,
          username: config.username,
          password: config.password,
          isConfigured: true
        });
        set(() => ({
          serverUrl: config.serverUrl,
          username: config.username,
          password: config.password,
          isConfigured: true
        }));
      },

      clearConfig: () => {
        authCookies.remove();
        set({
          serverUrl: '',
          username: '',
          password: '',
          isConfigured: false
        });
      },

      updateSettings: (newSettings) => set((state) => ({
        ...state,
        ...newSettings
      }))
    }),
    {
      name: 'navivibe-settings',
      partialize: (state) => {
        // Credentials (serverUrl, username, password, isConfigured) live in
        // cookies via authCookies — exclude them from localStorage persist.
        const { username, password, serverUrl, isConfigured, ...rest } = state;
        return rest;
      }
    }
  )
);
