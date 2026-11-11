/* =========================================================================
   SITE WIRING TESTS
   =========================================================================
   Checks the things that keep the site fast, which are easy to break by
   hand. Run from the project folder:
       node tests/site.test.js

     1. Every page preloads exactly the scripts the site imports.
     2. The service worker knows every page.
     3. Every image has up-to-date small copies listed in the manifest.
   The tournament engine has its own tests in engine.test.js.
   ========================================================================= */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, relative, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const pages = readdirSync(ROOT).filter(f => f.endsWith(".html")).sort();

let failed = 0;
const check = (name, problems) => {
  if (problems.length) { failed++; console.log(`  ✗ ${name}`); problems.forEach(p => console.log(`      ${p}`)); }
  else console.log(`  ✓ ${name}`);
};

/* ---- 1. modulepreload lists -------------------------------------------- */

function importGraph(entry) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      walk(resolve(dirname(file), m[1]));
    }
  };
  walk(join(ROOT, entry));
  return [...seen].map(f => relative(ROOT, f).split("\\").join("/"));
}

/* Season files change every season and are found through _index.js, so
   pages do not list them. */
const needed = importGraph("js/app.js").filter(f => !/^data\/seasons\/season-/.test(f)).sort();

console.log("\nPages preload the scripts they need");
for (const page of pages) {
  const html = read(page);
  const listed = [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(m => m[1]).sort();
  const problems = [
    ...needed.filter(f => !listed.includes(f)).map(f => `missing: <link rel="modulepreload" href="${f}">`),
    ...listed.filter(f => !needed.includes(f)).map(f => `listed but not used: ${f}`)
  ];
  check(page, problems);
}

/* ---- 2. service worker --------------------------------------------------- */

console.log("\nThe service worker knows every page");
{
  const sw = read("sw.js");
  const list = sw.match(/const PAGES = \[([^\]]+)\]/)?.[1] ?? "";
  const known = [...list.matchAll(/"([^"]+)"/g)].map(m => m[1]).sort();
  check("sw.js PAGES", [
    ...pages.filter(p => !known.includes(p)).map(p => `add "${p}" to PAGES in sw.js`),
    ...known.filter(p => !pages.includes(p)).map(p => `"${p}" is in PAGES but the file does not exist`)
  ]);
}

/* ---- 3. image manifest --------------------------------------------------- */

console.log("\nImages have up-to-date small copies");
{
  const problems = [];
  let manifest = {};
  try {
    const text = read("assets/_small/manifest.js");
    manifest = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch { problems.push("assets/_small/manifest.js is missing or unreadable"); }

  const TYPES = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  const sources = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (rel !== "assets/_small" && rel !== "assets/fonts") walk(rel); }
      else if (TYPES.has(extname(entry.name).toLowerCase())) sources.push(rel);
    }
  };
  walk("assets");

  for (const src of sources) {
    const entry = manifest[src];
    if (!entry) { problems.push(`no small copies for ${src}`); continue; }
    const sha = createHash("sha1").update(readFileSync(join(ROOT, src))).digest("hex").slice(0, 12);
    if (sha !== entry.sha) { problems.push(`${src} changed since its small copies were made`); continue; }
    const stem = src.slice("assets/".length, src.lastIndexOf("."));
    for (const w of entry.sizes) {
      if (!existsSync(join(ROOT, `assets/_small/${stem}-${w}.webp`))) problems.push(`missing file assets/_small/${stem}-${w}.webp`);
    }
  }
  for (const key of Object.keys(manifest)) {
    if (!sources.includes(key)) problems.push(`${key} is listed but no longer exists`);
  }
  if (problems.length) problems.push("fix: python3 tools/optimize-images.py");
  check(`${sources.length} images`, problems);
}

console.log(failed ? `\n  ${failed} check(s) failed\n` : "\n  all checks passed\n");
process.exit(failed ? 1 : 0);
