const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

// Schedule a sequence of emails for a lead using Bull queue.
async function scheduleCampaign(leadId, emails) {
  // TODO: push each email in the sequence to emailQueue.add()
  return leadId;
}

module.exports = { scheduleCampaign };
