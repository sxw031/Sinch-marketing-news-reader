const { db_helpers } = require('../models/db');
const { fetchMultipleRSSFeeds } = require('./rssFeedFetcher');
const { scrapeCompanyWebsite, scrapeReddit, scrapeX } = require('./webScraper');
const { searchDuckDuckGo, searchBingNews } = require('./webSearch');
const { fetchTechCrunchNews } = require('./techcrunchRss');
const { COMPANIES } = require('../config/sources');
const moment = require('moment');

async function fetchNewsForCompany(company) {
  const companyConfig = COMPANIES.find(c => c.name.toLowerCase() === company.toLowerCase());
  if (!companyConfig) return [];
  
  let allNews = [];
  
  try {
    // 1. Fetch from company official website (via web scraping)
    if (companyConfig.website) {
      console.log(`Scraping ${company} official website...`);
      const websiteNews = await scrapeCompanyWebsite(company, companyConfig.website);
      allNews = allNews.concat(websiteNews);
    }
  } catch (error) {
    console.error(`Error scraping ${company} website:`, error.message);
  }

  try {
    // 2. Fetch from RSS feeds (company official feeds)
    if (companyConfig.sources && companyConfig.sources.length > 0) {
      const rssFeedUrls = companyConfig.sources
        .filter(s => s.type === 'rss')
        .map(s => s.url);
      
      if (rssFeedUrls.length > 0) {
        console.log(`Fetching RSS feeds for ${company}...`);
        const rssNews = await fetchMultipleRSSFeeds(rssFeedUrls, company);
        allNews = allNews.concat(rssNews);
      }
    }
  } catch (error) {
    console.error(`Error fetching RSS feeds for ${company}:`, error.message);
  }

  try {
    // 3. Fetch from TechCrunch (free RSS feed)
    console.log(`Fetching TechCrunch news for ${company}...`);
    const techcrunchNews = await fetchTechCrunchNews(company, { limit: 10 });
    allNews = allNews.concat(techcrunchNews);
  } catch (error) {
    console.error(`Error fetching TechCrunch news for ${company}:`, error.message);
  }

  try {
    // 4. Scrape Reddit for public discussions
    console.log(`Scraping Reddit for ${company}...`);
    const redditNews = await scrapeReddit(company, { limit: 10 });
    allNews = allNews.concat(redditNews);
  } catch (error) {
    console.error(`Error scraping Reddit for ${company}:`, error.message);
  }

  try {
    // 5. Scrape X (Twitter) for public posts
    console.log(`Scraping X for ${company}...`);
    const xNews = await scrapeX(company, { limit: 10 });
    allNews = allNews.concat(xNews);
  } catch (error) {
    console.error(`Error scraping X for ${company}:`, error.message);
  }

  try {
    // 6. Web search for news (DuckDuckGo)
    console.log(`Web searching for ${company} news...`);
    const searchNews = await searchDuckDuckGo(company, { limit: 15 });
    allNews = allNews.concat(searchNews);
  } catch (error) {
    console.error(`Error web searching for ${company}:`, error.message);
  }

  try {
    // 7. Web search for news (Bing News)
    console.log(`Bing News searching for ${company}...`);
    const bingNews = await searchBingNews(company, { limit: 10 });
    allNews = allNews.concat(bingNews);
  } catch (error) {
    console.error(`Error Bing News searching for ${company}:`, error.message);
  }

  return allNews;
}

async function aggregateAllNews() {
  console.log('Starting news aggregation from free public sources...');
  const startTime = new Date();
  
  for (const company of COMPANIES) {
    try {
      console.log(`\n=== Fetching news for ${company.name} ===`);
      const news = await fetchNewsForCompany(company.name);
      if (news.length > 0) {
        await storeNews(news, company.name);
        console.log(`✓ Stored ${news.length} articles for ${company.name}`);
      } else {
        console.log(`⚠ No articles found for ${company.name}`);
      }
    } catch (error) {
      console.error(`Error aggregating news for ${company.name}:`, error.message);
    }
  }
  
  const duration = new Date() - startTime;
  console.log(`\n✓ Aggregation completed in ${duration}ms`);
}

async function storeNews(articles, company) {
  for (const article of articles) {
    try {
      const existing = await db_helpers.get(
        'SELECT id FROM news WHERE title = ? AND company = ?',
        [article.title, company]
      );
      
      if (!existing) {
        await db_helpers.run(
          `INSERT INTO news (company, title, description, url, source, imageUrl, category, publishedAt, author) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            article.company || company,
            article.title,
            article.description || '',
            article.url,
            article.source,
            article.imageUrl || '',
            article.category || 'news',
            article.publishedAt || new Date().toISOString(),
            article.author || 'Unknown'
          ]
        );
      }
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        console.error('Error storing article:', error.message);
      }
    }
  }
}

async function getNews(filters = {}) {
  let sql = 'SELECT * FROM news WHERE 1=1';
  const params = [];
  
  if (filters.company) {
    sql += ' AND company = ?';
    params.push(filters.company);
  }
  
  if (filters.companies && Array.isArray(filters.companies) && filters.companies.length > 0) {
    sql += ` AND company IN (${filters.companies.map(() => '?').join(',')})`;
    params.push(...filters.companies);
  }
  
  if (filters.startDate) {
    sql += ' AND publishedAt >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    sql += ' AND publishedAt <= ?';
    params.push(filters.endDate);
  }
  
  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  
  if (filters.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  sql += ' ORDER BY publishedAt DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return await db_helpers.all(sql, params);
}

function getAvailableCompanies() {
  return COMPANIES.map(c => ({ id: c.id, name: c.name, category: c.category }));
}

async function cleanupOldNews(daysToKeep = 30) {
  const cutoffDate = moment().subtract(daysToKeep, 'days').toISOString();
  const result = await db_helpers.run('DELETE FROM news WHERE publishedAt < ?', [cutoffDate]);
  console.log(`Cleaned up ${result.changes} old news articles`);
  return result.changes;
}

module.exports = {
  fetchNewsForCompany,
  aggregateAllNews,
  storeNews,
  getNews,
  getAvailableCompanies,
  cleanupOldNews
};
