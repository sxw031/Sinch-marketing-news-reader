const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

/**
 * Search for company news using DuckDuckGo
 */
async function searchDuckDuckGo(company, options = {}) {
  try {
    console.log(`Searching DuckDuckGo for ${company} news...`);

    const query = `${company} news`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.result').each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

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
        // Extract domain as source if no clear source found
        let source = 'Web Search';
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            source = domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch (e) {}

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
    console.error(`Error searching DuckDuckGo for ${company}:`, error.message);
    return [];
  }
}

/**
 * Search Bing News for company-related news
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

      // Normalize source names (e.g., MSN, 1D, 2D etc are often just noise from Bing)
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

module.exports = { searchDuckDuckGo, searchBingNews };
