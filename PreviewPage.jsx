/* global React */
/* GENERATED ENGINE START: source=sokoban/engine.ts sha256=70c40ba1f3d1142c */
const __DUCK_DELIVERY_ENGINE__ = (() => {
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
const { initialState, isWon, step, validateLevel } = __DUCK_DELIVERY_ENGINE__;
/* GENERATED ENGINE END */

const DUCK_LEVELS = [
  { name: 'Dock 01', terrain: ['########', '#      #', '#  #   #', '#      #', '########'], duck: [1, 1], parcels: [[3, 1]], goals: [[6, 1]] },
  { name: 'Dock 02', terrain: ['########', '#      #', '# ##   #', '#      #', '########'], duck: [1, 3], parcels: [[2, 1]], goals: [[6, 1]] },
  { name: 'Dock 03', terrain: ['#########', '#       #', '# ###   #', '#       #', '#########'], duck: [1, 1], parcels: [[3, 1]], goals: [[7, 1]] },
];
DUCK_LEVELS.forEach(validateLevel);

function createGame(levelIndex) {
  return { levelIndex, state: initialState(DUCK_LEVELS[levelIndex]), history: [] };
}

function gameReducer(game, action) {
  if (action.type === 'select' || action.type === 'restart') {
    const levelIndex = action.type === 'select' ? action.levelIndex : game.levelIndex;
    return createGame(levelIndex);
  }
  if (action.type === 'undo') {
    if (!game.history.length) return game;
    return { ...game, state: game.history[game.history.length - 1], history: game.history.slice(0, -1) };
  }
  if (action.type === 'move') {
    const next = step(DUCK_LEVELS[game.levelIndex], game.state, action.direction);
    return next === game.state ? game : { ...game, state: next, history: [...game.history, game.state] };
  }
  return game;
}

function PreviewPage() {
  const [game, dispatch] = React.useReducer(gameReducer, 0, createGame);
  const level = DUCK_LEVELS[game.levelIndex];
  const { state } = game;
  const isComplete = isWon(level, state);
  const move = direction => dispatch({ type: 'move', direction });
  React.useEffect(() => {
    const keys = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
    const onKey = event => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('select, input, textarea, [contenteditable]:not([contenteditable="false"])')) return;
      const direction = keys[event.key];
      if (direction) { event.preventDefault(); move(direction); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <main className="duck-app">
    <header className="duck-header"><div><p className="eyebrow">DUCK DELIVERY / WAREHOUSE 01</p><h1>Parcel, please.</h1><p className="intro">Guide the yellow duck through the cozy warehouse. Push every parcel onto a teal delivery pad.</p></div><div className="duck-mark" aria-hidden="true">🦆</div></header>
    <section className="game-shell" aria-label="Sokoban game"><div className="game-toolbar"><label htmlFor="level">ROUTE <select id="level" value={game.levelIndex} onChange={event => dispatch({ type: 'select', levelIndex: Number(event.target.value) })}>{DUCK_LEVELS.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label><div className="stats"><span><b>{state.moves}</b> moves</span><span><b>{state.pushes}</b> pushes</span></div></div>
      <div className="board-wrap"><div className="board" style={{ '--cols': level.terrain[0].length }} role="grid" aria-label={`${level.name} warehouse`}>{level.terrain.flatMap((row, y) => [...row].map((tile, x) => { const position = [x, y], parcel = state.parcels.some(p => p[0] === x && p[1] === y), duck = state.duck[0] === x && state.duck[1] === y, goal = level.goals.some(g => g[0] === x && g[1] === y); return <div key={`${x}-${y}`} className={`tile ${tile === '#' ? 'wall' : 'floor'} ${goal ? 'goal' : ''}`} role="gridcell">{goal ? <span className="pad">✦</span> : null}{parcel ? <span className="box">▣</span> : null}{duck ? <span className="duck">●</span> : null}</div>; }))}</div></div>
      <div className={`status ${isComplete ? 'complete' : ''}`} role="status">{isComplete ? 'Route complete! Every parcel is delivered.' : 'Push parcels onto every teal star.'}</div>
      <div className="controls"><button className="secondary" onClick={() => dispatch({ type: 'undo' })} disabled={!game.history.length}>↶ Undo</button><div className="dpad"><button onClick={() => move('up')} aria-label="Move up">↑</button><div><button onClick={() => move('left')} aria-label="Move left">←</button><button onClick={() => move('down')} aria-label="Move down">↓</button><button onClick={() => move('right')} aria-label="Move right">→</button></div></div><button className="secondary" onClick={() => dispatch({ type: 'restart' })}>Restart</button></div>
    </section><footer className="duck-footer"><span>ARROW KEYS / WASD TO MOVE</span><span>Original code-drawn artwork · No tracking</span></footer>
  </main>;
}
