/**
 * SearchPage.jsx
 * Search interface for finding artists, albums, and songs.
 */
import { useState, useEffect, useRef } from 'react';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SongRow } from '../components/library/SongRow';
import { useNavigate } from 'react-router-dom';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const client = useSubsonic();
  const { search, searchResults, isLoading } = useLibraryStore();
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      if (client) {
        search(client, query);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, client, search]);

  const { artists, albums, songs } = searchResults;

  const renderArtists = () => {
    if (!artists || artists.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Artists
        </div>
        <div className="flex flex-col">
          {artists.map(artist => (
            <div 
              key={artist.id} 
              className="py-3 px-2 -mx-2 hover:bg-ink/5 cursor-pointer rounded transition-colors"
              onClick={() => navigate(`/artist/${artist.id}`)}
            >
              <div className="font-sans text-base text-ink">{artist.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAlbums = () => {
    if (!albums || albums.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Albums
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {albums.map(album => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </div>
    );
  };

  const renderSongs = () => {
    if (!songs || songs.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Songs
        </div>
        <div className="flex flex-col">
          {songs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} contextSongs={songs} />
          ))}
        </div>
      </div>
    );
  };

  const hasResults = artists.length > 0 || albums.length > 0 || songs.length > 0;

  return (
    <div className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="mb-12">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library..."
          className="w-full bg-transparent border-0 border-b border-ink/30 focus:border-ink/60 outline-none font-sans text-2xl py-2 text-ink placeholder:text-ink-mute/50 transition-colors"
          autoFocus
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center text-ink-mute animate-pulse">Searching...</div>
      ) : hasResults ? (
        <>
          {renderArtists()}
          {renderAlbums()}
          {renderSongs()}
        </>
      ) : query ? (
        <div className="text-center mt-20 font-serif italic text-ink-mute">
          No results found for "{query}".
        </div>
      ) : (
        <div className="text-center mt-20 font-serif italic text-ink-mute">
          Start typing to search your library
        </div>
      )}
    </div>
  );
};
