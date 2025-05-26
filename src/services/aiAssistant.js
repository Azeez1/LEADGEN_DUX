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
            case 'research_lead':
                return await this.researchLead(params);
            case 'set_reminder':
                return await this.setReminder(params);
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
}

module.exports = { LeadAssistant };
