const Parser = require('rss-parser');
const parser = new Parser();

async function fetchTechCrunchNews(company, options = {}) {
  try {
    console.log(`Fetching TechCrunch RSS for ${company}...`);
    const feedUrl = 'https://techcrunch.com/feed/';
    const feed = await parser.parseURL(feedUrl);

    // Filter articles mentioning the company
    const companyLower = company.toLowerCase();
    let filteredArticles = (feed.items || [])
      .filter(item => 
        (item.title && item.title.toLowerCase().includes(companyLower)) ||
        (item.content && item.content.toLowerCase().includes(companyLower)) ||
        (item.categories && item.categories.some(cat => cat.toLowerCase().includes(companyLower)))
      );

    filteredArticles = filteredArticles.slice(0, options.limit || 15);

    return filteredArticles.map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.summary || '',
      url: item.link || '',
      source: 'TechCrunch',
      imageUrl: item.image?.url || item.thumbnail || '',
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      author: item.author || 'TechCrunch',
      company: company,
      category: 'Technology'
    }));
  } catch (error) {
    console.error(`Error fetching TechCrunch RSS for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchTechCrunchNews };
