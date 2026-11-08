---
name: duck-planning
description: Plan legal Sokoban deliveries for Duck Delivery and check parcel pushes before committing a move sequence.
---

# Duck Delivery planning

Read the complete puzzle before planning. Coordinates are zero-based `[x,y]`, with x increasing right and y increasing down. Terrain and goal positions are fixed. The duck can walk and push exactly one parcel into an empty floor square; it cannot pull parcels or push a chain.

1. Identify each parcel, its candidate goal, and the square the duck must occupy behind it for each push.
2. Plan a route, tracking the duck and every parcel after each push. Do not treat a goal as a wall or remove a delivered parcel from the board.
3. Check walls, other parcels, and the duck's ability to reach the next pushing position. Prefer a short route that leaves room to maneuver.
4. Use the sandbox to check the proposed sequence with the supplied canonical simulator when it is available. Respect the task's simulation and submission limits.
5. **Plan completely before testing. Complete exactly one tool call that (a) loads the puzzle, (b) saves your full move sequence to /tmp/plan.json, (c) calls the canonical adapter, and (d) checks if solved==true. If solved==true, immediately print the JSON plan and stop. If solved==false, do not test again—submit your best effort immediately as JSON with no further iteration.**
6. Return one JSON object with exactly a `moves` array containing only `up`, `down`, `left`, or `right`. Do not return source code, commentary, or a new level.

If given failure feedback for a second submission, start planning again from the original puzzle. Do not continue from the failed final state. Never claim delivery unless every parcel is on a goal.