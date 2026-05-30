const axios = require('axios');
const moment = require('moment');
const NEWS_API_BASE = 'https://newsapi.org/v2';
const NEWS_API_KEY = process.env.NEWSAPI_KEY;
if (!NEWS_API_KEY) console.warn('WARNING: NEWSAPI_KEY not set');
async function fetchFromNewsAPI(company, options = {}) {
  if (!NEWS_API_KEY) return [];
  try {
    const params = { q: company, sortBy: options.sortBy || 'publishedAt', language: 'en', pageSize: options.limit || 20, apiKey: NEWS_API_KEY };
    if (options.from) params.from = moment(options.from).format('YYYY-MM-DD');
    const response = await axios.get(`${NEWS_API_BASE}/everything`, { params });
    return response.data.articles.map(article => ({
      title: article.title, description: article.description, url: article.url, source: article.source.name, imageUrl: article.urlToImage, publishedAt: article.publishedAt, author: article.author, company: company, category: 'News'
    }));
  } catch (error) {
    console.error(`Error fetching from NewsAPI for ${company}:`, error.message);
    return [];
  }
}
async function fetchTopHeadlines(company, options = {}) {
  if (!NEWS_API_KEY) return [];
  try {
    const params = { q: company, language: 'en', pageSize: options.limit || 10, apiKey: NEWS_API_KEY };
    const response = await axios.get(`${NEWS_API_BASE}/top-headlines`, { params });
    return response.data.articles.map(article => ({ title: article.title, description: article.description, url: article.url, source: article.source.name, imageUrl: article.urlToImage, publishedAt: article.publishedAt, author: article.author, company: company, category: 'Top Headlines' }));
  } catch (error) {
    console.error(`Error fetching top headlines for ${company}:`, error.message);
    return [];
  }
}
module.exports = { fetchFromNewsAPI, fetchTopHeadlines };
