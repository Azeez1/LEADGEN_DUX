const { isLeadQualified } = require('../src/utils/lead-qualification');
const { personalize } = require('../src/services/ai/personalization');

// Mock the external API clients so no real network requests are made
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } }
    })),
    mockCreate
  };
});

jest.mock('googleapis', () => {
  const list = jest.fn();
  return {
    google: { customsearch: jest.fn(() => ({ cse: { list } })) },
    list
  };
});

const { generate } = require('../src/services/ai/openai-client');
const { search } = require('../src/services/research/google-search');

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
    const { mockCreate } = require('openai');
    mockCreate
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ choices: [{ message: { content: 'hi' } }] });

    const { generate: gen } = require('../src/services/ai/openai-client');
    const result = await gen('prompt');
    expect(result).toBe('hi');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('Google search returns formatted results', async () => {
    const { list } = require('googleapis');
    list.mockResolvedValue({
      data: { items: [{ title: 't', link: 'l', snippet: 's' }] }
    });

    const { search: searchFn } = require('../src/services/research/google-search');
    const res = await searchFn('query');
    expect(res).toEqual([{ title: 't', link: 'l', snippet: 's' }]);
  });
});
