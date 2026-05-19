/**
 * AlbumCard.jsx
 * Card component for displaying an album, extracting palette, and handling interactions.
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { paletteService } from '../../services/PaletteService';
import { usePlayAction } from '../../hooks/usePlayAction';
import { useLibraryStore } from '../../store/libraryStore';
import { useSubsonic } from '../../hooks/useSubsonic';

export const AlbumCard = ({ album }) => {
  const [accent, setAccent] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const client = useSubsonic();
  const { playAlbum } = usePlayAction();
  const { fetchAlbum } = useLibraryStore();

  const coverUrl = client ? client.getCoverArtUrl(album.id, 300) : '';

  const handleImageLoad = async () => {
    if (coverUrl) {
      const palette = await paletteService.getPalette(coverUrl);
      if (palette?.primary) {
        setAccent(palette.primary);
      }
    }
  };

  const handlePlay = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!client) return;
    try {
      const fullAlbum = await fetchAlbum(client, album.id);
      if (fullAlbum && fullAlbum.song) {
        playAlbum(fullAlbum, fullAlbum.song, 0);
      }
    } catch (e) {
      console.error('Failed to play album', e);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const style = accent ? { '--card-accent': accent } : {};

  return (
    <div 
      ref={cardRef}
      className="group flex flex-col gap-2 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 relative"
      style={style}
      onClick={() => navigate(`/album/${album.id}`)}
      onContextMenu={handleContextMenu}
    >
      <div className="aspect-square rounded-md overflow-hidden bg-ink/5 shadow-sm relative">
        <img 
          src={coverUrl} 
          alt={album.name || album.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
          loading="lazy"
        />
        {/* Simple hover overlay indicating the accent color if available. */}
        <div className="absolute inset-0 border border-transparent group-hover:border-[var(--card-accent)]/50 transition-colors pointer-events-none rounded-md" />
      </div>
      <div className="flex flex-col">
        <span className="font-sans text-sm font-semibold text-ink truncate">
          {album.name || album.title}
        </span>
        <span className="font-sans text-xs text-ink-mute truncate">
          {album.artist}
        </span>
        {album.year && (
          <span className="font-mono text-[10px] text-ink-faint mt-0.5">
            {album.year}
          </span>
        )}
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-paper border border-ink/10 rounded-md shadow-lg py-1 min-w-[140px] text-sm">
            <button className="w-full text-left px-4 py-2 hover:bg-ink/5" onClick={handlePlay}>Play</button>
            <button className="w-full text-left px-4 py-2 hover:bg-ink/5" onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              console.log('Add to Queue clicked');
            }}>Add to Queue</button>
            <button className="w-full text-left px-4 py-2 hover:bg-ink/5" onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              if (album.artistId) navigate(`/artist/${album.artistId}`);
            }}>Go to Artist</button>
            <button className="w-full text-left px-4 py-2 hover:bg-ink/5" onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}>Add to Playlist</button>
          </div>
        </>
      )}
    </div>
  );
};
