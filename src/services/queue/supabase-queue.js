// Simple queue implementation backed by a Supabase table.
// Jobs are stored in a "jobs" table with columns:
// id (uuid), queue (text), payload (jsonb), status (text), created_at (timestamp).
// Pending jobs have status 'pending'. When processed they change to 'completed'.

const logger = require('../../utils/logger');

// Flag so we only warn once if the table is missing
let jobsTableAvailable = null;

async function ensureJobsTable(supabase) {
  if (jobsTableAvailable !== null) return jobsTableAvailable;

  const { error } = await supabase.from('jobs').select('id').limit(1);
  if (error && error.code === '42P01') {
    logger.error(
      'Supabase table "jobs" does not exist. Create it with:\n' +
        'CREATE TABLE jobs (\n' +
        '    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n' +
        '    queue TEXT NOT NULL,\n' +
        '    payload JSONB,\n' +
        "    status TEXT NOT NULL DEFAULT 'pending',\n" +
        '    created_at TIMESTAMPTZ DEFAULT NOW()\n' +
        ');'
    );
    jobsTableAvailable = false;
  } else {
    jobsTableAvailable = true;
  }

  return jobsTableAvailable;
}

function createQueue(name, supabase) {
  async function add(data) {
    if (!(await ensureJobsTable(supabase))) {
      throw new Error('jobs table missing');
    }
    const { error } = await supabase.from('jobs').insert({
      queue: name,
      payload: data,
      status: 'pending',
    });
    if (error) {
      logger.error(`Failed to add job to ${name} queue`, error);
      throw error;
    }
  }

  // Polling processor. intervalMs defines how frequently to check for jobs.
  function process(handler, intervalMs = 1000) {
    setInterval(async () => {
      if (!(await ensureJobsTable(supabase))) {
        return;
      }
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('queue', name)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        logger.error(`Failed to fetch jobs for ${name} queue`, error);
        return;
      }

      if (!jobs || jobs.length === 0) return;

      const job = jobs[0];
      try {
        await handler(job.payload);
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ status: 'completed' })
          .eq('id', job.id);
        if (updateError) {
          logger.error(`Failed to mark job ${job.id} completed`, updateError);
        }
      } catch (err) {
        logger.error(`Job ${job.id} failed`, err);
        await supabase.from('jobs').update({ status: 'failed' }).eq('id', job.id);
      }
    }, intervalMs);
  }

  return { add, process };
}

module.exports = { createQueue };
