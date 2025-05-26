const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for inserts and updates.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Persist a qualified lead to the database and return the inserted id.
async function storeLead(lead) {
  // TODO: use supabase.from('leads').insert([lead])
  return 1; // id placeholder
}

module.exports = { storeLead, supabase };
