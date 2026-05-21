# Graph Report - music-web  (2026-05-21)

## Corpus Check
- 87 files · ~40,608 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 421 nodes · 909 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b09452f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `useSubsonic()` - 45 edges
2. `SubsonicClient` - 35 edges
3. `useUIStore` - 29 edges
4. `useLibraryStore` - 21 edges
5. `useSettingsStore` - 20 edges
6. `AudioEngine` - 19 edges
7. `usePlayerStore` - 19 edges
8. `Subsonic` - 16 edges
9. `usePlayAction()` - 14 edges
10. `useAIShuffleStore` - 14 edges

## Surprising Connections (you probably didn't know these)
- `StatsPage()` --calls--> `dayjs`  [INFERRED]
  src/pages/StatsPage.jsx → package.json
- `cn()` --calls--> `clsx`  [INFERRED]
  src/components/ui/cn.js → package.json
- `RouteSync()` --calls--> `useUIStore`  [EXTRACTED]
  src/App.jsx → src/store/uiStore.js
- `AuthGuard()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/App.jsx → src/store/settingsStore.js

## Communities (24 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (26): useGSAPScrollReveal(), usePlayAction(), useSubsonic(), AlbumCard(), formatDuration(), SongRow(), dayjs, BLOB_CONFIGS (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (28): ENDPOINTS, AuthException, createSubsonicClient(), NetworkException, ServerException, SplashScreen(), TopBar(), authCookies (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (21): useLyrics(), usePlayer(), useServerHealth(), useShuffleQueue(), NowPlayingOverlay(), SettingsPage(), formatTime(), ProgressBar() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (39): dependencies, colorthief, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, fuse.js, gsap (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (18): AppShell(), fmtTime(), PlayerBar(), Sidebar(), SideRail(), formatDuration(), PlaylistDetailPage(), PlaylistsPage() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (8): FALLBACK_TRACK, GENRE_BPM_MAP, RecommendationService, calculateSongScore(), songWeight(), applyShuffleAlgorithm(), interleave(), weightedRandomSelect()

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (5): isValidUrl(), ShuffleApiService, ShuffleEmptyResponse, ShuffleNetworkError, ShuffleServerError

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (16): clsx, cn(), Disc(), FALLBACK_TRACK, fmt(), initialReducerState(), MusicPlayer(), normalizeTracks() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.26
Nodes (5): getCurrentLineIndex(), isLrcFormat(), parseLrc(), parsePlain(), LyricsService

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (3): ErrorBoundary, root, rootElement

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (4): computeStreak(), initialState, persistData, toDateKey()

### Community 15 - "Community 15"
Cohesion: 0.47
Nodes (3): PlaylistMusicPortfolio(), formatDuration(), PlaylistRow()

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (4): id, name, projectResources, resources

### Community 17 - "Community 17"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **67 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 3` to `Community 0`, `Community 9`, `Community 5`?**
  _High betweenness centrality (0.260) - this node is a cross-community bridge._
- **Why does `StatsPage()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `dayjs` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1273469387755102 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07781649245063879 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11707317073170732 - nodes in this community are weakly interconnected._