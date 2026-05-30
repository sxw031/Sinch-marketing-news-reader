require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const moment = require('moment');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, cleanupOldNews } = require('./services/newsAggregator');
const app = express();
const PORT = process.env.PORT || 3000;
const UPDATE_INTERVAL = (process.env.UPDATE_INTERVAL || 60) * 60 * 1000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/news', newsRoutes);
app.get('/api/health', (req, res) => { res.json({ success: true, message: 'Marketing News Reader is running', timestamp: new Date().toISOString() }); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../frontend/index.html')); });
app.use((err, req, res, next) => { console.error('Error:', err); res.status(500).json({ success: false, error: err.message }); });
app.listen(PORT, () => {
  console.log(`Marketing News Reader running on http://localhost:${PORT}`);
  console.log(`Update interval: ${UPDATE_INTERVAL / 60000} minutes`);
  console.log('Performing initial news aggregation...');
  aggregateAllNews().catch(console.error);
  setInterval(() => {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Running scheduled news aggregation...`);
    aggregateAllNews().catch(console.error);
  }, UPDATE_INTERVAL);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(2, 0, 0, 0);
  const msUntilCleanup = tomorrow - now;
  setTimeout(() => {
    cleanupOldNews(30).catch(console.error);
    setInterval(() => { cleanupOldNews(30).catch(console.error); }, 24 * 60 * 60 * 1000);
  }, msUntilCleanup);
});
module.exports = app;
