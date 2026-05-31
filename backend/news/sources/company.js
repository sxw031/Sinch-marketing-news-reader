const Parser = require('rss-parser');
const parser = new Parser();

const PRESS_FEEDS = {
  'HSBC': 'https://www.hsbc.com/rss/news.xml',
  'DBS': 'https://www.dbs.com/rss/news.xml',
  'Bank of China': 'https://www.boc.cn/aboutus/news/index.html',
  'Citigroup': 'https://www.citigroup.com/rss/news.xml',
  'Aeon Credit': 'https://www.aeoncredit.com.my/news',
  'Alibaba': 'https://www.alibabagroup.com/en/news',
  'PDD': 'https://www.pinduoduo.com/news',
  'Temu': 'https://www.temu.com/news',
  'ShopBack': 'https://www.shopback.com/blog',
  'Grab': 'https://grab.com/news',
  'Didi': 'https://www.didiglobal.com/news',
  'Gojek': 'https://www.gojek.com/news',
  'Tencent': 'https://www.tencent.com/en-us/news.html',
  'ByteDance': 'https://www.bytedance.com/en/news',
  'Binance': 'https://www.binance.com/en/news',
  'Ctrip': 'https://www.ctrip.com/en/news',
  'Cathay Pacific': 'https://www.cathaypacific.com/cx/en/about-us/news-and-insights/news',
  'VGE': 'https://www.vge.com/news',
  'Charter Bank': 'https://www.charterbank.com/news',
  'Government of Singapore': 'https://www.gov.sg/news',
};
async function fetchCompanyNews({ companies = [], limit = 25 }) {
  let news = [];
  for (const name of companies.length ? companies : Object.keys(PRESS_FEEDS)) {
    if (!PRESS_FEEDS[name]) continue;
    try {
      const feed = await parser.parseURL(PRESS_FEEDS[name]);
      news = news.concat(feed.items.map(item => ({
        title: item.title,
        url: item.link,
        date: item.isoDate || item.pubDate,
        summary: item.contentSnippet,
        source: name,
      })));
    } catch {}
  }
  return news.slice(0, limit);
}
module.exports = { fetchCompanyNews };
