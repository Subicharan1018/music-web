import React, { useState, useEffect, useRef } from 'react';

/**
 * PlaylistBackground.jsx
 * Fixed-position blurred album art background rendered inside AppShell.
 * All layers carry .playlist-bg-fixed so the CSS rule
 * `.app-shell > *:not(.playlist-bg-fixed)` won't apply `position: relative`
 * and accidentally override our `position: fixed`.
 */
export function PlaylistBackground({ url }) {
  const [displayUrl, setDisplayUrl] = useState(url);
  const [prevUrl, setPrevUrl] = useState(null);
  const [prevVisible, setPrevVisible] = useState(false);  // fade-out trigger for outgoing
  const [currentVisible, setCurrentVisible] = useState(!!url); // fade-in trigger for incoming
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const currentRef = useRef(url);

  // Sync on initial url (mount) so the layer fades in correctly
  useEffect(() => {
    if (url && url !== currentRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const outgoing = currentRef.current;
      currentRef.current = url;

      // Snapshot outgoing before changing state
      setPrevUrl(outgoing || null);
      setPrevVisible(true);   // outgoing starts visible
      setCurrentVisible(false); // incoming starts invisible

      setDisplayUrl(url);

      // Double-rAF to let the browser paint prevUrl first, then trigger both transitions
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setCurrentVisible(true);  // incoming fades in
          setPrevVisible(false);    // outgoing fades out
        });
      });

      timerRef.current = setTimeout(() => {
        setPrevUrl(null);
      }, 900);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseStyle = {
    position: 'fixed',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(70px) saturate(1.4)',
    transform: 'scale(1.15)',
    pointerEvents: 'none',
    willChange: 'opacity',
    zIndex: 0,
  };

  return (
    <>
      {/* Outgoing layer — fades out when prev image is replaced */}
      {prevUrl && (
        <div
          aria-hidden="true"
          className="playlist-bg-fixed"
          style={{
            ...baseStyle,
            backgroundImage: `url(${prevUrl})`,
            opacity: prevVisible ? 0.45 : 0,
            transition: 'opacity 0.75s ease',
          }}
        />
      )}

      {/* Incoming / current layer */}
      <div
        aria-hidden="true"
        className="playlist-bg-fixed"
        style={{
          ...baseStyle,
          backgroundImage: displayUrl ? `url(${displayUrl})` : 'none',
          opacity: currentVisible ? 0.45 : 0,
          transition: 'opacity 0.75s ease',
        }}
      />

      {/* Dark readability overlay */}
      <div
        aria-hidden="true"
        className="playlist-bg-fixed playlist-bg-layer"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(160deg, rgba(5,5,8,0.55) 0%, rgba(5,5,8,0.35) 40%, rgba(5,5,8,0.70) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
