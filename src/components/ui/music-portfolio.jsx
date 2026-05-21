import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

// Register GSAP plugin
gsap.registerPlugin(ScrambleTextPlugin);

// Time Display Component
const TimeDisplay = ({CONFIG={}}) => {
  const [time, setTime] = useState({ hours: '', minutes: '', dayPeriod: '' });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: CONFIG.timeZone,
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(now);
      
      setTime({
        hours: parts.find(part => part.type === "hour")?.value || '',
        minutes: parts.find(part => part.type === "minute")?.value || '',
        dayPeriod: parts.find(part => part.type === "dayPeriod")?.value || ''
      });
    };

    updateTime();
    const interval = setInterval(updateTime, CONFIG.timeUpdateInterval);
    return () => clearInterval(interval);
  }, [CONFIG]);

  return (
    <time className="corner-item bottom-right font-mono" id="current-time">
      {time.hours}<span className="time-blink">:</span>{time.minutes} {time.dayPeriod}
    </time>
  );
};

// Project Item Component
const ProjectItem = ({ project, index, onMouseEnter, onMouseLeave, isActive, isIdle }) => {
  const itemRef = useRef(null);
  const textRefs = {
    artist: useRef(null),
    album: useRef(null),
    category: useRef(null),
    label: useRef(null),
    year: useRef(null),
  };

  useEffect(() => {
    if (isActive) {
      // Animate text scramble on hover
      Object.entries(textRefs).forEach(([key, ref]) => {
        if (ref.current && project[key]) {
          gsap.killTweensOf(ref.current);
          gsap.to(ref.current, {
            duration: 0.8,
            scrambleText: {
              text: project[key].toString(),
              chars: "qwerty1337h@ck3r",
              revealDelay: 0.3,
              speed: 0.4
            }
          });
        }
      });
    } else {
      // Reset text
      Object.entries(textRefs).forEach(([key, ref]) => {
        if (ref.current && project[key]) {
          gsap.killTweensOf(ref.current);
          ref.current.textContent = project[key].toString();
        }
      });
    }
  }, [isActive, project]);

  return (
    <li 
      ref={itemRef}
      className={`project-item ${isActive ? 'opacity-100' : 'opacity-60'} ${isIdle ? 'idle' : ''} flex justify-between py-4 cursor-pointer transition-opacity duration-300 hover:opacity-100 border-b border-ink/10 text-paper font-sans uppercase`}
      onMouseEnter={() => onMouseEnter(index, project.image)}
      onMouseLeave={onMouseLeave}
      data-image={project.image}
    >
      <span ref={textRefs.artist} className="w-1/4 project-data artist hover-text">
        {project.artist}
      </span>
      <span ref={textRefs.album} className="w-1/4 project-data album hover-text text-center">
        {project.album}
      </span>
      <span ref={textRefs.category} className="w-[15%] project-data category hover-text text-center hidden md:inline-block">
        {project.category}
      </span>
      <span ref={textRefs.label} className="w-[15%] project-data label hover-text text-center hidden lg:inline-block">
        {project.label}
      </span>
      <span ref={textRefs.year} className="w-[10%] project-data year hover-text text-right">
        {project.year}
      </span>
    </li>
  );
};

// Main Portfolio Component
const MusicPortfolio = ({PROJECTS_DATA=[], LOCATION={}, CALLBACKS={}, CONFIG={}, SOCIAL_LINKS={}}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isIdle, setIsIdle] = useState(true);
  
  const backgroundRef = useRef(null);
  const containerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const idleAnimationRef = useRef(null);
  const debounceRef = useRef(null);
  const projectItemsRef = useRef([]);

  // Preload images
  useEffect(() => {
    PROJECTS_DATA.forEach(project => {
      if (project.image) {
        const img = new Image();
        img.src = project.image;
      }
    });
  }, [PROJECTS_DATA]);

  // Start idle animation
  const startIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) return;
    
    const timeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 2
    });
    
    projectItemsRef.current.forEach((item, index) => {
      if (!item) return;
      
      const hideTime = 0 + index * 0.05;
      const showTime = 0 + (PROJECTS_DATA.length * 0.05 * 0.5) + index * 0.05;
      
      timeline.to(item, {
        opacity: 0.2,
        duration: 0.2,
        ease: "power2.inOut"
      }, hideTime);
      
      timeline.to(item, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.inOut"
      }, showTime);
    });
    
    idleAnimationRef.current = timeline;
  }, [PROJECTS_DATA.length]);

  // Stop idle animation
  const stopIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) {
      idleAnimationRef.current.kill();
      idleAnimationRef.current = null;
      
      projectItemsRef.current.forEach(item => {
        if (item) {
          gsap.set(item, { opacity: 1 });
        }
      });
    }
  }, []);

  // Start idle timer
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    idleTimerRef.current = setTimeout(() => {
      if (activeIndex === -1) {
        setIsIdle(true);
        startIdleAnimation();
      }
    }, CONFIG.idleDelay || 4000);
  }, [activeIndex, startIdleAnimation, CONFIG.idleDelay]);

  // Stop idle timer
  const stopIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Handle mouse enter on project
  const handleProjectMouseEnter = useCallback((index, imageUrl) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    stopIdleAnimation();
    stopIdleTimer();
    setIsIdle(false);
    
    if (activeIndex === index) return;
    
    setActiveIndex(index);
    
    if (imageUrl && backgroundRef.current) {
      // Show background with animation
      const bg = backgroundRef.current;
      bg.style.transition = "none";
      bg.style.transform = "translate(-50%, -50%) scale(1.2)";
      bg.style.backgroundImage = `url(${imageUrl})`;
      bg.style.backgroundSize = "cover";
      bg.style.backgroundPosition = "center";
      bg.style.opacity = "0.4"; // Semi-transparent for overlay effect
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bg.style.transition = "opacity 0.6s ease, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          bg.style.transform = "translate(-50%, -50%) scale(1.0)";
        });
      });
    }
  }, [activeIndex, stopIdleAnimation, stopIdleTimer]);

  // Handle mouse leave on project
  const handleProjectMouseLeave = useCallback(() => {
    debounceRef.current = setTimeout(() => {
      // Text reset handled in ProjectItem component
    }, 50);
  }, []);

  // Handle container mouse leave
  const handleContainerMouseLeave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    setActiveIndex(-1);
    
    if (backgroundRef.current) {
      backgroundRef.current.style.opacity = "0";
    }
    
    startIdleTimer();
  }, [startIdleTimer]);

  // Initial idle animation
  useEffect(() => {
    startIdleTimer();
    return () => {
      stopIdleTimer();
      stopIdleAnimation();
    };
  }, [startIdleTimer, stopIdleTimer, stopIdleAnimation]);

  return (
    <div className="relative w-full min-h-[60vh] bg-ink rounded-lg overflow-hidden flex flex-col font-mono text-xs sm:text-sm">
      <main 
        ref={containerRef}
        className={`portfolio-container w-full h-full flex-1 z-10 px-8 py-16 ${activeIndex !== -1 ? 'has-active' : ''}`}
        onMouseLeave={handleContainerMouseLeave}
      >
        <h1 className="sr-only">Music Portfolio</h1>
        <ul className="project-list w-full max-w-5xl mx-auto" role="list">
          {/* Header row */}
          <li className="flex justify-between pb-2 border-b border-ink/30 text-paper/50 text-xs tracking-widest mb-4">
            <span className="w-1/4">ARTIST</span>
            <span className="w-1/4 text-center">ALBUM/TITLE</span>
            <span className="w-[15%] text-center hidden md:inline-block">GENRE</span>
            <span className="w-[15%] text-center hidden lg:inline-block">DURATION</span>
            <span className="w-[10%] text-right">YEAR</span>
          </li>
          
          {PROJECTS_DATA.map((project, index) => (
            <ProjectItem
              key={project.id || index}
              project={project}
              index={index}
              onMouseEnter={handleProjectMouseEnter}
              onMouseLeave={handleProjectMouseLeave}
              isActive={activeIndex === index}
              isIdle={isIdle}
              ref={el => projectItemsRef.current[index] = el}
            />
          ))}
        </ul>
      </main>

      <div 
        ref={backgroundRef}
        className="absolute top-1/2 left-1/2 w-[120%] h-[120%] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 z-0 mix-blend-overlay" 
        id="backgroundImage" 
        role="img" 
        aria-hidden="true"
      />

      <aside className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6">
        <div className="flex justify-between w-full">
          <div className="corner-square w-3 h-3 border border-paper/50" aria-hidden="true"></div>
          <nav className="text-paper/50 pointer-events-auto">
            {SOCIAL_LINKS.spotify && <><a href={SOCIAL_LINKS.spotify} className="hover:text-paper">Spotify</a> | </>}
            {SOCIAL_LINKS.email && <><a href={SOCIAL_LINKS.email} className="hover:text-paper">Email</a> | </>}
            {SOCIAL_LINKS.x && <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener" className="hover:text-paper">X</a>}
          </nav>
        </div>
        <div className="flex justify-between w-full text-paper/50">
          <div className="corner-item bottom-left">
            {LOCATION.display ? `${LOCATION.latitude}, ${LOCATION.longitude}` : ''}
          </div>
          <TimeDisplay CONFIG={CONFIG} />
        </div>
      </aside>
    </div>
  );
};

export default MusicPortfolio;
