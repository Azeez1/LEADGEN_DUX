// Determine research strategy based on available lead data
function determineStrategy(leadData) {
  const strategies = [];

  if (leadData.linkedin_url) {
    strategies.push({
      tool: 'browseruse',
      priority: 1,
      target: leadData.linkedin_url
    });
  }

  if (leadData.company) {
    const namePart = leadData.name ? ` ${leadData.name}` : '';
    strategies.push({
      tool: 'google_search',
      priority: 2,
      query: `${leadData.company}${namePart} news`
    });
  }

  if (leadData.email) {
    const parts = leadData.email.split('@');
    if (parts[1]) {
      strategies.push({
        tool: 'browseruse',
        priority: 3,
        target: `https://${parts[1]}`
      });
    }
  }

  return strategies.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

module.exports = { determineStrategy };
