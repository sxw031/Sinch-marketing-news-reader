require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, cleanupOldNews } = require('./services/newsAggregator');
const app = express();
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
  
  // Perform initial news aggregation with a slight delay to allow server to start
  setTimeout(() => {
    console.log('Performing initial news aggregation...');
    aggregateAllNews().catch(err => console.error('Initial aggregation error:', err));
  }, 5000);

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
      cleanupOldNews(30).catch(err => console.error('Cleanup error:', err));
      setInterval(() => cleanupOldNews(30).catch(err => console.error('Cleanup error:', err)), 24 * 60 * 60 * 1000);
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
