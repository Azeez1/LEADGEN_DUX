const { loadConfig } = require('./config');
const logger = require('./utils/logger');
const { createClient } = require('@supabase/supabase-js');
const { createQueue } = require('./services/queue/supabase-queue');

const researchWorker = require('./workers/research-worker');
const emailWorker = require('./workers/email-worker');
const analyticsWorker = require('./workers/analytics-worker');

async function main() {
  const config = loadConfig();
  logger.info('LeadGen DUX started with config', config);
  // Connect to Supabase
  const supabaseKey = config.supabaseServiceKey || config.supabaseAnonKey;
  const supabase = createClient(config.supabaseUrl, supabaseKey);

  // Initialize queues backed by Supabase
  const researchQueue = createQueue('research', supabase);
  const emailQueue = createQueue('email', supabase);
  const analyticsQueue = createQueue('analytics', supabase);

  // Register workers to process jobs
  researchQueue.process(data => researchWorker(data, supabase));
  emailQueue.process(data => emailWorker(data, supabase));
  analyticsQueue.process(data => analyticsWorker(data, supabase));

  logger.info('Queues initialized and workers registered');
}

main().catch(err => {
  logger.error('Fatal error', err);
  process.exit(1);
});
