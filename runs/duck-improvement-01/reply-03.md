```json
{
  "diagnosis": {
    "rootCause": "Agents consistently fail to return valid JSON move sequences before iteration limit, producing 'Unexpected end of JSON input' errors in all submission attempts. The skill instructions are read and planning occurs in sandbox, but no moves array ever reaches the submission validator. This indicates the agent exhausts its 12-iteration budget on exploratory planning and testing without completing a well-formed final JSON submission.",
    "evidence": [
      {
        "sessionId": "01m6wf2sq10xaahj4ck2kjjw4x",
        "observation": "Session reads skill, sets up simulator engine, visualizes puzzle, traces multiple failed move sequences in sandbox (up to 13 moves planned), but hits iteration_limit with empty moves array in canonicalFeedback. No JSON submission produced."
      },
      {
        "sessionId": "01m6wfvy4mdnwnc88x6kxdgzet",
        "observation": "Agent plans 15-move solution with canonical engine validation showing partial success (1 parcel pushed), explores alternative paths over multiple tool calls, reaches 12-iteration limit before submitting a complete plan. Error again shows 'Unexpected end of JSON input' with zero attempted moves."
      },
      {
        "sessionId": "01m6wf40kqvpdqmh8gamtbdfbb",
        "observation": "Baseline round 2: Agent successfully validates a 15-move solution in sandbox (solved: true), but does not convert this working plan into a JSON submission before iteration exhaustion. All 12 tools used on analysis and testing; none on final JSON output."
      },
      {
        "sessionId": "01m6wfjh79x3aecn6mwwx4n06g",
        "observation": "Multiple attempts to plan and simulate (18, 28-move sequences tested), but each time blocked moves are encountered and the agent re-plans. Iteration limit reached; final submission payload empty."
      }
    ]
  },
  "skillMarkdown": "---\nname: duck-planning\ndescription: Plan legal Sokoban deliveries for Duck Delivery and check parcel pushes before committing a move sequence.\n---\n\n# Duck Delivery planning\n\nRead the complete puzzle before planning. Coordinates are zero-based `[x,y]`, with x increasing right and y increasing down. Terrain and goal positions are fixed. The duck can walk and push exactly one parcel into an empty floor square; it cannot pull parcels or push a chain.\n\n1. Identify each parcel, its candidate goal, and the square the duck must occupy behind it for each push.\n2. Plan a route, tracking the duck and every parcel after each push. Do not treat a goal as a wall or remove a delivered parcel from the board.\n3. Check walls, other parcels, and the duck's ability to reach the next pushing position. Prefer a short route that leaves room to maneuver.\n4. Use the sandbox to check the proposed sequence with the supplied canonical simulator when it is available. Respect the task's simulation and submission limits.\n5. Complete one tool call to validate your final plan in the sandbox, then immediately return the JSON result without further iteration.\n6. Return one JSON object with exactly a `moves` array containing only `up`, `down`, `left`, or `right`. Do not return source code, commentary, or a new level.\n\nIf given failure feedback for a second submission, start planning again from the original puzzle. Do not continue from the failed final state. Never claim delivery unless every parcel is on a goal."
}
```