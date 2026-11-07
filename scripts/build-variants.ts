import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync('sokoban/variants.ts','utf8');
const digest = createHash('sha256').update(source).digest('hex');
let js = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const parsed = ts.createSourceFile('variants.js',js,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
const imports = parsed.statements.filter(ts.isImportDeclaration);
for (const declaration of [...imports].reverse()) {
  if (!ts.isStringLiteral(declaration.moduleSpecifier) || declaration.moduleSpecifier.text !== './engine.js' ||
      !declaration.importClause?.namedBindings || !ts.isNamedImports(declaration.importClause.namedBindings))
    throw new Error('Variation browser adapter permits only named imports from the canonical engine');
  const names = declaration.importClause.namedBindings.elements.map(binding =>
    binding.propertyName ? `${binding.propertyName.text}: ${binding.name.text}` : binding.name.text);
  js = js.slice(0,declaration.getStart(parsed)) + `const { ${names.join(', ')} } = engine;` + js.slice(declaration.end);
}
js = js.replace(/^export\s+/gm,'');
const factory = `(engine => {\n${js}\nreturn { generateVariant, VARIANT_VERSION };\n})`;
const block = `/* GENERATED VARIANTS START: sha256=${digest} */\nconst __DUCK_VARIANTS__ = globalThis.__DUCK_VARIANTS__ = ${factory}(__DUCK_DELIVERY_ENGINE__);\nconst { generateVariant, VARIANT_VERSION } = __DUCK_VARIANTS__;\n/* GENERATED VARIANTS END */`;
const artifact = `// Generated from sokoban/variants.ts; sha256=${digest}\nglobalThis.__DUCK_VARIANTS__ = ${factory}(globalThis.__DUCK_DELIVERY_ENGINE__);\n`;
const preview = readFileSync('PreviewPage.jsx','utf8');
const marker = /\/\* GENERATED VARIANTS START:[\s\S]*?\/\* GENERATED VARIANTS END \*\//;
const existing = preview.match(marker)?.[0];
if (process.argv.includes('--check')) {
  if (existing !== block || readFileSync('sokoban/variants.browser.js','utf8') !== artifact)
    throw new Error('Stale variation adapter; run npm run build:variants');
  console.log(`Variation adapters are fresh (${digest})`);
} else {
  if (!existing && !preview.includes('\nconst DUCK_LEVELS=')) throw new Error('Missing preview insertion boundary');
  writeFileSync('PreviewPage.jsx',existing ? preview.replace(marker,block) : preview.replace('\nconst DUCK_LEVELS=',`\n${block}\n\nconst DUCK_LEVELS=`));
  writeFileSync('sokoban/variants.browser.js',artifact);
  console.log(`Generated separate variation adapters (${digest}); canonical engine unchanged`);
}
