const Queue = require('bull');
const { sendEmail } = require('../services/email/gmail-client');
const logger = require('../utils/logger');

// Worker that processes jobs from the email Bull queue and sends emails
const emailQueue = new Queue('email', process.env.REDIS_URL);

emailQueue.process(async job => {
  const { leadId, ...message } = job.data || {};
  logger.info(`Sending email for lead ${leadId}`);
  await sendEmail(message);
  logger.info('Email sent');
});

module.exports = emailQueue;
