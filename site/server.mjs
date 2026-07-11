// Local live-reload authoring server for the docs.
//
// Renders each doc per request using the SHARED engine in render.mjs (the same
// code the static build uses), and pushes SSE reload events on Markdown changes.
// This is a local tool only — the published site is static (see build.mjs).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  REPO_ROOT,
  IGNORED_DIRS,
  resolveInRepo,
  toRepoRel,
  renderDoc,
  buildTree,
  renderDirIndex,
  highlightThemeCss,
} from './render.mjs';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(SITE_DIR, 'public');
const PORT = Number(process.env.PORT) || 4321;

// ---------------------------------------------------------------------------
// SSE live reload.
// ---------------------------------------------------------------------------

const sseClients = new Set();
let watchDebounce = null;
let pendingPath = '';

function notifyReload(changedRel) {
  pendingPath = changedRel;
  if (watchDebounce) return;
  watchDebounce = setTimeout(() => {
    watchDebounce = null;
    const payload = `event: reload\ndata: ${JSON.stringify({ path: pendingPath })}\n\n`;
    for (const res of sseClients) res.write(payload);
  }, 100);
}

watch(REPO_ROOT, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  const rel = filename.split(path.sep).join('/');
  const top = rel.split('/')[0];
  if (IGNORED_DIRS.has(top) || top.startsWith('.')) return;
  if (!/\.md$/i.test(rel)) return;
  notifyReload(rel);
});

// ---------------------------------------------------------------------------
// HTTP server.
// ---------------------------------------------------------------------------

const STATIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
};

function send(res, status, type, body) {
  // Never cache: this is a live-reload dev tool, always serve the latest asset.
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store, must-revalidate',
  });
  res.end(body);
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Static assets.
  if (STATIC_FILES[pathname]) {
    const { file, type } = STATIC_FILES[pathname];
    try {
      const body = await readFile(path.join(PUBLIC_DIR, file));
      return send(res, 200, type, body);
    } catch {
      return send(res, 404, 'text/plain', 'Not found');
    }
  }

  // Color-scheme-aware highlight.js theme (light + dark variants).
  if (pathname === '/vendor/highlight.css') {
    try {
      return send(res, 200, 'text/css; charset=utf-8', await highlightThemeCss());
    } catch {
      return send(res, 404, 'text/plain', 'highlight theme not found');
    }
  }

  // File tree.
  if (pathname === '/api/tree') {
    const tree = await buildTree(REPO_ROOT);
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(tree));
  }

  // Rendered doc (or directory index).
  if (pathname === '/api/doc') {
    const relParam = url.searchParams.get('path') || '';
    const abs = resolveInRepo(relParam);
    if (!abs) return send(res, 400, 'text/plain', 'Invalid path');
    try {
      const info = await stat(abs);
      if (info.isDirectory()) {
        const html = await renderDirIndex(abs, toRepoRel(abs));
        return send(res, 200, 'text/html; charset=utf-8', html);
      }
      if (!/\.md$/i.test(abs)) return send(res, 400, 'text/plain', 'Not a Markdown file');
      const raw = await readFile(abs, 'utf8');
      const html = renderDoc(raw, toRepoRel(abs));
      return send(res, 200, 'text/html; charset=utf-8', html);
    } catch {
      return send(res, 404, 'text/plain', 'Not found');
    }
  }

  // SSE stream.
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  return send(res, 404, 'text/plain', 'Not found');
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'text/plain', 'Internal error');
  });
}).listen(PORT, () => {
  console.log(`Foundry docs viewer (local) running at http://localhost:${PORT}`);
  console.log(`Serving Markdown from ${REPO_ROOT}`);
});
