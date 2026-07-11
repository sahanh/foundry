// Static site build.
//
// Runs the shared render engine (render.mjs) over every doc once and emits a
// fully static `dist/` — no runtime server. Layout:
//   dist/index.html              the landing page
//   dist/.nojekyll               tell GitHub Pages not to Jekyll-process the tree
//   dist/docs/                   the viewer SPA
//     index.html app.js styles.css
//     tree.json                  nav tree + token counts (was GET /api/tree)
//     vendor/highlight.css       syntax theme (light + dark)
//     content/<repo-path>.html   one prerendered file per doc/dir (was GET /api/doc)
//
// All asset paths are relative, so the output works both at a domain root and at
// a subpath (e.g. user.github.io/foundry/) with no rebuild.

import { rm, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { REPO_ROOT, buildTree, renderDoc, renderDirIndex, highlightThemeCss } from './render.mjs';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const LANDING = path.join(SITE_DIR, 'landing', 'index.html');
const PUBLIC = path.join(SITE_DIR, 'public');
const DIST = path.join(SITE_DIR, 'dist');
const DOCS = path.join(DIST, 'docs');
const CONTENT = path.join(DOCS, 'content');

/** Write a file, creating parent directories as needed. */
async function writeEnsured(abs, data) {
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
}

/**
 * Prerender every node in the tree to `content/<path>.html`. The client fetches
 * `./content/${doc}.html` where `doc` is the raw `?doc=` value, so:
 *   file `packages/core/testing.md` -> content/packages/core/testing.md.html
 *   dir  `packages/core`            -> content/packages/core.html  (a dir index)
 * Files always end in `.md` and dirs never do, so the two namespaces never collide.
 */
async function emitContent(nodes) {
  for (const node of nodes) {
    const out = path.join(CONTENT, `${node.path}.html`);
    if (node.type === 'file') {
      const raw = await readFile(path.join(REPO_ROOT, node.path), 'utf8');
      await writeEnsured(out, renderDoc(raw, node.path));
    } else {
      const html = await renderDirIndex(path.join(REPO_ROOT, node.path), node.path);
      await writeEnsured(out, html);
      await emitContent(node.children);
    }
  }
}

/** Copy the SPA into dist/docs, flipping it into static mode. */
async function emitViewerShell() {
  let html = await readFile(path.join(PUBLIC, 'index.html'), 'utf8');
  // Turn on static data sources (fetch prerendered files instead of /api/*).
  html = html.replace(
    '<script src="./app.js" type="module"></script>',
    '<script>window.__DOCS_STATIC__ = true;</script>\n    <script src="./app.js" type="module"></script>',
  );
  await writeEnsured(path.join(DOCS, 'index.html'), html);
  await copyFile(path.join(PUBLIC, 'app.js'), path.join(DOCS, 'app.js'));
  await copyFile(path.join(PUBLIC, 'styles.css'), path.join(DOCS, 'styles.css'));
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DOCS, { recursive: true });

  // Landing page at the site root.
  await copyFile(LANDING, path.join(DIST, 'index.html'));
  await writeFile(path.join(DIST, '.nojekyll'), '');

  // The docs viewer.
  const tree = await buildTree();
  await emitContent(tree);
  await writeEnsured(path.join(DOCS, 'tree.json'), JSON.stringify(tree));
  await writeEnsured(path.join(DOCS, 'vendor', 'highlight.css'), await highlightThemeCss());
  await emitViewerShell();

  // Report.
  const countFiles = (ns) =>
    ns.reduce((n, x) => n + (x.type === 'file' ? 1 : countFiles(x.children)), 0);
  console.log(`Built dist/ — ${countFiles(tree)} docs rendered.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
