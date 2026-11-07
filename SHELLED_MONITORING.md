# Duck Delivery monitoring checkpoint

## Published uplift checkpoint

The later Shelled Version #18 game is now deployed at https://duck-delivery.vercel.app. Current production deployment: `dpl_HNUYZyFc9ERD6TymfRJAojVZQHqV`. All six routes were won through actual standalone browser controls (4/9/5/15/9/13 moves), and the three-parcel Dock 04 was won again on the public deployment. Corner feedback/Undo recovery, replay reset to initial state, invalid-plan rejection, cancellation on Restart, and a 375px overflow check passed. Local verification passes 10 engine/reducer/solver tests plus 3 scorer tests, typecheck, freshness, and the static build. Version #18 receipts are in EDGE_CASES.md; `evidence/shelled/browser-journal-v18.txt` preserves the observed journal and responses.

The uplift exposed four genuinely impossible routes (historical fixtures and search results are committed), replay trace/display divergence, blocked moves creating Undo entries, and repeat failure to persist exact generated artifacts. Shelled fixed gameplay/reducer behavior; Codex ran the exact generator and saved both exact outputs back through the editor as the working persistence fallback. Codex also removed the internal version label from the public header and integrated the production npm build commands. These interventions are distinct from Shelled's authored changes.

The hosted TrueForge agent has a registered skill and has actually executed the final canonical engine via Python/QuickJS. Its pilot trace matches local scoring. Eight independently verified tasks and the evaluation protocol are frozen, but official baseline/improvement collection is not started. `TRAINING.md` describes the runnable browser-assisted harness. The older checkpoint below is historical.

Recovered directly from the connected Shelled editor on 2026-11-08. Project: `MichaelHo02/TrueForge-Thach`, Shelled project ID `ff53adcb-94c5-4098-b5b4-fef7e4ab25bf`, visible Version #10. Implementation was produced through Shelled; this checkpoint preserves those files without adding its generated Next.js export scaffold.

## Verified behavior

Codex exercised the actual Home preview: Dock 01 solved with Right ×4 (4 moves, 3 pushes); Undo cleared the win and restored 3/2; Restart restored 0/0 and disabled Undo; starting wall moves left counters unchanged. Dock 02 solved with Up ×2, Right ×4 (6/4); Dock 03 solved with Right ×5 (5/4). Level selection reset state. Dock 03 fit at 371px after the CSS fix. After the input guard fix, ArrowDown focused on ROUTE no longer moved the duck; board Arrow/WASD movement still solved Dock 02. Native dropdown route navigation by arrow was not independently verified; route selection was verified through the actual select control.

The latest preview was left in a desktop layout with the sidebar closed. No official TrueForge baseline, training run, score improvement, or production deployment is claimed.

## Verification receipts

- Shelled `npm run verify`: `6105e72d-4b3e-41d6-87e2-333335cee158`, freshness check before regeneration and 8 passing tests, including VM execution of the persisted browser artifact against canonical TS transitions.
- Shelled typecheck: `40e780ce-d291-45ab-aa2b-48a53f2697fd`.
- Version #10 was documentation only; its completed run journal showed attempt 1, 28 steps, and one file changed. `EDGE_CASES.md` was read back from the editor (8,394 characters).
- Recovered checkpoint independently passed `node --import tsx scripts/build-preview-engine.ts --check`, `node --import tsx --test sokoban/engine.test.ts` (8/8), and `node node_modules/typescript/bin/tsc --noEmit`. Source hash: `70c40ba1f3d1142c`. The npm tsx launcher encountered a sandbox IPC restriction; the equivalent Node loader execution passed.

## Export and release status

Shelled's GitHub push reported “Failed to export to GitHub”; no remote commit is confirmed. Its export preview also added Next.js/CI scaffold files that have not been validated as a standalone application. Archive download did not produce a recoverable download, so the files were copied through the editor's normal select-all/copy UI instead. The local checkpoint commit is distinct from a successful Shelled GitHub export.

Shelled Share > Live is a collaboration session. Share > Vercel requires connecting Vercel; no connection or deployment was performed. Preserve the Shelled workspace and run journals for challenge evidence. No accessible public PR/run URL was exposed; the IDs above are receipts, not fabricated URLs.

## Next milestone

Prepare and verify a standalone deployable build, then publish. Adapt the starter evaluator to fixed Sokoban puzzles and register the planning skill and sandbox tools before any official baseline. Current starter code-review evaluations are unchanged. No WebMCP dependency is needed for the planned engine-based sandbox evaluation.
