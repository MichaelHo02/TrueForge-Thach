import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePuzzle, evaluateSubmission, scorePuzzles } from './duck-score.js';

const level = { name: 'Scorer test', terrain: ['######', '#    #', '######'],
  duck: [1, 1] as [number, number], parcels: [[2, 1]] as [number, number][], goals: [[4, 1]] as [number, number][] };

test('invalid plans consume submissions and a third submission is rejected', () => {
  const result = evaluatePuzzle(level, ['not json', { moves: ['fly'] }]);
  assert.equal(result.submissionsUsed, 2);
  assert.equal(result.solved, false);
  assert.ok(result.attempts.every(attempt => !attempt.valid));
  assert.throws(() => evaluatePuzzle(level, [{}, {}, {}]), /Third/);
});

test('each submission starts fresh and blocked moves consume the move budget', () => {
  const result = evaluatePuzzle(level, [{ moves: ['right'] }, { moves: ['right'] }]);
  assert.equal(result.solved, false);
  assert.deepEqual(result.attempts[0].trace, result.attempts[1].trace);
  const blocked = evaluateSubmission(level, { moves: Array(100).fill('up') });
  assert.equal(blocked.attemptedMoves, 100);
  assert.equal(blocked.blockedMoves, 100);
  assert.equal(blocked.trace.length, 101);
  assert.equal(evaluateSubmission(level, { moves: Array(101).fill('up') }).valid, false);
});

test('canonical engine alone decides success and score is tasks solved percent', () => {
  const win = evaluatePuzzle(level, [{ moves: ['right', 'right'] }]);
  assert.equal(win.solved, true);
  assert.equal(scorePuzzles([win, { solved: false }]), 50);
  assert.equal(evaluateSubmission(level, { moves: ['right', 'right'], score: 100 }).valid, false);
  assert.equal(evaluateSubmission(level, '```json\n{"moves":["right","right"]}\n```').solved, true);
  assert.equal(evaluateSubmission(level, 'Explanation\n```json\n{"moves":["right","right"]}\n```').valid, false);
});
