// Run from the authorized browser REPL, passing its existing game tab handle.
// No browser is launched here; every move uses the tab's native WebMCP capability.
import * as fs from 'node:fs/promises';
import path from 'node:path';

const nativeNames = ['duck_get_board', 'duck_move', 'duck_restart'];
const unpack = value => typeof value === 'string' ? JSON.parse(value) : value;
const boardOf = result => JSON.parse(result.content[0].text);
const failure = message => ({isError: true, content: [{type: 'text', text: JSON.stringify({error: message})}]});

export async function connectBrowserWorker(tab, queueDir, onStep = async () => {}) {
  await fs.mkdir(queueDir, {recursive: true});
  const capability = await tab.capabilities.get('webmcp');
  const tools = await capability.fetchTools();
  const description = tools.description();
  const discovered = JSON.parse(description.slice(description.indexOf('['), description.lastIndexOf(']') + 1));
  const names = Object.fromEntries(discovered.map(tool => [tool.name.split('__')[0], tool.name]));
  if (nativeNames.some(name => !names[name])) throw new Error('The active page must expose all three native Duck Delivery WebMCP tools');
  await fs.writeFile(path.join(queueDir, 'tools.json'), JSON.stringify(discovered.filter(tool => nativeNames.includes(tool.name.split('__')[0])).map(tool => ({...tool, name: tool.name.split('__')[0]})), null, 2));
  let pending;
  async function call(name, input, jobId) {
    const result = unpack(await tools.call(names[name], input));
    const event = {at: new Date().toISOString(), jobId, tool: name, input, result};
    await fs.appendFile(path.join(queueDir, 'native-calls.jsonl'), JSON.stringify(event) + '\n');
    await onStep(event);
    return result;
  }
  async function finish(result) {
    const file = path.join(queueDir, pending.job.id + '.result.json');
    await fs.writeFile(file + '.tmp', JSON.stringify(result));
    await fs.rename(file + '.tmp', file);
    pending = undefined;
  }
  return {
    async pump(maxMs = 40000) {
      const start = Date.now(); let executed = 0;
      while (Date.now() - start < maxMs) {
        if (!pending) {
          const jobs = (await fs.readdir(queueDir)).filter(file => /^[0-9a-f-]{36}\.job\.json$/.test(file)).sort();
          for (const file of jobs) {
            if (await fs.stat(path.join(queueDir, file.replace('.job.json', '.result.json'))).catch(() => null)) continue;
            try { pending = {job: JSON.parse(await fs.readFile(path.join(queueDir, file), 'utf8')), steps: []}; break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
          }
          if (!pending) break;
        }
        const {job} = pending;
        if (job.expiresAt * 1000 <= Date.now()) {await finish(failure('Live operation expired; read the board before retrying.')); continue;}
        if (job.tool !== 'duck_play_plan') {
          if (!nativeNames.includes(job.tool)) {await finish(failure('Unknown native tool')); continue;}
          const result = await call(job.tool, job.arguments, job.id);
          executed++; await finish(result); continue;
        }
        if (!pending.board) {
          const result = await call('duck_get_board', {}, job.id);
          pending.board = boardOf(result); executed++;
          if (pending.board.mode !== 'interactive' || pending.board.revision !== job.arguments.expectedRevision) {await finish(failure('Live board changed or is locked. Read its current revision before retrying.')); continue;}
        }
        const direction = job.arguments.moves[pending.steps.length];
        const result = await call('duck_move', {direction, expectedRevision: pending.board.revision}, job.id);
        pending.board = boardOf(result); pending.steps.push(pending.board); executed++;
        if (result.isError || pending.steps.length === job.arguments.moves.length) {
          await finish({...(result.isError ? {isError: true} : {}), content: [{type: 'text', text: JSON.stringify({transport: 'native-browser-webmcp', attempts: pending.steps.length, board: pending.board, steps: pending.steps})}]});
        }
      }
      return {nativeCalls: executed, pending: pending ? {tool: pending.job.tool, completedMoves: pending.steps.length} : null};
    },
  };
}
