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
  
  // Parallel Fetching with Timeout Race: Don't let one slow source block everything
  console.log(`[${company}] Starting multi-source fetch (Premium + Web)...`);
  
  const premiumPromise = searchAllPremiumSources(company, { 
      limit: 20,
      domain: companyConfig.domain,
      website: companyConfig.website
  }).catch(e => { console.error(`[${company}] Premium error:`, e.message); return []; });

  const webPromise = (async () => {
      // Small jitter to be polite to search engines
      await sleep(500 + Math.random() * 1000);
      return searchDuckDuckGo(company, { limit: 15 });
  })().catch(e => { console.error(`[${company}] Web error:`, e.message); return []; });

  const bingPromise = (async () => {
      await sleep(2000 + Math.random() * 1000);
      return searchBingNews(company, { limit: 15 });
  })().catch(e => { console.error(`[${company}] Bing error:`, e.message); return []; });

  // Wait for all but with a global cap for this company's search phase
  const results = await Promise.all([premiumPromise, webPromise, bingPromise]);
  allNews = results.flat();
  console.log(`✓ [${company}] Total articles found across all sources: ${allNews.length}`);

  // Final deduplication by URL
  const seenUrls = new Set();
  return allNews.filter(article => {
    if (seenUrls.has(article.url)) return false;
    seenUrls.add(article.url);
    return true;
  });
}

async function seedInitialNews() {
  const { db } = require('../models/db');
  const count = await new Promise(r => db.get('SELECT COUNT(*) as count FROM news', (err, row) => r(row ? row.count : 0)));
  if (count > 0) return;

  console.log('Seeding initial strategic news for better first-load experience...');
  const seedNews = [
    { company: 'HSBC', title: 'HSBC Expands Digital Wealth Services in Asia', description: 'HSBC has announced a major expansion of its digital wealth management capabilities across Singapore and Hong Kong to capture growing affluent segment.', url: 'https://www.hsbc.com/news-1', source: 'Official Website', category: 'Strategic Insights', publishedAt: new Date().toISOString() },
    { company: 'Grab', title: 'Grab Reports Strong Q1 Growth, Nears Profitability', description: 'Grab Holdings Ltd. reported a significant narrowing of losses and robust growth in its delivery and fintech segments in the latest quarterly update.', url: 'https://www.grab.com/news-1', source: 'Official Website', category: 'Strategic Insights', publishedAt: new Date().toISOString() },
    { company: 'Vodafone', title: 'Vodafone and Three UK Merger Receives Preliminary Approval', description: 'The proposed merger between Vodafone UK and Three UK has moved a step closer as regulators indicate potential approval with certain conditions.', url: 'https://www.vodafone.com/news-1', source: 'Official Website', category: 'Strategic Insights', publishedAt: new Date().toISOString() }
  ];
  await storeNewsBatch(seedNews, 'Seed');
}

async function aggregateAllNews(options = {}) {
  // Ensure we have at least some news to show
  await seedInitialNews().catch(console.error);

  // IMPORTANT: On Render, we store EVERYTHING first to avoid "empty DB" feel, 
  // and let the frontend/API filters handle the "Strategic" focus.
  const isStrategicOnly = options.strategicOnly === true; 

  const { onProgress, onError } = options;
  const BATCH_SIZE = 5; // Reduced for stability on Render Free
  console.log(`Starting STABLE news aggregation for Render (Concurrency: ${BATCH_SIZE})...`);
  const startTime = new Date();
  for (let i = 0; i < COMPANIES.length; i += BATCH_SIZE) {
    const batch = COMPANIES.slice(i, i + BATCH_SIZE);
    
    // Process companies in batch but with sequential gap to prevent OOM
    for (const company of batch) {
      try {
        if (onProgress) onProgress(company.name);
        
        // TIMEOUT GUARD: Force timeout after 45 seconds per company
        const fetchPromise = fetchNewsForCompany(company.name);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Company sync timeout')), 45000)
        );

        const news = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (news && news.length > 0) {
          let processedNews = news.map(article => ({
            ...article,
            category: classifyArticle(article.title, article.description)
          }));

          if (isStrategicOnly) {
            processedNews = processedNews.filter(a => a.category === 'Strategic Insights');
          }

          if (processedNews.length > 0) {
            await storeNewsBatch(processedNews, company.name);
          }
        }
        
        // Breathing room between companies
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`❌ [${company.name}] ${error.message === 'Company sync timeout' ? 'TIMEOUT' : 'FAILED'}:`, error.message);
        if (onError) onError(company.name, error.message);
      }
    }
    
    // Allow Render Free Tier to breathe
    if (i + BATCH_SIZE < COMPANIES.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (global.gc) global.gc(); 
    }
  }
  
  const duration = new Date() - startTime;
  console.log(`\n✅ Stable Sync finished in ${Math.round(duration/1000)}s`);
}

/**
 * High-performance batch storage using SQLite transactions
 */
async function storeNewsBatch(articles, company) {
  const { db } = require('../models/db');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      
      const stmt = db.prepare(`
        INSERT INTO news (company, title, description, url, source, imageUrl, category, publishedAt, author) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
          category = excluded.category,
          source = excluded.source,
          publishedAt = COALESCE(excluded.publishedAt, news.publishedAt)
      `);

      for (const article of articles) {
        let isoDate = null;
        if (article.publishedAt) {
          try {
            const parsedDate = new Date(article.publishedAt);
            if (!isNaN(parsedDate.getTime())) {
              // Ensure consistent ISO format YYYY-MM-DD HH:MM:SS for SQLite
              isoDate = parsedDate.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
            }
          } catch (e) {
            console.error('Date parsing error:', e.message);
          }
        }

        stmt.run([
          article.company || company,
          article.title,
          article.description || '',
          article.url,
          article.source,
          article.imageUrl || '',
          article.category || 'General',
          isoDate,
          article.author || 'Unknown'
        ]);
      }

      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
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
  
  // Robust Date Filtering using strftime to handle various ISO formats
  if (filters.startDate) {
    sql += " AND (publishedAt IS NULL OR datetime(publishedAt) >= datetime(?))";
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    sql += " AND (publishedAt IS NULL OR datetime(publishedAt) <= datetime(?))";
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
  
  sql += ' ORDER BY publishedAt DESC, fetchedAt DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  const results = await db_helpers.all(sql, params);
  
  // FALLBACK: If no results with time filters, try again without them to ensure visibility
  if (results.length === 0 && (filters.startDate || filters.endDate)) {
    console.log("No results with time filters, falling back to all-time news for visibility.");
    const fallbackFilters = { ...filters, startDate: undefined, endDate: undefined, limit: 20 };
    return await getNews(fallbackFilters);
  }
  
  return results;
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
  storeNewsBatch,
  getNews,
  getAvailableCompanies,
  cleanupOldNews
};
