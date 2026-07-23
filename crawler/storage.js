// Read and write articles to the local JSON data file
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const DATA_FILE = path.join(DATA_DIR, 'articles.json');

/**
 * Read existing articles from data/articles.json
 * @returns {Object} { articles: [], lastUpdated: string|null, totalArticles: number }
 */
function readArticles() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { articles: [], lastUpdated: null, totalArticles: 0 };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      articles: Array.isArray(data.articles) ? data.articles : [],
      lastUpdated: data.lastUpdated || null,
      totalArticles: Array.isArray(data.articles) ? data.articles.length : 0,
    };
  } catch (err) {
    console.error(`  ⚠️  Error reading articles.json: ${err.message}`);
    return { articles: [], lastUpdated: null, totalArticles: 0 };
  }
}

/**
 * Write articles to data/articles.json
 * @param {Array} articles - Array of article objects
 */
function writeArticles(articles) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      articles,
      lastUpdated: new Date().toISOString(),
      totalArticles: articles.length,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  💾 Saved ${articles.length} articles to data/articles.json`);
  } catch (err) {
    console.error(`  ❌ Error writing articles.json: ${err.message}`);
  }
}

module.exports = { readArticles, writeArticles };
