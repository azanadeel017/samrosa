'use strict';

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

router.get('/summary/:storeId', metricsController.getMetricsSummary);

module.exports = router;
