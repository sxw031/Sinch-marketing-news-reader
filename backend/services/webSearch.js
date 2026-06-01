const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

/**
 * Search for company news using DuckDuckGo with specific site filters
 */
async function searchSiteNews(company, site, sourceName, options = {}) {
  try {
    console.log(`Searching ${sourceName} for ${company} news...`);

    // For official websites, we might use a broader search or specific newsroom paths if known
    const query = site ? `site:${site} "${company}"` : `"${company}" official news`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.result').each((index, element) => {
      if (articles.length >= (options.limit || 5)) return false;

      const $el = $(element);
      const titleEl = $el.find('.result__a');
      const descEl = $el.find('.result__snippet');
      
      let title = titleEl.text().trim();
      let description = descEl.text().trim();
      let url = titleEl.attr('href');

      if (!title || !url) return;

      // Clean up URL
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.includes('uddg=')) {
        try {
          const urlParts = url.split('uddg=');
          if (urlParts.length > 1) {
            url = decodeURIComponent(urlParts[1].split('&')[0]);
          }
        } catch (e) {}
      }

      if (title && url && !url.includes('duckduckgo.com')) {
        articles.push({
          title,
          description: description || 'No description available',
          url,
          source: sourceName,
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          author: sourceName,
          company: company,
          category: 'General'
        });
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error searching ${sourceName} for ${company}:`, error.message);
    return [];
  }
}

/**
 * Main search function that aggregates from multiple premium sources
 */
async function searchAllPremiumSources(company, options = {}) {
  const premiumSources = [
    { site: 'linkedin.com', name: 'LinkedIn' },
    { site: 'nytimes.com', name: 'New York Times' },
    { site: 'wsj.com', name: 'Wall Street Journal' },
    { site: 'bloomberg.com', name: 'Bloomberg' }
  ];

  // Also try to find official website news if domain is provided in options
  if (options.domain) {
    premiumSources.push({ site: options.domain, name: 'Official Website' });
  }

  const allResults = await Promise.all(
    premiumSources.map(source => searchSiteNews(company, source.site, source.name, options))
  );

  return allResults.flat();
}

/**
 * Legacy search for backward compatibility or general web search
 */
async function searchDuckDuckGo(company, options = {}) {
    return searchSiteNews(company, null, 'Web Search', options);
}

async function searchBingNews(company, options = {}) {
  try {
    console.log(`Searching Bing News for ${company}...`);

    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(company)}&count=20`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.news-card, .newsitem').each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const $el = $(element);
      const titleEl = $el.find('a.title, .title');
      const descEl = $el.find('.snippet, .description');
      const sourceEl = $el.find('.source, .attribution');

      let title = titleEl.text().trim();
      let url = titleEl.attr('href');
      let description = descEl.text().trim();
      let rawSource = sourceEl.text().trim() || 'Bing News';

      let source = rawSource;
      if (source.length <= 3 || /^\d+[DWMY]/.test(source)) {
          source = 'Bing News';
      }
      if (source.toUpperCase() === 'MSN') source = 'MSN News';

      if (!title || !url) return;
      if (url.startsWith('/')) url = 'https://www.bing.com' + url;

      if (title && url && url.startsWith('http')) {
        articles.push({
          title,
          description: description || 'No description available',
          url,
          source: source,
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          author: source,
          company: company,
          category: 'General'
        });
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error searching Bing News for ${company}:`, error.message);
    return [];
  }
}

module.exports = { searchDuckDuckGo, searchBingNews, searchAllPremiumSources };
