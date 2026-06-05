const { aggregateAllNews, getNews, getNewsCount, getAvailableCompanies, getSources } = require('../services/newsAggregator');
const { generateYearlySummary } = require('../services/strategyEngine');
const { generateSpeech, generatePodcastScript, generateReportScript } = require('../services/ttsService');
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
      sort: req.query.sort || 'latest',
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

  aggregationState = {
    inProgress: true,
    currentCompany: null,
    completedCompanies: [],
    totalCompanies: COMPANIES.length,
    startTime: new Date().toISOString()
  };
  res.json({ success: true, message: 'Aggregation started' });

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

/**
 * Podcast generation - uses Edge TTS with retry
 */
async function getPodcast(req, res) {
  try {
    const news = await getNews({ limit: 20 });
    if (news.length === 0) {
      return res.status(404).json({ success: false, error: 'No news available yet. Please wait for sync to complete.' });
    }

    const script = generatePodcastScript(news);
    if (!script) {
      return res.status(500).json({ success: false, error: 'Failed to generate podcast script' });
    }

    console.log(`[Podcast] Generating audio for ${script.length} chars...`);
    const audioBuffer = await generateSpeech(script);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=300'
    });
    res.send(audioBuffer);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error || 'Unknown TTS error');
    console.error('[Podcast] Error:', errMsg, error?.stack || '');
    res.status(500).json({ success: false, error: `Podcast generation failed: ${errMsg}. TTS service may be temporarily unavailable. Please try again in a moment.` });
  }
}

/**
 * Report speech synthesis
 */
async function getReportSpeech(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' });

    const script = generateReportScript(text);
    if (!script) {
      return res.status(500).json({ success: false, error: 'Failed to generate report script' });
    }

    console.log(`[ReportSpeech] Generating audio for ${script.length} chars...`);
    const audioBuffer = await generateSpeech(script);

    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length });
    res.send(audioBuffer);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error || 'Unknown TTS error');
    console.error('[ReportSpeech] Error:', errMsg, error?.stack || '');
    res.status(500).json({ success: false, error: `Report speech failed: ${errMsg}` });
  }
}

/**
 * Yearly Summary
 */
async function getYearlySummary(req, res) {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);
    if (yearNum < 2023 || yearNum > 2026) {
      return res.status(400).json({ success: false, error: 'Year must be 2023-2026' });
    }
    const summary = generateYearlySummary(yearNum);
    res.json({ success: true, year: yearNum, data: summary });
  } catch (error) {
    console.error('[YearlySummary]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Debug stats
 */
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
  getPodcast,
  getReportSpeech,
  getYearlySummary,
  getDebugStats
};
