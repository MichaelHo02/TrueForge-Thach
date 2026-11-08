// Deployment fallback: keep Shelled's plain PreviewPage contract and bind React
// inside the same bundled module. Only the explicit browser entry is bundled.
import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const source = await readFile('PreviewPage.jsx', 'utf8');
await mkdir('dist', { recursive: true });
await build({
  stdin: {
    contents: `import React from 'react';\nimport benchmarkTasks from './evals/duck/tasks.json';\nglobalThis.__DUCK_BENCHMARK_TASKS__ = benchmarkTasks;\nimport {createRoot} from 'react-dom/client';\nimport {flushSync} from 'react-dom';\nimport {registerDuckWebMCP} from './web/webmcp.mjs';\nimport './PreviewPage.css';\nglobalThis.__DUCK_REGISTER_WEBMCP__ = options => registerDuckWebMCP({...options, commit: action => flushSync(() => options.commit(action))});\n${source}\ncreateRoot(document.getElementById('root')).render(React.createElement(PreviewPage));`,
    resolveDir: process.cwd(),
    loader: 'jsx',
  },
  bundle: true,
  minify: true,
  outfile: 'dist/game.js',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof',
});
await writeFile('dist/index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f0df"><title>Duck Delivery — Sokoban</title><link rel="stylesheet" href="/game.css"><style>body{margin:0}</style></head><body><div id="root"></div><script type="module" src="/game.js"></script></body></html>');
