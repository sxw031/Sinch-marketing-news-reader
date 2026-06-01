const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
router.get('/', newsController.getAllNews);
router.get('/companies', newsController.getCompanies);
router.get('/sources', newsController.getSources);
router.get('/company/:company', newsController.getCompanyNews);
router.post('/aggregate', newsController.triggerAggregation);
module.exports = router;
