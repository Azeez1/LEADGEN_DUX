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

  assistant.researchQueue.process(researchWorker);
  assistant.emailQueue.process(emailWorker);

  const conversationManager = new ConversationManager(assistant);
  const notificationService = new NotificationService(assistant.supabase);
  new ProactiveAgent(assistant, notificationService);

  console.log('Lead Assistant ready.');
  return { assistant, conversationManager };
}

start().catch(err => {
  console.error('Failed to start AI Lead Agent', err);
  process.exit(1);
});
