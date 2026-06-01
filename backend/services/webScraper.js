const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

/**
 * Scrape company official websites for press releases and news
 * This extracts news directly from company sites
 */
async function scrapeCompanyWebsite(company, websiteConfig) {
  try {
    console.log(`Scraping ${company} official website...`);
    
    const response = await axios.get(websiteConfig.url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Extract articles based on selectors (can be customized per company)
    $(websiteConfig.selectors.container).each((index, element) => {
      if (articles.length >= 15) return false; // Limit to 15 articles per company

      const titleEl = $(element).find(websiteConfig.selectors.title);
      const descEl = $(element).find(websiteConfig.selectors.description);
      const linkEl = $(element).find(websiteConfig.selectors.link);
      const dateEl = $(element).find(websiteConfig.selectors.date);

      const title = titleEl.text().trim();
      const description = descEl.text().trim() || '';
      let url = linkEl.attr('href') || '';
      const dateText = dateEl.text().trim() || new Date().toISOString();

      // Resolve relative URLs
      if (url && !url.startsWith('http')) {
        url = new URL(url, websiteConfig.url).href;
      }

      if (title && url) {
        articles.push({
          title,
          description,
          url,
          source: `${company} Official Website`,
          imageUrl: '',
          publishedAt: new Date(dateText).toISOString() || new Date().toISOString(),
          author: company,
          company: company,
          category: 'press-release'
        });
      }
    });

    console.log(`Found ${articles.length} articles from ${company} website`);
    return articles;
  } catch (error) {
    console.error(`Error scraping ${company} website:`, error.message);
    return [];
  }
}

/**
 * Scrape Reddit for public discussions about a company
 * Uses public Reddit pages without authentication
 */
async function scrapeReddit(company, options = {}) {
  try {
    console.log(`Scraping Reddit for ${company}...`);
    
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(company)}&sort=new&t=month`;
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const articles = (response.data.data?.children || [])
      .slice(0, options.limit || 15)
      .map(post => ({
        title: post.data.title,
        description: post.data.selftext ? post.data.selftext.substring(0, 300) : post.data.summary || '',
        url: `https://reddit.com${post.data.permalink}`,
        source: `Reddit - ${post.data.subreddit}`,
        imageUrl: post.data.thumbnail && post.data.thumbnail.startsWith('http') ? post.data.thumbnail : '',
        publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
        author: post.data.author,
        company: company,
        category: 'discussion'
      }));

    console.log(`Found ${articles.length} Reddit posts about ${company}`);
    return articles;
  } catch (error) {
    console.error(`Error scraping Reddit for ${company}:`, error.message);
    return [];
  }
}

/**
 * Scrape X (Twitter) for public tweets about a company
 * Uses the public X search page
 */
async function scrapeX(company, options = {}) {
  try {
    console.log(`Scraping X for ${company}...`);
    
    // Note: This uses a workaround. For production, consider using a service like Nitter
    // which is a free, open-source Twitter alternative
    const nitterUrl = `https://nitter.net/search?q=${encodeURIComponent(company)}&f=tweets&since=1m`;
    
    const response = await axios.get(nitterUrl, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.tweet-body').each((index, element) => {
      if (articles.length >= (options.limit || 15)) return false;

      const text = $(element).find('.tweet-text').text().trim();
      const timestamp = $(element).find('time').attr('title');
      const tweetLink = $(element).closest('div.tweet').find('a.tweet-link').attr('href');

      if (text && tweetLink) {
        articles.push({
          title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          description: text,
          url: `https://nitter.net${tweetLink}`,
          source: 'X (via Nitter)',
          imageUrl: '',
          publishedAt: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
          author: 'X User',
          company: company,
          category: 'social'
        });
      }
    });

    console.log(`Found ${articles.length} X posts about ${company}`);
    return articles;
  } catch (error) {
    console.error(`Error scraping X for ${company}:`, error.message);
    return [];
  }
}

module.exports = { scrapeCompanyWebsite, scrapeReddit, scrapeX };
