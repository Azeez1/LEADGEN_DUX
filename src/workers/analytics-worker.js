const logger = require('../utils/logger');
const { supabase, upsertMetric } = require('../services/database/supabase-client');
const { track } = require('../services/email/tracking');

// Worker that records engagement metrics for sent emails. Expects an event
// object containing at least `{ type, messageId }`.
module.exports = async function analyticsWorker(event) {
  logger.info('Tracking event', event);

  // Persist the raw tracking event first
  await track(event);

  // Recalculate email performance metrics defined in Agent.md section 12
  const { count: sentCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .not('sent_at', 'is', null);

  if (sentCount === null) {
    logger.error('Unable to compute metrics: failed to count sent emails');
    return;
  }

  const { count: openedCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('opened', true);

  const { count: clickedCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('clicked', true);

  const { count: repliedCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('replied', true);

  const { count: bouncedCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('bounced', true);

  const { count: unsubCount } = await supabase
    .from('email_campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('unsubscribed', true);

  const openRate = sentCount ? openedCount / sentCount : 0;
  const clickRate = sentCount ? clickedCount / sentCount : 0;
  const replyRate = sentCount ? repliedCount / sentCount : 0;
  const bounceRate = sentCount ? bouncedCount / sentCount : 0;
  const unsubscribeRate = sentCount ? unsubCount / sentCount : 0;

  await Promise.all([
    upsertMetric('open_rate', openRate),
    upsertMetric('click_rate', clickRate),
    upsertMetric('reply_rate', replyRate),
    upsertMetric('bounce_rate', bounceRate),
    upsertMetric('unsubscribe_rate', unsubscribeRate),
  ]);

  logger.info('Analytics metrics updated');
};
