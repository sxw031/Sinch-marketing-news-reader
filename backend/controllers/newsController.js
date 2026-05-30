const { getNews, getAvailableCompanies, aggregateAllNews } = require('../services/newsAggregator');
async function getAllNews(req, res) {
  try {
    const filters = { company: req.query.company, companies: req.query.companies ? req.query.companies.split(',') : undefined, startDate: req.query.startDate, endDate: req.query.endDate, category: req.query.category, search: req.query.search, limit: req.query.limit ? parseInt(req.query.limit) : 100 };
    const news = await getNews(filters);
    res.json({ success: true, count: news.length, data: news });
  } catch (error) {
    console.error('Error getting news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
async function getCompanyNews(req, res) {
  try {
    const { company } = req.params;
    const { limit = 20 } = req.query;
    const news = await getNews({ company, limit: parseInt(limit) });
    res.json({ success: true, company, count: news.length, data: news });
  } catch (error) {
    console.error('Error getting company news:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
function getCompanies(req, res) {
  try {
    const companies = getAvailableCompanies();
    res.json({ success: true, count: companies.length, data: companies });
  } catch (error) {
    console.error('Error getting companies:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
async function triggerAggregation(req, res) {
  try {
    res.json({ success: true, message: 'News aggregation started in background' });
    aggregateAllNews().catch(error => { console.error('Error in background aggregation:', error); });
  } catch (error) {
    console.error('Error triggering aggregation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
module.exports = { getAllNews, getCompanyNews, getCompanies, triggerAggregation };
