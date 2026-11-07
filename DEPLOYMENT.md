# Duck Delivery deployment

Public demo: https://duck-delivery.vercel.app

The first production deployment uses Shelled Version #10 game sources from commit `56171fd`, bundled with React 19.3.1 and esbuild 0.25.12 through `scripts/build-web-fallback.mjs`. This wrapper was authored by Codex as a fallback while Shelled prepared its standalone build; it is not a claim that Shelled's Version #11 bundle passed a browser test.

Reproduce with `npm ci`, `npm run check:preview-engine`, and `npm run build:web:fallback`. Upload only `dist/index.html`, `dist/game.js`, and `dist/game.css`; never upload `.env`, model credentials, sessions, or the repository wholesale. Bundled dependencies require no React CDN. The original stylesheet uses an optional Google Fonts stylesheet with system-font fallbacks.

Vercel project: `prj_CpIqbVWbqWPx5ocZTLAinj3TFGwp` in `michaelho02s-projects`. Initial production deployment: `dpl_B9o1CgoVx8LGRq4BWhqijixrgDgX`, confirmed READY. Public unauthenticated HTTP retrieval succeeded. Actual live-browser checks: Dock 01 Right ×4 produced a win at 4 moves/3 pushes; Undo restored 3/2 and cleared the win; Restart and switching to Dock 03 showed 0/0 with Undo disabled. Browser error log was empty.

The TrueForge training milestone and the later game uplift are not included in this initial deployment. Redeploy only after checking their actual build and browser behavior.
