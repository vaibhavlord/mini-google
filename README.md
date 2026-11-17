# Mini Google

A class-project search engine using exactly the six supplied pages. Built with HTML, CSS, and JavaScript, with no dependencies, API keys, crawling, or outside search services. The application works offline after it is served locally.

## Run

Double-click `index.html` to open the app directly in your browser. No installation is needed.

For a localhost URL (with shareable search query URLs and browser back/forward navigation), run from this folder:

```sh
python3 -m http.server 3000 --bind 127.0.0.1
```

Open **http://127.0.0.1:3000**. Alternatively use `npm start`. The same files also work on any static web host.

## Interface

The interface follows Google's familiar white search page: a centered multicolor wordmark, rounded search field, Google Search and I'm Feeling Lucky buttons, and a compact results layout with blue titles, page URLs, and snippets. **Tools** toggles PageRank details in the results. The grid icon opens the six-page index. The formula and graph live under **How Search works**.

I'm Feeling Lucky previews the highest-ranked matching page (or the highest-ranked indexed page when the query is empty). All result previews remain local.

## Search behavior

1. Tokenize the query and each supplied page's text and URL; ignore case and punctuation.
2. Keep pages containing **every query word**. Display titles are presentation metadata and do not affect matching.
3. Sort matches by descending PageRank; use page ID to break ties.

Example searches: `pizza` (all six pages), `chai` (page 3), `pizza sauce` (page 4), `biryani` (page 1), `pune` (pages 2, 1, 5), and `something else` (no results).

Results open a local preview with the exact supplied text and clickable links to other indexed pages. The example domains are not fetched or opened externally. The complete index and downloadable CSV are available in **Indexed pages**.

## PageRank

`engine.js` computes the actual PageRank with simultaneous power iteration. It is not a hardcoded popularity score or a count of keywords or incoming links.

```text
PR(i) = (1 - d) / N + d * sum(PR(j) / outgoing_links(j))
```

- `N = 6` pages, `d = 0.85` damping factor.
- All pages initially have score `1 / 6`.
- Each iteration uses only scores from the previous iteration.
- Stop when the L1 difference between successive vectors is less than `1e-12`, with a cap of 1,000 iterations.
- The implementation supports dangling pages by redistributing their rank equally, although this dataset has none.
- PageRank is computed over the whole graph before searching. Query matching does not change it.
- Repeated links count once. Repeated query words or page keywords do not add ranking weight.

Page 2 is highest ranked. Page 6 has no incoming links, so its score is exactly `(1 - 0.85) / 6 = 0.025`, despite repeating “pizza” ten times. This illustrates why link importance improves on raw keyword frequency. This simplified project is not a full implementation of Google's search ranking.

**How Search works** shows the formula, convergence count, and score vectors. The interactive graph draws all nine directed links, including both directions of reciprocal links. You can open pages from the graph, ranking list, index, or results.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible page structure and views |
| `styles.css` | Responsive design; no external fonts or assets |
| `engine.js` | Exact dataset, PageRank, and query matching |
| `app.js` | Search, navigation, graph, page previews, and CSV export |
| `tests/engine.test.js` | Algorithm and search verification |

## Verify

Requires Node.js with its built-in test runner (Node 20 or newer is recommended).

```sh
npm test
```

Tests check graph structure, conservation of probability at every iteration, the PageRank fixed point, expected pizza ordering, AND matching, URL matching, empty queries, damping, ties, dangling nodes, and invalid graphs.
