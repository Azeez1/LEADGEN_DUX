const { sendEmail } = require('../services/email/gmail-client');
const logger = require('../utils/logger');

// Worker executed from the Supabase-backed queue to deliver outbound emails
module.exports = async function emailWorker(message) {
  logger.info('Sending email');
  await sendEmail(message);
  logger.info('Email sent');
};
