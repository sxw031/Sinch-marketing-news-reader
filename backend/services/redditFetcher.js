const axios = require('axios');

const REDDIT_API_BASE = 'https://oauth.reddit.com';
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
  console.warn('WARNING: Reddit API credentials not set');
}

let redditAccessToken = null;
let tokenExpiry = 0;

async function getRedditAccessToken() {
  try {
    if (redditAccessToken && tokenExpiry > Date.now()) {
      return redditAccessToken;
    }

    const response = await axios.post('https://www.reddit.com/api/v1/access_token', 
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: REDDIT_CLIENT_ID,
          password: REDDIT_CLIENT_SECRET
        },
        headers: { 'User-Agent': 'MarketFeed/1.0' }
      }
    );

    redditAccessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    return redditAccessToken;
  } catch (error) {
    console.error('Error getting Reddit access token:', error.message);
    return null;
  }
}

async function fetchFromReddit(company, options = {}) {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) return [];
  
  try {
    const accessToken = await getRedditAccessToken();
    if (!accessToken) return [];

    const params = {
      q: company,
      limit: options.limit || 20,
      sort: 'new',
      t: 'month'
    };

    const response = await axios.get(`${REDDIT_API_BASE}/r/all/search`, {
      params,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'MarketFeed/1.0'
      }
    });

    return (response.data.data?.children || []).map(post => ({
      title: post.data.title,
      description: post.data.selftext || post.data.summary || '',
      url: `https://reddit.com${post.data.permalink}`,
      source: 'Reddit',
      imageUrl: post.data.thumbnail && post.data.thumbnail !== 'self' ? post.data.thumbnail : '',
      publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
      author: post.data.author,
      company: company,
      category: 'discussion'
    }));
  } catch (error) {
    console.error(`Error fetching from Reddit for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchFromReddit };
