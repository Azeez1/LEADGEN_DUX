const { loadConfig } = require('./config');
const logger = require('./utils/logger');
const Queue = require('bull');
const { createClient } = require('@supabase/supabase-js');

const researchWorker = require('./workers/research-worker');
const emailWorker = require('./workers/email-worker');
const analyticsWorker = require('./workers/analytics-worker');

async function main() {
  const config = loadConfig();
  logger.info('LeadGen DUX started with config', config);
  // Create Bull queues
  const researchQueue = new Queue('research', config.redisUrl);
  const emailQueue = new Queue('email', config.redisUrl);
  const analyticsQueue = new Queue('analytics', config.redisUrl);

  // Connect to Supabase
  const supabaseKey = config.supabaseServiceKey || config.supabaseAnonKey;
  const supabase = createClient(config.supabaseUrl, supabaseKey);

  // Register workers to process jobs
  researchQueue.process(job => researchWorker(job.data, supabase));
  emailQueue.process(job => emailWorker(job.data, supabase));
  analyticsQueue.process(job => analyticsWorker(job.data, supabase));

  logger.info('Queues initialized and workers registered');
}

main().catch(err => {
  logger.error('Fatal error', err);
  process.exit(1);
});
