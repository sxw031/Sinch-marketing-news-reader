const { db_helpers } = require('../models/db');
const { fetchFromNewsAPI } = require('./newsApi');
const { fetchMultipleRSSFeeds } = require('./rssFeedFetcher');
const { COMPANIES } = require('../config/sources');
const moment = require('moment');
async function fetchNewsForCompany(company) {
  const companyConfig = COMPANIES.find(c => c.name.toLowerCase() === company.toLowerCase());
  if (!companyConfig) return [];
  let allNews = [];
  for (const source of companyConfig.sources) {
    try {
      if (source.type === 'newsapi') {
        const news = await fetchFromNewsAPI(company, { limit: 20 });
        allNews = allNews.concat(news);
      } else if (source.type === 'rss') {
        const news = await fetchMultipleRSSFeeds([source.url], company);
        allNews = allNews.concat(news);
      }
    } catch (error) {
      console.error(`Error fetching from ${source.type} for ${company}:`, error.message);
    }
  }
  return allNews;
}
async function aggregateAllNews() {
  console.log('Starting news aggregation...');
  const startTime = new Date();
  for (const company of COMPANIES) {
    try {
      console.log(`Fetching news for ${company.name}...`);
      const news = await fetchNewsForCompany(company.name);
      if (news.length > 0) {
        await storeNews(news, company.name);
        console.log(`Stored ${news.length} articles for ${company.name}`);
      }
    } catch (error) {
      console.error(`Error aggregating news for ${company.name}:`, error.message);
    }
  }
  const duration = new Date() - startTime;
  console.log(`Aggregation completed in ${duration}ms`);
}
async function storeNews(articles, company) {
  for (const article of articles) {
    try {
      const existing = await db_helpers.get('SELECT id FROM news WHERE title = ? AND company = ?', [article.title, company]);
      if (!existing) {
        await db_helpers.run(`INSERT INTO news (company, title, description, url, source, imageUrl, category, publishedAt, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [article.company, article.title, article.description, article.url, article.source, article.imageUrl, article.category, article.publishedAt, article.author]);
      }
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) console.error('Error storing article:', error.message);
    }
  }
}
async function getNews(filters = {}) {
  let sql = 'SELECT * FROM news WHERE 1=1';
  const params = [];
  if (filters.company) { sql += ' AND company = ?'; params.push(filters.company); }
  if (filters.companies && Array.isArray(filters.companies) && filters.companies.length > 0) { sql += ` AND company IN (${filters.companies.map(() => '?').join(',')})`; params.push(...filters.companies); }
  if (filters.startDate) { sql += ' AND publishedAt >= ?'; params.push(filters.startDate); }
  if (filters.endDate) { sql += ' AND publishedAt <= ?'; params.push(filters.endDate); }
  if (filters.category) { sql += ' AND category = ?'; params.push(filters.category); }
  if (filters.search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; const searchTerm = `%${filters.search}%`; params.push(searchTerm, searchTerm); }
  sql += ' ORDER BY publishedAt DESC';
  if (filters.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }
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
module.exports = { fetchNewsForCompany, aggregateAllNews, storeNews, getNews, getAvailableCompanies, cleanupOldNews };
