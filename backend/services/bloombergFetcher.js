const axios = require('axios');

const BLOOMBERG_API_BASE = 'https://api.bloomberg.com/v1';
const BLOOMBERG_API_KEY = process.env.BLOOMBERG_API_KEY;

if (!BLOOMBERG_API_KEY) console.warn('WARNING: BLOOMBERG_API_KEY not set');

async function fetchFromBloomberg(company, options = {}) {
  if (!BLOOMBERG_API_KEY) return [];
  try {
    const params = {
      query: company,
      limit: options.limit || 20,
      apiKey: BLOOMBERG_API_KEY
    };

    const response = await axios.get(`${BLOOMBERG_API_BASE}/news/search`, {
      params,
      timeout: 10000
    });

    return (response.data.articles || []).map(article => ({
      title: article.headline || article.title,
      description: article.summary || article.description || '',
      url: article.url || '',
      source: 'Bloomberg',
      imageUrl: article.image || article.imageUrl || '',
      publishedAt: article.publishedAt || article.timestamp || new Date().toISOString(),
      author: article.byline || article.author || 'Bloomberg',
      company: company,
      category: 'finance'
    }));
  } catch (error) {
    console.error(`Error fetching from Bloomberg for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchFromBloomberg };
