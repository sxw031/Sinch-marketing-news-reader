const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/**
 * Search for company news using DuckDuckGo (free, no API key required)
 * Scrapes public search results
 */
async function searchDuckDuckGo(company, options = {}) {
  try {
    console.log(`Searching DuckDuckGo for ${company} news...`);

    const query = `${company} news -site:reddit.com`;
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.result').each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const titleEl = $(element).find('.result__title a');
      const descEl = $(element).find('.result__snippet');
      const linkEl = titleEl;

      const title = titleEl.text().trim();
      const description = descEl.text().trim();
      const url = linkEl.attr('href');

      if (title && url && !url.includes('duckduckgo.com')) {
        articles.push({
          title,
          description,
          url,
          source: 'Web Search (DuckDuckGo)',
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          author: 'Web Search',
          company: company,
          category: 'news'
        });
      }
    });

    console.log(`Found ${articles.length} search results for ${company}`);
    return articles;
  } catch (error) {
    console.error(`Error searching DuckDuckGo for ${company}:`, error.message);
    return [];
  }
}

/**
 * Search Bing News for company-related news (free tier available)
 */
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

    $('a.news-card').each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const titleEl = $(element).find('h2, .news-card-title');
      const descEl = $(element).find('.news-card-body p');
      const sourceEl = $(element).find('.news-source, .source');

      const title = titleEl.text().trim();
      const description = descEl.text().trim();
      const url = $(element).attr('href');
      const source = sourceEl.text().trim() || 'Bing News';

      if (title && url && url.startsWith('http')) {
        articles.push({
          title,
          description,
          url,
          source: source,
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          author: source,
          company: company,
          category: 'news'
        });
      }
    });

    console.log(`Found ${articles.length} news articles about ${company}`);
    return articles;
  } catch (error) {
    console.error(`Error searching Bing News for ${company}:`, error.message);
    return [];
  }
}

module.exports = { searchDuckDuckGo, searchBingNews };
