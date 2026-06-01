const Parser = require('rss-parser');
const axios = require('axios');
const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  }
});

async function fetchRSSFeed(feedUrl, company) {
  try {
    console.log(`[RSS] Fetching ${company}: ${feedUrl}`);
    
    // First, do a raw fetch to check the content type and validity
    // This prevents the "Unexpected close tag" error caused by parsing non-XML content
    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'] || '';
    const data = response.data;

    // Basic check if the response is actually XML/RSS
    if (typeof data !== 'string' || (!data.trim().startsWith('<?xml') && !data.trim().startsWith('<rss'))) {
      console.warn(`[RSS Warning] ${company} source is not valid XML. Skipping...`);
      return [];
    }

    const feed = await parser.parseString(data);
    
    return (feed.items || []).map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.summary || '',
      url: item.link || '',
      source: feed.title || 'Official RSS',
      imageUrl: item.enclosure?.url || feed.image?.url || null,
      publishedAt: item.pubDate || new Date().toISOString(),
      author: item.creator || feed.author || '',
      company: company,
      category: 'General'
    })).filter(item => item.url);
  } catch (error) {
    // Soft fail for RSS errors to prevent deployment alerts
    if (error.message.includes('404')) {
      console.warn(`[RSS Warning] 404 Not Found for ${company}: ${feedUrl}`);
    } else if (error.message.includes('Unexpected close tag')) {
      console.warn(`[RSS Warning] Parse error for ${company} (likely HTML instead of XML). Skipping...`);
    } else {
      console.error(`[RSS Error] ${company} (${feedUrl}):`, error.message);
    }
    return [];
  }
}

async function fetchMultipleRSSFeeds(feedUrls, company) {
  try {
    const results = await Promise.allSettled(
      feedUrls.map(url => fetchRSSFeed(url, company))
    );
    
    return results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
  } catch (error) {
    console.error(`[RSS Fatal] Error fetching multiple RSS feeds for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchRSSFeed, fetchMultipleRSSFeeds };
