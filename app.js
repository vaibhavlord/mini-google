const { pages, ranking, incomingLinks, search, tokenize } = globalThis.MiniGoogle;

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const domain = page => new URL(page.url).hostname;
const score = page => ranking.scores.get(page.id);
const ordered = [...pages].sort((a, b) => score(b) - score(a) || a.id - b.id);
let activeQuery = '';

function highlight(text, query) {
  const terms = new Set(tokenize(query));
  // Split into complete tokens so highlighting uses the same semantics as search.
  return text.split(/([\p{L}\p{N}]+)/gu).map(part => terms.has(part.toLowerCase()) ? `<mark>${escape(part)}</mark>` : escape(part)).join('');
}

function card(page, full = false) {
  return `<button class="page-card" data-page="${page.id}"><span class="card-arrow" aria-hidden="true">↗</span><div class="card-top"><span class="page-icon ${page.color}">${page.initials}</span><span class="category">${page.category}</span></div><h3>${escape(page.title)}</h3><p>${escape(page.text)}</p>${full ? `<div class="index-links">PAGE ${page.id} <span aria-hidden="true">→</span> LINKS TO ${page.links.map(id => `PAGE ${id}`).join(', ')}</div>` : ''}<div class="card-domain"><span>${domain(page)}</span><strong>PR ${score(page).toFixed(3)}</strong></div></button>`;
}

function setView(view, updateHistory = true) {
  if (!['search', 'index', 'about'].includes(view)) view = 'search';
  document.querySelectorAll('.view').forEach(element => { element.hidden = element.id !== `${view}-view`; });
  document.body.dataset.view = view;
  document.body.classList.toggle('home', view === 'search' && !activeQuery);
  document.body.classList.toggle('searching', view === 'search' && Boolean(activeQuery));
  document.title = `${view === 'index' ? 'Indexed pages' : view === 'about' ? 'How Search works' : activeQuery ? `${activeQuery} - Googleyadav Search` : 'Mini Googleyadav'}${view === 'search' && !activeQuery ? '' : ' | Mini Googleyadav'}`;
  if (updateHistory) {
    const url = new URL(location.href);
    url.search = '';
    if (view !== 'search') url.searchParams.set('view', view);
    else if (activeQuery) url.searchParams.set('q', activeQuery);
    // Browsers restrict file:// history changes; local navigation still works.
    if (location.protocol !== 'file:') history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function syncSearchControls() {
  $('#clear-search').hidden = !$('#query').value;
}

function performSearch(query, updateHistory = true) {
  activeQuery = tokenize(query).length ? query.trim() : '';
  $('#query').value = activeQuery;
  syncSearchControls();
  $('#results-section').hidden = !activeQuery;
  if (activeQuery) {
    const started = performance.now();
    const matches = search(activeQuery);
    const elapsed = ((performance.now() - started) / 1000).toFixed(3);
    $('#results-count').textContent = `${matches.length} ${matches.length === 1 ? 'result' : 'results'} (${elapsed} seconds)`;
    $('#results-end').hidden = !matches.length;
    $('#results').innerHTML = matches.length ? matches.map((page, index) => {
      const siteName = domain(page).replace('.com', '').split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
      return `<article class="result"><button class="result-site" data-page="${page.id}"><span class="page-icon ${page.color}">${page.initials}</span><span class="result-site-text"><span class="result-site-name">${escape(siteName)}</span><span class="result-url">${escape(page.url)}</span></span><span class="result-dots" aria-hidden="true">⋮</span></button><button class="result-title" data-page="${page.id}">${escape(page.title)}</button><p>${highlight(page.text, activeQuery)}</p><div class="result-meta"><span class="score-badge">PageRank: ${score(page).toFixed(4)}</span><span>${incomingLinks(page.id).length} incoming ${incomingLinks(page.id).length === 1 ? 'link' : 'links'}</span><span class="result-order">Rank ${index + 1}</span></div></article>`;
    }).join('') : `<div class="empty-state"><h2>Your search — <strong>${escape(activeQuery)}</strong> — did not match any indexed pages.</h2><p>Suggestions:</p><ul><li>Make sure that all words are spelled correctly.</li><li>Try different or more general keywords.</li><li>This project searches only the six supplied pages.</li></ul><p>Try: <button class="text-button" data-query="pizza">pizza</button><button class="text-button" data-query="chai">chai</button><button class="text-button" data-query="Pune">Pune</button></p></div>`;
  }
  setView('search', updateHistory);
}

function showPage(id) {
  const page = pages.find(page => page.id === id);
  if (!page) return;
  const inbound = incomingLinks(id);
  const linkButtons = collection => collection.map(link => `<button data-page="${link.id}">Page ${link.id} <span aria-hidden="true">↗</span> ${domain(link)}</button>`).join('');
  $('#dialog-body').innerHTML = `<span class="page-icon ${page.color}">${page.initials}</span><h2 id="dialog-title">${escape(page.title)}</h2><p class="dialog-url">${escape(page.url)}</p><p class="dialog-text">${highlight(page.text, activeQuery)}</p><div class="dialog-stats"><div><strong>${score(page).toFixed(4)}</strong><span>PAGERANK SCORE</span></div><div><strong>${inbound.length}</strong><span>INCOMING LINKS</span></div><div><strong>${page.links.length}</strong><span>OUTGOING LINKS</span></div></div><h3 class="dialog-link-heading">This page links to</h3><div class="dialog-links">${linkButtons(page.links.map(id => pages.find(page => page.id === id)))}</div><h3 class="dialog-link-heading">Pages linking here</h3><div class="dialog-links">${inbound.length ? linkButtons(inbound) : '<p>No incoming links. This page receives only the random-jump baseline.</p>'}</div>`;
  if (!$('#page-dialog').open) $('#page-dialog').showModal();
  $('#close-dialog').focus();
}

function renderGraph() {
  const positions = { 1: [86, 51], 2: [203, 112], 3: [307, 49], 4: [302, 180], 5: [108, 179], 6: [30, 112] };
  const radii = { 1: 19, 2: 28, 3: 19, 4: 17, 5: 17, 6: 14 };
  let svg = '<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#b5c1ac"/></marker></defs>';
  for (const page of pages) for (const target of page.links) {
    const [x1, y1] = positions[page.id], [x2, y2] = positions[target];
    const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length;
    const reciprocal = pages.find(page => page.id === target).links.includes(page.id);
    const offset = reciprocal ? 4 : 0;
    const startX = x1 + ux * (radii[page.id] + 3) - uy * offset;
    const startY = y1 + uy * (radii[page.id] + 3) + ux * offset;
    const endX = x2 - ux * (radii[target] + 5) - uy * offset;
    const endY = y2 - uy * (radii[target] + 5) + ux * offset;
    svg += `<path class="graph-edge" d="M${startX},${startY} L${endX},${endY}" marker-end="url(#arrow)"><title>Page ${page.id} links to page ${target}</title></path>`;
  }
  for (const page of pages) {
    const [x, y] = positions[page.id], radius = radii[page.id];
    svg += `<g class="graph-node ${page.id === 2 ? 'top-node' : ''}" data-page="${page.id}" tabindex="0" role="button" aria-label="Preview page ${page.id}, ${domain(page)}, PageRank ${score(page).toFixed(4)}"><title>${domain(page)}</title><circle cx="${x}" cy="${y}" r="${radius}"/><text x="${x}" y="${y + 4}">${String(page.id).padStart(2, '0')}</text><text class="node-label" x="${x}" y="${y + radius + 15}">${page.id === 2 ? 'MOST CONNECTED' : `PAGE ${page.id}`}</text></g>`;
  }
  $('#link-graph').innerHTML = svg;
}

$('#index-grid').innerHTML = pages.map(page => card(page, true)).join('');
$('#rank-list').innerHTML = ordered.map((page, index) => `<button class="rank-row" data-page="${page.id}" aria-label="Rank ${index + 1}: ${domain(page)}, score ${score(page).toFixed(4)}"><span class="rank-number">${String(index + 1).padStart(2, '0')}</span><span class="rank-name">${domain(page)}</span><span class="bar-track"><span class="bar-fill" style="width:${score(page) / score(ordered[0]) * 100}%"></span></span><span class="rank-value">${score(page).toFixed(3)}</span></button>`).join('');
$('#iteration-count').textContent = ranking.iterations;
$('#convergence-number').textContent = ranking.iterations;
$('#iteration-table').innerHTML = ranking.history.map((scores, iteration) => ({ scores, iteration })).filter(({ iteration }) => iteration <= 10 || iteration === ranking.iterations).map(({ scores, iteration }) => `<tr><th scope="row">${iteration === 0 ? '0 (initial)' : iteration === ranking.iterations ? `${iteration} (final)` : iteration}</th>${pages.map(page => `<td>${scores[page.id].toFixed(6)}</td>`).join('')}</tr>`).join('');
renderGraph();

$('#query').addEventListener('input', syncSearchControls);
$('#clear-search').addEventListener('click', () => {
  $('#query').value = '';
  syncSearchControls();
  $('#query').focus();
});
$('#feeling-lucky').addEventListener('click', () => {
  const query = $('#query').value;
  const matches = tokenize(query).length ? search(query) : ordered;
  if (matches.length) showPage(matches[0].id);
  else performSearch(query);
});
$('#ranking-tools').addEventListener('click', () => {
  const expanded = $('#ranking-tools').getAttribute('aria-expanded') !== 'true';
  $('#ranking-tools').setAttribute('aria-expanded', String(expanded));
  $('#ranking-tools').setAttribute('aria-label', expanded ? 'Hide PageRank details' : 'Show PageRank details');
  document.body.classList.toggle('show-ranking', expanded);
});

$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  performSearch($('#query').value);
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-view], [data-query], [data-page], [data-home]');
  if (!button) return;
  if (button.hasAttribute('data-home')) performSearch('');
  else if (button.dataset.view) setView(button.dataset.view);
  else if (button.dataset.query) performSearch(button.dataset.query);
  else showPage(Number(button.dataset.page));
});
$('#link-graph').addEventListener('keydown', event => {
  const node = event.target.closest('[data-page]');
  if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showPage(Number(node.dataset.page)); }
});
$('#close-dialog').addEventListener('click', () => $('#page-dialog').close());
$('#page-dialog').addEventListener('click', event => {
  if (event.target === $('#page-dialog')) {
    const rect = $('#page-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#page-dialog').close();
  }
});
$('#download-csv').addEventListener('click', () => {
  const rows = [['page', 'url', 'text', 'links_to'], ...pages.map(page => [page.id, page.url, page.text, page.links.join(';')])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'mini-google-dataset.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
function restoreLocation() {
  const params = new URLSearchParams(location.search);
  performSearch(params.get('q') ?? '', false);
  if (params.get('view')) setView(params.get('view'), false);
}
window.addEventListener('popstate', restoreLocation);
restoreLocation();
