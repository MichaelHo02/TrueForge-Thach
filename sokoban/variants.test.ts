import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { initialState, isWon, step, validateLevel, type Direction, type Level } from "./engine.js";
import { generateVariant, VARIANT_VERSION } from "./variants.js";

function readUiLevels(): Level[] {
  const source = readFileSync("PreviewPage.jsx", "utf8");
  const match = source.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/);
  assert.ok(match, "PreviewPage.jsx must contain DUCK_LEVELS");
  return vm.runInNewContext(`(${match[1]})`) as Level[];
}

function stateKey(state: ReturnType<typeof initialState>): string {
  return JSON.stringify([state.duck, [...state.parcels].sort((a, b) => `${a[0]},${a[1]}`.localeCompare(`${b[0]},${b[1]}`))]);
}

function solveWithin100(level: Level): number {
  const directions: Direction[] = ["up", "down", "left", "right"];
  const queue = [{ state: initialState(level), depth: 0 }];
  const visited = new Set([stateKey(queue[0].state)]);
  for (let cursor = 0; cursor < queue.length && visited.size <= 100_000; cursor += 1) {
    const current = queue[cursor];
    if (isWon(level, current.state)) return current.depth;
    if (current.depth === 100) continue;
    for (const direction of directions) {
      const next = step(level, current.state, direction);
      const key = stateKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ state: next, depth: current.depth + 1 });
      }
    }
  }
  return -1;
}

const normalizedLayout = (level: Level): string => JSON.stringify([
  [...level.parcels].sort(),
  [...level.goals].sort(),
]);

function assertNoInternalWitness(value: unknown): void {
  const text = JSON.stringify(value);
  for (const leaked of ["witness", "solution", "moves"]) assert.equal(text.includes(`\"${leaked}\"`), false, `${leaked} must not leak`);
}

test("variants are byte-for-byte reproducible and non-cosmetic across 20 seeds", () => {
  const reports: string[] = [];
  for (const base of readUiLevels()) {
    const before = JSON.stringify(base);
    const layouts = new Set<string>();
    const depths: number[] = [];
    let available = 0;
    for (let seed = 0; seed < 20; seed += 1) {
      const first = generateVariant(base, seed);
      const second = generateVariant(base, seed);
      assert.equal(JSON.stringify(first), JSON.stringify(second), `${base.name} seed ${seed} is not reproducible`);
      assert.equal(first.metadata.version, VARIANT_VERSION);
      assert.equal(JSON.stringify(base), before, "generator must not mutate its input");
      assertNoInternalWitness(first);
      assert.equal(first.ok, true, `${base.name} seed ${seed} should be available`);
      if (!first.ok) continue;
      available += 1;
      const variant = first.puzzle;
      validateLevel(variant);
      assert.deepEqual(variant.terrain, base.terrain);
      assert.equal(variant.parcels.length, base.parcels.length);
      assert.equal(variant.goals.length, base.goals.length);
      assert.equal(isWon(variant, initialState(variant)), false);
      layouts.add(normalizedLayout(variant));
      const depth = solveWithin100(variant);
      assert.ok(depth >= 2, `${base.name} seed ${seed} has a trivial or unsolved BFS result`);
      depths.push(depth);
      assertNoInternalWitness(variant);
    }
    assert.equal(available, 20, `${base.name} must have all 20 seeds available`);
    assert.ok(layouts.size > 1, `${base.name} only varied the duck`);
    reports.push(`${base.name}: ${available}/20 available, BFS ${Math.min(...depths)}..${Math.max(...depths)}, layouts ${layouts.size}`);
  }
  console.log(`variant availability: ${reports.join(" | ")}`);
});

test("invalid terrain is rejected independently", () => {
  assert.throws(() => generateVariant({ name: "bad", terrain: [], duck: [0, 0], parcels: [[0, 0]], goals: [[0, 0]] }, "x"), /terrain/);
});

test("unscramable tiny boards return unavailable without mutation", () => {
  const tiny: Level = { name: "Tiny", terrain: ["#####", "#.#.#", "#####"], duck: [1, 1], parcels: [[3, 1]], goals: [[1, 1]] };
  const before = JSON.stringify(tiny);
  const result = generateVariant(tiny, "fixed");
  assert.equal(result.ok, false);
  assert.deepEqual(result.metadata, { version: VARIANT_VERSION, seed: "fixed" });
  assert.equal(JSON.stringify(tiny), before);
});

test("seed text is bounded without introducing nondeterminism", () => {
  const base = readUiLevels()[0];
  const longSeed = "x".repeat(512);
  const result = generateVariant(base, longSeed);
  assert.equal(result.metadata.seed, "x".repeat(128));
  assert.deepEqual(result, generateVariant(base, longSeed));
});


function readUiReducer(): { createGame: (levelIndex?: number) => any; gameReducer: (game: any, action: any) => any } {
  const source = readFileSync("PreviewPage.jsx", "utf8");
  const match = source.match(/const createGame[\s\S]*?(?=\n function PreviewPage)/);
  assert.ok(match, "PreviewPage.jsx must contain the game reducer");
  const base = readUiLevels()[0];
  const puzzle = { ...base, duck: [2, 1], parcels: [[4, 1]], goals: [[6, 1]] };
  return vm.runInNewContext(`${match[0]}\n({createGame,gameReducer})`, {
    DUCK_LEVELS: readUiLevels(),
    initialState,
    step,
    __DUCK_VARIANTS__: {
      generateVariant: (_level: Level, seed: string) => seed === "unavailable"
        ? { ok: false, metadata: { version: "test", seed }, reason: "unavailable" }
        : { ok: true, metadata: { version: "test", seed }, puzzle },
    },
  });
}

test("reducer keeps variant active across restart and restores the original route", () => {
  const { createGame, gameReducer } = readUiReducer();
  const base = readUiLevels()[0];
  const variant = gameReducer(createGame(0), { type: "variant", seed: "alpha" });
  assert.equal(variant.activeSeed, "alpha");
  assert.notDeepEqual(variant.activeLevel, base);
  const moved = gameReducer(variant, { type: "move", direction: "right" });
  const restarted = gameReducer(moved, { type: "restart" });
  assert.equal(restarted.activeSeed, "alpha");
  assert.deepEqual(restarted.activeLevel, variant.activeLevel);
  assert.deepEqual(restarted.state, initialState(variant.activeLevel));
  const original = gameReducer(restarted, { type: "original" });
  assert.equal(original.activeSeed, null);
  assert.equal(JSON.stringify(original.activeLevel), JSON.stringify(base));
  assert.equal(original.history.length, 0);
  assert.equal(original.replay, null);
});

test("route selection restores the selected base and stale replay actions cannot cross resets", () => {
  const { createGame, gameReducer } = readUiReducer();
  const variant = gameReducer(createGame(0), { type: "variant", seed: "alpha" });
  const initial = initialState(variant.activeLevel);
  const next = step(variant.activeLevel, initial, "right");
  const loaded = gameReducer(variant, { type: "load-replay", trace: ["a", "b"], states: [initial, next] });
  const staleGeneration = loaded.generation;
  const selected = gameReducer(loaded, { type: "select", levelIndex: 1 });
  assert.equal(selected.activeSeed, null);
  assert.equal(JSON.stringify(selected.activeLevel), JSON.stringify(readUiLevels()[1]));
  assert.equal(selected.replay, null);
  assert.equal(gameReducer(selected, { type: "replay-step", generation: staleGeneration, index: 1, state: next }), selected);
});

test("unavailable variants preserve the board but clear replay state with an error", () => {
  const { createGame, gameReducer } = readUiReducer();
  const game = gameReducer(createGame(0), { type: "variant", seed: "alpha" });
  const unavailable = gameReducer(game, { type: "variant", seed: "unavailable" });
  assert.deepEqual(unavailable.activeLevel, game.activeLevel);
  assert.equal(unavailable.activeSeed, game.activeSeed);
  assert.equal(unavailable.variantError, "That seed is unavailable for this route. Try another seed.");
  assert.equal(unavailable.history.length, 0);
  assert.equal(unavailable.replay, null);
});
