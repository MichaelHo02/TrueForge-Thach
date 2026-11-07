import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import * as ts from "typescript";

const sourcePath = "sokoban/engine.ts";
const previewPath = "PreviewPage.jsx";
const artifactPath = "sokoban/engine.browser.js";
const source = readFileSync(sourcePath, "utf8");
const sha = createHash("sha256").update(source).digest("hex");
const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const exports = [...source.matchAll(/^export\s+(?:const|function|class|type|interface)\s+([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]).filter((name) => !["Direction", "Position", "Terrain", "Level", "GameState", "ReplayResult"].includes(name));
const body = transpiled
  .replace(/^export\s+(?=(?:const|function|class)\b)/gm, "")
  .replace(/^export\s+(?:type|interface)\b[^\n]*\n/gm, "");
const generated = `const __DUCK_DELIVERY_ENGINE__ = (() => {\n${body.trim()}\n  return { ${exports.join(", ")} };\n})();`;
const previewBlock = `/* GENERATED ENGINE START: source=${sourcePath} sha256=${sha} */\n${generated}\nconst { ${exports.join(", ")} } = __DUCK_DELIVERY_ENGINE__;\n/* GENERATED ENGINE END */`;
const iife = generated.replace(/^const __DUCK_DELIVERY_ENGINE__ = /, "");
const artifact = `/* Generated from ${sourcePath}; sha256=${sha}; do not edit. */\nglobalThis.__DUCK_DELIVERY_ENGINE__ = ${iife}\n`;
const preview = readFileSync(previewPath, "utf8");
const persistedPreview = preview.match(/\/\* GENERATED ENGINE START:[\s\S]*?\/\* GENERATED ENGINE END \*\//)?.[0];
const check = process.argv.includes("--check");
if (check) {
  if (persistedPreview !== previewBlock) throw new Error("PreviewPage.jsx generated engine block is stale");
  if (readFileSync(artifactPath, "utf8") !== artifact) throw new Error("sokoban/engine.browser.js is stale");
  console.log(`Generated outputs are fresh from ${sourcePath} (${sha})`);
} else {
  if (!persistedPreview) throw new Error("PreviewPage.jsx is missing its generated engine block");
  writeFileSync(previewPath, preview.replace(persistedPreview, previewBlock));
  writeFileSync(artifactPath, artifact);
  console.log(`Generated ${previewPath} and ${artifactPath} from ${sourcePath} (${sha})`);
}
