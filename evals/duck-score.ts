import { initialState, isWon, serialize, step, type Direction, type Level } from '../sokoban/engine.js';

export const DUCK_PROTOCOL = Object.freeze({ version: 1, maxSubmissions: 2, maxMoves: 100 });
const directions = new Set(['up', 'down', 'left', 'right']);

export function parsePlan(raw: unknown): { moves: Direction[] } {
  // Permit one whole-response JSON fence, but never extract a plan from prose.
  const text = typeof raw === 'string' ? raw.trim() : null;
  const fenced = text?.match(/^```json\s*\n([\s\S]*?)\n```$/);
  const value = text !== null ? JSON.parse(fenced ? fenced[1] : text) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 1 || !Array.isArray(value.moves) ||
      value.moves.length > DUCK_PROTOCOL.maxMoves ||
      value.moves.some((move: unknown) => typeof move !== 'string' || !directions.has(move))) {
    throw new Error('Expected exactly {"moves":[directions]}, with at most 100 moves');
  }
  return { moves: [...value.moves] };
}

export function evaluateSubmission(level: Level, raw: unknown) {
  // Initial state is reconstructed for EVERY submission, including after failure.
  let state = initialState(level);
  const trace = [serialize(state)];
  let moves: Direction[];
  try { moves = parsePlan(raw).moves; }
  catch (error) {
    return { valid: false, solved: false, attemptedMoves: 0, blockedMoves: 0,
      error: (error as Error).message, moves: [] as Direction[], trace };
  }
  let blockedMoves = 0;
  for (const direction of moves) {
    const next = step(level, state, direction);
    if (next === state) blockedMoves++;
    state = next;
    trace.push(serialize(state));
  }
  return { valid: true, solved: isWon(level, state), attemptedMoves: moves.length,
    blockedMoves, error: null, moves, trace };
}

export function evaluatePuzzle(level: Level, submissions: unknown[]) {
  if (submissions.length > DUCK_PROTOCOL.maxSubmissions) throw new Error('Third submission is forbidden');
  const attempts = submissions.map(raw => evaluateSubmission(level, raw));
  return { solved: attempts.some(attempt => attempt.solved), submissionsUsed: attempts.length, attempts };
}

export function scorePuzzles(results: Array<{ solved: boolean }>): number {
  if (!results.length) throw new Error('Cannot score an empty task set');
  return 100 * results.filter(result => result.solved).length / results.length;
}
