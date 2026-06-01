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
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Enhanced selector list for various DDG HTML structures
    const results = $('.result, .links_main, .web-result, .nrn-react-div');
    
    results.each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const $el = $(element);
      const titleEl = $el.find('a[data-testid="result-title-a"], .result__a, .result__title a, .result-link');
      const descEl = $el.find('.result__snippet, .result-snippet, [data-testid="result-snippet"]');
      
      let title = titleEl.text().trim();
      let description = descEl.text().trim();
      let url = titleEl.attr('href');

      // Fallback for different structures
      if (!title) title = $el.find('h2').text().trim();
      if (!url) url = $el.find('a').first().attr('href');

      if (!title || !url) return;

      // Handle DuckDuckGo's internal redirect URLs
      if (url.startsWith('//')) url = 'https:' + url;
      if (url.includes('uddg=')) {
        try {
          const urlParts = url.split('uddg=');
          if (urlParts.length > 1) {
            url = decodeURIComponent(urlParts[1].split('&')[0]);
          }
        } catch (e) {}
      }

      if (title && url && !url.includes('duckduckgo.com') && !url.includes('google.com')) {
        articles.push({
          title,
          description: description || 'No description available',
          url,
          source: 'Web Search',
          imageUrl: '',
          publishedAt: new Date().toISOString(),
          author: 'Web Search',
          company: company,
          category: 'news'
        });
      }
    });

    // If still no articles, try a broader search or different selectors
    if (articles.length === 0) {
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && href.startsWith('http') && !href.includes('duckduckgo') && text.length > 20) {
           if (articles.length < 5) {
             articles.push({
               title: text,
               description: 'News from search results',
               url: href,
               source: 'Web Search',
               imageUrl: '',
               publishedAt: new Date().toISOString(),
               author: 'Web Search',
               company: company,
               category: 'news'
             });
           }
        }
      });
    }

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

    // Bing News uses various structures, let's be more flexible
    const newsItems = $('.news-card, .newsitem, [data-author], .card-content');
    
    newsItems.each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const $el = $(element);
      const titleEl = $el.find('a.title, .title, h2, h3, a[data-log]');
      const descEl = $el.find('.snippet, .description, p');
      const sourceEl = $el.find('.source, .attribution, cite');

      let title = titleEl.text().trim();
      let url = titleEl.attr('href') || $el.find('a').first().attr('href');
      let description = descEl.text().trim();
      let source = sourceEl.text().trim() || 'Bing News';

      if (!title || !url) return;

      // Ensure URL is absolute
      if (url.startsWith('/')) url = 'https://www.bing.com' + url;

      if (title && url && url.startsWith('http') && !url.includes('bing.com/news')) {
        articles.push({
          title,
          description: description || 'No description available',
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
