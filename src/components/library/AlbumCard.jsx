/**
 * AlbumCard.jsx
 * Card component for displaying an album, extracting palette, and handling interactions.
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { paletteService } from '../../services/PaletteService';
import { usePlayAction } from '../../hooks/player/usePlayAction';
import { useLibraryStore } from '../../store/libraryStore';
import { useSubsonic } from '../../hooks/useSubsonic';
import { Play } from 'lucide-react';

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
      className="reveal-item group flex flex-col gap-3 cursor-pointer transition-all duration-300 hover:-translate-y-2 relative"
      style={style}
      onClick={() => navigate(`/album/${album.id}`)}
      onContextMenu={handleContextMenu}
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-white/5 shadow-lg relative ring-1 ring-white/10 group-hover:ring-[var(--card-accent,rgba(255,255,255,0.3))] group-hover:shadow-[0_8px_32px_var(--card-accent,rgba(0,0,0,0.5))] transition-all duration-300">
        <img 
          src={coverUrl} 
          alt={album.name || album.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
          <button 
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-coral hover:scale-110 hover:shadow-[0_0_20px_rgba(220,20,60,0.6)] transition-all duration-200"
          >
            <Play size={24} className="ml-1 fill-current" />
          </button>
        </div>
      </div>
      <div className="flex flex-col px-1">
        <span className="font-sans text-sm font-bold text-white truncate drop-shadow-sm transition-colors group-hover:text-[var(--card-accent,white)]">
          {album.name || album.title}
        </span>
        <span className="font-sans text-xs text-white/50 truncate font-medium mt-0.5">
          {album.artist}
        </span>
        {album.year && (
          <span className="font-mono text-[10px] text-white/30 mt-1 uppercase tracking-widest">
            {album.year}
          </span>
        )}
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 backdrop-blur-xl rounded-xl py-2 min-w-[160px] text-sm text-white overflow-hidden"
            style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(220,20,60,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.9)' }}
          >
            <button className="w-full text-left px-5 py-2.5 hover:bg-white/[0.05] transition-colors font-sans font-medium" onClick={handlePlay}>Play Album</button>
            <button className="w-full text-left px-5 py-2.5 hover:bg-white/[0.05] transition-colors font-sans font-medium" onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}>Add to Queue</button>
            <button className="w-full text-left px-5 py-2.5 hover:bg-white/[0.05] transition-colors font-sans font-medium" onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              if (album.artistId) navigate(`/artist/${album.artistId}`);
            }}>Go to Artist</button>
            <button
              className="w-full text-left px-5 py-2.5 transition-colors font-sans font-medium"
              style={{ color: '#dc143c' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,20,60,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            >Add to Playlist</button>
          </div>
        </>
      )}
    </div>
  );
};
