const { search } = require('../services/research/google-search');
const logger = require('../utils/logger');

// Worker executed from a Bull queue to perform research tasks
module.exports = async function researchWorker(query) {
  logger.info('Researching', query);
  const results = await search(query);
  logger.info('Results', results);
  return results;
};
