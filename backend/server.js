require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const newsRoutes = require('./routes/news');
const { cleanupOldNews } = require('./services/newsAggregator');
const { getAggregationStatus } = require('./controllers/newsController');
const { generateHeuristicReport } = require('./services/strategyEngine');
const { OpenAI } = require('openai');
const app = express();

const openaiApiKey = process.env.OPENAI_API_KEY;
let openai = null;

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

// Aggregation status endpoint
app.get('/api/news/aggregation-status', (req, res) => {
    res.json({
        success: true,
        status: getAggregationStatus()
    });
});

// DEBUG INTERFACE: To see what's happening inside Render's black box
app.get('/api/debug/stats', async (req, res) => {
    try {
        const db = require('./models/db');
        const newsCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM news', [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });
        
        const memory = process.memoryUsage();
        const aggregationStatus = getAggregationStatus();
        
        res.json({
            success: true,
            db: {
                path: process.env.FORCE_DB_PATH || 'default',
                newsCount: newsCount
            },
            system: {
                uptime: process.uptime(),
                memory: {
                    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`
                }
            },
            aggregation: aggregationStatus
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint for Render
app.get('/api/health', (req, res) => { 
  const status = getAggregationStatus();
  res.json({ 
    success: true, 
    message: 'Marketing News Reader is running', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    isAggregating: status.inProgress,
    aggregationStatus: status
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
        const { aggregateAllNews } = require('./services/newsAggregator');
        const status = getAggregationStatus();
        if (status.inProgress) return;
        
        console.log('Starting initial strategic news aggregation in background...');
        // This will now trigger seedInitialNews() internally as well
        await aggregateAllNews({ strategicOnly: false });
        console.log('Initial aggregation completed.');
    } catch (err) {
        console.error('Failed to run initial aggregation:', err);
    }
  });

  // Set up recurring aggregation
  setInterval(async () => {
    const status = getAggregationStatus();
    if (status.inProgress) return;
    
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Running scheduled strategic news aggregation...`);
    try {
        const { aggregateAllNews } = require('./services/newsAggregator');
        await aggregateAllNews({ strategicOnly: true });
    } catch (err) {
        console.error('Scheduled aggregation error:', err);
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
