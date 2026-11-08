# Duck Delivery training setup

The hosted `duck-delivery-planner` is saved at https://stranger-builds.truefoundry.cloud/trueforge. It uses the managed `claude-haiku-4-5-20251001` model, registered skill `agent-skill:stranger-builds/default/duck-planning:1`, and sandbox execution. Iteration limit is 12; web search, dynamic subagents, generative UI, and user questions are off. The initial skill and instructions are committed before any official baseline.

## Actual setup pilot

Session: https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6vebghah7rrgsp3vfvmyggz (authenticated access may be required).

The agent read the registered SKILL.md through a sandbox tool. The sandbox had Python 3.13.3 but no Node executable. The initial reply contained prose as well as a plan; a feedback turn produced one fenced JSON plan. Local canonical scoring confirmed that plan delivered both parcels in 6 moves with no blocked moves. This is a setup pilot, not Run 1, and contributes no benchmark score.

With the user's explicit source-transfer approval, a separate environment smoke test installed `quickjs` into a temporary sandbox directory and executed the actual canonical generated JavaScript. Its final serialized state was `{"duck":[4,2],"parcels":[[2,1],[4,1]],"moves":6,"pushes":2}` and `isWon` was true. The expanded tool receipt was inspected, not merely the agent's success claim. `runs/pilot-setup/` preserves the raw corrected reply, local result, and browser-visible tool evidence; it is not an SDK event export.

The local 0.180.0 runtime was also inspected: no model was configured and its local sandbox failed on Xcode Python. It was stopped after the hosted route was verified. Hosted credentials were not copied into `.env`.

## Runnable components

- `node --import tsx scripts/duck-score.ts level.json submissions.json`: score an array of up to two raw replies or plan objects with the canonical TypeScript engine.
- `node --import tsx --test evals/duck-score.test.ts`: verify invalid submission accounting, fresh initial states, blocked move budgets, and fixed percentage scoring.
- `scripts/duck-simulate.py`: Python-only sandbox adapter using QuickJS to execute the generated JS engine. It adds no movement implementation. Run with three paths: engine, puzzle JSON, plan JSON. The exact packaged adapter was executed in the hosted sandbox with exit 0; all seven serialized trace states match the local canonical scorer. The actual stdout and expanded tool receipt are preserved in `runs/pilot-setup/adapter-result.json` and `adapter-evidence.txt`.

## Frozen protocol

Eight original puzzles in `evals/duck/tasks.json` are independently solver-verified: four development and four withheld from improvement. `evals/duck/frozen.json` pins puzzle, scorer, engine, prompt/adapter hashes, model/runtime configuration and the initial skill hash. All tasks have canonical winning plans within 100 moves; solutions are not included in the fixtures or agent skill. Each puzzle permits at most two final submissions; each plan has at most 100 attempted moves and starts from the original board. Invalid plans consume a submission; blocked moves consume attempts. The fixed score is `100 * puzzles solved / 8`, with development and holdout subtotals also retained. Accept plain JSON or one whole-response JSON fence; never extract a plan from surrounding prose.

`npm run duck:benchmark -- prepare /tmp/duck-benchmark-prompts` has prepared all eight fixed prompts. The harness executes no model calls and creates no session IDs: collect real hosted sessions, then import their exact replies with the `score` command. Record `taskId`, real `sessionId`, pinned `skillVersion`, `status: "done"`, and a `replies` array of one or two exact replies for each task. The scorer refuses failed infrastructure runs and overwriting output directories. Verify session provenance against actual receipts; the importer cannot authenticate a supplied session ID.

Run a separate session per puzzle, or an explicit root turn with reset sandbox state, to avoid cross-task contamination. Save raw replies, turn/session identifiers, exact model/config and skill version, canonical traces, scorer outputs, and full session exports where available. Do not count infrastructure failures as a valid baseline.

For improvement, create a separate agent session with no sandbox, MCP, web, subagents, or repository tools. Provide only the initial skill and development failures; exclude all holdout content and solution data. Ask the agent for general planning rules. Review the proposed skill without editing it, reject embedded task answers, and commit accepted agent-authored text with the real `Agent-Session:` trailer. Register its new skill version, keep the remaining configuration frozen, then rerun the same eight puzzles. Only import actual verified traces into the website's Original/Improved replay slots.

## Current gate

The task set is frozen; no baseline or improvement score exists yet. The Shelled uplift passed route/replay checks and is publicly deployed. The final canonical engine (`b1c7a7a9593b7ed1aa3c027f6daf99221571115f3d51632899e30ea1f3e4a8ae`) was copied exactly into the hosted sandbox and executed through the exact packaged adapter, exit 0; all seven setup trace states again match local scoring. See `final-engine-evidence.txt` and `final-engine-result.json` in the pilot directory. The starter code-review `run-evals` and `improve` commands remain code-review commands; do not use them as Sokoban benchmarks. The next action is collecting Run 1 on the eight prepared prompts, with the frozen configuration and skill version 1.

## Evaluation gate from TrueFoundry's talk

Source reviewed: https://nerdconf.github.io/trueforge-talk/ (Anant Agarwal, 4 November 2026). A single later score above one baseline is insufficient evidence of reusable improvement. Apply this stricter evaluation plan without changing the frozen task set, scorer, model or runtime:

1. Collect three independent baseline rounds on all eight puzzles with initial skill v1 and clean per-task sessions. Preserve all replies and tool receipts, and report total/development/holdout min, max, mean and median. Each round is a separate immutable result directory; infrastructure failures require repair/retry with that fact logged.
2. Diagnose from development traces only, across baseline rounds. Before proposing any edit, the improvement agent must state one general cause and cite at least two actual failed development sessions. If evidence does not support such a pattern, stop rather than invent a lesson. Do not show holdout traces, seed pack metadata or solver answers to diagnosis.
3. Request one small, readable skill change addressing that cause. The agent writes it; Codex may accept/reject and preserve its exact output, not ghostwrite the learned rule. Reject hardcoded task answers, coordinates or stored plans. Cap skill length to avoid accumulating every past patch; preserve the original skill/configuration for rollback.
4. Evaluate the candidate in two fresh rounds on the same eight puzzles and configuration. Retain all scores, including regressions. Compare both overall and holdout results with the baseline ranges; a higher overall score alone is insufficient.
5. Keep the candidate only if its gain exceeds baseline variation, includes held-out improvement and survives repetition. Otherwise retain/revert to the original and report **gain not shown**. A strict, easy-to-audit gate is for both post-edit rounds to exceed the baseline maximum overall and on holdout. With eight binary tasks, one task changes the overall score by 12.5 points; four held-out tasks move in 25-point steps, so acknowledge the small sample.

Maintain a verdict report containing five rows: baseline variation measured; scorer/tasks unchanged and isolated; held-out gain; small general agent-authored diff; repeatable gain beyond variation. Mark evidence PASS, FAIL or NOT YET, link real sessions/commits, and use "gain not shown" if any required evidence is missing. This paragraph is the planned gate, not a report of completed runs. The separate 24-task seeded pack can strengthen later generalization evidence but must remain a distinct, fixed evaluation; never regenerate it to obtain a favorable result.
