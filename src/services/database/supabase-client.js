const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');

// Initialize Supabase client with service key for inserts and updates.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Persist a qualified lead to the database and return the inserted id.
async function storeLead(lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert([lead])
    .select()
    .single();

  if (error) {
    logger.error('Failed to store lead', error);
    throw error;
  }

  return data.id;
}

module.exports = { storeLead, supabase };
