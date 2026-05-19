/**
 * AddToPlaylistDialog.jsx
 * Dialog to add a song/album to a playlist.
 */
import React, { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useSubsonic } from '../../hooks/useSubsonic';
import { usePlaylistStore } from '../../store/playlistStore';
import { useUIStore } from '../../store/uiStore';
import { CreatePlaylistModal } from './CreatePlaylistModal';

const SkeletonRow = () => (
  <div className="flex items-center p-3 gap-4 animate-pulse">
    <div className="w-10 h-10 bg-ink/5 rounded-sm flex-shrink-0"></div>
    <div className="flex-1">
      <div className="h-4 bg-ink/5 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-ink/5 rounded w-1/4"></div>
    </div>
  </div>
);

export const AddToPlaylistDialog = ({ isOpen, onClose, songsToAdd = [] }) => {
  const client = useSubsonic();
  const { playlists, fetchPlaylists, addSongsToPlaylist } = usePlaylistStore();
  const { addToast } = useUIStore();
  const [isFetching, setIsFetching] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsFetching(true);
      fetchPlaylists(client).finally(() => setIsFetching(false));
    }
  }, [isOpen, client, fetchPlaylists]);

  if (!isOpen && !showCreateModal) return null;

  const handleSelectPlaylist = async (playlistId, playlistName) => {
    try {
      const songIds = songsToAdd.map(s => s.id);
      await addSongsToPlaylist(client, playlistId, songIds);
      addToast(`Added to "${playlistName}"`);
      onClose();
    } catch (error) {
      addToast(error.message || 'Failed to add to playlist', 'error');
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-paper rounded-t-xl sm:rounded-xl border sm:border-ink/16 border-b-0 p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
            
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="font-serif text-xl text-ink">Add to Playlist</h2>
              <button onClick={onClose} className="text-ink-mute hover:text-coral transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 no-scrollbar -mx-2 px-2">
              <button 
                onClick={() => {
                  onClose();
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center p-3 gap-4 rounded-md hover:bg-paper-warm transition-colors text-left group"
              >
                <div className="w-10 h-10 bg-ink/5 group-hover:bg-coral/10 rounded-sm flex items-center justify-center transition-colors">
                  <Plus size={20} className="text-ink group-hover:text-coral transition-colors" />
                </div>
                <span className="font-serif text-lg text-ink group-hover:text-coral transition-colors">New Playlist</span>
              </button>

              <div className="my-2 border-t border-ink/5"></div>

              {isFetching ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist.id, playlist.name)}
                    className="w-full flex items-center p-3 gap-4 rounded-md hover:bg-paper-warm transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-ink/5 rounded-sm flex items-center justify-center flex-shrink-0">
                       <span className="font-mono text-xs text-ink-mute">PL</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-lg text-ink truncate">{playlist.name}</div>
                      <div className="font-sans text-xs text-ink-mute">
                        {playlist.songCount || 0} songs
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <CreatePlaylistModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </>
  );
};
