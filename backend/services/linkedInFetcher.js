const axios = require('axios');
const moment = require('moment');

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY;

if (!LINKEDIN_API_KEY) console.warn('WARNING: LINKEDIN_API_KEY not set');

async function fetchFromLinkedIn(company, options = {}) {
  if (!LINKEDIN_API_KEY) return [];
  try {
    const params = {
      keywords: company,
      sort: 'date',
      count: options.limit || 20
    };

    const response = await axios.get(`${LINKEDIN_API_BASE}/search`, {
      params,
      headers: {
        'Authorization': `Bearer ${LINKEDIN_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    return (response.data.elements || []).map(article => ({
      title: article.headline || article.name,
      description: article.summary || article.description || '',
      url: article.trackingUrl || article.url || '',
      source: 'LinkedIn',
      imageUrl: article.image?.url || article.thumbnail || '',
      publishedAt: article.createdTime ? new Date(article.createdTime).toISOString() : new Date().toISOString(),
      author: article.publisher?.name || article.actor?.name || 'LinkedIn User',
      company: company,
      category: 'company'
    }));
  } catch (error) {
    console.error(`Error fetching from LinkedIn for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchFromLinkedIn };
