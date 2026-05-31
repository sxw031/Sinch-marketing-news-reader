const Parser = require('rss-parser');
const parser = new Parser();

// Pulls latest Reddit posts from r/business, r/marketing, r/finance, and top company subreddits
async function fetchRedditNews({ companies = [], limit = 25 }) {
  const feeds = [
    'https://www.reddit.com/r/business/.rss',
    'https://www.reddit.com/r/marketing/.rss',
    'https://www.reddit.com/r/finance/.rss',
  ];
  for (const company of companies) {
    feeds.push(`https://www.reddit.com/r/${company.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}/.rss`);
  }
  let results = [];
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      results = results.concat(feed.items.map(item => ({
        title: item.title,
        url: item.link,
        date: item.isoDate || item.pubDate,
        summary: item.contentSnippet,
        source: 'Reddit',
        subreddit: url.split('/')[4],
      })));
    } catch {}
  }
  return results.slice(0, limit);
}
module.exports = { fetchRedditNews };
