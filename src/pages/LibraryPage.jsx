/**
 * LibraryPage.jsx
 * Displays library sections: Recently Added, Frequently Played, and All Albums.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SkeletonCard } from '../components/shared/SkeletonCard';

export const LibraryPage = () => {
  const client = useSubsonic();
  const { 
    albums, recentAlbums, frequentAlbums, 
    isLoading, albumsHasMore, fetchAlbums 
  } = useLibraryStore();
  
  const observerRef = useRef();

  useEffect(() => {
    if (!client) return;
    if (recentAlbums.length === 0 && !isLoading) fetchAlbums(client, 'newest', true);
    if (frequentAlbums.length === 0 && !isLoading) fetchAlbums(client, 'frequent', true);
    if (albums.length === 0 && !isLoading) fetchAlbums(client, 'alphabeticalByName', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const lastElementRef = useCallback(node => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && albumsHasMore) {
        fetchAlbums(client, 'alphabeticalByName', false);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, albumsHasMore, client, fetchAlbums]);

  const renderSection = (title, items, isHorizontal = false) => {
    if (items.length === 0 && !isLoading) return null;
    
    return (
      <div className="flex flex-col gap-4 mb-12">
        <div className="flex justify-between items-end border-b border-ink/10 pb-2">
          <div className="font-sans text-[13px] font-medium text-ink-mute uppercase tracking-widest">
            {title}
          </div>
        </div>
        
        {isHorizontal ? (
          <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar -mx-8 px-8 snap-x">
            {isLoading && items.length === 0 ? (
              [1,2,3,4,5].map(i => <div key={i} className="w-40 shrink-0 snap-start"><SkeletonCard /></div>)
            ) : (
              items.map(album => (
                <div key={album.id} className="w-40 shrink-0 snap-start">
                  <AlbumCard album={album} />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((album, i) => {
              if (items.length === i + 1) {
                return <div key={album.id} ref={lastElementRef}><AlbumCard album={album} /></div>
              }
              return <AlbumCard key={album.id} album={album} />
            })}
            {isLoading && [1,2,3,4,5,6].map(i => <SkeletonCard key={`sk-${i}`} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      {renderSection('Nº 01 · Recently Added', recentAlbums, true)}
      {renderSection('Nº 02 · Frequently Played', frequentAlbums, true)}
      {renderSection('Nº 03 · All Albums', albums, false)}
    </div>
  );
};
