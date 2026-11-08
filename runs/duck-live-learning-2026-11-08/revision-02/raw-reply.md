I need to understand the core issue from the development failures and create a fundamentally improved planning procedure.

The v4 failure trace shows:

1. **First attempt**: Exhausted iteration limit by manually tracing positions, failing to construct a valid plan.
2. **Second attempt**: Created a plan but after the first push, navigation attempts (moves 17-21) all failed silently—duck got stuck at [2,2] instead of reaching [6,3]. The parcel deliveries were incomplete.

**Root cause**: Manual geometry analysis without systematic state validation led to invalid move sequences. The skill relied on mental tracing rather than programmatic planning. The v4 skill itself suggested BFS/search as a fallback but never actually implemented it as the primary strategy.

**The lesson learned**: Switch from manual move construction to **systematic state-space search (BFS)** that uses the canonical engine for ALL state transitions, ensuring every move is validated before committing. Plan must also handle re-positioning automatically by searching for valid paths.

---

---
name: duck-planning
description: Plan legal Sokoban deliveries for Duck Delivery and check parcel pushes before committing a move sequence.
---

# Duck Delivery planning

Read the complete puzzle before planning. Coordinates are zero-based `[x,y]`, with x increasing right and y increasing down. Terrain and goal positions are fixed. The duck can walk and push exactly one parcel into an empty floor square; it cannot pull parcels or push a chain.

## Planning procedure

**Step 1: Fetch and validate the board**
- Call `duck_get_board` to retrieve the live puzzle state.
- Parse the returned level: terrain (walls), duck position, parcel positions, and goal positions.
- Verify all parcels have unique goals and all actors are on walkable floor.

**Step 2: Build a bounded state-space search**
- Implement breadth-first search (BFS) within a fixed iteration budget to explore reachable states.
- Each state tracks: duck position, parcel positions (sorted), moves executed.
- For each state, generate all four direction moves (up/down/left/right).
- Use the canonical engine's `step` function to simulate each move and obtain the resulting state.
- Deduplicate states via serialization to avoid revisiting; maintain a parent map for plan reconstruction.
- Stop when a goal state is found (all parcels at their assigned goals) or budget is exhausted.

**Step 3: Reconstruct the plan**
- If a goal state is reached during search, backtrack through the parent map to recover the sequence of moves from the initial state.
- If search exhausts the budget without finding a solution, use the best partial plan found (fewest uncompleted parcels, or longest valid prefix).

**Step 4: Assign parcels to goals**
- Match each parcel to a goal using spatial proximity or context.
- Ensure each parcel has a unique goal (1:1 mapping).
- If ambiguous, use the order in which parcels and goals are listed in the level.

**Step 5: Validate the final plan once with the canonical engine**
- Save the reconstructed move sequence to `/tmp/plan.json` as `{"moves": [array of direction strings]}`.
- Call the canonical adapter to replay the plan: `python3 /tmp/adapter.py /tmp/engine.js /tmp/level.json /tmp/plan.json`.
- Parse the returned trace and check the `solved` field.
- If `solved==true`: immediately return the moves-only JSON and terminate.
- If `solved==false`: do NOT re-run search or re-test. Output the moves that were generated.

**Step 6: Return the moves-only JSON object**
- Return exactly `{"moves": [array of valid direction strings]}`.
- Contain only `"up"`, `"down"`, `"left"`, or `"right"`.
- Do not include source code, commentary, board state, goal assignments, or trace data.

## Handling failure on a second submission

If given failure feedback after a second attempt, the puzzle resets to its initial board. Read the board again via `duck_get_board`, re-parse the level, and run a fresh BFS from the new initial state. Do not assume previous parcel or duck positions. The search budget is the same; use it to explore systematically. Focus on finding any valid move sequence that advances parcels toward goals. Never claim all parcels are delivered unless the canonical engine confirms `solved==true`.

## BFS implementation guidance

- **State representation**: `{ duck: [x, y], parcels: [[x1, y1], ...], moves: 0, pushes: 0 }`. Serialize parcels in sorted order for consistent deduplication.
- **Transition function**: Call `globalThis.__DUCK_DELIVERY_ENGINE__.step(level, state, direction)` for each direction. The engine enforces all collision, wall, and push rules.
- **Goal test**: `isWon(level, state)` returns true iff every parcel position matches a goal position.
- **Search limit**: Explore up to 12 loop iterations (per solver session constraint). Each iteration expands one state and may generate up to 4 children. Plan for ~1000–5000 reachable states depending on puzzle size.
- **Parcel assignment**: Precompute a stable mapping from parcel index to goal index before search begins.

## Constraints and heuristics

- **Move budget**: max 100 moves per submission, two submissions per puzzle.
- **Efficient search**: Use a queue (FIFO) for BFS. Prune states that exceed 100 moves or revisit a known configuration.
- **No manual geometry guessing**: All move validation is delegated to the canonical engine; never implement custom collision or push logic.
- **Delivered parcels occupy cells**: Goals are walkable floors; parcels remain on goals and do not disappear.
- **One parcel per cell**: The engine enforces this; a push fails if the destination cell already holds another parcel.
- **Avoid re-validation**: After the single canonical replay, trust the result. Do not attempt alternative plans or manual corrections within one submission.

---