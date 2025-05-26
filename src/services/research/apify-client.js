const { Actor } = require('apify-client');

// Apify client instantiated with API token from environment variables.
const apify = new Actor({ token: process.env.APIFY_API_TOKEN });

// Run an Apify actor to scrape structured lists of leads.
// Returns the actor result object.
async function runActor(actorId, input) {
  try {
    const { output } = await apify.call(actorId, { input });
    return output;
  } catch (err) {
    // Propagate more descriptive errors for common failure scenarios
    const status = err.statusCode || err.status;
    if (status === 429) throw new Error('Apify rate limit exceeded');
    if (status === 401 || status === 403) throw new Error('Apify authentication failed');
    throw err;
  }
}

module.exports = { runActor };
