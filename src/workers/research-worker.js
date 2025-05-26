const { search } = require('../services/research/google-search');
const { fetchDynamicContent } = require('../services/research/browser-automation');
const { determineStrategy } = require('../services/research/strategy-engine');
const logger = require('../utils/logger');

// Worker executed from the Supabase-backed queue to perform research tasks based on lead data
module.exports = async function researchWorker(leadData) {
  logger.info('Researching lead', leadData);

  const strategies = determineStrategy(leadData);
  logger.info('Selected strategies', strategies);

  const results = [];

  for (const strategy of strategies) {
    try {
      if (strategy.tool === 'google_search') {
        const searchResults = await search(strategy.query);
        results.push({ tool: 'google_search', query: strategy.query, results: searchResults });
      } else if (strategy.tool === 'browseruse') {
        const content = await fetchDynamicContent(strategy.target);
        results.push({ tool: 'browseruse', target: strategy.target, content });
      } else {
        logger.warn(`Unknown research tool: ${strategy.tool}`);
      }
    } catch (err) {
      logger.error(`Failed to execute ${strategy.tool}`, err);
    }
  }

  logger.info('Results', results);
  return results;
};
