import assert from 'node:assert/strict';
import test from 'node:test';
import { developmentFailures, solverPayload, type GeneralizationTask } from './generalization.js';

const level = {name:'anonymous-puzzle',terrain:['######','#    #','#    #','######'],duck:[1,1] as const,parcels:[[2,1]] as const,goals:[[4,1]] as const};
const tasks:GeneralizationTask[]=[{id:'dev',split:'development',baseIndex:0,seed:'private-dev-seed',level},
  {id:'eval',split:'holdout',baseIndex:0,seed:'private-eval-seed',level}];

test('solver payload contains only the puzzle, not seed/generator/split metadata',()=>{
  const payload=solverPayload(tasks[1]);
  assert.deepEqual(Object.keys(payload).sort(),['name','terrain','duck','parcels','goals'].sort());
  assert.equal(JSON.stringify(payload).includes('private-eval-seed'),false);
  assert.notEqual(payload,tasks[1].level);
  assert.notEqual(payload.parcels,tasks[1].level.parcels);
});

test('holdout failures cannot enter improvement even with forged development labels',()=>{
  const results=[{taskId:'dev',holdout:true,result:{solved:false},reply:'development-failure'},
    {taskId:'eval',holdout:false,result:{solved:false},reply:'SECRET-HOLDOUT'},
    {taskId:'unknown',holdout:false,result:{solved:false},reply:'unknown'}];
  const feedback=developmentFailures(tasks,results);
  assert.deepEqual(feedback.map(row=>row.taskId),['dev']);
  assert.equal(JSON.stringify(feedback).includes('SECRET-HOLDOUT'),false);
  assert.deepEqual(developmentFailures(tasks,[{taskId:'dev',result:{solved:true}}]),[]);
});
