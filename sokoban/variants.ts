import { initialState, isWon, step, validateLevel, type Direction, type Level, type Position } from "./engine.js";

export const VARIANT_VERSION = "reverse-pull-v2";
const DIRECTIONS: readonly Direction[] = ["up", "right", "down", "left"];
const MAX_ATTEMPTS = 48;
const MAX_WORK = 8_000;
const MIN_SCRAMBLE_TARGET = 48;
const MAX_SCRAMBLE_TARGET = 80;
const MIN_VALID_WITNESS = 2;
const MAX_SEED_LENGTH = 128;

export interface VariantMetadata {
  readonly version: string;
  readonly seed: string | number;
}

export interface VariantPuzzle extends Level {
  readonly baseName: string;
}

export interface VariantAvailable {
  readonly ok: true;
  readonly metadata: VariantMetadata;
  readonly puzzle: VariantPuzzle;
}

export interface VariantUnavailable {
  readonly ok: false;
  readonly metadata: VariantMetadata;
  readonly reason: "unavailable";
}

export type VariantResult = VariantAvailable | VariantUnavailable;

type MutableState = { duck: Position; parcels: Position[] };

const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const key = ([x, y]: Position) => `${x},${y}`;
const copy = (p: Position): Position => [p[0], p[1]];
const hashSeed = (base: Level, seed: string | number): number => {
  const text = `${VARIANT_VERSION}\0${base.name}\0${base.terrain.join("\n")}\0${seed}`;
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0 || 1;
};

function rngFor(base: Level, seed: string | number, attempt: number): () => number {
  let value = (hashSeed(base, seed) ^ Math.imul(attempt + 1, 0x9e3779b9)) >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 0x100000000;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function floorCells(base: Level): Position[] {
  const cells: Position[] = [];
  for (let y = 0; y < base.terrain.length; y += 1) {
    for (let x = 0; x < base.terrain[y].length; x += 1) {
      if (base.terrain[y][x] !== "#") cells.push([x, y]);
    }
  }
  return cells;
}

function occupied(state: MutableState, position: Position): boolean {
  return state.parcels.some((parcel) => same(parcel, position)) || same(state.duck, position);
}

function reverseWalk(base: Level, goals: Position[], duck: Position, random: () => number): { puzzle: MutableState; witness: Direction[]; moved: number; minPushDistance: number } {
  const state: MutableState = { duck: copy(duck), parcels: goals.map(copy) };
  const witness: Direction[] = [];
  const steps = MIN_SCRAMBLE_TARGET + Math.floor(random() * (MAX_SCRAMBLE_TARGET - MIN_SCRAMBLE_TARGET + 1));
  let work = 0;
  for (let i = 0; i < steps; i += 1) {
    const candidates: Array<{ state: MutableState; direction: Direction; push: boolean }> = [];
    for (const direction of shuffle(DIRECTIONS, random)) {
      work += 1;
      if (work > MAX_WORK) break;
      const [dx, dy] = ({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const)[direction];
      const adjacent: Position = [state.duck[0] + dx, state.duck[1] + dy];
      const behind: Position = [state.duck[0] - dx, state.duck[1] - dy];
      const inFloor = (p: Position) => p[1] >= 0 && p[1] < base.terrain.length && p[0] >= 0 && p[0] < base.terrain[0].length && base.terrain[p[1]][p[0]] !== "#";
      const parcelIndex = state.parcels.findIndex((parcel) => same(parcel, adjacent));
      if (parcelIndex >= 0 && inFloor(behind) && !state.parcels.some((parcel, index) => index !== parcelIndex && same(parcel, behind))) {
        const parcels = state.parcels.map(copy);
        parcels[parcelIndex] = copy(state.duck);
        candidates.push({ state: { duck: copy(behind), parcels }, direction, push: true });
      } else if (inFloor(adjacent) && !occupied(state, adjacent)) {
        const opposite: Direction = direction === "up" ? "down" : direction === "down" ? "up" : direction === "left" ? "right" : "left";
        candidates.push({ state: { duck: copy(adjacent), parcels: state.parcels.map(copy) }, direction: opposite, push: false });
      }
    }
    const pulling = candidates.filter((candidate) => candidate.push);
    if (!candidates.length) break;
    const pool = pulling.length ? pulling : candidates;
    const chosen = pool[Math.floor(random() * pool.length)];
    state.duck = chosen.state.duck;
    state.parcels = chosen.state.parcels;
    witness.push(chosen.direction);
  }
  const offGoal = state.parcels.filter((parcel) => !goals.some((goal) => same(parcel, goal))).length;
  const offGoalParcels = state.parcels.filter((parcel) => !goals.some((goal) => same(parcel, goal)));
  const minPushDistance = offGoal ? Math.min(...offGoalParcels.map((parcel) => Math.min(...goals.map((goal) => Math.abs(parcel[0] - goal[0]) + Math.abs(parcel[1] - goal[1]))))) : 0;
  return { puzzle: state, witness: witness.reverse(), moved: offGoal, minPushDistance };
}

function normalizedPositions(positions: readonly Position[]): string {
  return positions.map(key).sort().join(";");
}

function minimumAssignmentDistance(parcels: readonly Position[], goals: readonly Position[]): number {
  const used = new Set<number>();
  let best = Number.POSITIVE_INFINITY;
  const visit = (index: number, total: number): void => {
    if (total >= best) return;
    if (index === parcels.length) { best = total; return; }
    for (let goal = 0; goal < goals.length; goal += 1) {
      if (used.has(goal)) continue;
      used.add(goal);
      visit(index + 1, total + Math.abs(parcels[index][0] - goals[goal][0]) + Math.abs(parcels[index][1] - goals[goal][1]));
      used.delete(goal);
    }
  };
  visit(0, 0);
  return best;
}

function verified(base: Level, goals: Position[], candidate: MutableState, witness: Direction[], moved: number, minPushDistance: number): boolean {
  const puzzle = { ...base, goals, duck: candidate.duck, parcels: candidate.parcels };
  const requiredMoved = Math.min(2, candidate.parcels.length);
  const lowerBound = minimumAssignmentDistance(candidate.parcels, goals);
  if (witness.length < MIN_VALID_WITNESS || witness.length > 100 || moved < requiredMoved || lowerBound < Math.max(2, candidate.parcels.length) || minPushDistance < 1 || isWon(puzzle, initialState(puzzle))) return false;
  let state = initialState(puzzle);
  for (const direction of witness) state = step(puzzle, state, direction);
  return isWon(puzzle, state);
}

function normalizeSeed(seed: string | number): string {
  return String(seed).slice(0, MAX_SEED_LENGTH);
}

export function generateVariant(base: Level, seed: string | number): VariantResult {
  validateLevel(base);
  const normalizedSeed = normalizeSeed(seed);
  const metadata = { version: VARIANT_VERSION, seed: normalizedSeed } as const;
  const floors = floorCells(base);
  if (floors.length <= base.parcels.length + 1) return { ok: false, metadata, reason: "unavailable" };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const random = rngFor(base, normalizedSeed, attempt);
    const selected = shuffle(floors, random);
    const goals = selected.slice(0, base.parcels.length);
    const duck = selected.find((cell) => !goals.some((goal) => same(goal, cell)));
    if (!duck) continue;
    const scrambled = reverseWalk(base, goals, duck, random);
    if (scrambled.witness.length > 100) continue;
    const puzzle = { ...base, baseName: base.name, duck: copy(scrambled.puzzle.duck), parcels: scrambled.puzzle.parcels.map(copy), goals: goals.map(copy) };
    if (normalizedPositions(puzzle.parcels) === normalizedPositions(base.parcels) && normalizedPositions(puzzle.goals) === normalizedPositions(base.goals)) continue;
    if (!verified(base, goals, scrambled.puzzle, scrambled.witness, scrambled.moved, scrambled.minPushDistance)) continue;
    return { ok: true, metadata, puzzle };
  }
  return { ok: false, metadata, reason: "unavailable" };
}
