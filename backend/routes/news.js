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
router.get('/debug/stats', ctrl.getDebugStats);

module.exports = router;
