# LEADGEN_DUX

This repository contains a functional implementation of the **AI Lead Agent** described in `Agent.md`.  After providing valid API credentials the services can be executed directly without additional coding.

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
4. Verify your credentials with the connectivity check:
   ```bash
   npm run check-env
   ```

Environment variables in `.env` configure API keys for Supabase, OpenAI,
Google services and Gmail. See `.env.example` for all available settings.
If you run a custom Apify actor for Apollo scraping, set `APIFY_ACTOR_ID`
to the desired actor ID. The Apollo scraper supports asynchronous runs by
passing `{ async: true }` to `searchLeads`.

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

The code integrates with external services including OpenAI, Google APIs, Playwright, Apify, Supabase and Nodemailer.
All core modules provide working implementations so the application can run once the required credentials are supplied.

## Frontend Chat UI

A basic chat-like interface is available under the `frontend` directory. It uses Next.js and provides a minimal chat window and message input box.

### Running the frontend

```bash
cd frontend
npm install # install dependencies
npm run dev
```

This will start the Next.js development server on <http://localhost:3000>.

## Available Tools

The assistant exposes additional research tools that can be invoked from the chat interface:

- **google_search** – performs a Google Custom Search for a given query.
- **browseruse** – launches a headless Playwright browser to fetch dynamic page content. Each browser session is limited to 20 minutes.

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
# AI Agent Interface Architecture - Conversational Lead Assistant

## 1. Core Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Chat Interface                    │
│                    (Next.js + Tailwind)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                    WebSocket Connection                      │
│                  (Supabase Realtime)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                  AI Agent Orchestrator                       │
│                    (Node.js Backend)                        │
├─────────────────────────────────────────────────────────────┤
│  OpenAI Assistant  │  LangChain Agent  │  Tool Executor    │
│   (Conversation)   │  (Task Planning)  │  (Actions)        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                     Integrated Tools                         │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Supabase │  Email   │ Research │ Analytics│ Task Scheduler │
│    DB    │   API    │  Tools   │  Engine  │   (Cron)      │
└──────────┴──────────┴──────────┴──────────┴────────────────┘
```

## 2. AI Agent Implementation Using OpenAI Assistant API

### 2.1 Core Agent Setup
```javascript
// src/services/aiAssistant.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

class LeadAssistant {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        this.assistant = null;
        this.tools = this.defineTools();
    }

    async initialize() {
        this.assistant = await this.openai.beta.assistants.create({
            name: "Lead Generation Partner",
            instructions: `You are an intelligent lead generation assistant with the personality of a knowledgeable, proactive colleague. You help manage lead research, email campaigns, and provide insights about the lead database.

Your capabilities include:
1. Querying and analyzing the lead database
2. Scheduling and managing email campaigns
3. Conducting research on leads
4. Providing strategic insights and recommendations
5. Tracking campaign performance

Always communicate in a professional but friendly manner, like a trusted team member. Proactively suggest improvements and highlight important information.`,
            tools: this.tools,
            model: "gpt-4-turbo-preview"
        });
    }

    // ...rest of implementation
}
```

### 2.2 Conversation Management with Context
```javascript
// src/services/conversationManager.js
class ConversationManager {
    constructor(assistant) {
        this.assistant = assistant;
        this.threads = new Map();
    }
    // ...rest of implementation
}
```

## 3. Proactive Agent Behaviors

### 3.1 Background Agent Worker
```javascript
// src/workers/proactiveAgent.js
const cron = require('node-cron');
class ProactiveAgent {
    constructor(assistant, notificationService) {
        this.assistant = assistant;
        this.notificationService = notificationService;
        this.setupProactiveBehaviors();
    }
    // ...rest of implementation
}
```

## 4. Frontend Chat Interface

### 4.1 Next.js Chat Component
```javascript
// app/components/AgentChat.jsx
'use client';
// ...component code
```

### 4.2 API Route Handler
```javascript
// app/api/agent/chat/route.js
import { LeadAssistant } from '@/services/aiAssistant';
import { ConversationManager } from '@/services/conversationManager';
// ...handler code
```

## 5. Task Scheduling and Context Management
Implementation files:
- `src/services/taskScheduler.js`
- `src/services/contextManager.js`

## 6. Database Schema
```sql
-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT,
    title TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    ig_url TEXT,
    twitter_url TEXT,
    phone TEXT,
    location TEXT,
    status TEXT CHECK (status IN ('new', 'researching', 'researched', 'emailed', 'replied', 'unsubscribed', 'bounced')),
    score INTEGER DEFAULT 0,
    tags TEXT[],
    source TEXT,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Lead research details
CREATE TABLE lead_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tool_used TEXT NOT NULL,
    tool_version TEXT,
    research_data JSONB NOT NULL,
    research_notes TEXT,
    personalization_context TEXT,
    data_quality_score INTEGER,
    processing_time_ms INTEGER,
    cost_cents INTEGER DEFAULT 0,
    CONSTRAINT valid_tool CHECK (tool_used IN ('google_search', 'browseruse', 'apify', 'manual'))
);
CREATE INDEX idx_research_data ON lead_research USING GIN (research_data);

-- Emails sent to leads
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID,
    sent_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    email_sequence INTEGER NOT NULL CHECK (email_sequence BETWEEN 1 AND 5),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    from_email TEXT NOT NULL,
    reply_to TEXT,
    opened BOOLEAN DEFAULT FALSE,
    opened_at TIMESTAMPTZ,
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    replied BOOLEAN DEFAULT FALSE,
    replied_at TIMESTAMPTZ,
    bounced BOOLEAN DEFAULT FALSE,
    bounce_type TEXT,
    unsubscribed BOOLEAN DEFAULT FALSE,
    message_id TEXT,
    thread_id TEXT,
    personalization_tokens JSONB,
    ai_model_used TEXT,
    ai_prompt_version TEXT
);
CREATE INDEX idx_campaigns_lead_id ON email_campaigns(lead_id);
CREATE INDEX idx_campaigns_scheduled ON email_campaigns(scheduled_for);
CREATE INDEX idx_campaigns_campaign_id ON email_campaigns(campaign_id);

-- Email templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    service TEXT NOT NULL,
    endpoint TEXT,
    tokens_used INTEGER,
    cost_cents INTEGER,
    lead_id UUID REFERENCES leads(id),
    response_time_ms INTEGER,
    error TEXT
);

-- Conversation threads
CREATE TABLE conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    UNIQUE(user_id)
);

-- Scheduled tasks
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    task_type TEXT NOT NULL,
    description TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    parameters JSONB,
    active BOOLEAN DEFAULT true,
    created_by TEXT,
    last_execution TIMESTAMPTZ,
    next_execution TIMESTAMPTZ
);

-- Task execution history
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES scheduled_tasks(id),
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL,
    error TEXT,
    duration_ms INTEGER
);

-- User contexts for personalization
CREATE TABLE user_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    context JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent notifications
CREATE TABLE agent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    actionable BOOLEAN DEFAULT false,
    actions JSONB
);

-- Analytics metrics
CREATE TABLE analytics_metrics (
    metric TEXT PRIMARY KEY,
    value NUMERIC
);

-- Simple job queue
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue TEXT NOT NULL,
    payload JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This document summarises the key components and code locations for the Conversational Lead Assistant.
