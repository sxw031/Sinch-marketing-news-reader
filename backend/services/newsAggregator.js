const { db, query } = require('../models/db');
const { fetchNewsForCompany } = require('./webSearch');
const { COMPANIES } = require('../config/sources');

// --- Category Classification ---
const CATEGORY_RULES = [
  { category: 'Strategic Insights', keywords: ['partnership', 'collaboration', 'expand', 'growth', 'acquisition', 'merger', 'ceo', 'executive', 'revenue', 'profit', 'earnings', 'strategy', 'invest', 'funding', 'launch', 'hiring', 'layoff', 'rebrand', 'contract', 'deal', 'agreement', 'announce', 'milestone', 'record'] },
  { category: 'Finance', keywords: ['stock', 'ipo', 'bank', 'fintech', 'payment', 'loan', 'credit', 'interest rate', 'equity', 'dividend', 'shares', 'market cap'] },
  { category: 'Marketing', keywords: ['campaign', 'brand', 'marketing', 'social media', 'engagement', 'promotion', 'advertising', 'customer'] },
  { category: 'Technology', keywords: ['ai', 'artificial intelligence', 'cloud', 'software', 'app', 'cybersecurity', 'data', 'platform', 'machine learning', 'api', 'messaging', 'sms', 'rcs'] }
];

function classifyArticle(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) return rule.category;
  }
  return 'General';
}

// --- Storage ---
async function storeArticles(articles) {
  if (!articles || articles.length === 0) return 0;

  return new Promise((resolve, reject) => {
    let stored = 0;
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO news (company, title, description, url, source, category, publishedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const a of articles) {
        // Store as ISO 8601 with T and Z for consistent cross-platform parsing
        const publishedAt = normalizeToISO(a.publishedAt);

        stmt.run([
          a.company,
          a.title,
          (a.description || '').substring(0, 500),
          a.url || '',
          a.source || 'Unknown',
          classifyArticle(a.title, a.description),
          publishedAt
        ], function(err) {
          if (!err && this.changes > 0) stored++;
        });
      }

      stmt.finalize();
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(stored);
      });
    });
  });
}

/**
 * Normalize any date input to ISO 8601 format "YYYY-MM-DDTHH:MM:SSZ"
 * This ensures consistent parsing in both Node.js and browsers across all timezones
 */
function normalizeToISO(input) {
  if (!input) return new Date().toISOString().split('.')[0] + 'Z';
  const d = new Date(input);
  if (isNaN(d.getTime())) return new Date().toISOString().split('.')[0] + 'Z';
  return d.toISOString().split('.')[0] + 'Z';
}

// --- Aggregation Engine ---
async function aggregateAllNews(options = {}) {
  const { onProgress, onError } = options;
  const startTime = Date.now();
  let totalStored = 0;

  console.log(`[Aggregator] Starting sync for ${COMPANIES.length} companies...`);

  // Process 3 companies at a time
  const BATCH_SIZE = 3;
  for (let i = 0; i < COMPANIES.length; i += BATCH_SIZE) {
    const batch = COMPANIES.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (company) => {
        try {
          if (onProgress) onProgress(company.name);
          const articles = await fetchNewsForCompany(company.name);
          if (articles.length > 0) {
            const stored = await storeArticles(articles);
            console.log(`  ✓ ${company.name}: ${articles.length} found, ${stored} new`);
            return stored;
          } else {
            console.log(`  - ${company.name}: no articles found`);
            return 0;
          }
        } catch (err) {
          console.error(`  ✗ ${company.name}: ${err.message}`);
          if (onError) onError(company.name, err.message);
          return 0;
        }
      })
    );

    totalStored += results
      .filter(r => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value, 0);

    if (i + BATCH_SIZE < COMPANIES.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Aggregator] Done in ${duration}s. Total new articles stored: ${totalStored}`);
  return totalStored;
}

// --- Query Layer ---
async function getNews(filters = {}) {
  let sql = 'SELECT * FROM news WHERE 1=1';
  const params = [];

  if (filters.companies && filters.companies.length > 0) {
    const placeholders = filters.companies.map(() => '?').join(',');
    sql += ` AND company IN (${placeholders})`;
    params.push(...filters.companies);
  } else if (filters.company) {
    sql += ' AND company = ?';
    params.push(filters.company);
  }

  // Time filter: compare ISO strings directly (both stored and input are ISO 8601)
  if (filters.startDate) {
    const startISO = normalizeToISO(filters.startDate);
    sql += ' AND publishedAt >= ?';
    params.push(startISO);
  }

  if (filters.endDate) {
    const endISO = normalizeToISO(filters.endDate);
    sql += ' AND publishedAt <= ?';
    params.push(endISO);
  }

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.source) {
    // Support source category filtering
    if (filters.source === 'Major Media') {
      sql += ` AND (source LIKE '%Reuters%' OR source LIKE '%AP%' OR source LIKE '%BBC%' OR source LIKE '%CNBC%' OR source LIKE '%CNN%' OR source LIKE '%Guardian%')`;
    } else if (filters.source === 'Financial') {
      sql += ` AND (source LIKE '%Bloomberg%' OR source LIKE '%Financial Times%' OR source LIKE '%WSJ%' OR source LIKE '%Yahoo Finance%' OR source LIKE '%MarketWatch%' OR source LIKE '%Barron%')`;
    } else if (filters.source === 'Tech & Industry') {
      sql += ` AND (source LIKE '%TechCrunch%' OR source LIKE '%Verge%' OR source LIKE '%Wired%' OR source LIKE '%ZDNet%' OR source LIKE '%Ars Technica%' OR source LIKE '%TechRadar%')`;
    } else {
      sql += ' AND source = ?';
      params.push(filters.source);
    }
  }

  if (filters.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  // Sort support
  if (filters.sort === 'relevance') {
    // Sort by Sinch relevance - articles with messaging/communication keywords first
    sql += ` ORDER BY (
      CASE WHEN (lower(title) LIKE '%messaging%' OR lower(title) LIKE '%communication%' OR lower(title) LIKE '%api%' OR lower(title) LIKE '%notification%' OR lower(title) LIKE '%sms%' OR lower(title) LIKE '%rcs%' OR lower(title) LIKE '%whatsapp%' OR lower(title) LIKE '%chatbot%' OR lower(title) LIKE '%omnichannel%' OR lower(title) LIKE '%cpaas%' OR lower(title) LIKE '%customer engagement%' OR lower(title) LIKE '%digital%' OR lower(title) LIKE '%platform%' OR lower(title) LIKE '%enterprise%') THEN 0 ELSE 1 END
    ), publishedAt DESC`;
  } else {
    sql += ' ORDER BY publishedAt DESC';
  }

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit));
  }

  return query.all(sql, params);
}

async function getNewsCount() {
  const row = await query.get('SELECT COUNT(*) as count FROM news');
  return row ? row.count : 0;
}

function getAvailableCompanies() {
  return COMPANIES.map(c => ({ id: c.id, name: c.name, category: c.category }));
}

async function getSources() {
  const rows = await query.all('SELECT DISTINCT source FROM news ORDER BY source');
  return rows.map(r => r.source);
}

module.exports = {
  aggregateAllNews,
  getNews,
  getNewsCount,
  getAvailableCompanies,
  getSources,
  storeArticles,
  classifyArticle,
  normalizeToISO
};
