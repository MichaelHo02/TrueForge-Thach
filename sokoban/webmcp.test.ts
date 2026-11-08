import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {initialState, step, replay, isWon, cornerDeadlocks, serialize} from './engine.js';
// @ts-expect-error The browser adapter is plain JavaScript, exercised here with the actual reducer.
import {createDuckTools, registerDuckWebMCP} from '../web/webmcp.mjs';

const source = readFileSync('PreviewPage.jsx', 'utf8');
const levels = vm.runInNewContext(source.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/)![1]);
const demos = JSON.parse(source.match(/const RECORDED_AGENT_DEMOS = ([\s\S]*?);\nDUCK_LEVELS/)![1]);
const {createGame, gameReducer} = vm.runInNewContext(source.match(/const createGame[\s\S]*?(?=\n function PreviewPage)/)![0] + '\n({createGame,gameReducer})', {DUCK_LEVELS: levels, RECORDED_AGENT_DEMOS: demos, initialState, step, replay});
const unwrap = (result: any) => JSON.parse(result.content[0].text);
function harness(start = createGame()) {
  let game = start;
  const calls: any[] = [];
  const tools = createDuckTools({getGame: () => game, commit: (action: any) => {game = gameReducer(game, action);}, engine: {isWon, cornerDeadlocks}, onCall: (call: any) => calls.push(call)});
  const call = (name: string, input = {}) => unwrap(tools.find((t: any) => t.name === name).execute(input));
  return {call, calls, game: () => game, change: (action: any) => {game = gameReducer(game, action);}};
}

test('WebMCP discovers the live board and solves Dock 01 through the same reducer', () => {
  const h = harness();
  let board = h.call('duck_get_board');
  assert.equal(board.mode, 'interactive');
  assert.equal(board.route, levels[0].name);
  assert.deepEqual(board.duck, Array.from(h.game().state.duck));
  // Dock 01: walk behind the parcel, then make its three rightward pushes.
  for (const direction of ['right', 'right', 'right', 'right']) {
    board = h.call('duck_move', {direction, expectedRevision: board.revision});
    assert.equal(board.error, undefined);
    assert.equal(JSON.stringify(board.duck), JSON.stringify(h.game().state.duck));
  }
  assert.equal(board.won, true);
  assert.equal(board.moves, 4);
  assert.equal(board.pushes, 3);
  assert.equal(h.calls.length, 5);
});

test('WebMCP reports blocked moves and rejects malformed or stale commands without mutation', () => {
  const h = harness();
  let board = h.call('duck_get_board');
  const before = serialize(h.game().state);
  board = h.call('duck_move', {direction: 'up', expectedRevision: board.revision});
  assert.equal(board.outcome, 'blocked');
  assert.equal(serialize(h.game().state), before);
  const revision = board.revision;
  for (const input of [null, [], {direction: 'teleport', expectedRevision: revision}, {direction: 'right'}, {direction: 'right', expectedRevision: -1}, {direction: 'right', expectedRevision: revision, moves: ['right']}]) {
    assert.ok(h.call('duck_move', input as any).error);
    assert.equal(h.game().generation, revision);
  }
  h.change({type: 'select', levelIndex: 1});
  const selected = serialize(h.game().state);
  const stale = h.call('duck_move', {direction: 'right', expectedRevision: revision});
  assert.match(stale.error, /Stale/);
  assert.equal(serialize(h.game().state), selected);
  assert.equal(stale.route, levels[1].name);
});

test('restart preserves the active challenge and tools never modify a recorded demo', () => {
  const seeded = createGame(1, 10, levels[1], 'repeatable-seed');
  const h = harness(seeded);
  let board = h.call('duck_get_board');
  board = h.call('duck_move', {direction: 'right', expectedRevision: board.revision});
  board = h.call('duck_restart', {expectedRevision: board.revision});
  assert.equal(board.moves, 0);
  assert.equal(board.seed, 'repeatable-seed');
  assert.equal(board.route, levels[1].name);
  h.change({type: 'recorded-demo', kind: 'improved'});
  board = h.call('duck_get_board');
  const recorded = h.game();
  assert.equal(board.mode, 'recorded-demo');
  for (const tool of ['duck_move', 'duck_restart']) {
    assert.match(h.call(tool, {expectedRevision: board.revision, ...(tool === 'duck_move' ? {direction: 'right'} : {})}).error, /locked/);
    assert.equal(h.game(), recorded);
  }
});

test('registration supports native document and legacy navigator APIs with cleanup and no fake fallback', async () => {
  const statuses: any[] = [], calls: any[] = [];
  const options = {getGame: () => createGame(), commit: () => {}, engine: {isWon, cornerDeadlocks}, onStatus: (status: any) => statuses.push(status)};
  const active = new Map();
  const modern = {registerTool(tool: any, {signal}: any) {active.set(tool.name, tool); signal.addEventListener('abort', () => active.delete(tool.name)); return Promise.resolve();}};
  const cleanup = registerDuckWebMCP({...options, onCall: (call: any) => calls.push(call)}, {document: {modelContext: modern}});
  await cleanup.ready;
  assert.equal(active.size, 3);
  assert.equal(statuses.at(-1).api, 'document.modelContext');
  const staleTool = active.get('duck_move');
  cleanup();
  assert.equal(active.size, 0);
  assert.match(unwrap(staleTool.execute({direction: 'right', expectedRevision: 0})).error, /cancelled/);
  assert.equal(calls.length, 0);
  const legacy = {registerTool(tool: any) {active.set(tool.name, tool);}, unregisterTool(name: string) {active.delete(name);}};
  const removeLegacy = registerDuckWebMCP(options, {navigator: {modelContext: legacy}});
  await removeLegacy.ready;
  assert.equal(statuses.at(-1).api, 'navigator.modelContext');
  removeLegacy(); assert.equal(active.size, 0);
  registerDuckWebMCP(options, {});
  assert.equal(statuses.at(-1).status, 'unsupported');
});

test('partial registration failure rolls back its tools and shows an error', async () => {
  const active = new Map(), statuses: any[] = [];
  const context = {registerTool(tool: any, {signal}: any) {if (active.size === 1) return Promise.reject(new Error('registration refused')); active.set(tool.name, tool); signal.addEventListener('abort', () => active.delete(tool.name)); return Promise.resolve();}};
  const cleanup = registerDuckWebMCP({getGame: () => createGame(), commit: () => {}, engine: {isWon, cornerDeadlocks}, onStatus: (status: any) => statuses.push(status)}, {document: {modelContext: context}});
  await cleanup.ready;
  assert.equal(active.size, 0);
  assert.equal(statuses.at(-1).status, 'error');
});

test('all eight live benchmark boards are exact frozen inputs, permit native moves and restart without saved replays', () => {
  const tasks = JSON.parse(readFileSync('evals/duck/tasks.json', 'utf8'));
  const benchmarkReducer = vm.runInNewContext(source.match(/const createGame[\s\S]*?(?=\n function PreviewPage)/)![0] + '\n({createGame,gameReducer})', {DUCK_LEVELS: levels, RECORDED_AGENT_DEMOS: demos, __DUCK_BENCHMARK_TASKS__: tasks, initialState, step, replay});
  for (const task of tasks) {
    let game = benchmarkReducer.gameReducer(benchmarkReducer.createGame(), {type: 'benchmark', taskId: task.id});
    assert.equal(game.benchmarkTask, task.id);
    assert.deepEqual(game.activeLevel, task.level);
    assert.equal(game.replay, null);
    assert.equal(game.recordedDemo, null);
    const tools = createDuckTools({getGame: () => game, commit: (action: any) => {game = benchmarkReducer.gameReducer(game, action);}, engine: {isWon, cornerDeadlocks}});
    const read = () => unwrap(tools.find((t: any) => t.name === 'duck_get_board').execute({}));
    const board = read();
    assert.equal(board.mode, 'interactive');
    assert.equal(board.benchmarkTask, task.id);
    assert.deepEqual(board.parcels, task.level.parcels);
    tools.find((t: any) => t.name === 'duck_move').execute({direction: 'down', expectedRevision: board.revision});
    const moved = read();
    assert.equal(serialize(moved), serialize(step(task.level, initialState(task.level), 'down')));
    tools.find((t: any) => t.name === 'duck_restart').execute({expectedRevision: moved.revision});
    assert.equal(game.benchmarkTask, task.id);
    assert.equal(serialize(read()), serialize(initialState(task.level)));
    game = benchmarkReducer.gameReducer(game, {type: 'original'});
    assert.equal(game.benchmarkTask, null);
  }
});
