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
    'launch', 'new market', 'hiring', 'layoff', 'rebrand', 'announcement', 'service',
    'solution', 'digital', 'transformation', 'agreement', 'contract', 'deal'
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
        limit: 20, // Increased limit for better coverage
        domain: companyConfig.domain,
        website: companyConfig.website
    });
    if (premiumNews && premiumNews.length > 0) {
        allNews = allNews.concat(premiumNews);
        console.log(`✓ [${company}] Found ${premiumNews.length} premium articles`);
    } else {
        console.log(`⚠ [${company}] No premium articles found, will rely on web search`);
    }
  } catch (error) {
    console.error(`Error fetching Premium Sources for ${company}:`, error.message);
  }

  // 2. Web search (DuckDuckGo & Bing)
  try {
    console.log(`Web searching (Bing/DDG) for ${company}...`);
    // Parallelize search for better coverage but with slight delay to be polite
    const [ddgNews, bingNews] = await Promise.all([
      searchDuckDuckGo(company, { limit: 15 }),
      (async () => {
        await sleep(2000);
        return searchBingNews(company, { limit: 15 });
      })()
    ]);
    
    allNews = allNews.concat(ddgNews || []);
    allNews = allNews.concat(bingNews || []);
  } catch (error) {
    console.error(`Error web searching for ${company}:`, error.message);
  }

  // Final deduplication by URL
  const seenUrls = new Set();
  return allNews.filter(article => {
    if (seenUrls.has(article.url)) return false;
    seenUrls.add(article.url);
    return true;
  });
}

async function aggregateAllNews(options = {}) {
  const isStrategicOnly = options.strategicOnly !== false;
  const { onProgress, onError } = options;
  console.log(`Starting EXTREME news aggregation with TaskCoordinator (Concurrency: 10)...`);
  const startTime = new Date();
  
  // Extreme Performance: Concurrency 10 for Render Free Tier
  // We use a small delay between tasks within a batch to prevent CPU spikes
  const BATCH_SIZE = 10; 
  for (let i = 0; i < COMPANIES.length; i += BATCH_SIZE) {
    const batch = COMPANIES.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (company, index) => {
      // Staggered start within batch (200ms) to spread CPU load
      await new Promise(r => setTimeout(r, index * 200));
      
      try {
        if (onProgress) onProgress(company.name);
        
        const news = await fetchNewsForCompany(company.name);
        if (news.length > 0) {
          let processedNews = news.map(article => ({
            ...article,
            category: classifyArticle(article.title, article.description)
          }));

          if (isStrategicOnly) {
            processedNews = processedNews.filter(a => a.category === 'Strategic Insights');
          }

          if (processedNews.length > 0) {
            await storeNews(processedNews, company.name);
          }
        }
      } catch (error) {
        console.error(`❌ [${company.name}] Aggregation failed:`, error.message);
        if (onError) onError(company.name, error.message);
      }
    }));
    
    // Memory Guard: Small pause to allow GC to run on Render Free
    if (i + BATCH_SIZE < COMPANIES.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (global.gc) global.gc(); 
    }
  }
  
  const duration = new Date() - startTime;
  console.log(`\n✅ Extreme Sync finished in ${Math.round(duration/1000)}s`);
}

async function storeNews(articles, company) {
  for (const article of articles) {
    try {
      // Use URL as unique identifier to prevent duplicates more reliably
      const existing = await db_helpers.get(
        'SELECT id, publishedAt FROM news WHERE url = ?',
        [article.url]
      );
      
      // Precise Source Date Parsing
      let sourceDate = new Date();
      if (article.publishedAt) {
          const parsedDate = new Date(article.publishedAt);
          if (!isNaN(parsedDate.getTime())) {
              sourceDate = parsedDate;
          }
      }
      const isoDate = sourceDate.toISOString().replace('Z', '');

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
            isoDate,
            article.author || 'Unknown'
          ]
        );
      } else {
        // Update existing entry with better data if found
        await db_helpers.run(
          'UPDATE news SET category = ?, source = ?, publishedAt = ? WHERE id = ?',
          [
              article.category || 'General',
              article.source,
              isoDate,
              existing.id
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
  
  if (filters.companies) {
    const companyList = Array.isArray(filters.companies) ? filters.companies : filters.companies.split(',');
    if (companyList.length > 0) {
      sql += ` AND company IN (${companyList.map(() => '?').join(',')})`;
      params.push(...companyList);
    }
  }
  
  if (filters.startDate) {
    // Ensure precise datetime comparison
    sql += " AND datetime(publishedAt) >= datetime(?)";
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
  return COMPANIES.map(c => ({ 
    id: c.id, 
    name: c.name, 
    category: c.category, 
    logoUrl: c.logoUrl 
  }));
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
