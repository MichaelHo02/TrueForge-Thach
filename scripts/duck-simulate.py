"""Execute the canonical generated JS in a Python-only TrueForge sandbox.

Install quickjs in the sandbox, then pass engine.browser.js, level.json, plan.json.
This adapter contains no movement rules. Official scoring remains external.
"""
import json
import sys
from pathlib import Path
from quickjs import Context

engine_file, level_file, plan_file = sys.argv[1:]
level = json.loads(Path(level_file).read_text())
plan = json.loads(Path(plan_file).read_text())
if (not isinstance(plan, dict) or set(plan) != {"moves"}
        or not isinstance(plan["moves"], list) or len(plan["moves"]) > 100
        or any(move not in ("up", "down", "left", "right") for move in plan["moves"])):
    raise ValueError("Expected a moves-only plan with at most 100 directions")
context = Context()
context.set_memory_limit(32 * 1024 * 1024)
context.set_time_limit(2)
context.eval(Path(engine_file).read_text())
payload = json.dumps({"level": level, "moves": plan["moves"]})
result = context.eval("""((payload) => {
  const engine = globalThis.__DUCK_DELIVERY_ENGINE__;
  let state = engine.initialState(payload.level);
  const trace = [engine.serialize(state)];
  for (const move of payload.moves) {
    state = engine.step(payload.level, state, move);
    trace.push(engine.serialize(state));
  }
  return JSON.stringify({state, trace, attemptedMoves: payload.moves.length,
    solved: engine.isWon(payload.level, state)});
})(""" + payload + ")")
print(result)
