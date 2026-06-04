const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced Axios request with retries and jitter
 */
async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, {
        ...options,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...options.headers
        },
        timeout: 15000
      });
      return response;
    } catch (error) {
      const isLastRetry = i === retries;
      const is403 = error.response && error.response.status === 403;
      
      if (isLastRetry) throw error;
      
      const delay = is403 ? 3000 * (i + 1) : 1000 * (i + 1);
      console.log(`Request failed (${error.message}). Retrying in ${delay}ms...`);
      await sleep(delay + Math.random() * 1000);
    }
  }
}

/**
 * Search for company news using DuckDuckGo with specific site filters and fallback
 */
async function searchSiteNews(company, site, sourceName, options = {}) {
  try {
    console.log(`Searching ${sourceName} for ${company} news...`);

    let queries = [];
    if (site === 'linkedin.com') {
      queries = [
        `site:linkedin.com/company "${company}" "posts"`,
        `site:linkedin.com/posts "${company}"`,
        `"${company}" LinkedIn latest updates`
      ];
    } else if (site) {
      queries = [
        `site:${site} "${company}"`,
        `"${company}" ${site} latest news`
      ];
    } else {
      queries = [`"${company}" latest news`];
    }

    let articles = [];
    
    for (const query of queries) {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      try {
        const response = await fetchWithRetry(url);
        const $ = cheerio.load(response.data);
        
        $('.result').each((index, element) => {
          if (articles.length >= (options.limit || 5)) return false;

          const $el = $(element);
          const titleEl = $el.find('.result__a');
          const descEl = $el.find('.result__snippet');
          
          let title = titleEl.text().trim();
          let description = descEl.text().trim();
          let link = titleEl.attr('href');

          if (!title || !link) return;

          if (link.startsWith('//')) link = 'https:' + link;
          if (link.includes('uddg=')) {
            try {
              const urlParts = link.split('uddg=');
              if (urlParts.length > 1) {
                link = decodeURIComponent(urlParts[1].split('&')[0]);
              }
            } catch (e) {}
          }

          const isTargetSite = !site || link.toLowerCase().includes(site.toLowerCase());

          if (title && link && !link.includes('duckduckgo.com') && isTargetSite) {
            if (!articles.some(a => a.url === link)) {
              // Extract a better source name if it's general web search
              let finalSource = sourceName;
              
              // Force "LinkedIn" source name for any linkedin.com results
              if (link.toLowerCase().includes('linkedin.com')) {
                finalSource = 'LinkedIn';
              } else if (sourceName === 'Web Search') {
                try {
                  const urlObj = new URL(link);
                  const hostname = urlObj.hostname.replace('www.', '');
                  finalSource = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
                } catch (e) {}
              }

              articles.push({
                title,
                description: description || 'No description available',
                url: link,
                source: finalSource,
                imageUrl: '',
                publishedAt: new Date().toISOString(),
                author: finalSource,
                company: company,
                category: 'General'
              });
            }
          }
        });
      } catch (e) {
        console.error(`DuckDuckGo query failed for ${query}:`, e.message);
      }

      if (articles.length > 0) break;
    }

    return articles;
  } catch (error) {
    console.error(`Error searching ${sourceName} for ${company}:`, error.message);
    return [];
  }
}

/**
 * Main search function that aggregates from multiple premium sources
 */
/**
 * Direct scraping of official websites
 */
async function scrapeOfficialWebsite(company, config) {
  if (!config || !config.url) return [];
  
  try {
    console.log(`Directly scraping official website for ${company}: ${config.url}`);
    const response = await fetchWithRetry(config.url);
    const $ = cheerio.load(response.data);
    const articles = [];
    const selectors = config.selectors || {
        container: 'article, .news-item',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
    };

    $(selectors.container).each((i, el) => {
      if (articles.length >= 10) return false;
      const $el = $(el);
      const title = $el.find(selectors.title).first().text().trim();
      let link = $el.find(selectors.link).first().attr('href');
      const description = $el.find(selectors.description).first().text().trim();
      const dateText = $el.find(selectors.date).first().text().trim();

      if (title && link) {
        if (link.startsWith('/')) {
            const urlObj = new URL(config.url);
            link = urlObj.origin + link;
        } else if (!link.startsWith('http')) {
            link = config.url.replace(/\/$/, '') + '/' + link.replace(/^\//, '');
        }

        articles.push({
          title,
          description: description || 'Official update from ' + company,
          url: link,
          source: 'Official Website',
          imageUrl: '',
          publishedAt: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
          author: company,
          company: company,
          category: 'General'
        });
      }
    });
    return articles;
  } catch (error) {
    console.error(`Direct scrape failed for ${company}:`, error.message);
    return [];
  }
}

async function searchAllPremiumSources(company, options = {}) {
  const allResults = [];
  
  // 1. Try Direct Scrape first if website config exists
  if (options.website) {
    const directResults = await scrapeOfficialWebsite(company, options.website);
    allResults.push(...directResults);
  }

  // 2. LinkedIn Search (High Priority)
  const linkedInResults = await searchSiteNews(company, 'linkedin.com', 'LinkedIn', options);
  allResults.push(...linkedInResults);

  // 3. Fallback to Official Website Search if direct scrape found nothing
  if (allResults.length === 0 && options.domain) {
    const officialSearchResults = await searchSiteNews(company, options.domain, 'Official Website', options);
    allResults.push(...officialSearchResults);
  }

  return allResults;
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

    const response = await fetchWithRetry(url);
    const $ = cheerio.load(response.data);
    const articles = [];

    $('.news-card, .newsitem, .card-content').each((index, element) => {
      if (articles.length >= (options.limit || 20)) return false;

      const $el = $(element);
      const titleEl = $el.find('a.title, .title, .news-card-title, h2');
      const descEl = $el.find('.snippet, .description, .news-card-snippet, .news-card-body');
      const sourceEl = $el.find('.source, .attribution, .news-card-source');

      let title = titleEl.text().trim();
      let link = titleEl.attr('href');
      let description = descEl.text().trim();
      let rawSource = sourceEl.text().trim() || 'Bing News';

      let source = rawSource;
      if (source.length <= 3 || /^\d+[DWMY]/.test(source)) {
          source = 'Bing News';
      }
      if (source.toUpperCase() === 'MSN') source = 'MSN News';

      if (!title || !link) return;
      if (link.startsWith('/')) link = 'https://www.bing.com' + link;

      if (title && link && link.startsWith('http')) {
        articles.push({
          title,
          description: description || 'No description available',
          url: link,
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
