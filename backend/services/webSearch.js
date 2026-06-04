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
      
      const isNetworkError = error.code === 'ECONNRESET' || error.message.includes('socket hang up');
      const delay = (is403 || isNetworkError) ? 5000 * (i + 1) : 1000 * (i + 1);
      console.log(`Request failed (${error.message}). Retrying in ${delay}ms...`);
      await sleep(delay + Math.random() * 2000);
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
      // Precise LinkedIn targeting to avoid generic profile results
      queries = [
        `site:linkedin.com/posts "${company}"`,
        `site:linkedin.com/company "${company}" updates`,
        `"${company}" intitle:LinkedIn`
      ];
    } else if (site) {
      queries = [
        `site:${site} "${company}"`
      ];
    } else {
      queries = [`"${company}" latest news`];
    }

    let articles = [];
    
    for (const query of queries) {
      // Smart Jitter: LinkedIn needs more "gentle" treatment to avoid 403s
      const baseDelay = site === 'linkedin.com' ? 2500 : 800;
      await sleep(baseDelay + Math.random() * 1500);
      
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      try {
        const response = await fetchWithRetry(url);
        const $ = cheerio.load(response.data);
        
        $('.result').each((index, element) => {
          if (articles.length >= (options.limit || 8)) return false;

          const $el = $(element);
          const titleEl = $el.find('.result__a');
          const descEl = $el.find('.result__snippet');
          
          let title = titleEl.text().trim();
          let description = descEl.text().trim();
          let link = titleEl.attr('href');

          if (!title || !link) return;

          // DuckDuckGo redirect handling
          if (link.includes('uddg=')) {
            try {
              const urlParts = link.split('uddg=');
              if (urlParts.length > 1) {
                link = decodeURIComponent(urlParts[1].split('&')[0]);
              }
            } catch (e) {}
          }
          if (link.startsWith('//')) link = 'https:' + link;

          const isTargetSite = !site || link.toLowerCase().includes(site.toLowerCase());

          if (title && link && !link.includes('duckduckgo.com') && isTargetSite) {
            if (!articles.some(a => a.url === link)) {
              let finalSource = sourceName;
              if (link.toLowerCase().includes('linkedin.com')) {
                finalSource = 'LinkedIn';
              } else if (sourceName === 'Web Search') {
                try {
                  const urlObj = new URL(link);
                  const hostname = urlObj.hostname.replace('www.', '');
                  finalSource = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
                } catch (e) {}
              }

              // Enhanced Time Extraction for LinkedIn/Web: Default to null if not found
              let publishedAt = null;
              
              // Look for time indicators in description (e.g., "3 hours ago", "2 days ago", "1 week ago")
              const timeMatch = description.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i);
              if (timeMatch) {
                const amount = parseInt(timeMatch[1]);
                const unit = timeMatch[2].toLowerCase();
                const date = new Date();
                if (unit.includes('minute')) date.setMinutes(date.getMinutes() - amount);
                else if (unit.includes('hour')) date.setHours(date.getHours() - amount);
                else if (unit.includes('day')) date.setDate(date.getDate() - amount);
                else if (unit.includes('week')) date.setDate(date.getDate() - amount * 7);
                else if (unit.includes('month')) date.setMonth(date.getMonth() - amount);
                publishedAt = date.toISOString().replace('Z', '');
              } else {
                // Try to find date patterns like "May 20, 2024" or "2024-05-20"
                const dateMatch = description.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i) || 
                                 description.match(/\d{4}-\d{2}-\d{2}/);
                if (dateMatch) {
                  const parsedDate = new Date(dateMatch[0]);
                  if (!isNaN(parsedDate.getTime())) {
                    publishedAt = parsedDate.toISOString().replace('Z', '');
                  }
                }
              }

              articles.push({
                title,
                description: description || 'No description available',
                url: link,
                source: finalSource,
                imageUrl: '',
                publishedAt: publishedAt, // NULL if no time info found
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

      if (articles.length >= 3) break; // If we found some, move on to be faster
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
          publishedAt: dateText ? new Date(dateText).toISOString().replace('Z', '') : new Date().toISOString().replace('Z', ''),
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
  
  // 1. LinkedIn Search (Top Strategic Priority)
  const linkedInResults = await searchSiteNews(company, 'linkedin.com', 'LinkedIn', options);
  allResults.push(...linkedInResults);

  // Cool down slightly between sources to avoid rate limits
  await sleep(2000);

  // 2. Try Direct Scrape if website config exists
  if (options.website) {
    const directResults = await scrapeOfficialWebsite(company, options.website);
    allResults.push(...directResults);
  }

  // 3. Fallback to Official Website Search if needed
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
