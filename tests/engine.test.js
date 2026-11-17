import test from 'node:test';
import assert from 'node:assert/strict';
import '../engine.js';
const { pages, ranking, search, computePageRank } = globalThis.MiniGoogle;

test('the index contains exactly the six supplied pages and nine directed edges', () => {
  assert.equal(pages.length, 6);
  assert.equal(pages.reduce((total, page) => total + page.links.length, 0), 9);
  assert.deepEqual(pages.map(page => page.links), [[2], [1, 3], [2, 4], [2, 5], [2], [1]]);
  assert.equal(pages[5].text, Array(10).fill('pizza').join(' '));
});

test('PageRank converges, preserves probability, and satisfies its fixed-point equation', () => {
  assert.ok(ranking.converged);
  assert.ok(ranking.delta < 1e-12);
  for (const vector of ranking.history) assert.ok(Math.abs(Object.values(vector).reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  for (const page of pages) {
    const expected = 0.15 / 6 + 0.85 * pages.filter(source => source.links.includes(page.id)).reduce((sum, source) => sum + ranking.scores.get(source.id) / source.links.length, 0);
    assert.ok(Math.abs(expected - ranking.scores.get(page.id)) < 1e-12);
  }
  assert.ok(Math.abs(ranking.scores.get(6) - 0.025) < 1e-12);
});

test('pizza results rank by the link graph, with the keyword repeater last', () => {
  assert.deepEqual(search('pizza').map(page => page.id), [2, 1, 3, 4, 5, 6]);
  assert.equal(search('pizza pizza pizza')[5].id, 6);
});

test('query matching handles case, punctuation, AND semantics, and URL tokens', () => {
  assert.deepEqual(search('  CHAI!! ').map(page => page.id), [3]);
  assert.deepEqual(search('pizza sauce').map(page => page.id), [4]);
  assert.deepEqual(search('biryani').map(page => page.id), [1]);
  assert.deepEqual(search('pune pizza').map(page => page.id), [2, 1, 5]);
  assert.deepEqual(search('pizza chai').map(page => page.id), [3]);
  assert.deepEqual(search('student').map(page => page.id), [3]);
  assert.deepEqual(search('student-sized'), []); // decorative titles are not indexed
  assert.deepEqual(search('<script>alert(1)</script>'), []);
  assert.deepEqual(search('unknown'), []);
  assert.deepEqual(search(''), []);
  assert.deepEqual(search('?!'), []);
});

test('zero damping produces a uniform distribution and deterministic ties', () => {
  const result = computePageRank(pages, { damping: 0 });
  for (const value of result.scores.values()) assert.equal(value, 1 / 6);
  assert.deepEqual(search('pizza', pages, result.scores).map(page => page.id), [1, 2, 3, 4, 5, 6]);
});

test('dangling pages redistribute probability and cycles converge', () => {
  const dangling = computePageRank([{ id: 1, links: [2] }, { id: 2, links: [] }]);
  assert.ok(dangling.converged);
  assert.ok(Math.abs(dangling.scores.get(1) - 1 / 2.85) < 1e-11);
  assert.ok(Math.abs([...dangling.scores.values()].reduce((a, b) => a + b, 0) - 1) < 1e-12);
  const cycle = computePageRank([{ id: 1, links: [2] }, { id: 2, links: [1] }]);
  assert.equal(cycle.scores.get(1), 0.5);
  assert.equal(cycle.scores.get(2), 0.5);
});

test('invalid input is rejected and failure to converge is reported', () => {
  assert.throws(() => computePageRank(pages, { damping: 1 }), RangeError);
  assert.throws(() => computePageRank(pages, { tolerance: 0 }), RangeError);
  assert.throws(() => computePageRank([{ id: 1, links: [99] }]), /Unknown link/);
  assert.throws(() => computePageRank([{ id: 1, links: [] }, { id: 1, links: [] }]), /unique/);
  assert.equal(computePageRank(pages, { maxIterations: 1 }).converged, false);
  assert.equal(computePageRank([]).scores.size, 0);
});
