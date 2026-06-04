const { aggregateAllNews, getNews, getNewsCount, getAvailableCompanies, getSources } = require('../services/newsAggregator');
const { generateHeuristicReport, generateYearlySummary } = require('../services/strategyEngine');
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
 * Podcast generation - uses Edge TTS (free, no API key needed)
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
    console.error('[Podcast] Error:', error.message);
    res.status(500).json({ success: false, error: `Podcast generation failed: ${error.message}` });
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
    console.error('[ReportSpeech] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * AI Strategy Report - heuristic engine
 */
async function generateStrategy(req, res) {
  try {
    const { news } = req.body;
    if (!news || news.length === 0) {
      return res.json({ success: true, report: generateHeuristicReport([]) });
    }
    const report = generateHeuristicReport(news);
    res.json({ success: true, report });
  } catch (error) {
    console.error('[Strategy]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Yearly Summary - generates a summary of major events for a given year
 */
async function getYearlySummary(req, res) {
  try {
    const { year } = req.params;
    const yearNum = parseInt(year);
    if (yearNum < 2023 || yearNum > 2025) {
      return res.status(400).json({ success: false, error: 'Year must be 2023, 2024, or 2025' });
    }
    const summary = generateYearlySummary(yearNum);
    res.json({ success: true, year: yearNum, data: summary });
  } catch (error) {
    console.error('[YearlySummary]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * AI Chat - heuristic-based Q&A
 */
async function aiChat(req, res) {
  try {
    const { query: q, context } = req.body;
    if (!q) return res.status(400).json({ success: false, error: 'No query provided' });

    // Simple keyword-based answer generation
    const answer = generateChatAnswer(q, context || []);
    res.json({ success: true, answer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function generateChatAnswer(question, context) {
  const q = question.toLowerCase();
  const companies = COMPANIES.map(c => c.name);
  const mentionedCompany = companies.find(c => q.includes(c.toLowerCase()));

  if (context.length === 0) {
    return 'I don\'t have enough news data to answer your question yet. Please wait for the sync to complete or try refreshing.';
  }

  if (mentionedCompany) {
    const companyNews = context.filter(n => n.company === mentionedCompany);
    if (companyNews.length > 0) {
      const headlines = companyNews.slice(0, 3).map(n => `• ${n.title}`).join('\n');
      return `Here's what I found about **${mentionedCompany}**:\n\n${headlines}\n\nBased on ${companyNews.length} recent articles, ${mentionedCompany} appears to be active in the news. For a deeper analysis, try generating a Strategy Report.`;
    }
    return `I don't have recent news about ${mentionedCompany} in the current view. Try expanding the time range or refreshing.`;
  }

  if (q.includes('trend') || q.includes('summary') || q.includes('overview')) {
    const companyCount = [...new Set(context.map(n => n.company))].length;
    return `Currently tracking ${context.length} articles across ${companyCount} companies. The most active companies are: ${[...new Set(context.slice(0, 10).map(n => n.company))].join(', ')}. Generate a Strategy Report for detailed insights.`;
  }

  if (q.includes('sinch') || q.includes('opportunity') || q.includes('csm')) {
    const strategic = context.filter(n => n.category === 'Strategic Insights');
    if (strategic.length > 0) {
      return `I found ${strategic.length} strategic signals that may be relevant for Sinch CSM outreach:\n\n${strategic.slice(0, 3).map(n => `• **${n.company}**: ${n.title}`).join('\n')}\n\nThese indicate potential engagement opportunities. Generate a Strategy Report for actionable recommendations.`;
    }
  }

  return `Based on the ${context.length} articles currently loaded, here are the top headlines:\n\n${context.slice(0, 5).map(n => `• **${n.company}**: ${n.title}`).join('\n')}\n\nAsk me about a specific company or try "What are the trends?"`;
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
  getPodcast,
  getReportSpeech,
  generateStrategy,
  getYearlySummary,
  aiChat,
  getDebugStats
};
