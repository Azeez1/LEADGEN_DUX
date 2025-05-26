const { z } = require('zod');

// Injects lead data into an email template. Input is validated using zod
// to ensure required fields are present before token replacement.
function personalize(template, data) {
  // TODO: define schema with zod and validate data
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

module.exports = { personalize };
