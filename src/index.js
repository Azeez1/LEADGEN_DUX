const { loadConfig } = require('./config');
const logger = require('./utils/logger');

async function main() {
  const config = loadConfig();
  logger.info('LeadGen DUX started with config', config);
  // TODO: initialize Bull queues, database connections and workers
}

main().catch(err => {
  logger.error('Fatal error', err);
  process.exit(1);
});
