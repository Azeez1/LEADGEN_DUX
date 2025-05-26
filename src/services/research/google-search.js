const { google } = require('googleapis');

// Performs a query using Google Custom Search JSON API. Free tier is limited
// to 100 queries per day so consider caching results.
async function search(query) {
  const customsearch = google.customsearch('v1');
  try {
    const res = await customsearch.cse.list({
      q: query,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      auth: process.env.GOOGLE_SEARCH_API_KEY
    });

    const items = res.data.items || [];
    return items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    }));
  } catch (err) {
    const quotaError = err.errors && err.errors.some(e =>
      e.reason === 'dailyLimitExceeded' ||
      e.reason === 'userRateLimitExceeded' ||
      e.reason === 'quotaExceeded'
    );

    if (quotaError) {
      throw new Error('Google Search quota exceeded');
    }

    throw err;
  }
}

module.exports = { search };
