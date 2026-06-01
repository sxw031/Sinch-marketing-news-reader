const axios = require('axios');

const X_API_BASE = 'https://api.twitter.com/2';
const X_API_KEY = process.env.X_API_KEY;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

if (!X_API_KEY && !X_BEARER_TOKEN) console.warn('WARNING: X API credentials not set');

async function fetchFromX(company, options = {}) {
  if (!X_BEARER_TOKEN) return [];
  try {
    const params = {
      query: `${company} -is:retweet`,
      max_results: options.limit || 20,
      'tweet.fields': 'created_at,author_id,public_metrics',
      'expansions': 'author_id',
      'user.fields': 'username,name,profile_image_url'
    };

    const response = await axios.get(`${X_API_BASE}/tweets/search/recent`, {
      params,
      headers: {
        'Authorization': `Bearer ${X_BEARER_TOKEN}`,
        'User-Agent': 'MarketFeed/1.0'
      }
    });

    const users = response.data.includes?.users || [];
    const usersMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    return (response.data.data || []).map(tweet => ({
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      description: tweet.text,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
      source: 'X (Twitter)',
      imageUrl: usersMap[tweet.author_id]?.profile_image_url || '',
      publishedAt: tweet.created_at || new Date().toISOString(),
      author: usersMap[tweet.author_id]?.name || 'X User',
      company: company,
      category: 'social'
    }));
  } catch (error) {
    console.error(`Error fetching from X for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchFromX };
