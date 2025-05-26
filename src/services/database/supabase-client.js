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

module.exports = { storeLead, supabase };
