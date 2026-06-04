require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, cleanupOldNews } = require('./services/newsAggregator');
const { generateHeuristicReport } = require('./services/strategyEngine');
const { OpenAI } = require('openai');
const app = express();

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;
let isAggregating = false;

// Only initialize if it looks like a real key (starts with sk-)
if (openaiApiKey && openaiApiKey.startsWith('sk-')) {
    openai = new OpenAI({
        apiKey: openaiApiKey
    });
} else {
    console.warn('WARNING: Valid OPENAI_API_KEY not found. Using Heuristic Engine for strategy and mock mode for chat.');
}
// Use PORT provided by environment (Render) or default to 3000
const PORT = process.env.PORT || 3000;
// Update interval in hours, default to 1 hour
const UPDATE_INTERVAL_HOURS = parseFloat(process.env.UPDATE_INTERVAL) || 1;
const UPDATE_INTERVAL_MS = UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;

app.use(cors());
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/news', newsRoutes);

// AI Chat Endpoint
app.post('/api/news/ai/chat', async (req, res) => {
    try {
        const { query, context } = req.body;
        
        if (!openai) {
            return res.json({ 
                success: true, 
                answer: "AI Chat is currently in demo mode because no API key is configured. Please set OPENAI_API_KEY in your environment to enable full features." 
            });
        }

        const contextStr = context.map(n => `- [${n.company}] ${n.title}: ${n.description}`).join('\n');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are MarketFeed AI, an expert in market analysis and customer success. Answer questions based on the provided news context." },
                { role: "user", content: `Context News:\n${contextStr}\n\nQuestion: ${query}` }
            ]
        });
        
        res.json({ success: true, answer: response.choices[0].message.content });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// AI Strategy Report Endpoint
app.post('/api/news/ai/strategy', async (req, res) => {
    try {
        const { news } = req.body;
        
        // Use OpenAI if available, otherwise fallback to Heuristic Engine
        if (openai) {
            console.log('Generating strategy using OpenAI...');
            const newsStr = news.map(n => `- [${n.company}] ${n.title}: ${n.description}`).join('\n');
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a Senior Customer Success Manager at Sinch. Based on the provided strategic news about clients, generate a marketing analysis report and a strategic plan. Focus on opportunities for Sinch to help these clients grow or solve problems." },
                    { role: "user", content: `Strategic News:\n${newsStr}` }
                ]
            });
            return res.json({ success: true, report: response.choices[0].message.content });
        } else {
            console.log('Generating strategy using Heuristic Engine (No API Key)...');
            const report = generateHeuristicReport(news);
            return res.json({ success: true, report: report });
        }
    } catch (error) {
        console.error('AI Strategy Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Manual aggregation endpoint
app.post('/api/news/aggregate', async (req, res) => {
  if (isAggregating) {
    return res.status(429).json({ success: false, message: 'Aggregation already in progress' });
  }
  
  const isFull = req.query.full === 'true';
  isAggregating = true;
  console.log(`Manual ${isFull ? 'Full' : 'Strategic'} aggregation triggered...`);
  
  // Run aggregation in background
  aggregateAllNews({ strategicOnly: !isFull }).then(() => {
    isAggregating = false;
  }).catch(err => {
    console.error('Manual aggregation error:', err);
    isAggregating = false;
  });
  
  res.json({ success: true, message: `Aggregation (${isFull ? 'Full' : 'Strategic'}) started` });
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => { 
  res.json({ 
    success: true, 
    message: 'Marketing News Reader is running', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    isAggregating
  }); 
});

// Serve frontend index.html for all other routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => { 
  console.error('Server Error:', err); 
  res.status(500).json({ success: false, error: err.message }); 
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Marketing News Reader running on port ${PORT}`);
  console.log(`Update interval: ${UPDATE_INTERVAL_HOURS} hours`);
  
  // Perform initial news aggregation in a non-blocking way
  setImmediate(async () => {
    try {
        if (isAggregating) return;
        isAggregating = true;
        console.log('Starting initial strategic news aggregation in background...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await aggregateAllNews({ strategicOnly: true });
        isAggregating = false;
    } catch (err) {
        console.error('Failed to trigger initial aggregation:', err);
        isAggregating = false;
    }
  });

  // Set up recurring aggregation
  setInterval(async () => {
    if (isAggregating) return;
    isAggregating = true;
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Running scheduled strategic news aggregation...`);
    try {
        await aggregateAllNews({ strategicOnly: true });
    } catch (err) {
        console.error('Scheduled aggregation error:', err);
    } finally {
        isAggregating = false;
    }
  }, UPDATE_INTERVAL_MS);

  // Set up daily cleanup of old news (keep 30 days)
  const setupCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0);
    const msUntilCleanup = tomorrow - now;
    
    setTimeout(() => {
      cleanupOldNews(180).catch(err => console.error('Cleanup error:', err));
      setInterval(() => cleanupOldNews(180).catch(err => console.error('Cleanup error:', err)), 24 * 60 * 60 * 1000);
    }, msUntilCleanup);
  };
  
  setupCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
module.exports = app;
