const COMPANIES = [
  {
    id: 'hsbc',
    name: 'HSBC',
    category: 'Banking & Finance',
    website: {
      url: 'https://www.hsbc.com/news',
      selectors: {
        container: 'article.news-item, div.news-card',
        title: 'h3, .news-title, a.news-link',
        description: 'p.summary, .news-description',
        link: 'a.news-link, a[href*="/news/"]',
        date: 'time, .news-date, .published-date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.hsbc.com/news-and-media/media-releases?rss=1'}]
  },
  {
    id: 'grab',
    name: 'Grab',
    category: 'Super App',
    website: {
      url: 'https://www.grab.com/press/',
      selectors: {
        container: 'article, div.press-release',
        title: 'h2, h3, .title',
        description: 'p, .description',
        link: 'a[href*="/press/"], a',
        date: 'time, .date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.grab.com/sg/press/feed/'}]
  },
  {
    id: 'vodafone',
    name: 'Vodafone',
    category: 'Telecommunications',
    website: {
      url: 'https://www.vodafone.com/news',
      selectors: {
        container: 'article, div.news-item',
        title: 'h2, h3, a',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.vodafone.com/news/feed'}]
  },
  {
    id: 'cathay',
    name: 'Cathay Pacific',
    category: 'Airlines',
    website: {
      url: 'https://www.cathaypacific.com/cx/en/about-us/press-release.html',
      selectors: {
        container: 'article, div.press-item',
        title: 'h3, a.news-link',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    },
    sources: []
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    category: 'E-commerce',
    website: {
      url: 'https://www.alibabagroup.com/en/news',
      selectors: {
        container: 'div.news-item, article',
        title: 'h3, a.title',
        description: 'p.summary',
        link: 'a.title, a[href*="/news/"]',
        date: 'span.date, time'
      }
    },
    sources: []
  },
  {
    id: 'standard-chartered',
    name: 'Standard Chartered',
    category: 'Banking',
    website: {
      url: 'https://www.sc.com/en/news-and-media/',
      selectors: {
        container: 'article, div.news-item',
        title: 'h2, h3, a',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.sc.com/en/feed/'}]
  },
  {
    id: 'temu',
    name: 'Temu',
    category: 'E-commerce',
    website: null,
    sources: []
  },
  {
    id: 'ctrip',
    name: 'Ctrip',
    category: 'Travel',
    website: {
      url: 'https://ir.ctrip.com/news-releases',
      selectors: {
        container: 'div.release, article.news-item',
        title: 'h3, a.title',
        description: 'p',
        link: 'a.title, a[href*="/news/"]',
        date: 'time, .date, span.date'
      }
    },
    sources: []
  },
  {
    id: 'didi',
    name: 'Didi',
    category: 'Ride-hailing',
    website: null,
    sources: []
  },
  {
    id: 'pdd',
    name: 'PDD',
    category: 'E-commerce',
    website: null,
    sources: []
  },
  {
    id: 'dbs',
    name: 'DBS',
    category: 'Banking',
    website: {
      url: 'https://www.dbs.com/newsroom',
      selectors: {
        container: 'article, div.news-item',
        title: 'h3, a.news-title',
        description: 'p.summary, p',
        link: 'a.news-link, a[href*="/newsroom/"]',
        date: 'time, .date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.dbs.com/newsroom/default.page?rss=1'}]
  },
  {
    id: 'tencent',
    name: 'Tencent',
    category: 'Technology',
    website: {
      url: 'https://www.tencent.com/en-us/news.html',
      selectors: {
        container: 'div.news-item, li.list-item',
        title: 'h3, a, span.title',
        description: 'p',
        link: 'a',
        date: 'span.date, time'
      }
    },
    sources: []
  },
  {
    id: 'bankofchina',
    name: 'Bank of China',
    category: 'Banking',
    website: {
      url: 'https://www.boc.cn/en/index.html',
      selectors: {
        container: 'div.news-item',
        title: 'h3, a',
        description: 'p',
        link: 'a',
        date: 'span.date'
      }
    },
    sources: []
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    category: 'Technology',
    website: null,
    sources: []
  },
  {
    id: 'gojek',
    name: 'Gojek',
    category: 'Super App',
    website: null,
    sources: []
  },
  {
    id: 'citigroup',
    name: 'Citigroup',
    category: 'Banking',
    website: {
      url: 'https://www.citigroup.com/citi/news',
      selectors: {
        container: 'article, div.news-item',
        title: 'h2, h3, a.title',
        description: 'p.description, p',
        link: 'a[href*="/news/"], a.title',
        date: 'time, span.date'
      }
    },
    sources: []
  },
  {
    id: 'gov-singapore',
    name: 'Government of Singapore',
    category: 'Government',
    website: {
      url: 'https://www.gov.sg/news',
      selectors: {
        container: 'article, div.news-item',
        title: 'h3, a.title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    },
    sources: [{type: 'rss', url: 'https://www.gov.sg/rss'}]
  },
  {
    id: 'binance',
    name: 'Binance',
    category: 'Cryptocurrency',
    website: null,
    sources: []
  },
  {
    id: 'shopback',
    name: 'ShopBack',
    category: 'Fintech',
    website: null,
    sources: []
  },
  {
    id: 'aeoncredit',
    name: 'Aeon Credit',
    category: 'Financial Services',
    website: null,
    sources: []
  }
];

module.exports = { COMPANIES };
