import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {step, serialize, isWon, type Direction, type Level} from './engine.js';

const folder = 'runs/webmcp-live-2026-11-08/';
const read = (name: string) => JSON.parse(readFileSync(folder + name, 'utf8'));
const events = readFileSync(folder + 'native-calls.jsonl', 'utf8').trim().split('\n').map(line => JSON.parse(line));
const receipt = (event: any) => JSON.parse(event.result.content[0].text);

test('retained live browser receipts match every canonical transition and preserve failed trials', () => {
  let previous: any;
  const movedRoutes = new Set<string>();
  for (const event of events) {
    const board = receipt(event);
    if (event.tool === 'duck_get_board') {previous = board; continue;}
    assert.equal(event.tool, 'duck_move');
    assert.equal(event.input.expectedRevision, previous.revision);
    assert.equal(board.revision, previous.revision + 1);
    const level: Level = {name: previous.route, terrain: previous.terrain, goals: previous.goals, duck: previous.duck, parcels: previous.parcels};
    const expected = step(level, previous, event.input.direction as Direction);
    assert.equal(serialize(board), serialize(expected));
    assert.equal(board.won, isWon(level, expected));
    movedRoutes.add(board.route); previous = board;
  }
  assert.deepEqual([...movedRoutes], ['Dock 01 · First Parcel', 'Dock 03 · Wall Pocket']);
  const summary = read('summary.json');
  assert.equal(summary.trials.filter((trial: any) => trial.result === 'failed').length, 2);
  assert.equal(summary.benchmark, false);
  assert.equal(summary.skillSHA256, createHash('sha256').update(readFileSync('runs/duck-improvement-02/candidate-SKILL.md')).digest('hex'));
});

test('TrueForge model-originated plan equals the actual native moves and returned live result', () => {
  const request = read('run-B-mcp-request.json'), response = read('run-B-mcp-response.json');
  const moves = events.filter(event => event.tool === 'duck_move' && receipt(event).route === 'Dock 01 · First Parcel');
  assert.deepEqual(request.moves, moves.map(event => event.input.direction));
  assert.equal(request.expectedRevision, moves[0].input.expectedRevision);
  assert.deepEqual(response.steps, moves.map(receipt));
  assert.deepEqual(response.board, receipt(moves.at(-1)));
  assert.equal(response.transport, 'native-browser-webmcp');
  assert.equal(response.board.won, true);
});
