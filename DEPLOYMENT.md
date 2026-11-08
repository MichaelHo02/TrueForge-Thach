# Duck Delivery deployment

Public demo: https://duck-delivery.vercel.app

## Live benchmark loader, 8 November 2026

Production deployment `dpl_3GTVLperpn6kkht1GirCm9fVzkRH` is READY at the public URL and includes the eight-input live benchmark loader from `8f120e1`. The loader uses exact frozen puzzles with no saved plans. Real model sessions changed these displayed boards through native WebMCP; the complete live comparison and all failures are retained in `runs/duck-live-learning-2026-11-08/REPORT.md`. The engine/scorer/task freeze is unchanged. Only built static files were deployed.

## Earlier uplift deployment

Production deployment `dpl_HNUYZyFc9ERD6TymfRJAojVZQHqV` is READY and serves the six-route uplift. It uses Shelled's standalone `web/entry.jsx`, `web/react-shim.jsx`, `scripts/build-web.ts`, and linked `app.css`; the initial fallback below is retained as history. Only `dist/index.html`, `dist/app.js`, and `dist/app.css` were uploaded. The production browser loaded the sorting-floor version, solved Dock 04 with three parcels at 15 moves/4 pushes, undid the win to 14/3, and verified replay import/reset. No browser errors were observed.

The local standalone build passed all six routes, deadlock/Undo recovery, invalid replay rejection, timer-reset behavior, and a 375px overflow check. `npm run build` now checks persisted engine freshness before bundling; it does not regenerate away stale inputs. Model credentials remain outside the static deployment.

## Initial deployment fallback (historical)

The first production deployment uses Shelled Version #10 game sources from commit `56171fd`, bundled with React 19.3.1 and esbuild 0.25.12 through `scripts/build-web-fallback.mjs`. This wrapper was authored by Codex as a fallback while Shelled prepared its standalone build; it is not a claim that Shelled's Version #11 bundle passed a browser test.

Reproduce with `npm ci`, `npm run check:preview-engine`, and `npm run build:web:fallback`. Upload only `dist/index.html`, `dist/game.js`, and `dist/game.css`; never upload `.env`, model credentials, sessions, or the repository wholesale. Bundled dependencies require no React CDN. The original stylesheet uses an optional Google Fonts stylesheet with system-font fallbacks.

Vercel project: `prj_CpIqbVWbqWPx5ocZTLAinj3TFGwp` in `michaelho02s-projects`. Initial production deployment: `dpl_B9o1CgoVx8LGRq4BWhqijixrgDgX`, confirmed READY. Public unauthenticated HTTP retrieval succeeded. Actual live-browser checks: Dock 01 Right ×4 produced a win at 4 moves/3 pushes; Undo restored 3/2 and cleared the win; Restart and switching to Dock 03 showed 0/0 with Undo disabled. Browser error log was empty.

The TrueForge training milestone and the later game uplift are not included in this initial deployment. Redeploy only after checking their actual build and browser behavior.
