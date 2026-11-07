/* global React */
/* GENERATED ENGINE START: source=sokoban/engine.ts sha256=b1c7a7a9593b7ed1aa3c027f6daf99221571115f3d51632899e30ea1f3e4a8ae */
const __DUCK_DELIVERY_ENGINE__ = (() => {
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
const { directionDelta, validateLevel, initialState, step, isWon, serialize, hash, plan, validatePlan, replay, cornerDeadlocks } = __DUCK_DELIVERY_ENGINE__;
/* GENERATED ENGINE END */

const DUCK_LEVELS=[
 {name:'Dock 01 · First Parcel',terrain:['########','#      #','########'],duck:[1,1],parcels:[[3,1]],goals:[[6,1]]},
 {name:'Dock 02 · Pairing Order',terrain:['#########','#       #','#       #','#       #','#########'],duck:[1,1],parcels:[[3,1],[5,1]],goals:[[7,1],[2,1]]},
 {name:'Dock 03 · Wall Pocket',terrain:['#########','#       #','# ###   #','#       #','#########'],duck:[1,3],parcels:[[3,3]],goals:[[7,3]]},
  {name:'Dock 04 · Three Wide',terrain:['###########','#         #','#         #','#         #','###########'],duck:[1,1],parcels:[[3,1],[5,1],[7,1]],goals:[[9,1],[4,1],[2,1]]},
 {name:'Dock 05 · Turnaround',terrain:['#########','#   #   #','#       #','#   #   #','#########'],duck:[1,2],parcels:[[2,2],[6,2]],goals:[[2,3],[6,1]]},
 {name:'Dock 06 · Final Sort',terrain:['###########','#         #','#         #','#         #','###########'],duck:[1,3],parcels:[[3,3],[5,3],[8,3]],goals:[[9,3],[2,3],[6,3]]}
];
DUCK_LEVELS.forEach(validateLevel);
 const createGame=(levelIndex=0,generation=0)=>({levelIndex,state:initialState(DUCK_LEVELS[levelIndex]),history:[],replay:null,generation});
function gameReducer(game,a){
 if(a.type==='select'||a.type==='restart')return createGame(a.type==='select'?a.levelIndex:game.levelIndex,game.generation+1);
  if(a.type==='undo'&&game.history.length)return {...game,state:game.history.at(-1),history:game.history.slice(0,-1),replay:null,generation:game.generation+1};
  if(a.type==='move'){const n=step(DUCK_LEVELS[game.levelIndex],game.state,a.direction);return n===game.state?{...game,replay:null,generation:game.generation+1}:{...game,state:n,history:[...game.history,game.state],replay:null,generation:game.generation+1};}
   if(a.type==='load-replay')return {...game,state:a.states[0],history:[],replay:{trace:a.trace,states:a.states,index:0},generation:game.generation+1};
   if(a.type==='unload-replay')return {...game,replay:null,generation:game.generation+1};
   if(a.type==='replay-step'){return !game.replay||a.generation!==game.generation||a.index>=game.replay.trace.length?game:{...game,state:a.state,replay:{...game.replay,index:a.index}};}
  return game;
 }
 function PreviewPage(){
  const[game,dispatch]=React.useReducer(gameReducer,0,createGame),[planText,setPlanText]=React.useState(''),[message,setMessage]=React.useState(''),[playing,setPlaying]=React.useState(false),timer=React.useRef(null);
  const level=DUCK_LEVELS[game.levelIndex], state=game.state, won=isWon(level,state), dead=cornerDeadlocks(level,state).length>0;
  const move=d=>{setPlaying(false);dispatch({type:'move',direction:d});};
  React.useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  React.useEffect(()=>{if(!playing||!game.replay||game.replay.index>=game.replay.states.length-1){setPlaying(false);return;}const generation=game.generation;timer.current=setTimeout(()=>{const i=game.replay.index+1;dispatch({type:'replay-step',generation,index:i,state:game.replay.states[i]});},260);return()=>clearTimeout(timer.current);},[playing,game.replay,game.generation]);
  React.useEffect(()=>{const keys={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'},onKey=e=>{const t=e.target instanceof Element?e.target:null;if(t?.closest('select, input, textarea, [contenteditable]:not([contenteditable="false"])'))return;const d=keys[e.key];if(d){e.preventDefault();move(d);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);});
  const reset=()=>{setPlaying(false);dispatch({type:'restart'});setMessage('');};
   const importReplay=()=>{try{const parsed=JSON.parse(planText),moves=Array.isArray(parsed)?parsed:parsed.moves,result=replay(level,moves);const initial=initialState(level),states=[initial];let s=initial;for(const d of moves){s=step(level,s,d);states.push(s);}if(states.some((item,i)=>serialize(item)!==result.trace[i]))throw new Error('trace serialization mismatch');setPlaying(false);dispatch({type:'load-replay',trace:result.trace,states});setMessage(`Verified trace: ${result.attempts} attempts${result.won?' · solved':''}. Press play or step.`);}catch(e){setMessage(`Replay rejected: ${e.message}`);}};
  const replayData=game.replay, stepReplay=()=>{if(replayData&&replayData.index<replayData.states.length-1){const i=replayData.index+1;dispatch({type:'replay-step',generation:game.generation,index:i,state:replayData.states[i]});}};
 return <main className="duck-app"><header className="duck-header"><div><p className="eyebrow">DUCK DELIVERY / SORTING FLOOR</p><h1>Parcel, please.</h1><p className="intro">A classic Sokoban shift. Order every parcel onto its teal pad without trapping the route.</p></div><div className="duck-mark" aria-hidden="true">🦆</div></header>
 <section className="game-shell" aria-label="Sokoban game"><div className="game-toolbar"><label htmlFor="level">ROUTE <select id="level" value={game.levelIndex} onChange={e=>{setPlaying(false);dispatch({type:'select',levelIndex:Number(e.target.value)});setMessage('');}}>{DUCK_LEVELS.map((x,i)=><option key={x.name} value={i}>{x.name}</option>)}</select></label><div className="stats"><span><b>{state.moves}</b> moves</span><span><b>{state.pushes}</b> pushes</span><span><b>{level.parcels.length}</b> parcels</span></div></div>
 <div className="board-wrap"><div className="board" style={{'--cols':level.terrain[0].length}} role="grid" aria-label={`${level.name} warehouse`}>{level.terrain.flatMap((row,y)=>[...row].map((tile,x)=>{const p=[x,y],parcel=state.parcels.some(q=>q[0]===x&&q[1]===y),duck=state.duck[0]===x&&state.duck[1]===y,goal=level.goals.some(q=>q[0]===x&&q[1]===y);return <div key={`${x}-${y}`} className={`tile ${tile==='#'?'wall':'floor'} ${goal?'goal':''}`} role="gridcell">{goal&&<span className="pad">✦</span>}{parcel&&<span className="box">▣</span>}{duck&&<span className="duck">●</span>}</div>;}))}</div></div>
 <div className={`status ${won?'complete':''}`} role="status">{won?'Route complete! Every parcel is delivered.':dead?'Corner trap: a parcel is off a goal in a static corner. Undo or restart to recover.':'Push every parcel onto a teal star. Plan the order before pushing.'}</div>
 <div className="controls"><button className="secondary" onClick={()=>dispatch({type:'undo'})} disabled={!game.history.length}>↶ Undo</button><div className="dpad"><button onClick={()=>move('up')} aria-label="Move up">↑</button><div><button onClick={()=>move('left')} aria-label="Move left">←</button><button onClick={()=>move('down')} aria-label="Move down">↓</button><button onClick={()=>move('right')} aria-label="Move right">→</button></div></div><button className="secondary" onClick={reset}>Restart</button></div>
 <details className="replay-panel"><summary>Verified replay lab</summary><p>Import a JSON array or {`{"moves":[...]}`} of directions. Only validated traces can be watched.</p><textarea value={planText} onChange={e=>setPlanText(e.target.value)} placeholder='["right", "right"]' aria-label="Replay plan"/><div className="replay-actions"><button onClick={importReplay}>Verify trace</button><button onClick={()=>{setPlaying(true);}} disabled={!replayData}>Play</button><button onClick={()=>{setPlaying(false);}}>Pause</button><button onClick={stepReplay} disabled={!replayData}>Step</button><button onClick={()=>{setPlaying(false);setMessage('');}}>Clear message</button><button onClick={()=>{setPlaying(false);dispatch({type:'unload-replay'});setMessage('');}}>Unload</button></div>{message&&<p className="replay-message">{message}</p>}</details>
 <div className="baseline"><b>Original / Improved</b><span>Awaiting recorded TrueForge runs — watch controls stay disabled until real runs are available.</span><div className="baseline-actions"><button disabled>Watch original</button><button disabled>Watch improved</button></div></div></section><footer className="duck-footer"><span>ARROW KEYS / WASD TO MOVE</span><span>Pure engine · verified replay traces · no canned gains</span></footer></main>;
}
globalThis.__DUCK_GAME_REDUCER__={createGame,gameReducer};
globalThis.__DUCK_PREVIEW_PAGE__=PreviewPage;
