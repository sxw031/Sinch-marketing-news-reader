require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, cleanupOldNews } = require('./services/newsAggregator');
const { OpenAI } = require('openai');
const app = express();

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;

if (openaiApiKey && openaiApiKey !== 'your_openai_api_key_here') {
    openai = new OpenAI({
        apiKey: openaiApiKey
    });
} else {
    console.warn('WARNING: OPENAI_API_KEY is not set. AI features will be disabled or run in mock mode.');
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
app.post('/api/ai/chat', async (req, res) => {
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
app.post('/api/ai/strategy', async (req, res) => {
    try {
        const { news } = req.body;
        
        if (!openai) {
            return res.json({ 
                success: true, 
                report: "AI Strategy Report is currently in demo mode. Please configure your OPENAI_API_KEY to generate professional strategic plans." 
            });
        }

        const newsStr = news.map(n => `- [${n.company}] ${n.title}: ${n.description}`).join('\n');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a Senior Customer Success Manager at Sinch. Based on the provided strategic news about clients, generate a marketing analysis report and a strategic plan. Focus on opportunities for Sinch to help these clients grow or solve problems." },
                { role: "user", content: `Strategic News:\n${newsStr}` }
            ]
        });
        
        res.json({ success: true, report: response.choices[0].message.content });
    } catch (error) {
        console.error('AI Strategy Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => { 
  res.json({ 
    success: true, 
    message: 'Marketing News Reader is running', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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
        console.log('Starting initial news aggregation in background...');
        // Add a small delay to ensure DB is fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        aggregateAllNews().catch(err => console.error('Initial aggregation error:', err));
    } catch (err) {
        console.error('Failed to trigger initial aggregation:', err);
    }
  });

  // Set up recurring aggregation
  setInterval(() => {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Running scheduled news aggregation...`);
    aggregateAllNews().catch(err => console.error('Scheduled aggregation error:', err));
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
