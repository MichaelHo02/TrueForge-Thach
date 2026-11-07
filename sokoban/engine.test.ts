import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { initialState, isWon, serialize, step, validateLevel, type Direction, type Level } from "./engine.js";

const level: Level = { name: "Test", terrain: ["#######", "#.....#", "#######"], duck: [1, 1], parcels: [[2, 1]], goals: [[4, 1]] };

function replay(game: ReturnType<typeof initialState>, moves: readonly Direction[]): string[] {
  const trace = [serialize(game)];
  let state = game;
  for (const direction of moves) {
    state = step(level, state, direction);
    trace.push(serialize(state));
  }
  return trace;
}

test("pushes onto and off a goal, and undo restores the exact prior state", () => {
  const start = initialState(level);
  const afterFirstPush = step(level, start, "right");
  const ontoGoal = step(level, afterFirstPush, "right");
  assert.equal(isWon(level, ontoGoal), true);
  const offGoal = step(level, ontoGoal, "right");
  assert.equal(isWon(level, offGoal), false);
  const undoStack = [start, ontoGoal, offGoal];
  assert.equal(serialize(undoStack.pop()!), serialize(offGoal));
  const restoredWin = undoStack.pop()!;
  assert.equal(serialize(restoredWin), serialize(ontoGoal));
  assert.equal(isWon(level, restoredWin), true);
});

test("walls and a second parcel block pushes without mutation or history entry", () => {
  const twoParcels: Level = { ...level, parcels: [[2, 1], [3, 1]], goals: [[4, 1], [5, 1]] };
  const start = initialState(twoParcels);
  const blockedDoublePush = step(twoParcels, start, "right");
  assert.equal(blockedDoublePush, start);
  assert.equal(serialize(step(twoParcels, start, "left")), serialize(start));
});

test("browser and CLI use the same canonical transition trace", () => {
  const start = initialState(level);
  const moves: Direction[] = ["right", "right", "right", "left", "left"];
  assert.deepEqual(replay(start, moves), [
    serialize(start),
    '{"duck":[2,1],"parcels":[[3,1]],"moves":1,"pushes":1}',
    '{"duck":[3,1],"parcels":[[4,1]],"moves":2,"pushes":2}',
    '{"duck":[4,1],"parcels":[[5,1]],"moves":3,"pushes":3}',
    '{"duck":[3,1],"parcels":[[5,1]],"moves":4,"pushes":3}',
    '{"duck":[2,1],"parcels":[[5,1]],"moves":5,"pushes":3}',
  ]);
});

test("persisted browser artifact matches canonical engine on blocked and edge traces", () => {
  const context: Record<string, unknown> = {};
  vm.runInNewContext(readFileSync("sokoban/engine.browser.js", "utf8"), context);
  const browser = context.__DUCK_DELIVERY_ENGINE__ as typeof import("./engine.js");
  assert.ok(browser);
  const cases: Array<{ level: Level; moves: Direction[] }> = [
    { level, moves: ["left", "right", "right", "right", "right", "right"] },
    { level: { name: "Floor edge", terrain: ["....."], duck: [3, 0], parcels: [[4, 0]], goals: [[0, 0]] }, moves: ["right", "left", "left"] },
  ];
  for (const item of cases) {
    let canonical = initialState(item.level);
    let generated = browser.initialState(item.level);
    assert.equal(browser.serialize(generated), serialize(canonical));
    for (const direction of item.moves) {
      canonical = step(item.level, canonical, direction);
      generated = browser.step(item.level, generated, direction);
      assert.equal(browser.serialize(generated), serialize(canonical), `trace diverged on ${direction}`);
    }
  }
});

test("rejects mismatched or empty parcel sets", () => {
  assert.throws(() => initialState({ ...level, parcels: [] }), /nonempty/);
  assert.throws(() => initialState({ ...level, goals: [] }), /nonempty/);
});

test("does not push a boundary parcel beyond a floor-edged board", () => {
  const floorEdged: Level = { name: "Floor edge", terrain: ["....."], duck: [3, 0], parcels: [[4, 0]], goals: [[0, 0]] };
  const start = initialState(floorEdged);
  assert.equal(step(floorEdged, start, "right"), start);
});

test("rejects duplicate actors and invalid coordinates", () => {
  assert.throws(() => validateLevel({ ...level, parcels: [[2, 1], [2, 1]], goals: [[3, 1], [4, 1]] }), /overlap/);
  assert.throws(() => validateLevel({ ...level, duck: [2, 1], parcels: [[2, 1]], goals: [[4, 1]] }), /overlap/);
  assert.throws(() => validateLevel({ ...level, duck: [1.5, 1] }), /floor/);
  assert.throws(() => validateLevel({ ...level, parcels: [[7, 1]] }), /floor/);
  assert.throws(() => validateLevel({ ...level, goals: [[1, -1]] }), /floor/);
});


test("preview key routing preserves native control keyboard input", () => {
  const preview = readFileSync("PreviewPage.jsx", "utf8");
  const guard = "target?.closest('select, input, textarea, [contenteditable]:not([contenteditable=\"false\"])')";
  assert.ok(preview.includes(guard));
  assert.match(preview, /if \(target\?\.closest\([\s\S]*?\)\) return;[\s\S]*?if \(direction\) \{ event\.preventDefault\(\); move\(direction\); \}/);
});
