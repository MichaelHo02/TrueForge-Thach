import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {initialState,step,replay,isWon} from './engine.js';
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const source=readFileSync('PreviewPage.jsx','utf8');
const fixture=JSON.parse(source.match(/const RECORDED_AGENT_DEMO = ([\s\S]*?);\nDUCK_LEVELS/)![1]);
const levels=vm.runInNewContext(source.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/)![1]);
function reducer(data=fixture){return vm.runInNewContext(source.match(/const createGame[\s\S]*?(?=\n function PreviewPage)/)![0]+'\n({createGame,gameReducer})',{DUCK_LEVELS:levels,RECORDED_AGENT_DEMO:data,initialState,step,replay});}
test('website demo is the exact recorded task and model answer, including all canonical trace states',()=>{
 const task=read('evals/duck/tasks.json').find((x:any)=>x.id===fixture.taskId);
 const before=read('runs/duck-baseline-01/actual-replies.json').find((x:any)=>x.taskId===fixture.taskId);
 const after=read('runs/duck-v3-comparison-02/actual-replies.json').find((x:any)=>x.taskId===fixture.taskId);
 assert.deepEqual(fixture.level,task.level);assert.deepEqual(fixture.moves,JSON.parse(after.replies[0]).moves);assert.deepEqual(fixture.trace,after.localResult.attempts[0].trace);
 assert.equal(fixture.baselineSession,before.sessionUrl);assert.deepEqual(before.replies,['']);assert.deepEqual(replay(fixture.level,fixture.moves).trace,fixture.trace);
 const {createGame,gameReducer}=reducer();let game=gameReducer(createGame(),{type:'recorded-demo',kind:'improved'});assert.equal(game.replay.index,0);
 for(let i=1;i<game.replay.states.length;i++)game=gameReducer(game,{type:'replay-step',generation:game.generation,index:i,state:game.replay.states[i]});
 assert.equal(isWon(game.activeLevel,game.state),true);assert.equal(game.state.moves,15);
});
test('recorded mode blocks manual interference, restarts faithfully and rejects stale callbacks after exit',()=>{
 const {createGame,gameReducer}=reducer();const demo=gameReducer(createGame(2),{type:'recorded-demo',kind:'improved'});
 assert.equal(gameReducer(demo,{type:'move',direction:'left'}),demo);assert.equal(gameReducer(demo,{type:'variant',seed:'x'}),demo);
 const reset=gameReducer(demo,{type:'restart'});assert.equal(reset.recordedDemo,'improved');assert.equal(reset.replay.index,0);
 const exit=gameReducer(demo,{type:'original'});assert.equal(exit.recordedDemo,null);assert.equal(exit.replay,null);assert.equal(JSON.stringify(exit.activeLevel),JSON.stringify(levels[2]));
 assert.equal(gameReducer(exit,{type:'replay-step',generation:demo.generation,index:1,state:demo.replay.states[1]}),exit);
 const failed=gameReducer(exit,{type:'recorded-demo',kind:'baseline'});assert.equal(failed.replay,null);assert.equal(failed.state.moves,0);
});
test('website refuses a recorded plan whose trace was changed',()=>{
 const corrupted={...fixture,trace:[...fixture.trace]};corrupted.trace[1]='tampered';const {createGame,gameReducer}=reducer(corrupted);
 assert.throws(()=>gameReducer(createGame(),{type:'recorded-demo',kind:'improved'}),/does not match/);
});
