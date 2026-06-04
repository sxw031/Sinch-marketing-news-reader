const { aggregateAllNews, getNews, getNewsCount, getAvailableCompanies, getSources } = require('../services/newsAggregator');
const { COMPANIES } = require('../config/sources');

// --- Aggregation State ---
let aggregationState = {
  inProgress: false,
  currentCompany: null,
  completedCompanies: [],
  totalCompanies: COMPANIES.length,
  startTime: null
};

// --- Controllers ---

async function getAllNews(req, res) {
  try {
    const filters = {
      companies: req.query.companies ? req.query.companies.split(',').filter(Boolean) : undefined,
      company: req.query.company,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      category: req.query.category,
      source: req.query.source,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : 200
    };
    const news = await getNews(filters);
    res.json({ success: true, count: news.length, data: news });
  } catch (error) {
    console.error('[API] getAllNews error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

function getCompanies(req, res) {
  res.json({ success: true, data: getAvailableCompanies() });
}

async function getSourcesList(req, res) {
  try {
    const sources = await getSources();
    res.json({ success: true, data: sources });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function triggerAggregation(req, res) {
  if (aggregationState.inProgress) {
    return res.json({ success: true, message: 'Already in progress', status: aggregationState });
  }

  // Respond immediately, run in background
  aggregationState = {
    inProgress: true,
    currentCompany: null,
    completedCompanies: [],
    totalCompanies: COMPANIES.length,
    startTime: new Date().toISOString()
  };
  res.json({ success: true, message: 'Aggregation started' });

  // Background execution
  try {
    await aggregateAllNews({
      onProgress: (companyName) => {
        aggregationState.currentCompany = companyName;
        if (!aggregationState.completedCompanies.includes(companyName)) {
          aggregationState.completedCompanies.push(companyName);
        }
      },
      onError: (companyName, error) => {
        console.error(`[Aggregation] ${companyName}: ${error}`);
      }
    });
  } catch (err) {
    console.error('[Aggregation] Fatal:', err.message);
  } finally {
    aggregationState.inProgress = false;
    aggregationState.currentCompany = null;
  }
}

function getAggregationStatus(req, res) {
  res.json({ success: true, status: aggregationState });
}

function getAggregationStateObj() {
  return aggregationState;
}

async function getPodcast(req, res) {
  try {
    const { OpenAI } = require('openai');
    const client = new OpenAI();

    // Get latest news from DB (no time restriction)
    const news = await getNews({ limit: 15 });
    if (news.length === 0) {
      return res.status(404).json({ success: false, error: 'No news available yet. Please wait for sync to complete.' });
    }

    const newsContext = news.map(n => `[${n.company}] ${n.title}: ${n.description || ''}`).join('\n');

    // Generate podcast script
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional business news anchor. Create a compelling 3-minute podcast script summarizing the key strategic developments. Use a warm, authoritative tone. Structure: brief intro, 3-4 key stories with analysis, closing thoughts. Keep it concise and insightful. Write in English.' },
        { role: 'user', content: `Today\'s top business developments:\n${newsContext}` }
      ]
    });

    const script = completion.choices[0].message.content;

    // Generate audio
    const mp3 = await client.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'onyx',
      input: script
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (error) {
    console.error('[Podcast] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReportSpeech(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' });

    const { OpenAI } = require('openai');
    const client = new OpenAI();

    const summary = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Summarize this strategic report into a 2-minute professional audio briefing script. Be concise, highlight key action items.' },
        { role: 'user', content: text }
      ]
    });

    const mp3 = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: summary.choices[0].message.content
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': buffer.length });
    res.send(buffer);
  } catch (error) {
    console.error('[ReportSpeech] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getDebugStats(req, res) {
  try {
    const count = await getNewsCount();
    const mem = process.memoryUsage();
    res.json({
      success: true,
      db: { newsCount: count },
      memory: { rss: `${Math.round(mem.rss / 1024 / 1024)}MB`, heap: `${Math.round(mem.heapUsed / 1024 / 1024)}MB` },
      uptime: Math.round(process.uptime()),
      aggregation: aggregationState
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllNews,
  getCompanies,
  getSourcesList,
  triggerAggregation,
  getAggregationStatus,
  getAggregationStateObj,
  getPodcast,
  getReportSpeech,
  getDebugStats
};
