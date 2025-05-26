const logger = require('../utils/logger');

// Worker that records engagement metrics for sent emails
module.exports = async function analyticsWorker(event) {
  logger.info('Tracking event', event);
  // TODO: implement analytics
};
