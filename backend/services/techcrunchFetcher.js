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

    // If no specific company news, take the most recent general tech news as fallback 
    // but mark them clearly or limit them
    if (filteredArticles.length === 0) {
      console.log(`No direct TechCrunch matches for ${company}, taking top general news.`);
      filteredArticles = (feed.items || []).slice(0, 3);
    } else {
      filteredArticles = filteredArticles.slice(0, options.limit || 15);
    }

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
    console.error(`Error fetching TechCrunch RSS for ${company}:`, error.message);
    return [];
  }
}

module.exports = { fetchTechCrunchNews };
