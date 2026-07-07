import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';

const VIEWER_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(VIEWER_DIR, '..');
const PUBLIC_DIR = path.join(VIEWER_DIR, 'public');
const PORT = Number(process.env.PORT) || 4321;

// Directories/entries that never belong in the doc tree.
const IGNORED_DIRS = new Set(['node_modules', '.git', 'viewer']);

// ---------------------------------------------------------------------------
// Path helpers — everything is validated to stay inside REPO_ROOT.
// ---------------------------------------------------------------------------

/** Resolve a repo-relative path to an absolute one, or null if it escapes root. */
function resolveInRepo(relPath) {
  const clean = (relPath || '').replace(/^\/+/, '');
  const abs = path.resolve(REPO_ROOT, clean);
  if (abs !== REPO_ROOT && !abs.startsWith(REPO_ROOT + path.sep)) return null;
  return abs;
}

/** Repo-relative POSIX path for an absolute path. */
function toRepoRel(abs) {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// GitHub-style heading slugs.
// ---------------------------------------------------------------------------

function githubSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // strip punctuation
    .replace(/\s+/g, '-'); // spaces -> hyphens
}

// ---------------------------------------------------------------------------
// Markdown rendering.
// ---------------------------------------------------------------------------

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, lang) {
    // Only highlight when the fence names a known language. Auto-detection
    // mangles plain diagrams/trees (dimming most lines as "comments"), so
    // unlabeled fences render as full-color plain text.
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        /* fall through to plain */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

// Add GitHub-style ids to headings (dedupe with -1, -2, ...).
md.core.ruler.push('heading_ids', (state) => {
  const slugCounts = new Map();
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const inline = tokens[i + 1];
    if (!inline || inline.type !== 'inline') continue;
    let slug = githubSlug(inline.content);
    if (!slug) continue;
    const seen = slugCounts.get(slug) || 0;
    slugCounts.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${seen}`;
    tokens[i].attrSet('id', slug);
  }
});

// Rewrite links: internal .md/dir links become ?doc= routes the client intercepts.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1];
    rewriteHref(token, hrefIndex, href, env);
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function rewriteHref(token, hrefIndex, href, env) {
  // External or protocol links -> open in a new tab, leave untouched otherwise.
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener');
    return;
  }
  // Pure in-page fragment -> leave as-is; the client scrolls within the doc.
  if (href.startsWith('#')) return;

  const hashIndex = href.indexOf('#');
  const target = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const anchor = hashIndex >= 0 ? href.slice(hashIndex) : '';
  if (!target) return; // nothing to resolve (shouldn't happen after the # check)

  // Resolve relative to the directory of the current doc.
  const currentDir = path.dirname(path.join(REPO_ROOT, env.docPath || ''));
  const absTarget = path.resolve(currentDir, target);
  if (absTarget !== REPO_ROOT && !absTarget.startsWith(REPO_ROOT + path.sep)) return;

  const rel = toRepoRel(absTarget);
  const isMd = /\.md$/i.test(target);
  const isDir = target.endsWith('/') || !path.extname(target);
  if (isMd || isDir) {
    token.attrSet('href', `?doc=${encodeURIComponent(rel)}${anchor}`);
    token.attrSet('data-internal', '');
  }
}

// ---------------------------------------------------------------------------
// Doc tree.
// ---------------------------------------------------------------------------

// Token count per file, cached by mtime so live-reload only re-tokenizes what
// actually changed. Counts use the o200k BPE encoding as a proxy for Claude.
const tokenCache = new Map(); // abs -> { mtimeMs, tokens }

async function tokensForFile(abs) {
  const info = await stat(abs);
  const cached = tokenCache.get(abs);
  if (cached && cached.mtimeMs === info.mtimeMs) return cached.tokens;
  const raw = await readFile(abs, 'utf8');
  const tokens = encode(raw).length;
  tokenCache.set(abs, { mtimeMs: info.mtimeMs, tokens });
  return tokens;
}

async function buildTree(absDir) {
  const entries = await readdir(absDir, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const children = await buildTree(path.join(absDir, entry.name));
      if (children.length === 0) continue; // hide dirs with no docs
      nodes.push({
        name: entry.name,
        path: toRepoRel(path.join(absDir, entry.name)),
        type: 'dir',
        tokens: children.reduce((sum, c) => sum + (c.tokens || 0), 0),
        children,
      });
    } else if (/\.md$/i.test(entry.name)) {
      const abs = path.join(absDir, entry.name);
      nodes.push({
        name: entry.name,
        path: toRepoRel(abs),
        type: 'file',
        tokens: await tokensForFile(abs),
      });
    }
  }
  // Folders first, then files; alphabetical within each group.
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

/** Auto-generated index HTML for a directory target. */
async function renderDirIndex(absDir, relDir) {
  const entries = await readdir(absDir, { withFileTypes: true });
  const items = entries
    .filter((e) => e.isFile() && /\.md$/i.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
  const label = relDir || '.';
  const list = items
    .map((name) => {
      const rel = toRepoRel(path.join(absDir, name));
      return `<li><a href="?doc=${encodeURIComponent(rel)}" data-internal>${name}</a></li>`;
    })
    .join('\n');
  return `<h1>${label}/</h1>\n<ul>\n${list || '<li><em>No Markdown files.</em></li>'}\n</ul>`;
}

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

  // Color-scheme-aware highlight.js theme: light + dark variants, each behind
  // a prefers-color-scheme media query so token colors match the active theme.
  if (pathname === '/vendor/highlight.css') {
    try {
      const readTheme = async (name) => {
        const p = fileURLToPath(import.meta.resolve(`highlight.js/styles/${name}`));
        return readFile(p, 'utf8');
      };
      const [light, dark] = await Promise.all([
        readTheme('github.css'),
        readTheme('github-dark.css'),
      ]);
      const css =
        `@media (prefers-color-scheme: light) {\n${light}\n}\n` +
        `@media (prefers-color-scheme: dark) {\n${dark}\n}\n`;
      return send(res, 200, 'text/css; charset=utf-8', css);
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
      const html = md.render(raw, { docPath: toRepoRel(abs) });
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
  console.log(`Playbook viewer running at http://localhost:${PORT}`);
  console.log(`Serving Markdown from ${REPO_ROOT}`);
});
