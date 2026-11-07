import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { cornerDeadlocks, initialState, isWon, replay, serialize, step, validateLevel, type Direction, type Level } from "./engine.js";

const line: Level = { name: "Line", terrain: ["########" ,"#      #","########"], duck: [1,1], parcels: [[3,1]], goals: [[6,1]] };
const moves: Direction[] = ["right","right","right","right","right"];

function readUiLevels(): Level[] {
  const source = readFileSync("PreviewPage.jsx", "utf8");
  const match = source.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/);
  assert.ok(match, "PreviewPage.jsx must contain DUCK_LEVELS");
  return vm.runInNewContext(`(${match[1]})`) as Level[];
}

function readUiReducer(): { createGame: (levelIndex?: number) => any; gameReducer: (game: any, action: any) => any } {
  const source = readFileSync("PreviewPage.jsx", "utf8");
  const match = source.match(/const createGame[\s\S]*?(?=\n function PreviewPage)/);
  assert.ok(match, "PreviewPage.jsx must contain the game reducer");
  return vm.runInNewContext(`${match[0]}\n({createGame,gameReducer})`, { DUCK_LEVELS: readUiLevels(), initialState, step });
}

function positionKey(state: ReturnType<typeof initialState>): string {
  return JSON.stringify([state.duck, [...state.parcels].sort((a, b) => `${a[0]},${a[1]}`.localeCompare(`${b[0]},${b[1]}`))]);
}

function findWinningRoute(level: Level, maxStates = 100_000): number {
  const directions: Direction[] = ["up", "down", "left", "right"];
  const queue: Array<{ state: ReturnType<typeof initialState>; depth: number }> = [{ state: initialState(level), depth: 0 }];
  const visited = new Set([positionKey(queue[0].state)]);
  for (let cursor = 0; cursor < queue.length && visited.size <= maxStates; cursor += 1) {
    const current = queue[cursor];
    if (isWon(level, current.state)) return current.depth;
    if (current.depth >= 100) continue;
    for (const direction of directions) {
      const next = step(level, current.state, direction);
      const key = positionKey(next);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ state: next, depth: current.depth + 1 });
      }
    }
  }
  return -1;
}

test("classic push, win, undo and restart states are deterministic",()=>{let s=initialState(line);for(const d of moves)s=step(line,s,d);assert.equal(isWon(line,s),true);assert.equal(s.pushes,3);assert.equal(serialize(step(line,s,"left")),serialize({...s,duck:[4,1],moves:s.moves+1}));});
test("blocked moves return the same state without adding attempts",()=>{const s=initialState(line), n=step(line,s,"up");assert.equal(n,s);assert.equal(n.moves,0);assert.deepEqual(n.duck,s.duck);assert.deepEqual(n.parcels,s.parcels);});
test("plans reject malformed and oversized input and preserve immutable trace",()=>{assert.throws(()=>replay(line,[...Array(101)].map(()=>"left")),/at most 100/);assert.throws(()=>replay(line,["teleport"]),/valid directions/);const r=replay(line,["up","right"]);assert.equal(r.attempts,2);assert.equal(r.trace.length,3);assert.ok(Object.isFrozen(r.trace));});
test("corner feedback ignores a parcel resting on a goal",()=>{const goal:Level={...line,duck:[2,1],parcels:[[1,1]],goals:[[1,1]]};assert.deepEqual(cornerDeadlocks(goal,initialState(goal)),[]);const trap:Level={name:"Trap",terrain:["#####","#...#","#####"],duck:[2,1],parcels:[[1,1]],goals:[[3,1]]};assert.equal(cornerDeadlocks(trap,initialState(trap)).length,1);});
test("persisted browser artifact stays in parity with canonical replay",()=>{const context:Record<string,unknown>={};vm.runInNewContext(readFileSync("sokoban/engine.browser.js","utf8"),context);const browser=context.__DUCK_DELIVERY_ENGINE__ as typeof import("./engine.js");let a=initialState(line),b=browser.initialState(line);for(const d of ["up","right","right","left"] as Direction[]){a=step(line,a,d);b=browser.step(line,b,d);assert.equal(browser.serialize(b),serialize(a));}assert.equal(JSON.stringify(browser.replay(line,["right"]).trace),JSON.stringify(replay(line,["right"]).trace));});
test("level validation rejects overlaps and invalid coordinates",()=>{assert.throws(()=>validateLevel({...line,duck:[3,1],parcels:[[3,1]]}),/overlap/);assert.throws(()=>validateLevel({...line,parcels:[[3,1],[3,1]],goals:[[6,1],[5,1]]}),/overlap/);assert.throws(()=>validateLevel({...line,goals:[[1,-1]]}),/floor/);});
test("edge-floor pushes stop at the board boundary",()=>{const level:Level={name:"Edge floor",terrain:["#####","#    ","#####"],duck:[1,1],parcels:[[3,1]],goals:[[4,1]]};let state=initialState(level);state=step(level,state,"right");state=step(level,state,"right");assert.equal(isWon(level,state),true);const blocked=step(level,state,"right");assert.equal(blocked,state);assert.deepEqual(blocked.parcels,state.parcels);assert.equal(blocked.moves,2);});
test("every actual PreviewPage route has a canonical BFS solution within 100 moves",()=>{const levels=readUiLevels();assert.equal(levels.length,6);for(const level of levels){validateLevel(level);const depth=findWinningRoute(level);assert.ok(depth>=0,`${level.name} is not solvable within the BFS cap`);assert.ok(depth<=100,`${level.name} requires more than 100 moves`);}});
test("preview keeps native controls out of movement routing",()=>{const source=readFileSync("PreviewPage.jsx","utf8");assert.match(source,/closest\('select, input, textarea/);});
test("reducer skips blocked undo entries and rejects stale replay callbacks",()=>{const {createGame,gameReducer}=readUiReducer();const game=createGame(0);const blocked=gameReducer(game,{type:"move",direction:"up"});assert.equal(blocked.history.length,0);const level=readUiLevels()[0], initial=initialState(level), next=step(level,initial,"right");const loaded=gameReducer(game,{type:"load-replay",trace:[serialize(initial),serialize(next)],states:[initial,next]});const staleGeneration=loaded.generation;const reset=gameReducer(loaded,{type:"restart"});const stale=gameReducer(reset,{type:"replay-step",generation:staleGeneration,index:1,state:next});assert.equal(stale,reset);});
