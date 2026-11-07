# Duck Delivery

A duck pushes parcels onto delivery pads in a small Sokoban warehouse. Built through Shelled, with a TrueForge planning-agent experiment using the same deterministic engine.

**Play:** https://duck-delivery.vercel.app

Six routes progress from one parcel to three. The game includes keyboard/touch controls, undo/restart, conservative corner-trap warnings, and a replay lab that validates moves with the canonical engine. Original/improved watch controls stay empty until actual benchmark runs exist.

## Run locally

```sh
npm ci
npm run verify
npm run typecheck
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173. Static game play needs no model credentials. Never expose a local standalone TrueForge runtime to the internet.

The canonical rules live in `sokoban/engine.ts`. `npm run build:preview-engine` generates the browser artifact and Shelled-compatible preview block after engine changes; commit those outputs together. `verify` and the production `build` check freshness without first regenerating away a stale-input failure.

## TrueForge setup

The hosted `duck-delivery-planner` has the registered `duck-planning` skill and a sandbox. A real setup pilot read the skill and executed the canonical JavaScript through Python/QuickJS; its seven trace states matched the local scorer. This is not an official benchmark result. See [TRAINING.md](TRAINING.md) and `runs/pilot-setup/` for evidence and limitations.

Eight original puzzles are independently solver-verified, with four development tasks and four withheld from skill improvement. The benchmark harness prepares identical prompts, scores saved actual replies, guards frozen inputs, and prepares improvement prompts from development failures only.

```sh
npm run duck:benchmark -- check
npm run duck:benchmark -- prepare
npm run duck:benchmark -- score actual-replies.json runs/duck/run-01
npm run duck:benchmark -- improve-prompt runs/duck/run-01/results.json /tmp/duck-improve.txt
```

The verified setup is already frozen in `evals/duck/frozen.json`; do not overwrite it after Run 1. Sessions run through the hosted UI; the harness does not authenticate or launch them. Preserve actual replies, tool receipts, model/runtime settings and session exports. The old starter `run-evals` and `improve` commands remain code-review examples, not Sokoban training commands.

## Run 1 vs run N

- **Task and score:** eight fixed Sokoban puzzles; score = 100 × puzzles solved / 8, with development/holdout breakdowns.
- **Run 1 → run N:** not run yet. No improvement is claimed.
- **The change that did it:** no agent-authored improvement exists yet.
- **What the agent learned:** unmeasured; the initial skill is registered as version 1.
- **What still fails:** see [EDGE_CASES.md](EDGE_CASES.md); live benchmark results and recorded before/after replays are still pending.

## Shelled evidence

[EDGE_CASES.md](EDGE_CASES.md) records observed failures and working fallbacks. `evidence/shelled/` preserves the earlier unsolvable route definitions and independently reproduced outcomes. Four routes were initially impossible; corrected routes now pass canonical BFS and actual browser playtests. Replay state divergence, blocked Undo entries, and generated-output persistence also required fixes.

Implementation was produced in the connected Shelled workspace. Exact artifact persistence and the initial deployment wrapper required a disclosed Codex fallback. Shelled's own GitHub export failed; a manually preserved source checkpoint is not a claim that its automatic PR export worked. See [SHELLED_MONITORING.md](SHELLED_MONITORING.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

The original starter documentation is retained in [docs/STARTER_README.md](docs/STARTER_README.md). MIT licensed.
