const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

async function fetchRSSFeed(feedUrl, company) {
  try {
    console.log(`[RSS] Fetching ${company}: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);
    
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
    // Soft fail for RSS errors
    if (error.message.includes('404')) {
      console.warn(`[RSS Warning] 404 Not Found for ${company}: ${feedUrl}`);
    } else {
      console.error(`[RSS Error] ${company} (${feedUrl}):`, error.message);
    }
    return [];
  }
}

async function fetchMultipleRSSFeeds(feedUrls, company) {
  try {
    // Promise.allSettled ensures one failed feed doesn't stop others
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
