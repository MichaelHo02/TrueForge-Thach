# TrueForge to the live browser

The live integration uses this path:

`TrueForge + registered duck-planning:3 → temporary remote MCP relay → local browser worker → native webpage WebMCP → existing React reducer/canonical engine`

The relay is not a solver or simulator. It cannot generate plans, read repository files, execute code, or supply recorded answers. It queues bounded game commands for a browser worker. The worker calls the browser's actual WebMCP tools and returns their native receipts. The `duck_play_plan` MCP helper expands an agent-provided plan into individual `duck_move` WebMCP calls, checking each returned revision. A changed/locked board stops the operation. It never changes a model's moves to make them succeed.

## Agent configuration

The saved demonstration agent is `duck-delivery-live-webmcp`, with Claude Haiku `claude-haiku-4-5-20251001`, sandbox enabled, iteration limit 12, and the unchanged registered skill `agent-skill:stranger-builds/default/duck-planning:3`. Its connector is `duck-live-webmcp`.

The live agent's system instructions add a transport extension: after the learned planning procedure and canonical validation, send the same plan to the live browser and inspect its receipts before returning the final JSON. This differs from the benchmark's final-answer-only submission protocol. The learned SKILL.md is unchanged, but the instructions and tool environment are different; these integration trials do not replace or add to benchmark scores.

MCP tools are preloaded for the later trials to reduce discovery overhead. Skill preloading remains off, so the trace can establish that the agent read the complete registered skill. The initial trial without tool preloading failed: its two-parcel plan was invalid, it retried validation despite the stop instruction, and it exhausted its 12-iteration limit before live execution. That negative trial is retained alongside successful/unsuccessful subsequent trials.

## Run the temporary bridge

The browser worker uses the authorized Codex browser REPL's existing tab handle. It does not launch a browser or bypass browser permissions. With the published game open and its real WebMCP tools discovered:

```js
const {connectBrowserWorker} = await import('/absolute/checkout/scripts/webmcp-browser-worker.mjs');
const worker = await connectBrowserWorker(gameTab, '/private/tmp/duck-live-runtime');
// Repeat while a TrueForge tool call is waiting. Each pump is bounded.
await worker.pump(40000);
```

Discovery writes `tools.json` using the active page's real schemas. Generate a random private path such as `/mcp/<48 random hex characters>` in a mode-0600 file, then start the Python standard-library server:

```sh
python3 scripts/webmcp-bridge.py \
  --queue-dir /private/tmp/duck-live-runtime \
  --tools /private/tmp/duck-live-runtime/tools.json \
  --path-file /private/tmp/duck-live-runtime/mcp-path \
  --port 4180
```

For the hosted agent, a temporary tunnel can expose this loopback server. Register its full capability URL as a remote MCP server in the TrueFoundry gateway and attach the four game tools to a dedicated live agent. Never put the capability path, tunnel credentials or provider credentials in Git. Stop the relay/tunnel when finished. This is a supervised local bridge, not an always-on hosted browser service; new runs require an active browser worker and relay.

Use a fresh TrueForge session for each route. Ask it to read the full v3 skill, fetch the live board, plan independently, save its plan, validate once with the supplied canonical JS/QuickJS adapter, then call `duck_play_plan`. Supply only the canonical engine and adapter, never a solution. The operator can select the next route between sessions; all movement within a run comes from the model's tool arguments.

`native-calls.jsonl` records the exact browser tool inputs/results and timestamps; queue jobs/results record the MCP request. Native browser screencast frames and expanded TrueForge trace captures support the edited recording. Preserve failed trials and distinguish edits to waiting time from model inference speed. The existing narrated benchmark video predates this connection.

## Checks

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/webmcp-bridge-test.py
npm run verify
npm run typecheck
```

Relay tests cover invalid/unbounded plans, actual worker-receipt forwarding, concurrent-operation rejection and timeouts without invented success. Browser integration additionally verifies that model-originated calls change the public page and that final `won`/counters match the native receipts.
