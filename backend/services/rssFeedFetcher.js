const Parser = require('rss-parser');
const parser = new Parser();
async function fetchRSSFeed(feedUrl, company) {
  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items || []).map(item => ({ title: item.title || 'Untitled', description: item.contentSnippet || item.summary || '', url: item.link || '', source: feed.title || 'RSS Feed', imageUrl: item.enclosure?.url || feed.image?.url || null, publishedAt: item.pubDate || new Date().toISOString(), author: item.creator || feed.author || '', company: company, category: 'RSS Feed' })).filter(item => item.url);
  } catch (error) {
    console.error(`Error fetching RSS feed ${feedUrl}:`, error.message);
    return [];
  }
}
async function fetchMultipleRSSFeeds(feedUrls, company) {
  try {
    const results = await Promise.allSettled(feedUrls.map(url => fetchRSSFeed(url, company)));
    return results.filter(result => result.status === 'fulfilled').flatMap(result => result.value);
  } catch (error) {
    console.error(`Error fetching multiple RSS feeds for ${company}:`, error.message);
    return [];
  }
}
module.exports = { fetchRSSFeed, fetchMultipleRSSFeeds };
