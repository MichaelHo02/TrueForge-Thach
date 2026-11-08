---
name: duck-planning
description: Plan legal Sokoban deliveries for Duck Delivery and check parcel pushes before committing a move sequence.
---

# Duck Delivery planning

Read the complete puzzle before planning. Coordinates are zero-based `[x,y]`, with x increasing right and y increasing down. Terrain and goal positions are fixed. The duck can walk and push exactly one parcel into an empty floor square; it cannot pull parcels or push a chain.

## Planning procedure

**Step 1: Identify parcels and goals**
- Match each parcel to its goal (by position or context).
- Note the parcel's current position and the target goal position.

**Step 2: Analyze reachability and pushing geometry**
- For each parcel to reach its goal, determine the sequence of push directions (up/down/left/right).
- For each push direction D, identify the "pushing position"—the square where the duck must stand to push the parcel in direction D.
- Check terrain: ensure all pushing positions and intermediate parcel positions are on walkable floor (not walls, not on other parcels).

**Step 3: Plan parcel delivery order**
- Start with parcels that are easiest to reach or least constrained.
- Prioritize parcels that, once delivered, open up space or paths for remaining parcels.
- Ensure the duck can traverse from its current position to each pushing position without blocking already-delivered parcels.

**Step 4: Construct and validate a complete move sequence**
- Build the full sequence of duck moves (walk + push) to deliver all parcels.
- Walk through the sequence mentally or by hand to check:
  - No move lands on a wall or blocked square.
  - Each push finds the parcel at the expected position and pushes to an empty destination.
  - The duck can reposition between pushes without stranding parcels in corners.
- If blocked, reroute or reorder deliveries.

**Step 5: Validate once with the canonical engine**
- Save the complete sequence to `/tmp/plan.json`.
- Load the puzzle, call the canonical adapter once, and verify `solved==true`.
- If `solved==true`: immediately output the JSON plan and stop.
- If `solved==false`: analyze the failure point in the trace (which move failed? where is each parcel?), refine the sequence, and submit your best effort.

**Do not re-test or iterate multiple times within one submission window.** The execution budget is fixed. Use the single validation to catch only the most obvious errors (blocked moves, state mismatch), then commit.

**Step 6: Return the moves-only JSON object**
- Return exactly `{"moves": [array of valid direction strings]}`.
- Contain only `"up"`, `"down"`, `"left"`, or `"right"`.
- Do not include source code, commentary, board state, or goal assignments.

## Handling failure on a second submission

If given failure feedback after a second attempt, the puzzle resets to its initial board. Do not assume the previous state. Read the board again, re-analyze geometry, and plan independently. Focus on systematic state exploration: consider using breadth-first search (BFS) within the sandbox to find reachable pushing positions if manual planning is unclear. Never claim all parcels are delivered unless the canonical engine confirms `solved==true`.

## Constraints and heuristics

- **Move budget**: max 100 moves per submission, two submissions per puzzle.
- **Prefer efficiency**: shorter paths reduce backtracking and leave room for complex deliveries.
- **Avoid corner deadlocks**: do not push a parcel into a corner surrounded by walls where it cannot be pushed further. Check the `cornerDeadlocks` engine function if uncertain.
- **Respect goal positions as floors**: goals are walkable; delivered parcels remain on goals and do not become obstacles.
- **One parcel at a time**: only one parcel can occupy a cell. Plan routes that do not require two parcels in the same push chain.

---
