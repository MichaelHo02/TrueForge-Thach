import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";

const sourcePath = "sokoban/engine.ts";
const previewPath = "PreviewPage.jsx";
const artifactPath = "sokoban/engine.browser.js";
const checkOnly = process.argv.includes("--check");
const source = readFileSync(sourcePath, "utf8");
const sourceHash = createHash("sha256").update(source).digest("hex").slice(0, 16);
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(/^export\s+/gm, "");
const names = "initialState, isWon, step, validateLevel, serialize, hash, plan, directionDelta";
const body = `${transpiled}\nreturn { ${names} };`;
const previewBlock = `/* GENERATED ENGINE START: source=${sourcePath} sha256=${sourceHash} */\nconst __DUCK_DELIVERY_ENGINE__ = (() => {\n${body}\n})();\nconst { initialState, isWon, step, validateLevel } = __DUCK_DELIVERY_ENGINE__;\n/* GENERATED ENGINE END */`;
const artifact = `// GENERATED FILE. Source: ${sourcePath}; sha256=${sourceHash}.\nglobalThis.__DUCK_DELIVERY_ENGINE__ = (() => {\n${body}\n})();\n`;

const start = "/* GENERATED ENGINE START";
const end = "/* GENERATED ENGINE END */";
function expectedPreview(preview: string): string {
  const startIndex = preview.indexOf(start);
  const endIndex = preview.indexOf(end, startIndex);
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Missing generated engine markers in ${previewPath}`);
  return `${preview.slice(0, startIndex)}${previewBlock}${preview.slice(endIndex + end.length)}`;
}
function persistedBlock(preview: string): string {
  const startIndex = preview.indexOf(start);
  const endIndex = preview.indexOf(end, startIndex);
  if (startIndex < 0 || endIndex < startIndex) throw new Error(`Missing generated engine markers in ${previewPath}`);
  return preview.slice(startIndex, endIndex + end.length);
}
function checkPersisted(): void {
  const preview = readFileSync(previewPath, "utf8");
  const actualPreview = persistedBlock(preview);
  if (actualPreview !== previewBlock) throw new Error(`Stale generated engine block in ${previewPath}; run npm run build:preview-engine`);
  let actualArtifact: string;
  try { actualArtifact = readFileSync(artifactPath, "utf8"); }
  catch { throw new Error(`Missing generated browser artifact ${artifactPath}; run npm run build:preview-engine`); }
  if (actualArtifact !== artifact) throw new Error(`Stale generated browser artifact ${artifactPath}; run npm run build:preview-engine`);
}

if (checkOnly) {
  checkPersisted();
  console.log(`Generated outputs are fresh from ${sourcePath} (${sourceHash})`);
} else {
  const preview = readFileSync(previewPath, "utf8");
  writeFileSync(previewPath, expectedPreview(preview));
  writeFileSync(artifactPath, artifact);
  checkPersisted();
  console.log(`Generated ${previewPath} and ${artifactPath} from ${sourcePath} (${sourceHash})`);
}
