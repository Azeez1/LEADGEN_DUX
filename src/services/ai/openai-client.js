const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    'Missing OpenAI API key. Please set OPENAI_API_KEY in your environment.'
  );
}

const client = new OpenAI({ apiKey });

// Wrapper around the OpenAI completion API. GPT-4 is preferred with a
// fallback to GPT-3.5-turbo when context limits are exceeded.
async function generate(prompt) {
  const models = ['gpt-4', 'gpt-3.5-turbo'];
  for (const model of models) {
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }]
      });
      return res.choices[0].message.content.trim();
    } catch (err) {
      if (model === 'gpt-3.5-turbo') {
        throw err;
      }
    }
  }
}

module.exports = { generate };
