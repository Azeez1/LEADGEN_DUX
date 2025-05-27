const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { createQueue } = require("./queue/supabase-queue");
const { scheduleCampaign: scheduleLeadCampaign } = require("./email/campaign-manager");
const { TaskScheduler } = require("./taskScheduler");
const { search } = require('./research/google-search');
const { fetchDynamicContent } = require('./research/browser-automation');

const ApolloScraperService = require('./research/apollo-scraper');
const ApolloQueryParser = require('./research/apollo-query-parser');
const apolloRateLimiter = require('../utils/apollo-rate-limiter');

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
        this.researchQueue = createQueue("research", this.supabase);
        this.emailQueue = createQueue("email", this.supabase);
        this.taskScheduler = new TaskScheduler(this.supabase, this);
    }

    async initialize() {
        // Create or retrieve the assistant
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

    defineTools() {
        return [
            {
                type: "function",
                function: {
                    name: "query_leads",
                    description: "Query the lead database with filters",
                    parameters: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["new", "researched", "emailed", "replied"],
                                description: "Filter by lead status"
                            },
                            limit: {
                                type: "number",
                                description: "Number of results to return"
                            },
                            search: {
                                type: "string",
                                description: "Search term for name, email, or company"
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "schedule_campaign",
                    description: "Schedule an email campaign for specific leads",
                    parameters: {
                        type: "object",
                        properties: {
                            lead_ids: {
                                type: "array",
                                items: { type: "string" },
                                description: "Array of lead IDs to include"
                            },
                            campaign_type: {
                                type: "string",
                                enum: ["immediate", "scheduled", "drip"],
                                description: "Type of campaign"
                            },
                            schedule_time: {
                                type: "string",
                                description: "ISO timestamp for scheduled campaigns"
                            }
                        },
                        required: ["lead_ids", "campaign_type"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_analytics",
                    description: "Get campaign analytics and performance metrics",
                    parameters: {
                        type: "object",
                        properties: {
                            metric_type: {
                                type: "string",
                                enum: ["overview", "campaign", "lead", "email"],
                                description: "Type of analytics to retrieve"
                            },
                            time_range: {
                                type: "string",
                                enum: ["today", "week", "month", "all"],
                                description: "Time range for analytics"
                            }
                        },
                        required: ["metric_type"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_apollo_leads",
                    description: "Search for B2B leads on Apollo.io using specific criteria",
                    parameters: {
                        type: "object",
                        properties: {
                            job_title: {
                                type: "array",
                                items: { type: "string" },
                                description: "Job titles to search for"
                            },
                            location: {
                                type: "array",
                                items: { type: "string" },
                                description: "Locations in format 'City+country'"
                            },
                            business: {
                                type: "array",
                                items: { type: "string" },
                                description: "Business or industry keywords"
                            },
                            totalRecords: {
                                type: "number",
                                description: "Maximum number of records to fetch",
                                default: 500
                            },
                            natural_query: {
                                type: "string",
                                description: "Optional natural language query"
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "research_lead",
                    description: "Conduct research on a specific lead",
                    parameters: {
                        type: "object",
                        properties: {
                            lead_id: {
                                type: "string",
                                description: "ID of the lead to research"
                            },
                            research_depth: {
                                type: "string",
                                enum: ["quick", "standard", "deep"],
                                description: "How thorough the research should be"
                            }
                        },
                        required: ["lead_id"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "set_reminder",
                    description: "Set a reminder or scheduled task",
                    parameters: {
                        type: "object",
                        properties: {
                            task_type: {
                                type: "string",
                                description: "Type of task to schedule"
                            },
                            schedule: {
                                type: "string",
                                description: "Cron expression or ISO timestamp"
                            },
                            description: {
                                type: "string",
                                description: "Task description"
                            }
                        },
                        required: ["task_type", "schedule"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "google_search",
                    description: "Search the web using Google Custom Search",
                    parameters: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Search query" }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "browseruse",
                    description: "Fetch dynamic content from a webpage via headless browser",
                    parameters: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "Page URL" }
                        },
                        required: ["url"]
                    }
                }
            }
        ];
    }

    async handleToolCall(toolCall) {
        const { name, arguments: args } = toolCall.function;
        const params = JSON.parse(args);

        switch (name) {
            case 'query_leads':
                return await this.queryLeads(params);
            case 'schedule_campaign':
                return await this.scheduleCampaign(params);
            case 'get_analytics':
                return await this.getAnalytics(params);
            case 'search_apollo_leads':
                return await this.searchApolloLeads(params);
            case 'research_lead':
                return await this.researchLead(params);
            case 'set_reminder':
                return await this.setReminder(params);
            case 'google_search':
                return await this.googleSearch(params);
            case 'browseruse':
                return await this.browserUse(params);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    async queryLeads({ status, limit = 10, search }) {
        let query = this.supabase.from('leads').select('*');
        if (status) query = query.eq('status', status);
        if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
        }
        const { data, error } = await query.limit(limit);
        if (error) throw error;
        return {
            count: data.length,
            leads: data,
            summary: this.generateLeadSummary(data)
        };
    }

    generateLeadSummary(leads) {
        const statusCounts = leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});
        return {
            total: leads.length,
            by_status: statusCounts,
            recent: leads.slice(0, 3).map(l => ({
                name: l.name,
                company: l.company,
                status: l.status
            }))
        };
    }
    async scheduleCampaign({ lead_ids, campaign_type, schedule_time }) {
        const { data, error } = await this.supabase.from("leads").select("*").in("id", lead_ids);
        if (error) throw error;
        for (const lead of data) {
            const emails = [{ to: lead.email, subject: `Hello ${lead.name}`, text: `Hi ${lead.name}, let's connect!` }];
            await scheduleLeadCampaign(lead, emails);
        }
        return { scheduled: data.length };
    }

    async getAnalytics({ metric_type }) {
        if (metric_type !== "overview") {
            throw new Error("Only overview metrics supported");
        }
        const { data, error } = await this.supabase.from("analytics_metrics").select("metric,value");
        if (error) throw error;
        return data.reduce((acc, row) => { acc[row.metric] = row.value; return acc; }, {});
    }

    async searchApolloLeads(params) {
        const apollo = new ApolloScraperService();
        const parser = new ApolloQueryParser();

        if (params.natural_query) {
            const parsed = parser.parseNaturalLanguage(params.natural_query);
            params = { ...parsed, ...params };
            delete params.natural_query;
        }

        await apolloRateLimiter.enforceRateLimit();
        const leads = await apollo.searchLeads(params);
        const formatted = apollo.formatForDatabase(leads);
        const stored = [];

        for (const lead of formatted) {
            const { data, error } = await this.supabase
                .from('leads')
                .upsert(lead, { onConflict: 'email' })
                .select()
                .single();
            if (!error && data) stored.push(data);
        }

        return { found: leads.length, stored: stored.length };
    }

    async researchLead({ lead_id, research_depth }) {
        await this.researchQueue.add({ leadId: lead_id, depth: research_depth });
        return { queued: true };
    }

    async setReminder({ task_type, schedule, description }) {
        const task = await this.taskScheduler.createTask({ task_type, schedule, description });
        return { task_id: task.id };
    }

    async interpretScheduleWithAI(input) {
        const prompt = `Convert the following natural language schedule into a cron expression. If unclear, default to daily at 9am.\nSchedule: "${input}"`;
        try {
            const resp = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: [{ role: 'user', content: prompt }]
            });
            return resp.choices[0].message.content.trim();
        } catch (err) {
            console.error('Failed to interpret schedule with AI', err);
            return '0 9 * * *';
        }
    }

    async researchNewLeads() {
        const { data, error } = await this.supabase
            .from('leads')
            .select('id')
            .eq('status', 'new');
        if (error) throw error;
        for (const lead of data || []) {
            await this.researchQueue.add({ leadId: lead.id, depth: 'standard' });
        }
        return { queued: data ? data.length : 0 };
    }

    async generateAndSendReport({ email }) {
        const { data, error } = await this.supabase
            .from('analytics_metrics')
            .select('metric,value');
        if (error) throw error;
        const report = (data || [])
            .map(row => `${row.metric}: ${row.value}`)
            .join('\n');
        await this.emailQueue.add({
            to: email,
            subject: 'LeadGen Report',
            text: report
        });
        return { sent: true };
    }

    async executeCustomTask(params) {
        console.log('Executing custom task', params);
        return { executed: true };
    }

    async checkCampaignPerformance() {
        const { data } = await this.supabase
            .from('analytics_metrics')
            .select('metric,value');
        console.log('Current campaign metrics', data);
        return data || [];
    }

    async googleSearch({ query }) {
        return await search(query);
    }

    async browserUse({ url }) {
        const operation = fetchDynamicContent(url);
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Browser session timed out (20 min limit)')), 20 * 60 * 1000);
        });
        return await Promise.race([operation, timeout]);
    }
}

module.exports = { LeadAssistant };
