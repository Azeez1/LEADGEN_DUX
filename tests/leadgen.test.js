const { isLeadQualified } = require('../src/utils/lead-qualification');
const { personalize } = require('../src/services/ai/personalization');
const { generate } = require('../src/services/ai/openai-client');
const { search } = require('../src/services/research/google-search');

jest.mock('../src/services/ai/openai-client');
jest.mock('../src/services/research/google-search');

describe('Lead qualification', () => {
  test('returns true when lead has required and enrichment fields', () => {
    const lead = {
      name: 'John',
      email: 'john@example.com',
      linkedin_url: 'https://linkedin.com/in/john',
      company_info: 'info'
    };
    expect(isLeadQualified(lead)).toBe(true);
  });

  test('returns false when missing enrichment', () => {
    const lead = { name: 'Jane', email: 'jane@example.com' };
    expect(isLeadQualified(lead)).toBe(false);
  });
});

describe('Email personalization', () => {
  test('replaces tokens in template', () => {
    const result = personalize('Hello {{name}}', { name: 'Alice' });
    expect(result).toBe('Hello Alice');
  });

  test('missing token results in empty string', () => {
    const result = personalize('Hi {{unknown}}', {});
    expect(result).toBe('Hi ');
  });
});

describe('API integrations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('OpenAI generate falls back to second model', async () => {
    const mockCreate = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ choices: [{ message: { content: 'hi' } }] });
    generate.mockImplementation(async (prompt) => {
      const { OpenAI } = require('openai');
      const client = new OpenAI();
      return await client.chat.completions.create(prompt);
    });
    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }))
    }));

    // Re-require after mocking
    const { generate: gen } = require('../src/services/ai/openai-client');
    const result = await gen('prompt');
    expect(result).toBe('hi');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('Google search returns formatted results', async () => {
    const list = jest.fn().mockResolvedValue({
      data: { items: [{ title: 't', link: 'l', snippet: 's' }] }
    });
    search.mockImplementation(async (query) => {
      const { google } = require('googleapis');
      const customsearch = google.customsearch('v1');
      return await customsearch.cse.list({ q: query });
    });
    jest.doMock('googleapis', () => ({
      google: { customsearch: jest.fn(() => ({ cse: { list } })) }
    }));

    const { search: searchFn } = require('../src/services/research/google-search');
    const res = await searchFn('query');
    expect(res).toEqual([{ title: 't', link: 'l', snippet: 's' }]);
  });
});
