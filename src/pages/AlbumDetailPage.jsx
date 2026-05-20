/**
 * AlbumDetailPage.jsx
 * Displays album details, tracks, and manages playback.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayAction } from '../hooks/usePlayAction';
import { paletteService } from '../services/PaletteService';
import { SongRow } from '../components/library/SongRow';
import { SkeletonRow } from '../components/shared/SkeletonRow';
import { useGSAPScrollReveal } from '../hooks/useGSAPScrollReveal';
import { useRef } from 'react';

export const AlbumDetailPage = () => {
  const { id } = useParams();
  const client = useSubsonic();
  const { fetchAlbum, isLoading } = useLibraryStore();
  const { playAlbum } = usePlayAction();
  const [album, setAlbum] = useState(null);
  
  const coverUrl = client && id ? client.getCoverArtUrl(id, 600) : '';

  useEffect(() => {
    if (!client || !id) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await fetchAlbum(client, id);
        if (isMounted) setAlbum(data);
      } catch (e) {
        console.error('Failed to load album', e);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [client, id, fetchAlbum]);

  useEffect(() => {
    if (!coverUrl) return;
    let isMounted = true;

    const extractPalette = async () => {
      const palette = await paletteService.getPalette(coverUrl);
      if (isMounted && palette?.primary) {
        document.documentElement.style.setProperty('--accent', palette.primary);
      }
    };
    extractPalette();

    return () => {
      isMounted = false;
      document.documentElement.style.setProperty('--accent', '#ed6f5c');
    };
  }, [coverUrl]);

  const handlePlayAll = () => {
    if (album && album.song) {
      playAlbum(album, album.song, 0);
    }
  };

  const handleShuffle = () => {
    // Basic shuffle implementation, the store handles full features
    if (album && album.song) {
      const shuffled = [...album.song].sort(() => Math.random() - 0.5);
      playAlbum(album, shuffled, 0);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 min';
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  };

  const totalDuration = album?.song?.reduce((acc, s) => acc + s.duration, 0) || 0;

  const containerRef = useRef(null);
  useGSAPScrollReveal(containerRef, {
    selector: '.reveal-item',
    dependencies: [album, isLoading]
  });

  return (
    <div ref={containerRef} className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      {isLoading && !album ? (
        <div className="flex gap-12">
          <div className="w-60 h-60 shrink-0 bg-ink/5 animate-shimmer rounded-md" />
          <div className="flex-1 flex flex-col gap-4">
             <div className="h-8 w-1/3 bg-ink/5 animate-shimmer rounded" />
             <div className="h-4 w-1/4 bg-ink/5 animate-shimmer rounded" />
             <div className="mt-8 flex flex-col gap-2">
                {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
             </div>
          </div>
        </div>
      ) : album ? (
        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-60 shrink-0 flex flex-col gap-6">
            <div className="aspect-square rounded-md overflow-hidden bg-ink/5 shadow-md">
              <img src={coverUrl} alt={album.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-serif text-3xl text-ink leading-tight">{album.name}</h1>
              <div className="font-sans text-lg text-ink-mute">{album.artist}</div>
              <div className="font-mono text-xs text-ink-faint mt-2">
                {album.year ? `${album.year} · ` : ''}{album.songCount} songs, {formatDuration(totalDuration)}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={handlePlayAll}
                className="px-6 py-2 bg-[var(--accent)] text-paper font-sans font-medium text-sm rounded-full hover:brightness-110 transition-all shadow-sm cursor-pointer"
              >
                Play All
              </button>
              <button 
                onClick={handleShuffle}
                className="px-6 py-2 border border-ink/10 text-ink font-sans font-medium text-sm rounded-full hover:bg-ink/5 transition-colors cursor-pointer"
              >
                Shuffle
              </button>
            </div>
            
            <div className="flex flex-col">
              {album.song?.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} contextSongs={album.song} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-ink-mute">Album not found.</div>
      )}
    </div>
  );
};
