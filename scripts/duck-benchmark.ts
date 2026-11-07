// Browser-assisted benchmark harness: prepare fixed prompts, then score actual
// saved TrueForge replies. This script never fabricates or starts a session.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DUCK_PROTOCOL, evaluatePuzzle, scorePuzzles } from '../evals/duck-score.js';
import { solveLevel } from '../sokoban/solver.js';
import type { Level } from '../sokoban/engine.js';

type Task = { id: string; holdout: boolean; level: Level };
const taskPath = 'evals/duck/tasks.json';
const freezePath = 'evals/duck/frozen.json';
const tasks = JSON.parse(readFileSync(taskPath, 'utf8')) as Task[];
const tracked = [taskPath, 'evals/duck-score.ts', 'sokoban/engine.ts', 'sokoban/engine.browser.js',
  'agent/duck-instructions.md', 'scripts/duck-benchmark.ts', 'scripts/duck-simulate.py'];
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const hashes = () => Object.fromEntries(tracked.map(path => [path, hash(path)]));
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const [command, input, output] = process.argv.slice(2);

function validateTasks() {
  if (tasks.length !== 8 || tasks.filter(task => task.holdout).length !== 4 || new Set(tasks.map(task => task.id)).size !== 8)
    throw new Error('Expected 8 unique tasks, exactly 4 withheld from improvement');
  for (const task of tasks) {
    const result = solveLevel(task.level);
    if (result.status !== 'solved') throw new Error(`${task.id}: solvability ${result.status}`);
  }
}
function checkFreeze() {
  if (!existsSync(freezePath)) throw new Error('Freeze the verified setup before preparing official prompts');
  const frozen = JSON.parse(readFileSync(freezePath, 'utf8'));
  if (JSON.stringify(frozen.hashes) !== JSON.stringify(hashes())) throw new Error('Frozen task/engine/scorer/prompt changed; do not compare this run');
  const config = JSON.parse(readFileSync('agent/duck-agent.json', 'utf8'));
  if (JSON.stringify(config.model) !== JSON.stringify(frozen.model) || JSON.stringify(config.runtime) !== JSON.stringify(frozen.runtime))
    throw new Error('Model or runtime budget changed after freeze');
  return frozen;
}

if (command === 'check') {
  validateTasks();
  console.log('8 tasks independently solver-verified; 4 development / 4 holdout');
} else if (command === 'freeze') {
  if (existsSync(freezePath)) throw new Error('A freeze already exists; never overwrite a benchmark freeze');
  validateTasks();
  writeJson(freezePath, { protocol: DUCK_PROTOCOL, hashes: hashes(),
    model: JSON.parse(readFileSync('agent/duck-agent.json', 'utf8')).model,
    runtime: JSON.parse(readFileSync('agent/duck-agent.json', 'utf8')).runtime,
    initialSkillHash: hash('agent/skills/duck-planning/SKILL.md'),
    initialRegisteredSkill: 'agent-skill:stranger-builds/default/duck-planning:1' });
  console.log('Frozen. Commit this file before Run 1. Do not regenerate tasks after Run 1.');
} else if (command === 'prepare') {
  checkFreeze();
  const dir = input ?? 'runs/duck-prepared';
  mkdirSync(dir, { recursive: true });
  for (const task of tasks) {
    const prompt = `Solve this independent fixed Sokoban puzzle. Use duck-planning and the sandbox. No access to other tasks, solutions, repository, or previous runs. At most 2 final submissions, each <=100 attempted moves from the INITIAL board. Invalid plans consume submissions; blocked moves consume attempts. Return ONLY JSON {"moves":[...]} (one whole JSON fence allowed), no prose. If given second-submission feedback, restart from the original puzzle.\nPuzzle: ${JSON.stringify(task.level)}\n\nThe sandbox has Python. Install quickjs from PyPI if absent. Save the following exact canonical JS and adapter into temporary files and use them to check plans. Do not implement replacement movement rules.\nCanonical engine:\n\`\`\`js\n${readFileSync('sokoban/engine.browser.js','utf8')}\n\`\`\`\nAdapter:\n\`\`\`python\n${readFileSync('scripts/duck-simulate.py','utf8')}\n\`\`\`\n`;
    writeFileSync(join(dir, `${task.id}.txt`), prompt);
  }
  console.log(`Prepared ${tasks.length} prompts. Run each in a fresh saved-agent session with the frozen model/runtime and chosen skill version.`);
} else if (command === 'score') {
  const frozen = checkFreeze();
  if (!input || !output) throw new Error('Usage: duck-benchmark.ts score actual-replies.json new-output-directory');
  if (existsSync(output)) throw new Error('Output already exists; never overwrite run evidence');
  const replies = JSON.parse(readFileSync(input, 'utf8')) as Array<{ taskId: string; sessionId: string; skillVersion: string; status: string; replies: string[] }>;
  if (replies.length !== tasks.length || new Set(replies.map(reply => reply.taskId)).size !== tasks.length)
    throw new Error('Exactly one result per fixed task is required');
  const skillVersions = new Set(replies.map(reply => reply.skillVersion));
  if (skillVersions.size !== 1 || !replies[0].skillVersion) throw new Error('Pin one skill version per run');
  const results = tasks.map(task => {
    const reply = replies.find(reply => reply.taskId === task.id);
    if (!reply || !/^[a-zA-Z0-9_-]+$/.test(reply.sessionId) || reply.status !== 'done' || !reply.replies.length)
      throw new Error(`Missing/failed TrueForge session for ${task.id}; infrastructure failure is not a valid benchmark`);
    return { ...reply, holdout: task.holdout,
      result: evaluatePuzzle(task.level, reply.replies) };
  });
  mkdirSync(output, { recursive: true });
  writeJson(join(output,'results.json'), results);
  const total = scorePuzzles(results.map(result => result.result));
  writeJson(join(output,'score.json'), { score: total,
    development: scorePuzzles(results.filter(result => !result.holdout).map(result => result.result)),
    holdout: scorePuzzles(results.filter(result => result.holdout).map(result => result.result)),
    freeze: frozen, skillVersion: replies[0].skillVersion,
    evidenceStatus: 'Locally scored imported replies; retain and inspect actual TrueForge sessions and exports' });
  console.log(`Score: ${total}. This command scores supplied evidence; it does not verify session provenance.`);
} else if (command === 'improve-prompt') {
  checkFreeze();
  if (!input || !output) throw new Error('Usage: duck-benchmark.ts improve-prompt run/results.json output.txt');
  const results = JSON.parse(readFileSync(input,'utf8')) as Array<{taskId:string;holdout:boolean;result:{solved:boolean};replies:string[]}>;
  const feedback = results.filter(result => !result.holdout && !result.result.solved).map(result => {
    const task = tasks.find(task => task.id === result.taskId && !task.holdout);
    if (!task) throw new Error('Unknown development task');
    return { level: task.level, replies: result.replies, feedback: result.result };
  });
  if (!feedback.length) throw new Error('No development failures. Do not manufacture improvement or change frozen tasks.');
  writeFileSync(output, `This is skill improvement, not a puzzle submission. In a separate session with ALL tools, sandbox, web and subagents OFF, rewrite only the planning skill below from the development failures. No holdout data is supplied. Preserve frontmatter; learn general methods, not task IDs, coordinates, map strings or stored move sequences. Return the full SKILL.md only. Do not change engine, scorer, tasks, model, runtime or budgets.\nCurrent skill:\n${readFileSync('agent/skills/duck-planning/SKILL.md','utf8')}\nDevelopment failures only:\n${JSON.stringify(feedback,null,2)}\n`);
  console.log('Prepared development-only improvement prompt. Copy actual agent-written output unchanged; commit with its real Agent-Session trailer.');
} else {
  throw new Error('Commands: check | freeze | prepare [dir] | score replies.json new-dir | improve-prompt results.json output.txt');
}
