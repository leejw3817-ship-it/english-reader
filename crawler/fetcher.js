// Fetch and parse a single RSS feed source
const RssParser = require('rss-parser');
const axios = require('axios');
const crypto = require('crypto');

const parser = new RssParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'EnglishReader/1.0 (English Learning RSS Aggregator; educational purpose)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  maxRedirects: 5,
});

/**
 * Fetch and parse articles from a single RSS source
 * @param {Object} source - Source config from sources.js
 * @returns {Promise<Array>} Array of normalized article objects
 */
async function fetchSource(source) {
  try {
    console.log(`  📡 Fetching: ${source.name} (${source.url})`);
    const feed = await parser.parseURL(source.url);

    if (!feed || !feed.items || feed.items.length === 0) {
      console.log(`  ⚠️  No items found for ${source.name}`);
      return [];
    }

    const articles = feed.items.map((item) => normalizeArticle(item, source));
    const validArticles = articles.filter(Boolean);

    console.log(`  ✅ ${source.name}: ${validArticles.length} articles fetched`);
    return validArticles;
  } catch (err) {
    console.error(`  ❌ Error fetching ${source.name}: ${err.message}`);
    return [];
  }
}

/**
 * Normalize a raw RSS item into a standard article object
 */
function normalizeArticle(item, source) {
  if (!item.link || !item.title) return null;

  const id = crypto.createHash('md5').update(item.link).digest('hex').slice(0, 12);
  const wordCount = countWords(item.content || item.contentSnippet || item.summary || '');
  const difficulty = estimateDifficulty(wordCount, item.content || '');

  // Extract image from various RSS formats
  let image = null;
  if (item.enclosure && item.enclosure.url) {
    image = item.enclosure.url;
  } else if (item['media:content'] && item['media:content'].$) {
    image = item['media:content'].$.url;
  } else if (item['media:thumbnail'] && item['media:thumbnail'].$) {
    image = item['media:thumbnail'].$.url;
  }

  // Parse publication date
  let publishedAt = null;
  if (item.pubDate) {
    publishedAt = new Date(item.pubDate).toISOString();
  } else if (item.isoDate) {
    publishedAt = new Date(item.isoDate).toISOString();
  }

  return {
    id,
    title: cleanText(item.title),
    url: item.link,
    source: source.name,
    sourceSlug: source.slug,
    category: source.category,
    useCases: assignUseCases(source.category, difficulty, wordCount),
    description: cleanText(item.contentSnippet || stripHtml(item.summary || item.content || '')).slice(0, 300),
    content: item.content || item['content:encoded'] || item.summary || '',
    author: item.creator || item.author || source.name,
    image,
    publishedAt: publishedAt || new Date().toISOString(),
    crawledAt: new Date().toISOString(),
    difficulty,
    wordCount,
  };
}

/**
 * Assign use-case tags to an article based on category and difficulty
 * Tags: 四级(CET-4), 六级(CET-6), 考研(Post-grad), 日常英语(Daily),
 *        商务英语(Business), 学术英语(Academic), 雅思托福(IELTS/TOEFL), 时事热点(Hot)
 */
function assignUseCases(category, difficulty, wordCount) {
  const cases = [];

  // 四级 CET-4: beginner level, shorter content
  if (difficulty === 'beginner' || wordCount < 300) {
    cases.push('CET-4');
  }

  // 六级 CET-6: intermediate level
  if (difficulty === 'intermediate' || (wordCount >= 300 && wordCount < 600)) {
    cases.push('CET-6');
  }

  // 考研 Post-grad: advanced academic content
  if (difficulty === 'advanced' && (category === 'Science' || category === 'Technology')) {
    cases.push('Post-grad');
  }

  // 日常英语 Daily English: general/world/culture, beginner/intermediate
  if ((category === 'General' || category === 'World' || category === 'Culture') && difficulty !== 'advanced') {
    cases.push('Daily');
  }

  // 商务英语 Business English
  if (category === 'Business') {
    cases.push('Business');
  }

  // 学术英语 Academic English
  if (category === 'Science' || category === 'Technology') {
    cases.push('Academic');
  }

  // 雅思托福 IELTS/TOEFL: advanced, longer articles with academic bent
  if (difficulty === 'advanced' && wordCount >= 500) {
    cases.push('IELTS');
  }

  // 时事热点 Current Affairs / Hot Topics
  if (category === 'World' || category === 'General') {
    cases.push('Hot');
  }

  // 确保每个文章至少有一个标签
  if (cases.length === 0) {
    cases.push('Daily');
  }

  return cases;
}

/**
 * Count words in a text string (English words)
 */
function countWords(text) {
  if (!text) return 0;
  const stripped = stripHtml(text);
  return stripped.split(/\s+/).filter((w) => w.length > 1).length;
}

/**
 * Estimate reading difficulty based on word count and vocabulary
 * Simple heuristic: longer articles with more words = more challenging
 */
function estimateDifficulty(wordCount, content) {
  if (wordCount < 200) return 'beginner';
  if (wordCount < 600) return 'intermediate';
  return 'advanced';
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
}

/**
 * Clean text: trim, normalize whitespace, remove control chars
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { fetchSource, normalizeArticle, assignUseCases };
