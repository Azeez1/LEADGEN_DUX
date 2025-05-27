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

## 6. Database Schema Additions
```sql
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
```

This document summarises the key components and code locations for the Conversational Lead Assistant.
