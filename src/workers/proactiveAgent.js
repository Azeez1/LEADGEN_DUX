const cron = require('node-cron');

class ProactiveAgent {
    constructor(assistant, notificationService) {
        this.assistant = assistant;
        this.notificationService = notificationService;
        this.setupProactiveBehaviors();
    }

    setupProactiveBehaviors() {
        cron.schedule('0 9 * * *', async () => {
            await this.morningBriefing();
        });
        cron.schedule('0 * * * *', async () => {
            await this.checkCampaignPerformance();
        });
        cron.schedule('0 */4 * * *', async () => {
            await this.checkNewLeads();
        });
    }

    async morningBriefing() {
        const analytics = await this.assistant.getAnalytics({
            metric_type: 'overview',
            time_range: 'today'
        });
        const insights = await this.generateInsights(analytics);
        await this.notificationService.send({
            type: 'morning_briefing',
            title: "Good morning! Here's your lead generation update",
            content: insights,
            priority: 'medium'
        });
    }

    async checkCampaignPerformance() {
        const campaigns = await this.getActiveCampaigns();
        for (const campaign of campaigns) {
            const performance = await this.analyzeCampaignPerformance(campaign);
            if (performance.needs_attention) {
                await this.notificationService.send({
                    type: 'campaign_alert',
                    title: `Campaign "${campaign.name}" needs attention`,
                    content: performance.recommendation,
                    priority: 'high',
                    actionable: true,
                    actions: performance.suggested_actions
                });
            }
        }
    }

    async generateInsights(data) {
        const prompt = `Generate a brief, friendly morning update based on this data: ${JSON.stringify(data)}`;
        const response = await this.assistant.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful colleague providing a morning briefing. Be concise, highlight important items, and suggest 2-3 actionable items for the day."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });
        return response.choices[0].message.content;
    }

    async getActiveCampaigns() {
        const { data } = await this.assistant.supabase
            .from('campaigns')
            .select('*')
            .eq('status', 'active');
        return data || [];
    }

    async analyzeCampaignPerformance(campaign) {
        const { data } = await this.assistant.supabase
            .from('analytics_metrics')
            .select('metric,value');
        const metrics = (data || []).reduce((acc, row) => {
            acc[row.metric] = row.value;
            return acc;
        }, {});
        const needs = (metrics.reply_rate || 0) < 0.05;
        return {
            needs_attention: needs,
            recommendation: needs ? 'Consider revising email content' : '',
            suggested_actions: needs ? ['pause campaign', 'update messaging'] : []
        };
    }

    async checkNewLeads() {
        const { data } = await this.assistant.supabase
            .from('leads')
            .select('id')
            .eq('status', 'new');
        if (data && data.length) {
            await this.notificationService.send({
                type: 'new_leads',
                title: 'New leads available',
                content: `You have ${data.length} new leads to review.`,
                priority: 'medium',
                actionable: true,
                actions: [{ label: 'View Leads', action: 'navigate', target: '/leads' }]
            });
        }
    }
}

module.exports = { ProactiveAgent };
