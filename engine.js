(() => {
// This is the entire index: no crawler, external API, or additional websites.
const pages = [
  { id: 1, url: 'http://pune-food-guide.com', title: 'Where to eat in Pune', text: 'Where to eat in Pune - vada pav and biryani and pizza', links: [2], category: 'CITY GUIDE', color: 'orange', initials: 'pf' },
  { id: 2, url: 'http://best-pizza-pune.com', title: 'Fresh wood-fired pizza, made daily', text: 'Fresh wood-fired pizza made daily - try our cheese pizza', links: [1, 3], category: 'PIZZERIA', color: 'red', initials: 'bp' },
  { id: 3, url: 'http://college-canteen-blog.com', title: 'A little chai. A little campus life.', text: 'Student reviews of canteen food and chai and Friday pizza', links: [2, 4], category: 'CAMPUS JOURNAL', color: 'green', initials: 'cc' },
  { id: 4, url: 'http://pizza-recipes-home.com', title: 'Good pizza starts at home', text: 'Make pizza at home - pizza dough and pizza sauce', links: [2, 5], category: 'HOME KITCHEN', color: 'purple', initials: 'pr' },
  { id: 5, url: 'http://cheap-eats-pune.com', title: 'Big flavour. Student-sized prices.', text: 'Good food under 100 rupees - misal and dosa and pizza slices', links: [2], category: 'BUDGET BITES', color: 'yellow', initials: 'ce' },
  { id: 6, url: 'http://pizza-pizza-pizza.com', title: 'Pizza, pizza… and more pizza', text: 'pizza pizza pizza pizza pizza pizza pizza pizza pizza pizza', links: [1], category: 'KEYWORD REPEATER', color: 'gray', initials: 'pp' },
];

function tokenize(text) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Power iteration: PR(i) = (1-d)/N + d * sum(PR(j)/outdegree(j)).
 * Dangling-page mass is distributed uniformly to preserve total probability.
 * Every iteration reads the previous vector (a simultaneous update).
 */
function computePageRank(index, { damping = 0.85, tolerance = 1e-12, maxIterations = 1000 } = {}) {
  if (!(damping >= 0 && damping < 1)) throw new RangeError('Damping must be between 0 (inclusive) and 1 (exclusive).');
  if (!(tolerance > 0) || !Number.isInteger(maxIterations) || maxIterations < 1) throw new RangeError('Invalid convergence settings.');
  if (!index.length) return { scores: new Map(), iterations: 0, converged: true, history: [], delta: 0 };
  const ids = new Set(index.map(page => page.id));
  if (ids.size !== index.length) throw new Error('Page IDs must be unique.');
  const outgoing = new Map(index.map(page => [page.id, [...new Set(page.links)]]));
  for (const links of outgoing.values()) for (const id of links) if (!ids.has(id)) throw new Error(`Unknown link target: ${id}`);
  const count = index.length;
  let scores = new Map(index.map(page => [page.id, 1 / count]));
  const history = [Object.fromEntries(scores)];
  let delta = Infinity;
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const danglingMass = index.reduce((sum, page) => sum + (outgoing.get(page.id).length ? 0 : scores.get(page.id)), 0);
    const next = new Map(index.map(page => [page.id, (1 - damping) / count + damping * danglingMass / count]));
    for (const page of index) {
      const links = outgoing.get(page.id);
      for (const target of links) next.set(target, next.get(target) + damping * scores.get(page.id) / links.length);
    }
    delta = index.reduce((sum, page) => sum + Math.abs(next.get(page.id) - scores.get(page.id)), 0);
    scores = next;
    history.push(Object.fromEntries(scores));
    if (delta < tolerance) return { scores, iterations: iteration, converged: true, history, delta };
  }
  return { scores, iterations: maxIterations, converged: false, history, delta };
}

const ranking = computePageRank(pages);
const incomingLinks = id => pages.filter(page => page.links.includes(id));

// Require every query word in the provided text or URL. Display titles are
// presentation metadata, not extra searchable content. Repetition adds no boost.
function search(query, index = pages, scores = ranking.scores) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  return index.filter(page => {
    const words = new Set(tokenize(`${page.text} ${page.url}`));
    return terms.every(term => words.has(term));
  }).sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.id - b.id);
}

// Expose the same engine to the browser UI and Node.js tests.
globalThis.MiniGoogle = Object.freeze({ pages, ranking, incomingLinks, search, tokenize, computePageRank });
})();
