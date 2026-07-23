// Deduplication logic for articles

/**
 * Deduplicate articles by URL and title similarity
 * @param {Array} articles - Array of article objects
 * @returns {Array} Deduplicated articles (keeps the first occurrence)
 */
function deduplicateArticles(articles) {
  const seenUrls = new Set();
  const seenTitles = new Map(); // normalizedTitle -> article
  const result = [];

  for (const article of articles) {
    // 1. Exact URL dedup
    const urlKey = article.url.toLowerCase().trim();
    if (seenUrls.has(urlKey)) {
      continue;
    }
    seenUrls.add(urlKey);

    // 2. Normalized title similarity dedup
    const normalizedTitle = normalizeTitle(article.title);
    if (seenTitles.has(normalizedTitle)) {
      // Keep the one with more content
      const existing = seenTitles.get(normalizedTitle);
      if (article.wordCount > existing.wordCount) {
        // Replace existing with this better one
        const idx = result.findIndex((a) => a.id === existing.id);
        if (idx !== -1) {
          result[idx] = article;
          seenTitles.set(normalizedTitle, article);
        }
      }
      continue;
    }
    seenTitles.set(normalizedTitle, article);
    result.push(article);
  }

  return result;
}

/**
 * Normalize title for comparison: lowercase, remove punctuation, trim
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Merge new articles with existing ones, keeping the most recent N
 * @param {Array} existing - Currently stored articles
 * @param {Array} incoming - Newly fetched articles
 * @param {number} maxArticles - Maximum articles to keep (default 500)
 * @returns {Array} Merged and sorted articles
 */
function mergeArticles(existing, incoming, maxArticles = 500) {
  const allArticles = [...incoming, ...existing];
  const deduped = deduplicateArticles(allArticles);

  // Sort by publication date, newest first
  deduped.sort((a, b) => {
    const dateA = new Date(a.publishedAt || 0);
    const dateB = new Date(b.publishedAt || 0);
    return dateB - dateA;
  });

  // Keep only the most recent articles
  return deduped.slice(0, maxArticles);
}

module.exports = { deduplicateArticles, mergeArticles, normalizeTitle };
