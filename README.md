# DatabaseMusiconn (SoundTrails)

A **SvelteKit 5 / TypeScript** discovery and analytics web application built on top of the [musiconn.performance](https://performance.musiconn.de) historical concert database.

## Architecture & Technical Highlights

- **Same-origin GraphQL Proxy (`src/routes/api/musiconn/+server.ts`)**: The upstream musiconn Strawberry GraphQL endpoint does not permit browser CORS preflight requests. All client queries are routed through a SvelteKit server endpoint that forwards requests and streams responses back on the same origin.
- **GraphQL Client & Legacy Adapter Layer (`src/lib/musiconnApi.ts`)**: Translates paginated GraphQL queries (`eventList`, aliased multi-entity lookups for `person`, `work`, `location`, `corporation`) into normalized domain models, with configurable request timeouts, retry logic, and batching (pages of 100 records).
- **Client-side Prefix Search & IndexedDB Cache**: Because the upstream GraphQL API does not provide server-side name filtering on entity lists, entity catalogs are preloaded in paginated batches, stored in IndexedDB (`src/lib/storage.svelte.ts`), and queried via fast client-side prefix matching.
- **Interactive Geospatial & Temporal Views**:
  - **MapLibre GL + Protomaps (PMTiles)**: Vector tile map visualization with presigned S3/MinIO URL generation (`src/routes/api/map/presigned-url/+server.ts`).
  - **D3.js Visualizations**: Interactive timeline (`LineGraphD3.svelte`) and distribution charts (`PieChart.svelte`) synchronized with active facet filters.
- **Bilingual UI (`typesafe-i18n`)**: Full German and English localization (`de` / `en`).

## Development

```bash
npm install
npm run dev          # Starts Vite dev server + typesafe-i18n watcher
npm run check        # Runs svelte-kit sync & svelte-check
npm run build        # Production Node build (adapter-node)
```
