# Phase 3 Implementation Plan

**1. Setup & Dependencies**
- [x] 1. Install `color-thief-browser` via npm for cover art palette extraction.
- [x] 2. Add the `animate-shimmer` keyframes and base utility classes to `src/index.css` for the loading skeletons.

**2. Subsonic API Expansion (`src/api/subsonic.js`)**
- [x] 3. Add `getArtist(id)` and `getAlbum(id)` methods.
- [x] 4. Update `getAlbumList2(type, size, offset)` to pass the `offset` parameter for pagination.
- [x] 5. Add `getSong(id)` and `getSimilarSongs2(id, count)` methods.
- [x] 6. Add `search3(query, { artistCount, albumCount, songCount })` for searching.
- [x] 7. Add `star(id, type)` and `unstar(id, type)` methods.
- [x] 8. Add `getRandomSongs(size, options)` as a fallback for the shuffle engine.

**3. Library Store Completion (`src/store/libraryStore.js`)**
- [x] 9. Expand the store state to include `albums`, `artists`, `recentAlbums`, `frequentAlbums`, `starredAlbums`, and `searchResults`.
- [x] 10. Add pagination state (`albumsPage`, `albumsHasMore`) and loading/error states.
- [x] 11. Implement `albumCache` and `artistCache`. **Constraint:** These must be in-memory only (do NOT persist to `localStorage`).
- [x] 12. Enforce cache eviction rules: `albumCache` max 200 entries, `artistCache` max 100 entries. Evict the oldest entries when the cap is reached, and enforce a 5-minute TTL per entry.
- [x] 13. Implement actions: `fetchArtists`, `fetchAlbum`, `fetchArtist`, `search`, and `invalidate`.
- [x] 14. Implement `fetchAlbums(client, type, reset)`. When `reset` is true, clear existing `albums`; otherwise, perform a pagination-aware accumulation appending to `albums`.

**4. Palette Service (`src/services/PaletteService.js`)**
- [x] 15. Create the `PaletteService` class using a `Map` to implement a strict LRU cache (max 50 entries).
- [x] 16. Implement `getPalette(coverArtUrl)`. **Constraint:** Create a hidden `<img>` with `crossOrigin="anonymous"` and ensure extraction only happens inside the `onload` callback.
- [x] 17. Configure fallback colors (Atelier Zero default coral `#ed6f5c` / mustard `#e9b94a` / olive `#6e7448`) for extraction failures.
- [x] 18. Export a singleton instance: `export const paletteService = new PaletteService()`.

**5. Play Action Hook (`src/hooks/usePlayAction.js`)**
- [x] 19. Create the `usePlayAction` hook exporting `playSong`, `playAlbum`, and `playArtist`.
- [x] 20. Wire the hook to correctly slice/format the context array and call `playerStore.setQueue()` followed by `playerStore.play(song)`.
- [x] 21. **Constraint:** `usePlayAction` MUST be the ONLY place in the entire app that calls `playerStore.setQueue`.

**6. Shared Components (`src/components/library/` & `src/components/shared/`)**
- [x] 22. Build `SkeletonCard.jsx` and `SkeletonRow.jsx` utilizing the new CSS shimmer animation.
- [x] 23. Build `AlbumCard.jsx` with a hover lift animation.
- [x] 24. In `AlbumCard.jsx`, use `paletteService` on cover load to extract the palette and set a local `--card-accent` CSS variable specifically for the hover state, separate from the global `--accent`.
- [x] 25. Implement the context menu on `AlbumCard.jsx` with four exact options: "Play", "Add to Queue", "Go to Artist", "Add to Playlist".
- [x] 26. Build `SongRow.jsx` with track number/playing animation (animated `▮▮`), duration, double-click AND Enter key to play.
- [x] 27. Wire the star icon in `SongRow.jsx` to the Subsonic `star`/`unstar` API methods (filled coral if starred, outline if not).

**7. Pages Implementation (`src/pages/`)**
- [x] 28. **`LibraryPage.jsx`**: Implement "Recently Added", "Frequently Played", and "All Albums" horizontal and grid sections. **Constraint:** Use `IntersectionObserver` for infinite scroll, and ALWAYS check `isLoading` before triggering a fetch to prevent duplicate requests.
- [x] 29. **`AlbumDetailPage.jsx`**: Build the 2-column layout (Left: large 240x240 cover art, title `font-serif text-3xl`, artist, year, song count, total duration; Right: song list table).
- [x] 30. In `AlbumDetailPage.jsx` table, include columns: `#` · Title · Artist · Duration · Actions. Add "Play All" (primary) and "Shuffle" (ghost) buttons at the top.
- [x] 31. **Global Accent Wiring**: In `AlbumDetailPage.jsx` (and `PlayerBar`), on mount/focus, call `paletteService` and `document.documentElement.style.setProperty('--accent', primary)`. Ensure cleanup resets it to `#ed6f5c` on unmount.
- [x] 32. **`ArtistDetailPage.jsx`**: Implement the editorial header (`font-serif text-5xl italic`), album grid. Add a "Top Songs" section *only* if `getSimilarSongs2` returns data.
- [x] 33. **`SearchPage.jsx`**: Implement a 300ms debounced search input. **Constraint:** Use editorial styling (underline only, `font-sans`, no border-radius, no box) and an empty state (`font-serif italic text-ink-mute` "Start typing to search your library"). Split results into Artist, Album, and Song sections.

**8. Routing & App Wiring (`src/App.jsx` & `src/components/layout/Sidebar.jsx`)**
- [x] 34. Register new routes in `App.jsx`: `/library`, `/album/:id`, `/artist/:id`, `/artists` (artist list view), and `/search`. (Fixed: Created ArtistsPage for /artists. Validated routing and NavLink paths. Confirmed BrowserRouter in main.jsx.)
- [x] 35. Wire `uiStore.activeView` sync by using a `useEffect` hook listening to React Router's `useLocation()` to update the `TopBar` contextually.
- [x] 36. Update `Sidebar.jsx` to use React Router `<NavLink>` for correct active routing states.

**9. Final Verification**
- [x] 37. Ensure the architecture comment block is present at the top of ALL new files (`PaletteService.js`, `usePlayAction.js`, `AlbumCard.jsx`, `SongRow.jsx`, `SkeletonCard.jsx`, `SkeletonRow.jsx`, `LibraryPage.jsx`, `AlbumDetailPage.jsx`, `ArtistDetailPage.jsx`, `SearchPage.jsx`).
- [x] 38. Verify that double-clicking or pressing Enter on a song populates the PlayerBar and plays audio.
- [x] 39. **Acceptance Criteria Verification:** Check that setting `--accent` visibly updates sidebar active states, the progress bar, and the shuffle button.
- [x] 40. **Acceptance Criteria Verification:** Render 500 album cards in `LibraryPage` and verify performance/no jank using React DevTools.
