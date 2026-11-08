import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';

test('live report reproduces the complete retained baseline and rejects a forged win receipt',()=>{
 const dir=mkdtempSync(join(tmpdir(),'duck-live-audit-'));
 const source='runs/duck-live-learning-2026-11-08/baseline';
 const run=(input:string,output:string)=>spawnSync(process.execPath,['--import','tsx','scripts/duck-live-report.ts',input,output],{encoding:'utf8'});
 try{
  const valid=run(source,join(dir,'valid'));assert.equal(valid.status,0,valid.stderr);
  const score=JSON.parse(readFileSync(join(dir,'valid/score.json'),'utf8')).phases[0];
  assert.equal(score.completeEight,true);assert.equal(score.score,62.5);assert.equal(score.development,75);assert.equal(score.holdout,50);
  const records=readFileSync(join(source,'results-progress.json'),'utf8');writeFileSync(join(dir,'results-progress.json'),records);
  const events=readFileSync(join(source,'events.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
  const index=JSON.parse(records)[0].nativeRange[0];
  const board=JSON.parse(events[index].result.content[0].text);board.won=true;events[index].result.content[0].text=JSON.stringify(board);
  writeFileSync(join(dir,'events.jsonl'),events.map(e=>JSON.stringify(e)).join('\n')+'\n');
  const forged=run(dir,join(dir,'forged'));assert.notEqual(forged.status,0,'A claimed win must not override canonical state');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
