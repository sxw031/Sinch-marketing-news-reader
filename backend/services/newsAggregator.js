const { db_helpers } = require('../models/db');
const { fetchMultipleRSSFeeds } = require('./rssFeedFetcher');
const { fetchTechCrunchNews } = require('./techcrunchFetcher');
const { searchDuckDuckGo, searchBingNews } = require('./webSearch');
const { COMPANIES } = require('../config/sources');
const moment = require('moment');

/**
 * Intelligent Category Engine
 */
function classifyArticle(title, description) {
  const content = (title + ' ' + (description || '')).toLowerCase();
  
  // 1. CSM Strategic Insights (Highest Priority)
  // Keywords related to partnership, expansion, executive changes, and business health
  const csmKeywords = [
    'partnership', 'collaboration', 'expand', 'growth', 'acquisition', 'merger', 
    'ceo', 'executive', 'leadership', 'revenue', 'profit', 'earnings', 'quarterly', 
    'strategy', 'invest', 'funding', 'outage', 'downtime', 'issue', 'customer', 
    'launch', 'new market', 'hiring', 'layoff', 'rebrand'
  ];
  if (csmKeywords.some(kw => content.includes(kw))) {
    return 'Strategic Insights';
  }

  // 2. Finance
  const financeKeywords = ['stock', 'ipo', 'bank', 'fintech', 'payment', 'loan', 'credit', 'interest rate', 'funding', 'venture', 'equity'];
  if (financeKeywords.some(kw => content.includes(kw))) {
    return 'Finance';
  }

  // 3. Marketing & Sales
  const marketingKeywords = ['campaign', 'ad', 'brand', 'marketing', 'social media', 'engagement', 'user base', 'traffic', 'sale', 'promotion'];
  if (marketingKeywords.some(kw => content.includes(kw))) {
    return 'Marketing';
  }

  // 4. Technology
  const techKeywords = ['ai', 'artificial intelligence', 'cloud', 'saas', 'software', 'app', 'update', 'cybersecurity', 'data', 'platform'];
  if (techKeywords.some(kw => content.includes(kw))) {
    return 'Technology';
  }

  return 'General';
}

/**
 * Fetch news for a specific company using only free public sources
 */
async function fetchNewsForCompany(company) {
  const companyConfig = COMPANIES.find(c => c.name.toLowerCase() === company.toLowerCase());
  if (!companyConfig) return [];
  
  let allNews = [];
  
  // 1. Fetch from RSS feeds (company official feeds)
  try {
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

  // 2. Fetch from TechCrunch (free RSS feed)
  try {
    console.log(`Fetching TechCrunch news for ${company}...`);
    const techcrunchNews = await fetchTechCrunchNews(company, { limit: 10 });
    allNews = allNews.concat(techcrunchNews);
  } catch (error) {
    console.error(`Error fetching TechCrunch news for ${company}:`, error.message);
  }

  // 3. Web search for news (DuckDuckGo)
  try {
    console.log(`Web searching (DuckDuckGo) for ${company} news...`);
    const searchNews = await searchDuckDuckGo(company, { limit: 15 });
    allNews = allNews.concat(searchNews);
  } catch (error) {
    console.error(`Error web searching for ${company}:`, error.message);
  }

  // 4. Web search for news (Bing News)
  try {
    console.log(`Bing News searching for ${company}...`);
    const bingNews = await searchBingNews(company, { limit: 10 });
    allNews = allNews.concat(bingNews);
  } catch (error) {
    console.error(`Error Bing News searching for ${company}:`, error.message);
  }

  return allNews;
}

async function aggregateAllNews() {
  console.log('Starting news aggregation with intelligent classification...');
  const startTime = new Date();
  
  for (const company of COMPANIES) {
    try {
      console.log(`\n=== Fetching news for ${company.name} ===`);
      const news = await fetchNewsForCompany(company.name);
      if (news.length > 0) {
        // Apply classification to each article before storing
        const classifiedNews = news.map(article => ({
          ...article,
          category: classifyArticle(article.title, article.description)
        }));
        await storeNews(classifiedNews, company.name);
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
            article.category || 'General',
            article.publishedAt || new Date().toISOString(),
            article.author || 'Unknown'
          ]
        );
      } else {
        // Update category if it's currently 'General' or 'news' but we have a better classification
        if (article.category && article.category !== 'General' && article.category !== 'news') {
          await db_helpers.run(
            'UPDATE news SET category = ? WHERE id = ? AND (category = "General" OR category = "news")',
            [article.category, existing.id]
          );
        }
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
