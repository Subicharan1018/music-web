/**
 * RecommendationsWidget.jsx
 * Horizontal scroll row of recommended song cards.
 * Appears on LibraryPage after 5+ recorded plays.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { usePlayAction } from '../../hooks/usePlayAction';
import { useSubsonic } from '../../hooks/useSubsonic';
import { recommendationService } from '../../services/RecommendationService';
import gsap from 'gsap';

export const RecommendationsWidget = ({ recommendations: initialRecs, affinitySnapshot, allSongs }) => {
  const { playSong } = usePlayAction();
  const client = useSubsonic();
  const [recs, setRecs] = useState(initialRecs || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rowRef = useRef(null);

  useEffect(() => {
    setRecs(initialRecs || []);
  }, [initialRecs]);

  // GSAP entrance for cards
  useEffect(() => {
    if (!rowRef.current || recs.length === 0) return;
    const cards = rowRef.current.querySelectorAll('.rec-card');
    gsap.fromTo(cards,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' }
    );
  }, [recs]);

  const handleRefresh = async () => {
    if (!allSongs || !affinitySnapshot || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const fresh = recommendationService.recommend(allSongs, affinitySnapshot, {
        limit: 20,
        excludeRecent: true,
      });
      // Optionally enrich with similar songs (async post-process)
      const enriched = await recommendationService.enrichWithSimilar(fresh, client, 3);
      setRecs(enriched);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (recs.length === 0) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-ink-faint">
          {recs.length} songs
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 font-sans text-xs text-ink-mute hover:text-coral transition-colors disabled:opacity-40"
          title="Refresh recommendations"
        >
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div
        ref={rowRef}
        className="flex overflow-x-auto gap-4 pb-3 no-scrollbar -mx-8 px-8 snap-x"
      >
        {recs.map((song) => (
          <RecommendationCard
            key={song.id}
            song={song}
            affinitySnapshot={affinitySnapshot}
            onPlay={() => playSong(song, recs)}
          />
        ))}
      </div>
    </div>
  );
};

const RecommendationCard = ({ song, affinitySnapshot, onPlay }) => {
  const cardRef = useRef(null);
  const overlayRef = useRef(null);
  const client = useSubsonic();

  const coverUrl = client?.getCoverArtUrl?.(song.coverArt, 200) || '';
  const artistAff = affinitySnapshot?.artists?.[song.artistId || song.artist];
  const songProfile = affinitySnapshot?.songs?.[song.id];

  const whyText = [
    artistAff?.playCount > 0 && `${artistAff.playCount} artist plays`,
    songProfile?.playCount > 0 && `${songProfile.playCount} song plays`,
    song.genre && `Genre: ${song.genre}`,
  ].filter(Boolean).join(' · ') || 'Scored by time & taste';

  const handleMouseEnter = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { autoAlpha: 1, duration: 0.18, ease: 'power2.out' });
    }
  };
  const handleMouseLeave = () => {
    if (overlayRef.current) {
      gsap.to(overlayRef.current, { autoAlpha: 0, duration: 0.18, ease: 'power2.in' });
    }
  };

  return (
    <div
      ref={cardRef}
      className="rec-card w-36 shrink-0 snap-start cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onPlay}
      title={whyText}
    >
      {/* Cover art */}
      <div className="relative w-36 h-36 rounded-md overflow-hidden bg-paper-warm mb-2.5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={song.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-ink/5">
            <span className="font-serif text-3xl text-ink-faint italic">♪</span>
          </div>
        )}
        {/* Play overlay */}
        <div
          ref={overlayRef}
          style={{ opacity: 0, visibility: 'hidden' }}
          className="absolute inset-0 bg-ink/50 flex items-center justify-center"
        >
          <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center">
            <Play size={16} fill="currentColor" className="text-ink ml-0.5" />
          </div>
        </div>
      </div>

      {/* Text */}
      <p className="font-serif text-sm italic text-ink truncate">{song.title}</p>
      <p className="font-sans text-xs text-ink-mute truncate mt-0.5">{song.artist}</p>
      {/* Why this? */}
      <p className="font-mono text-[9px] text-ink-faint truncate mt-1">{whyText}</p>
    </div>
  );
};
