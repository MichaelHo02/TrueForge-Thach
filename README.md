# Duck Delivery — Shelled integration slice

This branch contains the runnable Sokoban game, native WebMCP adapter, eight frozen puzzle fixtures and relevant engine/integration tests. The complete agent skills, benchmark receipts and submission evidence remain on `main`.

## Run

Node 22.14+ is required. Run `npm ci`, `npm run verify`, `npm run typecheck`, and `npm run build`. Serve `dist/` with any static HTTP server. The app entry point is `PreviewPage.jsx`; the full standalone runtime is `web/entry.jsx`.

## Two focused Shelled changes

1. If benchmark puzzle fixtures are unavailable in the standalone preview, disable the benchmark selector/load control and explain the unavailable state. Preserve normal benchmark loading when fixtures exist.
2. Give each board cell a screen-reader label describing its row, column, terrain, goal, parcel and duck. Keep decorative glyphs out of the accessible name.

Make each fix a separate agent-authored PR against `codex/shelled-import-base`. Include targeted regression checks and record actual results in `EDGE_CASES.md`. Do not modify the generated engine/variation blocks, frozen fixtures, scorer, skills or benchmark scores.

## Integration safety

This base deliberately omits historical files to reduce GitHub import requests. Never merge the base branch wholesale into `main`: that would remove the omitted history. Merge reviewed agent PRs into this branch, then cherry-pick only their validated fix commits into a fresh branch from `main`. Shelled-opened PR URLs and run provenance must remain explicit; a manually created PR is not agent-opened evidence.
