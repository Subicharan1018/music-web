import { useState, useEffect, useRef, useMemo } from 'react';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SongRow } from '../components/library/SongRow';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useGSAPScrollReveal } from '../hooks/utils/useGSAPScrollReveal';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const client = useSubsonic();
  const { search, searchResults, isLoading, albums: allAlbums, artists: allArtists } = useLibraryStore();
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Local instant search using Fuse.js
  const localResults = useMemo(() => {
    if (!query) return { albums: [], artists: [] };
    
    const albumFuse = new Fuse(allAlbums, { keys: ['name', 'title', 'artist'], threshold: 0.3 });
    const artistFuse = new Fuse(allArtists, { keys: ['name'], threshold: 0.3 });
    
    return {
      albums: albumFuse.search(query).map(r => r.item),
      artists: artistFuse.search(query).map(r => r.item)
    };
  }, [query, allAlbums, allArtists]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      if (client && query) {
        search(client, query);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [query, client, search]);

  // Combine local and remote results, removing duplicates by ID
  const displayArtists = useMemo(() => {
    const combined = [...localResults.artists, ...(searchResults.artists || [])];
    const unique = [];
    const seen = new Set();
    for (const a of combined) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        unique.push(a);
      }
    }
    return unique;
  }, [localResults.artists, searchResults.artists]);

  const displayAlbums = useMemo(() => {
    const combined = [...localResults.albums, ...(searchResults.albums || [])];
    const unique = [];
    const seen = new Set();
    for (const a of combined) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        unique.push(a);
      }
    }
    return unique;
  }, [localResults.albums, searchResults.albums]);

  const displaySongs = searchResults.songs || [];

  const containerRef = useRef(null);
  useGSAPScrollReveal(containerRef, {
    selector: '.reveal-item',
    dependencies: [displayArtists, displayAlbums, displaySongs, isLoading]
  });

  const renderArtists = () => {
    if (!displayArtists || displayArtists.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Artists
        </div>
        <div className="flex flex-col">
          {displayArtists.map(artist => (
            <div 
              key={artist.id} 
              className="reveal-item py-3 px-2 -mx-2 hover:bg-ink/5 cursor-pointer rounded transition-colors"
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
    if (!displayAlbums || displayAlbums.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Albums
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {displayAlbums.map(album => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </div>
    );
  };

  const renderSongs = () => {
    if (!displaySongs || displaySongs.length === 0) return null;
    return (
      <div className="mb-12">
        <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2 mb-4">
          Songs
        </div>
        <div className="flex flex-col">
          {displaySongs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} contextSongs={displaySongs} />
          ))}
        </div>
      </div>
    );
  };

  const hasResults = displayArtists.length > 0 || displayAlbums.length > 0 || displaySongs.length > 0;

  return (
    <div ref={containerRef} className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      <div className="mb-12">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library..."
          className="w-full bg-transparent border-0 border-b border-ink/30 focus:border-ink/60 outline-none font-sans text-2xl py-2 text-ink placeholder:text-ink-mute/50 transition-colors"
          data-search-input="true"
          autoFocus
        />
      </div>

      {isLoading && !hasResults ? (
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
