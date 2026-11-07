import { generateVariant, VARIANT_VERSION } from '../sokoban/variants.js';
import { solveLevel } from '../sokoban/solver.js';
import type { Level } from '../sokoban/engine.js';

export type GeneralizationTask = { id: string; split: 'development'|'holdout'; baseIndex: number; seed: string; level: Level };
export const GENERALIZATION_VERSION = 'seeded-generalization-v1';
const layoutKey = (level: Level) => JSON.stringify([level.terrain,
  [...level.parcels].map(p=>p.join(',')).sort(), [...level.goals].map(p=>p.join(',')).sort()]);

export function createGeneralizationTasks(bases: Level[]): GeneralizationTask[] {
  const tasks: GeneralizationTask[] = [], seen = new Set<string>();
  for (const split of ['development','holdout'] as const) {
    for (const [baseIndex,base] of bases.entries()) {
      for (let sample=0;sample<2;sample++) {
        let accepted = false;
        for (let retry=0;retry<64;retry++) {
          const seed = `${GENERALIZATION_VERSION}:${split}:${baseIndex}:${sample}:${retry}`;
          const result = generateVariant(base,seed);
          if (!result.ok || seen.has(layoutKey(result.puzzle))) continue;
          const verified = solveLevel(result.puzzle);
          if (verified.status !== 'solved' || verified.moves.length < 2) continue;
          const id = `generalize-${String(tasks.length+1).padStart(2,'0')}`;
          // Strip seed/base metadata and all generation details from the solver payload.
          const {terrain,duck,parcels,goals} = result.puzzle;
          const level: Level = {name:id,terrain:[...terrain],duck:[...duck],parcels:parcels.map(p=>[...p]),goals:goals.map(p=>[...p])};
          seen.add(layoutKey(level));
          tasks.push({id,split,baseIndex,seed,level});
          accepted = true;
          break;
        }
        if (!accepted) throw new Error(`Could not create a distinct verified ${split} puzzle for ${base.name}`);
      }
    }
  }
  return tasks;
}

export function solverPayload(task: GeneralizationTask): Level {
  return structuredClone(task.level);
}

export function developmentFailures<T extends {taskId:string;result:{solved:boolean}}>(tasks: GeneralizationTask[], results:T[]):T[] {
  // The authoritative task split wins over caller-supplied holdout labels.
  const development = new Set(tasks.filter(task=>task.split==='development').map(task=>task.id));
  return results.filter(result=>development.has(result.taskId) && !result.result.solved);
}

export const generatorIdentity = {version:GENERALIZATION_VERSION,generator:VARIANT_VERSION};
