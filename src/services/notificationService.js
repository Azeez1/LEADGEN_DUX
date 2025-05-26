class NotificationService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    async send(notification) {
        await this.supabase.from('agent_notifications').insert({
            ...notification,
            created_at: new Date()
        });
    }
}

module.exports = { NotificationService };
