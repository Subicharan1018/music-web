import { useEffect } from 'react';
import { gsap } from '../lib/gsap';

/**
 * Hook to apply GSAP ScrollTrigger reveal animations to elements.
 * 
 * @param {React.RefObject} containerRef - Ref to the container holding the elements to animate.
 * @param {Object} options - Configuration options.
 * @param {string} options.selector - CSS selector for elements to animate within the container (e.g., '.reveal-item').
 * @param {string} [options.scroller] - CSS selector for the scrolling container. Defaults to window.
 * @param {any[]} [options.dependencies] - React dependencies that should trigger a refresh of the animations.
 */
export const useGSAPScrollReveal = (containerRef, { selector = '.reveal-item', scroller, dependencies = [] }) => {
  useEffect(() => {
    if (!containerRef.current) return;

    let ctx = gsap.context(() => {
      const elements = gsap.utils.toArray(selector, containerRef.current);
      
      elements.forEach((el, index) => {
        gsap.fromTo(el, 
          { 
            y: 30, 
            opacity: 0 
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              scroller: scroller || containerRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, selector, scroller, ...dependencies]);
};
