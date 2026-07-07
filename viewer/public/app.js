const treeEl = document.getElementById('tree');
const docEl = document.getElementById('doc');
const searchEl = document.getElementById('search');
const totalEl = document.getElementById('total');
const docMetaEl = document.getElementById('docmeta');

const DEFAULT_DOC = 'README.md';
let currentDoc = null;
const tokensByPath = new Map(); // repo-relative path -> token count

// ---------------------------------------------------------- Token display --

/** Compact count for tight spaces: 1234 -> "1.2k". */
function fmtCompact(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/** Full count with grouping: 1234 -> "1,234". */
function fmtFull(n) {
  return n.toLocaleString('en-US');
}

/** Update the meta bar above the article for the given doc/dir path. */
function updateDocMeta(docPath) {
  const tokens = tokensByPath.get(docPath);
  if (tokens == null) {
    docMetaEl.innerHTML = `<span class="docmeta-path">${docPath}</span>`;
    return;
  }
  docMetaEl.innerHTML =
    `<span class="docmeta-path">${docPath}</span>` +
    `<span class="docmeta-tokens">≈ ${fmtFull(tokens)} tokens</span>`;
}

// --------------------------------------------------------------- Routing --

/** Read the doc path + anchor from the current URL. */
function readRoute() {
  const params = new URLSearchParams(location.search);
  const doc = params.get('doc') || DEFAULT_DOC;
  const anchor = location.hash ? location.hash.slice(1) : '';
  return { doc, anchor };
}

/** Navigate to a doc (+optional anchor) via pushState, then render. */
function navigate(doc, anchor) {
  const url = `?doc=${encodeURIComponent(doc)}${anchor ? '#' + anchor : ''}`;
  history.pushState({ doc, anchor }, '', url);
  render();
}

async function render() {
  const { doc, anchor } = readRoute();
  try {
    const res = await fetch(`/api/doc?path=${encodeURIComponent(doc)}`);
    if (!res.ok) throw new Error(`${res.status}`);
    const html = await res.text();
    docEl.innerHTML = html;
    currentDoc = doc;
    updateDocMeta(doc);
    markActive(doc);
    scrollToAnchor(anchor);
  } catch (err) {
    docEl.innerHTML = `<p class="placeholder">Could not load <code>${doc}</code> (${err.message}).</p>`;
  }
}

function scrollToAnchor(anchor) {
  if (!anchor) {
    docEl.parentElement.scrollTop = 0;
    return;
  }
  const target = document.getElementById(anchor);
  if (target) target.scrollIntoView({ block: 'start' });
}

// Intercept clicks on internal links rewritten by the server.
docEl.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-internal]');
  if (!link) return;
  e.preventDefault();
  const url = new URL(link.getAttribute('href'), location.href);
  const doc = new URLSearchParams(url.search).get('doc');
  const anchor = url.hash ? url.hash.slice(1) : '';
  if (doc) navigate(doc, anchor);
});

window.addEventListener('popstate', render);

// ------------------------------------------------------------- File tree --

function buildTreeDOM(nodes) {
  const ul = document.createElement('ul');
  for (const node of nodes) {
    const li = document.createElement('li');
    if (node.type === 'dir') {
      li.className = 'folder';
      li.dataset.name = node.name.toLowerCase();
      const label = document.createElement('div');
      label.className = 'folder-label';
      label.innerHTML =
        `<span class="caret">▾</span><span class="node-name">${node.name}</span>` +
        `<span class="count">${fmtCompact(node.tokens || 0)}</span>`;
      label.addEventListener('click', () => li.classList.toggle('collapsed'));
      li.appendChild(label);
      li.appendChild(buildTreeDOM(node.children));
    } else {
      const a = document.createElement('a');
      a.className = 'file';
      a.href = `?doc=${encodeURIComponent(node.path)}`;
      a.dataset.path = node.path;
      a.dataset.name = node.name.toLowerCase();
      a.innerHTML =
        `<span class="node-name">${node.name}</span>` +
        `<span class="count">${fmtCompact(node.tokens || 0)}</span>`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(node.path, '');
      });
      li.appendChild(a);
    }
    ul.appendChild(li);
  }
  return ul;
}

async function loadTree() {
  const res = await fetch('/api/tree');
  const nodes = await res.json();

  // Index token counts for every file/dir, and total the whole playbook.
  tokensByPath.clear();
  let total = 0;
  (function index(list) {
    for (const n of list) {
      tokensByPath.set(n.path, n.tokens || 0);
      if (n.type === 'file') total += n.tokens || 0;
      if (n.children) index(n.children);
    }
  })(nodes);
  totalEl.textContent = `≈ ${fmtFull(total)} tokens total`;

  treeEl.innerHTML = '';
  treeEl.appendChild(buildTreeDOM(nodes));
  if (currentDoc) {
    markActive(currentDoc);
    updateDocMeta(currentDoc);
  }
  applyFilter(searchEl.value);
}

function markActive(docPath) {
  treeEl.querySelectorAll('a.file.active').forEach((a) => a.classList.remove('active'));
  const active = treeEl.querySelector(`a.file[data-path="${CSS.escape(docPath)}"]`);
  if (active) {
    active.classList.add('active');
    // Expand ancestor folders so the active file is visible.
    let li = active.closest('li.folder');
    while (li) {
      li.classList.remove('collapsed');
      li = li.parentElement.closest('li.folder');
    }
  }
}

// ---------------------------------------------------------------- Search --

function applyFilter(rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  const root = treeEl.querySelector('ul');
  if (!root) return;

  if (!query) {
    treeEl.querySelectorAll('li').forEach((li) => li.classList.remove('hidden'));
    removeNoResults();
    return;
  }

  // A folder is visible if any descendant file matches.
  function walk(ul) {
    let anyVisible = false;
    for (const li of ul.children) {
      if (li.classList.contains('folder')) {
        const childUl = li.querySelector('ul');
        const childVisible = walk(childUl);
        li.classList.toggle('hidden', !childVisible);
        if (childVisible) li.classList.remove('collapsed');
        anyVisible = anyVisible || childVisible;
      } else {
        const match = (li.querySelector('a.file')?.dataset.name || '').includes(query);
        li.classList.toggle('hidden', !match);
        anyVisible = anyVisible || match;
      }
    }
    return anyVisible;
  }

  const anyVisible = walk(root);
  removeNoResults();
  if (!anyVisible) {
    const note = document.createElement('div');
    note.className = 'no-results';
    note.textContent = 'No matching files';
    treeEl.appendChild(note);
  }
}

function removeNoResults() {
  treeEl.querySelector('.no-results')?.remove();
}

searchEl.addEventListener('input', () => applyFilter(searchEl.value));

// -------------------------------------------------------- Live reload SSE --

function connectSSE() {
  const es = new EventSource('/api/events');
  es.addEventListener('reload', async (e) => {
    let changed = '';
    try {
      changed = JSON.parse(e.data).path || '';
    } catch {}
    // Refresh the tree (files may have been added/removed).
    await loadTree();
    // Re-render the open doc, preserving scroll if it's the one that changed.
    const scrollEl = docEl.parentElement;
    const prevScroll = scrollEl.scrollTop;
    const { doc, anchor } = readRoute();
    await render();
    if (changed === currentDoc && !anchor) scrollEl.scrollTop = prevScroll;
  });
  es.onerror = () => {
    // EventSource auto-reconnects; nothing to do.
  };
}

// ------------------------------------------------------------------ Init --

// Load the tree first so token counts are known before the doc meta renders.
await loadTree();
render();
connectSSE();
