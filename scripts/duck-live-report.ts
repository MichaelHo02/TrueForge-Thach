// Verify retained live receipts against the frozen engine. This does not run a model.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {initialState,step,serialize,isWon,type Direction} from '../sokoban/engine.js';

const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(output))throw new Error('Usage: duck-live-report.ts retained-artifact-directory NEW-output-directory');
const read=(name:string)=>JSON.parse(readFileSync(join(input,name),'utf8'));
const tasks=JSON.parse(readFileSync('evals/duck/tasks.json','utf8'));
const frozen=JSON.parse(readFileSync('evals/duck/frozen.json','utf8'));
for(const path of ['evals/duck/tasks.json','sokoban/engine.ts'])assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),frozen.hashes[path]);
const events=readFileSync(join(input,'events.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
const records=read('results-progress.json');
const results=records.map((record:any)=>{
 const task=tasks.find((t:any)=>t.id===record.task);assert.ok(task,'Unknown frozen task');
 assert.ok(record.attempt===1||record.attempt===2);
 const selected=events.slice(record.nativeRange[0],record.nativeRange[1]);
 let state=initialState(task.level),previous:any,attemptedMoves=0,blockedMoves=0;
 const moveJobs=new Set<string>();const violations:string[]=[];
 for(const event of selected){
  assert.equal(event.phase,record.phase);assert.equal(event.task,record.task);assert.equal(event.attempt,record.attempt);
  const board=JSON.parse(event.result.content[0].text);
  assert.equal(board.benchmarkTask,task.id);assert.deepEqual(board.terrain,task.level.terrain);assert.deepEqual(board.goals,task.level.goals);
  if(event.tool==='duck_move'){
   assert.ok(previous,'Move without initial board receipt');assert.equal(event.input.expectedRevision,previous.revision);
   const next=step(task.level,state,event.input.direction as Direction);if(next===state)blockedMoves++;state=next;attemptedMoves++;moveJobs.add(event.jobId);
   assert.equal(board.revision,previous.revision+1);
  }else if(event.tool==='duck_restart'){
   state=initialState(task.level);violations.push('Model restarted within an operator-bounded attempt');
  }else assert.equal(event.tool,'duck_get_board');
  assert.equal(serialize(board),serialize(state));assert.equal(board.won,isWon(task.level,state));previous=board;
 }
 for(const jobId of moveJobs){
  const executed=selected.filter((e:any)=>e.tool==='duck_move'&&e.jobId===jobId);
  const file=executed[0].mcpRequestFile;
  if(file){const request=read(file);assert.equal(request.tool,'duck_play_plan');assert.deepEqual(request.arguments.moves,executed.map((e:any)=>e.input.direction));assert.equal(request.arguments.expectedRevision,executed[0].input.expectedRevision);}
  else if(record.phase.startsWith('final'))throw new Error('Final live plan lacks its captured model MCP request');
 }
 if(attemptedMoves>100)violations.push('Exceeded 100 attempted moves');
 if(moveJobs.size>1)violations.push('Submitted more than one live plan within the bounded attempt');
 const nativeWon=!!previous?.won;assert.equal(record.won,nativeWon);
 return {...record,holdout:task.holdout,nativeWon,protocolCompliant:!violations.length,violations,attemptedMoves,blockedMoves,qualifiedWin:nativeWon&&!violations.length};
});
const phases=[...new Set(results.map((r:any)=>r.phase))];
const phaseResults=phases.map(phase=>{
 const rows=results.filter((r:any)=>r.phase===phase),ids=[...new Set(rows.map((r:any)=>r.task))];
 const perTask=ids.map(taskId=>{const attempts=rows.filter((r:any)=>r.task===taskId);assert.ok(attempts.length<=2);assert.equal(new Set(attempts.map((r:any)=>r.attempt)).size,attempts.length);return {taskId,holdout:tasks.find((t:any)=>t.id===taskId).holdout,solved:attempts.some((r:any)=>r.qualifiedWin),attempts:attempts.length};});
 const percent=(xs:any[])=>xs.length?100*xs.filter(x=>x.solved).length/xs.length:null;
 return {phase,tasks:perTask.length,completeEight:perTask.length===8,score:percent(perTask),development:percent(perTask.filter(t=>!t.holdout)),holdout:percent(perTask.filter(t=>t.holdout)),perTask};
});
mkdirSync(output,{recursive:true});writeFileSync(join(output,'verified-attempts.json'),JSON.stringify(results,null,2)+'\n');writeFileSync(join(output,'score.json'),JSON.stringify({metric:'Actual website wins through model-originated native WebMCP calls, canonical replay verified',historicalBenchmarkComparable:false,phases:phaseResults},null,2)+'\n');console.log(JSON.stringify(phaseResults,null,2));
