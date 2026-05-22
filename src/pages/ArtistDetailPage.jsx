/**
 * ArtistDetailPage.jsx
 * Displays artist details, top songs, and albums.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SongRow } from '../components/library/SongRow';
import { SkeletonCard } from '../components/shared/SkeletonCard';
import { useGSAPScrollReveal } from '../hooks/utils/useGSAPScrollReveal';
import { useRef } from 'react';

export const ArtistDetailPage = () => {
  const { id } = useParams();
  const client = useSubsonic();
  const { fetchArtist, isLoading } = useLibraryStore();
  const [artist, setArtist] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  
  useEffect(() => {
    if (!client || !id) return;
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await fetchArtist(client, id);
        if (isMounted) setArtist(data);
        
        if (data) {
           const similar = await client.getSimilarSongs2(id, 5);
           if (isMounted && similar?.similarSongs2?.song) {
             setTopSongs(similar.similarSongs2.song);
           }
        }
      } catch (e) {
        console.error('Failed to load artist', e);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [client, id, fetchArtist]);

  const containerRef = useRef(null);
  useGSAPScrollReveal(containerRef, {
    selector: '.reveal-item',
    dependencies: [artist, topSongs, isLoading]
  });

  return (
    <div ref={containerRef} className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      {isLoading && !artist ? (
        <div className="flex flex-col gap-12">
           <div className="h-12 w-1/3 bg-ink/5 animate-shimmer rounded mb-8" />
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
           </div>
        </div>
      ) : artist ? (
        <div className="flex flex-col gap-12">
          <h1 className="font-serif text-5xl italic text-ink">{artist.name}</h1>
          
          {topSongs.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2">
                Top Songs
              </div>
              <div className="flex flex-col">
                {topSongs.map((song, i) => (
                  <SongRow key={song.id} song={song} index={i} contextSongs={topSongs} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest border-b border-ink/10 pb-2">
              Albums
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {artist.album?.map(album => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-ink-mute">Artist not found.</div>
      )}
    </div>
  );
};
