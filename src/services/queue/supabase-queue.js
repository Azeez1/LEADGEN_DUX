// Simple queue implementation backed by a Supabase table.
// Jobs are stored in a "jobs" table with columns:
// id (uuid), queue (text), payload (jsonb), status (text), created_at (timestamp).
// Pending jobs have status 'pending'. When processed they change to 'completed'.

const logger = require('../../utils/logger');

function createQueue(name, supabase) {
  async function add(data) {
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
