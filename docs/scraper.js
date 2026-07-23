// Full-content scraper: fetches complete article text from article page URLs
// Uses cheerio to extract the main content when RSS only provides summaries

const axios = require('axios');
const cheerio = require('cheerio');

// Common selectors for article content across major publishers
const CONTENT_SELECTORS = [
  // Aeon
  'section.article-body', 'div.article-body',
  // Popular Science
  'div.article-body', 'div.article__content', 'div.entry-content', 'div.post-content',
  // MIT Tech Review
  'div.article-body', 'div.article-body__content', 'div.article__body',
  // Quanta Magazine
  'div.article__body', 'div.post__content',
  // Smithsonian
  'div.article-body', 'div.article-content', 'div.entry-content',
  // NPR
  'div.storytext', '#storytext', 'div.story-body', 'div.article-body',
  // BBC
  'div.story-body', 'article div.story-body__inner',
  // The Guardian
  'div.article-body-commercial-selector', 'div.content__article-body',
  // Scientific American
  'div.article-text', 'div.article-content',
  // Generic
  'article', 'main article', 'div.post-body', 'div.article__body',
];

// Elements to remove from extracted content
const REMOVE_SELECTORS = [
  'script', 'style', 'iframe', 'noscript',
  '.advertisement', '.ad', '.ads', '.social-share', '.related-content',
  '.tags', '.article-tags', '.comments', '.comment-section',
  'nav', '.newsletter-signup', '.recommended', '.read-more',
  '.sidebar', '.aside', '.promo',
];

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 EnglishReader/1.0',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  maxRedirects: 3,
});

/**
 * Fetch full article content from a URL
 * @param {string} url - Article URL
 * @returns {Promise<string|null>} Full HTML content or null
 */
async function fetchFullContent(url) {
  try {
    const resp = await axiosInstance.get(url);
    const html = resp.data;
    if (!html || typeof html !== 'string') return null;

    const $ = cheerio.load(html);

    // Remove unwanted elements
    REMOVE_SELECTORS.forEach((sel) => {
      $(sel).remove();
    });

    // Try each content selector until we find something substantial
    for (const selector of CONTENT_SELECTORS) {
      const el = $(selector);
      if (el.length > 0) {
        const text = el.html();
        if (text && text.length > 300) {
          return text.trim();
        }
      }
    }

    return null;
  } catch (err) {
    // Silent failure — we fall back to RSS content
    return null;
  }
}

/**
 * Check if an article needs full content scraping
 * (RSS content is too short — likely just a summary)
 */
function needsScraping(article) {
  const contentLen = (article.content || '').replace(/<[^>]*>/g, '').length;
  return contentLen < 800;
}

module.exports = { fetchFullContent, needsScraping };
