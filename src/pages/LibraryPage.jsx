/**
 * LibraryPage.jsx
 * Displays library sections: Recommended For You, Recently Added, Frequently Played, All Albums.
 * Phase 6: Recommendations section added above, loaded after initial paint.
 */
import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useSubsonic } from '../hooks/useSubsonic';
import { useLibraryStore } from '../store/libraryStore';
import { useAffinityStore } from '../store/affinityStore';
import { AlbumCard } from '../components/library/AlbumCard';
import { SkeletonCard } from '../components/shared/SkeletonCard';
import { useGSAPScrollReveal } from '../hooks/utils/useGSAPScrollReveal';
import { RecommendationsWidget } from '../components/stats/RecommendationsWidget';
import { recommendationService } from '../services/RecommendationService';

const MIN_PLAYS_FOR_RECS = 5;

export const LibraryPage = () => {
  const client = useSubsonic();
  const { 
    albums, recentAlbums, frequentAlbums, 
    isLoading, albumsHasMore, fetchAlbums 
  } = useLibraryStore();

  // Affinity state — read before any returns
  const recentPlays    = useAffinityStore((s) => s.recentPlays);
  const affinityState  = useAffinityStore.getState;

  const [recommendations, setRecommendations] = useState([]);
  const containerRef = useRef(null);
  const observerRef = useRef();
  const recServiceRef = useRef(recommendationService);

  const hasEnoughPlays = recentPlays.length >= MIN_PLAYS_FOR_RECS;

  // Hook always called — before any returns — consistent order
  useGSAPScrollReveal(containerRef, {
    selector: '.reveal-item',
    dependencies: [albums, recentAlbums, frequentAlbums, isLoading, recommendations],
  });

  useEffect(() => {
    if (!client) return;
    const loadData = async () => {
      if (recentAlbums.length === 0) await fetchAlbums(client, 'newest', true);
      if (frequentAlbums.length === 0) await fetchAlbums(client, 'frequent', true);
      if (albums.length === 0) await fetchAlbums(client, 'alphabeticalByName', true);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  // Load recommendations after initial paint — never blocks render
  useEffect(() => {
    if (!hasEnoughPlays || albums.length === 0) return;

    const timer = setTimeout(() => {
      const snapshot = affinityState();
      const recs = recServiceRef.current.recommend(albums, snapshot, {
        limit: 20,
        excludeRecent: true,
      });
      setRecommendations(recs);
    }, 300); // slight defer so album grid renders first

    return () => clearTimeout(timer);
  }, [hasEnoughPlays, albums, affinityState]);

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

  const affinitySnapshot = useMemo(() => affinityState(), [affinityState, recentPlays.length]);

  const renderSection = (title, items, isHorizontal = false) => {
    return (
      <div className="flex flex-col gap-4 mb-12 reveal-item">
        <div className="flex justify-between items-end border-b border-white/10 pb-3 mb-2 relative">
          <div className="absolute bottom-[-1px] left-0 w-24 h-[1px] bg-gradient-to-r from-coral to-transparent" />
          <div className="font-sans text-[13px] font-bold text-white uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {title}
          </div>
        </div>
        
        {items.length === 0 && !isLoading ? (
          <div className="py-8 font-serif italic text-ink-mute">
            No albums found.
          </div>
        ) : isHorizontal ? (
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
    <div ref={containerRef} className="p-8 pb-32 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar">
      
      {/* Nº 00 · RECOMMENDED FOR YOU — only after 5+ plays */}
      {hasEnoughPlays && recommendations.length > 0 && (
        <div className="mb-12 reveal-item">
          <div className="flex justify-between items-end border-b border-white/10 pb-3 mb-6 relative">
            <div className="absolute bottom-[-1px] left-0 w-32 h-[1px] bg-gradient-to-r from-coral to-transparent shadow-[0_0_8px_rgba(220,20,60,0.8)]" />
            <div className="font-sans text-[13px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-coral to-mustard uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(220,20,60,0.4)]">
              Nº 00 · Recommended For You
            </div>
          </div>
          <RecommendationsWidget
            recommendations={recommendations}
            affinitySnapshot={affinitySnapshot}
            allSongs={albums}
          />
        </div>
      )}

      {renderSection('Nº 01 · Recently Added', recentAlbums, true)}
      {renderSection('Nº 02 · Frequently Played', frequentAlbums, true)}
      {renderSection('Nº 03 · All Albums', albums, false)}
    </div>
  );
};
