/**
 * FavoritesPage.jsx
 * Displays starred albums and songs in separate tabs.
 */
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { useUIStore } from '../store/uiStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SongRow } from '../components/library/SongRow';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const FavoritesPage = () => {
  const client = useSubsonic();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'albums';
  const { setView } = useUIStore();
  
  const { starred, fetchStarred, isStarredLoading } = useLibraryStore();

  useEffect(() => {
    setView(`FAVORITES · ${activeTab.toUpperCase()}`);
  }, [activeTab, setView]);

  useEffect(() => {
    if (client) {
      fetchStarred(client);
    }
  }, [client, fetchStarred]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const isEmpty = (activeTab === 'albums' && starred.albums.length === 0) || 
                  (activeTab === 'songs' && starred.songs.length === 0);

  return (
    <div className="animate-in fade-in duration-500 pb-24">
      <div className="flex items-end justify-between mb-8 border-b border-ink/10 pb-4">
        <div>
          <h2 className="font-mono text-xs tracking-[0.2em] text-ink-mute mb-2 uppercase">
            Nº 05 · FAVORITES
          </h2>
          <h1 className="font-serif text-5xl font-bold text-ink italic tracking-tight">
            Starred
          </h1>
        </div>

        <div className="flex items-center gap-6 font-sans text-xs uppercase tracking-widest">
          <button
            onClick={() => handleTabChange('albums')}
            className={`pb-1 transition-colors ${
              activeTab === 'albums' 
                ? 'text-coral border-b-2 border-coral font-bold' 
                : 'text-ink-mute hover:text-ink border-b-2 border-transparent'
            }`}
          >
            Albums
          </button>
          <button
            onClick={() => handleTabChange('songs')}
            className={`pb-1 transition-colors ${
              activeTab === 'songs' 
                ? 'text-coral border-b-2 border-coral font-bold' 
                : 'text-ink-mute hover:text-ink border-b-2 border-transparent'
            }`}
          >
            Songs
          </button>
        </div>
      </div>

      {isStarredLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : isEmpty ? (
        <div className="text-center py-20">
          <p className="font-serif italic text-2xl text-ink-mute">Nothing starred yet.</p>
        </div>
      ) : (
        <div className="mt-8">
          {activeTab === 'albums' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
              {starred.albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}

          {activeTab === 'songs' && (
            <div className="flex flex-col">
              {starred.songs.map((song, index) => (
                <SongRow 
                  key={`starred-${song.id}-${index}`} 
                  song={song} 
                  index={index} 
                  contextSongs={starred.songs}
                  context="favorites" 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
