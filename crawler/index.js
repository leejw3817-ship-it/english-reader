// Main crawler entry point
// Fetches all RSS sources, deduplicates, and stores articles

const SOURCES = require('./sources');
const { fetchSource } = require('./fetcher');
const { mergeArticles } = require('./dedup');
const { readArticles, writeArticles } = require('./storage');

const MAX_ARTICLES = 500;
const CONCURRENCY_DELAY = 1000; // 1 second between source requests

async function main() {
  console.log('📰 English Reader — Article Crawler');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`📡 Fetching ${SOURCES.length} RSS sources...\n`);

  // Fetch all sources sequentially with a small delay for politeness
  const allIncoming = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const articles = await fetchSource(SOURCES[i]);
    allIncoming.push(...articles);

    // Small delay between sources (except last)
    if (i < SOURCES.length - 1) {
      await sleep(CONCURRENCY_DELAY);
    }
  }

  console.log(`\n📊 Total fetched: ${allIncoming.length} articles (before dedup)`);

  // Read existing articles and merge
  const { articles: existing } = readArticles();
  const merged = mergeArticles(existing, allIncoming, MAX_ARTICLES);

  console.log(`📊 After merge & dedup: ${merged.length} articles stored`);
  console.log(`📊 New articles added: ${Math.max(0, merged.length - existing.length)}`);

  // Write back
  writeArticles(merged);

  // Print category breakdown
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('❌ Crawler failed:', err);
  process.exit(1);
});
