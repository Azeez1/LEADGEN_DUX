const { isLeadQualified } = require('../src/utils/lead-qualification');
const { personalize } = require('../src/services/ai/personalization');

// Mock the external API clients so no real network requests are made
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  const OpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } }
  }));
  return Object.assign(OpenAI, { OpenAI, mockCreate });
});

jest.mock('googleapis', () => {
  const list = jest.fn();
  return {
    google: { customsearch: jest.fn(() => ({ cse: { list } })) },
    list
  };
});

jest.mock('../src/services/research/browser-automation', () => {
  return { fetchDynamicContent: jest.fn() };
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

  test('LeadAssistant googleSearch invokes search service', async () => {
    const searchModule = require('../src/services/research/google-search');
    jest.spyOn(searchModule, 'search').mockResolvedValue(['res']);
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_KEY = 'key';
    const { LeadAssistant } = require('../src/services/aiAssistant');
    const assistant = new LeadAssistant({ enableScheduling: false });
    const result = await assistant.googleSearch({ query: 'test' });
    expect(result).toEqual(['res']);
    assistant.stopScheduledTasks();
  });

  test('LeadAssistant browserUse invokes browser automation', async () => {
    const { fetchDynamicContent } = require('../src/services/research/browser-automation');
    fetchDynamicContent.mockResolvedValue('<html></html>');
    process.env.SUPABASE_URL = 'http://localhost';
    process.env.SUPABASE_SERVICE_KEY = 'key';
    const { LeadAssistant } = require('../src/services/aiAssistant');
    const assistant = new LeadAssistant({ enableScheduling: false });
    const result = await assistant.browserUse({ url: 'http://x.com' });
    expect(result).toBe('<html></html>');
    assistant.stopScheduledTasks();
  });
});

jest.mock('node-fetch');
const fetch = require('node-fetch');

describe('Apollo integrations', () => {
  test('query parser extracts criteria', () => {
    const Parser = require('../src/services/research/apollo-query-parser');
    const parser = new Parser();
    const criteria = parser.parseNaturalLanguage('owners in houston real estate');
    expect(criteria.job_title).toContain('owner');
    expect(criteria.location).toContain('Houston+united+states');
    expect(criteria.business).toContain('Real+Estate+agency');
  });

  test('Apollo scraper builds URL and parses response', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: '1' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { status: 'SUCCEEDED', defaultDatasetId: 'ds1' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ first_name: 'A', last_name: 'B', email: 'a@b.c', email_status: 'verified' }]
      });

    const Apollo = require('../src/services/research/apollo-scraper');
    const service = new Apollo();
    const results = await service.searchLeads(
      { job_title: ['CEO'], location: ['Houston+united+states'] },
      { pollInterval: 0, timeout: 1 }
    );
    expect(results).toHaveLength(1);
    expect(results[0].emailAddress).toBe('a@b.c');
  });
});
