import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { generateVariant, VARIANT_VERSION } from '../sokoban/variants.js';
import { solveLevel } from '../sokoban/solver.js';
import type { Level } from '../sokoban/engine.js';

const count = Number(process.argv[2] ?? 20);
if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Sample count must be 1..100');
const source = readFileSync('PreviewPage.jsx','utf8');
const levels = vm.runInNewContext(source.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/)![1]) as Level[];
const positionKey = (positions: Level['parcels']) => [...positions].map(p=>p.join(',')).sort().join(';');
const routes = levels.map(base => {
  const lengths: number[] = [], signatures = new Set<string>();
  let unavailable = 0;
  for (let index=0;index<count;index++) {
    const result = generateVariant(base,`quality-${index}`);
    if (!result.ok) { unavailable++; continue; }
    signatures.add(positionKey(result.puzzle.parcels)+'|'+positionKey(result.puzzle.goals));
    const solved = solveLevel(result.puzzle);
    if (solved.status !== 'solved') throw new Error(`${base.name} quality-${index}: ${solved.status}`);
    lengths.push(solved.moves.length);
  }
  return { name:base.name, sampled:count, unavailable, uniqueParcelGoalLayouts:signatures.size,
    minWinningMoves:lengths.length?Math.min(...lengths):null, maxWinningMoves:lengths.length?Math.max(...lengths):null,
    oneMovePuzzles:lengths.filter(length=>length===1).length };
});
const report = { version:VARIANT_VERSION, sourceHash:createHash('sha256').update(readFileSync('sokoban/variants.ts')).digest('hex'), routes };
if (process.argv[3]) writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
