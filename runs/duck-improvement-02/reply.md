```json
{
  "diagnosis": {
    "rootCause": "Agents consistently exhaust the 12-iteration limit while planning and testing moves in the sandbox, never completing a final JSON submission. The root cause is a **planning-execution loop**: agents spend iterations reading the skill, setting up the simulator, visualizing the puzzle, and incrementally testing partial plans via the canonical engine. Each failed or blocked move sequence triggers re-planning, consuming another iteration on analysis and testing rather than committing a complete, validated solution.",
    "whyV2Failed": "The v2 reminder to 'validate your final plan in the sandbox, then immediately return the JSON result' fails because it does not break the loop structure. Agents interpret 'validate' as one more test iteration—they plan, test incrementally on failing puzzles (each test is a tool call), discover the plan is incomplete, and loop back to re-plan. By iteration 11–12, the agent is still in sandbox analysis mode with no JSON submitted. The instruction assumes the agent already has a correct plan ready to validate; it does not force the agent to commit a plan when validation fails or when the plan is incomplete.",
    "evidence": [
      {
        "sessionId": "01m6whav24tpekm29dxhjpbc0n",
        "observation": "12 tool calls spent on: read skill (1), save engine (2), install quickjs (1), analyze puzzle (1), test plan incrementally (6), debug path (1). Final submission never created. Agent ends at iteration 12 while debugging failed moves at step 15 of a 13-move sequence—actively problem-solving rather than submitting JSON."
      },
      {
        "sessionId": "01m6whgnq7d95m6cyewakpkcwy",
        "observation": "12 tool calls: read skill, set up simulator (2), install quickjs, analyze puzzle (1), plan solution (2), test plan (2), re-analyze terrain (1), revise plan (1), test revision (1). Final submission never reached. Agent is re-planning (iteration 11–12) after discovering move 15 was incorrect, without ever submitting a candidate."
      },
      {
        "sessionId": "01m6whkx2bgegm9yyahentrnrn",
        "observation": "Agent completes 12 tool calls: setup (3), analyze (1), plan (2), test plan (2), debug trace (1), revise plan (2), starts test of revision at iteration 12. Pattern shows test-failures force re-planning, consuming all iterations before submission is attempted."
      },
      {
        "sessionId": "01m6whqnskk45gexzj5vxm5af3",
        "observation": "All 12 calls spent on: read skill, setup (2), install, visualize (1), plan (2), test in sandbox (2), analyze failure trace (1), create revised plan (2). Never submits JSON. The sandbox testing phase loops: test fails → analyze why → revise → test again, exhausting iterations."
      }
    ]
  },
  "skillMarkdown": "---\nname: duck-planning\ndescription: Plan legal Sokoban deliveries for Duck Delivery and check parcel pushes before committing a move sequence.\n---\n\n# Duck Delivery planning\n\nRead the complete puzzle before planning. Coordinates are zero-based `[x,y]`, with x increasing right and y increasing down. Terrain and goal positions are fixed. The duck can walk and push exactly one parcel into an empty floor square; it cannot pull parcels or push a chain.\n\n1. Identify each parcel, its candidate goal, and the square the duck must occupy behind it for each push.\n2. Plan a route, tracking the duck and every parcel after each push. Do not treat a goal as a wall or remove a delivered parcel from the board.\n3. Check walls, other parcels, and the duck's ability to reach the next pushing position. Prefer a short route that leaves room to maneuver.\n4. Use the sandbox to check the proposed sequence with the supplied canonical simulator when it is available. Respect the task's simulation and submission limits.\n5. **Plan completely before testing. Complete exactly one tool call that (a) loads the puzzle, (b) saves your full move sequence to /tmp/plan.json, (c) calls the canonical adapter, and (d) checks if solved==true. If solved==true, immediately print the JSON plan and stop. If solved==false, do not test again—submit your best effort immediately as JSON with no further iteration.**\n6. Return one JSON object with exactly a `moves` array containing only `up`, `down`, `left`, or `right`. Do not return source code, commentary, or a new level.\n\nIf given failure feedback for a second submission, start planning again from the original puzzle. Do not continue from the failed final state. Never claim delivery unless every parcel is on a goal."
}
```

**Explanation of the change:**

The v3 modification **replaces step 5** with a mandatory **single-tool-call procedure** that enforces commitment:

- **One test call maximum** combining all steps: puzzle load → plan save → simulator execution → result check.
- **Conditional submission logic**: If `solved==true`, print JSON and terminate. If `solved==false`, the agent must submit its best plan anyway (no retry).
- This eliminates the loop: agents cannot re-plan after a test because the rule forbids "further iteration" after step 5 completes.

The instruction is concrete and repeatable: the agent must structure its single validation call to atomically produce and test a JSON plan, then decide to submit or accept failure—not to loop back to analysis.