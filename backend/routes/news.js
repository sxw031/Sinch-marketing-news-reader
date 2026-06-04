const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/newsController');

router.get('/', ctrl.getAllNews);
router.get('/companies', ctrl.getCompanies);
router.get('/sources', ctrl.getSourcesList);
router.post('/aggregate', ctrl.triggerAggregation);
router.get('/aggregation-status', ctrl.getAggregationStatus);
router.get('/podcast', ctrl.getPodcast);
router.post('/report-speech', ctrl.getReportSpeech);
router.post('/ai/strategy', ctrl.generateStrategy);
router.post('/ai/chat', ctrl.aiChat);
router.get('/yearly-summary/:year', ctrl.getYearlySummary);
router.get('/debug/stats', ctrl.getDebugStats);

module.exports = router;
