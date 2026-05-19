# Graph Report - .  (2026-05-19)

## Corpus Check
- Corpus is ~18,891 words - fits in a single context window. You may not need a graph.

## Summary
- 222 nodes · 425 edges · 28 communities (10 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell & UI Layout|App Shell & UI Layout]]
- [[_COMMUNITY_Page Components & Navigation|Page Components & Navigation]]
- [[_COMMUNITY_API Authentication & Exceptions|API Authentication & Exceptions]]
- [[_COMMUNITY_Subsonic Data Fetching|Subsonic Data Fetching]]
- [[_COMMUNITY_Music Player Widget|Music Player Widget]]
- [[_COMMUNITY_Audio Playback Engine|Audio Playback Engine]]
- [[_COMMUNITY_Subsonic Reference Class|Subsonic Reference Class]]
- [[_COMMUNITY_Scrobbling & Listening Stats|Scrobbling & Listening Stats]]
- [[_COMMUNITY_Application Runtime & Errors|Application Runtime & Errors]]
- [[_COMMUNITY_Song Scoring & Shuffle Logic|Song Scoring & Shuffle Logic]]
- [[_COMMUNITY_Audio ReplayGain Service|Audio ReplayGain Service]]
- [[_COMMUNITY_BPM Estimation Service|BPM Estimation Service]]
- [[_COMMUNITY_React Compiler Docs|React Compiler Docs]]
- [[_COMMUNITY_Color Palette Service|Color Palette Service]]
- [[_COMMUNITY_App Icons|App Icons]]
- [[_COMMUNITY_Bluesky Integration|Bluesky Integration]]
- [[_COMMUNITY_Discord Integration|Discord Integration]]
- [[_COMMUNITY_Documentation|Documentation]]
- [[_COMMUNITY_GitHub Integration|GitHub Integration]]
- [[_COMMUNITY_Social Media|Social Media]]
- [[_COMMUNITY_X (Twitter) Integration|X (Twitter) Integration]]
- [[_COMMUNITY_Hero Graphics|Hero Graphics]]
- [[_COMMUNITY_React Branding|React Branding]]
- [[_COMMUNITY_Vite Branding|Vite Branding]]

## God Nodes (most connected - your core abstractions)
1. `useSubsonic()` - 22 edges
2. `SubsonicClient` - 19 edges
3. `AudioEngine` - 18 edges
4. `Subsonic` - 16 edges
5. `usePlayerStore` - 15 edges
6. `useSettingsStore` - 14 edges
7. `useLibraryStore` - 13 edges
8. `useUIStore` - 11 edges
9. `ScrobbleService` - 10 edges
10. `SongRow()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `RouteSync()` --calls--> `useUIStore`  [EXTRACTED]
  src/App.jsx → src/store/uiStore.js
- `AuthGuard()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js
- `AppShell()` --calls--> `useSubsonic()`  [EXTRACTED]
  src/components/layout/AppShell.jsx → src/hooks/useSubsonic.js
- `PlayerBar()` --calls--> `useSubsonic()`  [EXTRACTED]
  src/components/layout/PlayerBar.jsx → src/hooks/useSubsonic.js

## Communities (28 total, 18 thin omitted)

### Community 0 - "App Shell & UI Layout"
Cohesion: 0.09
Nodes (19): usePlayer(), AppShell(), PlayerBar(), Sidebar(), SideRail(), formatTime(), ProgressBar(), VolumeSlider() (+11 more)

### Community 1 - "Page Components & Navigation"
Cohesion: 0.2
Nodes (14): usePlayAction(), useSubsonic(), AlbumCard(), formatDuration(), SongRow(), AlbumDetailPage(), ArtistDetailPage(), ArtistsPage() (+6 more)

### Community 2 - "API Authentication & Exceptions"
Cohesion: 0.16
Nodes (12): ENDPOINTS, AuthException, createSubsonicClient(), NetworkException, ServerException, TopBar(), LoginPage(), SettingsPage() (+4 more)

### Community 4 - "Music Player Widget"
Cohesion: 0.16
Nodes (15): cn(), Disc(), FALLBACK_TRACK, fmt(), initialReducerState(), MusicPlayer(), normalizeTracks(), ProgressBar() (+7 more)

### Community 8 - "Application Runtime & Errors"
Cohesion: 0.25
Nodes (3): ErrorBoundary, root, rootElement

### Community 9 - "Song Scoring & Shuffle Logic"
Cohesion: 0.36
Nodes (5): calculateSongScore(), songWeight(), applyShuffleAlgorithm(), interleave(), weightedRandomSelect()

## Knowledge Gaps
- **20 isolated node(s):** `rootElement`, `root`, `FALLBACK_TRACK`, `GENRE_BPM_MAP`, `initialState` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SubsonicClient` connect `Subsonic Data Fetching` to `API Authentication & Exceptions`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `Audio Playback Engine` to `Audio ReplayGain Service`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `ScrobbleService` connect `Scrobbling & Listening Stats` to `App Shell & UI Layout`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `rootElement`, `root`, `FALLBACK_TRACK` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & UI Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._