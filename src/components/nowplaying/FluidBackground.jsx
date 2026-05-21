/**
 * FluidBackground.jsx
 * CSS-only animated blob background driven by palette colors.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { paletteService } from '../../services/PaletteService';
import { useSubsonic } from '../../hooks/useSubsonic';

const FALLBACK_PALETTE = paletteService.fallback || {
  primary: '#2a2620',
  secondary: '#3a3327',
  muted: '#5a5448'
};

const BLOB_CONFIGS = [
  { size: 520, top: '-10%', left: '-5%', anim: 'blob-drift-a', duration: 20 },
  { size: 460, top: '10%', left: '55%', anim: 'blob-drift-b', duration: 27 },
  { size: 520, top: '45%', left: '10%', anim: 'blob-drift-c', duration: 33 },
  { size: 420, top: '60%', left: '60%', anim: 'blob-drift-d', duration: 41 },
  { size: 480, top: '-5%', left: '70%', anim: 'blob-drift-c', duration: 36 },
  { size: 440, top: '30%', left: '-8%', anim: 'blob-drift-b', duration: 29 }
];

export const FluidBackground = ({ song }) => {
  const client = useSubsonic();
  const [palette, setPalette] = useState(FALLBACK_PALETTE);
  const [prevPalette, setPrevPalette] = useState(null);
  const [fadeStage, setFadeStage] = useState('idle');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const transitionRef = useRef(null);

  const coverUrl = useMemo(() => {
    if (!client || !song?.coverArt) return '';
    return client.getCoverArtUrl(song.coverArt, 600);
  }, [client, song]);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 768px)');

    const updateMotion = () => setReduceMotion(!!motionQuery.matches);
    const updateMobile = () => setIsMobile(!!mobileQuery.matches);

    updateMotion();
    updateMobile();

    motionQuery.addEventListener?.('change', updateMotion);
    mobileQuery.addEventListener?.('change', updateMobile);

    return () => {
      motionQuery.removeEventListener?.('change', updateMotion);
      mobileQuery.removeEventListener?.('change', updateMobile);
    };
  }, []);

  useEffect(() => {
    if (!coverUrl) return;
    let isMounted = true;

    const loadPalette = async () => {
      const next = await paletteService.getPalette(coverUrl);
      if (!isMounted || !next) return;
      setPrevPalette(palette);
      setPalette(next);
      setFadeStage('start');
      requestAnimationFrame(() => setFadeStage('fade'));
      if (transitionRef.current) clearTimeout(transitionRef.current);
      transitionRef.current = setTimeout(() => {
        setFadeStage('idle');
        setPrevPalette(null);
      }, 800);
    };

    loadPalette();
    return () => {
      isMounted = false;
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, [coverUrl]);

  const blobCount = isMobile ? 4 : 6;
  const activeConfigs = BLOB_CONFIGS.slice(0, blobCount);

  const buildBlobs = (colors, isVisible) => (
    <div className={`absolute inset-0 transition-opacity duration-[800ms] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {activeConfigs.map((config, index) => {
        const colorSet = [colors.primary, colors.secondary, colors.muted];
        const color = colorSet[index % colorSet.length];
        const animation = reduceMotion
          ? 'none'
          : `${config.anim} ${config.duration}s ease-in-out infinite alternate`;

        return (
          <div
            key={`${config.anim}-${index}`}
            className="absolute rounded-full blur-[120px]"
            style={{
              width: `${config.size}px`,
              height: `${config.size}px`,
              top: config.top,
              left: config.left,
              backgroundColor: color,
              opacity: 0.65,
              animation,
              willChange: reduceMotion ? undefined : 'transform'
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {prevPalette ? buildBlobs(prevPalette, fadeStage !== 'fade') : null}
      {buildBlobs(palette, fadeStage === 'fade' || !prevPalette)}
      {/* Darkened to bg-ink/50 for text legibility on lighter palettes */}
      <div className="absolute inset-0 bg-ink/50" />
      {/* Bottom gradient ensures controls remain readable on any palette */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-ink/30 to-transparent pointer-events-none" />
    </div>
  );
};
