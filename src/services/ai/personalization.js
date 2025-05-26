const { z } = require('zod');

// Injects lead data into an email template. Input is validated using zod
// to ensure the provided data object conforms to a simple schema before
// token replacement. All placeholders found in the template are expected
// to contain string values if supplied. Missing values simply result in an
// empty string in the final output.
function personalize(template, data) {
  // Determine all placeholders used in the template
  const tokens = [...template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);

  // Dynamically build a zod schema where every token is an optional string
  const shape = tokens.reduce((acc, token) => {
    acc[token] = z.string().optional();
    return acc;
  }, {});

  // Validate provided data; unknown keys are allowed
  z.object(shape).passthrough().parse(data);

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

module.exports = { personalize };
