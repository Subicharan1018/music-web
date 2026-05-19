# Graph Report - .  (2026-05-19)

## Corpus Check
- Corpus is ~22,634 words - fits in a single context window. You may not need a graph.

## Summary
- 250 nodes · 541 edges · 28 communities (11 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `useSubsonic()` - 32 edges
2. `SubsonicClient` - 24 edges
3. `useUIStore` - 23 edges
4. `AudioEngine` - 18 edges
5. `useLibraryStore` - 17 edges
6. `usePlayerStore` - 17 edges
7. `Subsonic` - 16 edges
8. `useSettingsStore` - 14 edges
9. `usePlaylistStore` - 13 edges
10. `SongRow()` - 11 edges

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

## Hyperedges (group relationships)
- **Application Bootstrap Pattern** — index_html, index_root, main_entry [INFERRED 0.95]

## Communities (28 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (17): AppShell(), Sidebar(), SideRail(), formatDuration(), PlaylistDetailPage(), PlaylistsPage(), VolumeSlider(), AddToPlaylistDialog() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.2
Nodes (15): usePlayAction(), useSubsonic(), AlbumCard(), formatDuration(), SongRow(), AlbumDetailPage(), ArtistDetailPage(), ArtistsPage() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (14): usePlayer(), PlayerBar(), formatTime(), ProgressBar(), calculateSongScore(), songWeight(), applyShuffleAlgorithm(), interleave() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (13): ENDPOINTS, AuthException, createSubsonicClient(), NetworkException, ServerException, TopBar(), LoginPage(), SettingsPage() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (15): cn(), Disc(), FALLBACK_TRACK, fmt(), initialReducerState(), MusicPlayer(), normalizeTracks(), ProgressBar() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (3): ErrorBoundary, root, rootElement

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (5): Favicon, Google Fonts Dependency, Index HTML, Root Element, Main Entry Point

## Knowledge Gaps
- **22 isolated node(s):** `rootElement`, `root`, `FALLBACK_TRACK`, `GENRE_BPM_MAP`, `initialState` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SubsonicClient` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **What connects `rootElement`, `root`, `FALLBACK_TRACK` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._