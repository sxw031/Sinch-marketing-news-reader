const COMPANIES = [
  {
    id: 'hsbc',
    name: 'HSBC',
    domain: 'hsbc.com',
    category: 'Finance',
    website: {
      url: 'https://www.hsbc.com/news-and-media/media-releases',
      selectors: {
        container: 'article, .news-item, .card',
        title: 'h2, h3, .title',
        description: 'p.summary, .description',
        link: 'a',
        date: 'time, .date'
      }
    }
  },
  {
    id: 'grab',
    name: 'Grab',
    domain: 'grab.com',
    category: 'Technology',
    website: {
      url: 'https://www.grab.com/sg/press/',
      selectors: {
        container: 'article, .press-release',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    }
  },
  {
    id: 'vodafone',
    name: 'Vodafone',
    domain: 'vodafone.com',
    category: 'Technology',
    website: {
      url: 'https://www.vodafone.com/news',
      selectors: {
        container: 'article, .news-item',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    }
  },
  {
    id: 'cathay',
    name: 'Cathay Pacific',
    domain: 'cathaypacific.com',
    category: 'Aviation',
    website: {
      url: 'https://news.cathaypacific.com/',
      selectors: {
        container: '.press-item, article, .news-card',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    domain: 'alibabagroup.com',
    category: 'Marketing',
    website: {
      url: 'https://www.alizila.com/',
      selectors: {
        container: '.post, article',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'standard-chartered',
    name: 'Standard Chartered',
    domain: 'sc.com',
    category: 'Finance',
    website: {
      url: 'https://www.sc.com/en/media/',
      selectors: {
        container: 'article, .news-item',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    }
  },
  {
    id: 'temu',
    name: 'Temu',
    domain: 'temu.com',
    category: 'Marketing',
    website: {
      url: 'https://www.temu.com/news.html',
      selectors: {
        container: 'article, .news-item',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: 'time, .date'
      }
    }
  },
  {
    id: 'ctrip',
    name: 'Ctrip',
    domain: 'trip.com',
    category: 'General',
    website: {
      url: 'https://ir.trip.com/news-releases',
      selectors: {
        container: '.news-release, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'didi',
    name: 'Didi',
    domain: 'didiglobal.com',
    category: 'Technology',
    website: {
      url: 'https://www.didiglobal.com/news',
      selectors: {
        container: 'article, .news-item',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'dbs',
    name: 'DBS',
    domain: 'dbs.com',
    category: 'Finance',
    website: {
      url: 'https://www.dbs.com/newsroom/default.page',
      selectors: {
        container: 'article, .news-item',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'tencent',
    name: 'Tencent',
    domain: 'tencent.com',
    category: 'Technology',
    website: {
      url: 'https://www.tencent.com/en-us/media.html',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'bankofchina',
    name: 'Bank of China',
    domain: 'boc.cn',
    category: 'Finance',
    website: {
      url: 'https://www.boc.cn/en/aboutboc/ab1/index.html',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'bytedance',
    name: 'ByteDance',
    domain: 'bytedance.com',
    category: 'Technology',
    website: {
      url: 'https://www.bytedance.com/en/news',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'gojek',
    name: 'Gojek',
    domain: 'gojek.com',
    category: 'Technology',
    website: {
      url: 'https://www.gojek.com/en-id/news/',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'citigroup',
    name: 'Citigroup',
    domain: 'citigroup.com',
    category: 'Finance',
    website: {
      url: 'https://www.citigroup.com/global/news/press-releases',
      selectors: {
        container: 'article, .press-release',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'binance',
    name: 'Binance',
    domain: 'binance.com',
    category: 'Finance',
    website: {
      url: 'https://www.binance.com/en/blog/news',
      selectors: {
        container: 'article, .blog-item',
        title: 'h2, h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'shopback',
    name: 'ShopBack',
    domain: 'shopback.com',
    category: 'Marketing',
    website: {
      url: 'https://corporate.shopback.com/news',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  },
  {
    id: 'aeoncredit',
    name: 'Aeon Credit',
    domain: 'aeoncredit.com.my',
    category: 'Finance',
    website: {
      url: 'https://www.aeoncredit.com.my/news-announcements',
      selectors: {
        container: '.news-item, article',
        title: 'h3, .title',
        description: 'p',
        link: 'a',
        date: '.date'
      }
    }
  }
];

module.exports = { COMPANIES };
