#!/usr/bin/env node
'use strict';

require('dotenv').config();
const fetch = require('node-fetch');
const { OpenAI } = require('openai');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

async function checkSupabase() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !(SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)) {
    return { service: 'Supabase', ok: false, error: 'Missing SUPABASE_URL or key' };
  }
  try {
    const baseUrl = SUPABASE_URL.replace(/\/$/, '');
    const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    const res = await fetch(`${baseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (res.ok) return { service: 'Supabase', ok: true };
    return { service: 'Supabase', ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { service: 'Supabase', ok: false, error: err.message };
  }
}

async function checkOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return { service: 'OpenAI', ok: false, error: 'Missing OPENAI_API_KEY' };
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await client.models.list();
    return { service: 'OpenAI', ok: true };
  } catch (err) {
    return { service: 'OpenAI', ok: false, error: err.message };
  }
}

async function checkGoogleSearch() {
  const { GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID } = process.env;
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    return { service: 'Google Search', ok: false, error: 'Missing API key or engine id' };
  }
  try {
    const customsearch = google.customsearch('v1');
    await customsearch.cse.list({ q: 'ping', cx: GOOGLE_SEARCH_ENGINE_ID, auth: GOOGLE_SEARCH_API_KEY });
    return { service: 'Google Search', ok: true };
  } catch (err) {
    return { service: 'Google Search', ok: false, error: err.message };
  }
}

async function checkApify() {
  const { APIFY_API_TOKEN, APIFY_ACTOR_ID } = process.env;
  if (!APIFY_API_TOKEN) {
    return { service: 'Apify', ok: false, error: 'Missing APIFY_API_TOKEN' };
  }
  const actor = APIFY_ACTOR_ID || 'apify/hello-world';
  try {
    const res = await fetch(
 ylcn8h-codex/ensure-apify-triggers-actor-properly
      `https://api.apify.com/v2/acts/${actor}/runs?token=${APIFY_API_TOKEN}`,

      `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
 main
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    );
 ylcn8h-codex/ensure-apify-triggers-actor-properly
    if (!res.ok) return { service: 'Apify', ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.id && !data.data?.id) {
      return { service: 'Apify', ok: false, error: 'No run ID returned' };
    }
    return { service: 'Apify', ok: true };

    if (res.ok) return { service: 'Apify', ok: true };
    return { service: 'Apify', ok: false, error: `HTTP ${res.status}` };
 main
  } catch (err) {
    return { service: 'Apify', ok: false, error: err.message };
  }
}

async function checkGmail() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return { service: 'Gmail', ok: false, error: 'Missing Gmail credentials' };
  }
  const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  try {
    await oauth2Client.getAccessToken();
    return { service: 'Gmail', ok: true };
  } catch (err) {
    return { service: 'Gmail', ok: false, error: err.message };
  }
}

async function main() {
  const checks = await Promise.all([
    checkSupabase(),
    checkOpenAI(),
    checkGoogleSearch(),
    checkApify(),
    checkGmail(),
  ]);
  for (const r of checks) {
    const status = r.ok ? 'OK' : `FAIL - ${r.error}`;
    console.log(`${r.service}: ${status}`);
  }
  const failed = checks.filter(r => !r.ok);
  if (failed.length) process.exitCode = 1;
}

main();
