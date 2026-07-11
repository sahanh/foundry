// Shared rendering engine for the docs viewer.
//
// This module is the single definition of how a Markdown doc becomes HTML, how
// the doc tree (with token counts) is built, and how internal links are rewritten
// to `?doc=` routes the client intercepts. It is imported by BOTH:
//   - server.mjs  — the local live-reload authoring server (renders per request)
//   - build.mjs   — the static exporter (renders every doc once at build time)
// so the published site and the local preview are byte-for-byte the same render.

import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';

const SITE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(SITE_DIR, '..');

// Directories/entries that never belong in the doc tree. `site` excludes this
// whole website subtree so the viewer never lists its own source as docs.
export const IGNORED_DIRS = new Set(['node_modules', '.git', 'site']);

// ---------------------------------------------------------------------------
// Path helpers — everything is validated to stay inside REPO_ROOT.
// ---------------------------------------------------------------------------

/** Resolve a repo-relative path to an absolute one, or null if it escapes root. */
export function resolveInRepo(relPath) {
  const clean = (relPath || '').replace(/^\/+/, '');
  const abs = path.resolve(REPO_ROOT, clean);
  if (abs !== REPO_ROOT && !abs.startsWith(REPO_ROOT + path.sep)) return null;
  return abs;
}

/** Repo-relative POSIX path for an absolute path. */
export function toRepoRel(abs) {
  return path.relative(REPO_ROOT, abs).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// GitHub-style heading slugs.
// ---------------------------------------------------------------------------

export function githubSlug(text) {
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

/** Render a Markdown string to HTML, tagging internal links with the doc's path. */
export function renderDoc(raw, repoRelPath) {
  return md.render(raw, { docPath: repoRelPath });
}

// ---------------------------------------------------------------------------
// Doc tree.
// ---------------------------------------------------------------------------

// Token count per file, cached by mtime so live-reload only re-tokenizes what
// actually changed. Counts use the o200k BPE encoding as a proxy for Claude.
const tokenCache = new Map(); // abs -> { mtimeMs, tokens }

export async function tokensForFile(abs) {
  const info = await stat(abs);
  const cached = tokenCache.get(abs);
  if (cached && cached.mtimeMs === info.mtimeMs) return cached.tokens;
  const raw = await readFile(abs, 'utf8');
  const tokens = encode(raw).length;
  tokenCache.set(abs, { mtimeMs: info.mtimeMs, tokens });
  return tokens;
}

export async function buildTree(absDir = REPO_ROOT) {
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
export async function renderDirIndex(absDir, relDir) {
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
// highlight.js theme CSS. The viewer commits to a single dark (forge) look
// regardless of OS preference, so we ship only the dark token theme — a
// light theme would render unreadable on the dark background.
// ---------------------------------------------------------------------------

export async function highlightThemeCss() {
  const p = fileURLToPath(import.meta.resolve('highlight.js/styles/github-dark.css'));
  return readFile(p, 'utf8');
}
