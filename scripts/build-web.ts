import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const outdir = "dist";
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await build({
  entryPoints: ["web/entry.jsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  inject: ["web/react-shim.jsx"],
  outdir,
  entryNames: "app",
  minify: true,
  logLevel: "info",
});
await cp("web/index.html", `${outdir}/index.html`);
console.log(`Built standalone static site in ${outdir}/`);
