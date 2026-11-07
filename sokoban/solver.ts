// Verification helper only. Never import this into the agent skill or browser UI.
import { initialState, isWon, step, type Direction, type GameState, type Level } from './engine.js';

const actions: Direction[] = ['up', 'down', 'left', 'right'];
const positionKey = (state: GameState) => JSON.stringify([state.duck, [...state.parcels].sort((a,b) => a[1]-b[1] || a[0]-b[0])]);

export function solveLevel(level: Level, maxMoves = 100, maxVisited = 200_000) {
  const initial = initialState(level);
  const queue = [{ state: initial, moves: [] as Direction[] }];
  const seen = new Set([positionKey(initial)]);
  let depthLimited = false;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    if (isWon(level, current.state)) return { status: 'solved' as const, moves: current.moves, visited: seen.size };
    if (current.moves.length >= maxMoves) { depthLimited = true; continue; }
    for (const action of actions) {
      const next = step(level, current.state, action);
      const key = positionKey(next);
      if (seen.has(key)) continue;
      if (seen.size >= maxVisited) return { status: 'search-cap' as const, moves: null, visited: seen.size };
      seen.add(key);
      queue.push({ state: next, moves: [...current.moves, action] });
    }
  }
  return { status: depthLimited ? 'move-cap' as const : 'unsolvable' as const, moves: null, visited: seen.size };
}
