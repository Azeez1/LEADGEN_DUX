class ContextManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.activeContexts = new Map();
    }

    async saveContext(userId, context) {
        const { error } = await this.supabase
            .from('user_contexts')
            .upsert({
                user_id: userId,
                context: context,
                updated_at: new Date()
            });
        if (error) throw error;
        this.activeContexts.set(userId, context);
    }

    async getContext(userId) {
        if (this.activeContexts.has(userId)) {
            return this.activeContexts.get(userId);
        }
        const { data, error } = await this.supabase
            .from('user_contexts')
            .select('context')
            .eq('user_id', userId)
            .single();
        if (error || !data) {
            const ctx = this.createDefaultContext();
            this.activeContexts.set(userId, ctx);
            return ctx;
        }
        this.activeContexts.set(userId, data.context);
        return data.context;
    }

    createDefaultContext() {
        return {
            preferences: {
                communication_style: 'professional',
                update_frequency: 'daily',
                priority_metrics: ['reply_rate', 'open_rate', 'lead_quality']
            },
            current_goals: [],
            active_campaigns: [],
            important_leads: [],
            last_interaction: new Date()
        };
    }

    async updateGoals(userId, goals) {
        const context = await this.getContext(userId);
        context.current_goals = goals;
        await this.saveContext(userId, context);
    }

    async trackInteraction(userId, interaction) {
        const context = await this.getContext(userId);
        if (interaction.mentioned_leads) {
            context.important_leads = [
                ...new Set([...context.important_leads, ...interaction.mentioned_leads])
            ].slice(0, 20);
        }
        if (interaction.campaign_id) {
            context.active_campaigns = [
                interaction.campaign_id,
                ...context.active_campaigns.filter(id => id !== interaction.campaign_id)
            ].slice(0, 10);
        }
        context.last_interaction = new Date();
        await this.saveContext(userId, context);
    }
}

module.exports = { ContextManager };
