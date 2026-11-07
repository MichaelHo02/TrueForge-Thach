// GENERATED FILE. Source: sokoban/engine.ts; sha256=70c40ba1f3d1142c.
globalThis.__DUCK_DELIVERY_ENGINE__ = (() => {
const DELTAS = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};
function key([x, y]) { return `${x},${y}`; }
function same(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function occupied(parcels, p) { return parcels.findIndex((parcel) => same(parcel, p)); }
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
    const [dx, dy] = DELTAS[direction];
    const next = [state.duck[0] + dx, state.duck[1] + dy];
    const inBounds = (p) => p[1] >= 0 && p[1] < level.terrain.length && p[0] >= 0 && p[0] < level.terrain[0].length;
    const isOpen = (p) => inBounds(p) && level.terrain[p[1]][p[0]] !== "#";
    if (!isOpen(next))
        return state;
    const parcelIndex = occupied(state.parcels, next);
    let parcels = state.parcels;
    let pushes = state.pushes;
    if (parcelIndex >= 0) {
        const beyond = [next[0] + dx, next[1] + dy];
        if (!inBounds(beyond) || !isOpen(beyond) || occupied(state.parcels, beyond) >= 0)
            return state;
        parcels = state.parcels.map((p, i) => i === parcelIndex ? [...beyond] : [...p]);
        pushes += 1;
    }
    return { duck: [...next], parcels, moves: state.moves + 1, pushes };
}
function isWon(level, state) { return state.parcels.every((parcel) => level.goals.some((goal) => same(parcel, goal))); }
function serialize(state) { return JSON.stringify({ duck: state.duck, parcels: [...state.parcels].sort((a, b) => key(a).localeCompare(key(b))), moves: state.moves, pushes: state.pushes }); }
function hash(state) { return serialize(state); }
function plan(moves) { return { moves: [...moves] }; }
const directionDelta = DELTAS;

return { initialState, isWon, step, validateLevel, serialize, hash, plan, directionDelta };
})();
