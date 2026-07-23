// Main crawler entry point
// Fetches all RSS sources, scrapes full content, deduplicates, and stores articles

const SOURCES = require('./sources');
const { fetchSource, assignUseCases } = require('./fetcher');
const { mergeArticles } = require('./dedup');
const { readArticles, writeArticles } = require('./storage');
const { fetchFullContent, needsScraping } = require('./scraper');
const fs = require('fs');
const path = require('path');

const MAX_ARTICLES = 500;
const CONCURRENCY_DELAY = 1500; // 1.5s between RSS source requests
const SCRAPE_DELAY = 800;       // 0.8s between full-content scrapes

async function main() {
  console.log('📰 English Reader — Article Crawler');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`📡 Fetching ${SOURCES.length} RSS sources...\n`);

  // Phase 1: Fetch all sources sequentially with a small delay
  const allIncoming = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const articles = await fetchSource(SOURCES[i]);
    allIncoming.push(...articles);

    if (i < SOURCES.length - 1) {
      await sleep(CONCURRENCY_DELAY);
    }
  }

  console.log(`\n📊 RSS Fetched: ${allIncoming.length} articles (before dedup)`);

  // Phase 2: Scrape full content for articles with short summaries
  console.log(`\n📝 Scraping full content for articles with short summaries...`);
  let scrapedCount = 0;
  for (let i = 0; i < allIncoming.length; i++) {
    const article = allIncoming[i];
    if (needsScraping(article)) {
      const fullContent = await fetchFullContent(article.url);
      if (fullContent) {
        article.content = fullContent;
        article.wordCount = countWords(fullContent);
        article.difficulty = estimateDifficulty(article.wordCount);
        // Re-assign use cases with updated difficulty/wordCount
        const { assignUseCases } = require('./fetcher');
        article.useCases = assignUseCases(article.category, article.difficulty, article.wordCount);
        scrapedCount++;
        process.stdout.write(`\r  ✅ Scraped: ${scrapedCount} / ${allIncoming.length}`);
      }
      await sleep(SCRAPE_DELAY);
    }
  }
  if (scrapedCount > 0) console.log('');
  console.log(`📝 Full content fetched for ${scrapedCount} articles`);

  // Phase 3: Merge and store
  const { articles: existing } = readArticles();
  const merged = mergeArticles(existing, allIncoming, MAX_ARTICLES);

  console.log(`📊 After merge & dedup: ${merged.length} articles stored`);
  console.log(`📊 New articles added: ${Math.max(0, merged.length - existing.length)}`);

  // Print content quality stats
  const fullArticles = merged.filter((a) => stripLen(a.content) > 800);
  console.log(`📊 Full-length articles (800+ chars): ${fullArticles.length}`);

  // Write to docs/data/ (primary)
  writeArticles(merged);

  // Also write to root data/ for GitHub Pages root deployment
  const rootDataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(rootDataDir)) fs.mkdirSync(rootDataDir, { recursive: true });
  const data = { articles: merged, lastUpdated: new Date().toISOString(), totalArticles: merged.length };
  fs.writeFileSync(path.join(rootDataDir, 'articles.json'), JSON.stringify(data, null, 2));
  console.log(`  💾 Also saved to data/articles.json`);

  // Category breakdown
  const categories = {};
  merged.forEach((a) => {
    categories[a.category] = (categories[a.category] || 0) + 1;
  });
  console.log('\n📂 Category breakdown:');
  Object.entries(categories)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => console.log(`   ${cat}: ${count}`));

  console.log('\n✅ Crawl complete!');
}

function countWords(html) {
  const text = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '');
  return text.split(/\s+/).filter((w) => w.length > 1).length;
}

function estimateDifficulty(count) {
  if (count < 200) return 'beginner';
  if (count < 600) return 'intermediate';
  return 'advanced';
}

function stripLen(html) {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').length;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('❌ Crawler failed:', err);
  process.exit(1);
});
