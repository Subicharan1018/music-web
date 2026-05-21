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
      className="group cursor-pointer flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-2"
      onClick={onClick}
    >
      <div className="aspect-square bg-white/5 border border-white/10 rounded-xl overflow-hidden relative shadow-lg group-hover:shadow-[0_8px_32px_rgba(220,20,60,0.4)] group-hover:border-coral/50 transition-all flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-coral/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <span className="font-serif text-5xl font-bold text-white/10 group-hover:text-coral transition-colors z-10 drop-shadow-sm">PL</span>
      </div>
      
      <div className="px-1">
        <h3 className="font-sans text-[15px] font-bold text-white group-hover:text-coral transition-colors truncate drop-shadow-sm">
          {playlist.name}
        </h3>
        <p className="font-sans text-[10px] text-white/40 mt-1 uppercase tracking-widest font-medium">
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
          <h2 className="font-sans font-bold text-[11px] tracking-[0.3em] text-white/40 mb-2 uppercase flex items-center gap-2">
            <div className="w-8 h-[1px] bg-gradient-to-r from-coral to-transparent"></div>
            Nº 04 · PLAYLISTS
          </h2>
          <h1 className="font-serif text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight drop-shadow-sm">
            Playlists
          </h1>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full hover:bg-gradient-to-r hover:from-coral hover:to-mustard hover:text-white transition-all shadow-[0_4px_16px_rgba(255,255,255,0.1)] hover:shadow-[0_0_24px_rgba(220,20,60,0.6)] hover:scale-105 active:scale-95 font-sans text-sm font-bold tracking-wide"
        >
          <Plus size={18} />
          <span>NEW PLAYLIST</span>
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
