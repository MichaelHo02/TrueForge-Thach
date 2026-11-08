# Duck Delivery skill improvement verdict

**PASS on the precommitted gate: promote the exact agent-authored v3 skill.** These are real hosted TrueForge sessions, scored locally with the frozen canonical CLI; they are not platform-certified scores.

| Skill | Round | Overall | Development | Held out |
|---|---:|---:|---:|---:|
| Baseline v1 | 1 | 25% | 50% | 0% |
| Baseline v1 | 2 | 0% | 0% | 0% |
| Baseline v1 | 3 | 37.5% | 50% | 25% |
| Candidate v2 | 1 | 0% | 0% | 0% |
| Candidate v2 | 2 | 0% | 0% | 0% |
| Candidate v3 | 1 | 75% | 100% | 50% |
| Candidate v3 | 2 | 75% | 100% | 50% |

Baseline overall range was 0–37.5%, mean 20.83%, median 25%; held-out range 0–25%, mean 8.33%, median 0%. V3 reached 6/8 overall, 4/4 development and 2/4 held out in **each** repetition: 37.5 percentage points above the best overall baseline and 25 points above the best held-out baseline. No failed trial was discarded. V2 scored zero twice and was rejected.

| Required check | Verdict | Evidence |
|---|---|---|
| Baseline variation measured | PASS | Three independent rounds, 24 task sessions; `runs/duck-baseline-summary.json` |
| Scorer/tasks unchanged and isolated | PASS | Both CLI scores verified all frozen hashes; clean per-puzzle sessions, fixed model/runtime |
| Held-out gain | PASS | 50% twice, above baseline maximum 25% |
| Small general agent-authored diff | PASS | One procedure change; exact candidate and learner inputs in `runs/duck-improvement-02/` |
| Repeatable gain beyond variation | PASS | 75% twice, above baseline maximum 37.5%; gate committed before testing |

## What the agent changed

The first learner added a generic instruction to validate then finish. It did not help: v2 kept spending its loop budget debugging or retesting and produced no scored successes. The final learner replaced that reminder with a concrete procedure: complete planning before testing, make one complete validation call, then immediately return the JSON plan (or best effort). Codex copied the proposed skill verbatim; it did not write the learned instruction or supply puzzle solutions.

Final learning session: https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6wjea7n7e4ktr984x9x60hg

Candidate source commit: `8ce41b4`; rejected v2 results: `e2188aa`; baseline results: `794d82d`. Registered v3 SHA-256: `692cad0fcdd50b0694599d0e339776311efacf698ea076c04d941b0ae8ee9c8c`. Original v1 preserved in `runs/duck-baseline-skill-v1.md`. The tested v3 agent is `01m6wjqt8nb8wyb52qwex1baes`.

## Scope and capture limitations

All eight tasks share warehouse terrain. Held-out puzzles use unseen actor/goal arrangements in that familiar warehouse; this does not establish generalization to unseen maps. There are only four held-out tasks, reused for two candidate evaluations. Both learning agents received failed development traces only. The separate frozen 24-task seeded pack has not been run with the model.

Same Haiku model, sandbox, iteration limit 12, two final submissions and 100 attempted moves per submission throughout. Baseline scheduling used three concurrent sessions, v2 two then four, and v3 four; sessions were independent. Provider/auth infrastructure failures were not scored. Agent debug errors and iteration exhaustion were task failures. The UI calls the iteration limit per turn; after exhaustion, observed feedback requests were rejected before a second response. No fresh session or extra budget was substituted.

Only rendered final-answer bodies were scored, including any prose they contained. Whole-message Copy includes tool narration, so those copies and expanded tool receipts are retained separately. Missing final answers at iteration exhaustion score as empty invalid replies. One v3 task (round 1, duck-03) read only the first 500 skill characters; its saved configuration still pinned v3, but full skill consumption is not verified for that session.

Raw replies, real session URLs, expanded UI/tool receipts and immutable CLI outputs are in `runs/duck-baseline-01..03`, `runs/duck-comparison-01..02`, and `runs/duck-v3-comparison-01..02`. `runs/duck-final-comparison.json` indexes all seven rounds (56 task executions). This evidence supports a repeated improvement on this fixed benchmark, not a broad statistical claim.

The public game's six UI routes differ from these benchmark tasks. At benchmark completion, in-game replay integration and a comparison video were pending. The subsequent website update `9677f8c` adds labelled playback of the exact duck-01 baseline and v3 round-2 result, with canonical trace matching and source links; a direct published-website recording with voiceover was then captured. The draft recovery PR was opened manually by Codex, not Shelled; qualifying Shelled PR evidence remains missing. No formal challenge submission or merge is implied.

Human-readable AX and copied-stream files normalize trailing whitespace for Git. Where a copied stream required normalization, its `.raw.json` companion preserves the exact original. Scored reply strings and skill bytes remain unchanged.
