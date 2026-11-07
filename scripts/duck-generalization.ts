import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { createGeneralizationTasks, developmentFailures, generatorIdentity, solverPayload, type GeneralizationTask } from '../evals/generalization.js';
import { evaluatePuzzle, scorePuzzles, DUCK_PROTOCOL } from '../evals/duck-score.js';
import type { Level } from '../sokoban/engine.js';

const packPath = 'evals/generalization/pack-v1.json';
const sourceFiles = ['sokoban/engine.ts','sokoban/engine.browser.js','sokoban/variants.ts','evals/duck-score.ts','evals/generalization.ts','scripts/duck-generalization.ts','scripts/duck-simulate.py','agent/duck-instructions.md'];
const sha = (value:string) => createHash('sha256').update(value).digest('hex');
const sources = () => Object.fromEntries(sourceFiles.map(path=>[path,sha(readFileSync(path,'utf8'))]));
const config = () => {const data=JSON.parse(readFileSync('agent/duck-agent.json','utf8'));return {model:data.model,runtime:data.runtime};};
const save = (path:string,data:unknown) => {mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(data,null,2)+'\n');};
function loadPack():{tasks:GeneralizationTask[];bases:Level[];dataHash:string} {
  const pack=JSON.parse(readFileSync(packPath,'utf8'));
  if (JSON.stringify(pack.sources)!==JSON.stringify(sources()) || pack.dataHash!==sha(JSON.stringify({bases:pack.bases,tasks:pack.tasks})) || JSON.stringify(pack.configuration)!==JSON.stringify(config()))
    throw new Error('Generalization snapshot changed; create a new version rather than comparing different tasks/configuration');
  return pack;
}
const [command,arg,out] = process.argv.slice(2);
if(command==='create') {
  if(existsSync(packPath))throw new Error('Generalization pack already exists; it must not be overwritten');
  const text=readFileSync('PreviewPage.jsx','utf8');
  const match=text.match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/);
  if(!match)throw new Error('Cannot locate original route definitions');
  const bases=vm.runInNewContext(match[1]) as Level[];
  const tasks=createGeneralizationTasks(bases);
  save(packPath,{...generatorIdentity,protocol:DUCK_PROTOCOL,configuration:config(),sources:sources(),initialSkillHash:sha(readFileSync('agent/skills/duck-planning/SKILL.md','utf8')),dataHash:sha(JSON.stringify({bases,tasks})),bases,tasks});
  console.log(`Created ${tasks.length} distinct, solver-verified puzzles; ${tasks.filter(task=>task.split==='holdout').length} withheld from improvement.`);
} else if(command==='prepare') {
  if(!['development','holdout'].includes(arg)||!out)throw new Error('Usage: prepare development|holdout output-directory');
  const pack=loadPack();mkdirSync(out,{recursive:true});
  for(const task of pack.tasks.filter(task=>task.split===arg)) {
    const prompt=`Solve this independent Sokoban puzzle with duck-planning and the sandbox. Use only this board and the canonical engine/adapter below; no other tasks, repository or generator. At most two final submissions, <=100 attempted moves each, starting from the initial board. Invalid plans consume submissions; blocked moves consume attempts. Return only JSON {"moves":[...]} (one JSON fence allowed).\nPuzzle: ${JSON.stringify(solverPayload(task))}\nCanonical engine:\n\`\`\`js\n${readFileSync('sokoban/engine.browser.js','utf8')}\n\`\`\`\nPython/QuickJS adapter:\n\`\`\`python\n${readFileSync('scripts/duck-simulate.py','utf8')}\n\`\`\`\n`;
    writeFileSync(join(out,task.id+'.txt'),prompt);
  }
  console.log('Prepared solver prompts without seeds, generator code, witnesses, or split labels.');
} else if(command==='score') {
  const pack=loadPack();if(!arg||!out||existsSync(out))throw new Error('Usage: score actual-replies.json new-output-directory');
  const input=JSON.parse(readFileSync(arg,'utf8')) as Array<{taskId:string;sessionId:string;skillVersion:string;status:string;replies:string[]}>;
  if(!Array.isArray(input)||input.length!==pack.tasks.length||new Set(input.map(r=>r.taskId)).size!==pack.tasks.length||new Set(input.map(r=>r.skillVersion)).size!==1||!input[0]?.skillVersion)
    throw new Error('Provide exactly one actual result per task and one pinned skill version');
  const results=pack.tasks.map(task=>{
    const record=input.find(r=>r.taskId===task.id);
    if(!record||record.status!=='done'||!record.sessionId||!Array.isArray(record.replies)||!record.replies.length)throw new Error(`Missing/failed session for ${task.id}`);
    return {...record,split:task.split,result:evaluatePuzzle(task.level,record.replies)};
  });
  save(join(out,'results.json'),results);
  save(join(out,'score.json'),{dataset:'generalization-only',dataHash:pack.dataHash,score:scorePuzzles(results.map(r=>r.result)),development:scorePuzzles(results.filter(r=>r.split==='development').map(r=>r.result)),holdout:scorePuzzles(results.filter(r=>r.split==='holdout').map(r=>r.result)),skillVersion:input[0].skillVersion,evidenceStatus:'Imported actual replies; inspect and preserve TrueForge session provenance separately'});
  console.log('Scored the separate fixed generalization pack; original eight-task score unchanged.');
} else if(command==='improve-prompt') {
  const pack=loadPack();if(!arg||!out)throw new Error('Usage: improve-prompt results.json output.txt');
  const results=JSON.parse(readFileSync(arg,'utf8'));
  const failures=developmentFailures(pack.tasks,results).map(r=>({level:solverPayload(pack.tasks.find(task=>task.id===r.taskId)!),feedback:r.result,replies:(r as {replies?:string[]}).replies}));
  if(!failures.length)throw new Error('No development failures; do not manufacture improvement');
  writeFileSync(out,`Rewrite your planning skill from these DEVELOPMENT failures only in a fresh session with sandbox/MCP/web/subagents OFF. Preserve frontmatter. Return complete SKILL.md containing general methods, not task IDs, coordinates, terrain strings, seeds, or stored move sequences. Never alter engine, scorer, model/runtime or budgets.\nCurrent skill:\n${readFileSync('agent/skills/duck-planning/SKILL.md','utf8')}\nDevelopment feedback only:\n${JSON.stringify(failures,null,2)}\n`);
  console.log('Prepared development-only feedback; holdout rows and all seeds excluded.');
} else throw new Error('Commands: create | prepare development|holdout dir | score replies.json new-dir | improve-prompt results.json output.txt');
