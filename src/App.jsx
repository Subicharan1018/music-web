/**
 * App.jsx
 * Route definitions and Auth Guard.
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useUIStore } from './store/uiStore';
import { AppShell } from './components/layout/AppShell';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { SplashScreen } from './components/layout/SplashScreen';
import { authCookies } from './lib/auth';
import { createSubsonicClient } from './api/subsonic';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AlbumDetailPage = lazy(() => import('./pages/AlbumDetailPage').then(m => ({ default: m.AlbumDetailPage })));
const ArtistDetailPage = lazy(() => import('./pages/ArtistDetailPage').then(m => ({ default: m.ArtistDetailPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const ArtistsPage = lazy(() => import('./pages/ArtistsPage').then(m => ({ default: m.ArtistsPage })));
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage').then(m => ({ default: m.PlaylistsPage })));
const PlaylistDetailPage = lazy(() => import('./pages/PlaylistDetailPage').then(m => ({ default: m.PlaylistDetailPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(m => ({ default: m.StatsPage })));
const LastFmCallbackPage = lazy(() => import('./pages/LastFmCallbackPage').then(m => ({ default: m.LastFmCallbackPage })));

const RouteSync = () => {
  const location = useLocation();
  const setView = useUIStore(state => state.setView);
  
  React.useEffect(() => {
    const path = location.pathname.split('/')[1] || 'library';
    setView(path);
  }, [location, setView]);

  return null;
};

const AuthGuard = ({ children }) => {
  const { isConfigured, setServerConfig, clearConfig } = useSettingsStore();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const verifySession = async () => {
      if (authCookies.exists() && !isConfigured) {
        // Hydrate store from cookie if store was cleared but cookie exists
        const credentials = authCookies.get();
        if (credentials) setServerConfig(credentials);
      }
      
      if (authCookies.exists()) {
        try {
          const credentials = authCookies.get();
          const client = createSubsonicClient(credentials);
          await client.ping();
        } catch (e) {
          authCookies.remove();
          clearConfig();
        }
      }
      
      if (mounted) setIsVerifying(false);
    };
    verifySession();
    return () => { mounted = false; };
  }, [isConfigured, setServerConfig, clearConfig]);

  if (isVerifying) return <SplashScreen />;

  if (!isConfigured && !authCookies.exists()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <RouteSync />
      {children}
    </>
  );
};

function App() {
  const { isConfigured, theme } = useSettingsStore();

  React.useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    };

    updateTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <Routes>
        <Route 
          path="/login" 
          element={isConfigured ? <Navigate to="/library" replace /> : <LoginPage />} 
        />
        
        <Route path="/" element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route index element={<Navigate to="/library" replace />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="album/:id" element={<AlbumDetailPage />} />
          <Route path="artist/:id" element={<ArtistDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Placeholders for other routes */}
          <Route path="albums" element={<LibraryPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlist/:id" element={<PlaylistDetailPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
        {/* Last.fm OAuth callback — lives outside AppShell so no sidebar/player */}
        <Route path="/lastfm/callback" element={<LastFmCallbackPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
