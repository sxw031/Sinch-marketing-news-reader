const { db_helpers } = require('../models/db');
const { searchDuckDuckGo, searchBingNews, searchAllPremiumSources } = require('./webSearch');
const { COMPANIES } = require('../config/sources');
const moment = require('moment');

/**
 * Intelligent Category Engine
 */
function classifyArticle(title, description) {
  const content = (title + ' ' + (description || '')).toLowerCase();
  
  // 1. CSM Strategic Insights (Highest Priority)
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
 * Fetch news for a specific company including premium sources
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNewsForCompany(company) {
  const companyConfig = COMPANIES.find(c => c.name.toLowerCase() === company.toLowerCase());
  if (!companyConfig) return [];
  
  let allNews = [];
  
  // 1. Official Website & Premium Sources (LinkedIn, etc.)
  try {
    console.log(`Fetching Premium Sources (Official & LinkedIn) for ${company}...`);
    const premiumNews = await searchAllPremiumSources(company, { 
        limit: 10,
        domain: companyConfig.domain,
        website: companyConfig.website
    });
    allNews = allNews.concat(premiumNews);
  } catch (error) {
    console.error(`Error fetching Premium Sources for ${company}:`, error.message);
  }

  // 2. Web search (DuckDuckGo & Bing)
  try {
    console.log(`Web searching (Bing/DDG) for ${company}...`);
    const ddgNews = await searchDuckDuckGo(company, { limit: 15 });
    allNews = allNews.concat(ddgNews);
    
    // Add small delay to avoid rate limiting
    await sleep(1000);
    
    const bingNews = await searchBingNews(company, { limit: 15 });
    allNews = allNews.concat(bingNews);
  } catch (error) {
    console.error(`Error web searching for ${company}:`, error.message);
  }

  return allNews;
}

async function aggregateAllNews() {
  console.log('Starting comprehensive news aggregation...');
  const startTime = new Date();
  
  // Use serial processing for maximum reliability in constrained environments
  const BATCH_SIZE = 1; 
  for (let i = 0; i < COMPANIES.length; i++) {
    const company = COMPANIES[i];
    console.log(`\n--- Processing [${i+1}/${COMPANIES.length}] ${company.name} ---`);
    
    try {
      const news = await fetchNewsForCompany(company.name);
      if (news.length > 0) {
        const classifiedNews = news.map(article => ({
          ...article,
          category: classifyArticle(article.title, article.description)
        }));
        await storeNews(classifiedNews, company.name);
        console.log(`✓ [${company.name}] Stored ${news.length} articles`);
      } else {
        console.log(`⚠ [${company.name}] No articles found`);
      }
    } catch (error) {
      console.error(`❌ [${company.name}] Aggregation failed:`, error.message);
    }
    
    // Polite delay between batches
    if (i + BATCH_SIZE < COMPANIES.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const duration = new Date() - startTime;
  console.log(`\n✅ Aggregation completed in ${Math.round(duration/1000)}s`);
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
            article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
            article.author || 'Unknown'
          ]
        );
      } else {
        // Update category if we have a better one
        if (article.category && article.category !== 'General' && article.category !== 'news') {
          await db_helpers.run(
            'UPDATE news SET category = ? WHERE id = ? AND (category = "General" OR category = "news")',
            [article.category, existing.id]
          );
        }
        // Update source if we found a more specific one (e.g., LinkedIn or Official Website over generic Web Search)
        const premiumSources = ['LinkedIn', 'Official Website'];
        if (premiumSources.includes(article.source)) {
          await db_helpers.run(
            'UPDATE news SET source = ? WHERE id = ? AND source NOT IN (?, ?)',
            [article.source, existing.id, ...premiumSources]
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
  
  if (filters.companies) {
    const companyList = Array.isArray(filters.companies) ? filters.companies : filters.companies.split(',');
    if (companyList.length > 0) {
      sql += ` AND company IN (${companyList.map(() => '?').join(',')})`;
      params.push(...companyList);
    }
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

  if (filters.source) {
    sql += ' AND source = ?';
    params.push(filters.source);
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
