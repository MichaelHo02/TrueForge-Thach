export type Direction = "up" | "down" | "left" | "right";
export type Position = readonly [number, number];
export type Terrain = readonly string[];

export interface Level { readonly name: string; readonly terrain: Terrain; readonly duck: Position; readonly parcels: readonly Position[]; readonly goals: readonly Position[]; }
export interface GameState { readonly duck: Position; readonly parcels: readonly Position[]; readonly moves: number; readonly pushes: number; }
export interface ReplayResult { readonly trace: readonly string[]; readonly finalState: GameState; readonly attempts: number; readonly won: boolean; }

export const directionDelta: Record<Direction, Position> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRECTIONS = new Set<Direction>(Object.keys(directionDelta) as Direction[]);
const key = ([x, y]: Position) => `${x},${y}`;
const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const occupied = (parcels: readonly Position[], p: Position) => parcels.findIndex((parcel) => same(parcel, p));

export function validateLevel(level: Level): void {
  const width = level.terrain[0]?.length ?? 0;
  if (!level.terrain.length || !width || level.terrain.some((row) => row.length !== width)) throw new Error("terrain must be a nonempty rectangle");
  if (!level.parcels.length || level.parcels.length !== level.goals.length) throw new Error("parcel and goal counts must be nonempty and equal");
  const inBounds = (p: Position) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < width;
  const floor = (p: Position) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
  if (![level.duck, ...level.parcels, ...level.goals].every(floor)) throw new Error("actors and goals must be on floor");
  const actors = [level.duck, ...level.parcels];
  if (actors.some((p, index) => actors.some((other, otherIndex) => index !== otherIndex && same(p, other)))) throw new Error("actors cannot overlap");
}

export function initialState(level: Level): GameState { validateLevel(level); return { duck: [...level.duck], parcels: level.parcels.map((p) => [...p]), moves: 0, pushes: 0 }; }
export function step(level: Level, state: GameState, direction: Direction): GameState {
  const [dx, dy] = directionDelta[direction];
  const next: Position = [state.duck[0] + dx, state.duck[1] + dy];
  const inBounds = (p: Position) => p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < level.terrain[0].length;
  const isOpen = (p: Position) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
  if (!isOpen(next)) return state;
  const parcelIndex = occupied(state.parcels, next);
  if (parcelIndex < 0) return { duck: [...next], parcels: state.parcels.map((p) => [...p]), moves: state.moves + 1, pushes: state.pushes };
  const beyond: Position = [next[0] + dx, next[1] + dy];
  if (!inBounds(beyond) || !isOpen(beyond) || occupied(state.parcels, beyond) >= 0) return state;
  return { duck: [...next], parcels: state.parcels.map((p, i) => i === parcelIndex ? [...beyond] : [...p]), moves: state.moves + 1, pushes: state.pushes + 1 };
}
export function isWon(level: Level, state: GameState): boolean { return state.parcels.every((parcel) => level.goals.some((goal) => same(parcel, goal))); }
export function serialize(state: GameState): string { return JSON.stringify({ duck: state.duck, parcels: [...state.parcels].sort((a, b) => key(a).localeCompare(key(b))), moves: state.moves, pushes: state.pushes }); }
export function hash(state: GameState): string { return serialize(state); }
export function plan(moves: readonly Direction[]): { moves: Direction[] } { validatePlan(moves); return { moves: [...moves] }; }
export function validatePlan(moves: unknown): asserts moves is readonly Direction[] {
  if (!Array.isArray(moves) || moves.length > 100 || moves.some((move) => typeof move !== "string" || !DIRECTIONS.has(move as Direction))) throw new Error("plan must contain at most 100 valid directions");
}
export function replay(level: Level, moves: unknown): ReplayResult {
  validatePlan(moves);
  let state = initialState(level);
  const trace = [serialize(state)];
  for (const direction of moves) { state = step(level, state, direction); trace.push(serialize(state)); }
  return { trace: Object.freeze([...trace]), finalState: state, attempts: moves.length, won: isWon(level, state) };
}
export function cornerDeadlocks(level: Level, state: GameState): readonly Position[] {
  const goalKeys = new Set(level.goals.map(key));
  const width = level.terrain[0].length;
  const isWall = (x: number, y: number) => y < 0 || y >= level.terrain.length || x < 0 || x >= width || level.terrain[y][x] === "#";
  return state.parcels.filter(([x, y]) => !goalKeys.has(key([x, y])) && ((isWall(x - 1, y) || isWall(x + 1, y)) && (isWall(x, y - 1) || isWall(x, y + 1))));
}
