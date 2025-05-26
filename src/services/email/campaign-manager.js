const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

// Schedule a sequence of emails for a lead using Bull queue.
// `emails` should be an array where each entry contains the message
// payload accepted by gmail-client along with an optional `delay`
// property (in milliseconds) indicating when the email should be sent.
async function scheduleCampaign(leadId, emails = []) {
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i] || {};
    const { delay = 0, ...payload } = email;

    await emailQueue.add(
      { leadId, ...payload },
      delay ? { delay } : undefined
    );
  }

  return leadId;
}

module.exports = { scheduleCampaign };
