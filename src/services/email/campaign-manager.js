const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);
const { isLeadQualified, calculateLeadScore, MINIMUM_SCORE_THRESHOLD } = require('../../utils/lead-quality');
const logger = require('../../utils/logger');

// Schedule a sequence of emails for a lead using Bull queue.
async function scheduleCampaign(lead, emails) {
  if (!isLeadQualified(lead)) {
    logger.warn('Lead failed qualification check, campaign not scheduled');
    return null;
  }

  const score = calculateLeadScore(lead);
  if (score < MINIMUM_SCORE_THRESHOLD) {
    logger.warn(`Lead score ${score} below threshold, campaign not scheduled`);
    return null;
  }

  // Push each email in the provided sequence onto the queue.
  // The emails array is expected to contain objects that Nodemailer can
  // consume directly. We attach the lead id so the worker knows which
  // lead the message belongs to.
  for (const email of emails) {
    await emailQueue.add({ ...email, leadId: lead.id });
  }

  return lead.id;
}

module.exports = { scheduleCampaign };
