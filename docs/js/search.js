// Search Engine — Fuse.js wrapper for client-side full-text search
// Fully works offline after articles.json is loaded

const SearchEngine = (() => {
  let fuse = null;
  let articles = [];

  /**
   * Initialize or rebuild the search index from articles
   * @param {Array} articleList - Array of article objects
   */
  function init(articleList) {
    articles = articleList || [];
    if (typeof Fuse === 'undefined') {
      console.warn('Fuse.js not loaded — search disabled');
      return;
    }
    fuse = new Fuse(articles, {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'description', weight: 0.25 },
        { name: 'content', weight: 0.1 },
        { name: 'source', weight: 0.05 },
      ],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      useExtendedSearch: false,
    });
  }

  /**
   * Search articles
   * @param {string} query - Search query
   * @param {number} limit - Max results (default 30)
   * @returns {Array} Array of { item: article, score, matches }
   */
  function search(query, limit = 30) {
    if (!fuse || !query || !query.trim()) return [];
    const results = fuse.search(query.trim(), { limit });
    return results;
  }

  /**
   * Quick search for dropdown suggestions
   * @param {string} query
   * @param {number} limit
   * @returns {Array} Array of article objects (no fuse metadata)
   */
  function quickSearch(query, limit = 6) {
    const results = search(query, limit);
    return results.map((r) => r.item);
  }

  /**
   * Highlight matching text using match indices from Fuse
   * @param {string} text - Original text
   * @param {Array} matches - Fuse.js matches array for this field
   * @returns {string} HTML with <mark> tags
   */
  function highlight(text, matches) {
    if (!matches || !text) return escapeHtml(text || '');
    const indices = matches.flatMap((m) => m.indices).sort((a, b) => a[0] - b[0]);
    if (!indices.length) return escapeHtml(text);

    // Merge overlapping indices
    const merged = [];
    let curr = indices[0];
    for (let i = 1; i < indices.length; i++) {
      if (indices[i][0] <= curr[1] + 1) {
        curr[1] = Math.max(curr[1], indices[i][1]);
      } else {
        merged.push(curr);
        curr = indices[i];
      }
    }
    merged.push(curr);

    // Build highlighted HTML
    let result = '';
    let pos = 0;
    for (const [start, end] of merged) {
      if (start > pos) result += escapeHtml(text.slice(pos, start));
      result += '<span class="sr-highlight">' + escapeHtml(text.slice(start, end + 1)) + '</span>';
      pos = end + 1;
    }
    if (pos < text.length) result += escapeHtml(text.slice(pos));
    return result;
  }

  /**
   * Get total indexed articles count
   */
  function count() {
    return articles.length;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return { init, search, quickSearch, highlight, count };
})();
