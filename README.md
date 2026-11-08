# Duck Delivery

A duck pushes parcels onto delivery pads in a small Sokoban warehouse. Built through Shelled, with a TrueForge planning-agent experiment using the same deterministic engine.

**Play:** https://duck-delivery.vercel.app

Six routes progress from one parcel to three. The game includes keyboard/touch controls, undo/restart, conservative corner-trap warnings, a verified replay lab, three recorded agent examples, and live browser-agent control through WebMCP.

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

Three real baseline rounds scored 25%, 0%, and 37.5%. The agent-authored v3 skill reached **75% overall / 50% held out in both comparison rounds**, passing the precommitted gate. V2 failed and is retained in the report. See [VERDICT.md](VERDICT.md) for raw evidence, the exact skill change and small-sample limitations.

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
- **Run 1 → run N:** 25% in baseline round 1; v3 reached 75% in both comparisons. The other baselines scored 0% and 37.5%.
- **The change that did it:** the agent rewrote its skill using failed development traces; plan completely, validate once, then submit. V2 failed before v3 passed the gate.
- **What the agent learned:** a reusable planning/submission procedure; model weights stayed unchanged.
- **What still fails:** see [EDGE_CASES.md](EDGE_CASES.md) and [VERDICT.md](VERDICT.md). Eight puzzles share warehouse walls; no unseen-map generalization claim.

## Shelled evidence

[EDGE_CASES.md](EDGE_CASES.md) records observed failures and working fallbacks. `evidence/shelled/` preserves the earlier unsolvable route definitions and independently reproduced outcomes. Four routes were initially impossible; corrected routes now pass canonical BFS and actual browser playtests. Replay state divergence, blocked Undo entries, and generated-output persistence also required fixes.

Implementation was produced in the connected Shelled workspace. Exact artifact persistence and the initial deployment wrapper required a disclosed Codex fallback. Shelled's own GitHub export failed; a manually preserved source checkpoint is not a claim that its automatic PR export worked. See [SHELLED_MONITORING.md](SHELLED_MONITORING.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

The original starter documentation is retained in [docs/STARTER_README.md](docs/STARTER_README.md). MIT licensed.

## Seeded challenges and generalization

Choose **Shuffle challenge**, or enter a seed and choose **Load seed**. The same original route, seed and generator version reproduce the same duck, parcels and delivery pads. Terrain and parcel count stay fixed. Restart preserves the current challenge; Original route returns to the curated puzzle. Variations use bounded reverse pulls from a solved state and canonical forward replay verification; internal solution witnesses are discarded. This guarantees solvability for accepted output, not unlimited unique layouts or equal difficulty. The narrow first route has fewer distinct configurations.

A separate frozen pack contains 24 distinct, solver-verified variations: 12 development and 12 holdout. It does not replace or change the original eight-task benchmark. Both agent versions must use the same pack, model, runtime and budgets; only development failures may inform the skill rewrite. Generated prompts exclude seeds, generator code and witnesses. Keep the public repository and pack unavailable to solver/improvement sessions; these are procedural holdouts, not secret public data.

```sh
npm run duck:generalization -- prepare development /tmp/duck-dev
npm run duck:generalization -- prepare holdout /tmp/duck-holdout
npm run duck:generalization -- score actual-replies.json runs/generalization/run-01
npm run duck:generalization -- improve-prompt runs/generalization/run-01/results.json /tmp/duck-improve.txt
npm run duck:quality -- 20 /tmp/duck-quality.json
```

The pack records original base boards, generator identity, source hashes and configuration so it remains reproducible. `create` refuses overwrite. No model generalization score is claimed yet. Rebuild browser adapters after generator changes with `npm run build:variants`; verify/build reject stale artifacts.

## Recorded agent demo

On the website, choose **Watch baseline failure** or **Watch improved agent**. The mode loads the exact `duck-01` benchmark arrangement, not one of the six practice routes. The baseline has no final plan and stays at its initial state. **Play agent plan** replays the exact v3 round-2 response (15 moves) through the canonical engine; the complete serialized trace must match the saved scored receipt before playback is enabled. Manual moves are disabled while reviewing a recording. Restart reloads it; Exit agent demo restores the selected practice route. Links expose the baseline, learning session, improved session, exact skill and all results. This is historical playback, not fresh model inference.

The recorded puzzle selector now includes **duck-01** (v3 round 2, 15 moves), **duck-02** (v3 round 1, 21 moves), and **duck-06** (v3 round 2, 15 moves, held-out arrangement). Each has its own exact source task, response, trace and session links. Select Slow playback to follow individual moves. These are three examples from the eight-task benchmark, not three new model runs or different warehouse wall layouts.

## Live WebMCP play

A browser agent can discover `duck_get_board`, `duck_move` and `duck_restart` and control the displayed practice puzzle through WebMCP. Each move uses the same React reducer and canonical engine as the buttons. The live status panel shows availability, tool-call count and last action. Unsupported browsers keep normal gameplay; there is no fake WebMCP fallback.

Ask a WebMCP-capable browser agent: **“Read the current Duck Delivery board and solve it using its WebMCP tools. Read each move receipt and pass its revision into your next move.”** See [docs/WEBMCP.md](docs/WEBMCP.md) for schemas, support and verification.

This interface is separate from the historical TrueForge experiment: its 75% scores and existing narrated video came from sandbox planning and saved replays, not WebMCP. A supervised [TrueForge browser bridge](docs/TRUEFORGE_WEBMCP.md) now connects the unchanged v3 skill to native WebMCP. Four selected live integration trials produced two one-parcel wins and two multi-parcel budget failures, all retained in [the live run summary](runs/webmcp-live-2026-11-08/summary.json). This is a new transport demonstration, not a new benchmark or proof that multi-parcel planning is solved.
