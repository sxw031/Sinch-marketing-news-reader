const Parser = require('rss-parser');
const axios = require('axios');
const parser = new Parser();

async function fetchFromTechCrunch(company, options = {}) {
  try {
    // Fetch from TechCrunch RSS feed
    const feedUrl = 'https://techcrunch.com/feed/';
    const feed = await parser.parseURL(feedUrl);

    // Filter articles mentioning the company
    const companyLower = company.toLowerCase();
    const filteredArticles = (feed.items || [])
      .filter(item => 
        (item.title && item.title.toLowerCase().includes(companyLower)) ||
        (item.content && item.content.toLowerCase().includes(companyLower))
      )
      .slice(0, options.limit || 20);

    return filteredArticles.map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.summary || '',
      url: item.link || '',
      source: 'TechCrunch',
      imageUrl: item.image?.url || item.thumbnail || '',
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      author: item.author || 'TechCrunch',
      company: company,
      category: 'technology'
    }));
  } catch (error) {
    console.error(`Error fetching from TechCrunch for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchFromTechCrunch };
