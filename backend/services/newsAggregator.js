const { db, query } = require('../models/db');
const { fetchNewsForCompany } = require('./webSearch');
const { COMPANIES } = require('../config/sources');

// --- Category Classification ---
const CATEGORY_RULES = [
  { category: 'Strategic Insights', keywords: ['partnership', 'collaboration', 'expand', 'growth', 'acquisition', 'merger', 'ceo', 'executive', 'revenue', 'profit', 'earnings', 'strategy', 'invest', 'funding', 'launch', 'hiring', 'layoff', 'rebrand', 'contract', 'deal', 'agreement'] },
  { category: 'Finance', keywords: ['stock', 'ipo', 'bank', 'fintech', 'payment', 'loan', 'credit', 'interest rate', 'equity', 'dividend'] },
  { category: 'Marketing', keywords: ['campaign', 'brand', 'marketing', 'social media', 'engagement', 'promotion', 'advertising'] },
  { category: 'Technology', keywords: ['ai', 'artificial intelligence', 'cloud', 'software', 'app', 'cybersecurity', 'data', 'platform', 'machine learning'] }
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
        const publishedAt = a.publishedAt
          ? new Date(a.publishedAt).toISOString().replace('T', ' ').replace('Z', '').split('.')[0]
          : new Date().toISOString().replace('T', ' ').replace('Z', '').split('.')[0];

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

// --- Aggregation Engine ---
async function aggregateAllNews(options = {}) {
  const { onProgress, onError } = options;
  const startTime = Date.now();
  let totalStored = 0;

  console.log(`[Aggregator] Starting sync for ${COMPANIES.length} companies...`);

  // Process 3 companies at a time for speed without overwhelming resources
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

    // Brief pause between batches
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
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  sql += ' ORDER BY publishedAt DESC';

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
  return COMPANIES.map(c => ({ id: c.id, name: c.name, category: c.category, logoUrl: c.logoUrl }));
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
  classifyArticle
};
