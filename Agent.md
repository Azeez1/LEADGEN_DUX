# AI Lead Agent Project – Version 1 (Expanded Technical Documentation)

---

## 1. Business Objective

Develop an autonomous AI Lead Generation Agent capable of detailed and intelligent web research, using various tools flexibly to gather information and launch personalized outbound email campaigns (with up to 5 hyper-personalized follow-up emails) targeting potential leads. The agent will only proceed with leads when sufficient data is available, optimizing time and resources effectively.

### Key Success Metrics:
- Lead qualification accuracy: >80%
- Email personalization quality score: >4/5
- Research efficiency: <2 minutes per lead
- Campaign engagement rate: >15%

---

## 2. Core Functionalities (Expanded)

### 2.1 Intelligent Research & Data Acquisition
AI autonomously decides the optimal combination of research methods:

1. **Google Search (Google Custom Search JSON API)**
   - Purpose: General web search for company info, news, recent activities
   - Implementation: REST API with pagination support
   - Rate limits: 100 queries/day (free tier), consider paid upgrade
   - Data extracted: Company descriptions, recent news, key personnel

2. **Autonomous Browser (BrowserUse/Playwright)**
   - Purpose: Interactive browsing for dynamic content
   - Supported sites: LinkedIn, Twitter, Instagram, company websites
   - Implementation: Headless browser automation
   - Anti-detection measures: Random delays, user-agent rotation
   - Data extracted: Profile data, recent posts, company updates

3. **List Scraping (Apify Actors)**
   - Purpose: Structured data extraction at scale
   - Implementation: Pre-built actors for common platforms
   - Cost optimization: Batch processing, result caching
   - Data extracted: Contact lists, company directories, social profiles

### 2.2 Conditional Data Storage Logic
```python
# Minimum data requirements for lead qualification
REQUIRED_FIELDS = ['name', 'email']
MINIMUM_ENRICHMENT_FIELDS = 2  # At least 2 of: linkedin, website, social, company_info

def is_lead_qualified(lead_data):
    has_required = all(lead_data.get(field) for field in REQUIRED_FIELDS)
    enrichment_count = sum([
        bool(lead_data.get('linkedin_url')),
        bool(lead_data.get('website_url')),
        bool(lead_data.get('company_info')),
        bool(lead_data.get('social_profiles'))
    ])
    return has_required and enrichment_count >= MINIMUM_ENRICHMENT_FIELDS
```

### 2.3 AI Personalization & Email Campaign Automation
- **Primary AI**: OpenAI GPT-4 (fallback to GPT-3.5-turbo)
- **Secondary AI**: Google Gemini Pro (for A/B testing)
- **Context window management**: Chunking for large research data
- **Prompt engineering**: Structured templates with variable injection
- **Email deliverability**: SPF/DKIM/DMARC configuration required

---

## 3. Detailed Technical Architecture

### 3.1 System Components Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     Main Application Layer                   │
├─────────────────────────────────────────────────────────────┤
│  Lead Ingestion │ Research Engine │ AI Personalizer │ Email │
│     Service     │     Service     │     Service     │ Sender│
└────────┬────────┴────────┬────────┴────────┬────────┴───┬───┘
         │                 │                 │             │
         └─────────────────┴─────────────────┴─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Queue/Job System    │
                    │  (Supabase Queue)     │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │      Supabase DB      │
                    └───────────────────────┘
```

### 3.2 Detailed Process Flow
```python
# Pseudo-code for main workflow
async def process_lead(lead_data):
    # Step 1: Initial validation
    if not validate_basic_info(lead_data):
        return log_skipped_lead(lead_data, "Missing basic info")
    
    # Step 2: Intelligent research
    research_strategy = determine_research_strategy(lead_data)
    research_results = await execute_research(research_strategy, lead_data)
    
    # Step 3: Qualification check
    if not is_lead_qualified(research_results):
        return log_skipped_lead(lead_data, "Insufficient data")
    
    # Step 4: Store qualified lead
    lead_id = await store_lead(research_results)
    
    # Step 5: Generate email sequence
    email_sequence = await generate_email_sequence(research_results)
    
    # Step 6: Schedule email campaign
    await schedule_email_campaign(lead_id, email_sequence)
    
    return lead_id
```

---

## 4. Enhanced Database Schema

### 4.1 Leads Table (leads)
```sql
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
    score INTEGER DEFAULT 0,  -- Lead quality score 0-100
    tags TEXT[],  -- Array of tags for categorization
    source TEXT,  -- Where the lead came from
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
```

### 4.2 Lead Research Table (lead_research)
```sql
CREATE TABLE lead_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tool_used TEXT NOT NULL,
    tool_version TEXT,
    research_data JSONB NOT NULL,  -- Structured research data
    research_notes TEXT,
    personalization_context TEXT,
    data_quality_score INTEGER,  -- 0-100 quality score
    processing_time_ms INTEGER,
    cost_cents INTEGER DEFAULT 0,  -- Track API costs
    CONSTRAINT valid_tool CHECK (tool_used IN ('google_search', 'browseruse', 'apify', 'manual'))
);

-- Index for JSONB queries
CREATE INDEX idx_research_data ON lead_research USING GIN (research_data);
```

### 4.3 Email Campaigns Table (email_campaigns)
```sql
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID,  -- Group emails in same campaign
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
    message_id TEXT,  -- For tracking
    thread_id TEXT,  -- For Gmail threading
    personalization_tokens JSONB,  -- Store variables used
    ai_model_used TEXT,
    ai_prompt_version TEXT
);

-- Performance indexes
CREATE INDEX idx_campaigns_lead_id ON email_campaigns(lead_id);
CREATE INDEX idx_campaigns_scheduled ON email_campaigns(scheduled_for);
CREATE INDEX idx_campaigns_campaign_id ON email_campaigns(campaign_id);
```

### 4.4 Additional Tables

```sql
-- Email templates for consistency
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    variables TEXT[],  -- Expected variables
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track AI API usage and costs
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
```

---

## 5. Research Intelligence Engine (Detailed Implementation)

### 5.1 Decision Tree Logic
```python
class ResearchStrategyEngine:
    def determine_strategy(self, lead_data):
        strategies = []
        
        # Prioritize based on available data
        if lead_data.get('linkedin_url'):
            strategies.append({
                'tool': 'browseruse',
                'priority': 1,
                'target': lead_data['linkedin_url']
            })
        
        if lead_data.get('company'):
            strategies.append({
                'tool': 'google_search',
                'priority': 2,
                'query': f"{lead_data['company']} {lead_data.get('name', '')} news"
            })
        
        if lead_data.get('email'):
            domain = lead_data['email'].split('@')[1]
            strategies.append({
                'tool': 'browseruse',
                'priority': 3,
                'target': f"https://{domain}"
            })
        
        # Sort by priority and return top 3
        return sorted(strategies, key=lambda x: x['priority'])[:3]
```

### 5.2 Data Sufficiency Scoring
```python
FIELD_WEIGHTS = {
    'name': 10,
    'email': 10,
    'company': 15,
    'title': 10,
    'linkedin_url': 20,
    'recent_activity': 15,
    'company_info': 10,
    'personal_interests': 10
}

def calculate_lead_score(lead_data):
    score = 0
    for field, weight in FIELD_WEIGHTS.items():
        if lead_data.get(field):
            score += weight
    return min(score, 100)  # Cap at 100

MINIMUM_SCORE_THRESHOLD = 45  # Requires at least basic info + one enrichment
```

---

## 6. AI Email Personalization System

### 6.1 Prompt Engineering Structure
```python
SYSTEM_PROMPT = """You are an expert B2B sales copywriter specializing in 
personalized outreach. Create highly engaging, personalized emails based on 
the provided research data. Focus on value proposition and genuine connection."""

EMAIL_GENERATION_PROMPT = """
Create email {sequence_number} of 5 for this lead:

Lead Information:
{lead_data}

Research Findings:
{research_data}

Campaign Context:
- This is email {sequence_number} in the sequence
- Previous emails: {previous_emails}
- Campaign goal: {campaign_goal}

Requirements:
1. Subject line: Max 50 characters, personalized
2. Body: 50-150 words, conversational tone
3. Include one specific detail from research
4. Clear CTA aligned with campaign goal
5. P.S. line with additional value

Output format:
SUBJECT: [subject line]
BODY: [email body]
CTA: [call to action]
PS: [postscript]
"""
```

### 6.2 Dynamic Personalization Variables
```python
PERSONALIZATION_TOKENS = {
    'basic': ['first_name', 'company', 'title'],
    'research': ['recent_news', 'company_achievement', 'shared_connection'],
    'behavioral': ['linkedin_post', 'twitter_activity', 'website_visits'],
    'contextual': ['industry_trend', 'competitor_mention', 'pain_point']
}
```

### 6.3 Follow-up Sequence Logic
```python
EMAIL_SEQUENCE_STRATEGY = {
    1: {
        'type': 'introduction',
        'tone': 'professional_friendly',
        'personalization_depth': 'high',
        'length': 'short'
    },
    2: {
        'type': 'value_proposition',
        'tone': 'consultative',
        'personalization_depth': 'medium',
        'length': 'medium'
    },
    3: {
        'type': 'case_study',
        'tone': 'educational',
        'personalization_depth': 'medium',
        'length': 'medium'
    },
    4: {
        'type': 'soft_reminder',
        'tone': 'casual',
        'personalization_depth': 'low',
        'length': 'very_short'
    },
    5: {
        'type': 'breakup',
        'tone': 'understanding',
        'personalization_depth': 'low',
        'length': 'short'
    }
}
```

---

## 7. Technical Implementation Details

### 7.1 Required Dependencies
```json
{
  "dependencies": {
    "supabase": "^2.38.0",
    "openai": "^4.20.0",
    "playwright": "^1.40.0",
    "bull": "^4.11.0",
    "redis": "^4.6.0",
    "apify-client": "^2.7.0",
    "googleapis": "^128.0.0",
    "nodemailer": "^6.9.0",
    "zod": "^3.22.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "eslint": "^8.54.0"
  }
}
```

### 7.2 Environment Configuration
```bash
# .env.example
# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# AI Services
OPENAI_API_KEY=sk-xxxxx
GOOGLE_AI_API_KEY=xxxxx

# Research Tools
GOOGLE_SEARCH_API_KEY=xxxxx
GOOGLE_SEARCH_ENGINE_ID=xxxxx
APIFY_API_TOKEN=xxxxx

# Email Configuration
GMAIL_CLIENT_ID=xxxxx
GMAIL_CLIENT_SECRET=xxxxx
GMAIL_REFRESH_TOKEN=xxxxx
FROM_EMAIL=outreach@company.com
REPLY_TO_EMAIL=replies@company.com


# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Rate Limiting
MAX_EMAILS_PER_DAY=500
MAX_RESEARCH_PER_MINUTE=10

# Security
ENCRYPTION_KEY=xxxxx
JWT_SECRET=xxxxx
```

### 7.3 API Integration Examples

#### Google Search Integration
```python
class GoogleSearchClient:
    def __init__(self, api_key, engine_id):
        self.api_key = api_key
        self.engine_id = engine_id
        self.base_url = "https://www.googleapis.com/customsearch/v1"
    
    async def search(self, query, num_results=10):
        params = {
            'key': self.api_key,
            'cx': self.engine_id,
            'q': query,
            'num': min(num_results, 10)
        }
        # Implementation with rate limiting and error handling
```

#### BrowserUse/Playwright Implementation
```python
class BrowserAutomation:
    def __init__(self):
        self.browser = None
        self.context = None
    
    async def setup(self):
        self.browser = await playwright.chromium.launch({
            'headless': True,
            'args': ['--no-sandbox', '--disable-setuid-sandbox']
        })
        self.context = await self.browser.new_context({
            'user_agent': self.get_random_user_agent(),
            'viewport': {'width': 1920, 'height': 1080}
        })
    
    async def scrape_linkedin(self, profile_url):
        # Anti-detection measures
        await self.random_delay()
        page = await self.context.new_page()
        # Scraping logic with error handling
```

---

## 8. Error Handling & Edge Cases

### 8.1 Common Error Scenarios
```python
ERROR_HANDLERS = {
    'rate_limit': {
        'retry': True,
        'backoff': 'exponential',
        'max_retries': 3
    },
    'invalid_email': {
        'retry': False,
        'action': 'mark_invalid'
    },
    'scraping_blocked': {
        'retry': True,
        'action': 'switch_proxy'
    },
    'ai_timeout': {
        'retry': True,
        'fallback': 'use_template'
    }
}
```

### 8.2 Data Validation
```python
from zod import z

LeadSchema = z.object({
    'name': z.string().min(2).max(100),
    'email': z.string().email(),
    'company': z.string().optional(),
    'linkedin_url': z.string().url().optional(),
    'website_url': z.string().url().optional()
})

def validate_lead(data):
    try:
        return LeadSchema.parse(data)
    except z.ZodError as e:
        log_validation_error(e)
        return None
```

---

## 9. Security & Compliance

### 9.1 Data Security
- All sensitive data encrypted at rest using AES-256
- API keys stored in environment variables
- Database connections use SSL
- Implement row-level security in Supabase

### 9.2 Email Compliance
- CAN-SPAM compliance: Include unsubscribe link
- GDPR compliance: Data retention policies
- Bounce handling: Automatic removal after hard bounces
- Suppression list management

### 9.3 Rate Limiting Implementation
```python
RATE_LIMITS = {
    'google_search': {'requests': 100, 'window': '1d'},
    'openai_api': {'requests': 3000, 'window': '1m'},
    'email_sending': {'requests': 500, 'window': '1d'},
    'apify_actors': {'requests': 1000, 'window': '1h'}
}
```

---

## 10. Testing Strategy

### 10.1 Unit Testing
```python
# Example test for lead qualification
def test_lead_qualification():
    # Test with sufficient data
    qualified_lead = {
        'name': 'John Doe',
        'email': 'john@company.com',
        'linkedin_url': 'linkedin.com/in/johndoe',
        'company_info': 'Tech startup'
    }
    assert is_lead_qualified(qualified_lead) == True
    
    # Test with insufficient data
    unqualified_lead = {
        'name': 'Jane Doe',
        'email': 'jane@company.com'
    }
    assert is_lead_qualified(unqualified_lead) == False
```

### 10.2 Integration Testing
- Mock external APIs for consistent testing
- Test email delivery with sandbox accounts
- Validate database transactions
- Test queue processing

### 10.3 Performance Testing
- Benchmark research operations (<2 min/lead)
- Load test email sending capacity
- Database query optimization
- Memory usage monitoring

---

## 11. Deployment Configuration

### 11.1 Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 11.2 Replit Configuration
```toml
# .replit
run = "npm start"
entrypoint = "src/index.js"

[env]
NODE_ENV = "production"

[nix]
channel = "stable-22_11"

[deployment]
run = ["node", "dist/index.js"]
build = ["npm", "run", "build"]
```

---

## 12. Monitoring & Analytics

### 12.1 Key Metrics to Track
```python
METRICS = {
    'lead_processing': [
        'leads_processed_per_hour',
        'average_research_time',
        'qualification_rate',
        'data_quality_score'
    ],
    'email_performance': [
        'open_rate',
        'click_rate',
        'reply_rate',
        'bounce_rate',
        'unsubscribe_rate'
    ],
    'system_health': [
        'api_success_rate',
        'queue_depth',
        'error_rate',
        'processing_latency'
    ]
}
```

### 12.2 Logging Configuration
```python
import winston from 'winston'

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
})
```

---

## 13. Development Phases

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up Supabase database with schema
2. Implement basic lead storage and retrieval
3. Create queue system for job processing
4. Basic error handling and logging

### Phase 2: Research Engine (Week 3-4)
1. Integrate Google Search API
2. Implement BrowserUse scraping
3. Create decision engine for tool selection
4. Build data quality scoring

### Phase 3: AI Integration (Week 5-6)
1. OpenAI GPT-4 integration
2. Prompt template system
3. Email sequence generation
4. Personalization token management

### Phase 4: Email Automation (Week 7-8)
1. Gmail API integration
2. Email scheduling system
3. Tracking pixel implementation
4. Reply detection

### Phase 5: Testing & Optimization (Week 9-10)
1. Comprehensive testing
2. Performance optimization
3. Security audit
4. Documentation

---

## 14. Troubleshooting Guide

### Common Issues and Solutions

1. **Scraping Blocked**
   - Rotate user agents
   - Implement proxy rotation
   - Add random delays
   - Use residential proxies if needed

2. **Email Deliverability**
   - Verify SPF/DKIM records
   - Warm up sending IP
   - Monitor sender reputation
   - Implement bounce handling

3. **API Rate Limits**
   - Implement exponential backoff
   - Cache frequently accessed data
   - Use webhook notifications
   - Consider API tier upgrades

4. **Memory Issues**
   - Stream large datasets
   - Implement pagination
   - Clear unused variables
   - Monitor heap usage

---

## 15. Code Structure Recommendation

```
project-root/
├── src/
│   ├── services/
│   │   ├── research/
│   │   │   ├── google-search.js
│   │   │   ├── browser-automation.js
│   │   │   └── apify-client.js
│   │   ├── ai/
│   │   │   ├── openai-client.js
│   │   │   ├── prompt-templates.js
│   │   │   └── personalization.js
│   │   ├── email/
│   │   │   ├── gmail-client.js
│   │   │   ├── campaign-manager.js
│   │   │   └── tracking.js
│   │   └── database/
│   │       ├── supabase-client.js
│   │       ├── models/
│   │       └── migrations/
│   ├── workers/
│   │   ├── research-worker.js
│   │   ├── email-worker.js
│   │   └── analytics-worker.js
│   ├── utils/
│   │   ├── validation.js
│   │   ├── rate-limiter.js
│   │   └── logger.js
│   ├── config/
│   │   └── index.js
│   └── index.js
├── tests/
├── scripts/
├── docs/
├── .env.example
├── docker-compose.yml
└── package.json
```

---

This expanded documentation provides your AI coding assistant with comprehensive implementation details, code examples, error handling strategies, and architectural decisions needed to build the AI Lead Agent effectively.
