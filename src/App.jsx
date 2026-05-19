/**
 * App.jsx
 * Route definitions and Auth Guard.
 */

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useUIStore } from './store/uiStore';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlbumDetailPage } from './pages/AlbumDetailPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { SearchPage } from './pages/SearchPage';
import { ArtistsPage } from './pages/ArtistsPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';

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
  const { isConfigured } = useSettingsStore();
  const location = useLocation();

  if (!isConfigured) {
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
  const { isConfigured } = useSettingsStore();

  return (
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
        <Route path="stats" element={<LibraryPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
