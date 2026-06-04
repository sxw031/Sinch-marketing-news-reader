const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});

// --- Source 1: Google News RSS (Primary, most reliable) ---
async function fetchGoogleNewsRSS(company, options = {}) {
  const limit = options.limit || 10;
  const query = encodeURIComponent(`"${company}" when:1d`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[Google News] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => {
      const titleParts = (item.title || '').split(' - ');
      const source = titleParts.length > 1 ? titleParts.pop().trim() : 'Google News';
      const title = titleParts.join(' - ').trim();

      return {
        title: title || item.title,
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source,
        company,
        category: 'General',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      };
    });

    console.log(`[Google News] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Google News] ${company} failed:`, error.message);
    return [];
  }
}

// --- Source 2: Bing News RSS (Fallback) ---
async function fetchBingNewsRSS(company, options = {}) {
  const limit = options.limit || 8;
  const query = encodeURIComponent(company);
  const url = `https://www.bing.com/news/search?q=${query}&format=rss&count=${limit}`;

  try {
    console.log(`[Bing RSS] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.content || '',
      url: item.link || '',
      source: item.creator || 'Bing News',
      company,
      category: 'General',
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
    }));

    console.log(`[Bing RSS] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Bing RSS] ${company} failed:`, error.message);
    return [];
  }
}

// --- Source 3: LinkedIn News (via Google News RSS search) ---
async function fetchLinkedInNews(company, options = {}) {
  const limit = options.limit || 5;
  const query = encodeURIComponent(`"${company}" site:linkedin.com`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[LinkedIn] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => {
      const titleParts = (item.title || '').split(' - ');
      titleParts.pop(); // Remove source suffix
      const title = titleParts.join(' - ').trim() || item.title;

      return {
        title,
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source: 'LinkedIn',
        company,
        category: 'General',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      };
    });

    console.log(`[LinkedIn] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[LinkedIn] ${company} failed:`, error.message);
    return [];
  }
}

// --- Source 4: Official Website News (via Google News RSS search) ---
const COMPANY_DOMAINS = {
  'HSBC': 'hsbc.com',
  'Grab': 'grab.com',
  'Vodafone': 'vodafone.com',
  'Cathay Pacific': 'cathaypacific.com',
  'Alibaba': 'alibaba.com OR alizila.com',
  'Standard Chartered': 'sc.com',
  'Temu': 'temu.com',
  'Ctrip': 'trip.com',
  'Didi': 'didiglobal.com',
  'DBS': 'dbs.com',
  'Tencent': 'tencent.com',
  'Bank of China': 'boc.cn',
  'ByteDance': 'bytedance.com',
  'Gojek': 'gojek.com',
  'Citigroup': 'citigroup.com',
  'Binance': 'binance.com',
  'ShopBack': 'shopback.com',
  'Aeon Credit': 'aeoncredit.com.my'
};

async function fetchOfficialWebsiteNews(company, options = {}) {
  const domain = COMPANY_DOMAINS[company];
  if (!domain) return [];

  const limit = options.limit || 5;
  const query = encodeURIComponent(`"${company}" site:${domain}`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[Official] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit).map(item => {
      const titleParts = (item.title || '').split(' - ');
      titleParts.pop();
      const title = titleParts.join(' - ').trim() || item.title;

      return {
        title,
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source: 'Official Website',
        company,
        category: 'General',
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      };
    });

    console.log(`[Official] ${company}: found ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[Official] ${company} failed:`, error.message);
    return [];
  }
}

// --- Main Fetch Function ---
async function fetchNewsForCompany(company) {
  // Run all 4 sources in parallel with a 15s global timeout
  const timeout = new Promise(resolve => setTimeout(() => resolve([]), 15000));

  const [google, bing, linkedin, official] = await Promise.all([
    Promise.race([fetchGoogleNewsRSS(company, { limit: 10 }), timeout]),
    Promise.race([fetchBingNewsRSS(company, { limit: 5 }), timeout]),
    Promise.race([fetchLinkedInNews(company, { limit: 3 }), timeout]),
    Promise.race([fetchOfficialWebsiteNews(company, { limit: 3 }), timeout])
  ]);

  // Merge and deduplicate by title similarity
  const all = [...(google || []), ...(bing || []), ...(linkedin || []), ...(official || [])];
  const seen = new Set();
  const unique = all.filter(a => {
    const key = a.title.toLowerCase().substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}

module.exports = { fetchNewsForCompany, fetchGoogleNewsRSS, fetchBingNewsRSS, fetchLinkedInNews, fetchOfficialWebsiteNews };
