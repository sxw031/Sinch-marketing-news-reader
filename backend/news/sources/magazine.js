const Parser = require('rss-parser');
const parser = new Parser();

const BUSINESS_FEEDS = [
  'https://www.forbes.com/business/feed/',
  'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
  'https://www.reuters.com/rssFeed/businessNews',
  'https://www.bloomberg.com/feed/podcast/businessweek',
  'https://www.cnbc.com/id/100727362/device/rss/rss.html',
];
async function fetchMagazineNews({ limit = 25 }) {
  let news = [];
  for (const feedUrl of BUSINESS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      news = news.concat(feed.items.map(item => ({
        title: item.title,
        url: item.link,
        date: item.isoDate || item.pubDate,
        summary: item.contentSnippet,
        source: feedUrl.split('/')[2],
      })));
    } catch {}
  }
  return news.slice(0, limit);
}
module.exports = { fetchMagazineNews };
