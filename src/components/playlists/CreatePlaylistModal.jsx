/**
 * CreatePlaylistModal.jsx
 * Modal dialog for creating a new playlist.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubsonic } from '../../hooks/useSubsonic';
import { usePlaylistStore } from '../../store/playlistStore';
import { useUIStore } from '../../store/uiStore';
import { X } from 'lucide-react';

export const CreatePlaylistModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  const client = useSubsonic();
  const { createPlaylist, isSaving } = usePlaylistStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    try {
      const newPlaylist = await createPlaylist(client, name.trim());
      addToast(`Created playlist "${name.trim()}"`);
      onClose();
      if (newPlaylist) {
        navigate(`/playlist/${newPlaylist.id}`);
      }
    } catch (error) {
      addToast(error.message || 'Failed to create playlist', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-start justify-center pt-32">
      <div className="bg-paper rounded-lg border border-ink/16 p-8 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-ink">New Playlist</h2>
          <button onClick={onClose} className="text-ink-mute hover:text-coral transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name..."
            className="w-full bg-transparent border-b border-ink/30 focus:border-coral outline-none font-serif text-xl py-2 mb-8 transition-colors text-ink placeholder:text-ink-faint"
            disabled={isSaving}
          />
          
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-full font-sans text-sm font-medium text-ink-mute hover:text-ink transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-ink text-paper font-sans text-sm font-medium hover:bg-coral transition-colors disabled:opacity-50"
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
