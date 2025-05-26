p9skd5-codex/explain-codebase-structure-and-readiness-for-testing
const { loadConfig } = require('./config');
const logger = require('./utils/logger');
const { createClient } = require('@supabase/supabase-js');
const { createQueue } = require('./services/queue/supabase-queue');

const researchWorker = require('./workers/research-worker');
const { LeadAssistant } = require('./services/aiAssistant');
const { ProactiveAgent } = require('./workers/proactiveAgent');
const { NotificationService } = require('./services/notificationService');
const emailWorker = require('./workers/email-worker');
const analyticsWorker = require('./workers/analytics-worker');

async function main() {
  const config = loadConfig();
  logger.info('LeadGen DUX started with config', config);
  // Connect to Supabase
  const supabaseKey = config.supabaseServiceKey || config.supabaseAnonKey;
  const supabase = createClient(config.supabaseUrl, supabaseKey);

  const assistant = new LeadAssistant();
  await assistant.initialize();
  const notificationService = new NotificationService(supabase);
  new ProactiveAgent(assistant, notificationService);
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
require('dotenv').config();
const { LeadAssistant } = require('./services/aiAssistant');
const { ConversationManager } = require('./services/conversationManager');
const { NotificationService } = require('./services/notificationService');
const { ProactiveAgent } = require('./workers/proactiveAgent');
const researchWorker = require('./workers/research-worker');
const emailWorker = require('./workers/email-worker');

async function start() {
  console.log('AI Lead Agent starting...');
  const assistant = new LeadAssistant();
  await assistant.initialize();

  // Start queue processors
  assistant.researchQueue.process(researchWorker);
  assistant.emailQueue.process(emailWorker);

  // Initialize conversation manager and notification service
  const conversationManager = new ConversationManager(assistant);
  const notificationService = new NotificationService(assistant.supabase);

  // Launch proactive behaviours (scheduled tasks, notifications)
  new ProactiveAgent(assistant, notificationService);

  console.log('Lead Assistant ready.');
}

start().catch(err => {
  console.error('Failed to start AI Lead Agent', err);
   main
  process.exit(1);
});
