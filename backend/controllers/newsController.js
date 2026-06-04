const { getNews, getAvailableCompanies, aggregateAllNews } = require('../services/newsAggregator');
async function getAllNews(req, res) {
  try {
    console.log('--- GET NEWS REQUEST ---');
    console.log('Query Params:', JSON.stringify(req.query));

    const filters = { 
      company: req.query.company, 
      companies: req.query.companies ? req.query.companies.split(',').filter(c => c.trim()) : undefined, 
      startDate: req.query.startDate, 
      endDate: req.query.endDate, 
      category: req.query.category, 
      source: req.query.source,
      search: req.query.search, 
      limit: req.query.limit ? parseInt(req.query.limit) : 100 
    };

    // If companies is an empty array after filtering, set to undefined to show all
    if (filters.companies && filters.companies.length === 0) {
      filters.companies = undefined;
    }

    console.log('Applied Filters:', JSON.stringify(filters));
    const news = await getNews(filters);
    console.log(`Returning ${news.length} articles`);
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
let isAggregating = false;
let aggregationStatus = {
    inProgress: false,
    currentCompany: null,
    completedCompanies: [],
    totalCompanies: 0,
    startTime: null,
    errors: 0,
    isFull: false
};

function getAggregationStatus() {
    return aggregationStatus;
}

async function triggerAggregation(req, res) {
  try {
    if (isAggregating) {
      return res.json({ success: true, message: 'Aggregation is already in progress' });
    }

    const isFull = req.query.full === 'true';
    const { COMPANIES } = require('../config/sources');
    
    isAggregating = true;
    aggregationStatus = {
        inProgress: true,
        currentCompany: null,
        completedCompanies: [],
        totalCompanies: COMPANIES.length,
        startTime: new Date(),
        errors: 0,
        isFull: isFull
    };

    res.json({ success: true, message: 'News aggregation started in background' });
    
    // Run in background
    (async () => {
      try {
        await aggregateAllNews({
            strategicOnly: !isFull,
            onProgress: (companyName) => {
                aggregationStatus.currentCompany = companyName;
                if (!aggregationStatus.completedCompanies.includes(companyName)) {
                    aggregationStatus.completedCompanies.push(companyName);
                }
            },
            onError: (companyName, error) => {
                aggregationStatus.errors++;
                console.error(`Error aggregating ${companyName}:`, error);
            }
        });
      } catch (error) {
        console.error('Error in background aggregation:', error);
      } finally {
        isAggregating = false;
        aggregationStatus.inProgress = false;
        aggregationStatus.currentCompany = 'Completed';
      }
    })();
  } catch (error) {
    console.error('Error triggering aggregation:', error);
    isAggregating = false;
    aggregationStatus.inProgress = false;
    res.status(500).json({ success: false, error: error.message });
  }
}
async function getSources(req, res) {
  try {
    const { db_helpers } = require('../models/db');
    const sources = await db_helpers.all('SELECT DISTINCT source FROM news ORDER BY source ASC');
    res.json({ success: true, count: sources.length, data: sources.map(s => s.source) });
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getPodcast(req, res) {
  try {
    const { getNews } = require('../services/newsAggregator');
    const { OpenAI } = require('openai');
    
    // Fetch latest strategic news - NO 24h limit
    const news = await getNews({ limit: 20, category: 'Strategic Insights' });
    
    // Fallback to any news if no strategic found
    let finalNews = news;
    if (news.length === 0) {
        finalNews = await getNews({ limit: 10 });
    }
    
    if (finalNews.length === 0) {
      return res.status(404).json({ success: false, error: 'No news found to summarize.' });
    }

    const candidates = finalNews.map(n => `[${n.company}] ${n.title}: ${n.description}`).join('\n');
    const client = new OpenAI();
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "你是一位资深的财经新闻主播，拥有富有磁性且专业的嗓音。请根据提供的新闻内容，创作一份约3分钟的中文播客脚本。重点分析最具战略意义的商业动态。脚本应包括开场白、核心新闻解读、行业影响以及结语。" },
        { role: "user", content: `最新动态：\n${candidates}` }
      ]
    });

    const script = completion.choices[0].message.content;
    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: script,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (error) {
    console.error('Podcast Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReportSpeech(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' });

    const { OpenAI } = require('openai');
    const client = new OpenAI();
    
    // Summary of the report for TTS to keep it concise
    const summary = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: "Summarize this strategic report into a 2-minute professional briefing script in Chinese." },
            { role: "user", content: text }
        ]
    });

    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: summary.choices[0].message.content,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (error) {
    console.error('Report Speech Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

function getAggregationStatusEndpoint(req, res) {
    res.json({ success: true, data: aggregationStatus });
}

module.exports = { getAllNews, getCompanyNews, getCompanies, triggerAggregation, getSources, getAggregationStatus, getPodcast, getReportSpeech, getAggregationStatusEndpoint };
