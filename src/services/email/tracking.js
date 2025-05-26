const { recordEmailEvent } = require('../database/supabase-client');
const logger = require('../../utils/logger');

// Track email events (open, click, reply, bounce, unsubscribe) by persisting
// them to Supabase. `event` should contain `{ type, messageId }`.
async function track(event) {
  try {
    await recordEmailEvent(event);
  } catch (err) {
    logger.error('Failed to record tracking event', err);
  }

  return event;
}

module.exports = { track };
