# Duck Delivery — Shelled build brief

## Build request

Build a small browser Sokoban game in this existing repository. A duck pushes parcels onto delivery pads. People can play each puzzle and watch verified replays of a TrueForge agent before and after it rewrites its own planning skill.

Use Shelled to implement the game and integration through traceable PRs. Use TrueForge for the actual puzzle attempts and skill improvement. These are separate evidence streams. Do not claim learning, scores, sponsor feature usage, or coding-agent failures until recorded evidence supports them.

The intended experience is: **“Watch a warehouse duck learn to stop making the same mistake.”** Keep the game small; put the engineering effort into correct rules and agreement between human play, agent execution, and replay.

## Existing repository

- TypeScript/ES modules, Node >=22.14, npm and an existing lockfile.
- Existing TrueForge starter: `scripts/setup.ts`, `run-evals.ts`, `improve.ts`, `export-session.ts`, `lib.ts`, `evals/score.ts`, `agent/`, and `runs/summary.csv`.
- The current agent is a code reviewer. Adapt its prompts, tasks, output validation, and scorer to Sokoban before the official baseline. Do not merely change labels.
- Preserve useful session export, run metadata, and `Agent-Session:` commit conventions. Check repository instructions before changes. Work on a feature branch, never directly on main.
- Model keys belong in the configured TrueForge runtime; never in browser bundles, commits, reports, or PR logs. Do not overwrite existing `.env` values or print secrets.
- Inspect the installed SDK/runtime capabilities. Do not upgrade dependencies just to match an example. Record the versions actually used.

## Minimum game

- One fixed, top-down board on screen; no camera or physics.
- Tiles: wall, floor, delivery pad, parcel, duck. A parcel or duck can occupy a pad without erasing it.
- Arrow keys/WASD and visible directional buttons. One accepted input means one discrete move.
- Push one parcel if the cell beyond is free. No pulling, diagonal movement, pushing two parcels, or walking through walls.
- Blocked moves leave the state unchanged and create no undo entry. Record blocked attempts separately for the benchmark.
- Win when all parcels occupy pads. Level validation requires at least one parcel and matching parcel/pad counts.
- Undo one legal move, restart, level selection, move/push counts, and clear win feedback.
- A deadlock is recoverable using undo/restart in human mode. Do not claim complete deadlock detection. Agent benchmark mode has no undo/restart action.
- Start with a few tiny, verified-solvable puzzles, normally 1–3 parcels. Do not add a procedural level generator or user level editor.
- No multiplayer, accounts, leaderboard, monetisation, audio requirement, or live online training requirement.

## Visual direction and controls

Use a warm cream background, readable warehouse floor, yellow duck with orange beak, brown parcels, and teal delivery pads. Make pads visible underneath occupants. Give walls, parcels, and pads distinct silhouettes as well as colours.

Use simple original vector or code-drawn artwork; no external asset pipeline is required. A short push animation is sufficient. State changes happen on turns; animation never determines game rules. Keep the board and controls usable on a narrow screen.

The primary controls are **Play yourself**, **Watch original**, and **Watch improved**. Playback has play/pause, step, restart, and speed. Show a concise recorded lesson beside the replay only when it comes from the saved improvement output. Before evidence exists, show an honest empty state, not fabricated replays or sample scores presented as results.

## Architecture and engineering challenge

Use TypeScript and Vite, with Phaser for the 2D board and DOM controls for menus, counters, and evidence. Keep the existing CLI scripts usable. Avoid a second frontend framework unless already required by the repository.

The central acceptance condition is:

> The same starting board and action sequence produce exactly the same state through the browser, CLI evaluator, and replay viewer.

- Put parsing, level validation, legal transitions, completion, counters, and state serialisation in a pure shared module. It must import no DOM, Phaser, network, or clock APIs.
- Browser input, agent actions, and playback all use this module. Do not write three implementations of Sokoban.
- Keep immutable level terrain separate from actor/parcel positions. State serialisation and hashing use a stable parcel order.
- Use a small, versioned action format: `up`, `down`, `left`, `right`. JSON plans have the shape `{ "moves": ["up", "right"] }`.
- Give each attempt a run/attempt identity. Restarting or switching levels invalidates old playback callbacks or pending responses.
- Save only serialisable state/preferences locally. Core play must still work if localStorage is unavailable. No server is necessary for human play or recorded replays.
- Run TrueForge evaluation from Node. Public static hosting displays recorded attempts; label them as recorded, not live model inference.

## TrueForge experiment

### First prove the loop

Before polishing the UI, run an exploratory pilot on a few development puzzles. Confirm the configured model can load the skill, produce legal plans, and receive engine feedback. Check that the difficulty leaves room for improvement. Pilot sessions are labelled exploratory and are not the official baseline. Do not intentionally sabotage the starting skill.

If credentials, runtime access, or skill/sandbox capability are unavailable, report that exact blocker. Complete offline work and expose empty experiment states. Never substitute scripted behaviour for a claimed TrueForge result.

### Freeze an experiment before baseline

Target 8 small puzzles: 4 development and 4 withheld from improvement feedback. This is a target, not a requirement to ship unsolved or unverified fixtures. Validate every puzzle with an independent solver or known solution, kept outside the playing agent's tools.

Freeze and record an experiment manifest containing:

- Level contents and split; engine/scorer version or hashes.
- Model identifier and parameters, runtime/SDK versions, tool access, and limits.
- Exactly two plan submissions per puzzle, each with at most 100 attempted moves. No replanning after each individual move.
- A first plan executes from the initial state. If it fails, return the observed ending board, counters, and failure reason. The second plan is another attempt from the same initial state, with the same 100-move limit. A successful first plan ends the task.
- Malformed JSON or illegal direction strings consume a submission and return validation feedback. Blocked moves consume an attempted move. Timeout/tool-failure handling is fixed and reported; do not silently omit failed tasks or cherry-pick retries.
- The same limits and feedback protocol apply in baseline and later runs. Manual play features do not give the benchmark extra actions.

Primary score: `100 * puzzles solved / total puzzles`. A puzzle is solved if either permitted plan succeeds within its limit. Report development and holdout scores separately, with moves, blocked attempts, model/tool failures, tokens, and duration as supporting metrics. Do not reward placing some parcels while leaving an unsolvable board.

Each puzzle is an isolated root turn/session context so it cannot see another puzzle's conversation. Record how the runtime enforces the two submissions. The per-run session export must preserve both proposals and feedback.

### What the agent changes

The TrueForge agent proposes move plans using its current planning skill. Between evaluation runs, it reviews failed development attempts and rewrites `agent/skills/<sokoban-skill>/SKILL.md` itself. General lessons might concern corner deadlocks, access to the pushing side, or moving a parcel off a pad temporarily.

After the official baseline, human editors and Shelled must not edit the learning skill. The improvement step must not alter levels, scoring, game rules, tool privileges, limits, or model. Keep proposed skill edits restricted to the allowed paths and preserve required frontmatter. Commit accepted agent-authored changes with the real `Agent-Session: <id>` trailer and retain the raw improvement session.

The playing agent necessarily sees the puzzle it is attempting. The improver must not see holdout boards, traces, solutions, or detailed feedback. Its sandbox must not mount the repository wholesale: expose only the current allowed observation, approved skill, and narrow tools. In particular, do not expose fixtures, reference solutions, earlier holdout logs, or solver code through filesystem or network tools. Log the effective access configuration.

Use two real TrueForge features: a registered skill and the sandbox used to execute the bounded simulator interaction. Verify both in session/tool evidence; pasting Markdown into a system prompt alone is not evidence of a registered skill. Do not enable unrestricted shell/search access to the public repository just to make the sandbox count.

Run the improved skill on the same experiment and repeat the final skill unchanged if time permits. Report all counted runs, including regressions. If improvement does not occur, report it honestly; do not alter the frozen exam. A revised exam is a new experiment with a new baseline.

## Replay and experiment evidence

Persist the initial level hash, original action plan, executed transitions, terminal status, counters, final-state hash, agent/skill commit, experiment identity, model, and session ID for each attempt. Recompute replay states from actions; verify the final hash before publishing an artifact. Show mismatched or missing artifacts as unavailable.

Package only the public replay data needed by the UI. Keep credentials and raw private runtime configuration out of it. Describe the withheld split as withheld from improvement, not secret from everyone once public evidence is published.

Keep `runs/summary.csv`, per-run results, session exports, and score summaries. Update README with launch commands, score definition, real before/after results, the skill diff, limitations, and useful TrueFoundry feedback. Prepare a short demo recording only after the real evidence is ready. Do not submit or publish the entry as part of implementation without a separate user request.

## Shelled evidence and focused checks

Implement through Shelled-created PRs, recording the associated run links. Maintain `EDGE_CASES.md` as an evidence report. Distinguish observed failures from tests that passed; never invent a failure.

Prioritise these meaningful cases:

1. Push a parcel onto a pad, off it, then undo: terrain, positions, counters, and completion agree.
2. Attempt to push two parcels or push into a wall: no partial movement or corrupt undo state.
3. Restart or switch puzzles mid-replay: no stale action touches the new board.
4. Submit malformed, oversized, or invalid agent plans: bounded execution and explicit failure.
5. Run the same trace through CLI and browser playback: state hashes agree after every move, including blocked moves.
6. Complete a puzzle, then undo: the win state clears and controls recover correctly.
7. Attempt to access holdout/solver data through agent tools: denied by the actual access boundary.

For an observed failure, record exact input/level, expected vs actual behaviour, reproduction command, Shelled run/PR, and fix or working fallback. An edge case is not the same thing as a puzzle the game-playing agent fails to solve.

Use deterministic unit tests for transitions and plan limits, and a small real-browser check for keyboard/buttons, undo/restart, stale playback, and narrow-screen layout. Report which checks ran; do not equate typechecking with a playtest.

## Incremental delivery

1. **PR 1 — rules and playable slice:** shared engine, tiny verified fixtures, core checks, minimal duck board with move/undo/reset. Demonstrate one complete puzzle.
2. **PR 2 — TrueForge proof:** adapt the starter, enforce bounded attempts and tool isolation, run the pilot, freeze the experiment, obtain baseline and agent-authored improvement evidence. Add replay export and real score reports. Report access blockers immediately.
3. **PR 3 — presentation and evidence:** original/improved replay controls, restrained visual polish, browser checks, `EDGE_CASES.md`, README and demo preparation.

Keep PRs narrow. Do not spend the whole build on art before the learning loop works. If time is tight, retain the working game and verified recorded replays; cut animation and extra levels first. Do not cut truthful evidence, fixed scoring, or task isolation.

## Completion checklist

- A person can open the game, understand the objective, solve a level, undo, and reset.
- A documented command runs the same rules without a browser.
- Real TrueForge attempts and skill rewrites are traceable to sessions and commits; measured results are reported without fabricated gains.
- The same frozen benchmark is used before and after; any changed experiment is clearly separate.
- At least two claimed TrueForge features are demonstrated by actual use.
- Replay outcomes agree with evaluator outcomes.
- Shelled PR/run links and reproducible edge-case findings are present.
- Tests and browser checks are reported, along with remaining limitations and sponsor-access blockers.

## Suggested first Shelled message

> Read `SHELLED_BUILD_BRIEF.md` and the repository instructions. Build Duck Delivery in small PRs, beginning with PR 1: the shared Sokoban engine and one playable puzzle. Preserve the existing TrueForge starter for adaptation in PR 2. The core requirement is that human play, evaluation, and replay use exactly the same transitions. Record actual edge-case outcomes and your run links. Do not fabricate model results or edit the agent's skill after the official baseline. Inspect the repo, state your plan and any access blockers, then implement the first slice with meaningful checks.
