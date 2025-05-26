const { google } = require('googleapis');

// Performs a query using Google Custom Search JSON API. Free tier is limited
// to 100 queries per day so consider caching results.
async function search(query) {
  // TODO: use google.customsearch('v1').cse.list to fetch results
  return [];
}

module.exports = { search };
