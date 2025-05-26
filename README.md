# LEADGEN_DUX

This repository contains a skeleton implementation of the **AI Lead Agent** described in `Agent.md`. It provides the initial project structure and placeholder modules for future development.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and adjust configuration.
3. Run the application:
   ```bash
 npm start
  ```

Environment variables in `.env` configure API keys for Supabase, OpenAI,
Google services and Gmail. See `.env.example` for all available settings.

## Project Structure

See `Agent.md` for the detailed architecture plan. The current structure mirrors that recommendation:

```
src/
  services/
    research/
    ai/
    email/
    database/
  workers/
  utils/
  config/
  index.js
```

The skeleton references several external services and frameworks including
OpenAI, Google APIs, Playwright, Apify, Bull/Redis, Supabase and Nodemailer.
All service modules currently contain placeholder functions to be implemented.
