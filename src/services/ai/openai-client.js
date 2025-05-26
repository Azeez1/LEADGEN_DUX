const { OpenAI } = require('openai');

// Wrapper around the OpenAI completion API. GPT-4 is preferred with a
// fallback to GPT-3.5-turbo when context limits are exceeded.
async function generate(prompt) {
  // TODO: call OpenAI using new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return '';
}

module.exports = { generate };
