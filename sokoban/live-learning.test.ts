import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const root='runs/duck-live-learning-2026-11-08/';
const read=(path:string)=>JSON.parse(readFileSync(root+path,'utf8'));

test('selected skill was frozen before final runs, loaded completely, and learned from development only',()=>{
 const selection=read('selection.json');
 const skill=readFileSync(root+selection.selectedSource,'utf8');
 assert.equal(createHash('sha256').update(skill).digest('hex'),selection.selectedSkillSHA256);
 assert.equal(readFileSync('agent/skills/duck-planning/SKILL.md','utf8'),skill);
 for(const revision of ['revision-01','revision-02']){
  const manifest=read(revision+'/input-manifest.json');assert.equal(manifest.holdoutInputs,0);
  assert.ok(manifest.taskIds.every((id:string)=>['duck-01','duck-02','duck-03','duck-04'].includes(id)));
  assert.doesNotMatch(readFileSync(root+revision+'/prompt.txt','utf8'),/duck-0[5-8]|Benchmark 0[5-8]/);
 }
 const instructions=readFileSync(root+'instructions.txt','utf8').trim();
 const final=read('final/results-progress.json').filter((r:any)=>r.phase==='final-v5');
 assert.equal(new Set(final.map((r:any)=>r.task)).size,8);
 for(const row of final){
  assert.ok(Date.parse(row.recordedAt)>Date.parse(selection.frozenAtUTC));
  const trace=readFileSync(root+`final/evidence/final-v5-${row.task}-a${row.attempt}-expanded.txt`,'utf8');
  assert.ok(trace.includes(skill.trim()));assert.ok(trace.includes(instructions));
  assert.ok(trace.includes('iteration limit: 12 sandbox: on'));
  assert.ok(trace.includes('agent-skill:stranger-builds/default/duck-planning:5'));
 }
});

test('independent UI-copied held-out model request and response equal every executed native move',()=>{
 const request=read('final/final-duck-06-ui-mcp-request.json');
 const response=read('final/final-duck-06-ui-mcp-response.json');
 const events=readFileSync(root+'final/events.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
 const moves=events.filter(e=>e.phase==='final-v5'&&e.task==='duck-06'&&e.tool==='duck_move');
 assert.equal(moves.length,15);assert.deepEqual(request.moves,moves.map(e=>e.input.direction));
 assert.equal(request.expectedRevision,moves[0].input.expectedRevision);
 assert.deepEqual(response.steps,moves.map(e=>JSON.parse(e.result.content[0].text)));
 assert.equal(response.board.won,true);assert.equal(response.transport,'native-browser-webmcp');
});
