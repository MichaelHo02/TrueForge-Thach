const directions = ['up', 'down', 'left', 'right'];
const emptySchema = {type: 'object', properties: {}, additionalProperties: false};

// Receipts are built from the committed React state, never from a second engine.
export function createDuckTools({getGame, commit, engine, onCall = () => {}, isActive = () => true}) {
  function board() {
    const game = getGame(), level = game.activeLevel, state = game.state;
    const at = (items, x, y) => items.some(p => p[0] === x && p[1] === y);
    return {
      mode: game.recordedDemo ? 'recorded-demo' : 'interactive',
      route: level.name, seed: game.activeSeed, revision: game.generation,
      coordinates: 'Zero-based [x,y]; x increases right, y increases down.',
      terrain: [...level.terrain], goals: level.goals.map(p => [...p]),
      duck: [...state.duck], parcels: state.parcels.map(p => [...p]),
      moves: state.moves, pushes: state.pushes, won: engine.isWon(level, state),
      cornerDeadlocks: engine.cornerDeadlocks(level, state).map(p => [...p]),
      rows: level.terrain.map((row, y) => [...row].map((tile, x) => {
        const goal = at(level.goals, x, y);
        return tile === '#' ? '#' : at([state.duck], x, y) ? (goal ? '+' : '@') : at(state.parcels, x, y) ? (goal ? '*' : '$') : goal ? '.' : ' ';
      }).join('')),
      legend: {'#': 'wall', ' ': 'floor', '.': 'goal', '$': 'parcel', '*': 'parcel on goal', '@': 'duck', '+': 'duck on goal'},
    };
  }
  const result = payload => ({content: [{type: 'text', text: JSON.stringify(payload)}], ...(payload.error ? {isError: true} : {})});
  function execute(name, mutate) {
    return (input = {}, options = {}) => {
      let error;
      if (!isActive() || options.signal?.aborted) return result({error: 'Tool call cancelled or page unmounted.'});
      const fields = name === 'duck_move' ? ['direction', 'expectedRevision'] : name === 'duck_restart' ? ['expectedRevision'] : [];
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !fields.includes(k))) error = 'Use an object with only the fields in the tool schema.';
      else if (name === 'duck_move' && !directions.includes(input.direction)) error = 'Choose a valid direction: up, down, left or right.';
      else if (mutate && (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)) error = 'Pass expectedRevision from the latest board receipt.';
      else if (mutate && getGame().recordedDemo) error = 'Recorded agent demos are locked. Use Exit agent demo before live play.';
      else if (mutate && input.expectedRevision !== getGame().generation) error = 'Stale board revision. Read the current board before retrying.';
      const before = getGame().state;
      if (!error && mutate) commit(name === 'duck_move' ? {type: 'move', direction: input.direction} : {type: 'restart'});
      const snapshot = board();
      const outcome = error ? 'rejected' : name === 'duck_move' ? (before === getGame().state ? 'blocked' : 'moved') : name === 'duck_restart' ? 'restarted' : 'observed';
      onCall({tool: name, direction: input?.direction, outcome, revision: snapshot.revision});
      return result({...snapshot, outcome, ...(error ? {error} : {})});
    };
  }
  return [
    {name: 'duck_get_board', description: 'Read the currently displayed Duck Delivery puzzle, actors, counters and revision. Use this before planning a live move.', inputSchema: emptySchema, annotations: {readOnlyHint: true}, execute: execute('duck_get_board', false)},
    {name: 'duck_move', description: 'Move the duck one step on the displayed puzzle using the game rules. Returns the updated board or a blocked-move receipt.', inputSchema: {type: 'object', properties: {direction: {type: 'string', enum: directions}, expectedRevision: {type: 'integer', minimum: 0, description: 'Revision from the most recent board receipt.'}}, required: ['direction', 'expectedRevision'], additionalProperties: false}, annotations: {readOnlyHint: false}, execute: execute('duck_move', true)},
    {name: 'duck_restart', description: 'Restart the currently displayed live puzzle, preserving its route and seed. Returns its initial board.', inputSchema: {type: 'object', properties: {expectedRevision: {type: 'integer', minimum: 0, description: 'Revision from the most recent board receipt.'}}, required: ['expectedRevision'], additionalProperties: false}, annotations: {readOnlyHint: false}, execute: execute('duck_restart', true)},
  ];
}

// Current document API plus earlier navigator implementations used by browser agents.
// No polyfill: unsupported browsers must not report a working WebMCP connection.
export function registerDuckWebMCP(options, environment = globalThis) {
  const modern = environment.document?.modelContext;
  const context = modern?.registerTool ? modern : environment.navigator?.modelContext;
  const api = modern?.registerTool ? 'document.modelContext' : 'navigator.modelContext';
  if (!context?.registerTool) {
    options.onStatus({status: 'unsupported'});
    return () => {};
  }
  const controller = new AbortController(), registered = [];
  let active = true;
  const tools = createDuckTools({...options, isActive: () => active});
  const remove = () => {
    controller.abort();
    if (api === 'navigator.modelContext' && context.unregisterTool) {
      for (const name of registered.splice(0)) context.unregisterTool(name);
    }
  };
  // A synchronous legacy registerTool is completed synchronously for clean remounts.
  const ready = (async () => {
    try {
      for (const tool of tools) {
        if (!active) break;
        const registration = context.registerTool(tool, {signal: controller.signal});
        registered.push(tool.name);
        if (registration?.then) await registration;
      }
      if (active) options.onStatus({status: 'ready', api});
    } catch {
      remove();
      if (active) options.onStatus({status: 'error', api});
    }
  })();
  const dispose = () => {active = false; remove();};
  dispose.ready = ready;
  return dispose;
}
