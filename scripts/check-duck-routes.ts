import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { solveLevel } from '../sokoban/solver.js';
import type { Level } from '../sokoban/engine.js';

const input = process.argv[2];
const match = input ? null : readFileSync('PreviewPage.jsx','utf8').match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/);
if (!input && !match) throw new Error('Could not locate the actual UI level definitions');
const levels: Level[] = input ? JSON.parse(readFileSync(input,'utf8')) : vm.runInNewContext(match![1]);
const results = levels.map(level => {
  const result = solveLevel(level);
  return { name: level.name, status: result.status, visited: result.visited, winningMoves: result.moves?.length ?? null };
});
console.log(JSON.stringify(results,null,2));
if (results.some(result => result.status !== 'solved')) process.exitCode = 1;
