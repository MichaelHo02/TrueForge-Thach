# Complete live WebMCP benchmark — 8 November 2026

The fresh v1 baseline won **5/8 (62.5%)**; the development-selected v5 skill won **7/8 (87.5%)** in eight fresh final sessions. Held-out performance rose from **2/4 (50%)** to **3/4 (75%)**. This is one paired live-tool round, not a statistical reliability claim or a replacement for the historical sandbox-only scores.

| Stage | Tasks | Live wins | Development | Held out |
|---|---:|---:|---:|---:|
| Fresh v1 baseline | 8 | 62.5% | 75% | 50% |
| V4 development selection | 4 | 75% | 75% | Not evaluated |
| V5 development selection | 4 | 100% | 100% | Not evaluated |
| Frozen v5 final evaluation | 8 | 87.5% | 100% | 75% |

## What changed

TrueForge authored two skill revisions from development failures. V4 still relied on manual geometry and tied the baseline's development score. V5 made canonical-engine state-space search the primary procedure. It solved all four development puzzles on first attempts, so it was selected and committed in `20e7cf0` before any final session began. No final-evaluation feedback was used for another revision.

The solver reads the real page's board, writes and runs its own sandbox planning code, checks a complete plan, and sends that plan to the supervised browser bridge. The bridge expands the exact model arguments into native WebMCP moves on https://duck-delivery.vercel.app. It does not solve puzzles or substitute reference moves. Operator actions load/reset puzzles between attempts; no manual moves are supplied within an attempt.

Within the solver configuration, only the registered skill changed between the fresh baseline and final comparison. Claude Haiku `claude-haiku-4-5-20251001`, default model parameters, neutral instructions, four game tools, tool/skill preload settings, sandbox configuration and 12-iteration turn budget stayed fixed. Each puzzle permits at most two attempts from its initial board and 100 attempted moves per plan. The live protocol is frozen in [protocol.json](protocol.json).

## Every puzzle, including the failure

| Puzzle | Split | Baseline v1 | Selected v5 | V5 moves / pushes | Actual v5 session |
|---|---|---|---|---:|---|
| duck-01 | Development | Win (2 attempts) | Win (1 attempt) | 13 / 4 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x6xcvpwcs12mq0hn9th40x) |
| duck-02 | Development | Fail (2 attempts) | Win (1 attempt) | 15 / 5 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x736mw48yd8zmvn9ftk73k) |
| duck-03 | Development | Win (1 attempt) | Win (1 attempt) | 13 / 5 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x787f50v3kc1ctxn4ybfx8) |
| duck-04 | Development | Win (2 attempts) | Win (1 attempt) | 13 / 9 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x7dag13c2ncb95tkrftpv5) |
| duck-05 | Held out | Fail (2 attempts) | Fail (2 attempts) | — | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x7m9829vp5gtmvmxs4maey) |
| duck-06 | Held out | Fail (2 attempts) | Win (1 attempt) | 15 / 8 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x7wm27m4s3wwt2cwb0jys5) |
| duck-07 | Held out | Win (2 attempts) | Win (2 attempts) | 13 / 5 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x80ydqyv3htdr6y1d8f0qx) |
| duck-08 | Held out | Win (2 attempts) | Win (1 attempt) | 17 / 9 | [Session](https://stranger-builds.truefoundry.cloud/trueforge/sessions/01m6x873zh09gjd0rhen6k6cnn) |

V5 won six puzzles on first attempts and one on its second attempt; `duck-05` exhausted both attempts without live moves. It is retained as a failure. The skill is not perfect: the traces include search-code debugging, repeated validation and an ambiguous search-budget instruction. No corrections were applied to the agent-authored skill after selection.

## What the score means

The metric is **actual live-tool wins**, with every retained browser transition replayed independently through the frozen canonical engine. It is not the old strict final-answer-only metric. In particular, baseline `duck-04` attempt 2 reached `won:true` and then hit its iteration limit before returning a final JSON answer. It counts as a live win under the precommitted action metric. Baseline wins with a normally completed final turn were 4/8; v5's seven wins all completed their final turns. Whole-turn Copy text is preserved as evidence, not passed off as a clean final-only API body.

All eight puzzles share familiar warehouse terrain. Four arrangements were withheld from both learning prompts. These arrangements were evaluated in earlier v1–v3 experiments; held out here means excluded from this revision feedback, not a newly sealed unseen test set. This does not prove unseen-map generalization; the separate 24-task generated pack remains untested with the model. A single fresh round does not measure variance. The earlier 25/0/37.5% baselines and repeated 75% v3 sandbox results remain separate historical evidence.

## Evidence and reproduction

- [Selection freeze](selection.json): exact selected hash, development results and freeze time; commit `20e7cf0` precedes the final runs.
- [Actual attempts](final/results-progress.json), [canonical audit](final/scored/score.json), [verified transitions](final/scored/verified-attempts.json), and [native receipts](final/events.jsonl).
- [V4 learning session](revision-01/session-url.txt), [exact v4 skill](revision-01/SKILL.md), [v5 learning session](revision-02/session-url.txt), and [exact selected v5 skill](revision-02/SKILL.md). V5 SHA-256: `cf38989d191e857fdc507e46b1c5620ced46895e5d623d530d93f5a86e614e32`.
- Learning-input manifests contain development task IDs only. Coaches had sandbox, MCP, skills, web search and subagents disabled; their exact UI configurations and outputs are retained with the capture assets. Full exact v5 skill text appears in every final attempt's expanded trace.
- Each final move is linked to its captured incoming MCP request. The actual UI-copied [three-parcel model request](final/final-duck-06-ui-mcp-request.json) and [native response](final/final-duck-06-ui-mcp-response.json) are retained independently.
- [Infrastructure exclusions](infrastructure-exclusions.json) preserve the expired-login and transport-interrupted sessions, including an interrupted live win. These were restarted after recovery, not scored as model failures and not supplied as improvement feedback. Browser servicing changed to remain active during UI work; game tools, model inputs and budgets did not change.

```sh
node --import tsx scripts/duck-live-report.ts \
  runs/duck-live-learning-2026-11-08/final /tmp/new-live-audit-output
```

The auditor refuses an existing output directory, checks frozen task/engine hashes, verifies every native transition and compares the executed moves to the captured model MCP arguments. The test suite includes a forged-win receipt rejection. AX transcripts retain original whitespace.

The saved live agent is `duck-live-selected-v5-20261108`. Its temporary relay/tunnel were stopped after capture. New live calls require an active supervised browser worker and relay; see [the bridge guide](../../docs/TRUEFORGE_WEBMCP.md). Shelled built the core game, TrueForge authored the skill revisions, and Codex implemented the live integration/evidence tooling and edited the recording. These Codex changes are not claimed as qualifying Shelled PR evidence.

## Showcase recording

The 54-second edited video shows three complete final evaluation runs (`duck-02`, `duck-04`, `duck-06`) using actual captures of the published website after native WebMCP calls. Waiting time and move pacing are shortened. OpenAI-generated narration explains the skill change while the game runs; captions use Whisper timestamps. The ending includes all eight results and the remaining failure. [Media provenance](demo.json), [edit manifest](demo-edit-manifest.json), and [captions](demo-captions.srt) are retained here; large source captures and the MP4 remain local review artifacts. The new video has not been posted or submitted.
