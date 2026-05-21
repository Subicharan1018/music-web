/**
 * PlaylistsPage.jsx
 * Displays all user playlists in a grid.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { usePlaylistStore } from '../store/playlistStore';
import { useUIStore } from '../store/uiStore';
import { Plus } from 'lucide-react';
import { CreatePlaylistModal } from '../components/playlists/CreatePlaylistModal';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

const PlaylistCard = ({ playlist, onClick }) => {
  return (
    <div 
      className="group cursor-pointer flex flex-col gap-3"
      onClick={onClick}
    >
      <div className="aspect-square bg-paper-dark border border-ink/5 rounded-md overflow-hidden relative shadow-sm group-hover:shadow-md transition-all flex items-center justify-center">
        {/* Placeholder since no playlist art is provided usually */}
        <div className="absolute inset-0 bg-gradient-to-br from-paper-warm to-ink/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <span className="font-serif text-4xl text-ink-mute group-hover:text-ink transition-colors z-10 opacity-50">PL</span>
      </div>
      
      <div>
        <h3 className="font-serif text-lg leading-tight text-ink group-hover:text-coral transition-colors truncate">
          {playlist.name}
        </h3>
        <p className="font-mono text-xs text-ink-faint mt-1">
          {playlist.songCount || 0} SONGS
        </p>
      </div>
    </div>
  );
};

export const PlaylistsPage = () => {
  const client = useSubsonic();
  const navigate = useNavigate();
  const { playlists, fetchPlaylists, isLoading } = usePlaylistStore();
  const { setView } = useUIStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setView('playlists');
    if (client) {
      fetchPlaylists(client, true); // force = true: user navigated here, show fresh data
    }
  }, [client]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="animate-in fade-in duration-500 pb-24">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="font-mono text-xs tracking-[0.2em] text-ink-mute mb-2 uppercase">
            Nº 04 · PLAYLISTS
          </h2>
          <h1 className="font-serif text-5xl font-bold text-ink italic tracking-tight">
            Playlists
          </h1>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-full hover:bg-coral transition-colors shadow-lg"
        >
          <Plus size={18} />
          <span className="font-sans text-sm font-medium">New Playlist</span>
        </button>
      </div>

      {isLoading && playlists.length === 0 ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
          {playlists.map(playlist => (
            <PlaylistCard 
              key={playlist.id} 
              playlist={playlist} 
              onClick={() => navigate(`/playlist/${playlist.id}`)}
            />
          ))}
        </div>
      )}

      {playlists.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <p className="font-serif italic text-2xl text-ink-mute">No playlists created yet.</p>
        </div>
      )}

      <CreatePlaylistModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
};
