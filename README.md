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
OpenAI, Google APIs, Playwright, Apify, Supabase and Nodemailer.
All service modules currently contain placeholder functions to be implemented.

## Frontend Chat UI

A basic chat-like interface is available under the `frontend` directory. It uses Next.js and provides a minimal chat window and message input box.

### Running the frontend

```bash
cd frontend
npm install # install dependencies
npm run dev
```

This will start the Next.js development server on <http://localhost:3000>.

## Running on Replit or other IDEs

The codebase can run in any Node.js workspace such as Replit. After cloning the
repository, install dependencies in both the root and the `frontend` directory:

```bash
npm install
cd frontend && npm install
```

Create a `.env` file based on `.env.example` and provide all required values.
The frontend also expects `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` which should match your Supabase credentials.

To start the app, run the backend and frontend in separate terminals (or tabs):

```bash
npm start          # run the backend
cd frontend && npm run dev  # run the Next.js interface
```

In Replit, set your environment variables in the **Secrets** panel and launch
these two commands. The frontend will be available on the port shown in the
Replit interface, while the backend logs will appear in its own tab.
