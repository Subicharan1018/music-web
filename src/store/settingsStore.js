/**
 * settingsStore.js
 * Persisted Zustand store for application settings, Subsonic server config, and theme preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authCookies } from '../lib/auth';

const initialAuth = authCookies.get() || {};

const syncCookies = (state) => {
  authCookies.set({
    serverUrl: state.serverUrl,
    username: state.username,
    password: state.password,
    isConfigured: state.isConfigured,
    localShuffleUrl: state.localShuffleUrl,
    v2ShuffleUrl: state.v2ShuffleUrl,
    lastfmSessionKey: state.lastfmSessionKey,
    lastfmApiKey: state.lastfmApiKey,
    lastfmApiSecret: state.lastfmApiSecret,
    lastfmUsername: state.lastfmUsername,
  });
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      serverUrl: initialAuth.serverUrl || '',
      username: initialAuth.username || '',
      password: initialAuth.password || '',
      isConfigured: initialAuth.isConfigured || false,

      // Getters for compatibility
      get replayGainEnabled() { return get().replayGainMode !== 'none'; },
      get scrobbleEnabled() { return get().scrobblingEnabled; },

      localShuffleUrl: initialAuth.localShuffleUrl || '',
      
      v2ShuffleUrl: initialAuth.v2ShuffleUrl || 'http://100.99.105.51:5500',
      v2ShuffleEnabled: false,
      
      transcodeFormat: 'mp3',
      transcodeBitrate: '320',
      
      replayGainMode: 'none',
      replayGainPreamp: '0',
      
      scrobblingEnabled: true,
      lastfmSessionKey: initialAuth.lastfmSessionKey || null,
      lastfmApiKey: initialAuth.lastfmApiKey || '',
      lastfmApiSecret: initialAuth.lastfmApiSecret || '',
      lastfmUsername: initialAuth.lastfmUsername || '',
      
      theme: 'dark',

      setServerConfig: (config) => {
        set((state) => {
          const nextState = {
            ...state,
            serverUrl: config.serverUrl,
            username: config.username,
            password: config.password,
            isConfigured: true
          };
          syncCookies(nextState);
          return nextState;
        });
      },

      clearConfig: () => {
        authCookies.remove();
        set({
          serverUrl: '',
          username: '',
          password: '',
          isConfigured: false,
          localShuffleUrl: '',
          v2ShuffleUrl: 'http://100.99.105.51:5500',
          lastfmSessionKey: null,
          lastfmApiKey: '',
          lastfmApiSecret: '',
          lastfmUsername: ''
        });
      },

      updateSettings: (newSettings) => set((state) => {
        const nextState = { ...state, ...newSettings };
        syncCookies(nextState);
        return nextState;
      })
    }),
    {
      name: 'navivibe-settings',
      partialize: (state) => {
        // Credentials and sensitive URLs live in cookies via authCookies
        // exclude them from localStorage persist.
        const { 
          username, password, serverUrl, isConfigured,
          localShuffleUrl, v2ShuffleUrl,
          lastfmSessionKey, lastfmApiKey, lastfmApiSecret, lastfmUsername,
          ...rest 
        } = state;
        return rest;
      }
    }
  )
);
