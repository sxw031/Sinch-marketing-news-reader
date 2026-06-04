const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketFeed/1.0)' }
});

/**
 * Primary source: Google News RSS - free, reliable, no API key needed
 * Returns structured news articles for a given company
 */
async function fetchGoogleNewsRSS(company, options = {}) {
  const limit = options.limit || 10;
  const query = encodeURIComponent(`"${company}" when:1d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[Google News] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketFeed/1.0)' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => {
      // Google News wraps the real source in the title as "Title - Source"
      const titleParts = (item.title || '').split(' - ');
      const source = titleParts.length > 1 ? titleParts.pop().trim() : 'Google News';
      const title = titleParts.join(' - ').trim();

      return {
        title: title || item.title,
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source,
        company,
        category: 'General',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      };
    });

    console.log(`[Google News] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Google News] ${company} failed:`, error.message);
    return [];
  }
}

/**
 * Fallback: Bing News RSS - also free and reliable
 */
async function fetchBingNewsRSS(company, options = {}) {
  const limit = options.limit || 8;
  const query = encodeURIComponent(company);
  const url = `https://www.bing.com/news/search?q=${query}&format=rss&count=${limit}`;

  try {
    console.log(`[Bing RSS] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketFeed/1.0)' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.content || '',
      url: item.link || '',
      source: item.creator || 'Bing News',
      company,
      category: 'General',
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
    }));

    console.log(`[Bing RSS] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Bing RSS] ${company} failed:`, error.message);
    return [];
  }
}

/**
 * Fetch news for a single company from all available RSS sources
 * Fast, reliable, no scraping needed
 */
async function fetchNewsForCompany(company) {
  // Run Google News and Bing in parallel with a 12s global timeout
  const timeout = new Promise(resolve => setTimeout(() => resolve([]), 12000));

  const [google, bing] = await Promise.all([
    Promise.race([fetchGoogleNewsRSS(company, { limit: 10 }), timeout]),
    Promise.race([fetchBingNewsRSS(company, { limit: 5 }), timeout])
  ]);

  // Merge and deduplicate by title similarity
  const all = [...(google || []), ...(bing || [])];
  const seen = new Set();
  const unique = all.filter(a => {
    const key = a.title.toLowerCase().substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

module.exports = { fetchNewsForCompany, fetchGoogleNewsRSS, fetchBingNewsRSS };
