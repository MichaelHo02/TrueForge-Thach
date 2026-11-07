# Duck Delivery edge cases

This file records observed findings and reproducible checks. It does not claim a browser result unless the preview was actually exercised.

## Findings fixed in this slice

### Historical intermediate fix: preview selected the CLI scorer (superseded)
- Repro: open the workspace View preview at `/evals-score` before this fix.
- Expected: the Duck Delivery `PreviewPage` renders as the app entry.
- Actual: `Page failed to render` with `Cannot use 'import.meta' outside a module at about:srcdoc:558:45`, because the eval scorer was being treated as the preview entry.
- Historical intermediate fix: `PreviewPage.jsx` was temporarily made the default-exported preview component while diagnosing the entry-point issue; that syntax was later removed because Home requires a plain `PreviewPage` function. The CLI scorer remains untouched.
- Evidence status: source fix applied; an accessible browser URL/run identifier was not available in this workspace, so browser play success is not fabricated.

### Historical intermediate fix: browser had a second movement implementation (superseded)
- Repro: inspect the earlier `PreviewPage.jsx`; it defined `DELTAS`, `makeState`, `won`, and `engineStep` independently of `sokoban/engine.ts`.
- Expected: browser and CLI/tests call the same canonical pure engine.
- Actual: browser movement could diverge from CLI behavior, and the old React updater also called `setHistory` inside a `setState` updater.
- Historical intermediate fix: the browser was temporarily changed to import `initialState`, `step`, `isWon`, and `validateLevel` directly from `sokoban/engine.ts`; that approach was superseded because the Home srcdoc cannot resolve TypeScript modules.
- Current solution: `PreviewPage` is a plain function containing the generated canonical-engine block, while `sokoban/engine.browser.js` is the generated browser artifact. The nonmutating freshness check compares both persisted outputs with fresh in-memory generation, and the VM parity test compares browser and canonical-engine serialized traces after every move.

## Verified engine cases

- A parcel on the outer floor edge cannot be pushed outside the board: the engine explicitly checks the parcel's beyond tile bounds before moving it. Repro: run the `does not push a boundary parcel beyond a floor-edged board` test in `sokoban/engine.test.ts`; expected and actual are the unchanged state.
- `validateLevel` rejects duplicate duck/parcel actor positions and noninteger or out-of-bounds actor/goal coordinates. Repro: run the `rejects duplicate actors and invalid coordinates` test; expected and actual are validation errors.

- Pushing a parcel onto a goal and then off it changes win state as expected; restoring the saved pre-win state restores the winning state. Covered by `sokoban/engine.test.ts`.
- A parcel blocked by a second parcel or wall returns the identical state object, so it cannot create an undo entry. Covered by `sokoban/engine.test.ts`.
- The browser/CLI trace is serialized at every move and asserted exactly against the canonical `step` implementation. Covered by `sokoban/engine.test.ts`.
- `DUCK_LEVELS` is validated at preview startup and all three Dock levels have one parcel, one goal, and a direct solvable route.

### Preview import boundary and ephemeral generation mismatch
- Repro: run the preview engine generator only through the disposable managed check, then select Home `/` in the browser route selector. The generated files exist only in that sandbox; the connected workspace still has the placeholder engine lookup. Home fails with `TypeError: undefined is not a function` at `Array.forEach` (around `:510:15`), following the earlier `validateLevel is not defined` import-boundary failure.
- Expected: the persistent workspace contains a browser-safe artifact and an identical generated block derived from `sokoban/engine.ts`, so Home can execute without resolving a TypeScript module in srcdoc.
- Actual: prior sandbox success did not persist generated outputs to the workspace.
- Fix: persisted `sokoban/engine.browser.js` and the generated engine block in `PreviewPage.jsx`; the generator now rereads both outputs and compares them byte-for-byte with fresh transpilation. Repro: run `npm run build` and inspect the source hash `70c40ba1f3d1142c` in both outputs.
- Historical status: Home/Dock 01/undo/reset playtest was still pending at this intermediate stage. It was superseded by the external Version #8 observations recorded below.

### Generated adapter freshness and behavioral parity
- Repro: edit `sokoban/engine.ts`, then run `npm run check:preview-engine` before running the generator. Expected: the command fails when either persisted `PreviewPage.jsx` output or `sokoban/engine.browser.js` is stale or missing. Actual: the new nonmutating check compares both persisted outputs with freshly generated in-memory text and fails without writing.
- Repro: run `npm test`. Expected: persisted browser artifact and canonical TypeScript engine produce identical serialized states after every move in blocked and floor-edge traces. Actual: the VM parity test executes `sokoban/engine.browser.js` and compares each transition against `sokoban/engine.ts`; divergence fails the test.
- The check must be run before `npm run build:preview-engine` when verifying existing persisted outputs; generation is intentionally separate.

## Not yet evidenced

- Restart or level switching during an actual asynchronous replay: this slice has no replay worker/clock; reducer restart and selection are synchronous and discard history.
- Malformed or oversized plan handling in the CLI benchmark: planned for the TrueForge milestone, not started here.
- Shelled run/PR/version identifiers: none were exposed by the available workspace tools for this edit.

## External browser observations (Codex, Version #5)

These are reported external Shelled Home `/` observations, not browser execution by this agent:

- Dock 01: `ArrowRight` x4 solved the level in 4 moves and 3 pushes; Undo returned to 3 moves/2 pushes and cleared the win banner; Restart returned to 0/0 with Undo disabled. Up and Left into the starting walls left the state unchanged at 0/0.
- Dock 02: switching to a fresh level showed 0/0; `ArrowUp` x2 then `ArrowRight` x4 solved it in 6 moves and 4 pushes.
- Dock 03: switching to a fresh level showed 0/0; `ArrowRight` followed by `d` x4 solved it in 5 moves and 4 pushes. Arrow keys and WASD both worked.
- At 371px preview width, Dock 03's 9-column board was clipped at both edges because fixed-width cells overflowed the card. The responsive CSS fix changes the grid to available-width fractional columns while retaining square cells; the canonical engine is unchanged.

The earlier real Home import-boundary failure and ephemeral managed-sandbox output mismatch remain recorded above. These observations are evidence supplied by the user/Codex browser playtest and are not claimed as a tool-run browser verification here.


## External browser observations (Codex, Version #8)

These are reported external Shelled Home `/` observations, not browser execution by this agent:

- Home rendered without the validation overlay. Dock 01 solved with `ArrowRight` x4 in 4 moves/3 pushes; Undo returned to 3/2 and cleared the win banner; Restart returned to 0/0 with Undo disabled. Up and Left into the starting walls left the state at 0/0.
- Dock 03 fully fit the 371px preview width after the responsive board fix.
- Input-routing bug reproduced: focusing the ROUTE select and pressing `ArrowDown` twice moved the duck and increased the counter to 2 while the route remained Dock 01. The global keydown handler now ignores events from select/input/textarea/contenteditable and only calls `preventDefault` for game movement outside those controls. A source regression check covers this guard; button and board controls remain available.
- Current verification evidence to retain: `npm run verify` job `fa49699e-62c4-453b-bf69-ef45d056adb7` (7 tests) and `npm run typecheck` job `fc4763f3-5c91-43f8-9e92-dd44e9e7078b`. No PR/run URL is claimed because none is available; per-run journal/version evidence is preserved by this entry.
- Current status: the Version #8 UI observations supersede the earlier pending-playtest note. The canonical engine rules were not changed; the official TrueForge baseline remains unstarted.
