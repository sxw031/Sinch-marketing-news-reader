const COMPANIES = [
  {id: 'hsbc', name: 'HSBC', category: 'Banking & Finance', sources: [{type: 'newsapi', query: 'HSBC bank news'}, {type: 'rss', url: 'https://www.hsbc.com/rss/news.xml'}]},
  {id: 'grab', name: 'Grab', category: 'Super App', sources: [{type: 'newsapi', query: 'Grab Southeast Asia app news'}, {type: 'rss', url: 'https://grab.com/feed/'}]},
  {id: 'vge', name: 'VGE', category: 'Energy', sources: [{type: 'newsapi', query: 'VGE energy company news'}]},
  {id: 'cathay', name: 'Cathay Pacific', category: 'Airlines', sources: [{type: 'newsapi', query: 'Cathay Pacific airline news'}, {type: 'rss', url: 'https://www.cathaypacific.com/news/rss'}]},
  {id: 'alibaba', name: 'Alibaba', category: 'E-commerce', sources: [{type: 'newsapi', query: 'Alibaba e-commerce technology news'}, {type: 'rss', url: 'https://www.alibaba.com/feed'}]},
  {id: 'charter', name: 'Charter Bank', category: 'Banking', sources: [{type: 'newsapi', query: 'Charter Bank digital banking news'}]},
  {id: 'temu', name: 'Temu', category: 'E-commerce', sources: [{type: 'newsapi', query: 'Temu e-commerce shopping app news'}]},
  {id: 'ctrip', name: 'Ctrip', category: 'Travel', sources: [{type: 'newsapi', query: 'Ctrip travel booking hospitality news'}, {type: 'rss', url: 'https://www.ctrip.com/feed'}]},
  {id: 'didi', name: 'Didi', category: 'Ride-hailing', sources: [{type: 'newsapi', query: 'Didi ride-hailing mobility news'}]},
  {id: 'pdd', name: 'PDD', category: 'E-commerce', sources: [{type: 'newsapi', query: 'PDD Holdings e-commerce news'}]},
  {id: 'dbs', name: 'DBS', category: 'Banking', sources: [{type: 'newsapi', query: 'DBS bank Singapore financial news'}, {type: 'rss', url: 'https://www.dbs.com/rss/news.xml'}]},
  {id: 'tencent', name: 'Tencent', category: 'Technology', sources: [{type: 'newsapi', query: 'Tencent technology gaming news'}]},
  {id: 'bankofchina', name: 'Bank of China', category: 'Banking', sources: [{type: 'newsapi', query: 'Bank of China BOC financial services news'}]},
  {id: 'bytedance', name: 'ByteDance', category: 'Technology', sources: [{type: 'newsapi', query: 'ByteDance technology media TikTok news'}]},
  {id: 'gojek', name: 'Gojek', category: 'Super App', sources: [{type: 'newsapi', query: 'Gojek Southeast Asia app news'}]},
  {id: 'citigroup', name: 'Citigroup', category: 'Banking', sources: [{type: 'newsapi', query: 'Citigroup financial services banking news'}, {type: 'rss', url: 'https://www.citigroup.com/rss/news.xml'}]},
  {id: 'gov-singapore', name: 'Government of Singapore', category: 'Government', sources: [{type: 'newsapi', query: 'Singapore government policy news'}, {type: 'rss', url: 'https://www.gov.sg/rss'}]},
  {id: 'binance', name: 'Binance', category: 'Cryptocurrency', sources: [{type: 'newsapi', query: 'Binance cryptocurrency blockchain news'}, {type: 'rss', url: 'https://www.binance.com/en/feed'}]},
  {id: 'shopback', name: 'ShopBack', category: 'Fintech', sources: [{type: 'newsapi', query: 'ShopBack cashback rewards shopping news'}]},
  {id: 'aeoncredit', name: 'Aeon Credit', category: 'Financial Services', sources: [{type: 'newsapi', query: 'Aeon Credit financial services news'}]}
];
module.exports = { COMPANIES };
