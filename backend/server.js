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

// AI Strategy Report (heuristic, no API key needed)
app.post('/api/news/ai/strategy', async (req, res) => {
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
});

// AI Chat (heuristic, no API key needed)
app.post('/api/news/ai/chat', async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) return res.json({ success: true, answer: 'Please ask a question.' });

    // Simple keyword-based response from news context
    const q = query.toLowerCase();
    const relevant = (context || []).filter(n => {
      const text = ((n.title || '') + ' ' + (n.description || '') + ' ' + (n.company || '')).toLowerCase();
      return q.split(' ').some(word => word.length > 3 && text.includes(word));
    });

    if (relevant.length > 0) {
      let answer = `Based on recent news, here's what I found:\n\n`;
      relevant.slice(0, 5).forEach(n => {
        answer += `• **${n.company}**: ${n.title}\n`;
      });
      answer += `\n_Found ${relevant.length} related articles._`;
      res.json({ success: true, answer });
    } else {
      res.json({ success: true, answer: `I couldn't find specific news matching "${query}". Try asking about one of the tracked companies or a broader topic.` });
    }
  } catch (error) {
    console.error('[AI Chat]', error.message);
    res.json({ success: true, answer: 'Sorry, I encountered an error processing your question.' });
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
