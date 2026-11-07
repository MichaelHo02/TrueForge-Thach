/* Generated from sokoban/engine.ts; sha256=b1c7a7a9593b7ed1aa3c027f6daf99221571115f3d51632899e30ea1f3e4a8ae; do not edit. */
globalThis.__DUCK_DELIVERY_ENGINE__ = (() => {
const directionDelta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRECTIONS = new Set(Object.keys(directionDelta));
const key = ([x, y]) => `${x},${y}`;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const occupied = (parcels, p) => parcels.findIndex((parcel) => same(parcel, p));
function validateLevel(level) {
    const width = level.terrain[0]?.length ?? 0;
    if (!level.terrain.length || !width || level.terrain.some((row) => row.length !== width))
        throw new Error("terrain must be a nonempty rectangle");
    if (!level.parcels.length || level.parcels.length !== level.goals.length)
        throw new Error("parcel and goal counts must be nonempty and equal");
    const inBounds = (p) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < width;
    const floor = (p) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
    if (![level.duck, ...level.parcels, ...level.goals].every(floor))
        throw new Error("actors and goals must be on floor");
    const actors = [level.duck, ...level.parcels];
    if (actors.some((p, index) => actors.some((other, otherIndex) => index !== otherIndex && same(p, other))))
        throw new Error("actors cannot overlap");
}
function initialState(level) { validateLevel(level); return { duck: [...level.duck], parcels: level.parcels.map((p) => [...p]), moves: 0, pushes: 0 }; }
function step(level, state, direction) {
    const [dx, dy] = directionDelta[direction];
    const next = [state.duck[0] + dx, state.duck[1] + dy];
    const inBounds = (p) => p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < level.terrain[0].length;
    const isOpen = (p) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
    if (!isOpen(next))
        return state;
    const parcelIndex = occupied(state.parcels, next);
    if (parcelIndex < 0)
        return { duck: [...next], parcels: state.parcels.map((p) => [...p]), moves: state.moves + 1, pushes: state.pushes };
    const beyond = [next[0] + dx, next[1] + dy];
    if (!inBounds(beyond) || !isOpen(beyond) || occupied(state.parcels, beyond) >= 0)
        return state;
    return { duck: [...next], parcels: state.parcels.map((p, i) => i === parcelIndex ? [...beyond] : [...p]), moves: state.moves + 1, pushes: state.pushes + 1 };
}
function isWon(level, state) { return state.parcels.every((parcel) => level.goals.some((goal) => same(parcel, goal))); }
function serialize(state) { return JSON.stringify({ duck: state.duck, parcels: [...state.parcels].sort((a, b) => key(a).localeCompare(key(b))), moves: state.moves, pushes: state.pushes }); }
function hash(state) { return serialize(state); }
function plan(moves) { validatePlan(moves); return { moves: [...moves] }; }
function validatePlan(moves) {
    if (!Array.isArray(moves) || moves.length > 100 || moves.some((move) => typeof move !== "string" || !DIRECTIONS.has(move)))
        throw new Error("plan must contain at most 100 valid directions");
}
function replay(level, moves) {
    validatePlan(moves);
    let state = initialState(level);
    const trace = [serialize(state)];
    for (const direction of moves) {
        state = step(level, state, direction);
        trace.push(serialize(state));
    }
    return { trace: Object.freeze([...trace]), finalState: state, attempts: moves.length, won: isWon(level, state) };
}
function cornerDeadlocks(level, state) {
    const goalKeys = new Set(level.goals.map(key));
    const width = level.terrain[0].length;
    const isWall = (x, y) => y < 0 || y >= level.terrain.length || x < 0 || x >= width || level.terrain[y][x] === "#";
    return state.parcels.filter(([x, y]) => !goalKeys.has(key([x, y])) && ((isWall(x - 1, y) || isWall(x + 1, y)) && (isWall(x, y - 1) || isWall(x, y + 1))));
}
  return { directionDelta, validateLevel, initialState, step, isWon, serialize, hash, plan, validatePlan, replay, cornerDeadlocks };
})();
