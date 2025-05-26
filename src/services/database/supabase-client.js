const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');
const { isLeadQualified, calculateLeadScore, MINIMUM_SCORE_THRESHOLD } = require('../../utils/lead-quality');

// Initialize Supabase client with service key for inserts and updates.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Persist a qualified lead to the database and return the inserted id.
async function storeLead(lead) {
  if (!isLeadQualified(lead)) {
    logger.warn('Lead failed qualification check');
    return null;
  }

  const score = calculateLeadScore(lead);
  if (score < MINIMUM_SCORE_THRESHOLD) {
    logger.warn(`Lead score ${score} below threshold`);
    return null;
  }

  const leadWithScore = { ...lead, score };

  const { data, error } = await supabase
    .from('leads')
    .insert([leadWithScore])
    .select()
    .single();

  if (error) {
    logger.error('Failed to store lead', error);
    throw error;
  }

  return data.id;
}

// Record an email tracking event (open/click) using the message_id field on
// the email_campaigns table. `event` should contain `{ type, messageId }`.
async function recordEmailEvent(event) {
  const { type, messageId } = event;
  if (!type || !messageId) {
    throw new Error('Missing type or messageId');
  }

  const update = {};
  const now = new Date().toISOString();
  if (type === 'open') {
    update.opened = true;
    update.opened_at = now;
  } else if (type === 'click') {
    update.clicked = true;
    update.clicked_at = now;
  } else if (type === 'reply') {
    update.replied = true;
    update.replied_at = now;
  } else if (type === 'bounce') {
    update.bounced = true;
  } else if (type === 'unsubscribe') {
    update.unsubscribed = true;
  } else {
    throw new Error(`Unsupported event type: ${type}`);
  }

  const { error } = await supabase
    .from('email_campaigns')
    .update(update)
    .eq('message_id', messageId);

  if (error) {
    logger.error('Failed to record email event', error);
    throw error;
  }

  return true;
}

// Upsert a metric value into the analytics_metrics table. The table is expected
// to have columns `metric` (primary key) and `value`.
async function upsertMetric(metric, value) {
  const { error } = await supabase
    .from('analytics_metrics')
    .upsert({ metric, value }, { onConflict: 'metric' });

  if (error) {
    logger.error('Failed to upsert metric', error);
    throw error;
  }
}

module.exports = {
  storeLead,
  supabase,
  recordEmailEvent,
  upsertMetric,
};
