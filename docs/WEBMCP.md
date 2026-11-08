# Live browser-agent play

Duck Delivery exposes real browser WebMCP tools for the active rendered puzzle. The tools use the game's existing reducer and generated canonical engine. They do not import a saved answer, advance a recorded replay, or run an independent simulation.

## Tools

| Tool | Input | Result |
| --- | --- | --- |
| `duck_get_board` | `{}` | Current terrain, goals, duck, parcels, ASCII rows/legend, seed, mode, counters, win/deadlock status and revision. |
| `duck_move` | `{"direction":"right","expectedRevision":0}` | One canonical step and its committed board; `outcome` is `moved`, `blocked` or `rejected`. |
| `duck_restart` | `{"expectedRevision":0}` | Restart of the same active route and seed; counters reset. |

Coordinates are zero-based `[x,y]`, increasing right/down. Directions are `up`, `down`, `left`, `right`. Results contain a text content block with JSON. A rejected call also sets `isError: true` and provides an actionable `error`. Read a board first, then use the returned `revision` as `expectedRevision` on every mutation. UI moves, route changes and restarts invalidate stale commands. Input is validated in the callback, in addition to the JSON schema.

The tool callback synchronously commits its reducer action to React before taking the result snapshot. Blocked moves leave the engine's movement and push counters unchanged. Agent commands pause ordinary replay timers; old timer callbacks are rejected by existing generation checks. Mutation tools reject recorded-demo mode; the user must choose **Exit agent demo** before live play.

Registration follows the [current WebMCP draft](https://webmachinelearning.github.io/webmcp/) with `document.modelContext.registerTool` and AbortSignal cleanup. Earlier `navigator.modelContext` implementations are supported with their `unregisterTool` cleanup. No third-party polyfill or new package is installed. The page reports unsupported or failed registration honestly, and unregisters its tools when unmounted. No credentials, external network endpoint or cross-origin access is exposed by the tools.

## Connect an agent

Open the game in a WebMCP-capable browser/agent. The page's **Live agent control · WebMCP** panel must report three tools available. Have the agent discover the registered tools through its browser connection and read the board, then plan and execute single moves with the returned revision. On unsupported browsers, ordinary play and recorded demos remain available; their availability is not evidence that WebMCP is working.

The hosted TrueForge sandbox does not automatically gain access to a browser's tools. A separate supervised browser-backed MCP bridge has now been verified with the unchanged v3 skill: two live wins and two failed trials, retained in `runs/webmcp-live-2026-11-08`. See [TRUEFORGE_WEBMCP.md](TRUEFORGE_WEBMCP.md). The bridge must be running for live calls; the earlier benchmark scores and its existing video remain separate historical evidence.

## Verification, 8 November 2026

Local verification used Codex's actual browser WebMCP discovery/call capability against the running page, without JavaScript injection of tools or mouse/keyboard moves for the solves.

| Check | Observed result |
| --- | --- |
| Tool discovery | Browser discovered all three real registered tools. |
| Dock 01 live solve | 4 moves, 3 pushes; tool receipt `won: true`, UI displayed route complete. |
| Dock 02 live solve | 9 moves, 3 pushes; both parcels delivered in the UI. |
| Wall push | `blocked`; movement/push counters remained zero. |
| Stale command after UI route change | Rejected; new route stayed at its initial state. |
| Recorded demo | Live move and restart rejected; recorded board stayed at zero moves. |
| Seeded restart | `webmcp-check` seed and initial actor positions preserved. |
| Browser console | No warning/error entries during these checks. |

These are integration smoke checks by Codex, separate from the eight-task TrueForge benchmark. Automated coverage also checks malformed inputs, current-state/reducer parity, cancellation, native and legacy registration cleanup, unsupported browsers, and rollback after partial registration failure. The frozen engine, benchmark tasks, scorer, skill and saved traces are unchanged.
