import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { generateVariant } from './variants.js';
import type { Level } from './engine.js';

const levels = () => vm.runInNewContext(readFileSync('PreviewPage.jsx','utf8').match(/const DUCK_LEVELS=(\[[\s\S]*?\]);/)![1]) as Level[];

test('persisted browser variation adapter produces the same seeded puzzles as TypeScript',()=>{
  const context:Record<string,unknown>={};
  vm.runInNewContext(readFileSync('sokoban/engine.browser.js','utf8'),context);
  vm.runInNewContext(readFileSync('sokoban/variants.browser.js','utf8'),context);
  const browser=context.__DUCK_VARIANTS__ as {generateVariant:typeof generateVariant};
  for(const base of levels())for(const seed of ['practice-1','0','delivery-🦆'])
    assert.equal(JSON.stringify(browser.generateVariant(base,seed)),JSON.stringify(generateVariant(base,seed)));
});

test('seeded practice leaves every original frozen benchmark input unchanged',()=>{
  const frozen=JSON.parse(readFileSync('evals/duck/frozen.json','utf8'));
  for(const [path,expected]of Object.entries(frozen.hashes)) {
    const actual=createHash('sha256').update(readFileSync(path)).digest('hex');
    assert.equal(actual,expected,`Frozen original benchmark changed: ${path}`);
  }
});

test('actual preview exposes the generated instance used by its reducer',()=>{
  const source=readFileSync('PreviewPage.jsx','utf8');
  const context:Record<string,any>={};
  vm.runInNewContext(source.slice(0,source.indexOf('\n function PreviewPage')),context);
  const result=vm.runInNewContext('gameReducer(createGame(3), {type:"variant",seed:"judge-2026"})',context);
  assert.equal(result.activeSeed,'judge-2026');
  assert.equal(result.variantError,null);
  assert.equal(JSON.stringify(result.activeLevel),JSON.stringify((generateVariant(levels()[3],'judge-2026') as any).puzzle));
});
