const axios = require('axios');
const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
});

// --- Login-wall domains to filter out ---
const LOGIN_WALL_DOMAINS = [
  'linkedin.com/pulse', 'linkedin.com/posts',
  'ft.com', 'wsj.com', 'bloomberg.com/news',
  'economist.com', 'hbr.org',
  'seekingalpha.com', 'barrons.com',
  'nytimes.com', 'washingtonpost.com',
  'paywallninja.com'
];

function isLoginWall(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return LOGIN_WALL_DOMAINS.some(domain => lower.includes(domain));
}

// --- Source categorization for cleaner display ---
const SOURCE_CATEGORIES = {
  'Reuters': 'Major Media',
  'AP News': 'Major Media',
  'BBC': 'Major Media',
  'CNBC': 'Major Media',
  'CNN': 'Major Media',
  'Bloomberg': 'Financial',
  'Financial Times': 'Financial',
  'The Wall Street Journal': 'Financial',
  'Yahoo Finance': 'Financial',
  'MarketWatch': 'Financial',
  'TechCrunch': 'Tech & Industry',
  'The Verge': 'Tech & Industry',
  'Wired': 'Tech & Industry',
  'Ars Technica': 'Tech & Industry',
  'ZDNet': 'Tech & Industry',
  'LinkedIn': 'Professional',
  'Official Website': 'Official'
};

function categorizeSource(source) {
  if (!source) return 'Other';
  for (const [name, category] of Object.entries(SOURCE_CATEGORIES)) {
    if (source.toLowerCase().includes(name.toLowerCase())) return category;
  }
  return 'News';
}

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
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => !isLoginWall(item.link))
      .map(item => {
        const titleParts = (item.title || '').split(' - ');
        const source = titleParts.length > 1 ? titleParts.pop().trim() : 'Google News';
        const title = titleParts.join(' - ').trim();

        return {
          title: title || item.title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source,
          sourceCategory: categorizeSource(source),
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
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => !isLoginWall(item.link))
      .map(item => ({
        title: item.title || 'Untitled',
        description: item.contentSnippet || item.content || '',
        url: item.link || '',
        source: item.creator || 'Bing News',
        sourceCategory: categorizeSource(item.creator || 'Bing News'),
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
  // Search for LinkedIn articles about the company but filter out login-required posts
  const query = encodeURIComponent(`"${company}" site:linkedin.com/news OR site:linkedin.com/business`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  try {
    console.log(`[LinkedIn] Fetching: ${company}`);
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const feed = await parser.parseString(response.data);
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => {
        // Only keep LinkedIn articles that don't require login
        const url = (item.link || '').toLowerCase();
        return !url.includes('/pulse/') && !url.includes('/posts/');
      })
      .map(item => {
        const titleParts = (item.title || '').split(' - ');
        titleParts.pop();
        const title = titleParts.join(' - ').trim() || item.title;

        return {
          title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source: 'LinkedIn',
          sourceCategory: 'Professional',
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

// --- Source 4: Official Website News (via Google search for news/blog/resources pages) ---
const COMPANY_DOMAINS = {
  'HSBC': 'hsbc.com/news',
  'Grab': 'grab.com/press OR grab.com/blog',
  'Vodafone': 'vodafone.com/news',
  'Cathay Pacific': 'cathaypacific.com OR news.cathaypacific.com',
  'Alibaba': 'alizila.com',
  'Standard Chartered': 'sc.com/en/media',
  'Temu': 'temu.com',
  'Ctrip': 'trip.com/newsroom OR trip.com/blog',
  'Didi': 'didiglobal.com/news OR didiglobal.com/blog',
  'DBS': 'dbs.com/newsroom',
  'Tencent': 'tencent.com/en-us/media',
  'Bank of China': 'boc.cn/en/aboutboc',
  'ByteDance': 'bytedance.com/en/news',
  'Gojek': 'gojek.com/blog OR gotocompany.com/news',
  'Citigroup': 'citigroup.com/global/news',
  'Binance': 'binance.com/en/blog',
  'ShopBack': 'shopback.com/blog OR corporate.shopback.com',
  'Aeon Credit': 'aeoncredit.com.my/news'
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
    const articles = (feed.items || []).slice(0, limit)
      .filter(item => !isLoginWall(item.link))
      .map(item => {
        const titleParts = (item.title || '').split(' - ');
        titleParts.pop();
        const title = titleParts.join(' - ').trim() || item.title;

        return {
          title,
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          source: 'Official Website',
          sourceCategory: 'Official',
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

module.exports = { fetchNewsForCompany, fetchGoogleNewsRSS, fetchBingNewsRSS, fetchLinkedInNews, fetchOfficialWebsiteNews, categorizeSource };
