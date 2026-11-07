export type Direction = "up" | "down" | "left" | "right";
export type Position = readonly [number, number];
export type Terrain = readonly string[];

export interface Level {
  readonly name: string;
  readonly terrain: Terrain;
  readonly duck: Position;
  readonly parcels: readonly Position[];
  readonly goals: readonly Position[];
}

export interface GameState {
  readonly duck: Position;
  readonly parcels: readonly Position[];
  readonly moves: number;
  readonly pushes: number;
}

const DELTAS: Record<Direction, Position> = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};

function key([x, y]: Position): string { return `${x},${y}`; }
function same(a: Position, b: Position): boolean { return a[0] === b[0] && a[1] === b[1]; }
function occupied(parcels: readonly Position[], p: Position): number { return parcels.findIndex((parcel) => same(parcel, p)); }

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
  const [dx, dy] = DELTAS[direction];
  const next: Position = [state.duck[0] + dx, state.duck[1] + dy];
  const inBounds = (p: Position) => p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < level.terrain[0].length;
  const isOpen = (p: Position) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
  if (!isOpen(next)) return state;
  const parcelIndex = occupied(state.parcels, next);
  let parcels = state.parcels;
  let pushes = state.pushes;
  if (parcelIndex >= 0) {
    const beyond: Position = [next[0] + dx, next[1] + dy];
    if (!inBounds(beyond) || !isOpen(beyond) || occupied(state.parcels, beyond) >= 0) return state;
    parcels = state.parcels.map((p, i) => i === parcelIndex ? [...beyond] : [...p]);
    pushes += 1;
  }
  return { duck: [...next], parcels, moves: state.moves + 1, pushes };
}

export function isWon(level: Level, state: GameState): boolean { return state.parcels.every((parcel) => level.goals.some((goal) => same(parcel, goal))); }
export function serialize(state: GameState): string { return JSON.stringify({ duck: state.duck, parcels: [...state.parcels].sort((a, b) => key(a).localeCompare(key(b))), moves: state.moves, pushes: state.pushes }); }
export function hash(state: GameState): string { return serialize(state); }
export function plan(moves: readonly Direction[]): { moves: Direction[] } { return { moves: [...moves] }; }
export const directionDelta = DELTAS;
