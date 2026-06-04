require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, getNews, getNewsCount } = require('./services/newsAggregator');
const { generateHeuristicReport } = require('./services/strategyEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/news', newsRoutes);

// AI Chat
app.post('/api/news/ai/chat', async (req, res) => {
  try {
    const { query, context } = req.body;
    const { OpenAI } = require('openai');
    const client = new OpenAI();

    const newsContext = (context || []).map(n => `[${n.company}] ${n.title}: ${n.description || ''}`).join('\n');
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are MarketFeed AI, a business intelligence assistant. Answer questions based on the provided news context. Be concise and insightful.' },
        { role: 'user', content: `News Context:\n${newsContext}\n\nQuestion: ${query}` }
      ]
    });
    res.json({ success: true, answer: completion.choices[0].message.content });
  } catch (error) {
    console.error('[AI Chat]', error.message);
    res.json({ success: true, answer: 'AI is temporarily unavailable. Please try again later.' });
  }
});

// AI Strategy Report
app.post('/api/news/ai/strategy', async (req, res) => {
  try {
    const { news } = req.body;
    if (!news || news.length === 0) {
      return res.json({ success: true, report: generateHeuristicReport([]) });
    }

    // Try OpenAI first, fallback to heuristic
    try {
      const { OpenAI } = require('openai');
      const client = new OpenAI();
      const newsStr = news.map(n => `[${n.company}] ${n.title}: ${n.description || ''}`).join('\n');
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a Senior Customer Success Manager. Generate a strategic analysis report based on the news. Use markdown with bold headings, clear sections per company, and actionable recommendations. Include: Executive Summary, Key Opportunities by Company, Risk Alerts, and Recommended Actions.' },
          { role: 'user', content: `Strategic News:\n${newsStr}` }
        ]
      });
      return res.json({ success: true, report: completion.choices[0].message.content });
    } catch (aiErr) {
      console.log('[Strategy] OpenAI unavailable, using heuristic engine');
      return res.json({ success: true, report: generateHeuristicReport(news) });
    }
  } catch (error) {
    console.error('[Strategy]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MarketFeed is running', uptime: Math.round(process.uptime()) });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MarketFeed] Running on port ${PORT}`);

  // Auto-sync on startup (non-blocking)
  setTimeout(async () => {
    try {
      const count = await getNewsCount();
      console.log(`[Startup] Current news count: ${count}`);
      if (count < 10) {
        console.log('[Startup] Low news count, triggering initial sync...');
        await aggregateAllNews({
          onProgress: (name) => console.log(`  Syncing: ${name}`)
        });
      }
    } catch (err) {
      console.error('[Startup] Auto-sync failed:', err.message);
    }
  }, 2000);

  // Recurring sync every 2 hours
  setInterval(async () => {
    console.log('[Scheduled] Running periodic sync...');
    try {
      await aggregateAllNews({});
    } catch (err) {
      console.error('[Scheduled] Sync failed:', err.message);
    }
  }, 2 * 60 * 60 * 1000);
});

module.exports = app;
