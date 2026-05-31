// X (Twitter) scraping using Nitter RSS proxy
const Parser = require('rss-parser');
const parser = new Parser();

const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.moomoo.me',
  'https://nitter.pufe.org',
];
async function fetchXNews({ companies = [], limit = 25 }) {
  let results = [];
  const feeds = companies.map(c => `${NITTER_INSTANCES[0]}/${c.replace(/\s|,|\/|\./g, '')}/rss`);
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      results = results.concat(feed.items.map(item => ({
        title: item.title,
        url: item.link,
        date: item.isoDate || item.pubDate,
        summary: item.contentSnippet,
        source: 'X',
      })));
    } catch {}
  }
  return results.slice(0, limit);
}
module.exports = { fetchXNews };
